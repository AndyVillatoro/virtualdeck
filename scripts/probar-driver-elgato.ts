/** Prueba del DriverElgato con transporte simulado: `npx tsx scripts/probar-driver-elgato.ts` */
import { crearDriverElgato, type TransporteHidElgato } from '../electron/main/superficies/elgato/driverElgato';
import { STREAM_DECK_NEO, STREAM_DECK_PLUS } from '../electron/main/superficies/elgato/modelos';
import type { EventoSuperficie } from '../electron/main/superficies/elgato/protocoloElgato';

let fallos = 0;
function afirmar(cond: boolean, nombre: string): void {
  console.log(`${cond ? 'OK  ' : 'FAIL'} ${nombre}`);
  if (!cond) fallos++;
}
const jpegDe = (n: number, v = 7): Buffer => Buffer.alloc(n, v);

function crearTransporte() {
  const escritos: Buffer[] = [];
  const features: Buffer[] = [];
  const oyentes: Record<string, Array<(...a: any[]) => void>> = {};
  let cerrado = 0;
  const t: TransporteHidElgato = {
    write: (d) => { escritos.push(Buffer.from(d)); },
    sendFeatureReport: (d) => { features.push(Buffer.from(d)); },
    close: () => { cerrado++; },
    on: (ev, cb) => { (oyentes[ev] ??= []).push(cb); },
  };
  return {
    t, escritos, features,
    emitir: (ev: string, ...a: any[]) => oyentes[ev]?.forEach((cb) => cb(...a)),
    cerrados: () => cerrado,
  };
}

