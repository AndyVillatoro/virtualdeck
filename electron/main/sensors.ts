import { intentarNativo } from './native';
import { app, net } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tm } from './idioma';
// Host y puerto por defecto, compartidos con el renderer (ver `src/types`).
import { SENSORES_POR_DEFECTO } from '../../src/types';

// Integration with LibreHardwareMonitor (LHM). LHM exposes its full sensor
// tree at http://host:port/data.json when "Run Web Server" is enabled in its
// settings. We optionally bundle LHM under resources/lhm and can spawn it on
// startup so the user doesn't need a separate install.

export type { SensorCategory, Sensor } from './sensors-parser';
import { parseLhmTree, applyCategoryFilter, type SensorCategory, type Sensor } from './sensors-parser';

export interface SensorsStatus {
  enabled: boolean;
  connected: boolean;
  host: string;
  port: number;
  count: number;
  error?: string;
  lastFetchAt?: number;
  /** True when our spawned LHM child is alive. */
  bundledRunning: boolean;
}

let host = SENSORES_POR_DEFECTO.host;
let port = SENSORES_POR_DEFECTO.port;
let enabled = false;
let lastError: string | undefined;
let lastFetchAt = 0;
let cache: Sensor[] = [];
let connected = false;
// Limit returned sensors to these categories. "other" is the catch-all for
// network adapters, embedded controllers, batteries — usually noise for our use case.
let allowedCategories: Set<SensorCategory> = new Set(['cpu', 'gpu', 'mainboard', 'memory', 'storage']);
let lhmProc: ChildProcess | null = null;

// 1.5 s cache absorbs bursts (multiple buttons reading the same sensor) without
// hammering LHM. The poller in renderer ticks at 5 s, so most reads hit cache.
const CACHE_MS = 1500;

export function configure(opts: { host?: string; port?: number; enabled?: boolean; categories?: SensorCategory[] }) {
  if (opts.host) {
    const h = opts.host.trim();
    host = (h === '0.0.0.0' || h === '') ? '127.0.0.1' : h;
  }
  if (typeof opts.port === 'number' && opts.port > 0) port = opts.port;
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.categories && Array.isArray(opts.categories)) allowedCategories = new Set(opts.categories);

  // Sincronizar también con el núcleo nativo en Rust (vd-node) si está disponible.
  // A Rust se le pasa LHM **desactivado**: su petición WinHTTP es síncrona (4 s
  // de límite) y congelaba el proceso principal cada vez que LHM estaba caído,
  // para luego volver a pedir lo mismo aquí en JS de forma asíncrona. LHM queda
  // solo en esta capa; al núcleo solo van las categorías (filtran también los
  // sensores nativos) y los sensores nativos siguen saliendo igual.
  intentarNativo('configureSensors', (n) => {
    return n.configureSensors(JSON.stringify({
      enabled: false,
      host,
      port,
      categories: Array.from(allowedCategories),
    }));
  });
}

export function status(): SensorsStatus {
  return {
    enabled, connected, host, port,
    count: cache.length, error: lastError, lastFetchAt,
    bundledRunning: !!lhmProc && !lhmProc.killed,
  };
}

function filtrar(sensores: Sensor[]): Sensor[] {
  return applyCategoryFilter(sensores, allowedCategories);
}

