/**
 * La marca de un botón, resuelta y dibujada en un solo sitio.
 *
 * Vive en `src/comun/` porque la usan los dos procesos: el renderer la pinta
 * en la tecla física (`utils/superficies/pintarTecla.ts`, con `import()`
 * diferido) y el proceso principal la manda al mando móvil ya como SVG
 * (`electron/main/iconosMando.ts`). Antes cada lado repetía la resolución
 * —bitmap propio, color propio, paleta fusionada— y el móvil simplemente no
 * la tenía: la regla `main-no-renderer` le impedía importar el catálogo.
 *
 * Nada de aquí toca el DOM ni Node: solo cadenas, para que valga en los dos.
 */

import { BRAND_ICONS_MAP, generateSvgFromBitmap } from './brandIcons';

/** Lo que se lee de un botón para resolver su marca. */
export interface FuenteMarca {
  brandIcon?: string;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
}

/** La marca ya resuelta: lo que hace falta para dibujarla. */
export interface MarcaResuelta {
  /** Clave del catálogo (`BRAND_ICONS_MAP`). */
  clave: string;
  /** Bitmap 17×17: el personalizado si lo hay, si no el del catálogo. */
  bitmap: string[];
  /** Color de los puntos `#`, ya validado. */
  color: string;
  /** Paleta por letra, ya fusionada y validada. */
  palette: Record<string, string>;
  /** Animación del catálogo (`breathe` si la clave no está). */
  anim: string;
}

/**
 * Colores que pueden acabar dentro del SVG sin romperlo: `#rgb`, `#rrggbb` o
 * `#rrggbbaa`. Los colores vienen de la configuración y de perfiles
 * importados de la galería, así que un valor como `red"/><script>` no puede
 * llegar al atributo `fill`: cae al color del catálogo.
 */
const FORMATO_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Color de respaldo si ni el propio ni el del catálogo son válidos (`VD.text` OLED). */
const COLOR_RESPALDO = '#e6e8eb';

/** Un color seguro para el SVG, ya recortado, o `null` si no lo es. */
function colorSeguro(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return FORMATO_COLOR.test(limpio) ? limpio : null;
}

/** Paleta del catálogo + overrides del usuario, quedándose solo con los válidos. */
function paletaSegura(
  base: Record<string, string> | undefined,
  custom: Record<string, string> | undefined,
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [letra, valor] of Object.entries(base ?? {})) {
    const seguro = colorSeguro(valor);
    if (seguro) salida[letra] = seguro;
  }
  for (const [letra, valor] of Object.entries(custom ?? {})) {
    const seguro = colorSeguro(valor);
    if (seguro) salida[letra] = seguro;
  }
  return salida;
}

/**
 * Resuelve la marca de un botón, con la misma precedencia que la celda: el
 * bitmap personalizado manda sobre el del catálogo, el color personalizado
 * sobre el del catálogo, y la paleta personalizada se fusiona encima. Sin
 * bitmap (ni propio ni del catálogo) no hay marca: `null`.
 */
export function resolverMarca(fuente: FuenteMarca): MarcaResuelta | null {
  const clave = fuente.brandIcon;
  if (!clave) return null;
  const icono = BRAND_ICONS_MAP[clave];
  const bitmap = fuente.brandIconCustomBitmap?.length ? fuente.brandIconCustomBitmap : icono?.bitmap;
  if (!bitmap?.length) return null;
  const color = colorSeguro(fuente.brandIconCustomColor)
    ?? colorSeguro(icono?.color)
    ?? COLOR_RESPALDO;
  return {
    clave,
    bitmap,
    color,
    palette: paletaSegura(icono?.palette, fuente.brandIconCustomPalette),
    anim: icono?.anim ?? 'breathe',
  };
}

/** SVG plano (sin `<style>`): el que se dibuja en el lienzo de la tecla LCD. */
export function svgDeMarca(marca: MarcaResuelta): string {
  return generateSvgFromBitmap(marca.bitmap, marca.color, marca.palette);
}

// ── SVG autónomo (móvil) ─────────────────────────────────────────────────────
// El SVG del deck se apoya en `brand-icons.css` y en `style="--d:…"` del DOM.
// En la página del móvil eso no sirve: la CSP solo deja `style-src` con nonce,
// así que los atributos `style` se ignoran. Pero un SVG cargado en un `<img>`
// (aquí, como `data:`) es un documento aparte: no ejecuta nada y su `<style>`
// interno no choca con la CSP de la página. Por eso el halo y la animación
// viajan **dentro** del SVG, con las mismas reglas que `brand-icons.css`.

/** El halo, igual que `.vd-brand-icon svg .halo` de `brand-icons.css`. */
const ESTILO_HALO = '.halo{filter:blur(2.5px);opacity:.55}';

