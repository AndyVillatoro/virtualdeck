import { app } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, unlinkSync, statSync } from 'fs';

function getConfigPath() {
  return join(app.getPath('userData'), 'deck-config.json');
}

function getBackupsDir() {
  return join(app.getPath('userData'), 'backups');
}

/**
 * La ruta donde quedó guardado un `deck-config.json` ilegible, si lo hubo.
 *
 * `null` mientras no pase, que es lo normal.
 */
let rutaDanado: string | null = null;

export function configDanado(): string | null {
  return rutaDanado;
}

/**
 * Carga la configuración; `{}` si no hay ninguna.
 *
 * **Un archivo ilegible no es lo mismo que un archivo ausente**, y aquí se
 * devolvía `{}` para los dos. Con eso, un `deck-config.json` cortado a la mitad
 * —un corte de luz mientras se escribe— salía como un deck vacío, sin decir
 * nada, y **la primera vez que el usuario tocaba algo se guardaba encima**.
 * Medido: cuatro botones desaparecidos, ninguna copia utilizable y ni un aviso.
 *
 * Ahora el archivo roto se aparta antes de que nada lo pise, con un nombre que
 * la rotación de copias no borra, y quien pregunte puede saber que pasó.
 */
export function loadConfig(): object {
  const p = getConfigPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    // Una sola copia por avería. `loadConfig` se llama varias veces al
    // arrancar —el proceso principal para la bandeja y los sensores, y la
    // pantalla por su cuenta— y sin esto salía un `config-danado-` por llamada.
    rutaDanado = rutaDanado ?? apartarDanado(p);
    return {};
  }
}

/** ¿El archivo de configuración se puede leer? */
function esLegible(ruta: string): boolean {
  try { JSON.parse(readFileSync(ruta, 'utf-8')); return true; } catch { return false; }
}

/** Guarda el archivo ilegible aparte. Devuelve dónde quedó, o `null`. */
function apartarDanado(configPath: string): string | null {
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    // El prefijo es distinto **a propósito**: `listBackups` y la rotación solo
    // miran los `deck-config-*`, así que esto no sale en la lista de copias
    // (no serviría para restaurar: no se puede leer) ni lo borra la rotación.
    const destino = join(dir, `config-danado-${ts}.json`);
    copyFileSync(configPath, destino);
    return destino;
  } catch { return null; }
}

const BACKUP_COOLDOWN_MS = 5 * 60 * 1000;
const BACKUP_RETAIN = 5;
let lastBackupAt = 0;

/**
 * Copia de seguridad rotatoria, con enfriamiento.
 *
 * `forzar` salta ese enfriamiento, y hay un caso en que es obligatorio:
 * **restaurar**. Restaurar sobrescribe lo que hay ahora, o sea que es
 * justamente el momento en el que más falta hace una copia de lo que se va a
 * tirar — y era el único momento en el que el enfriamiento podía impedirla.
 * Con una copia hecha hacía menos de cinco minutos, restaurar borraba la
 * configuración actual sin dejar rastro de ella.
 */
function rotateBackup(configPath: string, forzar = false) {
  const now = Date.now();
  if (!forzar && now - lastBackupAt < BACKUP_COOLDOWN_MS) return;
  if (!existsSync(configPath)) return;
  // Copiar un archivo que no se puede leer no es una copia de seguridad: es
  // basura con nombre de copia, y sale en la lista de restaurar como si
  // sirviera. Restaurarla vuelve a romper la configuración. Pasaba de verdad —
  // al arrancar con un `deck-config.json` cortado, el primer guardado hacía una
  // «copia» ilegible y la ofrecía junto a las buenas.
  if (!esLegible(configPath)) return;
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    // El nombre solo llega al segundo. Dos copias dentro del mismo segundo
    // —que es lo que pasa al restaurar justo después de guardar— se pisarían
    // la una a la otra, y la que se pierde es la que se acaba de hacer.
    let destino = join(dir, `deck-config-${ts}.json`);
    for (let n = 2; existsSync(destino) && n < 100; n++) {
      destino = join(dir, `deck-config-${ts}-${n}.json`);
    }
    copyFileSync(configPath, destino);
    lastBackupAt = now;
    const files = readdirSync(dir)
      .filter((f) => f.startsWith('deck-config-') && f.endsWith('.json'))
      .sort();
    while (files.length > BACKUP_RETAIN) {
      try { unlinkSync(join(dir, files.shift()!)); } catch {}
    }
  } catch {}
}

export function saveConfig(data: object, forzarCopia = false) {
  try {
    const dir = app.getPath('userData');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const configPath = getConfigPath();
    rotateBackup(configPath, forzarCopia);
    writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

export function listBackups(): { filename: string; timestamp: number; sizeBytes: number }[] {
  try {
    const dir = getBackupsDir();
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.startsWith('deck-config-') && f.endsWith('.json'))
      .map((filename) => {
        const full = join(dir, filename);
        const s = statSync(full);
        return { filename, timestamp: s.mtimeMs, sizeBytes: s.size };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch { return []; }
}

export function restoreBackup(filename: string): object | null {
  try {
    if (!/^deck-config-[\w\-:.]+\.json$/.test(filename)) return null;
    const full = join(getBackupsDir(), filename);
    if (!existsSync(full)) return null;
    const data = JSON.parse(readFileSync(full, 'utf-8'));
    // `true`: copia obligatoria de lo que hay ahora, antes de pisarlo.
    saveConfig(data, true);
    return data;
  } catch { return null; }
}
