/**
 * Prueba de `ColaImagenes`: orden, última-gana y lo que se ahorra en un giro
 * rápido. Se ejecuta con `npx tsx electron/main/superficies/probar-cola-imagenes.ts`.
 *
 * La escritura HID se simula con una espera (`MS_ESCRITURA`): no es una medida
 * del aparato, es lo que cuesta cada imagen en la cola serializada del driver.
 */
import assert from 'node:assert';
import { ColaImagenes, type EncolarTarea } from './colaImagenes';

const MS_ESCRITURA = 40;
const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** La misma cola serializada que `DispositivoMirabox.enCola`. */
function crearEncolar(): EncolarTarea {
  let cola: Promise<void> = Promise.resolve();
  return (tarea) => {
    const siguiente = cola.then(tarea);
    cola = siguiente;
    return siguiente;
  };
}

function imagen(valor: number): Buffer {
  return Buffer.from([valor]);
}

async function sustituyeLaPendienteDeLaMismaTecla(): Promise<void> {
  const salida: string[] = [];
  const encolar = crearEncolar();
  const cola = new ColaImagenes(encolar, async (id, jpeg) => { salida.push(`${id}:${jpeg[0]}`); await esperar(1); });
  const hechas = [cola.poner(1, imagen(1)), cola.poner(1, imagen(2)), cola.poner(1, imagen(3))];
  await Promise.all(hechas);
  assert.deepStrictEqual(salida, ['1:3']);
  assert.strictEqual(cola.sustituidas, 2);
}

async function teclasDistintasNoSePisan(): Promise<void> {
  const salida: string[] = [];
  const cola = new ColaImagenes(crearEncolar(), async (id, jpeg) => { salida.push(`${id}:${jpeg[0]}`); await esperar(1); });
  await Promise.all([cola.poner(1, imagen(1)), cola.poner(2, imagen(2)), cola.poner(1, imagen(3))]);
  assert.deepStrictEqual(salida, ['1:3', '2:2']);
}

async function laNuevaDuranteLaEscrituraSaleDespues(): Promise<void> {
  const salida: string[] = [];
  const cola = new ColaImagenes(crearEncolar(), async (id, jpeg) => { salida.push(`${id}:${jpeg[0]}`); await esperar(10); });
  const primera = cola.poner(1, imagen(1));
  await esperar(3); // la escritura de 1:1 ya empezó
  const segunda = cola.poner(1, imagen(2));
  await Promise.all([primera, segunda]);
  assert.deepStrictEqual(salida, ['1:1', '1:2']);
}

async function unaOrdenCierraLaTanda(): Promise<void> {
  const salida: string[] = [];
  const encolar = crearEncolar();
  const cola = new ColaImagenes(encolar, async (id, jpeg) => { salida.push(`img${id}:${jpeg[0]}`); await esperar(5); });
  const a = cola.poner(1, imagen(1));
  // Una orden que no es imagen (borrar) entra en la cola y cierra la tanda.
  const borrar = encolar(async () => { salida.push('clear'); await esperar(5); });
  cola.cerrarTanda();
  const b = cola.poner(1, imagen(2));
  await Promise.all([a, borrar, b]);
  assert.deepStrictEqual(salida, ['img1:1', 'clear', 'img1:2']);
}

async function unFalloNoDejaLaColaMuerta(): Promise<void> {
  const salida: string[] = [];
  let falla = true;
  const encolar: EncolarTarea = (tarea) => tarea().catch(() => {});
  const cola = new ColaImagenes(encolar, async (id, jpeg) => {
    if (falla) { falla = false; throw new Error('hid'); }
    salida.push(`${id}:${jpeg[0]}`);
  });
  await cola.poner(1, imagen(1));
  await cola.poner(1, imagen(2));
  assert.deepStrictEqual(salida, ['1:2']);
}

/** Un giro rápido: un aviso cada `cadaMs`, y se mide cuándo sale el último. */
async function giroRapido(
  usarCola: boolean, pasos: number, cadaMs: number,
): Promise<{ escrituras: number; msHastaElUltimo: number }> {
  const encolar = crearEncolar();
  let escrituras = 0;
  const escribir = async () => { escrituras += 1; await esperar(MS_ESCRITURA); };
  const cola = new ColaImagenes(encolar, escribir);
  const inicio = performance.now();
  const hechas: Promise<void>[] = [];
  for (let i = 0; i < pasos; i += 1) {
    hechas.push(usarCola ? cola.poner(1, imagen(i)) : encolar(escribir));
    await esperar(cadaMs);
  }
  await Promise.all(hechas);
  return { escrituras, msHastaElUltimo: Math.round(performance.now() - inicio - cadaMs) };
}

async function medirAhorro(): Promise<void> {
  const antes = await giroRapido(false, 40, 20);
  const despues = await giroRapido(true, 40, 20);
  console.log(`giro rapido 40 pasos a 20 ms, escritura ${MS_ESCRITURA} ms:`);
  console.log(`  antes:   ${antes.escrituras} imagenes escritas, ultima a los ${antes.msHastaElUltimo} ms`);
  console.log(`  despues: ${despues.escrituras} imagenes escritas, ultima a los ${despues.msHastaElUltimo} ms`);
  assert.ok(despues.escrituras < antes.escrituras * 0.75);
  assert.ok(despues.msHastaElUltimo <= antes.msHastaElUltimo);
}

async function main(): Promise<void> {
  console.log('test: colaImagenes');
  await sustituyeLaPendienteDeLaMismaTecla();
  await teclasDistintasNoSePisan();
  await laNuevaDuranteLaEscrituraSaleDespues();
  await unaOrdenCierraLaTanda();
  await unFalloNoDejaLaColaMuerta();
  await medirAhorro();
  console.log('OK: colaImagenes');
}

void main();
