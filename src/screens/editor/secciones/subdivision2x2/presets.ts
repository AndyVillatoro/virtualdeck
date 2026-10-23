/**
 * Presets de la subdivisión 2×2 (roadmap 121b).
 *
 * Se extrajeron de `secciones/EditorSubdivision2x2.tsx` tal cual, sin tocar
 * nada: son datos puros que el editor aplica de golpe con un clic.
 */
import type { ActionType } from '../../../../types';

export const SUBDIVISION_PRESETS = [
  {
    id: 'media',
    nameKey: 'ed.split.presetMedia',
    glyph: 'PLAY',
    buttons: [
      { idSuffix: 'q0', label: 'PREV', dotGlyph: 'PREV', action: { type: 'media-prev' as ActionType } },
      { idSuffix: 'q1', label: 'NEXT', dotGlyph: 'NEXT', action: { type: 'media-next' as ActionType } },
      { idSuffix: 'q2', label: 'PLAY', dotGlyph: 'PLAY', action: { type: 'media-play-pause' as ActionType }, isToggle: true },
      { idSuffix: 'q3', label: 'MUTE', dotGlyph: 'MUTE', action: { type: 'mute' as ActionType }, isToggle: true },
    ],
  },
  {
    id: 'arrows',
    nameKey: 'ed.split.presetArrows',
    glyph: 'ARROW_UP',
    buttons: [
      { idSuffix: 'q0', label: 'UP', dotGlyph: 'ARROW_UP', action: { type: 'hotkey' as ActionType, hotkey: 'Up' } },
      { idSuffix: 'q1', label: 'DOWN', dotGlyph: 'ARROW_DOWN', action: { type: 'hotkey' as ActionType, hotkey: 'Down' } },
      { idSuffix: 'q2', label: 'LEFT', dotGlyph: 'ARROW_LEFT', action: { type: 'hotkey' as ActionType, hotkey: 'Left' } },
      { idSuffix: 'q3', label: 'RIGHT', dotGlyph: 'ARROW_RIGHT', action: { type: 'hotkey' as ActionType, hotkey: 'Right' } },
    ],
  },
  {
    id: 'shortcuts',
    nameKey: 'ed.split.presetShortcuts',
    glyph: 'TERMINAL',
    buttons: [
      { idSuffix: 'q0', label: 'TERM', dotGlyph: 'TERMINAL', action: { type: 'script' as ActionType, script: 'wt' } },
      { idSuffix: 'q1', label: 'CODE', dotGlyph: 'CODE', action: { type: 'app' as ActionType, appPath: 'code' } },
      { idSuffix: 'q2', label: 'WEB', dotGlyph: 'WEB', action: { type: 'web' as ActionType, url: 'https://' } },
      { idSuffix: 'q3', label: 'CONF', dotGlyph: 'GEAR', action: { type: 'none' as ActionType } },
    ],
  },
  {
    id: 'audio',
    nameKey: 'ed.split.presetAudio',
    glyph: 'SPEAKER',
    buttons: [
      { idSuffix: 'q0', label: 'VOL+', dotGlyph: 'ARROW_UP', action: { type: 'volume-up' as ActionType } },
      { idSuffix: 'q1', label: 'VOL-', dotGlyph: 'ARROW_DOWN', action: { type: 'volume-down' as ActionType } },
      { idSuffix: 'q2', label: 'MUTE', dotGlyph: 'MUTE', action: { type: 'mute' as ActionType }, isToggle: true },
      { idSuffix: 'q3', label: 'MIC', dotGlyph: 'MIC', action: { type: 'audio-device' as ActionType } },
    ],
  },
];
