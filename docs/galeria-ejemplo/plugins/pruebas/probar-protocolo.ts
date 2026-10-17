/* Prueba del protocolo de los plugins de `docs/galeria-ejemplo/plugins/`.
 *
 * Levanta el anfitrion de verdad (`crearAnfitrion`, sin Electron: solo pide
 * `shell` para `openUrl`, que aqui no se toca) y le mete dentro **el codigo
 * real de cada plugin**: su `sdk.js`, su `punto.js` y el `<script>` del
 * `CodePath`, ejecutados en un contexto de `node:vm` con un `WebSocket` de
 * puente. Es el camino entero menos Chromium: registro, `willAppear`, teclas,
 * `setImage`/`setTitle`/`setSettings`.
 *
 * Ademas comprueba que **toda** imagen que emite un plugin pasa el filtro del
 * anfitrion (`resolverImagenVisual`): un `data:` en base64, no texto plano.
 *
 * Correr en la raiz del repo:
 *
 *   npm run build:plugins && npx tsx docs/galeria-ejemplo/plugins/pruebas/probar-protocolo.ts
 */

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { WebSocket } from 'ws';
import { crearAnfitrion, type Anfitrion } from '../../../../electron/main/plugins/anfitrion.ts';
import { resolverImagenVisual } from '../../../../electron/main/plugins/validacion.ts';
import type { AvisoVisual } from '../../../../electron/main/plugins/ordenesVisuales.ts';

const ORIGEN = resolve(join(import.meta.dirname, '..'));
const LARGO_MS = 900;
const fallos: string[] = [];
/** Lo que un plugin haya lanzado al recibir un mensaje: es un fallo, no un ruido. */
const errores: string[] = [];

interface Escenario {
  uuid: string;
  code: string;
  accion: string;
  ajustes: Record<string, unknown>;
  correr: (p: Prueba) => Promise<void>;
}

interface Prueba {
  anfitrion: Anfitrion;
  aviso: (indice?: number) => AvisoVisual | undefined;
  titulo: () => string;
  imagen: () => string;
  contexto: string;
  carpeta: string;
  guardados: { contexto: string; settings: Record<string, unknown> }[];
  ultimoAjuste: () => Record<string, unknown>;
  limpiar: () => void;
}

function comprobar(condicion: boolean, mensaje: string): void {
  if (condicion) return;
  fallos.push(mensaje);
  console.error('  FALLO: ' + mensaje);
}

