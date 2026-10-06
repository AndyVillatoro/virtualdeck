import type { ButtonConfig } from '../../types';

/**
 * El mosaico 2×2 en una tecla LCD (roadmap 82).
 *
 * Es la versión reducida de `components/celda/Subdivision2x2`: cuatro
 * cuadrantes con su color, su glifo y su etiqueta. La fuente de datos es la
 * misma —`dotGlyph || icon` para el glifo, colores propios del sub-botón y
 * `#111315` cuando no hay `bgColor`—, y la sub-etiqueta de los cuadrantes se
 * omite porque no cabe en 64 px.
 *
 * Vive aparte de `pintarTecla` por tamaño (`max-lines`): los recursos de
 * dibujo —cargar imágenes, las fuentes reales y el color de los puntos
 * apagados— se los presta el pintor, que es quien los tiene. Así este módulo
 * no importa nada del pintor y no hay ciclo.
 */

/** Caja de un cuadrante del mosaico, en píxeles del LCD. */
interface CajaCuadranteLcd {
  x: number;
  y: number;
  lado: number;
}

/** SVG del centro de un botón: lo inyecta la capa de componentes. */
type IconoSvgLcd = (
  boton: ButtonConfig, color: string, dimColor?: string, sobreFondo?: boolean,
) => string | null;

/** Recursos de dibujo que presta `pintarTecla`. */
export interface UtilesSubdivision {
  cargarImagen: (src: string) => Promise<HTMLImageElement | null>;
  fuenteMono: () => string;
  fuenteDots: () => string;
  /** Color de los puntos apagados del glifo, como en el resto del LCD. */
  dim: string;
  iconoSvg?: IconoSvgLcd;
}

/** Superficie de un cuadrante sin `bgColor` propio, como `Subdivision2x2`. */
const SUBDIVISION_FONDO = '#111315';

/**
 * Las cuatro cajas (TL, TR, BL, BR) del mosaico, con su margen y la
 * separación entre cuadrantes. Pura: el script de pruebas la ejercita a
 * través de `dibujarSubdivisionLcd` con un contexto de mentira.
 */
function cuadrantesLcd(ancho: number, alto: number): CajaCuadranteLcd[] {
  const menor = Math.min(ancho, alto);
  const margen = Math.max(2, Math.round(menor * 0.05));
  const hueco = Math.max(1, Math.round(menor * 0.03));
  const lado = (menor - margen * 2 - hueco) / 2;
  const x0 = (ancho - (lado * 2 + hueco)) / 2;
  const y0 = (alto - (lado * 2 + hueco)) / 2;
  return [0, 1, 2, 3].map((i) => ({
    x: x0 + (i % 2) * (lado + hueco),
    y: y0 + Math.floor(i / 2) * (lado + hueco),
    lado,
  }));
}

/** SVG encajado en una caja (no necesariamente centrada en todo el lienzo). */
async function dibujarSvgEnCaja(
  ctx: CanvasRenderingContext2D, svg: string, x: number, y: number, lado: number,
  cargarImagen: UtilesSubdivision['cargarImagen'],
): Promise<boolean> {
  const imagen = await cargarImagen('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  if (!imagen || !imagen.width || !imagen.height) return false;
  const escala = Math.min(lado / imagen.width, lado / imagen.height);
  const w = imagen.width * escala;
  const h = imagen.height * escala;
  ctx.drawImage(imagen, x + (lado - w) / 2, y + (lado - h) / 2, w, h);
  return true;
}

/** Texto corto en la fuente de puntos, encogido hasta caber en su caja. */
function dibujarTextoDiminuto(
  ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number,
  color: string, fuenteDots: () => string,
): void {
  const limpio = texto.trim();
  if (!limpio) return;
  const tamano = Math.max(5, Math.min(14, Math.round(ancho * 0.55)));
  ctx.font = `${tamano}px ${fuenteDots()}`;
  let visible = limpio;
  while (visible.length > 1 && ctx.measureText(visible).width > ancho) visible = visible.slice(0, -1);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(visible, x, y);
}

/** La etiqueta de un cuadrante: más pequeña que la del botón entero. */
function dibujarRotuloCuadrante(
  ctx: CanvasRenderingContext2D, texto: string, caja: CajaCuadranteLcd, color: string,
  fuenteMono: () => string,
): void {
  const limpio = texto.trim().toUpperCase();
  if (!limpio) return;
  const disponible = caja.lado - 2;
  let tamano = Math.max(5, Math.min(7, Math.round(caja.lado * 0.24)));
  ctx.font = `600 ${tamano}px ${fuenteMono()}`;
  while (tamano > 5 && ctx.measureText(limpio).width > disponible) {
    tamano -= 1;
    ctx.font = `600 ${tamano}px ${fuenteMono()}`;
  }
  let visible = limpio;
  while (visible.length > 1 && ctx.measureText(visible).width > disponible) visible = visible.slice(0, -1);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(visible, caja.x + caja.lado / 2, caja.y + caja.lado - Math.max(4, caja.lado * 0.18));
}

/**
 * Pinta los cuatro cuadrantes del botón. El color del padre es el respaldo
 * cuando el sub-botón no trae `fgColor`.
 */
export async function dibujarSubdivisionLcd(
  ctx: CanvasRenderingContext2D, boton: ButtonConfig, ancho: number, alto: number,
  color: string, utiles: UtilesSubdivision,
): Promise<void> {
  const subs = boton.subButtons ?? [];
  const cajas = cuadrantesLcd(ancho, alto);
  for (let i = 0; i < cajas.length; i++) {
    const caja = cajas[i];
    const sub = subs[i];
    ctx.fillStyle = sub?.bgColor || SUBDIVISION_FONDO;
    ctx.fillRect(caja.x, caja.y, caja.lado, caja.lado);
    if (!sub) continue;
    const colorSub = sub.fgColor || color;
    const glifo = (sub.dotGlyph || sub.icon || '').trim();
    const sintetico: ButtonConfig = {
      ...boton,
      id: sub.id,
      label: sub.label ?? '',
      icon: glifo || undefined,
      iconoPuntos: undefined,
      customGlyph57: undefined,
      imageData: undefined,
      brandIcon: undefined,
      action: sub.action,
    };
    const cajaGlifo = caja.lado * 0.52;
    const centroGlifoY = sub.label ? caja.y + caja.lado * 0.36 : caja.y + caja.lado * 0.5;
    const svg = utiles.iconoSvg?.(sintetico, colorSub, utiles.dim, false);
    const pintado = svg
      ? await dibujarSvgEnCaja(ctx, svg, caja.x, centroGlifoY - cajaGlifo / 2, cajaGlifo, utiles.cargarImagen)
      : false;
    if (!pintado) {
      dibujarTextoDiminuto(ctx, glifo.slice(0, 3), caja.x + caja.lado / 2, centroGlifoY, cajaGlifo, colorSub, utiles.fuenteDots);
    }
    if (sub.label) dibujarRotuloCuadrante(ctx, sub.label, caja, colorSub, utiles.fuenteMono);
  }
}
