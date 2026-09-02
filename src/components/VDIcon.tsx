import React from 'react';

export interface VDIconProps {
  size?: number;
  color?: string;      // overrides CSS stroke via inline style
  strokeWidth?: number; // accepted for Lucide compatibility, not used
  className?: string;
  style?: React.CSSProperties;
}

function Ico({ size = 24, color, style, className, children }: VDIconProps & { children: React.ReactNode }) {
  const s: React.CSSProperties = color ? { stroke: color, ...style } : (style ?? {});
  return (
    <svg
      className={`vd-icon${className ? ' ' + className : ''}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={Object.keys(s).length ? s : undefined}
    >
      {children}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// GROUP 1 — Tipos de acción
// ─────────────────────────────────────────────────────────────────

export function IconNone(p: VDIconProps) {
  return <Ico {...p}><circle className="anim-spin" cx="12" cy="12" r="7" strokeDasharray="2 2.2" /></Ico>;
}

export function IconApp(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="5" width="18" height="12" rx="2"/>
    <line x1="8" y1="20" x2="16" y2="20"/>
    <line x1="12" y1="17" x2="12" y2="20"/>
  </Ico>;
}

export function IconWeb(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="12" cy="12" r="8"/>
    <ellipse cx="12" cy="12" rx="3.5" ry="8"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
  </Ico>;
}

export function IconShortcut(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M10 14a4 4 0 0 1 0-5.6l2-2a4 4 0 0 1 5.6 5.6L16 13.5"/>
    <path d="M14 10a4 4 0 0 1 0 5.6l-2 2a4 4 0 0 1-5.6-5.6L8 10.5"/>
  </Ico>;
}

export function IconScript(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="5,9 9,12 5,15"/>
    <line className="anim-cursor" x1="11" y1="16" x2="19" y2="16"/>
  </Ico>;
}

export function IconAudioDevice(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2"/>
    <rect x="3" y="14" width="4" height="6" rx="1.5"/>
    <rect x="17" y="14" width="4" height="6" rx="1.5"/>
  </Ico>;
}

export function IconHotkey(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4" y="6" width="16" height="12" rx="2"/>
    <path d="M15 10v2a1.5 1.5 0 0 1-1.5 1.5H9"/>
    <polyline points="11,11.5 9,13.5 11,15.5"/>
  </Ico>;
}

export function IconClipboard(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="5" y="5" width="14" height="16" rx="2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </Ico>;
}

export function IconTypeText(p: VDIconProps) {
  return <Ico {...p}>
    <line x1="5" y1="7" x2="14" y2="7"/>
    <line x1="5" y1="12" x2="11" y2="12"/>
    <line x1="5" y1="17" x2="13" y2="17"/>
    <line className="anim-cursor" x1="18" y1="5" x2="18" y2="19"/>
    <line x1="16.5" y1="5" x2="19.5" y2="5"/>
    <line x1="16.5" y1="19" x2="19.5" y2="19"/>
  </Ico>;
}

export function IconKillProcess(p: VDIconProps) {
  return <Ico {...p}>
    <circle className="danger" cx="12" cy="12" r="8"/>
    <line className="danger" x1="9" y1="9" x2="15" y2="15"/>
    <line className="danger" x1="15" y1="9" x2="9" y2="15"/>
  </Ico>;
}

export function IconVolumeSet(p: VDIconProps) {
  return <Ico {...p}>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <circle cx="14" cy="12" r="2.5" style={{ fill: 'var(--vd-accent)', stroke: 'var(--vd-accent)' }}/>
  </Ico>;
}

export function IconFolder(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
    <polyline points="13,11 16,13 13,15"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
  </Ico>;
}

export function IconMediaPlayPause(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="5,6 5,18 14,12" className="fill-stroke"/>
    <line x1="17" y1="7" x2="17" y2="17"/>
    <line x1="20" y1="7" x2="20" y2="17"/>
  </Ico>;
}

export function IconMediaNext(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="6,6 6,18 15,12" className="fill-stroke"/>
    <line x1="17.5" y1="6" x2="17.5" y2="18"/>
  </Ico>;
}

export function IconMediaPrev(p: VDIconProps) {
  return <Ico {...p}>
    <line x1="6.5" y1="6" x2="6.5" y2="18"/>
    <polygon points="18,6 18,18 9,12" className="fill-stroke"/>
  </Ico>;
}

export function IconVolumeUp(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="4,10 4,14 8,14 12,18 12,6 8,10" className="fill-stroke"/>
    <path className="anim-wave1" d="M15 9a4 4 0 0 1 0 6"/>
    <path className="anim-wave2" d="M17.5 7a7 7 0 0 1 0 10"/>
  </Ico>;
}

export function IconVolumeDown(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="4,10 4,14 8,14 12,18 12,6 8,10" className="fill-stroke"/>
    <path className="anim-wave1" d="M15 10a3 3 0 0 1 0 4"/>
  </Ico>;
}

export function IconMute(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="4,10 4,14 8,14 12,18 12,6 8,10" className="fill-stroke"/>
    <line className="danger" x1="15" y1="9" x2="20" y2="15"/>
    <line className="danger" x1="20" y1="9" x2="15" y2="15"/>
  </Ico>;
}

export function IconBrightness(p: VDIconProps) {
  return <Ico {...p}>
    <g className="anim-spin" style={{ transformOrigin: '12px 12px' }}>
      <circle cx="12" cy="12" r="3.5"/>
      <line x1="12" y1="3" x2="12" y2="5.5"/>
      <line x1="12" y1="18.5" x2="12" y2="21"/>
      <line x1="3" y1="12" x2="5.5" y2="12"/>
      <line x1="18.5" y1="12" x2="21" y2="12"/>
      <line x1="5.6" y1="5.6" x2="7.4" y2="7.4"/>
      <line x1="16.6" y1="16.6" x2="18.4" y2="18.4"/>
      <line x1="5.6" y1="18.4" x2="7.4" y2="16.6"/>
      <line x1="16.6" y1="7.4" x2="18.4" y2="5.6"/>
    </g>
  </Ico>;
}

export function IconNotify(p: VDIconProps) {
  return <Ico {...p}>
    <g className="anim-bell">
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/>
      <path d="M10 19a2 2 0 0 0 4 0"/>
    </g>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 2 — Controles de media (tamaño grande)
// ─────────────────────────────────────────────────────────────────

export function IconMediaSkipBack(p: VDIconProps) {
  return <Ico {...p}>
    <line x1="6" y1="5" x2="6" y2="19"/>
    <polygon points="19,5 19,19 8,12" className="fill-stroke"/>
  </Ico>;
}

export function IconMediaPlay(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="7,5 7,19 19,12" style={{ fill: 'var(--vd-stroke)', fillOpacity: 0.5, stroke: 'var(--vd-stroke)' }}/>
  </Ico>;
}

/** Nota musical. Hueco de la caratula cuando no hay imagen. */
export function IconMusic(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M9 18V5l10-2v13"/>
    <circle cx="6" cy="18" r="3" className="fill-stroke"/>
    <circle cx="16" cy="16" r="3" className="fill-stroke"/>
  </Ico>;
}

export function IconMediaPause(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="8" y="5" width="2.5" height="14" rx="1" className="fill-stroke"/>
    <rect x="13.5" y="5" width="2.5" height="14" rx="1" className="fill-stroke"/>
  </Ico>;
}

export function IconMediaSkipForward(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="5,5 5,19 16,12" className="fill-stroke"/>
    <line x1="18" y1="5" x2="18" y2="19"/>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 3 — Interfaz / barra de título
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GROUP 4 — Sistema / widgets
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GROUP 5 — Menú contextual
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GROUP 6 — Páginas / tabs
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GROUP 7 — Estados del botón
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GROUP 8 — Clima
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// GROUP 9 — Presets creativos
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// Convenience map — same keys as ACTION_ICONS in ButtonCell
// ─────────────────────────────────────────────────────────────────

export const VD_ACTION_ICONS: Record<string, React.ComponentType<VDIconProps>> = {
  none:              IconNone,
  app:               IconApp,
  web:               IconWeb,
  shortcut:          IconShortcut,
  script:            IconScript,
  'audio-device':    IconAudioDevice,
  hotkey:            IconHotkey,
  'media-play-pause':IconMediaPlayPause,
  'media-next':      IconMediaNext,
  'media-prev':      IconMediaPrev,
  'volume-up':       IconVolumeUp,
  'volume-down':     IconVolumeDown,
  mute:              IconMute,
  brightness:        IconBrightness,
  clipboard:         IconClipboard,
  'type-text':       IconTypeText,
  'kill-process':    IconKillProcess,
  'volume-set':      IconVolumeSet,
  folder:            IconFolder,
  notify:            IconNotify,
};
