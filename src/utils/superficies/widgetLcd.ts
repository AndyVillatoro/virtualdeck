import type { ButtonConfig } from '../../types';
import type { DatosWidget } from '../../comun/widgets';

/**
 * El dato vivo de un widget en la tecla LCD de un dock.
 *
 * La celda de la pantalla enseña el widget en el centro (glifo DOT arriba,
 * valor grande y segunda línea atenuada); la tecla física hacía lo mismo que un
 * botón sin widget: icono y etiqueta. Aquí se reproduce esa composición en el
 * canvas del LCD, con la paleta OLED fija de la tecla y el color de aviso o
 * crítico que usa la celda.
 *
 * El glifo entra **inyectado** (`recursos.iconoSvg` + `recursos.dibujarSvg`):
 * se resuelve con el mismo SVG del resto de la tecla (`components/celda`), y
 * `src/utils` no puede importar componentes. `pintarTecla` los aporta.
 *
 * Sin dato (`null`) esto no se llama: la tecla se pinta como siempre.
 */

export interface RecursosWidgetLcd {
  /** Fuente monoespaciada real de la tecla (JetBrains Mono si cargó). */
  fuenteMono: () => string;
  /** Relieve de los puntos apagados del glifo, como el resto del LCD. */
  dim: string;
  /**
   * SVG del centro inyectado por la capa de componentes. El glifo del dato se
   * resuelve con un botón sintético (`icon` = glifo DOT), el mismo camino que
   * el resto de la tecla.
   */
  iconoSvg?: (boton: ButtonConfig, color: string, dimColor?: string, sobreFondo?: boolean) => string | null;
  /** Rasteriza un SVG en el canvas; lo aporta `pintarTecla`. */
  dibujarSvg?: (
    ctx: CanvasRenderingContext2D, svg: string, ancho: number, alto: number,
    caja: number, centroY: number,
  ) => Promise<boolean>;
}

export interface ColoresWidgetLcd {
  /** Color base de `line1` y del glifo cuando el dato no trae `tone`. */
  texto: string;
  /** Amarillo de aviso y rojo crítico, como la celda del deck. */
  aviso: string;
  critico: string;
  /** Color de `line2`: la misma tinta, atenuada al pintar. */
  tenue: string;
}

/**
 * La parte de la firma de una tecla que depende del widget. Si cambia
 * `line1`, `line2`, `tone` o `glyph`, la tecla se repinta; si el sondeo
 * devuelve lo mismo, no.
 */
export function firmaWidget(datos?: DatosWidget | null): string {
  return JSON.stringify([
    datos?.line1 ?? null, datos?.line2 ?? null, datos?.tone ?? null, datos?.glyph ?? null,
  ]);
}

/**
 * Cuántos caracteres caben en `anchoDisponible` con la monoespaciada:
 * el avance de JetBrains Mono es ~0.6 em. Se usa para recortar, nunca para
 * encoger la fuente.
 */
function maximoCaracteres(anchoDisponible: number, tamano: number): number {
  return Math.max(1, Math.floor(anchoDisponible / (tamano * 0.6)));
}

/** Recorta con puntos suspensivos hasta el máximo de caracteres. */
export function recortarLinea(texto: string, maximo: number): string {
  const limpio = texto.trim();
  if (limpio.length <= maximo) return limpio;
  if (maximo <= 1) return '…';
  return `${limpio.slice(0, maximo - 1).trimEnd()}…`;
}

/** Una línea centrada, recortada si no cabe; no encoge la fuente. */
function dibujarLinea(
  ctx: CanvasRenderingContext2D, texto: string, ancho: number, y: number,
  tamano: number, color: string, fuente: string, alfa: number,
): void {
  const visible = recortarLinea(texto, maximoCaracteres(ancho - 4, tamano));
  if (!visible) return;
  ctx.save();
  ctx.font = `600 ${tamano}px ${fuente}`;
  ctx.fillStyle = color;
  ctx.globalAlpha = alfa;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(visible, ancho / 2, y);
  ctx.restore();
}

/** El glifo DOT del dato, con el mismo SVG inyectado del resto de la tecla. */
function dibujarGlifo(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, glyph: string, color: string,
  caja: number, centroY: number, recursos: RecursosWidgetLcd,
): Promise<boolean> {
  const sintetico: ButtonConfig = {
    ...boton, icon: glyph, iconoPuntos: undefined, customGlyph57: undefined,
    imageData: undefined, brandIcon: undefined,
  };
  const svg = recursos.iconoSvg?.(sintetico, color, recursos.dim, false);
  if (!svg || !recursos.dibujarSvg) return Promise.resolve(false);
  return recursos.dibujarSvg(ctx, svg, ctx.canvas.width, ctx.canvas.height, caja, centroY);
}

/**
 * Pinta el dato del widget en la zona de contenido de la tecla (el alto de la
 * franja de la etiqueta lo descuenta `pintarTecla`). Glifo arriba si lo hay;
 * `line1` grande debajo y `line2` más pequeña y atenuada al final.
 */
export async function pintarWidgetLcd(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, datos: DatosWidget, ancho: number, alto: number,
  colores: ColoresWidgetLcd, recursos: RecursosWidgetLcd,
): Promise<void> {
  const color = datos.tone === 'crit' ? colores.critico
    : datos.tone === 'warn' ? colores.aviso
    : colores.texto;
  const conGlifo = !!datos.glyph && !!recursos.iconoSvg && !!recursos.dibujarSvg;
  if (conGlifo) {
    const caja = Math.min(ancho, alto) * 0.26;
    await dibujarGlifo(ctx, boton, datos.glyph!, color, caja, alto * 0.17, recursos);
  }
  const fuente = recursos.fuenteMono();
  const tam1 = Math.max(9, Math.round(alto * (conGlifo ? 0.3 : 0.34)));
  const y1 = conGlifo ? alto * 0.62 : alto * 0.42;
  dibujarLinea(ctx, datos.line1, ancho, y1, tam1, color, fuente, 1);
  if (!datos.line2) return;
  const tam2 = Math.max(7, Math.round(alto * 0.16));
  const y2 = Math.min(y1 + tam1 * (conGlifo ? 0.62 : 0.55), alto - tam2 / 2 - 1);
  dibujarLinea(ctx, datos.line2, ancho, y2, tam2, colores.tenue, fuente, 0.6);
}