async function fetchTree(): Promise<any> {
  const targetHost = (host === '0.0.0.0' || !host.trim()) ? '127.0.0.1' : host;
  const url = `http://${targetHost}:${port}/data.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await net.fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sensores del nivel nativo: CPU, RAM, disco, red y GPU NVIDIA.
 *
 * No necesitan **nada instalado**. Hasta ahora la única fuente era
 * LibreHardwareMonitor: 19 MB empaquetados, un servidor HTTP y, para que pueda
 * reservar el puerto, arrancarlo como administrador. Sin todo eso no se veía ni
 * un sensor.
 *
 * LHM sigue siendo útil como nivel 2 para lo que solo él ve —voltajes,
 * ventiladores de placa—, pero deja de ser un requisito para tener sensores.
 */
function nativos(force: boolean): Sensor[] {
  const json = intentarNativo('listSensors', (n) => n.listSensors(force));
  if (json === undefined) return [];
  try {
    return JSON.parse(json) as Sensor[];
  } catch (e) {
    console.error('[sensores] respuesta nativa ilegible:', (e as Error).message);
    return [];
  }
}

/**
 * Une los sensores nativos con los de LHM.
 *
 * Ante un mismo id **gana LHM**: si el usuario se molestó en instalarlo y
 * dejarlo corriendo, es porque quiere sus lecturas. Los ids no pueden chocar por
 * accidente —los nativos llevan los prefijos `/native/` y `/nvml/`— así que un
 * choque solo puede venir de una configuración deliberada.
 */
function unir(deLhm: Sensor[], delNucleo: Sensor[]): Sensor[] {
  const porId = new Map<string, Sensor>();
  for (const s of delNucleo) porId.set(s.id, s);
  for (const s of deLhm) porId.set(s.id, s);
  return [...porId.values()];
}

let lastFailAt = 0;
const REINTENTO_MS = 12000;

export async function list(force = false): Promise<Sensor[]> {
  const delNucleo = nativos(force);

  // Si LHM está apagado explícitamente y nunca se conectó, o si falló recientemente,
  // devolvemos de inmediato los sensores nativos para no congelar la UI con intentos de red.
  const enEspera = !enabled && !connected && (Date.now() - lastFailAt < REINTENTO_MS);
  if (enEspera) {
    return filtrar(delNucleo);
  }

  if (!force && Date.now() - lastFetchAt < CACHE_MS && (cache.length > 0 || !enabled)) {
    return filtrar(unir(cache, delNucleo));
  }

  try {
    const tree = await fetchTree();
    cache = parseLhmTree(tree);
    connected = true;
    lastError = undefined;
    lastFetchAt = Date.now();
    return filtrar(unir(cache, delNucleo));
  } catch (e) {
    connected = false;
    lastError = (e as Error).message;
    lastFailAt = Date.now();
    // Return last-known cache on transient failures so the UI doesn't flicker
    // to "no data" every time LHM hiccups for one tick.
    return filtrar(unir(cache, delNucleo));
  }
}

export async function get(id: string): Promise<Sensor | null> {
  // Bypass the category filter for direct id lookup so a saved widget keeps
  // working even if the user later narrows the allowed categories.
  if (Date.now() - lastFetchAt > CACHE_MS) await list();
  // Se busca en las dos fuentes: un widget configurado sobre un sensor nativo
  // no aparece en `cache`, que solo guarda lo que vino de LHM. Sin esto, el
  // widget se quedaria en blanco para siempre.
  return unir(cache, nativos(false)).find((s) => s.id === id) ?? null;
}

export async function probe(): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const tree = await fetchTree();
    cache = parseLhmTree(tree);
    connected = true;
    lastError = undefined;
    lastFetchAt = Date.now();
    return { ok: true, count: filtrar(cache).length };
  } catch (e) {
    connected = false;
    const msg = (e as Error).message;
    lastError = msg;
    lastFailAt = Date.now();
    return { ok: false, count: 0, error: msg };
  }
}

/**
 * Busca LibreHardwareMonitor en rutas habituales del sistema y del proyecto.
 * Inspecciona recursos empaquetados, Downloads, Desktop y Program Files.
 */
export function rutaLHMConocida(): string | null {
  const posibles = [
    // 1. Recursos locales del proyecto o app empaquetada
    join(process.cwd(), 'resources', 'lhm', 'LibreHardwareMonitor.exe'),
    app?.getAppPath ? join(app.getAppPath(), 'resources', 'lhm', 'LibreHardwareMonitor.exe') : null,
    process.resourcesPath ? join(process.resourcesPath, 'lhm', 'LibreHardwareMonitor.exe') : null,
    process.resourcesPath ? join(process.resourcesPath, 'resources', 'lhm', 'LibreHardwareMonitor.exe') : null,
    // 2. Descargas o Escritorio habituales del usuario
    process.env['USERPROFILE'] ? join(process.env['USERPROFILE'], 'Downloads', 'LibreHardwareMonitor', 'LibreHardwareMonitor.exe') : null,
    process.env['USERPROFILE'] ? join(process.env['USERPROFILE'], 'Desktop', 'LibreHardwareMonitor', 'LibreHardwareMonitor.exe') : null,
    // 3. Program Files y AppData
    process.env['ProgramFiles'] ? join(process.env['ProgramFiles'], 'LibreHardwareMonitor', 'LibreHardwareMonitor.exe') : null,
    process.env['ProgramFiles(x86)'] ? join(process.env['ProgramFiles(x86)'], 'LibreHardwareMonitor', 'LibreHardwareMonitor.exe') : null,
    process.env['LOCALAPPDATA'] ? join(process.env['LOCALAPPDATA'], 'Programs', 'LibreHardwareMonitor', 'LibreHardwareMonitor.exe') : null,
  ].filter(Boolean) as string[];

  for (const p of posibles) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Asegura que el archivo .config de LibreHardwareMonitor tenga el servidor web habilitado
 * y configurado en el puerto correcto. Si no existe, genera una configuración básica.
 */
export function asegurarConfigLHM(exePath: string, targetPort = SENSORES_POR_DEFECTO.port): boolean {
  try {
    if (!exePath || !existsSync(exePath)) return false;
    const dir = exePath.substring(0, exePath.lastIndexOf('\\')) || '.';
    const configCandidates = [
      join(dir, 'LibreHardwareMonitor.config'),
      `${exePath}.config`,
    ];

    for (const cfgPath of configCandidates) {
      if (existsSync(cfgPath)) {
        let content = readFileSync(cfgPath, 'utf-8');
        let modificado = false;

        // 1. Asegurar runWebServerMenuItem
        if (!content.includes('key="runWebServerMenuItem"')) {
          content = content.replace(
            '</appSettings>',
            `    <add key="runWebServerMenuItem" value="true" />\n  </appSettings>`,
          );
          modificado = true;
        } else if (content.includes('key="runWebServerMenuItem" value="false"')) {
          content = content.replace(
            /key="runWebServerMenuItem"\s+value="false"/g,
            'key="runWebServerMenuItem" value="true"',
          );
          modificado = true;
        }

        // 2. Asegurar listenerPort
        const portStr = String(targetPort);
        if (!content.includes('key="listenerPort"')) {
          content = content.replace(
            '</appSettings>',
            `    <add key="listenerPort" value="${portStr}" />\n  </appSettings>`,
          );
          modificado = true;
        }

        // 3. Asegurar listenerIp
        if (!content.includes('key="listenerIp"')) {
          content = content.replace(
            '</appSettings>',
            `    <add key="listenerIp" value="127.0.0.1" />\n  </appSettings>`,
          );
          modificado = true;
        }

        if (modificado) {
          writeFileSync(cfgPath, content, 'utf-8');
        }
        return true;
      }
    }

    // Si no existía archivo de configuración, crear uno básico
    const targetConfig = join(dir, 'LibreHardwareMonitor.config');
    const basicConfig = `<?xml version="1.0" encoding="utf-8"?>\n<configuration>\n  <appSettings>\n    <add key="listenerIp" value="127.0.0.1" />\n    <add key="listenerPort" value="${targetPort}" />\n    <add key="runWebServerMenuItem" value="true" />\n  </appSettings>\n</configuration>\n`;
    writeFileSync(targetConfig, basicConfig, 'utf-8');
    return true;
  } catch (err) {
    console.warn('[sensores] No se pudo asegurar config de LHM:', err);
    return false;
  }
}

export async function spawnLHM(customPath?: string, elevated = false): Promise<{ ok: boolean; error?: string }> {
  if (lhmProc && !lhmProc.killed) return { ok: true };
  const exe = customPath || rutaLHMConocida();
  if (!exe || !existsSync(exe)) return { ok: false, error: 'LibreHardwareMonitor.exe no encontrado' };
  
  // Asegurar que la configuración de LHM tenga el servidor web habilitado en el puerto correcto
  asegurarConfigLHM(exe, port);

  const cwd = exe.substring(0, exe.lastIndexOf('\\')) || undefined;

  const spawnConAdmin = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      // HttpListener en Windows y acceso a ring-0 (WinRing0) para DTS/MSR exigen admin.
      // Lanzamos LHM via PowerShell Start-Process -Verb RunAs para disparar UAC.
      const ps = spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -WorkingDirectory '${(cwd || '').replace(/'/g, "''")}' -Verb RunAs -WindowStyle Hidden`,
      ], { stdio: 'ignore', windowsHide: true });
      ps.on('error', (err) => { lastError = `LHM spawn (elevated): ${err.message}`; });
      await new Promise((r) => setTimeout(r, 3500));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  if (elevated) {
    return spawnConAdmin();
  }

  try {
    const child = spawn(exe, [], {
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
      cwd,
    });
    let falloElevacion = false;
    child.on('exit', (code) => {
      if (lhmProc === child) lhmProc = null;
      if (code !== 0 && code !== null && !connected) {
        falloElevacion = true;
      }
    });
    child.on('error', (err: any) => {
      lastError = `LHM spawn: ${err.message}`;
      if (err.code === 'EACCES' || (err.message && err.message.includes('EACCES'))) {
        falloElevacion = true;
      }
    });
    lhmProc = child;
    await new Promise((r) => setTimeout(r, 2000));
    if (falloElevacion) {
      return spawnConAdmin();
    }
    return { ok: true };
  } catch (e: any) {
    if (e.code === 'EACCES' || (e.message && e.message.includes('EACCES'))) {
      return spawnConAdmin();
    }
    return { ok: false, error: (e as Error).message };
  }
}

