import { GLIFO_POR_TIPO_ACCION } from '../../components/dot480/glifosPorTipoAccion';

import type { ActionType, ButtonAction, FolderButton, SliderWidgetConfig, TipoWidget } from '../../types';

export interface ButtonPreset {
  category: 'APPS' | 'WEB' | 'MEDIA' | 'SISTEMA' | 'CREATIVO' | 'RGB';
  label: string;
  sublabel?: string;
  icon?: string;
  /** Origen en el catálogo grande (`'marcas:<id>'` o `'acciones:<id>'`, como `iconoPuntos.origen`): lo resuelve `resolverIconoCatalogo` al aplicar; `icon` sigue siendo el respaldo. */
  iconoCatalogo?: string;
  bgColor?: string;
  fgColor?: string;
  action: ButtonAction;
  widget?: TipoWidget;
  sliderWidget?: SliderWidgetConfig;
  /** El preset alterna (pulsar otra vez deshace): lo copia `applyPreset`. */
  /** Fijo en todas las páginas de su grupo (los de cambiar de página: si no, una página queda sin salida). */
  fijo?: boolean;
  isToggle?: boolean;
  actionToggleOff?: ButtonAction;
}

export const FAMILIAS_ACCION = [
  'apps',
  'audio',
  'musica',
  'teclado',
  'logica',
  'sistema',
  'rgb',
  'integraciones',
] as const;

export type FamiliaAccion = (typeof FAMILIAS_ACCION)[number];

export interface ActionTypeInfo {
  type: ActionType;
  label: string;
  glyph: string;
  desc: string;
  familia?: FamiliaAccion;
}