async function main(): Promise<void> {
  // ---- Plus ----
  {
    const h = crearTransporte();
    const eventos: EventoSuperficie[] = [];
    let desconexion: Error | undefined;
    const d = crearDriverElgato(h.t, STREAM_DECK_PLUS, {
      alEvento: (e) => eventos.push(e), alDesconectar: (e) => { desconexion = e; },
    });
    afirmar(d.estaVivo, 'plus: vivo al crear');

    await d.imagen(3, jpegDe(100));
    afirmar(h.escritos.length === 1 && h.escritos[0].length === 1024, 'plus: tecla numérica = 1 página');
    afirmar(h.escritos[0][1] === 0x07 && h.escritos[0][2] === 3, 'plus: cabecera de tecla 3');
    h.escritos.length = 0;
    await d.imagen({ tipo: 'key', indice: 5 }, jpegDe(100));
    afirmar(h.escritos[0][2] === 5, 'plus: ref key 5');
    h.escritos.length = 0;

    // Cola serializada: dos imágenes concurrentes sin mezclar páginas
    await Promise.all([d.imagen(0, jpegDe(2500, 1)), d.imagen(1, jpegDe(2500, 2))]);
    afirmar(h.escritos.length === 6, 'plus: cola, 6 páginas');
    afirmar(h.escritos.map((p) => p[2]).join() === '0,0,0,1,1,1', 'plus: cola sin mezclar teclas');
    afirmar(h.escritos.map((p) => p[6]).join() === '0,1,2,0,1,2', 'plus: páginas en orden');
    h.escritos.length = 0;

    // Tira
    await d.imagen({ tipo: 'strip', indice: 2 }, jpegDe(100));
    const p = h.escritos[0];
    afirmar(p[1] === 0x0c && (p[2] | (p[3] << 8)) === 400, 'plus: zona 2 en x=400');
    afirmar((p[6] | (p[7] << 8)) === 200 && (p[8] | (p[9] << 8)) === 100, 'plus: zona 200x100');
    h.escritos.length = 0;
    await d.imagen({ tipo: 'strip', indice: -1 }, jpegDe(100));
    afirmar((h.escritos[0][2] | (h.escritos[0][3] << 8)) === 0 && (h.escritos[0][6] | (h.escritos[0][7] << 8)) === 800,
      'plus: tira completa 800x100');
    h.escritos.length = 0;

    // No soportado
    const rechazos = await Promise.all([
      d.imagen({ tipo: 'infobar', indice: 0 }, jpegDe(10)).then(() => false, () => true),
      d.imagen({ tipo: 'strip', indice: 4 }, jpegDe(10)).then(() => false, () => true),
      d.imagen(8, jpegDe(10)).then(() => false, () => true),
    ]);
    afirmar(rechazos.every(Boolean) && h.escritos.length === 0, 'plus: controles no soportados rechazados');

    await d.brillo(40);
    afirmar(h.features[0].length === 32 && h.features[0][0] === 3 && h.features[0][1] === 8 && h.features[0][2] === 40, 'plus: brillo');
    await d.limpiar();
    afirmar(h.features[1][0] === 3 && h.features[1][1] === 2, 'plus: limpiar = reset');

    // Eventos
    const informe = Buffer.alloc(31); informe[0] = 1; informe[1] = 0; informe[4 + 2] = 1;
    h.emitir('data', informe);
    afirmar(eventos.length === 1 && eventos[0].tipo === 'tecla:abajo', 'plus: evento por data');
    const giro = Buffer.alloc(31); giro[0] = 1; giro[1] = 3; giro[4] = 1; giro[5] = 0xff;
    const ret = d.procesarEntradaCruda(giro);
    afirmar(ret.length === 1 && ret[0].tipo === 'rueda:giro' && eventos.length === 2, 'plus: procesarEntradaCruda devuelve y notifica');
    informe[4 + 2] = 0;
    h.emitir('data', informe);
    afirmar(eventos[2]?.tipo === 'tecla:arriba', 'plus: estado persiste entre informes');

    // Error de transporte
    h.emitir('error', new Error('usb'));
    afirmar(!d.estaVivo && desconexion?.message === 'usb', 'plus: error desconecta');
    afirmar(await d.brillo(1).then(() => false, () => true), 'plus: rechaza tras desconexión');
    h.emitir('data', informe);
    afirmar(eventos.length === 3, 'plus: ignora datos tras desconexión');
  }

  // ---- Plus: cierre ----
  {
    const h = crearTransporte();
    const d = crearDriverElgato(h.t, STREAM_DECK_PLUS);
    const pendiente = d.imagen(0, jpegDe(3000));
    await d.cerrar();
    await pendiente;
    afirmar(!d.estaVivo && h.cerrados() === 1, 'cierre: close una vez');
    afirmar(h.escritos.length === 3, 'cierre: vacía la cola antes de cerrar');
    await d.cerrar();
    afirmar(h.cerrados() === 1, 'cierre: idempotente');
    afirmar(await d.imagen(0, jpegDe(1)).then(() => false, () => true), 'cierre: rechaza escrituras');
    const sinOn = crearDriverElgato({ write() {}, sendFeatureReport() {}, close() {} }, STREAM_DECK_PLUS);
    afirmar(sinOn.estaVivo, 'transporte sin on() tolerado');
  }

  // ---- Neo ----
  {
    const h = crearTransporte();
    const eventos: EventoSuperficie[] = [];
    const d = crearDriverElgato(h.t, STREAM_DECK_NEO, { alEvento: (e) => eventos.push(e) });
    await d.imagen(7, jpegDe(100));
    afirmar(h.escritos[0][2] === 7, 'neo: tecla 7');
    h.escritos.length = 0;
    await d.imagen({ tipo: 'infobar', indice: 0 }, jpegDe(1100));
    afirmar(h.escritos.length === 2 && h.escritos[0][1] === 0x0b && h.escritos[1][3] === 1, 'neo: infobar 2 páginas');
    afirmar(await d.imagen({ tipo: 'strip', indice: 0 }, jpegDe(10)).then(() => false, () => true), 'neo: sin tira');
    await d.brillo(150);
    afirmar(h.features[0][2] === 100, 'neo: brillo acotado');
    await d.limpiar();
    afirmar(h.features[1][1] === 2, 'neo: limpiar');
    const informe = Buffer.alloc(31); informe[0] = 1; informe[1] = 0; informe[12] = 1; informe[13] = 1;
    h.emitir('data', informe);
    afirmar(eventos.length === 2 && eventos[0].tipo === 'tecla:abajo'
      && (eventos[0] as { indice: number }).indice === 8 && (eventos[1] as { indice: number }).indice === 9, 'neo: touchpoints 8 y 9');
    await d.cerrar();
    afirmar(h.cerrados() === 1 && !d.estaVivo, 'neo: cierre');
  }

  console.log(fallos === 0 ? '\nTodo OK' : `\n${fallos} fallo(s)`);
  process.exit(fallos === 0 ? 0 : 1);
}

void main();
