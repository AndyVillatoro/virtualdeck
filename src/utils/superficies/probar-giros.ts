/**
 * Pruebas del camino de un giro de perilla, en la parte logica: ningun paso se
 * pierde, la direccion es la correcta y el pintado del aviso no se amontona.
 * Se ejecuta con `npx tsx src/utils/superficies/probar-giros.ts`.
 *
 * Inyecta entradas en el mismo punto que usa `useSuperficies`: la funcion que
 * resuelve el hueco (`huecoDeEntrada`) y el despacho (`despacharBoton`).
 */
import assert from 'node:assert';
import type { ButtonConfig, DisposicionSuperficie, EntradaSuperficie } from '../../types';
import { huecoDeEntrada } from './disposicion';
import { conSubida, crearDetectorLargo, despacharBoton } from './despachoTecla';
import { crearEstadoPinturas, pedirPintura } from './pinturaUltimaGana';

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const LCD = { ancho: 64, alto: 64, rotacion: 0 };
const DISPOSICION: DisposicionSuperficie = {
  nombre: 'test',
  verificado: false,
  controles: [
    { tipo: 'key', indice: 0, fila: 0, columna: 0, lcd: LCD },
    { tipo: 'knob', indice: 0, fila: 1, columna: 0 },
    { tipo: 'knob', indice: 1, fila: 1, columna: 1 },
  ],
};

function boton(id: string): ButtonConfig {
  return { id, page: 0, label: id, icon: '', action: { type: 'hotkey', hotkey: 'F13' } };
}

function entrada(gesto: EntradaSuperficie['gesto'], indice = 0): EntradaSuperficie {
  return { serial: 'S1', control: 'knob', indice, gesto };
}

/** Los huecos de la perilla 0 son 1 (izq), 2 (pulsar) y 3 (der): la tecla ocupa el 0. */
function direccionYGestosHermanos(): void {
  assert.strictEqual(huecoDeEntrada(DISPOSICION, entrada('izq', 0)), 1);
  assert.strictEqual(huecoDeEntrada(DISPOSICION, entrada('down', 0)), 2);
  assert.strictEqual(huecoDeEntrada(DISPOSICION, entrada('der', 0)), 3);
  assert.strictEqual(huecoDeEntrada(DISPOSICION, entrada('izq', 1)), 4);
  assert.strictEqual(huecoDeEntrada(DISPOSICION, entrada('der', 1)), 6);
  assert.strictEqual(huecoDeEntrada(DISPOSICION, entrada('up', 0)), null);
}

/** N giros seguidos (mezclando sentidos y perillas) llegan N veces y en orden. */
function ningunGiroSePierde(): { us: number } {
  const llegados: string[] = [];
  const detector = crearDetectorLargo();
  const manejar = conSubida(detector, (e) => {
    const hueco = huecoDeEntrada(DISPOSICION, e);
    if (hueco === null) return;
    despacharBoton(e, boton(`h${hueco}`), {
      disparar: (b) => { llegados.push(b.id); },
      avisarGiro: (b) => { llegados.push(b.id); },
      detector,
    });
  });
  const total = 2000;
  const esperados: string[] = [];
  const t0 = performance.now();
  for (let i = 0; i < total; i += 1) {
    const e = entrada(i % 3 === 0 ? 'izq' : 'der', i % 2);
    esperados.push(`h${huecoDeEntrada(DISPOSICION, e)}`);
    manejar(e);
  }
  const us = ((performance.now() - t0) * 1000) / total;
  assert.deepStrictEqual(llegados, esperados);
  return { us };
}

/** Un giro sin `up` (el dock no lo manda) no deja nada pegado: el siguiente funciona igual. */
function sinSubidaNoQuedaPegado(): void {
  const llegados: string[] = [];
  const detector = crearDetectorLargo(20);
  const manejar = conSubida(detector, (e) => {
    const hueco = huecoDeEntrada(DISPOSICION, e);
    if (hueco === null) return;
    despacharBoton(e, boton(`h${hueco}`), { disparar: (b) => { llegados.push(b.id); }, avisarGiro: (b) => { llegados.push(b.id); }, detector });
  });
  manejar(entrada('der'));
  manejar(entrada('up'));
  manejar(entrada('der'));
  assert.deepStrictEqual(llegados, ['h3', 'h3']);
}

async function laPinturaDelAvisoNoSeAmontona(): Promise<void> {
  const MS_PINTURA = 40;
  const pasos = 40;
  const cadaMs = 20;

  async function correr(conLimite: boolean): Promise<{ pinturas: number; msHastaElUltimo: number; ultimoValor: number }> {
    const estado = crearEstadoPinturas();
    let pinturas = 0;
    let ultimoValor = -1;
    let hasta = 0;
    const pintar = (valor: number) => async () => {
      pinturas += 1;
      await esperar(MS_PINTURA);
      ultimoValor = valor;
      hasta = performance.now();
    };
    const inicio = performance.now();
    const todas: Promise<void>[] = [];
    for (let i = 0; i < pasos; i += 1) {
      if (conLimite) pedirPintura(estado, 'S1', pintar(i));
      else todas.push(pintar(i)());
      await esperar(cadaMs);
    }
    await Promise.all(todas);
    while (estado.enVuelo.size > 0) await esperar(5);
    return { pinturas, msHastaElUltimo: Math.round(hasta - inicio - cadaMs), ultimoValor };
  }

  // Sin limite las pinturas corren en paralelo (todas se lanzan a la vez): lo que
  // cuesta es el trabajo total. Con limite hay una sola en vuelo y la ultima sale.
  const antes = await correr(false);
  const despues = await correr(true);
  assert.strictEqual(despues.ultimoValor, pasos - 1);
  assert.ok(despues.pinturas < antes.pinturas);
  console.log(`paint of the key notice, ${pasos} steps every ${cadaMs} ms, paint cost ${MS_PINTURA} ms:`);
  console.log(`  before: ${antes.pinturas} paints launched`);
  console.log(`  after:  ${despues.pinturas} paints launched, last value shown at ${despues.msHastaElUltimo} ms from the first step (steps end at ${pasos * cadaMs} ms)`);
}

async function main(): Promise<void> {
  console.log('test: giros');
  direccionYGestosHermanos();
  const { us } = ningunGiroSePierde();
  sinSubidaNoQuedaPegado();
  console.log(`logic path (resolve slot + dispatch): 2000 turns, 0 lost, ${us.toFixed(2)} us per turn`);
  await laPinturaDelAvisoNoSeAmontona();
  console.log('OK: giros');
}

void main();
