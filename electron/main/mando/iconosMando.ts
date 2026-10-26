import { dataUriDeMarca, resolverMarca } from '../../../src/comun/marcaSvg';
import { textoSobre } from '../../../src/comun/contraste';
import {
  aplicarAspectoAudio as fusionarAspectoAudio,
  resolverAspectoAudio,
} from '../../../src/comun/audioIcono';
import {
  aplicarAspectoCiclo as fusionarAspectoCiclo,
  resolverAspectoCiclo,
} from '../../../src/comun/cicloIcono';
import { estadoActual } from '../sistema/estadoSistema';
import type { ButtonAction, EfectoPulsar, SliderWidgetConfig } from '../../../src/types';
import { mapearImagen, resolverIconoMando, type IconoPuntosMando } from './resolucionIconosMando';

export type { IconoPuntosMando } from './resolucionIconosMando';

/**
 * El icono de cada botón, resuelto en el proceso principal para el mando
 * móvil (roadmap 82), y el aspecto con el que se pinta.
 *
 * Antes `paginaMando.ts` traía su propia tabla de glifos 8×8 (`G8`),
 * incompleta y copiada a mano: todo icono que no estuviera ahí —`CHAT`,
 * `SPARKLE`, `DOTS`, `BATTERY`…— salía como texto. Ahora `listaDeBotones`
 * (`servidorLocal.ts`) resuelve cada botón con los **datos compartidos** (los
 * mismos que la celda: catálogo 16×16, glifo por nombre, glifo del tipo de
 * acción) y lo manda ya como puntos. La página solo los dibuja.
 *
 * La resolución de los puntos vive en `resolucionIconosMando.ts`; aquí queda el
 * aspecto del botón (audio, ciclo, interruptor y marca) y el montaje final.
 * Módulo puro, sin Electron ni Node: se puede probar con esbuild + node.
 */

interface SubBotonMandoMovil {
  id: string;
  label: string;
  sublabel?: string;
  /** Glifo original, por compatibilidad con clientes HTTP externos. */
  icon?: string;
  dotGlyph?: string;
  puntos: IconoPuntosMando;
  iconTexto?: string;
  bgColor?: string;
  fgColor?: string;
}

export interface BotonMandoMovil {
  id: string;
  label: string;
  sublabel?: string;
  page: number;
  bgColor?: string;
  fgColor?: string;
  /** Glifo original, por compatibilidad con clientes HTTP externos. La página dibuja `puntos`. */
  icon?: string;
  puntos: IconoPuntosMando;
  iconTexto?: string;
  imageData?: string;
  customGlyph57?: number[];
  /**
   * La marca ya resuelta, como `data:image/svg+xml,…` (autónoma: halo y
   * animación dentro del propio SVG, porque la CSP del móvil no admite
   * `style` en el DOM). Animada si el botón está encendido o
   * `brandIconAlwaysAnimate`. Sustituye a `brandIcon` suelto: el catálogo
   * vive en `src/comun` y se resuelve aquí, en el proceso principal.
   */
  marca?: string;
  /** Hay icono explícito (catálogo o `icon`): la celda lo pinta encima de la marca. */
  iconoSobreMarca?: boolean;
  fijo?: boolean;
  widget?: string;
  sliderWidget?: SliderWidgetConfig;
  /**
   * Lo último que el plugin pintó en este botón (roadmap 83 c), o ausente si
   * el botón no es de plugin o el plugin no conoce el contexto: la imagen
   * ocupa el centro a sangre (gana a la del usuario y a la marca, como en la
   * celda) y el título sustituye al rótulo. La imagen ya llega validada como
   * `data:` raster dentro del tope (es lo que guarda `plugins/visualesMando.ts`).
   */
  pluginImagen?: string;
  pluginTitulo?: string;
  subButtons?: SubBotonMandoMovil[];
  /** Botón de dos estados: con `encendido`, se pinta su `aspectoEncendido`. */
  isToggle?: boolean;
  encendido?: boolean;
  /** Tiene acción alternativa al mantener pulsado 500 ms (roadmap 82). */
  largo?: boolean;
  /** Animación del icono (roadmap 78): la página la calcula con el motor DOT. */
  animacion?: { efecto: string; cuando: string };
  /** Efecto corto al pulsar (roadmap 79). Ausente = `destello`. */
  efectoPulsar?: EfectoPulsar;
}

