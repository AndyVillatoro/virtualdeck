import type { ButtonConfig, LcdControl } from '../../types';

/**
 * Convierte el botón de un hueco en el JPEG que espera la tecla LCD.
 *
 * Corre en el renderer (usa canvas) y por eso no puede mirar el tema: los
 * colores entran por parámetro. El tamaño y el giro salen del `lcd` del
 * contrato (`DisposicionSuperficie`), y la rotación efectiva la decide quien
 * llama (la de la página si existe).
 *
 * Los iconos de acción llegan **inyectados** (`opciones.iconoSvg`): viven en
 * `components/` y esta capa no puede importarlos. Los de marca se cargan del
 * catálogo con el mismo `import()` diferido que usa la interfaz.
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
  /** SVG del icono del tipo de acción; lo pasa la capa de componentes. */
  iconoSvg?: (boton: ButtonConfig, color: string) => string | null;
}

const LIMITE_JPEG = 10240;
const CALIDAD_MAXIMA = 0.9;
const CALIDAD_MINIMA = 0.1;

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

function colorTexto(boton: ButtonConfig | null, colores: ColoresSuperficie): string {
  if (!boton) return colores.texto;
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

/** Dibuja una imagen cubriendo el hueco (recorte centrado). */
async function dibujarImagen(ctx: CanvasRenderingContext2D, src: string, ancho: number, alto: number): Promise<void> {
  const imagen = await cargarImagen(src);
  if (!imagen) return;
  const escala = Math.max(ancho / imagen.width, alto / imagen.height);
  const w = imagen.width * escala;
  const h = imagen.height * escala;
  ctx.drawImage(imagen, (ancho - w) / 2, (alto - h) / 2, w, h);
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
    return await dibujarSvg(ctx, generateSvgFromBitmap(bitmap, color, palette), ancho, alto, Math.min(ancho, alto) * 0.72, centroY);
  } catch {
    return false;
  }
}

/** Glifo dibujado a mano: 7 filas, 5 bits por fila (bit 4 = izquierda). */
function dibujarGlifo57(ctx: CanvasRenderingContext2D, filas: number[], ancho: number, alto: number, color: string, centroY: number): void {
  const caja = Math.min(ancho, alto) * 0.5;
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

/** Icono de texto corto (≤3 caracteres) centrado. */
function dibujarTextoIcono(ctx: CanvasRenderingContext2D, texto: string, ancho: number, alto: number, color: string, centroY: number): void {
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(Math.min(ancho, alto) * 0.34)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, ancho / 2, centroY);
}

/** Lo que va en el centro: glifo propio, texto corto o el icono inyectado. */
async function dibujarIcono(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  color: string, centroY: number, opciones: OpcionesPintado,
): Promise<void> {
  if (boton.customGlyph57?.length === 7) {
    dibujarGlifo57(ctx, boton.customGlyph57, ancho, alto, color, centroY);
    return;
  }
  const texto = (boton.icon ?? '').trim();
  if (texto && texto.length <= 3) {
    dibujarTextoIcono(ctx, texto, ancho, alto, color, centroY);
    return;
  }
  const svg = opciones.iconoSvg?.(boton, color);
  if (svg) await dibujarSvg(ctx, svg, ancho, alto, Math.min(ancho, alto) * 0.6, centroY);
}

/** Etiqueta abajo, en hasta dos líneas, con recorte por ancho. */
function dibujarEtiqueta(ctx: CanvasRenderingContext2D, texto: string, ancho: number, alto: number, color: string): void {
  const limpio = texto.trim();
  if (!limpio) return;
  const tamano = Math.max(7, Math.round(alto * 0.16));
  ctx.fillStyle = color;
  ctx.font = `${tamano}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const palabras = limpio.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(intento).width > ancho - 4) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = intento;
    }
    if (lineas.length === 2) break;
  }
  if (lineas.length < 2 && actual) lineas.push(actual);
  if (lineas.length === 0) return;

  let ultima = lineas[lineas.length - 1];
  while (ultima.length > 1 && ctx.measureText(`${ultima}…`).width > ancho - 4) {
    ultima = ultima.slice(0, -1);
  }
  if (ultima !== lineas[lineas.length - 1]) lineas[lineas.length - 1] = `${ultima}…`;

  const altoLinea = tamano * 1.15;
  const base = alto - 3 - (lineas.length - 1) * altoLinea;
  lineas.forEach((linea, indice) => ctx.fillText(linea, ancho / 2, base + indice * altoLinea));
}

async function pintarContenido(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  colores: ColoresSuperficie, opciones: OpcionesPintado,
): Promise<void> {
  const color = colorTexto(boton, colores);
  const centroY = boton.label ? alto * 0.4 : alto * 0.5;
  if (boton.imageData) {
    await dibujarImagen(ctx, boton.imageData, ancho, alto);
  } else if (!(await dibujarMarca(ctx, boton, ancho, alto, centroY))) {
    await dibujarIcono(ctx, boton, ancho, alto, color, centroY, opciones);
  }
  dibujarEtiqueta(ctx, boton.label ?? '', ancho, alto, color);
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
): Promise<string> {
  const { ancho, alto } = lcd;
  const lienzo = crearLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  if (!ctx) return codificarNegro(ancho, alto);

  ctx.fillStyle = colorFondo(boton, colores);
  ctx.fillRect(0, 0, ancho, alto);
  if (boton) await pintarContenido(ctx, boton, ancho, alto, colores, opciones);

  return codificar(rotar(lienzo, rotacion ?? lcd.rotacion));
}
