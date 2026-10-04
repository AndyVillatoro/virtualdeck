import type { ButtonConfig, LcdControl } from '../../types';

/**
 * Convierte el botón de un hueco en el JPEG que espera la tecla LCD.
 *
 * Corre en el renderer (usa canvas) y por eso no puede mirar el tema: los
 * colores entran por parámetro. El tamaño y el giro salen del `lcd` del
 * contrato (`DisposicionSuperficie`), y la rotación efectiva la decide quien
 * llama (la de la página si existe).
 *
 * Reproduce la precedencia de `celda/ContenidoCentral`: imagen o icono de
 * marca (+ glifo encima si lo hay) → glifo 5×7 propio → glifo DOT 8×8 →
 * texto corto en DotGothic16 → texto largo → icono SVG del tipo de acción.
 * Los glifos DOT y el icono de acción llegan **inyectados**
 * (`opciones.iconoSvg`): viven en `components/` y esta capa no puede
 * importarlos. Los iconos de marca se cargan del catálogo con el mismo
 * `import()` diferido que usa la interfaz.
 *
 * Un hueco vacío es negro. El JPEG se baja de calidad hasta caber en 10240
 * bytes, el límite del búfer del microcontrolador.
 */

export interface ColoresSuperficie {
  /** Fondo de un hueco con botón sin `bgColor` propio. */
  fondo: string;
  /** Color de texto/icono si el botón no trae `fgColor`. */
  texto: string;
}

/**
 * Paleta OLED fija de las teclas LCD: no depende del tema de la aplicación
 * (una tecla física no tiene modo claro). La usa `App` al llamar al hook.
 */
export const COLORES_LCD: ColoresSuperficie = {
  fondo: '#070809',
  texto: '#e6e8eb',
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
const ETIQUETA_VELO = 0.35;
const ETIQUETA_DEGRADADO = 0.75;

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
function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const imagen = new Image();
    imagen.crossOrigin = 'anonymous';
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => resolve(null);
    imagen.src = src;
  });
}

function cubrir(imagen: HTMLImageElement, ancho: number, alto: number): [number, number, number, number] {
  const escala = Math.max(ancho / imagen.width, alto / imagen.height);
  const w = imagen.width * escala;
  const h = imagen.height * escala;
  return [(ancho - w) / 2, (alto - h) / 2, w, h];
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
async function dibujarImagenConTrama(
  ctx: CanvasRenderingContext2D, src: string, ancho: number, alto: number,
): Promise<boolean> {
  const imagen = await cargarImagen(src);
  if (!imagen) return false;
  const capa = crearLienzo(ancho, alto);
  const ctxCapa = contexto(capa);
  if (!ctxCapa) return false;
  ctxCapa.drawImage(imagen, ...cubrir(imagen, ancho, alto));

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
 * El centro cuando no hay fondo: glifo 5×7 → glifo DOT/icono inyectado →
 * texto. La precedencia es la de `ContenidoCentral`.
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

/** Glifo encima de una marca: como en la celda, solo si hay marca e icono. */
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

/**
 * La franja con el nombre, como `RotuloCelda`: JetBrains Mono 600, mayúsculas
 * y velo oscuro abajo (degradado si hay imagen o marca).
 */
function dibujarEtiqueta(
  ctx: CanvasRenderingContext2D, texto: string, ancho: number, alto: number,
  color: string, sobreFondo: boolean,
): void {
  const limpio = texto.trim().toUpperCase();
  if (!limpio) return;
  const altoFranja = Math.max(12, Math.round(alto * ETIQUETA_ALTO));
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

  const tamano = Math.max(7, Math.round(alto * 0.14));
  ctx.font = `600 ${tamano}px ${fuenteMono()}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = sobreFondo ? '#fff' : color;
  if (sobreFondo) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
  }
  let visible = limpio;
  while (visible.length > 1 && ctx.measureText(`${visible}…`).width > ancho - 4) {
    visible = visible.slice(0, -1);
  }
  if (visible !== limpio) visible = `${visible}…`;
  ctx.fillText(visible, ancho / 2, alto - Math.max(3, Math.round(alto * 0.05)));
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

async function pintarContenido(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  colores: ColoresSuperficie, opciones: OpcionesPintado,
): Promise<void> {
  const color = colorTexto(boton, colores);
  const sobreFondo = !!(boton.imageData || boton.brandIcon);
  const centroY = boton.label ? alto * 0.42 : alto * 0.5;

  let fondoPintado = false;
  if (boton.imageData) fondoPintado = await dibujarImagenConTrama(ctx, boton.imageData, ancho, alto);
  else if (boton.brandIcon) fondoPintado = await dibujarMarca(ctx, boton, ancho, alto, centroY);

  if (fondoPintado) {
    if (boton.brandIcon && boton.icon) await dibujarSuperpuesto(ctx, boton, ancho, alto, centroY, opciones);
  } else {
    await dibujarCentro(ctx, boton, ancho, alto, color, centroY, opciones);
  }
  dibujarEtiqueta(ctx, boton.label ?? '', ancho, alto, color, sobreFondo);
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
 */
export async function pintarTecla(
  boton: ButtonConfig | null,
  lcd: LcdControl,
  colores: ColoresSuperficie,
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
  if (boton) await pintarContenido(ctx, boton, ancho, alto, colores, opciones);

  const dataUrl = aDataUrlPng(lienzo);
  return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl };
}
