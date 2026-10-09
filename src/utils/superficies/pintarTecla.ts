import type { ButtonConfig, LcdControl } from '../../types';
import type { DatosWidget } from '../../comun/widgets';
import { textoSobre } from '../../comun/contraste';
import { textoDeAviso, type AvisoPerilla } from './avisoPerilla';
import { dibujarSubdivisionLcd, type UtilesSubdivision } from './subdivisionLcd';
import { pintarWidgetLcd } from './widgetLcd';
import {
  prepararFuentesLcd,
  fuentesLcdListas,
  fuenteMono,
  fuenteDots,
  crearLienzo,
  contexto,
  cargarImagen,
  rotar,
  codificarNegro,
  codificar,
  aDataUrlPng,
  dibujarSvg,
  dibujarConTrama,
  dibujarImagenConTrama,
  dibujarMarca,
  dibujarGlifo57,
  dibujarMatrizAnimada,
  dibujarTextoCentrado,
  altoFranjaRotulo,
  dibujarEtiqueta,
  dibujarDestello,
  dibujarEtiquetaAviso,
  dibujarTextoPuntos,
  dibujarBarraPuntos,
  CAJA_CENTRO,
  DIM_GLIFO,
  type CuadroLcd,
  type ExtrasAnimados,
} from './pintarTeclaDibujo';

export { prepararFuentesLcd, fuentesLcdListas, type CuadroLcd, type ExtrasAnimados };

/**
 * Convierte el botón de un hueco en el JPEG que espera la tecla LCD.
 *
 * Corre en el renderer (usa canvas) y por eso no puede mirar el tema: los
 * colores entran por parámetro. El tamaño y el giro salen del `lcd` del
 * contrato (`DisposicionSuperficie`), y la rotación efectiva la decide quien
 * llama (la de la página si existe).
 */

export interface ColoresSuperficie {
  fondo: string;
  texto: string;
  aviso: string;
  critico: string;
}

export const COLORES_LCD: ColoresSuperficie = {
  fondo: '#070809',
  texto: '#e6e8eb',
  aviso: '#d4a234',
  critico: '#d95f5f',
};

export interface OpcionesPintado {
  iconoSvg?: (boton: ButtonConfig, color: string, dimColor?: string, sobreFondo?: boolean) => string | null;
  esGlifoDot?: (boton: ButtonConfig) => boolean;
}

export interface ImagenTecla {
  jpegBase64: string;
  dataUrl: string;
}

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

function colorFondo(boton: ButtonConfig | null, colores: ColoresSuperficie): string {
  if (!boton) return colores.fondo;
  if (boton.bgColor) return boton.bgColor;
  return colores.fondo;
}

function estaVacio(boton: ButtonConfig): boolean {
  if (boton.label?.trim() || boton.sublabel?.trim()) return false;
  if (boton.icon?.trim() || boton.imageData || boton.brandIcon) return false;
  if (boton.customGlyph57?.length === 7) return false;
  if (boton.iconoPuntos?.bits?.length) return false;
  if (boton.subButtons?.length === 4) return false;
  return true;
}

const TEXTO_APAGADO = '#555a64';

function colorTexto(boton: ButtonConfig | null, colores: ColoresSuperficie): string {
  if (!boton) return colores.texto;
  if (estaVacio(boton)) return TEXTO_APAGADO;
  if (boton.fgColor) return boton.fgColor;
  if (boton.bgColor) return textoSobre(boton.bgColor);
  return colores.texto;
}

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

function tieneFondo(boton: ButtonConfig): boolean {
  return !!(boton.imageData || boton.brandIcon);
}

function tieneRotulo(boton: ButtonConfig): boolean {
  return !!(boton.label || boton.sublabel);
}

function marcaConIcono(boton: ButtonConfig): boolean {
  return !!boton.brandIcon && !!(boton.iconoPuntos?.bits || boton.icon);
}

async function pintarCuerpoCelda(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  colores: ColoresSuperficie, opciones: OpcionesPintado, extras?: ExtrasAnimados,
  datos?: DatosWidget | null,
): Promise<void> {
  const color = colorTexto(boton, colores);
  const sobreFondo = tieneFondo(boton);
  const centroY = tieneRotulo(boton) ? alto * 0.42 : alto * 0.5;

  if (datos) {
    const zona = alto - (tieneRotulo(boton) ? altoFranjaRotulo(!!boton.sublabel, alto) : 0);
    await pintarWidgetLcd(ctx, boton, datos, ancho, zona,
      { texto: color, aviso: colores.aviso, critico: colores.critico, tenue: colores.texto },
      { fuenteMono, dim: DIM_GLIFO, iconoSvg: opciones.iconoSvg, dibujarSvg });
    dibujarEtiqueta(ctx, boton.label ?? '', boton.sublabel ?? '', ancho, alto, color, false, boton.bgColor);
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
  dibujarEtiqueta(ctx, boton.label ?? '', boton.sublabel ?? '', ancho, alto, color, sobreFondo, boton.bgColor);
  dibujarDestello(ctx, ancho, alto, extras);
}

function utilesSubdivision(opciones: OpcionesPintado): UtilesSubdivision {
  return { cargarImagen, fuenteMono, fuenteDots, dim: DIM_GLIFO, iconoSvg: opciones.iconoSvg };
}

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
    await dibujarSubdivisionLcd(ctx, boton, ancho, alto, colorTexto(boton, colores), utilesSubdivision(opciones));
    return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl: '' };
  }
  dibujarConTrama(ctx, cuadro, ancho, alto);
  if (boton) {
    if (boton.brandIcon && (boton.iconoPuntos?.bits || boton.icon)) {
      const centroY = (boton.label || boton.sublabel) ? alto * 0.42 : alto * 0.5;
      await dibujarSuperpuesto(ctx, boton, ancho, alto, centroY, opciones);
    }
    dibujarEtiqueta(ctx, boton.label ?? '', boton.sublabel ?? '', ancho, alto, colorTexto(boton, colores), true);
  }
  return { jpegBase64: codificar(rotar(lienzo, rotacion ?? lcd.rotacion)), dataUrl: '' };
}
