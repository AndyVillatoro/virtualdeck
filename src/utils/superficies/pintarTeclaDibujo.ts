import type { ButtonConfig } from '../../types';
import { esFondoClaro } from '../../comun/contraste';

/**
 * Rutinas puras de canvas y dibujo para las teclas LCD de superficies físicas.
 * Extraído de `pintarTecla.ts` para cumplir el límite de tamaño y complejidad.
 */

export interface CuadroLcd {
  fuente: CanvasImageSource;
  sx: number;
  sy: number;
  ancho: number;
  alto: number;
}

export interface ExtrasAnimados {
  matriz?: boolean[][];
  intensidades?: number[][];
  destello?: number;
}

const LIMITE_JPEG = 10240;
const CALIDAD_MAXIMA = 0.9;
const CALIDAD_MINIMA = 0.1;

const FAMILIA_MONO = 'JetBrains Mono';
const FAMILIA_DOTS = 'DotGothic16';
const FUENTE_MONO = `"${FAMILIA_MONO}", ui-monospace, monospace`;
const FUENTE_DOTS = `"${FAMILIA_DOTS}", monospace`;
const TOPE_FUENTES_MS = 1200;

export const DIM_GLIFO = 'rgba(230, 232, 235, 0.10)';
export const CAJA_CENTRO = 0.62;
const TRAMA_DIVISIONES = 16;
const TRAMA_RADIO = 0.35;
const TRAMA_FONDO = '#070809';

const ETIQUETA_ALTO = 0.2;
const ETIQUETA_ALTO_DOBLE = 0.34;
const ETIQUETA_VELO = 0.35;
const ETIQUETA_DEGRADADO = 0.78;
const SUBLABEL_ALFA = 0.55;
const SUBLABEL_SOBRE_IMAGEN = 'rgba(255, 255, 255, 0.70)';
const BARRA_PUNTOS = 16;

let promesaFuentes: Promise<void> | null = null;

export function prepararFuentesLcd(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const fonts = document.fonts;
  if (!fonts?.load) return Promise.resolve();
  if (fuentesLcdListas()) return Promise.resolve();
  if (promesaFuentes) return promesaFuentes;

  promesaFuentes = Promise.race([
    Promise.all([
      fonts.load(`600 12px "${FAMILIA_MONO}"`),
      fonts.load(`12px "${FAMILIA_DOTS}"`),
    ]).then(() => undefined),
    new Promise<void>((resolve) => {
      setTimeout(resolve, TOPE_FUENTES_MS);
    }),
  ]).catch(() => undefined);

  return promesaFuentes;
}

function fuenteDisponible(especificacion: string): boolean {
  if (typeof document === 'undefined') return false;
  const fonts = document.fonts;
  if (!fonts?.check) return false;
  try {
    return fonts.check(especificacion);
  } catch {
    return false;
  }
}

export function fuentesLcdListas(): boolean {
  return fuenteDisponible(`600 12px "${FAMILIA_MONO}"`) && fuenteDisponible(`12px "${FAMILIA_DOTS}"`);
}

export function fuenteMono(): string {
  return fuentesLcdListas() ? FUENTE_MONO : 'ui-monospace, monospace';
}

export function fuenteDots(): string {
  return fuentesLcdListas() ? FUENTE_DOTS : FUENTE_MONO;
}

export function crearLienzo(ancho: number, alto: number): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.round(ancho));
  lienzo.height = Math.max(1, Math.round(alto));
  return lienzo;
}

export function contexto(lienzo: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return lienzo.getContext('2d');
}

export function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const imagen = new Image();
    imagen.crossOrigin = 'anonymous';
    imagen.onload = () => resolve(imagen);
    imagen.onerror = () => resolve(null);
    imagen.src = src;
  });
}

