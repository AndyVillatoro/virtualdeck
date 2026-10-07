/**
 * Geometría del recorte del vídeo de la ventana que suena. Todo puro: sin DOM
 * ni React, para poder razonarlo con números.
 *
 * Un recorte es un rectángulo en fracciones 0..1 del cuadro de la ventana
 * capturada. Se pinta con CSS, sin recodificar: el `<video>` se agranda y se
 * desplaza para que la zona recortada llene el panel.
 */

export interface Recorte {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Caja {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MINIMO = 0.05;

const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Clave con la que se guarda el recorte: la fuente SMTC si la hay (un recorte
 * por app, igual que la pista), y si no, el nombre de la ventana.
 */
export function claveRecorte(fuente: string, nombreVentana: string): string {
  return (fuente.trim() || nombreVentana.trim()).toLowerCase();
}

/**
 * Caja del `<video>` para que el recorte llene un contenedor de `ancho × alto`
 * píxeles. `aspecto` es el del cuadro de la ventana (ancho / alto).
 *
 * El `<video>` mide `k·aspecto × k` y se elige `k` lo justo para que la zona
 * recortada cubra el contenedor; la sobra se recorta centrada. Así no hay
 * deformación aunque el contenedor cambie de forma al redimensionar.
 */
export function cajaRecorte(r: Recorte, ancho: number, alto: number, aspecto: number): Caja {
  const k = Math.max(ancho / (r.w * aspecto), alto / r.h);
  const width = k * aspecto;
  const height = k;
  return {
    width,
    height,
    left: -r.x * width - (r.w * width - ancho) / 2,
    top: -r.y * height - (r.h * height - alto) / 2,
  };
}

/**
 * Caja del cuadro entero dentro de un contenedor, con `object-fit: contain`
 * (bandas donde no encaje). Es la que ocupa la imagen al pedir el recorte.
 */
export function cajaContenida(ancho: number, alto: number, aspecto: number): Caja {
  const anchoCuadro = ancho / alto > aspecto ? alto * aspecto : ancho;
  const altoCuadro = anchoCuadro / aspecto;
  return {
    width: anchoCuadro,
    height: altoCuadro,
    left: (ancho - anchoCuadro) / 2,
    top: (alto - altoCuadro) / 2,
  };
}

/**
 * Ajusta un rectángulo arrastrado para que su proporción en píxeles coincida
 * con la del contenedor: así lo que se ve al guardar es lo que se seleccionó.
 *
 * `relacion` = (ancho del contenedor / alto del contenedor) / aspecto del cuadro.
 * Se conserva la esquina de partida y se mete dentro del cuadro.
 */
export function ajustarAlAspecto(r: Recorte, relacion: number): Recorte {
  let { w, h } = r;
  if (w / h > relacion) w = h * relacion;
  else h = w / relacion;
  if (w > 1) { w = 1; h = w / relacion; }
  if (h > 1) { h = 1; w = h * relacion; }
  return {
    x: acotar(r.x, 0, 1 - w),
    y: acotar(r.y, 0, 1 - h),
    w,
    h,
  };
}

/** Rectángulo normalizado entre dos puntos (fracciones). `null` si es demasiado pequeño. */
export function rectanguloEntre(a: { u: number; v: number }, b: { u: number; v: number }): Recorte | null {
  const x = Math.min(a.u, b.u);
  const y = Math.min(a.v, b.v);
  const w = Math.abs(a.u - b.u);
  const h = Math.abs(a.v - b.v);
  if (w < MINIMO || h < MINIMO) return null;
  return { x, y, w, h };
}

/** Punto en fracciones del cuadro a partir de un punto dentro de su caja, acotado. */
export function puntoEnCuadro(px: number, py: number, caja: { width: number; height: number }): { u: number; v: number } {
  return {
    u: acotar(px / caja.width, 0, 1),
    v: acotar(py / caja.height, 0, 1),
  };
}
