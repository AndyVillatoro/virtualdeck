// Paleta oscura DOT / 480 — negro OLED puro, superficies de hardware y bordes
// táctiles. Es la de las reglas del proyecto (fondo #070809, superficie #111315,
// borde #26292e). Hasta 2026-10-06 el «oscuro» por defecto era otra paleta gris
// (#0f0f0f) y la OLED vivía aparte como tema «DOT/480»: se fundieron en esta
// (migración v7→v8 en `configMigration`).
export const VD = {
  bg: '#070809',
  surface: '#111315',
  elevated: '#181b1e',
  elevatedHover: '#20242a', // step entre elevated y overlay para hover
  overlay: '#252a32',
  border: '#26292e',
  borderStrong: '#343a44',
  text: '#e6e8eb',
  textDim: '#8e929b',
  textMuted: '#5d626c',
  accent: '#4a8ef0',
  accentBg: 'rgba(74,142,240,0.14)',
  /** Texto sobre un fondo de acento. Lo recalcula `ThemeProvider` según el acento elegido. */
  onAccent: '#070809',
  success: '#4caf7d',
  warning: '#d4a234',
  danger: '#d95f5f',
  violet: '#a78bfa', // único acento extra fuera de la escala semántica
  font: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  dots: '"DotGothic16", monospace',
  // Escala única de radios — sharper-than-friendly, coherente con la firma dot-matrix
  radius: { sm: 2, md: 3, lg: 4 } as const,
  // Escala única de sombras — flat depth, sin glow ni glass
  shadow: {
    menu: '0 8px 24px rgba(0,0,0,0.8)',
    modal: '0 16px 48px rgba(0,0,0,0.9)',
  } as const,
  /** Velo detrás de un modal. Uno solo: antes había nueve opacidades distintas. */
  backdrop: 'rgba(7,8,9,0.82)',
  // 4.7 — escala de spacing en múltiplos de 4. Cualquier valor nuevo debe encajar en esta escala.
  // Uso: VD.space.xs (4) micro / sm (8) componente / md (12) sección / lg (16) bloque / xl (20) región / 2xl (24) mayor.
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32 } as const,
  /**
   * Escala tipográfica (px). Enteros: los 6,5 / 7,5 / 8,5 / 9,5 sueltos se
   * renderizaban borrosos en la mono. xs = rótulos en puntos y notas,
   * sm = cuerpo de la interfaz, md = campos, lg = títulos de sección, xl = títulos de pantalla.
   */
  tipo: { xs: 8, sm: 9, md: 11, lg: 13, xl: 16 } as const,
  // Color del píxel apagado en la matriz de puntos — atado al token de texto
  dotIdle: 'rgba(255,255,255,0.04)',
  // Trama clara sobre fondo oscuro.
  trama: '255,255,255',
} as const;

export type VDTokens = {
  bg: string; surface: string; elevated: string; elevatedHover: string;
  overlay: string; border: string; borderStrong: string;
  text: string; textDim: string; textMuted: string;
  accent: string; accentBg: string; onAccent: string;
  success: string; warning: string; danger: string; violet: string;
  font: string; mono: string; dots: string;
  radius: { readonly sm: number; readonly md: number; readonly lg: number };
  shadow: { menu: string; modal: string };
  backdrop: string;
  space: { readonly xs: number; readonly sm: number; readonly md: number; readonly lg: number; readonly xl: number; readonly '2xl': number; readonly '3xl': number };
  tipo: { readonly xs: number; readonly sm: number; readonly md: number; readonly lg: number; readonly xl: number };
  dotIdle: string;
  /** Color de la trama de los fondos, como "r,g,b" para poder darle alfa. */
  trama: string;
};

// Paleta clara refinada — grises industriales/cemento suaves (anti-glare), sin blancos deslumbrantes.
export const VD_LIGHT: VDTokens = {
  ...VD,
  bg: '#d8dbe0',
  surface: '#cbcfd5',
  elevated: '#c0c5cc',
  elevatedHover: '#b5bac2',
  overlay: '#a9b0b9',
  border: '#9da4ae',
  borderStrong: '#7d8591',
  text: '#111418',
  textDim: '#2c323a',
  textMuted: '#4d5560',
  accentBg: 'rgba(74,142,240,0.18)',
  shadow: {
    menu: '0 8px 24px rgba(0,0,0,0.16)',
    modal: '0 16px 48px rgba(0,0,0,0.25)',
  },
  backdrop: 'rgba(17,20,24,0.45)',
  dotIdle: 'rgba(0,0,0,0.08)',
  // Trama oscura sobre fondo gris claro: técnica y nítida.
  trama: '0,0,0',
};

/** Acento de la firma DOT / 480 (el rojo de los presets). */
const ACENTO_DOT480 = '#ff3b30';

/**
 * Qué color de texto se lee sobre un fondo de `color`: casi negro sobre
 * acentos claros (lima, ámbar), casi blanco sobre oscuros. Nunca `#ffffff`.
 * Vive en `src/comun/contraste.ts` (lógica pura compartida con la tecla del
 * dock y el mando móvil); aquí se reexporta para no romper los usos del
 * renderer.
 */
export { textoSobre } from './comun/contraste';

// Presets del color de acento — 10 colores que cubren el espectro sin chocar con
// los tokens semánticos (success/warning/danger). El usuario puede usar el
// <input type="color"> para cualquier color libre adicional.
export const ACCENT_PRESETS: readonly string[] = [
  VD.accent,   // azul sistema
  VD.success,  // verde
  VD.warning,  // amarillo/ámbar
  VD.violet,   // violeta
  ACENTO_DOT480, // rojo DOT / 480
  '#2dd4bf',   // teal/cian
  '#f472b6',   // rosa
  '#fb923c',   // naranja
  '#a3e635',   // lima
  '#818cf8',   // índigo
];

// 5×7 dot-matrix glyph table (hand-authored for digits + key letters)
// Each row is a bitmask: bits 4..0 = left..right
export const GLYPHS_5x7: Record<string, number[]> = {
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F],
  '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  ':': [0x00,0x04,0x04,0x00,0x04,0x04,0x00],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x0C,0x0C],
  '/': [0x01,0x02,0x02,0x04,0x08,0x08,0x10],
  '%': [0x19,0x19,0x02,0x04,0x08,0x13,0x13],
  '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
  'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
  'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
  'D': [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
  'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0E],
  'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
  'N': [0x11,0x11,0x19,0x15,0x13,0x11,0x11],
  'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
  'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S': [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
  'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  'W': [0x11,0x11,0x11,0x15,0x15,0x15,0x0A],
  'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x11,0x0A,0x04,0x04,0x04],
  'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '&': [0x0C,0x12,0x12,0x0C,0x15,0x12,0x0D],
  '?': [0x0E,0x11,0x01,0x02,0x04,0x00,0x04],
  '!': [0x04,0x04,0x04,0x04,0x04,0x00,0x04],
  ',': [0x00,0x00,0x00,0x00,0x0C,0x04,0x08],
  '+': [0x00,0x04,0x04,0x1F,0x04,0x04,0x00],
  '·': [0x00,0x00,0x00,0x04,0x00,0x00,0x00],
};
