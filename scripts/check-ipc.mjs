// Cada canal IPC tiene manejador en el proceso principal Y puente en el preload.
//
// Los dos lados se escriben por separado y solo se encuentran en tiempo de
// ejecución, cuando el usuario pulsa lo que sea: un canal renombrado en un
// lado y no en el otro no lo ve `tsc` —son cadenas— ni el build. Falla en la
// máquina del usuario, y solo por ese camino.
//
// Hoy están alineados (85 canales y 5 eventos). Esto es para que sigan.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const MAIN = 'electron/main';
const PRELOAD = 'electron/preload/index.ts';

function archivos(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (extname(ruta) === '.ts') salida.push(ruta);
  }
  return salida;
}

function buscar(fuente, patron) {
  return new Set([...fuente.matchAll(patron)].map((m) => m[m.length - 1]));
}

const fuenteMain = archivos(MAIN).map((r) => readFileSync(r, 'utf-8')).join('\n');
const fuentePreload = readFileSync(PRELOAD, 'utf-8');

// Petición-respuesta: `ipcMain.handle/on` contra `ipcRenderer.invoke/send`.
const conManejador = buscar(fuenteMain, /ipcMain\.(?:handle|on)\(\s*'([^']+)'/g);
const conPuente = buscar(fuentePreload, /ipcRenderer\.(?:invoke|send)\(\s*'([^']+)'/g);

// Avisos del principal al renderer: `webContents.send` contra `ipcRenderer.on`.
const emitidos = buscar(fuenteMain, /webContents\.send\(\s*'([^']+)'/g);
const escuchados = buscar(fuentePreload, /ipcRenderer\.on\(\s*'([^']+)'/g);

const problemas = [];
for (const c of conManejador) {
  if (!conPuente.has(c)) problemas.push(`'${c}' tiene manejador pero no puente en el preload — nadie puede llamarlo`);
}
for (const c of conPuente) {
  if (!conManejador.has(c)) problemas.push(`'${c}' se invoca desde el preload y no tiene manejador — reventaría al usarse`);
}
for (const c of emitidos) {
  if (!escuchados.has(c)) problemas.push(`el evento '${c}' se emite y el preload no lo escucha — no llega a la interfaz`);
}
for (const c of escuchados) {
  if (!emitidos.has(c)) problemas.push(`el preload escucha '${c}' y nadie lo emite`);
}

if (problemas.length) {
  console.error(`ipc: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(`ipc: ok — ${conManejador.size} canales y ${emitidos.size} eventos, los dos lados cuadran`);
