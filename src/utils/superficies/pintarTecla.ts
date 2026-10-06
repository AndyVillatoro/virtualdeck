import type { ButtonConfig, LcdControl } from '../../types';
import type { DatosWidget } from '../../comun/widgets';
import { textoDeAviso, type AvisoPerilla } from './avisoPerilla';
import { dibujarSubdivisionLcd, type UtilesSubdivision } from './subdivisionLcd';
import { pintarWidgetLcd } from './widgetLcd';

/**
 * Convierte el botón de un hueco en el JPEG que espera la tecla LCD.
 *
 * Corre en el renderer (usa canvas) y por eso no puede mirar el tema: los
 * colores entran por parámetro. El tamaño y el giro salen del `lcd` del
 * contrato (`DisposicionSuperficie`), y la rotación efectiva la decide quien
 * llama (la de la página si existe).
 *
 * Reproduce la precedencia de `celda/ContenidoCentral`: imagen o icono de
 * marca (+ icono encima si lo hay) → glifo 5×7 propio → icono del catálogo
 * 16×16 (`iconoPuntos`) → glifo DOT 8×8 → texto corto en DotGothic16 →
 * texto largo → icono SVG del tipo de acción.
 * Los iconos en puntos (catálogo y DOT) y el icono de acción llegan
 * **inyectados** (`opciones.iconoSvg`): viven en `components/` y esta capa
 * no puede importarlos. Los iconos de marca se cargan del catálogo con el
 * mismo `import()` diferido que usa la interfaz.
 *
 * Un hueco vacío es negro. El JPEG se baja de calidad hasta caber en 10240
 * bytes, el límite del búfer del microcontrolador.
 */

export interface ColoresSuperficie {
  /** Fondo de un hueco con botón sin `bgColor` propio. */
  fondo: string;
  /** Color de texto/icono si el botón no trae `fgColor`. */
  texto: string;
  /** Amarillo de aviso de un widget (`tone: 'warn'`), como la celda del deck. */
  aviso: string;
  /** Rojo crítico de un widget (`tone: 'crit'`), como la celda del deck. */
  critico: string;
}

/**
 * Paleta OLED fija de las teclas LCD: no depende del tema de la aplicación
 * (una tecla física no tiene modo claro). La usa `App` al llamar al hook.
 *
 * `aviso`/`critico` son los semánticos de la paleta oscura de `design.ts`
 * (`VD.warning`/`VD.danger`), que es la que ve la celda del deck por defecto.
 */
export const COLORES_LCD: ColoresSuperficie = {
  fondo: '#070809',
  texto: '#e6e8eb',
  aviso: '#d4a234',
  critico: '#d95f5f',
};

export interface OpcionesPintado {
  /**
   * SVG del centro (glifo DOT o icono de acción) según la precedencia de la
   * celda. `sobreFondo` indica que el icono va encima de una imagen o marca.
   * Lo pasa la capa de componentes (`svgDeBoton`).
   */
  iconoSvg?: (boton: ButtonConfig, color: string, dimColor?: string, sobreFondo?: boolean) => string | null;
  /**
   * Dice si `button.icon` se resuelve como glifo DOT. Opcional; sin ella los
   * textos cortos (≤3 caracteres) se pintan como texto en lugar de glifo.
   */
  esGlifoDot?: (boton: ButtonConfig) => boolean;
}

export interface ImagenTecla {
  /** JPEG rotado, listo para mandar al aparato (sin prefijo `data:`). */
  jpegBase64: string;
  /** PNG sin rotar del mismo dibujo: lo que enseña la pantalla. */
  dataUrl: string;
}

/**
 * Boton tal como se pinta en el LCD: con el `aspectoEncendido` si el
 * interruptor esta encendido (roadmap 79). La misma regla que la celda
 * (`botonEfectivo` en `components/dot480/animacionPuntos`): duplicada aqui
 * a proposito, porque `src/utils` no puede importar componentes
 * (regla `utils-no-ui`).
 */