function esperar(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

/** El `WebSocket` que el plugin ve: el mismo cliente de `ws`, con su forma. */
class PuenteWebSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((evento: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  private readonly ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('open', () => {
      this.readyState = 1;
      this.onopen?.();
    });
    this.ws.on('message', (datos: Buffer) => {
      /* Un plugin que revienta no debe tumbar la prueba: se apunta y sigue. */
      try {
        this.onmessage?.({ data: datos.toString() });
      } catch (e) {
        errores.push(`el plugin lanzo ${(e as Error).name}: ${(e as Error).message}`);
      }
    });
    /* El anfitrion se cierra al terminar: sin este manejador el `error` del
       cliente tumba el proceso (lo emite `ws` si no hay nadie escuchando). */
    this.ws.on('error', () => {
      this.readyState = 3;
    });
    this.ws.on('close', () => {
      this.readyState = 3;
      this.onclose?.();
    });
  }

  send(texto: string): void {
    this.ws.send(texto);
  }

  /** Corta la conexion: el plugin reintentaria si se queda sola. */
  terminar(): void {
    this.readyState = 3;
    try {
      this.ws.terminate();
    } catch {
      /* ya estaba cerrada */
    }
  }
}

/** Los `<script>` en linea del `CodePath` (los que no son `src`). */
function bloquesDe(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

/** El SVG de un aviso, legible, para mirar que trae puntos de verdad. */
function svgDe(imagen: string): string {
  if (!imagen.startsWith('data:image/svg+xml;base64,')) return '';
  return Buffer.from(imagen.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf-8');
}

/**
 * Los puntos de un color de la imagen.
 *
 * Cuenta los `<circle>` del `<g fill="…">` de ese color: es la forma de mirar
 * **el glifo que se pinto de verdad** sin depender de como este compuesto el
 * SVG. El dado es el que lo aprovecha: los puntos de una cara son el numero que
 * salio.
 */
function puntosDe(svg: string, color: string): number {
  const grupo = new RegExp(`<g fill="${color}">([\\s\\S]*?)</g>`).exec(svg);
  if (!grupo) return 0;
  return (grupo[1].match(/<circle /g) || []).length;
}

async function montar(e: Escenario): Promise<Prueba> {
  const carpeta = join(ORIGEN, `${e.uuid}.sdPlugin`);
  const guardados: { contexto: string; settings: Record<string, unknown> }[] = [];
  const pintados: AvisoVisual[] = [];
  let registrado = false;
  const anfitrion = await crearAnfitrion(
    {
      puertoArchivos: 0,
      uuid: e.uuid,
      version: '1.0.0',
      idioma: 'es',
      carpeta,
      alVisual: (visual) => pintados.push(visual),
      alSettings: (contexto, settings) => guardados.push({ contexto, settings }),
    },
    () => {
      registrado = true;
    },
  );

  const temporizadores: NodeJS.Timeout[] = [];
  const sockets: PuenteWebSocket[] = [];
  class Puente extends PuenteWebSocket {
    constructor(url: string) {
      super(url);
      sockets.push(this);
    }
  }
  const arena: Record<string, unknown> = {
    WebSocket: Puente,
    TextEncoder,
    btoa,
    Intl,
    console: process.env.VD_TEST_VERBOSE ? console : { log() {}, warn() {}, error() {} },
    setTimeout: (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      temporizadores.push(id);
      return id;
    },
    clearTimeout,
    setInterval: (fn: () => void, ms: number) => {
      const id = setInterval(fn, ms);
      temporizadores.push(id);
      return id;
    },
    clearInterval,
  };
  createContext(arena);
  runInContext('globalThis.window = globalThis;', arena);
  runInContext(readFileSync(join(carpeta, 'sdk.js'), 'utf-8'), arena, { filename: 'sdk.js' });
  runInContext(readFileSync(join(carpeta, 'punto.js'), 'utf-8'), arena, { filename: 'punto.js' });
  for (const bloque of bloquesDe(readFileSync(join(carpeta, e.code), 'utf-8'))) {
    runInContext(bloque, arena, { filename: e.code });
  }

  const contexto = 'ctx-' + e.uuid;
  (arena as { connectElgatoStreamDeckSocket: (p: number, id: string, reg: string, info: string) => void })
    .connectElgatoStreamDeckSocket(anfitrion.puerto, anfitrion.uuidRegistro, 'registerPlugin', anfitrion.infoJSON);
  await esperar(250);
  comprobar(registrado, `${e.uuid}: el plugin no se registro en el anfitrion`);
  comprobar(pintados.length === 0, `${e.uuid}: el plugin pinto antes de que apareciera el boton`);

  anfitrion.aparecer(contexto, { accion: e.accion, settings: e.ajustes });
  await esperar(250);

  /* El ultimo aviso con titulo y el ultimo con imagen, no el ultimo de todo:
     el plugin pinta las dos cosas y el orden es el que elija. */
  const ultimo = (clave: 'titulo' | 'imagen') => {
    for (let i = pintados.length - 1; i >= 0; i--) {
      if (pintados[i][clave] !== undefined) return String(pintados[i][clave]);
    }
    return '';
  };

  return {
    anfitrion,
    contexto,
    carpeta,
    guardados,
    aviso: (indice) => (indice === undefined ? pintados[pintados.length - 1] : pintados[indice]),
    titulo: () => ultimo('titulo'),
    imagen: () => ultimo('imagen'),
    ultimoAjuste: () => guardados[guardados.length - 1]?.settings ?? {},
    limpiar: () => {
      for (const id of temporizadores) clearInterval(id as unknown as NodeJS.Timeout);
      for (const socket of sockets) socket.terminar();
      anfitrion.cerrar();
    },
  };
}

/** Una pulsacion corta (lo que hace `anfitrion.pulsar`). */
async function corto(p: Prueba): Promise<void> {
  p.anfitrion.pulsar(p.contexto);
  await esperar(250);
}

/** Una pulsacion larga: lo que reinicia. */
async function largo(p: Prueba): Promise<void> {
  p.anfitrion.tecla(p.contexto, true);
  await esperar(LARGO_MS);
  p.anfitrion.tecla(p.contexto, false);
  await esperar(250);
}

function imagenValida(p: Prueba, etiqueta: string): void {
  const aviso = p.aviso();
  comprobar(!!aviso?.imagen, `${etiqueta}: no pinto ninguna imagen`);
  comprobar(
    resolverImagenVisual(aviso?.imagen ?? '', p.carpeta) === aviso?.imagen,
    `${etiqueta}: la imagen no pasa resolverImagenVisual del anfitrion`,
  );
  const svg = svgDe(aviso?.imagen ?? '');
  comprobar(svg.includes('fill="#070809"'), `${etiqueta}: la imagen no lleva el fondo OLED`);
  comprobar(svg.includes('<circle'), `${etiqueta}: la imagen no trae puntos`);
}

/** Cuantos puntos enciende cada digito en la matriz 5×7 (`punto.js`). */
const PUNTOS_DIGITO: Record<string, number> = { '0': 19, '1': 10, '2': 14, '3': 14, '4': 14, '5': 17, '6': 15, '7': 11, '8': 17, '9': 15 };

/** Los puntos de un texto, con la tabla de digitos de arriba. */
function puntosDeTexto(texto: string): number {
  return [...texto].reduce((suma, caracter) => suma + (PUNTOS_DIGITO[caracter] ?? 0), 0);
}

/** La semana ISO, calculada aqui aparte de como la calcula el plugin. */
function semanaIso(fecha: Date): number {
  const jueves = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  jueves.setUTCDate(jueves.getUTCDate() - ((jueves.getUTCDay() + 6) % 7) + 3);
  const primero = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 4));
  primero.setUTCDate(primero.getUTCDate() - ((primero.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((jueves.getTime() - primero.getTime()) / (7 * 86400000));
}

const ESCENARIOS: Escenario[] = [
  {
    uuid: 'com.virtualdeck.cronometro',
    code: 'cronometro.html',
    accion: 'com.virtualdeck.cronometro.cronometro',
    ajustes: {},
    correr: async (p) => {
      comprobar(p.titulo() === '0:00', `cronometro: al aparecer deberia decir 0:00, dice ${p.titulo()}`);
      imagenValida(p, 'cronometro');
      await corto(p);
      comprobar(p.titulo() === '0:00', 'cronometro: arrancar a 0 no cambia el titulo');
      await esperar(1300);
      comprobar(p.titulo() !== '0:00', 'cronometro: contando tras 1,3 s sigue en 0:00');
      comprobar(svgDe(p.imagen()).includes('#FF3B30'), 'cronometro: corriendo deberia pintar en acento');
      await largo(p);
      comprobar(p.titulo() === '0:00', `cronometro: la pulsacion larga deberia reiniciar, dice ${p.titulo()}`);
    },
  },
  {
    uuid: 'com.virtualdeck.temporizador-pomodoro',
    code: 'temporizador-pomodoro.html',
    accion: 'com.virtualdeck.temporizador-pomodoro.temporizador',
    ajustes: { foco: 1, descanso: 1, encadenar: true },
    correr: async (p) => {
      comprobar(p.titulo() === '01:00', `pomodoro: con foco de 1 min deberia decir 01:00, dice ${p.titulo()}`);
      /* «FOCO» son 59 puntos de la matriz 5×7: la etiqueta se pinta de verdad. */
      comprobar(puntosDe(svgDe(p.imagen()), '#FF3B30') === 59, 'pomodoro: la etiqueta FOCO deberia salir en puntos de acento');
      imagenValida(p, 'pomodoro');
      await corto(p);
      await esperar(1300);
      comprobar(/^00:5\d$/.test(p.titulo()), `pomodoro: deberia estar en el ultimo medio minuto, dice ${p.titulo()}`);
      await largo(p);
      comprobar(p.titulo() === '01:00', `pomodoro: la pulsacion larga deberia volver al foco, dice ${p.titulo()}`);
    },
  },
  {
    uuid: 'com.virtualdeck.contador',
    code: 'contador.html',
    accion: 'com.virtualdeck.contador.contador',
    ajustes: {},
    correr: async (p) => {
      comprobar(p.titulo() === '0', `contador: deberia empezar en 0, dice ${p.titulo()}`);
      await corto(p);
      comprobar(p.titulo() === '1', `contador: tras un toque deberia decir 1, dice ${p.titulo()}`);
      comprobar(p.ultimoAjuste().valor === 1, `contador: los ajustes guardados son ${JSON.stringify(p.ultimoAjuste())}`);
      await corto(p);
      comprobar(p.titulo() === '2', `contador: deberia seguir acumulando, dice ${p.titulo()}`);
      await largo(p);
      comprobar(p.titulo() === '0', `contador: la pulsacion larga deberia reiniciar, dice ${p.titulo()}`);
      comprobar(p.ultimoAjuste().valor === 0, 'contador: el reinicio deberia guardarse en los ajustes');
      imagenValida(p, 'contador');
    },
  },
  {
    uuid: 'com.virtualdeck.reloj-mundial',
    code: 'reloj-mundial.html',
    accion: 'com.virtualdeck.reloj-mundial.reloj',
    ajustes: { zona: 'Europe/Madrid' },
    correr: async (p) => {
      comprobar(/^\d\d:\d\d [+-]\d\d(:\d\d)?$/.test(p.titulo()), `reloj: el titulo deberia ser hora y desfase, dice ${p.titulo()}`);
      comprobar(svgDe(p.imagen()).includes('#FF3B30'), 'reloj: el desfase deberia pintarse en acento');
      imagenValida(p, 'reloj');
      /* Una zona que no existe no puede reventar el plugin: cae a UTC. */
      const mala = p.contexto + '-zona-mala';
      p.anfitrion.aparecer(mala, { accion: 'com.virtualdeck.reloj-mundial.reloj', settings: { zona: 'No/Existe' } });
      await esperar(250);
      comprobar(/^[0-2]\d:\d\d \+00$/.test(p.titulo()), `reloj: con una zona invalida deberia caer a UTC, dice ${p.titulo()}`);
      p.anfitrion.desaparecer(mala);
    },
  },
  {
    uuid: 'com.virtualdeck.dado',
    code: 'dado.html',
    accion: 'com.virtualdeck.dado.dado',
    ajustes: { caras: 6 },
    correr: async (p) => {
      comprobar(Number(p.titulo()) >= 1 && Number(p.titulo()) <= 6, `dado: sin ajustes deberia salir una cara, dice ${p.titulo()}`);
      imagenValida(p, 'dado');
      const vistos: number[] = [];
      for (let i = 0; i < 8; i++) {
        await corto(p);
        const cara = Number(p.titulo());
        vistos.push(cara);
        /* Los puntos de la cara dibujada son el numero que salio. */
        comprobar(puntosDe(svgDe(p.imagen()), '#FF3B30') === cara, `dado: la imagen no dibuja ${cara} puntos`);
      }
      comprobar(vistos.every((n) => n >= 1 && n <= 6), `dado: salio una cara fuera de rango: ${vistos.join(',')}`);
      comprobar(new Set(vistos).size > 1, `dado: ocho tiradas dieron siempre lo mismo (${vistos.join(',')})`);
      comprobar(p.ultimoAjuste().ultimo === vistos[vistos.length - 1], 'dado: el ultimo resultado deberia quedar en los ajustes');
      /* Un d20 guardado vuelve a pintarse con sus numeros, no con puntos. */
      p.anfitrion.aparecer(p.contexto + '-d20', { accion: 'com.virtualdeck.dado.dado', settings: { caras: 20, ultimo: 13 } });
      await esperar(250);
      comprobar(p.titulo() === '13', `dado: con un d20 guardado deberia decir 13, dice ${p.titulo()}`);
      comprobar(puntosDe(svgDe(p.imagen()), '#FF3B30') === 0, 'dado: el d20 deberia pintarse con la matriz, no con puntos de cara');
      comprobar(puntosDe(svgDe(p.imagen()), '#d7dade') > 8, 'dado: el d20 deberia traer los dos digitos en puntos');
      p.anfitrion.desaparecer(p.contexto + '-d20');
    },
  },
  {
    uuid: 'com.virtualdeck.fecha',
    code: 'fecha.html',
    accion: 'com.virtualdeck.fecha.fecha',
    ajustes: {},
    correr: async (p) => {
      /* El titulo se compara con la fecha calculada aqui, no con un patron. */
      const ahora = new Date();
      const dia = ahora.getDate() < 10 ? '0' + ahora.getDate() : String(ahora.getDate());
      const semana = semanaIso(ahora) < 10 ? '0' + semanaIso(ahora) : String(semanaIso(ahora));
      const esperado = `${['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'][(ahora.getDay() + 6) % 7]} ${dia} ${['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][ahora.getMonth()]} S${semana}`;
      comprobar(p.titulo() === esperado, `fecha: hoy deberia ser «${esperado}», dice «${p.titulo()}»`);
      comprobar(puntosDe(svgDe(p.imagen()), '#d7dade') === puntosDeTexto(dia), `fecha: la imagen deberia dibujar el dia ${dia} en puntos`);
      imagenValida(p, 'fecha');
    },
  },
];

async function main(): Promise<void> {
  /* El anfitrion registra cada orden; sin `VD_TEST_VERBOSE` solo interesan las
     ultimas lineas de cada escenario. */
  if (!process.env.VD_TEST_VERBOSE) {
    const original = console.log;
    console.log = (...resto: unknown[]) => {
      if (typeof resto[0] === 'string' && resto[0].startsWith('[plugins]')) return;
      original(...resto);
    };
  }
  console.log('plugins: protocolo contra el anfitrion');
  for (const escenario of ESCENARIOS) {
    errores.length = 0;
    const p = await montar(escenario);
    try {
      await escenario.correr(p);
      const pintados = p.aviso(0);
      comprobar(pintados?.contexto === p.contexto, `${escenario.uuid}: pinto en un contexto que no es el suyo`);
      comprobar(errores.length === 0, `${escenario.uuid}: ${errores.join('; ')}`);
      console.log(`  ok ${escenario.uuid} — «${p.titulo()}»`);
    } finally {
      p.limpiar();
    }
  }
  if (fallos.length) {
    console.error(`\nplugins: ${fallos.length} fallo(s)`);
    process.exitCode = 1;
    return;
  }
  console.log('plugins: ok — los 6 registran, pintan y responden a las teclas');
}

main();