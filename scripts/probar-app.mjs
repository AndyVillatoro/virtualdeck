#!/usr/bin/env node
/**
 * La copia de prueba de VirtualDeck, para los agentes (y para quien sea).
 *
 * Varios agentes trabajan a la vez y cada uno abría su propia copia de la app
 * para medir, y no la cerraba: llegó a haber seis abiertas (2026-10-05). Este
 * script es **la única forma** de abrir una copia de prueba:
 *
 * - **una sola a la vez** para todos: un candado en `%TEMP%\vd-prueba.lock`
 *   con el PID y quién la abrió; si hay otra viva, se niega y dice de quién es;
 * - siempre con **su propia carpeta de datos** (`%TEMP%\vd-prueba-<quien>`):
 *   nunca la configuración del dueño;
 * - **desacoplada y sin colgar a quien la lanza**: la salida va a un archivo de
 *   registro, no a la terminal (lanzarla con la salida redirigida a la propia
 *   herramienta dejaba al agente esperando para siempre);
 * - con un **tope de vida**: una copia de más de 15 minutos se cierra sola la
 *   próxima vez que alguien llame al script.
 *
 * Uso (desde la raíz del repo, después de `npm run build`):
 *   node scripts/probar-app.mjs abrir <quien> [--diag] [--sin-nucleo]
 *   node scripts/probar-app.mjs estado
 *   node scripts/probar-app.mjs cerrar
 *   node scripts/probar-app.mjs medir-arranque <quien> [veces=3]
 *   node scripts/probar-app.mjs limpiar
 *
 * `limpiar` (y `abrir`, que lo hace antes) cierra **cualquier** copia de la app
 * con la carpeta de datos en `%TEMP%` que no sea la registrada en el candado:
 * las que un agente abrió a mano sin pasar por aquí. Las del dueño (sin
 * `--user-data-dir` en `%TEMP%`) nunca se tocan.
 *
 * Al abrir imprime el PID, el registro y el puerto de depuración remota (9333)
 * para conectarse por CDP.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const CANDADO = join(tmpdir(), 'vd-prueba.lock');
const ELECTRON = join(RAIZ, 'node_modules', 'electron', 'dist', 'electron.exe');
const PUERTO_CDP = 9333;
const VIDA_MAXIMA_MS = 15 * 60 * 1000;

function vivo(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function leerCandado() {
  if (!existsSync(CANDADO)) return null;
  try { return JSON.parse(readFileSync(CANDADO, 'utf-8')); } catch { return null; }
}

function matarArbol(pid) {
  try { execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ya no estaba */ }
}

function cerrar({ silencioso = false } = {}) {
  const c = leerCandado();
  if (!c) { if (!silencioso) console.log('No hay ninguna copia de prueba abierta.'); return; }
  if (vivo(c.pid)) matarArbol(c.pid);
  rmSync(CANDADO, { force: true });
  try { rmSync(c.datos, { recursive: true, force: true }); } catch { /* en uso un instante: da igual */ }
  if (!silencioso) console.log(`Cerrada la copia de prueba de «${c.quien}» (PID ${c.pid}).`);
}

/** Si hay una copia viva de otro, `false`; las caducadas o muertas se limpian. */
function hayHueco() {
  const c = leerCandado();
  if (!c) return true;
  if (!vivo(c.pid)) { rmSync(CANDADO, { force: true }); return true; }
  if (Date.now() - c.inicio > VIDA_MAXIMA_MS) {
    console.log(`La copia de «${c.quien}» llevaba más de 15 minutos: se cierra.`);
    cerrar({ silencioso: true });
    return true;
  }
  console.error(`Ya hay una copia de prueba abierta por «${c.quien}» (PID ${c.pid}, desde ${new Date(c.inicio).toLocaleTimeString()}).`);
  console.error('Espera a que termine, o ciérrala con: node scripts/probar-app.mjs cerrar');
  return false;
}