export function resolverBotonLcd(boton: ButtonConfig, encendido: boolean): ButtonConfig {
  if (!encendido || boton.isToggle !== true) return boton;
  const aspecto = boton.aspectoEncendido;
  if (!aspecto) return boton;
  const next: ButtonConfig = { ...boton };
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
 * Extras del pintado animado (roadmap 78/79). La matriz y las intensidades
 * salen del motor DOT (`globalThis.EfectosPuntos`, registrado por la capa de
 * componentes); aqui solo son numeros, sin importar nada de UI.
 */
export interface ExtrasAnimados {
  /** Matriz de puntos del icono (N×N booleanos), ya resuelta por el llamador. */
  matriz?: boolean[][];
  /** Intensidad 0-1 por punto, misma forma que `matriz`. */
  intensidades?: number[][];
  /** Velo blanco 0-1 encima de todo (destello en botones sin puntos). */
  destello?: number;
}

const LIMITE_JPEG = 10240;
const CALIDAD_MAXIMA = 0.9;
const CALIDAD_MINIMA = 0.1;

/** Nombres de `src/design.ts` (no se puede importar la paleta aquí). */
const FAMILIA_MONO = 'JetBrains Mono';
const FAMILIA_DOTS = 'DotGothic16';
const FUENTE_MONO = `"${FAMILIA_MONO}", ui-monospace, monospace`;
const FUENTE_DOTS = `"${FAMILIA_DOTS}", monospace`;
/** Tope para esperar a Google Fonts: sin internet no puede bloquear el pintado. */
const TOPE_FUENTES_MS = 1200;

/**
 * Relieve de los puntos apagados en el LCD. Es más visible que el `dotIdle`
 * de la pantalla (0.04) porque en 64 px el punto apagado, si no se ve, quita
 * la retícula; más alto empezaría a ensuciar el fondo.
 */
const DIM_GLIFO = 'rgba(230, 232, 235, 0.10)';

/** Proporción del lado que ocupa el centro (glifo, icono o marca). */
const CAJA_CENTRO = 0.62;
/** Trama de la imagen: 16 aperturas por lado, la densidad de la celda. */
const TRAMA_DIVISIONES = 16;
const TRAMA_RADIO = 0.35;
const TRAMA_FONDO = '#070809';
/** Franja de la etiqueta, como `RotuloCelda`: alto relativo y velos. */
const ETIQUETA_ALTO = 0.2;
/** Con sub-etiqueta la franja lleva dos líneas. */
const ETIQUETA_ALTO_DOBLE = 0.34;
const ETIQUETA_VELO = 0.35;
const ETIQUETA_DEGRADADO = 0.75;
/** Sub-etiqueta atenuada sobre imagen, como `RotuloCelda` (`SUBLABEL_SOBRE_IMAGEN`). */
const SUBLABEL_SOBRE_IMAGEN = '#9da2a8';
/** Opacidad de la sub-etiqueta sobre fondo liso: más apagada que la etiqueta. */
const SUBLABEL_ALFA = 0.6;

let intentoFuentes: Promise<void> | null = null;

/** Carga las fuentes una sola vez; si no llegan, el respaldo es monospace. */
export function prepararFuentesLcd(): Promise<void> {
  if (!intentoFuentes) intentoFuentes = cargarFuentes();
  return intentoFuentes;
}

async function cargarFuentes(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`600 16px "${FAMILIA_MONO}"`),
        document.fonts.load(`16px "${FAMILIA_DOTS}"`),
      ]),
      new Promise((resolver) => setTimeout(resolver, TOPE_FUENTES_MS)),
    ]);
  } catch {
    // Sin internet: se pinta con el respaldo y `loadingdone` avisará si llegan.
  }
}

function fuenteDisponible(especificacion: string): boolean {
  try {
    return typeof document !== 'undefined' && !!document.fonts?.check(especificacion);
  } catch {
    return false;
  }
}

/** ¿Ya están las dos fuentes? Lo usa el hook en la firma de la tecla. */
export function fuentesLcdListas(): boolean {
  return fuenteDisponible(`600 16px "${FAMILIA_MONO}"`) && fuenteDisponible(`16px "${FAMILIA_DOTS}"`);
}

function fuenteMono(): string {
  return fuenteDisponible(`600 16px "${FAMILIA_MONO}"`) ? FUENTE_MONO : 'monospace';
}

function fuenteDots(): string {
  return fuenteDisponible(`16px "${FAMILIA_DOTS}"`) ? FUENTE_DOTS : 'monospace';
}

function crearLienzo(ancho: number, alto: number): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  return lienzo;
}

function contexto(lienzo: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return lienzo.getContext('2d');
}

function colorFondo(boton: ButtonConfig | null, colores: ColoresSuperficie): string {
  if (!boton) return '#000000';
  return boton.bgColor || colores.fondo;
}

/** Lo mismo que la celda (`celda/derivados.ts`): sin acción ni nada que enseñar. */
function estaVacio(boton: ButtonConfig): boolean {
  return boton.action.type === 'none'
    && !boton.label && !boton.icon && !boton.imageData && !boton.brandIcon;
}

/**
 * Color del icono y del texto. Un botón vacío va apagado, como en la celda
 * (`VD.textMuted` de la paleta OLED): en el aparato, el círculo de «sin
 * acción» en blanco brillante llenaba de ruido las teclas sin configurar.
 */
