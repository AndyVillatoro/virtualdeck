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

export const ACTION_TYPES: { type: ActionType; label: string; Icon: React.ComponentType<VDIconProps>; desc: string }[] = [
  { type: 'none',             label: 'Ninguno',      Icon: IconNone,            desc: 'Sin acción asignada' },
  { type: 'app',              label: 'Abrir App',    Icon: IconApp,             desc: 'Ejecuta una aplicación' },
  { type: 'web',              label: 'Página Web',   Icon: IconWeb,             desc: 'Abre una URL en el navegador' },
  { type: 'shortcut',         label: 'Acceso Dir.',  Icon: IconShortcut,        desc: 'Abre un archivo o carpeta' },
  { type: 'script',           label: 'Script',       Icon: IconScript,          desc: 'Ejecuta PowerShell o CMD' },
  { type: 'audio-device',     label: 'Audio',        Icon: IconAudioDevice,     desc: 'Cambia dispositivo de salida' },
  { type: 'hotkey',           label: 'Atajo',        Icon: IconHotkey,          desc: 'Envía combinación de teclas' },
  { type: 'clipboard',        label: 'Portapapeles', Icon: IconClipboard,       desc: 'Copia texto al portapapeles' },
  { type: 'type-text',        label: 'Escribir',     Icon: IconTypeText,        desc: 'Escribe texto automáticamente' },
  { type: 'kill-process',     label: 'Cerrar App',   Icon: IconKillProcess,     desc: 'Termina un proceso por nombre' },
  { type: 'volume-set',       label: 'Vol. Exacto',  Icon: IconVolumeSet,       desc: 'Establece volumen a un % exacto' },
  { type: 'folder',           label: 'Carpeta',      Icon: IconFolder,          desc: 'Abre un sub-deck de botones' },
  { type: 'media-play-pause', label: 'Play/Pausa',   Icon: IconMediaPlayPause,  desc: 'Reproducir / Pausar' },
  { type: 'media-next',       label: 'Siguiente',    Icon: IconMediaNext,       desc: 'Siguiente pista' },
  { type: 'media-prev',       label: 'Anterior',     Icon: IconMediaPrev,       desc: 'Pista anterior' },
  { type: 'volume-up',        label: 'Vol. ＋',      Icon: IconVolumeUp,        desc: 'Sube el volumen' },
  { type: 'volume-down',      label: 'Vol. −',       Icon: IconVolumeDown,      desc: 'Baja el volumen' },
  { type: 'mute',             label: 'Silenciar',    Icon: IconMute,            desc: 'Silencia / activa sonido' },
  { type: 'brightness',       label: 'Brillo',       Icon: IconBrightness,      desc: 'Controla brillo del monitor' },
  { type: 'notify',           label: 'Notificación', Icon: IconNotify,          desc: 'Muestra una notificación de Windows' },
  { type: 'set-var',          label: 'Var: Asignar', Icon: IconNotify,          desc: 'Asigna valor a una variable global' },
  { type: 'incr-var',         label: 'Var: Sumar',   Icon: IconNotify,          desc: 'Incrementa o decrementa una variable numérica' },
  { type: 'webhook',          label: 'Webhook',      Icon: IconWeb,             desc: 'POST/GET a una URL con body y headers' },
  { type: 'tts',              label: 'Texto-a-voz',  Icon: IconNotify,          desc: 'Lee un texto en voz alta' },
  { type: 'region-capture',   label: 'Captura',      Icon: IconScript,          desc: 'Abre la captura de región de Windows' },
  { type: 'rgb-color',        label: 'RGB Color',    Icon: IconNotify,          desc: 'Pinta un color sólido en un dispositivo RGB' },
  { type: 'rgb-mode',         label: 'RGB Modo',     Icon: IconNotify,          desc: 'Cambia el modo/efecto RGB (Direct, Breathing, etc.)' },
  { type: 'rgb-profile',      label: 'RGB Perfil',   Icon: IconNotify,          desc: 'Aplica un perfil RGB guardado' },
  { type: 'window-snap',      label: 'Snap Ventana', Icon: IconScript,          desc: 'Mueve y redimensiona una ventana a un cuadrante' },
  { type: 'branch',           label: 'Si / Si no',   Icon: IconNotify,          desc: 'Ejecuta acción A o B según el valor de una variable' },
  { type: 'countdown',        label: 'Temporizador',  Icon: IconScript,          desc: 'Espera N ms y luego ejecuta una acción' },
  { type: 'media-shuffle',    label: 'Shuffle',       Icon: IconMediaPlayPause,  desc: 'Alterna shuffle en el reproductor activo (SMTC)' },
  { type: 'media-repeat',     label: 'Repetir',       Icon: IconMediaNext,       desc: 'Cicla el modo de repetición (ninguno → lista → pista)' },
  { type: 'macro',            label: 'Macro',         Icon: IconScript,          desc: 'Secuencia de teclas y clics de ratón grabada o configurada' },
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