function abrir(quien, banderas) {
  if (!quien) { console.error('Falta <quien> (p. ej. opencode, agy, deepseek).'); process.exit(2); }
  if (!existsSync(join(RAIZ, 'out', 'main', 'index.js'))) {
    console.error('No hay build: corre antes `npm run build`.'); process.exit(2);
  }
  limpiar({ silencioso: true });
  if (!hayHueco()) process.exit(1);
  const datos = join(tmpdir(), `vd-prueba-${quien.replace(/[^a-z0-9_-]/gi, '')}`);
  rmSync(datos, { recursive: true, force: true });
  mkdirSync(datos, { recursive: true });
  const registro = join(datos, 'app.log');
  const fd = openSync(registro, 'a');
  const env = { ...process.env };
  if (banderas.includes('--diag')) env.VD_DIAG = '1';
  if (banderas.includes('--sin-nucleo')) env.VD_SIN_NUCLEO = '1';
  const hijo = spawn(ELECTRON, ['.', `--user-data-dir=${datos}`, `--remote-debugging-port=${PUERTO_CDP}`], {
    cwd: RAIZ, env, detached: true, stdio: ['ignore', fd, fd], windowsHide: false,
  });
  hijo.unref();
  writeFileSync(CANDADO, JSON.stringify({ pid: hijo.pid, quien, inicio: Date.now(), datos, registro }));
  console.log(`Abierta para «${quien}»: PID ${hijo.pid}`);
  console.log(`  registro: ${registro}`);
  console.log(`  CDP:      http://127.0.0.1:${PUERTO_CDP}/json`);
  console.log('  ciérrala al terminar: node scripts/probar-app.mjs cerrar');
  return { pid: hijo.pid, registro };
}

function estado() {
  const c = leerCandado();
  if (!c) { console.log('Sin copia de prueba abierta.'); return; }
  console.log(`Copia de «${c.quien}», PID ${c.pid}, ${vivo(c.pid) ? 'viva' : 'muerta'}, desde ${new Date(c.inicio).toLocaleTimeString()}`);
  try {
    const lineas = readFileSync(c.registro, 'utf-8').trim().split(/\r?\n/).slice(-8);
    console.log(lineas.map((l) => `  | ${l}`).join('\n'));
  } catch { /* sin registro todavía */ }
}

/** Procesos principales de Electron con la carpeta de datos dentro de %TEMP%. */
function copiasEnTemp() {
  const ps = "Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | "
    + "Where-Object { $_.CommandLine -notmatch '--type=' } | "
    + "Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress";
  let salida = '';
  try { salida = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf-8' }).trim(); } catch { return []; }
  if (!salida) return [];
  const lista = [].concat(JSON.parse(salida));
  const normal = (ruta) => ruta.toLowerCase().replaceAll('\\', '/');
  const temp = normal(tmpdir());
  return lista.filter((p) => {
    const m = /--user-data-dir[= ]"?([^" ]+)/.exec(p.CommandLine ?? '');
    return m && normal(m[1]).startsWith(temp);
  });
}

/** Cierra las copias de prueba que no son la del candado. Devuelve cuántas. */
function limpiar({ silencioso = false } = {}) {
  const c = leerCandado();
  const sueltas = copiasEnTemp().filter((p) => !(c && vivo(c.pid) && p.ProcessId === c.pid));
  for (const p of sueltas) matarArbol(p.ProcessId);
  if (!silencioso || sueltas.length > 0) {
    console.log(sueltas.length > 0
      ? `Cerradas ${sueltas.length} copia(s) de prueba abiertas sin el script: ${sueltas.map((p) => p.ProcessId).join(', ')}`
      : 'No hay copias de prueba sueltas.');
  }
  return sueltas.length;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abre, espera la línea `[arranque] ventana visible a los N ms`, cierra; N veces. */
async function medirArranque(quien, veces) {
  const tiempos = [];
  for (let i = 0; i < veces; i++) {
    const { registro } = abrir(quien, ['--diag']);
    let ms = null;
    for (let t = 0; t < 60 && ms === null; t++) {
      await esperar(500);
      const m = /\[arranque\] ventana visible a los (\d+) ms/.exec(readFileSync(registro, 'utf-8'));
      if (m) ms = Number(m[1]);
    }
    cerrar({ silencioso: true });
    await esperar(800);
    tiempos.push(ms);
    console.log(`  vuelta ${i + 1}: ${ms === null ? 'sin la línea de arranque en 30 s' : `${ms} ms`}`);
  }
  console.log(`Arranque (${quien}): ${tiempos.join(', ')} ms`);
}

const [orden, ...resto] = process.argv.slice(2);
if (orden === 'abrir') abrir(resto[0], resto.slice(1));
else if (orden === 'cerrar') cerrar();
else if (orden === 'estado') estado();
else if (orden === 'limpiar') limpiar();
else if (orden === 'medir-arranque') await medirArranque(resto[0], Number(resto[1] ?? 3));
else { console.error('Uso: node scripts/probar-app.mjs abrir <quien> [--diag] [--sin-nucleo] | estado | cerrar | limpiar | medir-arranque <quien> [veces]'); process.exit(2); }