/** Lo mínimo que se lee de un botón de la config para mandarlo al móvil. */
export interface BotonFuenteMando {
  id: string;
  label?: string;
  sublabel?: string;
  page?: number;
  action?: {
    type: string;
    deviceId?: string;
    deviceName?: string;
    /** Acción de plugin: los uuids bastan para saber de quién es el botón. */
    plugin?: { pluginUuid: string; accionUuid: string };
    audioMode?: 'fixed' | 'cycle-all' | 'cycle-list';
    excludedDeviceIds?: string[];
    audioCandidates?: Array<{
      deviceId: string;
      deviceName: string;
      label?: string;
      icon?: string;
      iconoPuntos?: { bits: string; origen: string };
      fgColor?: string;
      bgColor?: string;
    }>;
    cycleSteps?: Array<{
      id: string;
      label?: string;
      sublabel?: string;
      icon?: string;
      iconoPuntos?: { bits: string; origen: string };
      fgColor?: string;
      bgColor?: string;
      action: ButtonAction;
    }>;
  };
  longPressAction?: { type: string };
  bgColor?: string;
  fgColor?: string;
  icon?: string;
  iconoPuntos?: { bits: string; origen: string };
  imageData?: string;
  customGlyph57?: number[];
  brandIcon?: string;
  brandIconAlwaysAnimate?: boolean;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  fijo?: boolean;
  widget?: string;
  sliderWidget?: SliderWidgetConfig;
  isToggle?: boolean;
  animacion?: { efecto: string; cuando: string };
  efectoPulsar?: EfectoPulsar;
  aspectoEncendido?: {
    iconoPuntos?: { bits: string; origen: string };
    icon?: string;
    bgColor?: string;
    fgColor?: string;
  };
  subButtons?: Array<{
    id: string;
    label?: string;
    sublabel?: string;
    icon?: string;
    dotGlyph?: string;
    /** Icono del catálogo 16×16 del cuadrante (roadmap 93). */
    iconoPuntos?: { bits: string; origen: string };
    bgColor?: string;
    fgColor?: string;
    action?: { type: string };
  }>;
  /** Visibilidad condicional: el servidor la evalúa antes de mandar el botón. */
  visibleIf?: { app?: string; sensor?: { id: string; op: '>' | '<' | '>=' | '<=' | '=='; value: number } };
  /** Configuración de los widgets en vivo que sirve `/api/widgets`. */
  sensorWidget?: { sensorId: string; suffix?: string; warnAt?: number; critAt?: number };
  varWidget?: { varName: string; prefix?: string; suffix?: string };
  currencyWidget?: { from: string; to: string; amount?: number };
}

/**
 * Botón tal como se pinta en el móvil: con el `aspectoEncendido` si el
 * interruptor está encendido (roadmap 79). La misma regla que la celda y la
 * tecla física; duplicada aquí porque el proceso principal no puede importar
 * de `src/` más que tipos y datos puros (ver `lint:arch`).
 *
 * T-AUD-03 — Los botones de audio no usan el interruptor: enseñan el icono y
 * sublabel de la salida activa (`resolverAspectoAudio`, Fase 2 del switch),
 * con la misma fusión que la celda (`aplicarAspectoAudio`). El proceso
 * principal no sabe el nombre de la activa (la lista es asíncrona y esto es
 * síncrono), así que `cycle-all` solo hereda el pulso de conmutación. El
 * teléfono re-pide `/api/buttons` cada 3 s y redibuja si cambió, así que el
 * icono cambia solo al conmutar, sin mecanismo de aviso nuevo.
 */
