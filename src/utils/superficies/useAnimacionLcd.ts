import { useEffect, useRef } from 'react';
import type { ButtonConfig, LcdControl } from '../../types';
import { teclasLcd } from './disposicion';
import { paginaDe } from './paginasSuperficie';
import { decodificarGif, esGifAnimado, type GifAnimado } from './gifLcd';
import {
  pintarTecla, pintarTeclaConCuadro, resolverBotonLcd,
  type ColoresSuperficie, type ExtrasAnimados,
} from './pintarTecla';
import {
  anotarPulso, avanzarPulsos, hayPulsos, matrizDe, motorPuntos, movimientoReducido, visualDe,
} from './motorAnimacionLcd';
import type { OpcionesAnimacionLcd } from './motorAnimacionLcd';

export type { OpcionesAnimacionLcd };

/**
 * Anima la tecla física del dock: GIF y puntos DOT.
 *
 * Los GIF iban ya por aquí (decodificados con `ImageDecoder`, 10 fps); las
 * animaciones de puntos (roadmap 78) y el destello al pulsar (79) usan el
 * **mismo** tic y las mismas reglas: solo las teclas con LCD de la **página
 * activa** de cada aparato conectado, y sin nada que animar **no queda
 * ningún temporizador**. Al cambiar de página, al desconectarse el aparato o
 * al quitar la animación, los deseos se recalculan y lo que sobra se retira.
 *
 * El motor DOT (`globalThis.EfectosPuntos`), su resolvedor de matrices y el
 * pulso de la pulsación viven en `motorAnimacionLcd`: `src/utils` no puede
 * importar el motor de la capa de componentes (regla `utils-no-ui`), así que
 * se lee del global y si no está no hay animación de puntos, pero tampoco
 * error.
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

interface DeseoAnimado {
  serial: string;
  clave: string;
  hueco: number;
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

/** Una tecla con animación continua de puntos (`siempre`, o `encendido` encendido). */
interface DeseoPuntos {
  serial: string;
  clave: string;
  hueco: number;
  indice: number;
  boton: ButtonConfig;
  lcd: LcdControl;
  rotacion: number;
  matriz: boolean[][];
  efecto: string;
  inicio: number;
}

interface AnimacionPuntos {
  deseo: DeseoPuntos;
  enviando: boolean;
}

const motoresVivos = new Set<Motor>();

/**
 * Anota una pulsación para que el próximo tic pinte el destello. La llama
 * `useSuperficies` al recibir la entrada del hardware (gesto `down`).
 */
export function registrarPulsoLcd(serial: string, hueco: number, pagina: number): void {
  anotarPulso(serial, hueco, pagina);
  for (const motor of motoresVivos) asegurarTic(motor);
}

interface Motor {
  activas: Map<string, Animacion>;
  pendientes: Map<string, Pendiente>;
  puntos: Map<string, AnimacionPuntos>;
  gifs: Map<string, GifAnimado | 'error'>;
  cargando: Set<string>;
  opciones: OpcionesAnimacionLcd;
  temporizador: ReturnType<typeof setInterval> | null;
}

export function useAnimacionLcd(opciones: OpcionesAnimacionLcd): void {
  const motor = useRef<Motor>({
    activas: new Map(),
    pendientes: new Map(),
    puntos: new Map(),
    gifs: new Map(),
    cargando: new Set(),
    opciones,
    temporizador: null,
  });
  motor.current.opciones = opciones;

  const { api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, fuentesListas, vivo, widgets } = opciones;
  useEffect(() => {
    if (!api) return;
    reconciliar(motor.current);
  }, [api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, fuentesListas, vivo, widgets]);

  // El puente del motor puede registrarse después (carga diferida): al
  // avisar se reconcilian los deseos de puntos.
  useEffect(() => {
    const alListo = () => reconciliar(motor.current);
    window.addEventListener('vd:motor-listo', alListo);
    return () => window.removeEventListener('vd:motor-listo', alListo);
  }, []);

  // Al desmontar (o si el aparato se va con la ventana), nada sigue vivo.
  useEffect(() => {
    const vivo = motor.current;
    motoresVivos.add(vivo);
    return () => {
      motoresVivos.delete(vivo);
      detenerTic(vivo);
      vivo.activas.clear();
      vivo.pendientes.clear();
      vivo.puntos.clear();
    };
  }, []);
}

