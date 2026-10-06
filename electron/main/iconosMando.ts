import { DOT_GLYPHS_8X8, resolveDotGlyph } from '../../src/components/dot480/dotGlyphsCatalog';
import { GLIFO_POR_TIPO_ACCION } from '../../src/components/dot480/glifosPorTipoAccion';
import { matrizDePuntos16 } from '../../src/components/dot480/puntos16';
import type { EfectoPulsar, SliderWidgetConfig } from '../../src/types';

/**
 * El icono de cada botón, resuelto en el proceso principal para el mando
 * móvil (roadmap 82).
 *
 * Antes `paginaMando.ts` traía su propia tabla de glifos 8×8 (`G8`),
 * incompleta y copiada a mano: todo icono que no estuviera ahí —`CHAT`,
 * `SPARKLE`, `DOTS`, `BATTERY`…— salía como texto. Ahora `listaDeBotones`
 * (`servidorLocal.ts`) resuelve cada botón con los **datos compartidos** (los
 * mismos que la celda: catálogo 16×16, glifo por nombre, glifo del tipo de
 * acción) y lo manda ya como puntos. La página solo los dibuja.
 *
 * Módulo puro, sin Electron ni Node: se puede probar con esbuild + node.
 */

/** Un icono ya resuelto a puntos: lado 8 (DOT 8×8) o 16 (catálogo). */
export interface IconoPuntosMando {
  lado: 8 | 16;
  /** Una fila por número: bit 7 (8×8) o bit 15 (16×16) = izquierda. */
  filas: number[];
}

/** Lo que el servidor manda por botón: puntos siempre, texto solo si `icon` no es glifo. */
export interface IconoResueltoMando {
  puntos: IconoPuntosMando;
  /**
   * `icon` cuando no resuelve a ningún glifo (texto corto tipo «AB» o texto
   * largo): la página lo dibuja como texto, como la celda, en vez de los
   * puntos del tipo de acción.
   */
  iconTexto?: string;
}