function aplicarAspecto(b: BotonFuenteMando, encendido: boolean, state?: Record<string, string>): BotonFuenteMando {
  if (b.action?.type === 'audio-device') {
    const aspecto = resolverAspectoAudio(
      {
        type: 'audio-device',
        deviceId: b.action.deviceId,
        deviceName: b.action.deviceName,
        audioMode: b.action.audioMode,
        audioCandidates: b.action.audioCandidates,
      },
      estadoActual().activeAudioDeviceId,
    );
    return fusionarAspectoAudio(b, aspecto);
  }
  if (b.action?.type === 'cycle') {
    const aspecto = resolverAspectoCiclo(
      {
        type: 'cycle',
        cycleSteps: b.action.cycleSteps,
      },
      state,
      b.id,
    );
    return fusionarAspectoCiclo(b, aspecto);
  }
  if (!encendido || !b.isToggle) return b;
  const aspecto = b.aspectoEncendido;
  if (!aspecto) return b;
  const next: BotonFuenteMando = { ...b };
  if (aspecto.iconoPuntos) next.iconoPuntos = aspecto.iconoPuntos;
  if (aspecto.icon !== undefined) {
    next.icon = aspecto.icon;
    if (!aspecto.iconoPuntos) next.iconoPuntos = undefined;
  }
  if (aspecto.bgColor) next.bgColor = aspecto.bgColor;
  if (aspecto.fgColor) next.fgColor = aspecto.fgColor;
  return next;
}

/**
 * La marca del botón, resuelta aquí (bitmap/color/paleta) y como SVG autónomo:
 * la página solo la mete en un `<img>`. Animada con el interruptor encendido o
 * con `brandIconAlwaysAnimate`, la misma regla que la celda (`CapasDeFondo`).
 * `iconoSobreMarca` dice si hay icono explícito que la celda pinta encima.
 */
function marcaDeMando(
  b: BotonFuenteMando, fuente: BotonFuenteMando, encendido: boolean,
): Partial<BotonMandoMovil> {
  const marca = resolverMarca(fuente);
  if (!marca) return {};
  const animado = encendido || b.brandIconAlwaysAnimate === true;
  const sobre = Boolean(fuente.iconoPuntos?.bits || fuente.icon);
  return {
    marca: dataUriDeMarca(marca, animado),
    ...(sobre ? { iconoSobreMarca: true as const } : {}),
  };
}

/** Un botón de la config → lo que el móvil necesita para pintarlo y pulsarlo. */
export function botonAMando(b: BotonFuenteMando, encendido = false, state?: Record<string, string>): BotonMandoMovil {
  const fuente = aplicarAspecto(b, encendido, state);
  const resuelto = resolverIconoMando({
    iconoPuntos: fuente.iconoPuntos,
    icon: fuente.icon,
    actionType: fuente.action?.type,
  });
  const tieneLargo = Boolean(b.longPressAction && b.longPressAction.type !== 'none');
  // Sin color de texto propio y con fondo propio, contraste automático
  // (roadmap 102), la misma regla que la celda: si no, un fondo claro propio
  // deja el texto del tema ilegible. La página lo usa tal cual.
  const frente = fuente.fgColor || (fuente.bgColor ? textoSobre(fuente.bgColor) : undefined);
  return {
    id: b.id,
    label: b.label ?? '',
    sublabel: b.sublabel,
    page: b.page ?? 0,
    bgColor: fuente.bgColor,
    fgColor: frente,
    icon: b.icon,
    puntos: resuelto.puntos,
    ...(resuelto.iconTexto ? { iconTexto: resuelto.iconTexto } : {}),
    imageData: mapearImagen(b.imageData),
    customGlyph57: b.customGlyph57,
    ...marcaDeMando(b, fuente, encendido),
    fijo: b.fijo,
    widget: b.widget,
    sliderWidget: b.sliderWidget,
    ...(b.isToggle ? { isToggle: true as const } : {}),
    ...(encendido ? { encendido: true as const } : {}),
    ...(tieneLargo ? { largo: true as const } : {}),
    ...(b.animacion ? { animacion: b.animacion } : {}),
    ...(b.efectoPulsar ? { efectoPulsar: b.efectoPulsar } : {}),
    subButtons: b.subButtons?.map((s) => {
      const sub = resolverIconoMando({
        iconoPuntos: s.iconoPuntos,
        icon: s.icon,
        dotGlyph: s.dotGlyph,
        actionType: s.action?.type,
      });
      return {
        id: s.id,
        label: s.label ?? '',
        sublabel: s.sublabel,
        icon: s.icon,
        dotGlyph: s.dotGlyph,
        puntos: sub.puntos,
        ...(sub.iconTexto ? { iconTexto: sub.iconTexto } : {}),
        bgColor: s.bgColor,
        fgColor: s.fgColor || (s.bgColor ? textoSobre(s.bgColor) : undefined),
      };
    }),
  };
}
