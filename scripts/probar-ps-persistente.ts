// Prueba del PowerShell persistente (roadmap 122): lectura y escritura del
// volumen con el mismo script que usa la app, errores que no envenenan la
// siguiente orden, relanzamiento tras un timeout y la medida frente a
// procesos sueltos. Deja el volumen como estaba.
//   npx tsx scripts/probar-ps-persistente.ts
import { performance } from 'perf_hooks';
import { ejecutarPSPersistente, cerrarPSPersistente } from '../electron/main/launcher/psPersistente';
import { runPS } from '../electron/main/launcher/ps-helpers';
import { VOLUMEN_PS } from '../electron/main/launcher/volumenPS';

const LEER = `${VOLUMEN_PS}\nWrite-Output ([VolumenVD]::Get())\n`;
const ESCRIBIR = (pct: number) => `${VOLUMEN_PS}\n[VolumenVD]::Set(${pct} / 100.0)\n`;

let fallos = 0;
function comprobar(cond: boolean, que: string, detalle = ''): void {
  console.log(`${cond ? 'ok  ' : 'MAL '} ${que}${detalle ? ` (${detalle})` : ''}`);
  if (!cond) fallos++;
}

function volumen(salida: string): number | null {
  const f = parseFloat(salida.trim().split(/\r?\n/)[0] ?? '');
  return Number.isFinite(f) ? Math.round(f * 100) : null;
}

async function leer(): Promise<number | null> {
  const r = await ejecutarPSPersistente(LEER);
  return r.ok ? volumen(r.stdout) : null;
}

async function main(): Promise<void> {
  if (process.platform !== 'win32') {
    console.error('Esta prueba solo corre en Windows.');
    process.exit(1);
  }

  const inicial = await leer();
  comprobar(inicial !== null, 'lee el volumen', `${inicial}%`);
  if (inicial === null) return;

  // Escribir tras leer en el mismo proceso: antes chocaban los tipos C#.
  const otro = inicial > 0 ? inicial - 1 : 1;
  const w = await ejecutarPSPersistente(ESCRIBIR(otro));
  comprobar(w.ok, 'escribe el volumen en el mismo proceso', w.stderr);
  const tras = await leer();
  // Hay salidas (mezcladores virtuales) que ignoran el volumen maestro, también
  // por el núcleo nativo: eso es del equipo, no de esta prueba.
  if (tras !== otro) console.log(`aviso: la salida por defecto no cambió de volumen (${tras}% tras pedir ${otro}%)`);

  const e = await ejecutarPSPersistente('throw "fallo a proposito"');
  comprobar(!e.ok && e.stderr.includes('fallo a proposito'), 'un error sale como ok=false con su mensaje');
  comprobar((await leer()) === tras, 'la orden siguiente al error va bien');

  // Dos órdenes a la vez: la segunda espera en la cola a que el timeout relance el proceso.
  const lenta = ejecutarPSPersistente('Start-Sleep -Seconds 7');
  const despues = leer();
  comprobar(!(await lenta).ok, 'una orden de más de 5 s se corta');
  comprobar((await despues) === tras, 'la orden encolada tras el timeout corre en el proceso nuevo');

  const veces = 20;
  const t0 = performance.now();
  for (let i = 0; i < veces; i++) await leer();
  const msPersistente = (performance.now() - t0) / veces;

  const sueltas = 3;
  const t1 = performance.now();
  for (let i = 0; i < sueltas; i++) await runPS(LEER, { timeoutMs: 15000 });
  const msSuelto = (performance.now() - t1) / sueltas;
  console.log(`persistente ${msPersistente.toFixed(1)} ms/lectura, suelto ${msSuelto.toFixed(1)} ms/lectura`);

  const r = await ejecutarPSPersistente(ESCRIBIR(inicial));
  comprobar(r.ok, 'volumen restaurado', `${inicial}%`);
}

main()
  .catch((e) => { console.error(e); fallos++; })
  .finally(() => {
    cerrarPSPersistente();
    if (fallos) { console.error(`${fallos} comprobación(es) fallaron`); process.exit(1); }
    console.log('todo bien');
  });
