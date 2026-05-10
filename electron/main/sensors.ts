import { app, net } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Integration with LibreHardwareMonitor (LHM). LHM exposes its full sensor
// tree at http://host:port/data.json when "Run Web Server" is enabled in its
// settings. We optionally bundle LHM under resources/lhm and can spawn it on
// startup so the user doesn't need a separate install.

export type SensorKind =
  | 'Temperature' | 'Fan' | 'Voltage' | 'Load' | 'Clock' | 'Power'
  | 'Data' | 'Throughput' | 'Level' | 'SmallData' | 'Other';

export type SensorCategory = 'cpu' | 'gpu' | 'mainboard' | 'memory' | 'storage' | 'other';

export interface Sensor {
  /** Stable across runs — LHM's SensorId path, e.g. "/amdcpu/0/temperature/0". */
  id: string;
  name: string;
  hardware: string;
  /** Hardware category, derived from the LHM ImageURL (cpu.png, nvidia.png…). */
  category: SensorCategory;
  kind: SensorKind;
  value: number;
  unit: string;
  min?: number;
  max?: number;
}

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

let host = '127.0.0.1';
let port = 8085;
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
  if (opts.host) host = opts.host;
  if (typeof opts.port === 'number' && opts.port > 0) port = opts.port;
  if (opts.enabled !== undefined) enabled = opts.enabled;
  if (opts.categories && Array.isArray(opts.categories)) allowedCategories = new Set(opts.categories);
}

export function status(): SensorsStatus {
  return {
    enabled, connected, host, port,
    count: cache.length, error: lastError, lastFetchAt,
    bundledRunning: !!lhmProc && !lhmProc.killed,
  };
}

function parseValue(raw: string | undefined): { value: number; unit: string } {
  if (!raw) return { value: NaN, unit: '' };
  // LHM strings look like "45.0 °C", "1234 RPM", "1.250 V", "85 %", "3500 MHz".
  // Some locales emit comma decimals ("45,0 °C") — normalize first.
  const m = String(raw).replace(',', '.').match(/^\s*(-?\d+(?:\.\d+)?)\s*(\S.*?)?\s*$/);
  if (!m) return { value: NaN, unit: '' };
  return { value: parseFloat(m[1]), unit: (m[2] ?? '').trim() };
}

// Maps LHM's ImageURL filename to our coarse category bucket. The icons are
// stable across LHM versions: cpu.png / amd.png / nvidia.png / mainboard.png /
// ram.png / hdd.png / nic.png / battery.png …
function categoryFromImage(image: string | undefined): SensorCategory {
  if (!image) return 'other';
  const f = image.toLowerCase();
  if (f.includes('cpu')) return 'cpu';
  if (f.includes('amd') || f.includes('nvidia') || f.includes('intel-gpu') || f.includes('gpu')) return 'gpu';
  if (f.includes('mainboard') || f.includes('motherboard') || f.includes('chip')) return 'mainboard';
  if (f.includes('ram') || f.includes('memory')) return 'memory';
  if (f.includes('hdd') || f.includes('ssd') || f.includes('nvme') || f.includes('storage')) return 'storage';
  return 'other';
}

// Fallback when the hardware node has no ImageURL (rare, but happens on some
// older LHM builds). Inspect the hardware *name* for keywords.
function categoryFromName(name: string): SensorCategory {
  const n = name.toLowerCase();
  if (/ryzen|core i\d|xeon|threadripper|^cpu\b|processor/.test(n)) return 'cpu';
  if (/geforce|radeon|rtx|gtx|quadro|nvidia|^gpu\b|amd graphics|intel.*graphics/.test(n)) return 'gpu';
  if (/^board|mainboard|chipset|prime|tuf|rog|x[57]70|b[567]50|z[567]90/.test(n)) return 'mainboard';
  if (/memory|ddr[345]|ram(\b|$)/.test(n)) return 'memory';
  if (/nvme|ssd|hdd|samsung |kingston |wd_|crucial|seagate|toshiba/.test(n)) return 'storage';
  return 'other';
}

// Walks the LHM tree. Hardware label sits at depth 2: root → "Computer" → HW → SensorType → Leaf.
function flatten(node: any, depth: number, hardware: string, category: SensorCategory, out: Sensor[]): void {
  if (!node) return;
  let hw = hardware;
  let cat = category;
  if (depth === 2 && node.Text && !node.SensorId) {
    hw = String(node.Text);
    const fromImg = categoryFromImage(node.ImageURL);
    cat = fromImg !== 'other' ? fromImg : categoryFromName(hw);
  }

  if (node.SensorId && node.Type) {
    const v = parseValue(node.Value);
    const mn = parseValue(node.Min);
    const mx = parseValue(node.Max);
    if (isFinite(v.value)) {
      out.push({
        id: String(node.SensorId),
        name: String(node.Text ?? node.SensorId),
        hardware: hw,
        category: cat,
        kind: String(node.Type) as SensorKind,
        value: v.value,
        unit: v.unit,
        min: isFinite(mn.value) ? mn.value : undefined,
        max: isFinite(mx.value) ? mx.value : undefined,
      });
    }
  }
  for (const c of node.Children ?? []) flatten(c, depth + 1, hw, cat, out);
}