// label/desc son CLAVES i18n (ver `act.*` en src/utils/i18n.tsx). Se resuelven
// con t() en el render. El dict es la fuente única ES/EN; acá no hay texto.
// `glyph` es el nombre DOT 8×8 que se enseña en el selector y como icono del
// tipo cuando el botón no trae icono propio (misma fuente que la celda).
export const ACTION_TYPES: ActionTypeInfo[] = [
  { type: 'none',             label: 'act.none.label',             glyph: GLIFO_POR_TIPO_ACCION.none,             desc: 'act.none.desc' },
  { type: 'app',              label: 'act.app.label',              glyph: GLIFO_POR_TIPO_ACCION.app,              desc: 'act.app.desc',             familia: 'apps' },
  { type: 'web',              label: 'act.web.label',              glyph: GLIFO_POR_TIPO_ACCION.web,              desc: 'act.web.desc',             familia: 'apps' },
  { type: 'shortcut',         label: 'act.shortcut.label',         glyph: GLIFO_POR_TIPO_ACCION.shortcut,         desc: 'act.shortcut.desc',         familia: 'apps' },
  { type: 'script',           label: 'act.script.label',           glyph: GLIFO_POR_TIPO_ACCION.script,           desc: 'act.script.desc',           familia: 'sistema' },
  { type: 'audio-device',     label: 'act.audio-device.label',     glyph: GLIFO_POR_TIPO_ACCION['audio-device'],  desc: 'act.audio-device.desc',     familia: 'audio' },
  { type: 'hotkey',           label: 'act.hotkey.label',           glyph: GLIFO_POR_TIPO_ACCION.hotkey,           desc: 'act.hotkey.desc',           familia: 'teclado' },
  { type: 'clipboard',        label: 'act.clipboard.label',        glyph: GLIFO_POR_TIPO_ACCION.clipboard,        desc: 'act.clipboard.desc',        familia: 'teclado' },
  { type: 'type-text',        label: 'act.type-text.label',        glyph: GLIFO_POR_TIPO_ACCION['type-text'],     desc: 'act.type-text.desc',        familia: 'teclado' },
  { type: 'kill-process',     label: 'act.kill-process.label',     glyph: GLIFO_POR_TIPO_ACCION['kill-process'],  desc: 'act.kill-process.desc',     familia: 'apps' },
  { type: 'volume-set',       label: 'act.volume-set.label',       glyph: GLIFO_POR_TIPO_ACCION['volume-set'],    desc: 'act.volume-set.desc',       familia: 'audio' },
  { type: 'app-volume',       label: 'act.app-volume.label',       glyph: GLIFO_POR_TIPO_ACCION['app-volume'],    desc: 'act.app-volume.desc',       familia: 'audio' },
  { type: 'folder',           label: 'act.folder.label',           glyph: GLIFO_POR_TIPO_ACCION.folder,           desc: 'act.folder.desc',           familia: 'logica' },
  { type: 'page-nav',         label: 'act.page-nav.label',         glyph: GLIFO_POR_TIPO_ACCION['page-nav'],      desc: 'act.page-nav.desc',         familia: 'logica' },
  { type: 'media-play-pause', label: 'act.media-play-pause.label', glyph: GLIFO_POR_TIPO_ACCION['media-play-pause'], desc: 'act.media-play-pause.desc', familia: 'musica' },
  { type: 'media-next',       label: 'act.media-next.label',       glyph: GLIFO_POR_TIPO_ACCION['media-next'],    desc: 'act.media-next.desc',       familia: 'musica' },
  { type: 'media-prev',       label: 'act.media-prev.label',       glyph: GLIFO_POR_TIPO_ACCION['media-prev'],    desc: 'act.media-prev.desc',       familia: 'musica' },
  { type: 'volume-up',        label: 'act.volume-up.label',        glyph: GLIFO_POR_TIPO_ACCION['volume-up'],     desc: 'act.volume-up.desc',        familia: 'audio' },
  { type: 'volume-down',      label: 'act.volume-down.label',      glyph: GLIFO_POR_TIPO_ACCION['volume-down'],   desc: 'act.volume-down.desc',      familia: 'audio' },
  { type: 'mute',             label: 'act.mute.label',             glyph: GLIFO_POR_TIPO_ACCION.mute,             desc: 'act.mute.desc',             familia: 'audio' },
  { type: 'brightness',       label: 'act.brightness.label',       glyph: GLIFO_POR_TIPO_ACCION.brightness,       desc: 'act.brightness.desc',       familia: 'audio' },
  { type: 'adjust',           label: 'act.adjust.label',           glyph: GLIFO_POR_TIPO_ACCION.adjust,           desc: 'act.adjust.desc',           familia: 'audio' },
  { type: 'notify',           label: 'act.notify.label',           glyph: GLIFO_POR_TIPO_ACCION.notify,           desc: 'act.notify.desc',           familia: 'sistema' },
  { type: 'set-var',          label: 'act.set-var.label',          glyph: GLIFO_POR_TIPO_ACCION['set-var'],       desc: 'act.set-var.desc',          familia: 'logica' },
  { type: 'incr-var',         label: 'act.incr-var.label',         glyph: GLIFO_POR_TIPO_ACCION['incr-var'],      desc: 'act.incr-var.desc',         familia: 'logica' },
  { type: 'webhook',          label: 'act.webhook.label',          glyph: GLIFO_POR_TIPO_ACCION.webhook,          desc: 'act.webhook.desc',          familia: 'sistema' },
  { type: 'tts',              label: 'act.tts.label',              glyph: GLIFO_POR_TIPO_ACCION.tts,              desc: 'act.tts.desc',              familia: 'sistema' },
  { type: 'region-capture',   label: 'act.region-capture.label',   glyph: GLIFO_POR_TIPO_ACCION['region-capture'], desc: 'act.region-capture.desc',  familia: 'apps' },
  { type: 'rgb-color',        label: 'act.rgb-color.label',        glyph: GLIFO_POR_TIPO_ACCION['rgb-color'],     desc: 'act.rgb-color.desc',        familia: 'rgb' },
  { type: 'rgb-mode',         label: 'act.rgb-mode.label',         glyph: GLIFO_POR_TIPO_ACCION['rgb-mode'],      desc: 'act.rgb-mode.desc',         familia: 'rgb' },
  { type: 'rgb-profile',      label: 'act.rgb-profile.label',      glyph: GLIFO_POR_TIPO_ACCION['rgb-profile'],   desc: 'act.rgb-profile.desc',      familia: 'rgb' },
  { type: 'rgb-preset',       label: 'act.rgb-preset.label',       glyph: GLIFO_POR_TIPO_ACCION['rgb-preset'],    desc: 'act.rgb-preset.desc',       familia: 'rgb' },
  { type: 'remote',           label: 'act.remote.label',           glyph: GLIFO_POR_TIPO_ACCION.remote,           desc: 'act.remote.desc',           familia: 'sistema' },
  { type: 'window-snap',      label: 'act.window-snap.label',      glyph: GLIFO_POR_TIPO_ACCION['window-snap'],   desc: 'act.window-snap.desc',      familia: 'apps' },
  { type: 'window-cycle',     label: 'act.window-cycle.label',     glyph: GLIFO_POR_TIPO_ACCION['window-cycle'],  desc: 'act.window-cycle.desc',     familia: 'apps' },
  { type: 'branch',           label: 'act.branch.label',           glyph: GLIFO_POR_TIPO_ACCION.branch,           desc: 'act.branch.desc',           familia: 'logica' },
  { type: 'countdown',        label: 'act.countdown.label',        glyph: GLIFO_POR_TIPO_ACCION.countdown,        desc: 'act.countdown.desc',        familia: 'logica' },
  { type: 'media-shuffle',    label: 'act.media-shuffle.label',    glyph: GLIFO_POR_TIPO_ACCION['media-shuffle'], desc: 'act.media-shuffle.desc',    familia: 'musica' },
  { type: 'media-repeat',     label: 'act.media-repeat.label',     glyph: GLIFO_POR_TIPO_ACCION['media-repeat'],  desc: 'act.media-repeat.desc',     familia: 'musica' },
  { type: 'macro',            label: 'act.macro.label',            glyph: GLIFO_POR_TIPO_ACCION.macro,            desc: 'act.macro.desc',            familia: 'teclado' },
  { type: 'mobile-remote',     label: 'act.mobile-remote.label',    glyph: GLIFO_POR_TIPO_ACCION['mobile-remote'], desc: 'act.mobile-remote.desc',   familia: 'sistema' },
  { type: 'discord',           label: 'act.discord.label',          glyph: GLIFO_POR_TIPO_ACCION.discord,          desc: 'act.discord.desc',          familia: 'integraciones' },
  { type: 'spotify',           label: 'act.spotify.label',          glyph: GLIFO_POR_TIPO_ACCION.spotify,          desc: 'act.spotify.desc',          familia: 'integraciones' },
];