/** Fotogramas clave, copiados de `brand-icons.css`. */
const CUADROS: Record<string, string> = {
  'vd-dot-pulse': '@keyframes vd-dot-pulse{0%,100%{opacity:.55;filter:brightness(.85)}50%{opacity:1;filter:brightness(1.35)}}',
  'vd-dot-pulse-strong': '@keyframes vd-dot-pulse-strong{0%,100%{opacity:.35;filter:brightness(.7)}50%{opacity:1;filter:brightness(1.6)}}',
  'vd-dot-shimmer': '@keyframes vd-dot-shimmer{0%,100%{filter:brightness(.95)}50%{filter:brightness(1.4)}}',
  'vd-dot-rec': '@keyframes vd-dot-rec{0%,100%{opacity:1}50%{opacity:.25}}',
  'vd-dot-blink': '@keyframes vd-dot-blink{0%,45%,100%{opacity:1}50%,55%{opacity:.15}60%{opacity:1}}',
};

interface ReglaAnimacion {
  cuadro: string;
  duracion: string;
  /** Con retardo por punto (`--d`), como el resto; `rec` y `blink` van en sincronía. */
  porPunto: boolean;
}

/** La regla de cada `anim` del catálogo, con los mismos tiempos que el CSS. */
function reglaAnimacion(anim: string): ReglaAnimacion {
  switch (anim) {
    case 'shimmer': return { cuadro: 'vd-dot-shimmer', duracion: '2.6s', porPunto: true };
    case 'pulse': return { cuadro: 'vd-dot-pulse-strong', duracion: '1.8s', porPunto: true };
    case 'rec': return { cuadro: 'vd-dot-rec', duracion: '1.1s', porPunto: false };
    case 'blink': return { cuadro: 'vd-dot-blink', duracion: '2.4s', porPunto: false };
    case 'signal': return { cuadro: 'vd-dot-pulse-strong', duracion: '2.2s', porPunto: true };
    case 'wave': return { cuadro: 'vd-dot-pulse', duracion: '1.6s', porPunto: true };
    case 'float':
    case 'slide':
    case 'bounce':
    case 'tilt':
    case 'glitch':
    case 'spin':
    case 'spin-slow':
    case 'spin-fast':
    case 'gear':
      return { cuadro: 'vd-dot-shimmer', duracion: '3s', porPunto: true };
    default:
      return { cuadro: 'vd-dot-pulse', duracion: '3.6s', porPunto: true };
  }
}

function cssAnimacion(anim: string): string {
  const regla = reglaAnimacion(anim);
  const retardo = regla.porPunto ? ';animation-delay:var(--d,0s)' : '';
  return `${CUADROS[regla.cuadro]}.on,.halo{animation:${regla.cuadro} ${regla.duracion} ease-in-out infinite${retardo}}`;
}

function construirSvgAutonomo(marca: MarcaResuelta, animado: boolean): string {
  const base = svgDeMarca(marca);
  const css = animado ? ESTILO_HALO + cssAnimacion(marca.anim) : ESTILO_HALO;
  return base.replace(/^(<svg[^>]*>)/, `$1<style>${css}</style>`);
}

// Caché por (clave, bitmap, color, paleta, animado): la petición de botones del
// móvil se repite cada pocos segundos y volver a montar el SVG de cada marca
// sería trabajo tirado.
function claveDeCache(marca: MarcaResuelta, animado: boolean): string {
  const paleta = Object.keys(marca.palette)
    .sort()
    .map((letra) => `${letra}=${marca.palette[letra]}`)
    .join(',');
  return `${marca.clave}|${marca.bitmap.join('/')}|${marca.color}|${paleta}|${animado ? 'animado' : 'quieto'}`;
}

const cacheSvg = new Map<string, string>();

/**
 * Tope de cada caché: la clave lleva el bitmap y los colores, así que cada
 * retoque de una marca propia es una entrada nueva. Al llegar al tope se
 * vacía entera; volver a montar unas decenas de SVG cuesta poco.
 */
const TOPE_CACHE = 256;

function guardar(cache: Map<string, string>, clave: string, valor: string): void {
  if (cache.size >= TOPE_CACHE) cache.clear();
  cache.set(clave, valor);
}

/** SVG completo con su `<style>` dentro: halo y, si `animado`, la animación. */
function svgAutonomoDeMarca(marca: MarcaResuelta, animado: boolean): string {
  const clave = claveDeCache(marca, animado);
  let svg = cacheSvg.get(clave);
  if (svg === undefined) {
    svg = construirSvgAutonomo(marca, animado);
    guardar(cacheSvg, clave, svg);
  }
  return svg;
}

const cacheUri = new Map<string, string>();

/** El SVG autónomo como `data:image/svg+xml,…` para un `<img>` (con caché). */
export function dataUriDeMarca(marca: MarcaResuelta, animado: boolean): string {
  const clave = claveDeCache(marca, animado);
  let uri = cacheUri.get(clave);
  if (uri === undefined) {
    uri = 'data:image/svg+xml,' + encodeURIComponent(svgAutonomoDeMarca(marca, animado));
    guardar(cacheUri, clave, uri);
  }
  return uri;
}
