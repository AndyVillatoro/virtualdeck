import { FormNone, FormApp, FormWeb, FormShortcut, FormScript } from './basicos';
import { FormAudioDevice, FormHotkey, FormClipboard, FormTypeText, FormKillProcess, FormVolumeSet, FormBrightness, FormNotify, FormTts, FormRegionCapture, FormMediaPlayPause, FormWindowSnap } from './sistema';
import { FormSetVar, FormIncrVar, FormWebhook, FormBranch, FormCountdown } from './datos';
import { FormRgbColor, FormRgbMode, FormRgbProfile } from './rgb';
import { FormFolder, FormMacro } from './compuestos';
import type { PropsFormulario } from './base';

/**
 * Un formulario por tipo de accion.
 *
 * Antes esto era una cadena de treinta `{action.type === 'x' && (...)}` dentro
 * del paso de configuracion. Con el mapa, añadir un tipo es añadir una entrada.
 */
export const FORMULARIOS: Record<string, (p: PropsFormulario) => React.ReactElement> = {
  'none': FormNone,
  'app': FormApp,
  'web': FormWeb,
  'shortcut': FormShortcut,
  'script': FormScript,
  'audio-device': FormAudioDevice,
  'hotkey': FormHotkey,
  'clipboard': FormClipboard,
  'type-text': FormTypeText,
  'kill-process': FormKillProcess,
  'volume-set': FormVolumeSet,
  'brightness': FormBrightness,
  'notify': FormNotify,
  'set-var': FormSetVar,
  'incr-var': FormIncrVar,
  'webhook': FormWebhook,
  'tts': FormTts,
  'region-capture': FormRegionCapture,
  'rgb-color': FormRgbColor,
  'rgb-mode': FormRgbMode,
  'rgb-profile': FormRgbProfile,
  'folder': FormFolder,
  'media-play-pause': FormMediaPlayPause,
  'media-next': FormMediaPlayPause,
  'media-prev': FormMediaPlayPause,
  'volume-up': FormMediaPlayPause,
  'volume-down': FormMediaPlayPause,
  'mute': FormMediaPlayPause,
  'window-snap': FormWindowSnap,
  'branch': FormBranch,
  'countdown': FormCountdown,
  'macro': FormMacro,
};

export type { PropsFormulario };
