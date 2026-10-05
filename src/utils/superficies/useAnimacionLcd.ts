import { useEffect, useRef } from 'react';
import type { ButtonConfig, DeckConfig, ElectronAPI, InfoSuperficie, LcdControl } from '../../types';
import { teclasLcd } from './disposicion';
import { paginaDe } from './paginasSuperficie';
import { decodificarGif, esGifAnimado, type GifAnimado } from './animacionLcd';
import { pintarTeclaConCuadro, type ColoresSuperficie, type OpcionesPintado } from './pintarTecla';

/**
 * Anima los GIF en la tecla física del dock.
 *
 * Solo las teclas con LCD de la **página activa** de cada aparato conectado.
 * Un tic de 100 ms (10 fps) manda a cada tecla como mucho un fotograma por
 * vuelta: cada fotograma es un JPEG por HID y, medido con el N3 real, una
 * tecla tarda 1–3 ms, así que 10 fps deja el bus casi vacío. El GIF original
 * puede ir a 30 ms por fotograma; el tope lo pone este tic.
 *
 * Sin GIF en pantalla **no queda ningún temporizador**: el intervalo vive
 * solo mientras haya animaciones o GIF por decodificar, y se apaga solo. Al
 * cambiar de página, al desconectarse el aparato o al quitar el GIF, los
 * deseos se recalculan y lo que sobra se retira.
 *
 * La página activa se resuelve con `paginaDe`, la misma función que usa el
 * pintor: lo que se anima es exactamente lo que está en pantalla.
 */

const MS_TIC = 100;
/** Tope de GIF en memoria. Cada uno puede pesar varios MB. */
const MAX_GIFS = 4;
/**
 * Reintentos de la decodificación: 100 vueltas de 100 ms (10 s). Decodificar
 * un GIF con ImageDecoder tarda decenas de ms; el tope es para una fuente que
 * falle de forma intermitente (una lectura de red, por ejemplo).
 */
const MAX_INTENTOS = 100;

export interface OpcionesAnimacionLcd {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  dispositivos: InfoSuperficie[];
  paginasActivas: Record<string, string>;
  colores: ColoresSuperficie;
  iconoSvg?: OpcionesPintado['iconoSvg'];
  esGlifoDot?: OpcionesPintado['esGlifoDot'];
  fuentesListas: boolean;
}

interface DeseoAnimado {
  serial: string;
  clave: string;
  indice: number;
  boton: ButtonConfig;
  lcd: LcdControl;
  rotacion: number;
  src: string;
}

interface Animacion {
  deseo: DeseoAnimado;
  gif: GifAnimado;
  /** Fotograma en curso; -1 = todavía no se mandó ninguno. */
  actual: number;
  /** Momento en que el fotograma en curso deja de valer. */
  vence: number;
  enviando: boolean;
}

interface Pendiente {
  deseo: DeseoAnimado;
  intentos: number;
}

interface Motor {
  activas: Map<string, Animacion>;
  pendientes: Map<string, Pendiente>;
  gifs: Map<string, GifAnimado | 'error'>;
  cargando: Set<string>;
  opciones: OpcionesAnimacionLcd;
  temporizador: ReturnType<typeof setInterval> | null;
}

export function useAnimacionLcd(opciones: OpcionesAnimacionLcd): void {
  const motor = useRef<Motor>({
    activas: new Map(),
    pendientes: new Map(),
    gifs: new Map(),
    cargando: new Set(),
    opciones,
    temporizador: null,
  });
  motor.current.opciones = opciones;

  const { api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, fuentesListas } = opciones;
  useEffect(() => {
    if (!api) return;
    reconciliar(motor.current);
  }, [api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, fuentesListas]);

  // Al desmontar (o si el aparato se va con la ventana), nada sigue vivo.
  useEffect(() => () => {
    detenerTic(motor.current);
    motor.current.activas.clear();
    motor.current.pendientes.clear();
  }, []);
}

/** Lo que toca animar ahora: teclas con GIF de la página activa de cada dock. */
function recolectarDeseos(o: OpcionesAnimacionLcd): Map<string, DeseoAnimado> {
  const salida = new Map<string, DeseoAnimado>();
  for (const dispositivo of o.dispositivos) {
    if (!dispositivo.conectado) continue;
    const pagina = paginaDe(o.config, dispositivo.serial, dispositivo.disposicion, o.paginasActivas[dispositivo.serial]);
    if (!pagina) continue;
    for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
      const boton = pagina.botones[hueco];
      if (!boton?.imageData || !esGifAnimado(boton.imageData)) continue;
      const rotacion = pagina.rotacion ?? lcd.rotacion;
      const clave = [
        dispositivo.serial, hueco, indice, boton.imageData,
        lcd.ancho, lcd.alto, rotacion, o.colores.fondo, o.colores.texto, o.fuentesListas,
      ].join('|');
      salida.set(clave, { serial: dispositivo.serial, clave, indice, boton, lcd, rotacion, src: boton.imageData });
    }
  }
  return salida;
}