export const PRESETS: ButtonPreset[] = [
  // APPS
  { category: 'APPS', label: 'Spotify', icon: 'AUDIO_WAVE', bgColor: '#1a3320', fgColor: '#1DB954', action: { type: 'app', appPath: 'spotify' }, iconoCatalogo: 'marcas:spotify' },
  { category: 'APPS', label: 'Discord', icon: 'MIC', bgColor: '#1e1f40', fgColor: '#7289da', action: { type: 'app', appPath: '%LOCALAPPDATA%\\Discord\\Update.exe --processStart Discord.exe' }, iconoCatalogo: 'marcas:discord' },
  { category: 'APPS', label: 'VS Code', icon: 'CODE', bgColor: '#00264d', fgColor: '#4fc3f7', action: { type: 'app', appPath: 'code' }, iconoCatalogo: 'acciones:brand-vscode' },
  { category: 'APPS', label: 'Chrome', icon: 'WEB', bgColor: '#1a2a4a', fgColor: '#4a90d9', action: { type: 'app', appPath: 'chrome' }, iconoCatalogo: 'marcas:googlechrome' },
  { category: 'APPS', label: 'OBS Studio', icon: 'PLAY', bgColor: '#1a1424', fgColor: '#a78bfa', action: { type: 'app', appPath: 'obs64' }, iconoCatalogo: 'marcas:obsstudio' },
  { category: 'APPS', label: 'Steam', icon: 'PLAY', bgColor: '#0d1b2a', fgColor: '#66c0f4', action: { type: 'app', appPath: 'steam' }, iconoCatalogo: 'marcas:steam' },
  { category: 'APPS', label: 'Explorador', icon: 'FOLDER', action: { type: 'app', appPath: 'explorer.exe' }, iconoCatalogo: 'acciones:folder' },
  { category: 'APPS', label: 'Notepad', icon: 'EDIT', action: { type: 'app', appPath: 'notepad.exe' }, iconoCatalogo: 'acciones:notes' },
  { category: 'APPS', label: 'Calculadora', icon: 'ADD', action: { type: 'app', appPath: 'calc.exe' }, iconoCatalogo: 'acciones:calculator' },
  { category: 'APPS', label: 'Task Mgr', icon: 'CPU', action: { type: 'app', appPath: 'taskmgr.exe' }, iconoCatalogo: 'acciones:cpu' },
  // WEB
  { category: 'WEB', label: 'Gemini', icon: 'SPARKLE', bgColor: '#0f172a', fgColor: '#38bdf8', action: { type: 'web', url: 'https://gemini.google.com' }, iconoCatalogo: 'marcas:googlegemini' },
  { category: 'WEB', label: 'ChatGPT', icon: 'SPARKLE', bgColor: '#002a1a', fgColor: '#10a37f', action: { type: 'web', url: 'https://chatgpt.com' }, iconoCatalogo: 'acciones:brand-openai' },
  { category: 'WEB', label: 'Claude', icon: 'SPARKLE', bgColor: '#2a1a0a', fgColor: '#d97706', action: { type: 'web', url: 'https://claude.ai' }, iconoCatalogo: 'marcas:claude' },
  { category: 'WEB', label: 'GitHub', icon: 'CODE', bgColor: '#181b1e', fgColor: '#e6e8eb', action: { type: 'web', url: 'https://github.com' }, iconoCatalogo: 'marcas:github' },
  { category: 'WEB', label: 'YouTube', icon: 'PLAY', bgColor: '#2a0000', fgColor: '#ff4444', action: { type: 'web', url: 'https://youtube.com' }, iconoCatalogo: 'marcas:youtube' },
  { category: 'WEB', label: 'Twitch', icon: 'PLAY', bgColor: '#1a0033', fgColor: '#9146ff', action: { type: 'web', url: 'https://twitch.tv' }, iconoCatalogo: 'marcas:twitch' },
  { category: 'WEB', label: 'Discord', icon: 'CHAT', bgColor: '#111328', fgColor: '#5865f2', action: { type: 'web', url: 'https://discord.com/app' }, iconoCatalogo: 'marcas:discord' },
  { category: 'WEB', label: 'WhatsApp', icon: 'CHAT', bgColor: '#0a2016', fgColor: '#25d366', action: { type: 'web', url: 'https://web.whatsapp.com' }, iconoCatalogo: 'marcas:whatsapp' },
  { category: 'WEB', label: 'Notion', icon: 'EDIT', bgColor: '#1a1a1a', fgColor: '#ffffff', action: { type: 'web', url: 'https://notion.so' }, iconoCatalogo: 'marcas:notion' },
  { category: 'WEB', label: 'Reddit', icon: 'CHAT', bgColor: '#2a1005', fgColor: '#ff4500', action: { type: 'web', url: 'https://reddit.com' }, iconoCatalogo: 'marcas:reddit' },
  { category: 'WEB', label: 'Spotify', icon: 'AUDIO_WAVE', bgColor: '#052514', fgColor: '#1db954', action: { type: 'web', url: 'https://open.spotify.com' }, iconoCatalogo: 'marcas:spotify' },
  { category: 'WEB', label: 'Netflix', icon: 'PLAY', bgColor: '#2a0000', fgColor: '#e50914', action: { type: 'web', url: 'https://netflix.com' }, iconoCatalogo: 'marcas:netflix' },
  { category: 'WEB', label: 'Twitter/X', icon: 'WEB', bgColor: '#111315', fgColor: '#e6e8eb', action: { type: 'web', url: 'https://x.com' }, iconoCatalogo: 'marcas:x' },
  { category: 'WEB', label: 'Gmail', icon: 'BELL', bgColor: '#2a0a0a', fgColor: '#ea4335', action: { type: 'web', url: 'https://mail.google.com' }, iconoCatalogo: 'marcas:gmail' },
  // MEDIA
  { category: 'MEDIA', label: 'Vol. Táctil (H)', icon: 'SPEAKER', bgColor: '#141c24', fgColor: '#38bdf8', action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 0 }, widget: 'slider', sliderWidget: { target: 'volume', min: 0, max: 100, step: 2, orientation: 'horizontal', showValue: true }, iconoCatalogo: 'acciones:volume' },
  { category: 'MEDIA', label: 'Fader Vol. (V)', icon: 'SPEAKER', bgColor: '#141c24', fgColor: '#38bdf8', action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 0 }, widget: 'slider', sliderWidget: { target: 'volume', min: 0, max: 100, step: 2, orientation: 'vertical', showValue: true }, iconoCatalogo: 'acciones:volume' },
  { category: 'MEDIA', label: 'Play/Pausa', icon: 'PLAY', action: { type: 'media-play-pause' }, iconoCatalogo: 'acciones:player-play' },
  { category: 'MEDIA', label: 'Siguiente',  icon: 'NEXT', action: { type: 'media-next' }, iconoCatalogo: 'acciones:player-skip-forward' },
  { category: 'MEDIA', label: 'Anterior',   icon: 'PREV', action: { type: 'media-prev' }, iconoCatalogo: 'acciones:player-skip-back' },
  { category: 'MEDIA', label: 'Vol. +',     icon: 'SPEAKER', action: { type: 'volume-up' }, iconoCatalogo: 'acciones:volume' },
  { category: 'MEDIA', label: 'Vol. −',     icon: 'SPEAKER', action: { type: 'volume-down' }, iconoCatalogo: 'acciones:volume-2' },
  { category: 'MEDIA', label: 'Silenciar',  icon: 'VOLUME_MUTE', action: { type: 'mute' }, iconoCatalogo: 'acciones:volume-off' },
  { category: 'MEDIA', label: 'Discord Mute', icon: 'MIC', bgColor: '#1e1f40', fgColor: '#7289da', action: { type: 'discord', discordAction: 'toggle-mute' }, iconoCatalogo: 'marcas:discord' },
  { category: 'MEDIA', label: 'Discord Sordo', icon: 'VOLUME_MUTE', bgColor: '#1e1f40', fgColor: '#7289da', action: { type: 'discord', discordAction: 'toggle-deaf' }, iconoCatalogo: 'marcas:discord' },
  { category: 'MEDIA', label: 'Spotify Top 50', icon: 'AUDIO_WAVE', bgColor: '#1a3320', fgColor: '#1DB954', action: { type: 'spotify', spotifyAction: 'play-uri', spotifyUri: 'spotify:playlist:37i9dQZEVXbMDoHDwVN2tF' }, iconoCatalogo: 'marcas:spotify' },
  { category: 'MEDIA', label: 'Vol. 25%',   action: { type: 'volume-set', volumePercent: 25 }, iconoCatalogo: 'acciones:volume' },

  { category: 'MEDIA', label: 'Vol. 50%',   action: { type: 'volume-set', volumePercent: 50 }, iconoCatalogo: 'acciones:volume' },
  { category: 'MEDIA', label: 'Vol. 80%',   action: { type: 'volume-set', volumePercent: 80 }, iconoCatalogo: 'acciones:volume-2' },
  // Volumen por app (roadmap 63): los equivalentes de botón de las perillas.
  { category: 'MEDIA', label: 'App Vol. −', icon: 'SPEAKER', action: { type: 'app-volume', appVolumeMode: 'adjust', appVolumeDelta: -5 }, iconoCatalogo: 'acciones:volume' },
  { category: 'MEDIA', label: 'App Vol. +', icon: 'SPEAKER', action: { type: 'app-volume', appVolumeMode: 'adjust', appVolumeDelta: 5 }, iconoCatalogo: 'acciones:volume' },
  { category: 'MEDIA', label: 'App Mute', icon: 'VOLUME_MUTE', action: { type: 'app-volume', appVolumeMode: 'mute' }, iconoCatalogo: 'acciones:volume-off' },
  { category: 'MEDIA', label: 'Spotify Vol. −', icon: 'SPEAKER', bgColor: '#1a3320', fgColor: '#1DB954', action: { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'adjust', appVolumeDelta: -5 }, iconoCatalogo: 'marcas:spotify' },
  { category: 'MEDIA', label: 'Spotify Vol. +', icon: 'SPEAKER', bgColor: '#1a3320', fgColor: '#1DB954', action: { type: 'app-volume', appVolumeTarget: 'spotify', appVolumeMode: 'adjust', appVolumeDelta: 5 }, iconoCatalogo: 'marcas:spotify' },
  { category: 'MEDIA', label: 'Discord Vol. −', icon: 'SPEAKER', bgColor: '#1e1f40', fgColor: '#7289da', action: { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'adjust', appVolumeDelta: -5 }, iconoCatalogo: 'marcas:discord' },
  { category: 'MEDIA', label: 'Discord Vol. +', icon: 'SPEAKER', bgColor: '#1e1f40', fgColor: '#7289da', action: { type: 'app-volume', appVolumeTarget: 'discord', appVolumeMode: 'adjust', appVolumeDelta: 5 }, iconoCatalogo: 'marcas:discord' },
  // SISTEMA
  { category: 'SISTEMA', label: 'Brillo Táctil (H)', icon: 'WEATHER_SUN', bgColor: '#242014', fgColor: '#facc15', action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 0 }, widget: 'slider', sliderWidget: { target: 'brightness', min: 0, max: 100, step: 5, orientation: 'horizontal', showValue: true }, iconoCatalogo: 'acciones:brightness' },
  { category: 'SISTEMA', label: 'Fader Brillo (V)', icon: 'WEATHER_SUN', bgColor: '#242014', fgColor: '#facc15', action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 0 }, widget: 'slider', sliderWidget: { target: 'brightness', min: 0, max: 100, step: 5, orientation: 'vertical', showValue: true }, iconoCatalogo: 'acciones:brightness' },
  { category: 'SISTEMA', label: 'Bloquear PC', icon: 'LOCK', bgColor: '#1a0a0a', fgColor: '#d95f5f', action: { type: 'script', script: 'rundll32.exe user32.dll,LockWorkStation', scriptShell: 'cmd' }, iconoCatalogo: 'acciones:lock' },
  { category: 'SISTEMA', label: 'Escritorio', icon: 'MINIMIZE', action: { type: 'script', script: '(New-Object -ComObject Shell.Application).MinimizeAll()', scriptShell: 'powershell' } },
  { category: 'SISTEMA', label: 'Captura', icon: 'SCISSORS', action: { type: 'hotkey', hotkey: 'Win+Shift+S' }, iconoCatalogo: 'acciones:screenshot' },
  { category: 'SISTEMA', label: 'Screenshot', icon: 'FULLSCREEN', action: { type: 'hotkey', hotkey: 'PrintScreen' }, iconoCatalogo: 'acciones:screenshot' },
  { category: 'SISTEMA', label: 'Hibernar', icon: 'CLOCK', bgColor: '#0a0a1a', fgColor: '#6688cc', action: { type: 'script', script: 'shutdown /h', scriptShell: 'cmd' }, iconoCatalogo: 'acciones:zzz' },
  { category: 'SISTEMA', label: 'Apagar (30s)', icon: 'BOLT', bgColor: '#1a0808', fgColor: '#d95f5f', action: { type: 'script', script: 'shutdown /s /t 30', scriptShell: 'cmd' }, iconoCatalogo: 'acciones:power' },
  { category: 'SISTEMA', label: 'Reiniciar', icon: 'DOTS', bgColor: '#0a1a0a', fgColor: '#4caf7d', action: { type: 'script', script: 'shutdown /r /t 30', scriptShell: 'cmd' }, iconoCatalogo: 'acciones:refresh' },
  { category: 'SISTEMA', label: 'Brillo 30%', icon: 'WEATHER_SUN', action: { type: 'brightness', brightnessLevel: 30 }, iconoCatalogo: 'acciones:brightness' },
  { category: 'SISTEMA', label: 'Brillo +', icon: 'ARROW_UP', action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: 10 }, iconoCatalogo: 'acciones:brightness-up' },
  { category: 'SISTEMA', label: 'Brillo -', icon: 'ARROW_DOWN', action: { type: 'adjust', adjustTarget: 'brightness', adjustDelta: -10 }, iconoCatalogo: 'acciones:brightness-down' },
  { category: 'SISTEMA', label: 'Volumen +', icon: 'ARROW_UP', action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: 10 }, iconoCatalogo: 'acciones:volume' },
  { category: 'SISTEMA', label: 'Volumen -', icon: 'ARROW_DOWN', action: { type: 'adjust', adjustTarget: 'volume', adjustDelta: -10 }, iconoCatalogo: 'acciones:volume-2' },
  { category: 'SISTEMA', label: 'Brillo 70%', icon: 'WEATHER_SUN', action: { type: 'brightness', brightnessLevel: 70 }, iconoCatalogo: 'acciones:brightness' },
  { category: 'SISTEMA', label: 'Brillo 100%', icon: 'WEATHER_SUN', action: { type: 'brightness', brightnessLevel: 100 }, iconoCatalogo: 'acciones:brightness' },
  { category: 'SISTEMA', label: 'Portapapeles', icon: 'STORAGE', action: { type: 'hotkey', hotkey: 'Win+V' }, iconoCatalogo: 'acciones:clipboard' },
  { category: 'SISTEMA', label: 'Vincular Móvil', icon: 'PIN', bgColor: '#111827', fgColor: '#38bdf8', action: { type: 'mobile-remote', mobileRemoteAction: 'pair-code' }, iconoCatalogo: 'acciones:device-mobile' },
  { category: 'SISTEMA', label: 'Servidor Móvil', icon: 'BOLT', bgColor: '#181b20', fgColor: '#4ade80', action: { type: 'mobile-remote', mobileRemoteAction: 'toggle-server' }, iconoCatalogo: 'acciones:server' },
  { category: 'SISTEMA', label: 'PÁG. SIGUIENTE', icon: 'NEXT', action: { type: 'page-nav', pageNav: 'next' }, fijo: true, iconoCatalogo: 'acciones:arrow-right' },
  { category: 'SISTEMA', label: 'PÁG. ANTERIOR', icon: 'PREV', action: { type: 'page-nav', pageNav: 'prev' }, fijo: true, iconoCatalogo: 'acciones:arrow-left' },
  { category: 'SISTEMA', label: 'CAMBIAR PÁGINA', icon: 'NEXT', action: { type: 'page-nav', pageNav: 'cycle' }, fijo: true, iconoCatalogo: 'acciones:repeat' },
  { category: 'SISTEMA', label: 'Multitarea', icon: 'MONITOR', action: { type: 'hotkey', hotkey: 'Win+Tab' }, isToggle: true, actionToggleOff: { type: 'hotkey', hotkey: 'Esc' }, iconoCatalogo: 'acciones:layout-grid' },
  { category: 'SISTEMA', label: 'VENTANA ANT.', icon: 'PREV', action: { type: 'window-cycle', windowCycle: 'prev' }, iconoCatalogo: 'acciones:arrow-left' },
  { category: 'SISTEMA', label: 'VENTANA SIG.', icon: 'NEXT', action: { type: 'window-cycle', windowCycle: 'next' }, iconoCatalogo: 'acciones:arrow-right' },
  // CREATIVO — Illustrator
  { category: 'CREATIVO', label: 'AI Selección', icon: 'KEYBOARD', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'V' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  { category: 'CREATIVO', label: 'AI Sel. Dir.', icon: 'KEYBOARD', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'A' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  { category: 'CREATIVO', label: 'AI Pluma', icon: 'KEYBOARD', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'P' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  { category: 'CREATIVO', label: 'AI Tipo', icon: 'KEYBOARD', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'T' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  { category: 'CREATIVO', label: 'AI Agrupar', icon: 'ADD', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+G' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  { category: 'CREATIVO', label: 'AI Desagrupar', icon: 'SUBTRACT', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+G' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  { category: 'CREATIVO', label: 'AI Exportar', icon: 'EXPORT', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+E' }, iconoCatalogo: 'acciones:brand-adobe-illustrator' },
  // CREATIVO — Photoshop
  { category: 'CREATIVO', label: 'PS Pincel', icon: 'KEYBOARD', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'B' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  { category: 'CREATIVO', label: 'PS Clone', icon: 'KEYBOARD', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'S' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  { category: 'CREATIVO', label: 'PS Curvas', icon: 'AUDIO_WAVE', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+M' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  { category: 'CREATIVO', label: 'PS Niveles', icon: 'ARROW_UP', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+L' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  { category: 'CREATIVO', label: 'PS Dup. Capa', icon: 'ADD', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+J' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  { category: 'CREATIVO', label: 'PS Sello', icon: 'ADD', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Alt+E' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  { category: 'CREATIVO', label: 'PS Mask', icon: 'FULLSCREEN', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+Alt+G' }, iconoCatalogo: 'acciones:brand-adobe-photoshop' },
  // CREATIVO — Premiere Pro
  { category: 'CREATIVO', label: 'PR Play', icon: 'PLAY', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Space' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  { category: 'CREATIVO', label: 'PR Marcar In', icon: 'KEYBOARD', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'I' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  { category: 'CREATIVO', label: 'PR Marcar Out', icon: 'KEYBOARD', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'O' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  { category: 'CREATIVO', label: 'PR Cortar', icon: 'SCISSORS', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Ctrl+K' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  { category: 'CREATIVO', label: 'PR Rip. Del.', icon: 'SUBTRACT', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+D' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  { category: 'CREATIVO', label: 'PR Exportar', icon: 'EXPORT', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Ctrl+M' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  { category: 'CREATIVO', label: 'PR Marcador', icon: 'DOTS', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'M' }, iconoCatalogo: 'acciones:brand-adobe-premiere' },
  // RGB — colores estáticos
  { category: 'RGB', label: 'RGB Apagar', icon: 'MINIMIZE', bgColor: '#0a0a0a', fgColor: '#666666', action: { type: 'rgb-color', rgbColor: '#000000' } },
  { category: 'RGB', label: 'RGB Rojo',   icon: 'SPARKLE', bgColor: '#1a0000', fgColor: '#ff3030', action: { type: 'rgb-color', rgbColor: '#ff0000' } },
  { category: 'RGB', label: 'RGB Verde',  icon: 'SPARKLE', bgColor: '#001a00', fgColor: '#30ff30', action: { type: 'rgb-color', rgbColor: '#00ff00' } },
  { category: 'RGB', label: 'RGB Azul',   icon: 'SPARKLE', bgColor: '#00001a', fgColor: '#3030ff', action: { type: 'rgb-color', rgbColor: '#0000ff' } },
  { category: 'RGB', label: 'RGB Blanco', icon: 'SPARKLE', bgColor: '#1a1a1a', fgColor: '#ffffff', action: { type: 'rgb-color', rgbColor: '#ffffff' } },
  // RGB — presets inteligentes
  { category: 'RGB', label: 'RGB Off',        icon: 'MINIMIZE', bgColor: '#050505', fgColor: '#444444', action: { type: 'rgb-preset', rgbPresetId: 'off' } },
  { category: 'RGB', label: 'RGB Gaming',     icon: 'SPARKLE', bgColor: '#1a0000', fgColor: '#ff3300', action: { type: 'rgb-preset', rgbPresetId: 'gaming' } },
  { category: 'RGB', label: 'RGB Cinema',     icon: 'SPARKLE', bgColor: '#0a0000', fgColor: '#aa2233', action: { type: 'rgb-preset', rgbPresetId: 'cinema' } },
  { category: 'RGB', label: 'RGB Trabajo',    icon: 'SPARKLE', bgColor: '#111116', fgColor: '#c8d8ff', action: { type: 'rgb-preset', rgbPresetId: 'work' } },
  { category: 'RGB', label: 'RGB Arcoiris',   icon: 'SPARKLE', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'rgb-preset', rgbPresetId: 'rainbow' } },
  { category: 'RGB', label: 'RGB Noche Azul', icon: 'SPARKLE', bgColor: '#000010', fgColor: '#0055ff', action: { type: 'rgb-preset', rgbPresetId: 'night-blue' } },
  { category: 'RGB', label: 'RGB Alerta',     icon: 'SPARKLE', bgColor: '#1a0000', fgColor: '#ff0000', action: { type: 'rgb-preset', rgbPresetId: 'alert-red' } },
  { category: 'RGB', label: 'RGB Lectura',    icon: 'SPARKLE', bgColor: '#1a1206', fgColor: '#ff9d3c', action: { type: 'rgb-preset', rgbPresetId: 'reading' } },
  { category: 'RGB', label: 'RGB Foco',       icon: 'SPARKLE', bgColor: '#0d141a', fgColor: '#cfe6ff', action: { type: 'rgb-preset', rgbPresetId: 'focus' } },
  { category: 'RGB', label: 'RGB Tenue',      icon: 'MINIMIZE', bgColor: '#0a0a0a', fgColor: '#9a9a9a', action: { type: 'rgb-preset', rgbPresetId: 'dim' } },
  { category: 'RGB', label: 'RGB Atardecer',  icon: 'SPARKLE', bgColor: '#1a0800', fgColor: '#ff5c1a', action: { type: 'rgb-preset', rgbPresetId: 'sunset' } },
  { category: 'RGB', label: 'RGB Oceano',     icon: 'SPARKLE', bgColor: '#001016', fgColor: '#00a0c8', action: { type: 'rgb-preset', rgbPresetId: 'ocean' } },
  { category: 'RGB', label: 'RGB Bosque',     icon: 'SPARKLE', bgColor: '#001a0c', fgColor: '#1fa04a', action: { type: 'rgb-preset', rgbPresetId: 'forest' } },
  { category: 'RGB', label: 'RGB Vela',       icon: 'SPARKLE', bgColor: '#160c00', fgColor: '#ff8a2a', action: { type: 'rgb-preset', rgbPresetId: 'candle' } },
  { category: 'RGB', label: 'RGB Violeta',    icon: 'SPARKLE', bgColor: '#12001a', fgColor: '#8a2be2', action: { type: 'rgb-preset', rgbPresetId: 'violet' } },
  { category: 'RGB', label: 'RGB Ola',        icon: 'SPARKLE', bgColor: '#001418', fgColor: '#00d0ff', action: { type: 'rgb-preset', rgbPresetId: 'wave' } },
  { category: 'RGB', label: 'RGB Fiesta',     icon: 'SPARKLE', bgColor: '#140014', fgColor: '#ff40c0', action: { type: 'rgb-preset', rgbPresetId: 'party' } },
  { category: 'RGB', label: 'RGB Estrobo',    icon: 'SPARKLE', bgColor: '#141414', fgColor: '#ffffff', action: { type: 'rgb-preset', rgbPresetId: 'strobe' } },
];

/**
 * Las pestanas del catalogo de presets.
 *
 * **Se derivan de `PRESETS`**, no se escriben a mano. Escritas a mano faltaba
 * 'RGB', asi que los doce botones sembrados de esa categoria no salian por
 * ninguna pestana: solo aparecian si el usuario escribia en el buscador. El
 * tipo si la declaraba, o sea que ni TypeScript lo veia.
 *
 * El orden es el de aparicion en `PRESETS`, que ya esta agrupado por
 * categoria.
 */
export const PRESET_CATEGORIES: ButtonPreset['category'][] =
  [...new Set(PRESETS.map((p) => p.category))];


export const FOLDER_PRESETS: Record<string, { label: string; icon: string; bgColor: string; fgColor: string; buttons: FolderButton[] }> = {
  illustrator: {
    label: 'Illustrator', icon: 'FOLDER', bgColor: '#1a0d00', fgColor: '#ff9a00',
    buttons: [
      { label: 'Selección', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'V' } },
      { label: 'Sel. Directa', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'A' } },
      { label: 'Pluma', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'P' } },
      { label: 'Tipo', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'T' } },
      { label: 'Rectángulo', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'M' } },
      { label: 'Elipse', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'L' } },
      { label: 'Zoom +', icon: 'ADD', action: { type: 'hotkey', hotkey: 'Ctrl+=' } },
      { label: 'Zoom −', icon: 'SUBTRACT', action: { type: 'hotkey', hotkey: 'Ctrl+-' } },
      { label: 'Agrupar', icon: 'ADD', action: { type: 'hotkey', hotkey: 'Ctrl+G' } },
      { label: 'Desagrupar', icon: 'SUBTRACT', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+G' } },
      { label: 'Exportar', icon: 'EXPORT', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+E' } },
      { label: 'Guardar', icon: 'STORAGE', action: { type: 'hotkey', hotkey: 'Ctrl+S' } },
    ],
  },
  photoshop: {
    label: 'Photoshop', icon: 'FOLDER', bgColor: '#001a2a', fgColor: '#00c8ff',
    buttons: [
      { label: 'Pincel', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'B' } },
      { label: 'Clone', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'S' } },
      { label: 'Marquesina', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'M' } },
      { label: 'Lazo', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'L' } },
      { label: 'Curvas', icon: 'AUDIO_WAVE', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+M' } },
      { label: 'Niveles', icon: 'ARROW_UP', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+L' } },
      { label: 'Dup. Capa', icon: 'ADD', action: { type: 'hotkey', hotkey: 'Ctrl+J' } },
      { label: 'Sello vis.', icon: 'ADD', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Alt+E' } },
      { label: 'Deshacer', icon: 'UNDO', action: { type: 'hotkey', hotkey: 'Ctrl+Alt+Z' } },
      { label: 'Rehacer', icon: 'ROTATE_CW', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' } },
      { label: 'Mask', icon: 'FULLSCREEN', action: { type: 'hotkey', hotkey: 'Ctrl+Alt+G' } },
      { label: 'Guardar', icon: 'STORAGE', action: { type: 'hotkey', hotkey: 'Ctrl+S' } },
    ],
  },
  premiere: {
    label: 'Premiere', icon: 'FOLDER', bgColor: '#0a001a', fgColor: '#9999ff',
    buttons: [
      { label: 'Play/Pausa', icon: 'PLAY', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Space' } },
      { label: 'Marcar In', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'I' } },
      { label: 'Marcar Out', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'O' } },
      { label: 'Cortar', icon: 'SCISSORS', fgColor: '#ff6688', action: { type: 'hotkey', hotkey: 'Ctrl+K' } },
      { label: 'Rip. Delete', icon: 'SUBTRACT', fgColor: '#ff6688', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+D' } },
      { label: 'Disolver', icon: 'DOTS', action: { type: 'hotkey', hotkey: 'Ctrl+D' } },
      { label: 'Marcador', icon: 'SPARKLE', action: { type: 'hotkey', hotkey: 'M' } },
      { label: 'Tipo', icon: 'KEYBOARD', action: { type: 'hotkey', hotkey: 'T' } },
      { label: 'Deshacer', icon: 'UNDO', action: { type: 'hotkey', hotkey: 'Ctrl+Z' } },
      { label: 'Rehacer', icon: 'ROTATE_CW', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' } },
      { label: 'Exportar', icon: 'EXPORT', fgColor: '#4caf7d', action: { type: 'hotkey', hotkey: 'Ctrl+M' } },
      { label: 'Guardar', icon: 'STORAGE', action: { type: 'hotkey', hotkey: 'Ctrl+S' } },
    ],
  },
};