async function fetchTree(): Promise<any> {
  const url = `http://${host}:${port}/data.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await net.fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function applyCategoryFilter(all: Sensor[]): Sensor[] {
  return all.filter((s) => allowedCategories.has(s.category));
}

export async function list(force = false): Promise<Sensor[]> {
  if (!enabled) { connected = false; return []; }
  if (!force && Date.now() - lastFetchAt < CACHE_MS) return applyCategoryFilter(cache);
  try {
    const tree = await fetchTree();
    const out: Sensor[] = [];
    flatten(tree, 0, '', 'other', out);
    cache = out;
    connected = true;
    lastError = undefined;
    lastFetchAt = Date.now();
    return applyCategoryFilter(cache);
  } catch (e) {
    connected = false;
    lastError = (e as Error).message;
    // Return last-known cache on transient failures so the UI doesn't flicker
    // to "no data" every time LHM hiccups for one tick.
    return applyCategoryFilter(cache);
  }
}

export async function get(id: string): Promise<Sensor | null> {
  // Bypass the category filter for direct id lookup so a saved widget keeps
  // working even if the user later narrows the allowed categories.
  if (Date.now() - lastFetchAt > CACHE_MS) await list();
  return cache.find((s) => s.id === id) ?? null;
}

export async function probe(): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!enabled) return { ok: false, count: 0, error: 'Sensores deshabilitados' };
  try {
    const tree = await fetchTree();
    const out: Sensor[] = [];
    flatten(tree, 0, '', 'other', out);
    cache = out;
    connected = true;
    lastError = undefined;
    lastFetchAt = Date.now();
    return { ok: true, count: applyCategoryFilter(out).length };
  } catch (e) {
    connected = false;
    const msg = (e as Error).message;
    lastError = msg;
    return { ok: false, count: 0, error: msg };
  }
}

// Returns the bundled LHM executable path. In dev: <project>/resources/lhm.
// In packaged builds: process.resourcesPath/lhm (electron-builder ships it
// there via the extraResources config in package.json).
export function bundledExePath(): string | null {
  const candidates = [
    join(process.resourcesPath || '', 'lhm', 'LibreHardwareMonitor.exe'),
    join(app.getAppPath(), '..', 'resources', 'lhm', 'LibreHardwareMonitor.exe'),
    join(app.getAppPath(), 'resources', 'lhm', 'LibreHardwareMonitor.exe'),
  ];
  for (const p of candidates) if (p && existsSync(p)) return p;
  return null;
}

export async function spawnLHM(customPath?: string, elevated = false): Promise<{ ok: boolean; error?: string }> {
  if (lhmProc && !lhmProc.killed) return { ok: true };
  const exe = customPath || bundledExePath();
  if (!exe || !existsSync(exe)) return { ok: false, error: 'LibreHardwareMonitor.exe no encontrado' };
  const cwd = exe.substring(0, exe.lastIndexOf('\\')) || undefined;
  try {
    if (elevated) {
      // HttpListener en Windows requiere admin (o URL ACL). Lanzamos LHM via
      // PowerShell Start-Process -Verb RunAs para disparar UAC. No podemos
      // trackear el proceso resultante (cambia de sesión), así que lhmProc
      // queda null pero LHM ya corre con privilegios.
      const ps = spawn('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `Start-Process -FilePath '${exe.replace(/'/g, "''")}' -WorkingDirectory '${(cwd || '').replace(/'/g, "''")}' -Verb RunAs -WindowStyle Hidden`,
      ], { stdio: 'ignore', windowsHide: true });
      ps.on('error', (err) => { lastError = `LHM spawn (elevated): ${err.message}`; });
      // Damos tiempo a UAC + cold start (puede tardar más con admin).
      await new Promise((r) => setTimeout(r, 3500));
      return { ok: true };
    }
    // detached:false + windowsHide so LHM tray icon shows but no console window.
    // LHM reads its config from the same dir as the .exe — bundled config
    // already has runWebServerMenuItem=true and listenerPort=8085.
    const child = spawn(exe, [], {
      detached: false,
      stdio: 'ignore',
      windowsHide: true,
      cwd,
    });
    child.on('exit', () => { if (lhmProc === child) lhmProc = null; });
    child.on('error', (err) => { lastError = `LHM spawn: ${err.message}`; });
    lhmProc = child;
    // LHM needs ~1.5–3 s before the web server starts accepting connections.
    await new Promise((r) => setTimeout(r, 2000));
    return { ok: true };
  } catch (e) {
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
      else if (code === 1223) resolve({ ok: false, error: 'UAC cancelado por el usuario', url });
      else resolve({ ok: false, error: `netsh terminó con código ${code}`, url });
    });
  });
}

export async function killLHM(): Promise<void> {
  if (lhmProc && !lhmProc.killed) {
    try { lhmProc.kill(); } catch {}
  }
  lhmProc = null;
}