function reconciliar(motor: Motor): void {
  const deseados = recolectarDeseos(motor.opciones);
  for (const clave of [...motor.activas.keys()]) {
    if (!deseados.has(clave)) motor.activas.delete(clave);
  }
  for (const clave of [...motor.pendientes.keys()]) {
    if (!deseados.has(clave)) motor.pendientes.delete(clave);
  }
  for (const [clave, deseo] of deseados) {
    const activa = motor.activas.get(clave);
    if (activa) {
      // El botón cambió (rótulo, color): el siguiente tic repinta con lo nuevo.
      if (activa.deseo.boton !== deseo.boton || activa.deseo.rotacion !== deseo.rotacion) {
        activa.deseo = deseo;
        activa.vence = performance.now();
      }
      continue;
    }
    if (motor.pendientes.has(clave)) continue;
    const cache = motor.gifs.get(deseo.src);
    if (cache === 'error') continue;
    if (cache) { activar(motor, deseo, cache); continue; }
    motor.pendientes.set(clave, { deseo, intentos: 0 });
  }
  if (motor.activas.size || motor.pendientes.size) asegurarTic(motor);
  else detenerTic(motor);
}

function activar(motor: Motor, deseo: DeseoAnimado, gif: GifAnimado): void {
  // `vence` con el reloj actual, no con 0: arranca por el fotograma 0 sin
  // «ponerse al día» de golpe (los retardos se cuentan desde que empieza).
  motor.activas.set(deseo.clave, { deseo, gif, actual: -1, vence: performance.now(), enviando: false });
}

function asegurarTic(motor: Motor): void {
  if (motor.temporizador) return;
  motor.temporizador = setInterval(() => tic(motor), MS_TIC);
}

function detenerTic(motor: Motor): void {
  if (!motor.temporizador) return;
  clearInterval(motor.temporizador);
  motor.temporizador = null;
}

function tic(motor: Motor): void {
  avanzarPendientes(motor);
  const ahora = performance.now();
  for (const anim of motor.activas.values()) {
    if (anim.enviando || ahora < anim.vence) continue;
    avanzarFotograma(anim, ahora);
    void enviar(motor, anim);
  }
  if (!motor.activas.size && !motor.pendientes.size) detenerTic(motor);
}

/** Salta los fotogramas vencidos, sin quedarse dando vueltas si el tic llega tarde. */
function avanzarFotograma(anim: Animacion, ahora: number): void {
  const n = anim.gif.cuadros.length;
  let vueltas = 0;
  do {
    anim.actual = (anim.actual + 1) % n;
    anim.vence += anim.gif.duraciones[anim.actual];
    vueltas += 1;
  } while (ahora >= anim.vence && vueltas < n);
}

async function enviar(motor: Motor, anim: Animacion): Promise<void> {
  const o = motor.opciones;
  if (!o.api) return;
  anim.enviando = true;
  try {
    const cuadro = anim.gif.cuadros[anim.actual];
    const imagen = await pintarTeclaConCuadro(
      anim.deseo.boton, anim.deseo.lcd, o.colores,
      { fuente: cuadro, sx: 0, sy: 0, ancho: cuadro.width, alto: cuadro.height },
      { iconoSvg: o.iconoSvg, esGlifoDot: o.esGlifoDot },
      anim.deseo.rotacion,
    );
    await o.api.superficies.imagen(anim.deseo.serial, anim.deseo.indice, imagen.jpegBase64);
  } catch {
    // El aparato se fue o la imagen no cupo: el próximo efecto lo retira.
  } finally {
    anim.enviando = false;
  }
}

/** Decodifica los GIF pendientes (uno por src) y activa los que ya están. */
function avanzarPendientes(motor: Motor): void {
  for (const [clave, pend] of [...motor.pendientes]) {
    const cache = motor.gifs.get(pend.deseo.src);
    if (cache === 'error') { motor.pendientes.delete(clave); continue; }
    if (cache) { motor.pendientes.delete(clave); activar(motor, pend.deseo, cache); continue; }
    if (motor.cargando.has(pend.deseo.src)) continue;
    pend.intentos += 1;
    if (pend.intentos > MAX_INTENTOS) {
      motor.gifs.set(pend.deseo.src, 'error');
      motor.pendientes.delete(clave);
      continue;
    }
    motor.cargando.add(pend.deseo.src);
    void decodificarGif(pend.deseo.src)
      .then((res) => {
        motor.cargando.delete(pend.deseo.src);
        if (res.estado === 'listo') guardarGif(motor, pend.deseo.src, res.gif);
        else motor.gifs.set(pend.deseo.src, 'error');
      })
      .catch(() => { motor.cargando.delete(pend.deseo.src); });
  }
}

/** Guarda el GIF en la caché, soltando el más viejo que no esté en uso. */
function guardarGif(motor: Motor, src: string, gif: GifAnimado): void {
  motor.gifs.set(src, gif);
  if (motor.gifs.size <= MAX_GIFS) return;
  for (const vieja of motor.gifs.keys()) {
    if (vieja === src) continue;
    const enUso = [...motor.activas.values()].some((a) => a.deseo.src === vieja)
      || [...motor.pendientes.values()].some((p) => p.deseo.src === vieja);
    if (!enUso) { motor.gifs.delete(vieja); return; }
  }
}
