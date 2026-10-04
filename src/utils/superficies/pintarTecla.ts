import type { ButtonConfig, ModeloSuperficie } from '../../types';
import { DISPOSICIONES } from './disposicion';

/**
 * Convierte el botón de un hueco en el JPEG que espera la tecla LCD.
 *
 * Corre en el renderer (usa canvas) y por eso no puede mirar el tema: los
 * colores entran por parámetro. El tamaño y la rotación salen de
 * `DISPOSICIONES` — en el N3, 64×64 y 90° en sentido horario (medido con el
 * hardware real, no el 270 de Bitfocus).
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
 * La tecla LCD es una pantalla física oscura: se pinta siempre con la paleta
 * OLED (`VD_DOT480`), sea cual sea el tema de la app. El gris cemento del modo
 * claro, en un LCD retroiluminado, se ve lavado.
 */
export const COLORES_LCD: ColoresSuperficie = { fondo: '#111315', texto: '#e6e8eb' };

const LIMITE_JPEG = 10240;
const CALIDAD_MAXIMA = 0.9;
const CALIDAD_MINIMA = 0.1;

function crearLienzo(lado: number): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = lado;
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

function dibujarImagen(ctx: CanvasRenderingContext2D, imagen: HTMLImageElement, lado: number): void {
  const escala = Math.max(lado / imagen.width, lado / imagen.height);
  const ancho = imagen.width * escala;
  const alto = imagen.height * escala;
  ctx.drawImage(imagen, (lado - ancho) / 2, (lado - alto) / 2, ancho, alto);
}

/** Glifo dibujado a mano: 7 filas, 5 bits por fila (bit 4 = izquierda). */
function dibujarGlifo57(ctx: CanvasRenderingContext2D, filas: number[], lado: number, color: string): void {
  const ancho = lado * 0.5;
  const paso = ancho / 5;
  const x0 = (lado - ancho) / 2;
  const y0 = lado * 0.5 - (paso * 7) / 2;
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

/** Icono de texto corto (≤3 caracteres) centrado; lo demás se omite. */
function dibujarIcono(ctx: CanvasRenderingContext2D, boton: ButtonConfig, lado: number, color: string): void {
  if (boton.customGlyph57?.length === 7) {
    dibujarGlifo57(ctx, boton.customGlyph57, lado, color);
    return;
  }
  const texto = (boton.icon ?? '').trim();
  if (!texto || texto.length > 3) return;
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(lado * 0.34)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, lado / 2, boton.label ? lado * 0.38 : lado * 0.5);
}

/** Etiqueta abajo, en hasta dos líneas, con recorte por ancho. */
function dibujarEtiqueta(ctx: CanvasRenderingContext2D, texto: string, lado: number, color: string): void {
  const limpio = texto.trim();
  if (!limpio) return;
  const tamano = Math.max(7, Math.round(lado * 0.16));
  ctx.fillStyle = color;
  ctx.font = `${tamano}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const palabras = limpio.split(/\s+/);
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const intento = actual ? `${actual} ${palabra}` : palabra;
    if (actual && ctx.measureText(intento).width > lado - 4) {
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
  while (ultima.length > 1 && ctx.measureText(`${ultima}…`).width > lado - 4) {
    ultima = ultima.slice(0, -1);
  }
  if (ultima !== lineas[lineas.length - 1]) lineas[lineas.length - 1] = `${ultima}…`;

  const alto = tamano * 1.15;
  const base = lado - 3 - (lineas.length - 1) * alto;
  lineas.forEach((linea, indice) => ctx.fillText(linea, lado / 2, base + indice * alto));
}

async function pintarContenido(
  ctx: CanvasRenderingContext2D,
  boton: ButtonConfig,
  lado: number,
  colores: ColoresSuperficie,
): Promise<void> {
  const color = colorTexto(boton, colores);
  if (boton.imageData) {
    const imagen = await cargarImagen(boton.imageData);
    if (imagen) dibujarImagen(ctx, imagen, lado);
  } else {
    dibujarIcono(ctx, boton, lado, color);
  }
  dibujarEtiqueta(ctx, boton.label ?? '', lado, color);
}

/** Rota el lienzo en sentido horario. En el N3, 90°. */
function rotar(lienzo: HTMLCanvasElement, grados: number): HTMLCanvasElement {
  if (!grados) return lienzo;
  const lado = lienzo.width;
  const salida = crearLienzo(lado);
  const ctx = contexto(salida);
  if (!ctx) return lienzo;
  ctx.translate(lado / 2, lado / 2);
  ctx.rotate((grados * Math.PI) / 180);
  ctx.drawImage(lienzo, -lado / 2, -lado / 2);
  return salida;
}

function codificarNegro(lado: number): string {
  const lienzo = crearLienzo(lado);
  const ctx = contexto(lienzo);
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, lado, lado);
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
      return codificarNegro(lienzo.width);
    }
    const base64 = dataUrl.split(',')[1] ?? '';
    if (base64.length * 0.75 <= LIMITE_JPEG) return base64;
  }
  return codificarNegro(lienzo.width);
}

export async function pintarTecla(
  boton: ButtonConfig | null,
  modelo: ModeloSuperficie,
  colores: ColoresSuperficie,
): Promise<string> {
  const { ladoTecla, rotacion } = DISPOSICIONES[modelo];
  const lienzo = crearLienzo(ladoTecla);
  const ctx = contexto(lienzo);
  if (!ctx) return codificarNegro(ladoTecla);

  ctx.fillStyle = colorFondo(boton, colores);
  ctx.fillRect(0, 0, ladoTecla, ladoTecla);
  if (boton) await pintarContenido(ctx, boton, ladoTecla, colores);

  return codificar(rotar(lienzo, rotacion));
}
