import type { ActionType } from '../../types';

/**
 * El icono DOT 8×8 de cada tipo de acción, cuando el botón no trae icono
 * propio.
 *
 * Sustituye a `VD_ACTION_ICONS` de `VDIcon.tsx` (los 21 SVG de primera
 * generación): la celda, el pintor de la tecla física y el editor usan este
 * mapa y dibujan con `DotGlyphIcon`, así que todo cae en puntos.
 */
export const GLIFO_POR_TIPO_ACCION: Record<ActionType, string> = {
  none: 'DOTS',
  app: 'APP_WINDOW',
  web: 'WEB',
  shortcut: 'EXPORT',
  script: 'TERMINAL',
  'audio-device': 'SPEAKER',
  hotkey: 'KEYBOARD',
  clipboard: 'CLIPBOARD',
  'type-text': 'EDIT',
  'kill-process': 'CLOSE',
  'volume-set': 'SPEAKER',
  'app-volume': 'SPEAKER',
  folder: 'FOLDER',
  'page-nav': 'NEXT',
  'media-play-pause': 'PLAY',
  'media-next': 'NEXT',
  'media-prev': 'PREV',
  'media-shuffle': 'SWIPE',
  'media-repeat': 'ROTATE_CW',
  'volume-up': 'SPEAKER',
  'volume-down': 'SPEAKER',
  mute: 'MUTE',
  brightness: 'BRIGHTNESS',
  adjust: 'KNOB',
  notify: 'BELL',
  'set-var': 'STORAGE',
  'incr-var': 'ADD',
  webhook: 'WEB',
  remote: 'EXPORT',
  tts: 'AUDIO_WAVE',
  'region-capture': 'SCISSORS',
  'rgb-color': 'SPARKLE',
  'rgb-mode': 'ROTATE_CW',
  'rgb-profile': 'BOOK',
  'rgb-preset': 'SPARKLE',
  'window-snap': 'FULLSCREEN',
  'window-cycle': 'ROTATE_CW',
  branch: 'CODE',
  countdown: 'CLOCK',
  macro: 'TERMINAL',
  'mobile-remote': 'MONITOR',
  discord: 'MIC',
  spotify: 'AUDIO_WAVE',
};