export interface SubBotonMandoMovil {
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
  brandIcon?: string;
  fijo?: boolean;
  widget?: string;
  sliderWidget?: SliderWidgetConfig;
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
  action?: { type: string };
  longPressAction?: { type: string };
  bgColor?: string;
  fgColor?: string;
  icon?: string;
  iconoPuntos?: { bits: string; origen: string };
  imageData?: string;
  customGlyph57?: number[];
  brandIcon?: string;
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
 * Los 5 alias de la tabla vieja (`G8`/`ALIAS` en `paginaMando.ts`) que
 * `resolveDotGlyph` no cubre. Se resuelven **por nombre** contra el catálogo
 * compartido: aquí no hay filas copiadas, solo los nombres que faltaban para
 * no cambiar lo que el móvil ya dibujaba. El quinto (el que la tabla vieja
 * mandaba a MINIMIZE) se construye por códigos para no depender de cómo lo
 * enseñe el editor.
 */
const ALIAS_EXTRA: Record<string, string> = {
  VOLUME: 'SPEAKER',
  '📊': 'CPU',
  '◷': 'CLOCK',
  '⛶': 'FULLSCREEN',
};
ALIAS_EXTRA[String.fromCharCode(0xd83d, 0xddd7)] = 'MINIMIZE';

/** Filas 8×8 de un nombre ya resuelto, o `null` si no existe. */
function filas8(nombre: string | null | undefined): number[] | null {
  if (!nombre) return null;
  const filas = DOT_GLYPHS_8X8[nombre];
  return filas ? [...filas] : null;
}

/** El icono del catálogo 16×16 copiado en el botón, como filas de 16 bits. */
function filasDeCatalogo(bits: string | undefined): number[] | null {
  if (!bits) return null;
  const matriz = matrizDePuntos16(bits);
  if (!matriz) return null;
  return matriz.map((fila) =>
    fila.reduce((n, encendido, x) => n | (encendido ? 1 << (15 - x) : 0), 0));
}

/** Glifo por nombre (`icon` o `dotGlyph` de un sub-botón), con los alias extra. */
function filasDeNombre(icon: string | undefined, dotGlyph: string | undefined): number[] | null {
  if (icon) {
    const directo = filas8(resolveDotGlyph(icon));
    if (directo) return directo;
    const recortado = icon.trim();
    const extra = ALIAS_EXTRA[recortado.toUpperCase()] ?? ALIAS_EXTRA[recortado];
    if (extra) {
      const porAlias = filas8(extra);
      if (porAlias) return porAlias;
    }
  }
  return filas8(dotGlyph);
}

/** Último recurso, como la celda: el glifo del tipo de acción. */
function filasDeAccion(tipo: string | undefined): number[] {
  const nombre = (GLIFO_POR_TIPO_ACCION as Record<string, string>)[tipo ?? ''] ?? 'DOTS';
  return [...(DOT_GLYPHS_8X8[nombre] ?? DOT_GLYPHS_8X8.DOTS)];
}

/**
 * Resuelve el icono de un botón en el mismo orden que la celda
 * (`ContenidoCentral`): catálogo 16×16 → glifo por nombre → tipo de acción.
 * El fondo (imagen/marca) y el 5×7 los sigue decidiendo la página, que ya
 * los recibe aparte.
 */
export function resolverIconoMando(fuente: {
  iconoPuntos?: { bits: string; origen: string };
  icon?: string;
  dotGlyph?: string;
  actionType?: string;
}): IconoResueltoMando {
  const catalogo = filasDeCatalogo(fuente.iconoPuntos?.bits);
  if (catalogo) return { puntos: { lado: 16, filas: catalogo } };
  const nombrado = filasDeNombre(fuente.icon, fuente.dotGlyph);
  if (nombrado) return { puntos: { lado: 8, filas: nombrado } };
  const puntos = { lado: 8 as const, filas: filasDeAccion(fuente.actionType) };
  const texto = fuente.icon?.trim();
  return texto ? { puntos, iconTexto: texto } : { puntos };
}

/** `vd://images/…` → ruta servida por `/media/images/`. */
function mapearImagen(imageData: string | undefined): string | undefined {
  if (!imageData) return undefined;
  if (imageData.startsWith('vd://images/')) {
    return `/media/images/${encodeURIComponent(imageData.slice('vd://images/'.length))}`;
  }
  if (imageData.startsWith('vd://')) {
    const resto = imageData.slice('vd://'.length).replace(/^images[/\\]/, '');
    return `/media/images/${encodeURIComponent(resto)}`;
  }
  return imageData;
}

/**
 * Botón tal como se pinta en el móvil: con el `aspectoEncendido` si el
 * interruptor está encendido (roadmap 79). La misma regla que la celda y la
 * tecla física; duplicada aquí porque el proceso principal no puede importar
 * de `src/` más que tipos y datos puros (ver `lint:arch`).
 */
function aplicarAspecto(b: BotonFuenteMando, encendido: boolean): BotonFuenteMando {
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

/** Un botón de la config → lo que el móvil necesita para pintarlo y pulsarlo. */
export function botonAMando(b: BotonFuenteMando, encendido = false): BotonMandoMovil {
  const fuente = aplicarAspecto(b, encendido);
  const resuelto = resolverIconoMando({
    iconoPuntos: fuente.iconoPuntos,
    icon: fuente.icon,
    actionType: fuente.action?.type,
  });
  const tieneLargo = Boolean(b.longPressAction && b.longPressAction.type !== 'none');
  return {
    id: b.id,
    label: b.label ?? '',
    sublabel: b.sublabel,
    page: b.page ?? 0,
    bgColor: fuente.bgColor,
    fgColor: fuente.fgColor,
    icon: b.icon,
    puntos: resuelto.puntos,
    ...(resuelto.iconTexto ? { iconTexto: resuelto.iconTexto } : {}),
    imageData: mapearImagen(b.imageData),
    customGlyph57: b.customGlyph57,
    brandIcon: b.brandIcon,
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
        fgColor: s.fgColor,
      };
    }),
  };
}

/**
 * La animación de la página del móvil, como texto para incrustar.
 *
 * Vive aquí y no en `paginaMando.ts` para no pasar el tope de 600 líneas de
 * ese archivo: es código de la página (sin tipos, con `var`), no del
 * servidor, y `paginaMando` lo interpola dentro del script que lleva el
 * nonce. Por eso no lleva ni comillas invertidas ni interpolaciones: romperían
 * el literal que lo contiene.
 */