/** Lo que toca animar ahora: teclas con GIF de la página activa de cada dock. */
function recolectarDeseos(o: OpcionesAnimacionLcd): Map<string, DeseoAnimado> {
  const salida = new Map<string, DeseoAnimado>();
  for (const dispositivo of o.dispositivos) {
    if (!dispositivo.conectado) continue;
    const pagina = paginaDe(o.config, dispositivo.serial, dispositivo.disposicion, o.paginasActivas[dispositivo.serial], o.vivo);
    if (!pagina) continue;
    for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
      const boton = pagina.botones[hueco];
      if (!boton?.imageData || !esGifAnimado(boton.imageData)) continue;
      // La imagen del plugin manda sobre el GIF: la enseña el pintor
      // estático y el siguiente fotograma la borraría.
      if (visualDe(boton, o.config)?.imagen) continue;
      // Un mosaico 2×2 manda sobre la imagen: el pintor estático dibuja la
      // rejilla y el GIF no debe repintarse encima.
      if (boton.subButtons?.length === 4) continue;
      // Un widget manda sobre la imagen, como en la celda: sin esto el
      // siguiente fotograma del GIF borraría el dato cada 100 ms.
      if (o.widgets[boton.id]) continue;
      const rotacion = pagina.rotacion ?? lcd.rotacion;
      const clave = [
        dispositivo.serial, hueco, indice, boton.imageData,
        lcd.ancho, lcd.alto, rotacion, o.colores.fondo, o.colores.texto, o.fuentesListas,
      ].join('|');
      salida.set(clave, { serial: dispositivo.serial, clave, hueco, indice, boton, lcd, rotacion, src: boton.imageData });
    }
  }
  return salida;
}

function reconciliar(motor: Motor): void {
  reconciliarGifs(motor);
  reconciliarPuntos(motor);
  if (motor.activas.size || motor.pendientes.size || motor.puntos.size || hayPulsos()) asegurarTic(motor);
  else detenerTic(motor);
}

function reconciliarGifs(motor: Motor): void {
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
}

/** Firma de una tecla animada: si cambia, el ciclo vuelve a empezar. */
function firmaPuntos(
  boton: ButtonConfig, encendido: boolean, rotacion: number,
  colores: ColoresSuperficie, fuentes: boolean,
): string {
  // `label`/`sublabel` van ya interpolados desde `paginaDe`: un cambio de
  // variable reinicia el deseo y el siguiente fotograma sale con el texto nuevo.
  return JSON.stringify([
    boton.label, boton.sublabel, boton.icon, boton.iconoPuntos?.bits, boton.bgColor, boton.fgColor,
    boton.animacion, boton.efectoPulsar, encendido,
    rotacion, colores.fondo, colores.texto, fuentes,
  ]);
}

/**
 * El centro ya tiene dueño (el dato vivo de un widget o la imagen de un
 * plugin): la animación continua de puntos no lo pisa.
 */
function centroOcupado(boton: ButtonConfig, o: OpcionesAnimacionLcd): boolean {
  if (o.widgets[boton.id]) return true;
  return !!visualDe(boton, o.config)?.imagen;
}

