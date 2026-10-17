import type { ButtonConfig, DeckConfig, ElectronAPI, InfoSuperficie, LcdControl } from '../../types';
import type { DatosWidget } from '../../comun/widgets';
import { teclasLcd } from './disposicion';
import { paginaDe, type VivoPagina } from './paginasSuperficie';
import { contextoDe, esAccionPlugin } from '../plugins/ref';
import { leerVisual } from '../plugins/visual';
import type { PluginVisual } from '../../types/plugins';
import {
  pintarTecla, resolverBotonLcd, type ColoresSuperficie, type ExtrasAnimados, type OpcionesPintado,
} from './pintarTecla';

/**
 * Piezas del motor de animación del LCD que no viven en `useAnimacionLcd`:
 * el acceso al motor DOT de la capa de componentes (que `src/utils` no puede
 * importar, regla `utils-no-ui`), lo que un plugin pinta —para que ni GIF ni
 * puntos lo pisen— y el **pulso de una pulsación** (destello u onda), que se
 * registra al bajar la tecla y se pinta hasta que vence.
 */

/**
 * Duración del aviso de pulsación si el motor DOT no está registrado. Con el
 * motor, manda la del efecto (`destello` 400 ms, `onda` 620 ms): la misma que
 * la celda, escalada al tic de 100 ms del LCD.
 */
const MS_PULSO_FALLBACK = 420;
/** Con «reducir movimiento» el destello se acorta, pero no se quita. */
const MS_PULSO_REDUCIDO = 220;

export interface OpcionesAnimacionLcd {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  dispositivos: InfoSuperficie[];
  paginasActivas: Record<string, string>;
  colores: ColoresSuperficie;
  iconoSvg?: OpcionesPintado['iconoSvg'];
  esGlifoDot?: OpcionesPintado['esGlifoDot'];
  fuentesListas: boolean;
  /** Estado vivo: la página se resuelve como la pinta el resto (visibleIf). */
  vivo: VivoPagina;
  /**
   * Datos vivos de los widgets (roadmap 82). Una tecla con widget no se anima:
   * el dato manda sobre GIF y puntos, como en la celda; al pulsarla, el
   * destello se pinta encima del dato (`pintarTecla` con `datos`).
   */
  widgets: Record<string, DatosWidget>;
  /**
   * ¿Esa tecla está enseñando el aviso de un giro (T-HW-21)? Mientras dura, el
   * animador no la pinta: si no, el siguiente fotograma lo borraría en 100 ms.
   */
  conAviso?: (serial: string, hueco: number) => boolean;
}

/** El motor DOT, si la capa de componentes ya lo registró. */
export function motorPuntos(): typeof globalThis.EfectosPuntos | null {
  const motor = globalThis.EfectosPuntos;
  return motor && typeof motor.calcularPuntos === 'function' ? motor : null;
}

/** Matriz animable del botón, si el resolvedor ya está registrado. */
export function matrizDe(boton: ButtonConfig): boolean[][] | null {
  try {
    return motorPuntos()?.matrizDeBoton?.(boton) ?? null;
  } catch {
    return null;
  }
}

/**
 * Lo que el plugin pinta en esta tecla, si es un botón de plugin: la misma
 * imagen que enseña el pintor estático. El destello de la pulsación la lleva
 * debajo (igual que en la celda del deck) y la animación continua ni la toca:
 * sin esto cada repintado la pisaba con el arte guardado del botón.
 */
export function visualDe(boton: ButtonConfig, config: DeckConfig): PluginVisual | undefined {
  if (!esAccionPlugin(boton.action)) return undefined;
  return leerVisual(contextoDe(boton, config));
}