export const JS_ANIMACION_MANDO = `
var animadosMovil = [];
var rafMovil = 0;
var ocultoMovilEn = 0;

function matrizDePuntos(puntos) {
  var lado = puntos && puntos.lado === 16 ? 16 : 8;
  var filas = (puntos && puntos.filas) || [];
  var mascara = lado === 16 ? 65535 : 255;
  var m = [];
  for (var y = 0; y < lado; y++) {
    var f = [];
    var bits = ((typeof filas[y] === 'number' && isFinite(filas[y]) ? Math.trunc(filas[y]) : 0) & mascara);
    for (var x = 0; x < lado; x++) f.push(((bits >> ((lado - 1) - x)) & 1) === 1);
    m.push(f);
  }
  return m;
}

function continuaMovil(b) {
  if (!b.animacion || !b.animacion.efecto) return null;
  if (b.animacion.cuando === 'siempre') return b.animacion.efecto;
  if (b.animacion.cuando === 'encendido' && b.encendido) return b.animacion.efecto;
  return null;
}

function entradaMovil(celda) {
  for (var i = 0; i < animadosMovil.length; i++) {
    if (animadosMovil[i].celda === celda) return animadosMovil[i];
  }
  return null;
}

function arrancarMovil() {
  if (rafMovil || animadosMovil.length === 0) return;
  rafMovil = requestAnimationFrame(pasoMovil);
}

function pasoMovil(ahora) {
  rafMovil = 0;
  var vivos = [];
  for (var i = 0; i < animadosMovil.length; i++) {
    var a = animadosMovil[i];
    var intens = null;
    var sigue = false;
    if (a.pulso) {
      var durP = HAY_MOTOR.duracionEfecto(a.pulso.efecto);
      var dt = ahora - a.pulso.t0;
      if (dt >= durP) {
        a.pulso = null;
      } else {
        intens = HAY_MOTOR.calcularPuntos(a.matriz, a.pulso.efecto, dt).intensidades;
        sigue = true;
      }
    }
    if (!sigue && a.continua) {
      var durC = HAY_MOTOR.duracionEfecto(a.efecto);
      var t = (HAY_MOTOR.esContinuo(a.efecto) || durC <= 0)
        ? ahora - a.inicio
        : (ahora - a.inicio) % durC;
      intens = HAY_MOTOR.calcularPuntos(a.matriz, a.efecto, t).intensidades;
      sigue = true;
    }
    for (var j = 0; j < a.celdas.length; j++) {
      var c = a.celdas[j];
      var v = intens && intens[c.y] ? (intens[c.y][c.x] || 0) : 1;
      c.el.setAttribute('opacity', String(v < 0 ? 0 : v > 1 ? 1 : v));
    }
    if (sigue) vivos.push(a);
  }
  animadosMovil = vivos;
  if (vivos.length > 0 && !document.hidden) rafMovil = requestAnimationFrame(pasoMovil);
}

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    ocultoMovilEn = performance.now();
  } else if (animadosMovil.length > 0) {
    var pausa = performance.now() - ocultoMovilEn;
    for (var i = 0; i < animadosMovil.length; i++) {
      animadosMovil[i].inicio += pausa;
      if (animadosMovil[i].pulso) animadosMovil[i].pulso.t0 += pausa;
    }
    arrancarMovil();
  }
});

function registrarAnimado(b, celda, celdas) {
  if (!HAY_MOTOR || REDUCIDO || !b.puntos || !celdas || celdas.length === 0) return;
  var fx = continuaMovil(b);
  if (!fx) return;
  animadosMovil.push({
    celda: celda, celdas: celdas, matriz: matrizDePuntos(b.puntos),
    efecto: fx, continua: true, inicio: performance.now(), pulso: null,
  });
  arrancarMovil();
}

function animarPulsoMovil(b, celda, celdas) {
  if (!HAY_MOTOR || !b.puntos || !celdas || celdas.length === 0) return;
  var fx = b.efectoPulsar || 'destello';
  if (fx !== 'destello' && fx !== 'onda') {
    fx = b.animacion && b.animacion.cuando === 'al-pulsar' ? b.animacion.efecto : null;
    if (!fx) return;
  }
  var a = entradaMovil(celda);
  if (!a) {
    a = {
      celda: celda, celdas: celdas, matriz: matrizDePuntos(b.puntos),
      efecto: '', continua: false, inicio: 0, pulso: null,
    };
    animadosMovil.push(a);
  }
  a.pulso = { efecto: fx, t0: performance.now() };
  arrancarMovil();
}
`;