const TEXTO_APAGADO = '#555a64';

function colorTexto(boton: ButtonConfig | null, colores: ColoresSuperficie): string {
  if (!boton) return colores.texto;
  if (estaVacio(boton)) return TEXTO_APAGADO;
  return boton.fgColor || colores.texto;
}

/** Carga una imagen sin manchar el canvas (si no admite CORS, se descarta). */
export function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const imagen = new Image();
    imagen.crossOrigin = 'anonymous';
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => resolve(null);
    imagen.src = src;
  });
}

/**
 * Un trozo de imagen ya decodificado que se pinta como fondo con la trama.
 * Para la imagen estática es el `<img>` entero; para un GIF animado, la celda
 * de la hoja de fotogramas (`vd://frames/…`, ver `protocoloVd.ts`) que toca.
 */
export interface CuadroLcd {
  fuente: CanvasImageSource;
  sx: number;
  sy: number;
  ancho: number;
  alto: number;
}

/** Dibuja un SVG (texto) encajado en una caja cuadrada centrada. */
async function dibujarSvg(
  ctx: CanvasRenderingContext2D, svg: string, ancho: number, alto: number, caja: number, centroY: number,
): Promise<boolean> {
  const imagen = await cargarImagen('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  if (!imagen || !imagen.width || !imagen.height) return false;
  const escala = Math.min(caja / imagen.width, caja / imagen.height);
  const w = imagen.width * escala;
  const h = imagen.height * escala;
  ctx.drawImage(imagen, (ancho - w) / 2, centroY - h / 2, w, h);
  return true;
}

/**
 * Imagen con la trama de puntos de la celda (`DotMatrixImageOverlay`): solo se
 * ve por micro-aperturas circulares y el resto queda en negro OLED. El paso se
 * escala al LCD (16 aperturas por lado, como la celda a 96 px).
 */
function dibujarConTrama(
  ctx: CanvasRenderingContext2D, cuadro: CuadroLcd, ancho: number, alto: number,
): void {
  const capa = crearLienzo(ancho, alto);
  const ctxCapa = contexto(capa);
  if (!ctxCapa) return;
  // «Cover» con recorte centrado: la misma regla que la celda.
  const escala = Math.max(ancho / cuadro.ancho, alto / cuadro.alto);
  const w = cuadro.ancho * escala;
  const h = cuadro.alto * escala;
  ctxCapa.drawImage(
    cuadro.fuente, cuadro.sx, cuadro.sy, cuadro.ancho, cuadro.alto,
    (ancho - w) / 2, (alto - h) / 2, w, h,
  );

  const paso = Math.max(3, ancho / TRAMA_DIVISIONES);
  const radio = paso * TRAMA_RADIO;
  // Un solo `fill()` con todos los círculos en el mismo camino: `destination-in`
  // se aplica por operación de dibujo, y con un `fill()` por círculo cada uno
  // borraría los anteriores (intersección de círculos disjuntos = nada).
  ctxCapa.globalCompositeOperation = 'destination-in';
  ctxCapa.fillStyle = '#000000';
  ctxCapa.beginPath();
  for (let y = paso / 2; y < alto; y += paso) {
    for (let x = paso / 2; x < ancho; x += paso) {
      ctxCapa.arc(x, y, radio, 0, Math.PI * 2);
    }
  }
  ctxCapa.fill();
  ctxCapa.globalCompositeOperation = 'destination-over';
  ctxCapa.fillStyle = TRAMA_FONDO;
  ctxCapa.fillRect(0, 0, ancho, alto);

  ctx.drawImage(capa, 0, 0);
}

/** Igual que `dibujarConTrama`, cargando antes la imagen estática del botón. */
async function dibujarImagenConTrama(
  ctx: CanvasRenderingContext2D, src: string, ancho: number, alto: number,
): Promise<boolean> {
  const imagen = await cargarImagen(src);
  if (!imagen) return false;
  dibujarConTrama(ctx, { fuente: imagen, sx: 0, sy: 0, ancho: imagen.width, alto: imagen.height }, ancho, alto);
  return true;
}

/** Icono de marca desde el catálogo (diferido, el mismo chunk que la interfaz). */
async function dibujarMarca(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number, centroY: number,
): Promise<boolean> {
  if (!boton.brandIcon) return false;
  try {
    const { BRAND_ICONS_MAP, generateSvgFromBitmap, mergePalette } = await import('../../data/brandIcons');
    const icono = BRAND_ICONS_MAP[boton.brandIcon];
    const bitmap = boton.brandIconCustomBitmap?.length ? boton.brandIconCustomBitmap : icono?.bitmap;
    if (!bitmap?.length) return false;
    const color = boton.brandIconCustomColor || icono?.color || '#e6e8eb';
    const palette = boton.brandIconCustomPalette
      ? mergePalette(boton.brandIcon, boton.brandIconCustomPalette)
      : (icono?.palette ?? {});
    const svg = generateSvgFromBitmap(bitmap, color, palette);
    return await dibujarSvg(ctx, svg, ancho, alto, Math.min(ancho, alto) * CAJA_CENTRO, centroY);
  } catch {
    return false;
  }
}

/** Glifo dibujado a mano: 7 filas, 5 bits por fila (bit 4 = izquierda). */
function dibujarGlifo57(ctx: CanvasRenderingContext2D, filas: number[], ancho: number, alto: number, color: string, centroY: number): void {
  const caja = Math.min(ancho, alto) * CAJA_CENTRO;
  const paso = caja / 5;
  const x0 = (ancho - caja) / 2;
  const y0 = centroY - (paso * 7) / 2;
  ctx.fillStyle = color;
  for (let fila = 0; fila < filas.length; fila++) {
    for (let columna = 0; columna < 5; columna++) {
      if (!((filas[fila] >> (4 - columna)) & 1)) continue;
      ctx.beginPath();
      ctx.arc(x0 + columna * paso + paso / 2, y0 + fila * paso + paso / 2, paso * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * El centro animado: la matriz de puntos del icono con la intensidad de cada
 * punto (motor DOT). Misma caja que el glifo; un punto con intensidad ~0 se
 * dibuja en relieve, como los apagados de la celda.
 */
function dibujarMatrizAnimada(
  ctx: CanvasRenderingContext2D, matriz: boolean[][], intensidades: number[][],
  ancho: number, alto: number, color: string, centroY: number,
): void {
  const n = matriz.length;
  if (n === 0) return;
  const caja = Math.min(ancho, alto) * CAJA_CENTRO;
  const paso = caja / n;
  const x0 = (ancho - caja) / 2;
  const y0 = centroY - caja / 2;
  for (let y = 0; y < n; y++) {
    const fila = matriz[y] ?? [];
    const intens = intensidades[y] ?? [];
    for (let x = 0; x < n; x++) {
      const alfa = fila[x] ? (intens[x] ?? 1) : 0;
      ctx.beginPath();
      ctx.arc(x0 + x * paso + paso / 2, y0 + y * paso + paso / 2, paso * 0.4, 0, Math.PI * 2);
      if (alfa <= 0.02) {
        ctx.fillStyle = DIM_GLIFO;
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = alfa > 1 ? 1 : alfa;
      }
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function dibujarTextoCentrado(
  ctx: CanvasRenderingContext2D, texto: string, ancho: number, alto: number, color: string, centroY: number,
): void {
  // Encoge hasta caber en el ancho (con 3 px de margen por lado), como la
  // celda, que nunca deja salir el texto. Por debajo de 8 px ya no se lee en
  // el LCD: se recorta con puntos suspensivos.
  const MINIMO = 8;
  const disponible = ancho - 6;
  let tamano = Math.max(MINIMO, Math.round(Math.min(ancho, alto) * 0.3));
  ctx.font = `600 ${tamano}px ${fuenteMono()}`;
  while (tamano > MINIMO && ctx.measureText(texto).width > disponible) {
    tamano -= 1;
    ctx.font = `600 ${tamano}px ${fuenteMono()}`;
  }
  let visible = texto;
  while (visible.length > 1 && ctx.measureText(visible).width > disponible) visible = visible.slice(0, -2) + '…';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(visible, ancho / 2, centroY);
}

/**
 * El centro cuando no hay fondo: glifo 5×7 → icono del catálogo 16×16 o
 * glifo DOT inyectado → texto. La precedencia es la de `ContenidoCentral`:
 * `iconoSvg` resuelve el 16×16 antes que el 8×8, así que un solo camino
 * cubre los dos.
 */
function esTextoCorto(boton: ButtonConfig, opciones: OpcionesPintado): boolean {
  const texto = (boton.icon ?? '').trim();
  if (!texto) return false;
  if (opciones.esGlifoDot) return !opciones.esGlifoDot(boton) && texto.length <= 3;
  return texto.length <= 3;
}

function esGlifoDot(boton: ButtonConfig, opciones: OpcionesPintado): boolean {
  const texto = (boton.icon ?? '').trim();
  if (!texto) return false;
  if (opciones.esGlifoDot) return opciones.esGlifoDot(boton);
  return false;
}

async function dibujarCentro(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  color: string, centroY: number, opciones: OpcionesPintado,
): Promise<void> {
  if (boton.customGlyph57?.length === 7) {
    dibujarGlifo57(ctx, boton.customGlyph57, ancho, alto, color, centroY);
    return;
  }

  const lado = Math.min(ancho, alto);
  if (esGlifoDot(boton, opciones)) {
    const svg = opciones.iconoSvg?.(boton, color, DIM_GLIFO, false);
    if (svg && await dibujarSvg(ctx, svg, ancho, alto, lado * CAJA_CENTRO, centroY)) return;
  }

  const texto = (boton.icon ?? '').trim();
  if (esTextoCorto(boton, opciones)) {
    const tamano = Math.max(8, Math.round(lado * 0.34));
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${tamano}px ${fuenteDots()}`;
    ctx.fillText(texto, ancho / 2, centroY);
    return;
  }

  if (texto) {
    dibujarTextoCentrado(ctx, texto, ancho, alto, color, centroY);
    return;
  }

  const svg = opciones.iconoSvg?.(boton, color, DIM_GLIFO, false);
  if (svg && await dibujarSvg(ctx, svg, ancho, alto, lado * CAJA_CENTRO, centroY)) return;
}

/** Icono encima de una marca: como en la celda, solo si hay marca e icono (de catálogo o por nombre). */
async function dibujarSuperpuesto(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number, centroY: number,
  opciones: OpcionesPintado,
): Promise<void> {
  const lado = Math.min(ancho, alto);
  const svg = opciones.iconoSvg?.(boton, '#fff', 'transparent', true);
  if (svg && await dibujarSvg(ctx, svg, ancho, alto, lado * CAJA_CENTRO, centroY)) return;
  const texto = (boton.icon ?? '').trim();
  if (texto) dibujarTextoCentrado(ctx, texto, ancho, alto, '#fff', centroY);
}

/** Recorta con puntos suspensivos hasta caber, con la fuente ya puesta en el ctx. */
function recortarTexto(ctx: CanvasRenderingContext2D, texto: string, maximo: number): string {
  let visible = texto;
  while (visible.length > 1 && ctx.measureText(`${visible}…`).width > maximo) {
    visible = visible.slice(0, -1);
  }
  return visible === texto ? texto : `${visible}…`;
}

/** Alto de la franja del rótulo. La comparten el rótulo y el widget. */
function altoFranjaRotulo(conSub: boolean, alto: number): number {
  return Math.max(conSub ? 16 : 12, Math.round(alto * (conSub ? ETIQUETA_ALTO_DOBLE : ETIQUETA_ALTO)));
}

/**
 * La franja con el nombre, como `RotuloCelda`: JetBrains Mono 600, mayúsculas
 * y velo oscuro abajo (degradado si hay imagen o marca). Con `sublabel`, la
 * franja lleva dos líneas: la sub-etiqueta va debajo, más pequeña y atenuada,
 * la misma jerarquía que en la celda.
 */
function dibujarEtiqueta(
  ctx: CanvasRenderingContext2D, texto: string, subtexto: string, ancho: number, alto: number,
  color: string, sobreFondo: boolean,
): void {
  const limpio = texto.trim().toUpperCase();
  const sub = subtexto.trim().toUpperCase();
  if (!limpio && !sub) return;
  const altoFranja = altoFranjaRotulo(!!sub, alto);
  const yFranja = alto - altoFranja;

  if (sobreFondo) {
    const degradado = ctx.createLinearGradient(0, yFranja, 0, alto);
    degradado.addColorStop(0, 'rgba(0, 0, 0, 0)');
    degradado.addColorStop(0.6, `rgba(0, 0, 0, ${ETIQUETA_DEGRADADO})`);
    degradado.addColorStop(1, `rgba(0, 0, 0, ${ETIQUETA_DEGRADADO})`);
    ctx.fillStyle = degradado;
  } else {
    ctx.fillStyle = `rgba(0, 0, 0, ${ETIQUETA_VELO})`;
  }
  ctx.fillRect(0, yFranja, ancho, altoFranja);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const maximo = ancho - 4;
  if (sobreFondo) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
  }
  if (limpio) {
    const tamano = Math.max(7, Math.round(alto * (sub ? 0.13 : 0.14)));
    ctx.font = `600 ${tamano}px ${fuenteMono()}`;
    ctx.fillStyle = sobreFondo ? '#fff' : color;
    const y = sub
      ? yFranja + Math.round(altoFranja * 0.42)
      : alto - Math.max(3, Math.round(alto * 0.05));
    ctx.fillText(recortarTexto(ctx, limpio, maximo), ancho / 2, y);
  }
  if (sub) {
    const tamano = Math.max(6, Math.round(alto * 0.1));
    ctx.font = `600 ${tamano}px ${fuenteMono()}`;
    ctx.fillStyle = sobreFondo ? SUBLABEL_SOBRE_IMAGEN : color;
    ctx.globalAlpha = sobreFondo ? 1 : SUBLABEL_ALFA;
    ctx.fillText(recortarTexto(ctx, sub, maximo), ancho / 2, alto - Math.max(2, Math.round(alto * 0.04)));
    ctx.globalAlpha = 1;
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/** El destello blanco al pulsar, encima de todo (roadmap 79). */
function dibujarDestello(
  ctx: CanvasRenderingContext2D, ancho: number, alto: number, extras?: ExtrasAnimados,
): void {
  if (!extras?.destello) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${extras.destello > 1 ? 1 : extras.destello})`;
  ctx.fillRect(0, 0, ancho, alto);
}

/** ¿El botón enseña fondo (imagen o marca) en vez del centro? */
function tieneFondo(boton: ButtonConfig): boolean {
  return !!(boton.imageData || boton.brandIcon);
}

/** ¿Hay rótulo que ocupe franja? Etiqueta, sub-etiqueta o las dos. */
function tieneRotulo(boton: ButtonConfig): boolean {
  return !!(boton.label || boton.sublabel);
}

/** Icono superpuesto a una marca: solo si hay marca y algo que poner encima. */
function marcaConIcono(boton: ButtonConfig): boolean {
  return !!boton.brandIcon && !!(boton.iconoPuntos?.bits || boton.icon);
}

/** El cuerpo normal de la tecla: fondo, centro y rótulo (sin mosaico). */
async function pintarCuerpoCelda(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  colores: ColoresSuperficie, opciones: OpcionesPintado, extras?: ExtrasAnimados,
  datos?: DatosWidget | null,
): Promise<void> {
  const color = colorTexto(boton, colores);
  const sobreFondo = tieneFondo(boton);
  const centroY = tieneRotulo(boton) ? alto * 0.42 : alto * 0.5;

  // Con widget, el dato manda sobre imagen, marca y glifo, como en la celda
  // (`ContenidoCentral`); la franja del rótulo se descuenta para el dato.
  if (datos) {
    const zona = alto - (tieneRotulo(boton) ? altoFranjaRotulo(!!boton.sublabel, alto) : 0);
    await pintarWidgetLcd(ctx, boton, datos, ancho, zona,
      { texto: color, aviso: colores.aviso, critico: colores.critico, tenue: colores.texto },
      { fuenteMono, dim: DIM_GLIFO, iconoSvg: opciones.iconoSvg, dibujarSvg });
    dibujarEtiqueta(ctx, boton.label ?? '', boton.sublabel ?? '', ancho, alto, color, false);
    dibujarDestello(ctx, ancho, alto, extras);
    return;
  }

  let fondoPintado = false;
  if (boton.imageData) fondoPintado = await dibujarImagenConTrama(ctx, boton.imageData, ancho, alto);
  else if (boton.brandIcon) fondoPintado = await dibujarMarca(ctx, boton, ancho, alto, centroY);

  if (extras?.matriz && extras?.intensidades) {
    dibujarMatrizAnimada(ctx, extras.matriz, extras.intensidades, ancho, alto, color, centroY);
  } else if (fondoPintado) {
    if (marcaConIcono(boton)) await dibujarSuperpuesto(ctx, boton, ancho, alto, centroY, opciones);
  } else {
    await dibujarCentro(ctx, boton, ancho, alto, color, centroY, opciones);
  }
  dibujarEtiqueta(ctx, boton.label ?? '', boton.sublabel ?? '', ancho, alto, color, sobreFondo);
  dibujarDestello(ctx, ancho, alto, extras);
}

/** Lo que `subdivisionLcd` necesita del pintor: fuentes, imagen y puntos apagados. */
function utilesSubdivision(opciones: OpcionesPintado): UtilesSubdivision {
  return { cargarImagen, fuenteMono, fuenteDots, dim: DIM_GLIFO, iconoSvg: opciones.iconoSvg };
}

/**
 * El contenido de una tecla con botón: el mosaico 2×2 si lo hay (manda sobre
 * imagen y rótulo, como `Subdivision2x2` en la celda) y si no el cuerpo normal.
 */
async function pintarContenido(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  colores: ColoresSuperficie, opciones: OpcionesPintado, extras?: ExtrasAnimados,
  datos?: DatosWidget | null,
): Promise<void> {
  if (boton.subButtons?.length === 4) {
    await dibujarSubdivisionLcd(ctx, boton, ancho, alto, colorTexto(boton, colores), utilesSubdivision(opciones));
    dibujarDestello(ctx, ancho, alto, extras);
    return;
  }
  await pintarCuerpoCelda(ctx, boton, ancho, alto, colores, opciones, extras, datos);
}

/** Rota el lienzo en sentido horario; a 90/270 se intercambian los lados. */
function rotar(lienzo: HTMLCanvasElement, grados: number): HTMLCanvasElement {
  const limpio = ((Math.round(grados / 90) * 90) % 360 + 360) % 360;
  if (!limpio) return lienzo;
  const cambia = limpio === 90 || limpio === 270;
  const salida = cambia ? crearLienzo(lienzo.height, lienzo.width) : crearLienzo(lienzo.width, lienzo.height);
  const ctx = contexto(salida);
  if (!ctx) return lienzo;
  ctx.translate(salida.width / 2, salida.height / 2);
  ctx.rotate((limpio * Math.PI) / 180);
  ctx.drawImage(lienzo, -lienzo.width / 2, -lienzo.height / 2);
  return salida;
}

function codificarNegro(ancho: number, alto: number): string {
  const lienzo = crearLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ancho, alto);
  }
  return lienzo.toDataURL('image/jpeg', 0.5).split(',')[1] ?? '';
}

/** Baja la calidad hasta caber en el límite del hardware. */
function codificar(lienzo: HTMLCanvasElement): string {
  for (let calidad = CALIDAD_MAXIMA; calidad >= CALIDAD_MINIMA; calidad -= 0.1) {
    let dataUrl: string;
    try {
      dataUrl = lienzo.toDataURL('image/jpeg', calidad);
    } catch {
      return codificarNegro(lienzo.width, lienzo.height);
    }
    const base64 = dataUrl.split(',')[1] ?? '';
    if (base64.length * 0.75 <= LIMITE_JPEG) return base64;
  }
  return codificarNegro(lienzo.width, lienzo.height);
}

function aDataUrlPng(lienzo: HTMLCanvasElement): string {
  try {
    return lienzo.toDataURL('image/png');
  } catch {
    return '';
  }
}

/**
 * Pinta un hueco. `rotacion` manda sobre la del `lcd` (la válvula de seguridad
 * de los modelos sin verificar); si no se pasa, se usa la del modelo.
 * `extras` pinta el centro con el motor DOT (o un velo de destello).
 * Con `datos`, la tecla enseña el widget en vivo (roadmap 82) en vez del
 * icono: el dato manda sobre imagen, marca y glifo, como en la celda.
 */
export async function pintarTecla(
  boton: ButtonConfig | null,
  lcd: LcdControl,
  colores: ColoresSuperficie,
  opciones: OpcionesPintado = {},
  rotacion?: number,
  extras?: ExtrasAnimados,
  datos?: DatosWidget | null,
): Promise<ImagenTecla> {
  await prepararFuentesLcd();
  const { ancho, alto } = lcd;
  const lienzo = crearLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  if (!ctx) return { jpegBase64: codificarNegro(ancho, alto), dataUrl: '' };

  ctx.fillStyle = colorFondo(boton, colores);
  ctx.fillRect(0, 0, ancho, alto);
  if (boton) await pintarContenido(ctx, boton, ancho, alto, colores, opciones, extras, datos);

  const dataUrl = aDataUrlPng(lienzo);
  return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl };
}

/**
 * T-HW-21 (roadmap 85) — el aviso que enseña la tecla de encima al girar una
 * perilla: el valor en grande ~1,2 s. Fondo OLED, fuente de puntos y, si es un
 * porcentaje, una barra de 16 puntos abajo. Devuelve también el PNG sin rotar
 * para que la pantalla de Dispositivos enseñe lo mismo que el aparato.
 */

/** Puntos de la barra del aviso (16, la densidad de la celda). */
const BARRA_PUNTOS = 16;

/** Etiqueta del aviso ("VOL", "SPOTIFY"), en la franja de arriba. */
function dibujarEtiquetaAviso(
  ctx: CanvasRenderingContext2D, etiqueta: string, ancho: number, alto: number, color: string,
): void {
  const limpio = etiqueta.trim().toUpperCase();
  if (!limpio) return;
  const tamano = Math.max(7, Math.round(alto * 0.15));
  ctx.font = `600 ${tamano}px ${fuenteMono()}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(limpio, ancho / 2, alto * 0.08);
}

/** Texto grande en la fuente de puntos, encogido hasta caber. */
function dibujarTextoPuntos(
  ctx: CanvasRenderingContext2D, texto: string, ancho: number, alto: number,
  color: string, centroY: number, tamanoMax: number,
): void {
  const limpio = texto.trim().toUpperCase();
  if (!limpio) return;
  const MINIMO = 8;
  const disponible = ancho - 8;
  let tamano = Math.max(MINIMO, Math.round(tamanoMax));
  ctx.font = `${tamano}px ${fuenteDots()}`;
  while (tamano > MINIMO && ctx.measureText(limpio).width > disponible) {
    tamano -= 1;
    ctx.font = `${tamano}px ${fuenteDots()}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(limpio, ancho / 2, centroY);
}

/** Barra de puntos del porcentaje: llenos en color, vacíos en relieve. */
function dibujarBarraPuntos(
  ctx: CanvasRenderingContext2D, valor: number, ancho: number, alto: number, color: string,
): void {
  const margen = Math.max(3, ancho * 0.08);
  const paso = (ancho - margen * 2) / BARRA_PUNTOS;
  const radio = Math.min(paso * 0.42, alto * 0.05);
  const y = alto - Math.max(6, alto * 0.12);
  const llenos = Math.round((Math.min(100, Math.max(0, valor)) / 100) * BARRA_PUNTOS);
  for (let i = 0; i < BARRA_PUNTOS; i++) {
    ctx.beginPath();
    ctx.arc(margen + paso * i + paso / 2, y, radio, 0, Math.PI * 2);
    ctx.fillStyle = i < llenos ? color : DIM_GLIFO;
    ctx.fill();
  }
}

export async function pintarAvisoTecla(
  aviso: AvisoPerilla,
  lcd: LcdControl,
  colores: ColoresSuperficie,
  rotacion?: number,
): Promise<ImagenTecla> {
  await prepararFuentesLcd();
  const { ancho, alto } = lcd;
  const lienzo = crearLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  if (!ctx) return { jpegBase64: codificarNegro(ancho, alto), dataUrl: '' };

  ctx.fillStyle = colores.fondo;
  ctx.fillRect(0, 0, ancho, alto);
  if (aviso.valor !== undefined) {
    const n = Math.min(100, Math.max(0, Math.round(aviso.valor)));
    dibujarEtiquetaAviso(ctx, aviso.etiqueta ?? '', ancho, alto, colores.texto);
    dibujarTextoPuntos(ctx, `${n}%`, ancho, alto, colores.texto, alto * 0.5, alto * 0.42);
    dibujarBarraPuntos(ctx, n, ancho, alto, colores.texto);
  } else {
    dibujarTextoPuntos(ctx, textoDeAviso(aviso), ancho, alto, colores.texto, alto * 0.5, alto * 0.62);
  }

  const dataUrl = aDataUrlPng(lienzo);
  return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl };
}

/**
 * Pinta un hueco con un fotograma ya decodificado en lugar de la imagen
 * estática: fondo, trama de puntos, rótulo y giro, exactamente como
 * `pintarTecla` con `imageData`. Lo usa el animador de GIF (la hoja de
 * fotogramas llega como `CuadroLcd`) sin volver a leer la imagen de disco.
 */
export async function pintarTeclaConCuadro(
  boton: ButtonConfig | null,
  lcd: LcdControl,
  colores: ColoresSuperficie,
  cuadro: CuadroLcd,
  opciones: OpcionesPintado = {},
  rotacion?: number,
): Promise<ImagenTecla> {
  await prepararFuentesLcd();
  const { ancho, alto } = lcd;
  const lienzo = crearLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  if (!ctx) return { jpegBase64: codificarNegro(ancho, alto), dataUrl: '' };

  ctx.fillStyle = colorFondo(boton, colores);
  ctx.fillRect(0, 0, ancho, alto);
  if (boton?.subButtons?.length === 4) {
    // Un mosaico no lleva la imagen de fondo: manda la rejilla, como en la celda.
    await dibujarSubdivisionLcd(ctx, boton, ancho, alto, colorTexto(boton, colores), utilesSubdivision(opciones));
    return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl: '' };
  }
  dibujarConTrama(ctx, cuadro, ancho, alto);
  if (boton) {
    if (boton.brandIcon && (boton.iconoPuntos?.bits || boton.icon)) {
      const centroY = (boton.label || boton.sublabel) ? alto * 0.42 : alto * 0.5;
      await dibujarSuperpuesto(ctx, boton, ancho, alto, centroY, opciones);
    }
    // Un GIF es siempre fondo: el rótulo va sobre él, con el mismo degradado.
    dibujarEtiqueta(ctx, boton.label ?? '', boton.sublabel ?? '', ancho, alto, colorTexto(boton, colores), true);
  }
  return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl: '' };
}