/** Lo que toca animar con puntos: teclas con animación continua de la página activa. */
function recolectarDeseosPuntos(o: OpcionesAnimacionLcd): Map<string, DeseoPuntos> {
  const salida = new Map<string, DeseoPuntos>();
  const motor = motorPuntos();
  if (!motor || movimientoReducido()) return salida;
  const encendidos = new Set(o.config.toggledIds ?? []);
  for (const dispositivo of o.dispositivos) {
    if (!dispositivo.conectado) continue;
    const pagina = paginaDe(o.config, dispositivo.serial, dispositivo.disposicion, o.paginasActivas[dispositivo.serial], o.vivo);
    if (!pagina) continue;
    for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
      const original = pagina.botones[hueco];
      if (!original?.animacion) continue;
      // El mosaico 2×2 no anima el centro del botón padre (como en la celda).
      if (original.subButtons?.length === 4) continue;
      // Con widget o imagen de plugin, el centro ya tiene dueño.
      if (centroOcupado(original, o)) continue;
      const encendido = encendidos.has(original.id);
      const cuando = original.animacion.cuando;
      if (cuando !== 'siempre' && !(cuando === 'encendido' && encendido)) continue;
      const boton = resolverBotonLcd(original, encendido);
      const matriz = matrizDe(boton);
      if (!matriz) continue;
      const rotacion = pagina.rotacion ?? lcd.rotacion;
      const clave = [
        dispositivo.serial, hueco,
        firmaPuntos(boton, encendido, rotacion, o.colores, o.fuentesListas),
      ].join('|');
      salida.set(clave, {
        serial: dispositivo.serial, clave, hueco, indice, boton, lcd, rotacion,
        matriz, efecto: original.animacion.efecto, inicio: performance.now(),
      });
    }
  }
  return salida;
}

function reconciliarPuntos(motor: Motor): void {
  const deseados = recolectarDeseosPuntos(motor.opciones);
  for (const clave of [...motor.puntos.keys()]) {
    if (!deseados.has(clave)) motor.puntos.delete(clave);
  }
  for (const [clave, deseo] of deseados) {
    if (!motor.puntos.has(clave)) motor.puntos.set(clave, { deseo, enviando: false });
  }
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
    // Con el aviso de un giro encima, el fotograma no se pisa (T-HW-21).
    if (motor.opciones.conAviso?.(anim.deseo.serial, anim.deseo.hueco)) continue;
    avanzarFotograma(anim, ahora);
    void enviar(motor, anim);
  }
  avanzarPuntos(motor, ahora);
  avanzarPulsos(motor.opciones, ahora);
  if (!motor.activas.size && !motor.pendientes.size && !motor.puntos.size && !hayPulsos()) detenerTic(motor);
}

/** Repinta las teclas con animación continua de puntos (10 fps, como los GIF). */
function avanzarPuntos(motor: Motor, ahora: number): void {
  const o = motor.opciones;
  const puntos = motorPuntos();
  if (!puntos || !o.api) return;
  for (const anim of motor.puntos.values()) {
    if (anim.enviando) continue;
    const deseo = anim.deseo;
    // El aviso del giro manda mientras dura (T-HW-21).
    if (o.conAviso?.(deseo.serial, deseo.hueco)) continue;
    const duracion = puntos.duracionEfecto(deseo.efecto);
    const t = puntos.esContinuo(deseo.efecto) || duracion <= 0
      ? ahora - deseo.inicio
      : (ahora - deseo.inicio) % duracion;
    const intensidades = puntos.calcularPuntos(deseo.matriz, deseo.efecto, t).intensidades;
    void enviarPuntos(motor, anim, { matriz: deseo.matriz, intensidades });
  }
}

async function enviarPuntos(motor: Motor, anim: AnimacionPuntos, extras: ExtrasAnimados): Promise<void> {
  const o = motor.opciones;
  if (!o.api) return;
  anim.enviando = true;
  try {
    const deseo = anim.deseo;
    const imagen = await pintarTecla(
      deseo.boton, deseo.lcd, o.colores,
      { iconoSvg: o.iconoSvg, esGlifoDot: o.esGlifoDot },
      deseo.rotacion, extras,
    );
    await o.api.superficies.imagen(deseo.serial, deseo.indice, imagen.jpegBase64);
  } catch {
    // El aparato se fue: el próximo efecto lo retira.
  } finally {
    anim.enviando = false;
  }
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