// Registra una reserva URL ACL en Windows para el puerto/host configurados.
// Una sola UAC y queda permanente — LHM podrá bindear el puerto sin admin
// en arranques futuros. Equivalente a:
//   netsh http add urlacl url=http://+:PORT/ user=Everyone
// Si ya existía, primero la borra para evitar el error "Cannot create a file
// when that file already exists." y luego la vuelve a crear.
export async function registerUrlAcl(targetPort?: number): Promise<{ ok: boolean; error?: string; url: string }> {
  const p = targetPort && targetPort > 0 ? targetPort : port;
  const url = `http://+:${p}/`;
  // PowerShell + Start-Process -Verb RunAs para UAC. Usamos -Wait para saber
  // si el proceso terminó, y -PassThru + ExitCode para detectar fallos.
  // El "delete" se ignora si no existe la reserva (devuelve error pero no
  // afecta al "add" siguiente).
  const psCmd =
    `$ErrorActionPreference='SilentlyContinue';` +
    `$p=Start-Process -FilePath netsh -ArgumentList 'http','delete','urlacl','url=${url}' -Verb RunAs -WindowStyle Hidden -Wait -PassThru;` +
    `$ErrorActionPreference='Stop';` +
    `$p=Start-Process -FilePath netsh -ArgumentList 'http','add','urlacl','url=${url}','user=Everyone' -Verb RunAs -WindowStyle Hidden -Wait -PassThru;` +
    `exit $p.ExitCode`;
  return await new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
      stdio: 'ignore', windowsHide: true,
    });
    ps.on('error', (err) => resolve({ ok: false, error: err.message, url }));
    ps.on('exit', (code) => {
      if (code === 0) resolve({ ok: true, url });
      // Code 1223 = usuario canceló UAC.
      else if (code === 1223) resolve({ ok: false, error: tm('sensors.uacCancelled'), url });
      else resolve({ ok: false, error: `${tm('sensors.netshCode')} ${code}`, url });
    });
  });
}

export async function killLHM(): Promise<void> {
  if (lhmProc && !lhmProc.killed) {
    try { lhmProc.kill(); } catch {}
  }
  lhmProc = null;
}
