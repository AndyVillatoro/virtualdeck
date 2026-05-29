import type React from 'react';
import {
  IconNone, IconApp, IconWeb, IconShortcut, IconScript, IconAudioDevice, IconHotkey,
  IconClipboard, IconTypeText, IconKillProcess, IconVolumeSet, IconFolder,
  IconMediaPlayPause, IconMediaNext, IconMediaPrev,
  IconVolumeUp, IconVolumeDown, IconMute, IconBrightness, IconNotify,
  type VDIconProps,
} from '../../components/VDIcon';
import type { ActionType, ButtonAction, FolderButton } from '../../types';

export interface ButtonPreset {
  category: 'APPS' | 'WEB' | 'MEDIA' | 'SISTEMA' | 'CREATIVO' | 'RGB';
  label: string;
  sublabel?: string;
  icon?: string;
  bgColor?: string;
  fgColor?: string;
  action: ButtonAction;
}

export const PRESET_CATEGORIES: ButtonPreset['category'][] = ['APPS', 'WEB', 'MEDIA', 'SISTEMA', 'CREATIVO'];

// label/desc son CLAVES i18n (ver `act.*` en src/utils/i18n.tsx). Se resuelven
// con t() en el render. El dict es la fuente única ES/EN; acá no hay texto.
export const ACTION_TYPES: { type: ActionType; label: string; Icon: React.ComponentType<VDIconProps>; desc: string }[] = [
  { type: 'none',             label: 'act.none.label',             Icon: IconNone,            desc: 'act.none.desc' },
  { type: 'app',              label: 'act.app.label',              Icon: IconApp,             desc: 'act.app.desc' },
  { type: 'web',              label: 'act.web.label',              Icon: IconWeb,             desc: 'act.web.desc' },
  { type: 'shortcut',         label: 'act.shortcut.label',         Icon: IconShortcut,        desc: 'act.shortcut.desc' },
  { type: 'script',           label: 'act.script.label',           Icon: IconScript,          desc: 'act.script.desc' },
  { type: 'audio-device',     label: 'act.audio-device.label',     Icon: IconAudioDevice,     desc: 'act.audio-device.desc' },
  { type: 'hotkey',           label: 'act.hotkey.label',           Icon: IconHotkey,          desc: 'act.hotkey.desc' },
  { type: 'clipboard',        label: 'act.clipboard.label',        Icon: IconClipboard,       desc: 'act.clipboard.desc' },
  { type: 'type-text',        label: 'act.type-text.label',        Icon: IconTypeText,        desc: 'act.type-text.desc' },
  { type: 'kill-process',     label: 'act.kill-process.label',     Icon: IconKillProcess,     desc: 'act.kill-process.desc' },
  { type: 'volume-set',       label: 'act.volume-set.label',       Icon: IconVolumeSet,       desc: 'act.volume-set.desc' },
  { type: 'folder',           label: 'act.folder.label',           Icon: IconFolder,          desc: 'act.folder.desc' },
  { type: 'media-play-pause', label: 'act.media-play-pause.label', Icon: IconMediaPlayPause,  desc: 'act.media-play-pause.desc' },
  { type: 'media-next',       label: 'act.media-next.label',       Icon: IconMediaNext,       desc: 'act.media-next.desc' },
  { type: 'media-prev',       label: 'act.media-prev.label',       Icon: IconMediaPrev,       desc: 'act.media-prev.desc' },
  { type: 'volume-up',        label: 'act.volume-up.label',        Icon: IconVolumeUp,        desc: 'act.volume-up.desc' },
  { type: 'volume-down',      label: 'act.volume-down.label',      Icon: IconVolumeDown,      desc: 'act.volume-down.desc' },
  { type: 'mute',             label: 'act.mute.label',             Icon: IconMute,            desc: 'act.mute.desc' },
  { type: 'brightness',       label: 'act.brightness.label',       Icon: IconBrightness,      desc: 'act.brightness.desc' },
  { type: 'notify',           label: 'act.notify.label',           Icon: IconNotify,          desc: 'act.notify.desc' },
  { type: 'set-var',          label: 'act.set-var.label',          Icon: IconNotify,          desc: 'act.set-var.desc' },
  { type: 'incr-var',         label: 'act.incr-var.label',         Icon: IconNotify,          desc: 'act.incr-var.desc' },
  { type: 'webhook',          label: 'act.webhook.label',          Icon: IconWeb,             desc: 'act.webhook.desc' },
  { type: 'tts',              label: 'act.tts.label',              Icon: IconNotify,          desc: 'act.tts.desc' },
  { type: 'region-capture',   label: 'act.region-capture.label',   Icon: IconScript,          desc: 'act.region-capture.desc' },
  { type: 'rgb-color',        label: 'act.rgb-color.label',        Icon: IconNotify,          desc: 'act.rgb-color.desc' },
  { type: 'rgb-mode',         label: 'act.rgb-mode.label',         Icon: IconNotify,          desc: 'act.rgb-mode.desc' },
  { type: 'rgb-profile',      label: 'act.rgb-profile.label',      Icon: IconNotify,          desc: 'act.rgb-profile.desc' },
  { type: 'window-snap',      label: 'act.window-snap.label',      Icon: IconScript,          desc: 'act.window-snap.desc' },
  { type: 'branch',           label: 'act.branch.label',           Icon: IconNotify,          desc: 'act.branch.desc' },
  { type: 'countdown',        label: 'act.countdown.label',        Icon: IconScript,          desc: 'act.countdown.desc' },
  { type: 'media-shuffle',    label: 'act.media-shuffle.label',    Icon: IconMediaPlayPause,  desc: 'act.media-shuffle.desc' },
  { type: 'media-repeat',     label: 'act.media-repeat.label',     Icon: IconMediaNext,       desc: 'act.media-repeat.desc' },
  { type: 'macro',            label: 'act.macro.label',            Icon: IconScript,          desc: 'act.macro.desc' },
];

