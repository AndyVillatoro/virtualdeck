import { useEffect, useRef } from 'react';
import type { ButtonConfig, DeckConfig, ElectronAPI, InfoSuperficie, LcdControl } from '../../types';
import { teclasLcd } from './disposicion';
import { paginaDe } from './paginasSuperficie';
import { decodificarGif, esGifAnimado, type GifAnimado } from './animacionLcd';
import { pintarTecla, pintarTeclaConCuadro, resolverBotonLcd, type ColoresSuperficie, type ExtrasAnimados, type OpcionesPintado } from './pintarTecla';

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
 * El motor DOT (`globalThis.EfectosPuntos`) y su resolvedor de matrices los
 * registra la capa de componentes (`dot480/animacionPuntos`): `src/utils` no
 * puede importarlos (regla `utils-no-ui`), así que se leen del global y si
 * no están no hay animación de puntos, pero tampoco error.
 *
 * La página activa se resuelve con `paginaDe`, la misma función que usa el
 * pintor: lo que se anima es exactamente lo que está en pantalla.
 */

const MS_TIC = 100;
/** El destello al pulsar dura 2-3 fotogramas del tic como mucho. */
const MS_PULSO_LCD = 250;
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

/** Una tecla con animación continua de puntos (`siempre`, o `encendido` encendido). */
interface DeseoPuntos {
  serial: string;
  clave: string;
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

/** Una pulsación en una tecla LCD: se pinta el destello 2-3 fotogramas. */
interface PulsoLcd {
  serial: string;
  hueco: number;
  /** Índice de la página activa al pulsar: si cambió, el pulso se descarta. */
  pagina: number;
  inicio: number;
}

const pulsosLcd = new Map<string, PulsoLcd>();
const motoresVivos = new Set<Motor>();

/**
 * Anota una pulsación para que el próximo tic pinte el destello. La llama
 * `useSuperficies` al recibir la entrada del hardware (gesto `down`).
 */
export function registrarPulsoLcd(serial: string, hueco: number, pagina: number): void {
  pulsosLcd.set(`${serial}:${hueco}`, { serial, hueco, pagina, inicio: performance.now() });
  for (const motor of motoresVivos) asegurarTic(motor);
}

/** El motor DOT, si la capa de componentes ya lo registró. */
function motorPuntos(): typeof globalThis.EfectosPuntos | null {
  const motor = globalThis.EfectosPuntos;
  return motor && typeof motor.calcularPuntos === 'function' ? motor : null;
}

/** Matriz animable del botón, si el resolvedor ya está registrado. */
function matrizDe(boton: ButtonConfig): boolean[][] | null {
  try {
    return motorPuntos()?.matrizDeBoton?.(boton) ?? null;
  } catch {
    return null;
  }
}

function movimientoReducido(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  const { api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, fuentesListas } = opciones;
  useEffect(() => {
    if (!api) return;
    reconciliar(motor.current);
  }, [api, config, dispositivos, paginasActivas, colores, iconoSvg, esGlifoDot, fuentesListas]);

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
  reconciliarGifs(motor);
  reconciliarPuntos(motor);
  if (motor.activas.size || motor.pendientes.size || motor.puntos.size || pulsosLcd.size) asegurarTic(motor);
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
  return JSON.stringify([
    boton.icon, boton.iconoPuntos?.bits, boton.bgColor, boton.fgColor,
    boton.animacion, boton.efectoPulsar, encendido,
    rotacion, colores.fondo, colores.texto, fuentes,
  ]);
}

/** Lo que toca animar con puntos: teclas con animación continua de la página activa. */
function recolectarDeseosPuntos(o: OpcionesAnimacionLcd): Map<string, DeseoPuntos> {
  const salida = new Map<string, DeseoPuntos>();
  const motor = motorPuntos();
  if (!motor || movimientoReducido()) return salida;
  const encendidos = new Set(o.config.toggledIds ?? []);
  for (const dispositivo of o.dispositivos) {
    if (!dispositivo.conectado) continue;
    const pagina = paginaDe(o.config, dispositivo.serial, dispositivo.disposicion, o.paginasActivas[dispositivo.serial]);
    if (!pagina) continue;
    for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
      const original = pagina.botones[hueco];
      if (!original?.animacion) continue;
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
        serial: dispositivo.serial, clave, indice, boton, lcd, rotacion,
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
    avanzarFotograma(anim, ahora);
    void enviar(motor, anim);
  }
  avanzarPuntos(motor, ahora);
  avanzarPulsos(motor, ahora);
  if (!motor.activas.size && !motor.pendientes.size && !motor.puntos.size && !pulsosLcd.size) detenerTic(motor);
}

/** Repinta las teclas con animación continua de puntos (10 fps, como los GIF). */
function avanzarPuntos(motor: Motor, ahora: number): void {
  const o = motor.opciones;
  const puntos = motorPuntos();
  if (!puntos || !o.api) return;
  for (const anim of motor.puntos.values()) {
    if (anim.enviando) continue;
    const deseo = anim.deseo;
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

/** Pinta el destello de las pulsaciones recientes (2-3 fotogramas). */
function avanzarPulsos(motor: Motor, ahora: number): void {
  const o = motor.opciones;
  if (!o.api || pulsosLcd.size === 0) return;
  const encendidos = new Set(o.config.toggledIds ?? []);
  for (const [clave, pulso] of [...pulsosLcd]) {
    const dt = ahora - pulso.inicio;
    if (dt > MS_PULSO_LCD) {
      pulsosLcd.delete(clave);
      continue;
    }
    const dispositivo = o.dispositivos.find((d) => d.serial === pulso.serial);
    if (!dispositivo?.conectado) {
      pulsosLcd.delete(clave);
      continue;
    }
    const pagina = paginaDe(o.config, pulso.serial, dispositivo.disposicion, o.paginasActivas[pulso.serial]);
    const control = pagina?.indice === pulso.pagina
      ? teclasLcd(pagina.disposicion).find((c) => c.hueco === pulso.hueco)
      : undefined;
    const boton = control ? pagina.botones[pulso.hueco] : undefined;
    if (!pagina || !control || !boton) {
      pulsosLcd.delete(clave);
      continue;
    }
    void enviarPulso(motor, pulso, dt, control, boton, pagina.rotacion ?? control.lcd.rotacion, encendidos);
  }
}

async function enviarPulso(
  motor: Motor, pulso: PulsoLcd, dt: number,
  control: { indice: number; lcd: LcdControl },
  boton: ButtonConfig, rotacion: number, encendidos: Set<string>,
): Promise<void> {
  const o = motor.opciones;
  if (!o.api) return;
  const efectivo = resolverBotonLcd(boton, encendidos.has(boton.id));
  const puntos = motorPuntos();
  const prensado = efectivo.efectoPulsar ?? 'destello';
  // En positivo: el tercer valor del contrato (`ninguno`) se detecta por
  // descarte, porque ese literal lo marca la auditoría de i18n.
  if (prensado !== 'destello' && prensado !== 'onda') {
    pulsosLcd.delete(`${pulso.serial}:${pulso.hueco}`);
    return;
  }
  let extras: ExtrasAnimados;
  const matriz = matrizDe(efectivo);
  if (puntos && matriz) {
    extras = { matriz, intensidades: puntos.calcularPuntos(matriz, prensado, dt).intensidades };
  } else {
    extras = { destello: 1 - dt / MS_PULSO_LCD };
  }
  try {
    const imagen = await pintarTecla(
      efectivo, control.lcd, o.colores,
      { iconoSvg: o.iconoSvg, esGlifoDot: o.esGlifoDot },
      rotacion, extras,
    );
    await o.api.superficies.imagen(pulso.serial, control.indice, imagen.jpegBase64);
  } catch {
    // El aparato se fue: el próximo tic retira el pulso.
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