export async function dibujarSvg(
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

export function dibujarConTrama(
  ctx: CanvasRenderingContext2D, cuadro: CuadroLcd, ancho: number, alto: number,
): void {
  const capa = crearLienzo(ancho, alto);
  const ctxCapa = contexto(capa);
  if (!ctxCapa) return;
  const escala = Math.max(ancho / cuadro.ancho, alto / cuadro.alto);
  const w = cuadro.ancho * escala;
  const h = cuadro.alto * escala;
  ctxCapa.drawImage(
    cuadro.fuente, cuadro.sx, cuadro.sy, cuadro.ancho, cuadro.alto,
    (ancho - w) / 2, (alto - h) / 2, w, h,
  );

  const paso = Math.max(3, ancho / TRAMA_DIVISIONES);
  const radio = paso * TRAMA_RADIO;
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

export async function dibujarImagenConTrama(
  ctx: CanvasRenderingContext2D, src: string, ancho: number, alto: number,
): Promise<boolean> {
  const imagen = await cargarImagen(src);
  if (!imagen) return false;
  dibujarConTrama(ctx, { fuente: imagen, sx: 0, sy: 0, ancho: imagen.width, alto: imagen.height }, ancho, alto);
  return true;
}

export async function dibujarMarca(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number, centroY: number,
): Promise<boolean> {
  if (!boton.brandIcon) return false;
  try {
    const { resolverMarca, svgDeMarca } = await import('../../comun/marcaSvg');
    const marca = resolverMarca(boton);
    if (!marca) return false;
    return await dibujarSvg(ctx, svgDeMarca(marca), ancho, alto, Math.min(ancho, alto) * CAJA_CENTRO, centroY);
  } catch {
    return false;
  }
}

export function dibujarGlifo57(
  ctx: CanvasRenderingContext2D, filas: number[], ancho: number, alto: number, color: string, centroY: number,
): void {
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

export function dibujarMatrizAnimada(
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

export function dibujarTextoCentrado(
  ctx: CanvasRenderingContext2D, texto: string, ancho: number, alto: number, color: string, centroY: number,
): void {
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

function recortarTexto(ctx: CanvasRenderingContext2D, texto: string, maximo: number): string {
  let visible = texto;
  while (visible.length > 1 && ctx.measureText(`${visible}…`).width > maximo) {
    visible = visible.slice(0, -1);
  }
  return visible === texto ? texto : `${visible}…`;
}

export function altoFranjaRotulo(conSub: boolean, alto: number): number {
  return Math.max(conSub ? 16 : 12, Math.round(alto * (conSub ? ETIQUETA_ALTO_DOBLE : ETIQUETA_ALTO)));
}

export function dibujarEtiqueta(
  ctx: CanvasRenderingContext2D, texto: string, subtexto: string, ancho: number, alto: number,
  color: string, sobreFondo: boolean, fondoPropio?: string,
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
  } else if (fondoPropio && esFondoClaro(fondoPropio)) {
    ctx.fillStyle = `rgba(255, 255, 255, ${ETIQUETA_VELO})`;
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

export function dibujarDestello(
  ctx: CanvasRenderingContext2D, ancho: number, alto: number, extras?: ExtrasAnimados,
): void {
  if (!extras?.destello) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${extras.destello > 1 ? 1 : extras.destello})`;
  ctx.fillRect(0, 0, ancho, alto);
}

export function dibujarEtiquetaAviso(
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

export function dibujarTextoPuntos(
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

export function dibujarBarraPuntos(
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

export function rotar(lienzo: HTMLCanvasElement, grados: number): HTMLCanvasElement {
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

export function codificarNegro(ancho: number, alto: number): string {
  const lienzo = crearLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, ancho, alto);
  }
  return lienzo.toDataURL('image/jpeg', 0.5).split(',')[1] ?? '';
}

export function codificar(lienzo: HTMLCanvasElement): string {
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

export function aDataUrlPng(lienzo: HTMLCanvasElement): string {
  try {
    return lienzo.toDataURL('image/png');
  } catch {
    return '';
  }
}