export const PRESETS: ButtonPreset[] = [
  // APPS
  { category: 'APPS', label: 'Spotify', icon: '♫', bgColor: '#1a3320', fgColor: '#1DB954', action: { type: 'app', appPath: 'spotify' } },
  { category: 'APPS', label: 'Discord', icon: '◈', bgColor: '#1e1f40', fgColor: '#7289da', action: { type: 'app', appPath: '%LOCALAPPDATA%\\Discord\\Update.exe --processStart Discord.exe' } },
  { category: 'APPS', label: 'VS Code', icon: '⌨', bgColor: '#00264d', fgColor: '#4fc3f7', action: { type: 'app', appPath: 'code' } },
  { category: 'APPS', label: 'Chrome', icon: '◉', bgColor: '#1a2a4a', fgColor: '#4a90d9', action: { type: 'app', appPath: 'chrome' } },
  { category: 'APPS', label: 'OBS Studio', icon: '◎', bgColor: '#1a1424', fgColor: '#a78bfa', action: { type: 'app', appPath: 'obs64' } },
  { category: 'APPS', label: 'Steam', icon: '▶', bgColor: '#0d1b2a', fgColor: '#66c0f4', action: { type: 'app', appPath: 'steam' } },
  { category: 'APPS', label: 'Explorador', icon: '◈', action: { type: 'app', appPath: 'explorer.exe' } },
  { category: 'APPS', label: 'Notepad', icon: '⌘', action: { type: 'app', appPath: 'notepad.exe' } },
  { category: 'APPS', label: 'Calculadora', icon: '○', action: { type: 'app', appPath: 'calc.exe' } },
  { category: 'APPS', label: 'Task Mgr', icon: '◎', action: { type: 'app', appPath: 'taskmgr.exe' } },
  // WEB
  { category: 'WEB', label: 'YouTube', icon: '▶', bgColor: '#2a0000', fgColor: '#ff4444', action: { type: 'web', url: 'https://youtube.com' } },
  { category: 'WEB', label: 'ChatGPT', icon: '◎', bgColor: '#002a1a', fgColor: '#10a37f', action: { type: 'web', url: 'https://chat.openai.com' } },
  { category: 'WEB', label: 'Claude', icon: '○', bgColor: '#2a1a0a', fgColor: '#d97706', action: { type: 'web', url: 'https://claude.ai' } },
  { category: 'WEB', label: 'GitHub', icon: '◈', action: { type: 'web', url: 'https://github.com' } },
  { category: 'WEB', label: 'Netflix', icon: '▶', bgColor: '#2a0000', fgColor: '#e50914', action: { type: 'web', url: 'https://netflix.com' } },
  { category: 'WEB', label: 'Twitter/X', action: { type: 'web', url: 'https://x.com' } },
  { category: 'WEB', label: 'Gmail', icon: '◎', bgColor: '#2a0a0a', fgColor: '#ea4335', action: { type: 'web', url: 'https://mail.google.com' } },
  { category: 'WEB', label: 'Twitch', icon: '◉', bgColor: '#1a0033', fgColor: '#9146ff', action: { type: 'web', url: 'https://twitch.tv' } },
  // MEDIA
  { category: 'MEDIA', label: 'Play/Pausa', action: { type: 'media-play-pause' } },
  { category: 'MEDIA', label: 'Siguiente',  action: { type: 'media-next' } },
  { category: 'MEDIA', label: 'Anterior',   action: { type: 'media-prev' } },
  { category: 'MEDIA', label: 'Vol. +',     action: { type: 'volume-up' } },
  { category: 'MEDIA', label: 'Vol. −',     action: { type: 'volume-down' } },
  { category: 'MEDIA', label: 'Silenciar',  action: { type: 'mute' } },
  { category: 'MEDIA', label: 'Vol. 25%',   action: { type: 'volume-set', volumePercent: 25 } },
  { category: 'MEDIA', label: 'Vol. 50%',   action: { type: 'volume-set', volumePercent: 50 } },
  { category: 'MEDIA', label: 'Vol. 80%',   action: { type: 'volume-set', volumePercent: 80 } },
  // SISTEMA
  { category: 'SISTEMA', label: 'Bloquear PC', icon: '◉', bgColor: '#1a0a0a', fgColor: '#d95f5f', action: { type: 'script', script: 'rundll32.exe user32.dll,LockWorkStation', scriptShell: 'cmd' } },
  { category: 'SISTEMA', label: 'Escritorio', icon: '○', action: { type: 'script', script: '(New-Object -ComObject Shell.Application).MinimizeAll()', scriptShell: 'powershell' } },
  { category: 'SISTEMA', label: 'Captura', icon: '⊞', action: { type: 'hotkey', hotkey: 'Win+Shift+S' } },
  { category: 'SISTEMA', label: 'Screenshot', icon: '◻', action: { type: 'hotkey', hotkey: 'PrintScreen' } },
  { category: 'SISTEMA', label: 'Hibernar', icon: '○', bgColor: '#0a0a1a', fgColor: '#6688cc', action: { type: 'script', script: 'shutdown /h', scriptShell: 'cmd' } },
  { category: 'SISTEMA', label: 'Apagar (30s)', icon: '○', bgColor: '#1a0808', fgColor: '#d95f5f', action: { type: 'script', script: 'shutdown /s /t 30', scriptShell: 'cmd' } },
  { category: 'SISTEMA', label: 'Reiniciar', icon: '○', bgColor: '#0a1a0a', fgColor: '#4caf7d', action: { type: 'script', script: 'shutdown /r /t 30', scriptShell: 'cmd' } },
  { category: 'SISTEMA', label: 'Brillo 30%', icon: '☀', action: { type: 'brightness', brightnessLevel: 30 } },
  { category: 'SISTEMA', label: 'Brillo 70%', icon: '☀', action: { type: 'brightness', brightnessLevel: 70 } },
  { category: 'SISTEMA', label: 'Brillo 100%', icon: '☀', action: { type: 'brightness', brightnessLevel: 100 } },
  { category: 'SISTEMA', label: 'Portapapeles', icon: '◈', action: { type: 'hotkey', hotkey: 'Win+V' } },
  // CREATIVO — Illustrator
  { category: 'CREATIVO', label: 'AI Selección', icon: 'V', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'V' } },
  { category: 'CREATIVO', label: 'AI Sel. Dir.', icon: 'A', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'A' } },
  { category: 'CREATIVO', label: 'AI Pluma', icon: 'P', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'P' } },
  { category: 'CREATIVO', label: 'AI Tipo', icon: 'T', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'T' } },
  { category: 'CREATIVO', label: 'AI Agrupar', icon: '⊞', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+G' } },
  { category: 'CREATIVO', label: 'AI Desagrupar', icon: '⊟', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+G' } },
  { category: 'CREATIVO', label: 'AI Exportar', icon: '↗', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+E' } },
  // CREATIVO — Photoshop
  { category: 'CREATIVO', label: 'PS Pincel', icon: 'B', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'B' } },
  { category: 'CREATIVO', label: 'PS Clone', icon: 'S', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'S' } },
  { category: 'CREATIVO', label: 'PS Curvas', icon: '∿', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+M' } },
  { category: 'CREATIVO', label: 'PS Niveles', icon: '▲', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+L' } },
  { category: 'CREATIVO', label: 'PS Dup. Capa', icon: '⊞', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+J' } },
  { category: 'CREATIVO', label: 'PS Sello', icon: '⊕', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Alt+E' } },
  { category: 'CREATIVO', label: 'PS Mask', icon: '◻', bgColor: '#1a0a0a', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+Alt+G' } },
  // CREATIVO — Premiere Pro
  { category: 'CREATIVO', label: 'PR Play', icon: '▶', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Space' } },
  { category: 'CREATIVO', label: 'PR Marcar In', icon: 'I', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'I' } },
  { category: 'CREATIVO', label: 'PR Marcar Out', icon: 'O', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'O' } },
  { category: 'CREATIVO', label: 'PR Cortar', icon: '✂', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Ctrl+K' } },
  { category: 'CREATIVO', label: 'PR Rip. Del.', icon: '⊟', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+D' } },
  { category: 'CREATIVO', label: 'PR Exportar', icon: '↗', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Ctrl+M' } },
  { category: 'CREATIVO', label: 'PR Marcador', icon: '◈', bgColor: '#0a1a0a', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'M' } },
  // RGB — colores estáticos
  { category: 'RGB', label: 'RGB Apagar', icon: '○', bgColor: '#0a0a0a', fgColor: '#666666', action: { type: 'rgb-color', rgbColor: '#000000' } },
  { category: 'RGB', label: 'RGB Rojo',   icon: '●', bgColor: '#1a0000', fgColor: '#ff3030', action: { type: 'rgb-color', rgbColor: '#ff0000' } },
  { category: 'RGB', label: 'RGB Verde',  icon: '●', bgColor: '#001a00', fgColor: '#30ff30', action: { type: 'rgb-color', rgbColor: '#00ff00' } },
  { category: 'RGB', label: 'RGB Azul',   icon: '●', bgColor: '#00001a', fgColor: '#3030ff', action: { type: 'rgb-color', rgbColor: '#0000ff' } },
  { category: 'RGB', label: 'RGB Blanco', icon: '○', bgColor: '#1a1a1a', fgColor: '#ffffff', action: { type: 'rgb-color', rgbColor: '#ffffff' } },
  // RGB — presets inteligentes
  { category: 'RGB', label: 'RGB Off',        icon: '○', bgColor: '#050505', fgColor: '#444444', action: { type: 'rgb-preset', rgbPresetId: 'off' } },
  { category: 'RGB', label: 'RGB Gaming',     icon: '◉', bgColor: '#1a0000', fgColor: '#ff3300', action: { type: 'rgb-preset', rgbPresetId: 'gaming' } },
  { category: 'RGB', label: 'RGB Cinema',     icon: '◐', bgColor: '#0a0000', fgColor: '#aa2233', action: { type: 'rgb-preset', rgbPresetId: 'cinema' } },
  { category: 'RGB', label: 'RGB Trabajo',    icon: '◯', bgColor: '#111116', fgColor: '#c8d8ff', action: { type: 'rgb-preset', rgbPresetId: 'work' } },
  { category: 'RGB', label: 'RGB Arcoiris',   icon: '◈', bgColor: '#0a0a1a', fgColor: '#ff9a00', action: { type: 'rgb-preset', rgbPresetId: 'rainbow' } },
  { category: 'RGB', label: 'RGB Noche Azul', icon: '◉', bgColor: '#000010', fgColor: '#0055ff', action: { type: 'rgb-preset', rgbPresetId: 'night-blue' } },
  { category: 'RGB', label: 'RGB Alerta',     icon: '◉', bgColor: '#1a0000', fgColor: '#ff0000', action: { type: 'rgb-preset', rgbPresetId: 'alert-red' } },
];

export const FOLDER_PRESETS: Record<string, { label: string; icon: string; bgColor: string; fgColor: string; buttons: FolderButton[] }> = {
  illustrator: {
    label: 'Illustrator', icon: 'Ai', bgColor: '#1a0d00', fgColor: '#ff9a00',
    buttons: [
      { label: 'Selección', icon: 'V', action: { type: 'hotkey', hotkey: 'V' } },
      { label: 'Sel. Directa', icon: 'A', action: { type: 'hotkey', hotkey: 'A' } },
      { label: 'Pluma', icon: 'P', action: { type: 'hotkey', hotkey: 'P' } },
      { label: 'Tipo', icon: 'T', action: { type: 'hotkey', hotkey: 'T' } },
      { label: 'Rectángulo', icon: 'M', action: { type: 'hotkey', hotkey: 'M' } },
      { label: 'Elipse', icon: 'L', action: { type: 'hotkey', hotkey: 'L' } },
      { label: 'Zoom +', icon: '+', action: { type: 'hotkey', hotkey: 'Ctrl+=' } },
      { label: 'Zoom −', icon: '−', action: { type: 'hotkey', hotkey: 'Ctrl+-' } },
      { label: 'Agrupar', icon: '⊞', action: { type: 'hotkey', hotkey: 'Ctrl+G' } },
      { label: 'Desagrupar', icon: '⊟', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+G' } },
      { label: 'Exportar', icon: '↗', fgColor: '#ff9a00', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+E' } },
      { label: 'Guardar', icon: '💾', action: { type: 'hotkey', hotkey: 'Ctrl+S' } },
    ],
  },
  photoshop: {
    label: 'Photoshop', icon: 'Ps', bgColor: '#001a2a', fgColor: '#00c8ff',
    buttons: [
      { label: 'Pincel', icon: 'B', action: { type: 'hotkey', hotkey: 'B' } },
      { label: 'Clone', icon: 'S', action: { type: 'hotkey', hotkey: 'S' } },
      { label: 'Marquesina', icon: 'M', action: { type: 'hotkey', hotkey: 'M' } },
      { label: 'Lazo', icon: 'L', action: { type: 'hotkey', hotkey: 'L' } },
      { label: 'Curvas', icon: '∿', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+M' } },
      { label: 'Niveles', icon: '▲', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+L' } },
      { label: 'Dup. Capa', icon: '⊞', action: { type: 'hotkey', hotkey: 'Ctrl+J' } },
      { label: 'Sello vis.', icon: '⊕', fgColor: '#00c8ff', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Alt+E' } },
      { label: 'Deshacer', icon: '↺', action: { type: 'hotkey', hotkey: 'Ctrl+Alt+Z' } },
      { label: 'Rehacer', icon: '↻', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' } },
      { label: 'Mask', icon: '◻', action: { type: 'hotkey', hotkey: 'Ctrl+Alt+G' } },
      { label: 'Guardar', icon: '💾', action: { type: 'hotkey', hotkey: 'Ctrl+S' } },
    ],
  },
  premiere: {
    label: 'Premiere', icon: 'Pr', bgColor: '#0a001a', fgColor: '#9999ff',
    buttons: [
      { label: 'Play/Pausa', icon: '▶', fgColor: '#9999ff', action: { type: 'hotkey', hotkey: 'Space' } },
      { label: 'Marcar In', icon: 'I', action: { type: 'hotkey', hotkey: 'I' } },
      { label: 'Marcar Out', icon: 'O', action: { type: 'hotkey', hotkey: 'O' } },
      { label: 'Cortar', icon: '✂', fgColor: '#ff6688', action: { type: 'hotkey', hotkey: 'Ctrl+K' } },
      { label: 'Rip. Delete', icon: '⊟', fgColor: '#ff6688', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+D' } },
      { label: 'Disolver', icon: '◎', action: { type: 'hotkey', hotkey: 'Ctrl+D' } },
      { label: 'Marcador', icon: '◈', action: { type: 'hotkey', hotkey: 'M' } },
      { label: 'Tipo', icon: 'T', action: { type: 'hotkey', hotkey: 'T' } },
      { label: 'Deshacer', icon: '↺', action: { type: 'hotkey', hotkey: 'Ctrl+Z' } },
      { label: 'Rehacer', icon: '↻', action: { type: 'hotkey', hotkey: 'Ctrl+Shift+Z' } },
      { label: 'Exportar', icon: '↗', fgColor: '#4caf7d', action: { type: 'hotkey', hotkey: 'Ctrl+M' } },
      { label: 'Guardar', icon: '💾', action: { type: 'hotkey', hotkey: 'Ctrl+S' } },
    ],
  },
};