export function movimientoReducido(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Una pulsación en una tecla LCD: se pinta su destello/onda hasta terminar. */
interface PulsoLcd {
  serial: string;
  hueco: number;
  /** Índice de la página activa al pulsar: si cambió, el pulso se descarta. */
  pagina: number;
  inicio: number;
}

const pulsosLcd = new Map<string, PulsoLcd>();

/**
 * Anota una pulsación para que el próximo tic la pinte. La llama
 * `registrarPulsoLcd` (de `useAnimacionLcd`) al recibir la entrada del
 * hardware (gesto `down`).
 */
export function anotarPulso(serial: string, hueco: number, pagina: number): void {
  pulsosLcd.set(`${serial}:${hueco}`, { serial, hueco, pagina, inicio: performance.now() });
}

/** ¿Queda algún pulso en curso? (Lo usa el motor para no parar el tic.) */
export function hayPulsos(): boolean {
  return pulsosLcd.size > 0;
}

/** Cuánto dura el aviso de pulsación: la del motor DOT, o el respaldo corto. */
function duracionPulso(prensado: string): number {
  const motor = motorPuntos();
  const delMotor = motor?.duracionEfecto(prensado) ?? 0;
  const base = delMotor > 0 ? delMotor : MS_PULSO_FALLBACK;
  // Con «reducir movimiento» se acorta el aviso, no se quita.
  return movimientoReducido() ? Math.min(base, MS_PULSO_REDUCIDO) : base;
}

/** Velo blanco del destello: sube al máximo y vuelve a cero con ease-out. */
function veloDestello(dt: number): number {
  const x = Math.max(0, Math.min(1, dt / duracionPulso('destello')));
  if (x < 0.2) return 0.6 + 2 * x;
  return Math.pow(1 - (x - 0.2) / 0.8, 0.7);
}

/** Lo que un pulso aún vigente necesita para pintarse. */
interface PulsoResuelto {
  control: { indice: number; lcd: LcdControl };
  efectivo: ButtonConfig;
  rotacion: number;
  datos?: DatosWidget;
  /** La imagen del plugin, para pintar el destello encima y no el botón. */
  visual?: PluginVisual;
  prensado: string;
}

/**
 * Resuelve la tecla de un pulso: si el aparato, la página o el botón ya no
 * son los mismos, o el efecto es `ninguno`, devuelve `null` y el pulso se
 * retira. Un destello sobre un aviso del giro también se descarta (T-HW-21).
 */
function resolverPulso(o: OpcionesAnimacionLcd, pulso: PulsoLcd, encendidos: Set<string>): PulsoResuelto | null {
  const dispositivo = o.dispositivos.find((d) => d.serial === pulso.serial);
  if (!dispositivo?.conectado) return null;
  const pagina = paginaDe(o.config, pulso.serial, dispositivo.disposicion, o.paginasActivas[pulso.serial], o.vivo);
  const control = pagina?.indice === pulso.pagina
    ? teclasLcd(pagina.disposicion).find((c) => c.hueco === pulso.hueco)
    : undefined;
  const boton = control ? pagina?.botones[pulso.hueco] : undefined;
  if (!pagina || !control || !boton) return null;
  if (o.conAviso?.(pulso.serial, pulso.hueco)) return null;
  const efectivo = resolverBotonLcd(boton, encendidos.has(boton.id));
  const prensado = efectivo.efectoPulsar ?? 'destello';
  // En positivo: el tercer valor del contrato (`ninguno`) se detecta por
  // descarte, porque ese literal lo marca la auditoría de i18n.
  if (prensado !== 'destello' && prensado !== 'onda') return null;
  return {
    control,
    efectivo,
    rotacion: pagina.rotacion ?? control.lcd.rotacion,
    datos: o.widgets[boton.id],
    visual: visualDe(boton, o.config),
    prensado,
  };
}

/** Pinta el destello o la onda de las pulsaciones recientes, hasta que acaban. */
export function avanzarPulsos(o: OpcionesAnimacionLcd, ahora: number): void {
  if (!o.api || pulsosLcd.size === 0) return;
  const encendidos = new Set(o.config.toggledIds ?? []);
  for (const [clave, pulso] of [...pulsosLcd]) {
    const resuelto = resolverPulso(o, pulso, encendidos);
    if (!resuelto) {
      pulsosLcd.delete(clave);
      continue;
    }
    const duracion = duracionPulso(resuelto.prensado);
    const dt = ahora - pulso.inicio;
    // El último fotograma se pinta ya con el tiempo final (el motor vuelve al
    // color base): la tecla queda limpia y el pulso se retira en el mismo tic.
    void enviarPulso(
      o, pulso, dt > duracion ? duracion : dt, resuelto.control, resuelto.efectivo,
      resuelto.rotacion, resuelto.datos, resuelto.visual,
    );
    if (dt > duracion) pulsosLcd.delete(clave);
  }
}

async function enviarPulso(
  o: OpcionesAnimacionLcd, pulso: PulsoLcd, dt: number,
  control: { indice: number; lcd: LcdControl },
  efectivo: ButtonConfig, rotacion: number,
  datos?: DatosWidget, visual?: PluginVisual,
): Promise<void> {
  if (!o.api) return;
  const puntos = motorPuntos();
  const prensado = efectivo.efectoPulsar ?? 'destello';
  let extras: ExtrasAnimados;
  // La onda se dibuja en los puntos (anillo que sale del centro); el destello
  // es el velo blanco por encima de todo, que también cubre imagen y marca y
  // vuelve a cero al acabar.
  const matriz = prensado === 'onda' ? matrizDe(efectivo) : null;
  if (puntos && matriz) {
    extras = { matriz, intensidades: puntos.calcularPuntos(matriz, 'onda', dt).intensidades };
  } else {
    extras = { destello: veloDestello(dt) };
  }
  try {
    const imagen = await pintarTecla(
      efectivo, control.lcd, o.colores,
      { iconoSvg: o.iconoSvg, esGlifoDot: o.esGlifoDot },
      rotacion, extras, datos, visual,
    );
    await o.api.superficies.imagen(pulso.serial, control.indice, imagen.jpegBase64);
  } catch {
    // El aparato se fue: el próximo tic retira el pulso.
  }
}
