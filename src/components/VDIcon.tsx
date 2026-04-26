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

export function IconWindowMinimize(p: VDIconProps) {
  return <Ico {...p}><line x1="6" y1="12" x2="18" y2="12"/></Ico>;
}

export function IconWindowClose(p: VDIconProps) {
  return <Ico {...p}>
    <line x1="7" y1="7" x2="17" y2="17"/>
    <line x1="17" y1="7" x2="7" y2="17"/>
  </Ico>;
}

export function IconFullscreenEnter(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="10,4 4,4 4,10"/>
    <polyline points="14,4 20,4 20,10"/>
    <polyline points="14,20 20,20 20,14"/>
    <polyline points="10,20 4,20 4,14"/>
  </Ico>;
}

export function IconFullscreenExit(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="4,10 10,10 10,4"/>
    <polyline points="20,10 14,10 14,4"/>
    <polyline points="20,14 14,14 14,20"/>
    <polyline points="4,14 10,14 10,20"/>
  </Ico>;
}

export function IconSettings(p: VDIconProps) {
  return <Ico {...p}>
    <g className="anim-gear">
      <path d="M12 3.5l1.2 2.2 2.4-.5.6 2.4 2.3.9-.9 2.3.9 2.3-2.3.9-.6 2.4-2.4-.5L12 18l-1.2-2.1-2.4.5-.6-2.4-2.3-.9.9-2.3-.9-2.3 2.3-.9.6-2.4 2.4.5z" transform="translate(0,1.5)"/>
      <circle cx="12" cy="12" r="2.8"/>
    </g>
  </Ico>;
}

export function IconExport(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
    <polyline className="anim-arrow-up" points="8,8 12,4 16,8"/>
    <line className="anim-arrow-up" x1="12" y1="4" x2="12" y2="15"/>
  </Ico>;
}

export function IconImport(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>
    <polyline className="anim-arrow-dn" points="8,11 12,15 16,11"/>
    <line className="anim-arrow-dn" x1="12" y1="4" x2="12" y2="15"/>
  </Ico>;
}

export function IconUndo(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M5 10h9a5 5 0 0 1 0 10h-3"/>
    <polyline points="8,6 4,10 8,14"/>
  </Ico>;
}

export function IconSidebarCollapse(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="14,7 9,12 14,17"/>
    <polyline points="19,7 14,12 19,17"/>
  </Ico>;
}

export function IconSidebarExpand(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="5,7 10,12 5,17"/>
    <polyline points="10,7 15,12 10,17"/>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 4 — Sistema / widgets
// ─────────────────────────────────────────────────────────────────

export function IconCpu(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2"/>
    <rect x="9" y="9" width="6" height="6" rx="1"/>
    <line x1="9" y1="3" x2="9" y2="6"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="15" y1="3" x2="15" y2="6"/>
    <line x1="9" y1="18" x2="9" y2="21"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="15" y1="18" x2="15" y2="21"/>
    <line x1="3" y1="9" x2="6" y2="9"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="3" y1="15" x2="6" y2="15"/>
    <line x1="18" y1="9" x2="21" y2="9"/><line x1="18" y1="12" x2="21" y2="12"/><line x1="18" y1="15" x2="21" y2="15"/>
  </Ico>;
}

export function IconRam(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="7" width="18" height="10" rx="1"/>
    <line x1="7" y1="10" x2="7" y2="14"/>
    <line x1="12" y1="10" x2="12" y2="14"/>
    <line x1="17" y1="10" x2="17" y2="14"/>
    <line x1="6" y1="17" x2="6" y2="20"/>
    <line x1="10" y1="17" x2="10" y2="20"/>
    <line x1="14" y1="17" x2="14" y2="20"/>
    <line x1="18" y1="17" x2="18" y2="20"/>
  </Ico>;
}

export function IconGpu(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="10" width="18" height="8" rx="1"/>
    <circle className="anim-spin" cx="9" cy="14" r="2.3" style={{ transformOrigin: '9px 14px' }}/>
    <circle cx="16" cy="14" r="1" className="fill-stroke"/>
    <line x1="5" y1="18" x2="5" y2="20"/>
    <line x1="19" y1="18" x2="19" y2="20"/>
  </Ico>;
}

export function IconNetworkDown(p: VDIconProps) {
  return <Ico {...p}>
    <path className="anim-wave1" d="M5 10a9 9 0 0 1 14 0"/>
    <path className="anim-wave2" d="M8 13.5a5 5 0 0 1 8 0"/>
    <line className="anim-arrow-dn" x1="12" y1="13" x2="12" y2="20"/>
    <polyline className="anim-arrow-dn" points="9,17 12,20 15,17"/>
  </Ico>;
}

export function IconNetworkUp(p: VDIconProps) {
  return <Ico {...p}>
    <path className="anim-wave1" d="M5 10a9 9 0 0 1 14 0"/>
    <path className="anim-wave2" d="M8 13.5a5 5 0 0 1 8 0"/>
    <line className="anim-arrow-up" x1="12" y1="20" x2="12" y2="13"/>
    <polyline className="anim-arrow-up" points="9,16 12,13 15,16"/>
  </Ico>;
}

export function IconBatteryEmpty(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="16" height="8" rx="2"/>
    <line x1="21" y1="11" x2="21" y2="13"/>
  </Ico>;
}

export function IconBatteryLow(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="16" height="8" rx="2"/>
    <rect x="5" y="10" width="3" height="4" rx="1" style={{ fill: 'var(--vd-danger)', stroke: 'none' }}/>
    <line x1="21" y1="11" x2="21" y2="13"/>
  </Ico>;
}

export function IconBatteryMid(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="16" height="8" rx="2"/>
    <rect x="5" y="10" width="9" height="4" rx="1" className="fill-stroke"/>
    <line x1="21" y1="11" x2="21" y2="13"/>
  </Ico>;
}

export function IconBatteryFull(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="16" height="8" rx="2"/>
    <rect x="5" y="10" width="12" height="4" rx="1" className="fill-stroke"/>
    <line x1="21" y1="11" x2="21" y2="13"/>
  </Ico>;
}

export function IconBatteryCharging(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="16" height="8" rx="2"/>
    <line x1="21" y1="11" x2="21" y2="13"/>
    <polygon className="anim-bolt" points="11,9.5 8,12.5 11,12.5 10,14.5 13,11.5 10,11.5" style={{ fill: 'var(--vd-accent)', stroke: 'var(--vd-accent)' }}/>
  </Ico>;
}

export function IconWeatherRefresh(p: VDIconProps) {
  return <Ico {...p}>
    <g className="anim-spin" style={{ transformOrigin: '12px 12px' }}>
      <path d="M19 12a7 7 0 1 1-2.1-5"/>
      <polyline points="19,5 19,10 14,10"/>
    </g>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 5 — Menú contextual
// ─────────────────────────────────────────────────────────────────

export function IconEdit(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 20l1-4L16 5l3 3L8 19z"/>
    <line x1="14" y1="7" x2="17" y2="10"/>
  </Ico>;
}

export function IconDuplicate(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4" y="4" width="12" height="12" rx="2"/>
    <rect x="8" y="8" width="12" height="12" rx="2"/>
  </Ico>;
}

export function IconClear(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="4,7 20,7"/>
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>
    <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </Ico>;
}

export function IconDragHandle(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="9" cy="6" r="1.2" className="fill-stroke"/>
    <circle cx="15" cy="6" r="1.2" className="fill-stroke"/>
    <circle cx="9" cy="12" r="1.2" className="fill-stroke"/>
    <circle cx="15" cy="12" r="1.2" className="fill-stroke"/>
    <circle cx="9" cy="18" r="1.2" className="fill-stroke"/>
    <circle cx="15" cy="18" r="1.2" className="fill-stroke"/>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 6 — Páginas / tabs
// ─────────────────────────────────────────────────────────────────

export function IconPageAdd(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 9h6l2-3h8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
    <line x1="12" y1="12" x2="12" y2="18"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </Ico>;
}

export function IconPageDelete(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 9h6l2-3h8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
    <line className="danger" x1="10" y1="13" x2="14" y2="17"/>
    <line className="danger" x1="14" y1="13" x2="10" y2="17"/>
  </Ico>;
}

export function IconPageRename(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 9h6l2-3h8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
    <path d="M9 17l.6-2 5-5 1.6 1.6-5 5z"/>
  </Ico>;
}

export function IconPageDrag(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 9h6l2-3h8v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>
    <polyline points="10,13 8,15 10,17"/>
    <polyline points="14,13 16,15 14,17"/>
    <line x1="8" y1="15" x2="16" y2="15"/>
  </Ico>;
}

export function IconGrid3x3(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4" y="4" width="5" height="5" rx="1"/>
    <rect x="10" y="4" width="5" height="5" rx="1"/>
    <rect x="16" y="4" width="5" height="5" rx="1"/>
    <rect x="4" y="10" width="5" height="5" rx="1"/>
    <rect x="10" y="10" width="5" height="5" rx="1"/>
    <rect x="16" y="10" width="5" height="5" rx="1"/>
    <rect x="4" y="16" width="5" height="5" rx="1"/>
    <rect x="10" y="16" width="5" height="5" rx="1"/>
    <rect x="16" y="16" width="5" height="5" rx="1"/>
  </Ico>;
}

export function IconGrid4x4(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4"  y="4"  width="3.5" height="3.5" rx="1"/><rect x="9"  y="4"  width="3.5" height="3.5" rx="1"/>
    <rect x="14" y="4"  width="3.5" height="3.5" rx="1"/><rect x="19" y="4"  width="1"   height="3.5" rx="0.5"/>
    <rect x="4"  y="9"  width="3.5" height="3.5" rx="1"/><rect x="9"  y="9"  width="3.5" height="3.5" rx="1"/>
    <rect x="14" y="9"  width="3.5" height="3.5" rx="1"/><rect x="19" y="9"  width="1"   height="3.5" rx="0.5"/>
    <rect x="4"  y="14" width="3.5" height="3.5" rx="1"/><rect x="9"  y="14" width="3.5" height="3.5" rx="1"/>
    <rect x="14" y="14" width="3.5" height="3.5" rx="1"/><rect x="19" y="14" width="1"   height="3.5" rx="0.5"/>
    <rect x="4"  y="19" width="3.5" height="1"   rx="0.5"/><rect x="9"  y="19" width="3.5" height="1" rx="0.5"/>
    <rect x="14" y="19" width="3.5" height="1"   rx="0.5"/>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 7 — Estados del botón
// ─────────────────────────────────────────────────────────────────

export function IconToggleOn(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="18" height="8" rx="4" style={{ fill: 'var(--vd-accent)', stroke: 'var(--vd-accent)' }}/>
    <circle className="anim-toggle" cx="15" cy="12" r="2.6" style={{ fill: '#1a1a1a', stroke: '#1a1a1a' }}/>
  </Ico>;
}

export function IconToggleOff(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="8" width="18" height="8" rx="4"/>
    <circle cx="9" cy="12" r="2.6" className="fill-stroke"/>
  </Ico>;
}

export function IconMultiAction(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="5" cy="7"  r="1.2" className="fill-stroke"/>
    <line x1="9" y1="7"  x2="19" y2="7"/>
    <circle cx="5" cy="12" r="1.2" className="fill-stroke"/>
    <line x1="9" y1="12" x2="19" y2="12"/>
    <circle cx="5" cy="17" r="1.2" className="fill-stroke"/>
    <line x1="9" y1="17" x2="19" y2="17"/>
  </Ico>;
}

export function IconStatusActive(p: VDIconProps) {
  return <Ico {...p}>
    <circle className="anim-pulse" cx="12" cy="12" r="8" style={{ fill: 'var(--vd-accent)', stroke: 'none', opacity: 0.2 }}/>
    <circle cx="12" cy="12" r="4" style={{ fill: 'var(--vd-accent)', stroke: 'none' }}/>
  </Ico>;
}

export function IconNoImage(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4" y="5" width="16" height="14" rx="2"/>
    <polyline points="4,16 9,11 13,15 16,12 20,16"/>
    <circle cx="15" cy="9" r="1.2" className="fill-stroke"/>
    <line className="danger" x1="6" y1="6" x2="18" y2="18"/>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 8 — Clima
// ─────────────────────────────────────────────────────────────────

export function IconWxSunny(p: VDIconProps) {
  return <Ico {...p}>
    <g className="anim-spin" style={{ transformOrigin: '12px 12px' }}>
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2"    x2="12" y2="5.5"/>
      <line x1="12" y1="18.5" x2="12" y2="22"/>
      <line x1="2"  y1="12"   x2="5.5" y2="12"/>
      <line x1="18.5" y1="12" x2="22" y2="12"/>
      <line x1="4.9"  y1="4.9"  x2="7.4"  y2="7.4"/>
      <line x1="16.6" y1="16.6" x2="19.1" y2="19.1"/>
      <line x1="4.9"  y1="19.1" x2="7.4"  y2="16.6"/>
      <line x1="16.6" y1="7.4"  x2="19.1" y2="4.9"/>
    </g>
  </Ico>;
}

export function IconWxPartlyCloudy(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="9" cy="9" r="3"/>
    <line x1="9" y1="3.5" x2="9" y2="5"/>
    <line x1="3.5" y1="9" x2="5" y2="9"/>
    <line x1="5.1" y1="5.1" x2="6.1" y2="6.1"/>
    <line x1="13" y1="5.1" x2="11.9" y2="6.1"/>
    <path d="M8 19h10a3 3 0 0 0 0-6 4 4 0 0 0-7.5-1.2A3 3 0 0 0 8 19z"/>
  </Ico>;
}

export function IconWxCloudy(p: VDIconProps) {
  return <Ico {...p}>
    <path className="anim-drift" d="M6 18h12a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 6 18z"/>
  </Ico>;
}

export function IconWxOvercast(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M6 18h12a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 6 18z" style={{ fill: 'var(--vd-stroke)', fillOpacity: 0.3, stroke: 'var(--vd-stroke)' }}/>
    <path className="anim-drift" d="M3 20h18" strokeDasharray="3 2"/>
  </Ico>;
}

export function IconWxFog(p: VDIconProps) {
  return <Ico {...p}>
    <line className="anim-drift" x1="4"  y1="8"  x2="20" y2="8"  strokeDasharray="6 3"/>
    <line                        x1="3"  y1="13" x2="21" y2="13" strokeDasharray="3 2"/>
    <line className="anim-drift" x1="5"  y1="18" x2="19" y2="18" strokeDasharray="5 2"/>
  </Ico>;
}

export function IconWxDrizzle(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M6 14h12a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 6 14z"/>
    <line className="anim-rain"   x1="10" y1="16" x2="10" y2="19"/>
    <line className="anim-rain-2" x1="14" y1="16" x2="14" y2="19"/>
  </Ico>;
}

export function IconWxRain(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M6 14h12a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 6 14z"/>
    <line className="anim-rain"   x1="9"  y1="16" x2="9"  y2="20"/>
    <line className="anim-rain-2" x1="12" y1="16" x2="12" y2="20"/>
    <line className="anim-rain-3" x1="15" y1="16" x2="15" y2="20"/>
  </Ico>;
}

export function IconWxHeavyRain(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M6 13h12a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 6 13z"/>
    <line className="anim-rain"   x1="9"  y1="15" x2="7"  y2="20"/>
    <line className="anim-rain-2" x1="13" y1="15" x2="11" y2="20"/>
    <line className="anim-rain-3" x1="17" y1="15" x2="15" y2="20"/>
  </Ico>;
}

export function IconWxSnow(p: VDIconProps) {
  return <Ico {...p}>
    <g className="anim-snow" style={{ transformOrigin: '12px 12px' }}>
      <line x1="12" y1="3"    x2="12" y2="21"/>
      <line x1="3"  y1="12"   x2="21" y2="12"/>
      <line x1="5.6"  y1="5.6"  x2="18.4" y2="18.4"/>
      <line x1="18.4" y1="5.6"  x2="5.6"  y2="18.4"/>
      <polyline points="10,5 12,7 14,5"/>
      <polyline points="10,19 12,17 14,19"/>
      <polyline points="5,10 7,12 5,14"/>
      <polyline points="19,10 17,12 19,14"/>
    </g>
  </Ico>;
}

export function IconWxStorm(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M6 13h12a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.5-1A3.5 3.5 0 0 0 6 13z"/>
    <polygon className="anim-flash" points="12,14 9,19 12,19 10,22 15,17 12,17 13,14" style={{ fill: 'var(--vd-accent)', stroke: 'var(--vd-accent)' }}/>
  </Ico>;
}

export function IconWxUnknown(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M12 4a2.5 2.5 0 0 0-2.5 2.5v9a4 4 0 1 0 5 0v-9A2.5 2.5 0 0 0 12 4z"/>
    <line x1="12" y1="9" x2="12" y2="16"/>
    <circle cx="12" cy="17.5" r="1.6" className="fill-stroke"/>
  </Ico>;
}

// ─────────────────────────────────────────────────────────────────
// GROUP 9 — Presets creativos
// ─────────────────────────────────────────────────────────────────

export function IconCreativeVector(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" style={{ fill: '#3a2418', stroke: '#e07a3a' }}/>
    <text x="12" y="16" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fontSize="9" style={{ fill: '#f2914d', stroke: 'none' }}>VEC</text>
  </Ico>;
}

export function IconCreativeRaster(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" style={{ fill: '#0f1e2e', stroke: '#4a8ef0' }}/>
    <text x="12" y="16" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fontSize="9" style={{ fill: '#4a8ef0', stroke: 'none' }}>RAS</text>
  </Ico>;
}

export function IconCreativeVideo(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" style={{ fill: '#1f1430', stroke: '#9b6ee0' }}/>
    <text x="12" y="16" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontWeight="700" fontSize="9" style={{ fill: '#b58cf0', stroke: 'none' }}>VID</text>
  </Ico>;
}

export function IconSelectTool(p: VDIconProps) {
  return <Ico {...p}>
    <polygon points="6,4 6,19 10,15 12,20 14,19 12,14 17,14" className="fill-stroke"/>
  </Ico>;
}

export function IconPenTool(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M5 19c0-5 4-9 9-14l4 4c-5 5-9 9-14 9z"/>
    <circle cx="10" cy="14" r="1.4" className="fill-stroke"/>
    <line x1="14" y1="5" x2="18" y2="9"/>
  </Ico>;
}

export function IconTextTool(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="5,7 5,5 19,5 19,7"/>
    <line x1="12" y1="5"  x2="12" y2="19"/>
    <line x1="9"  y1="19" x2="15" y2="19"/>
  </Ico>;
}

export function IconBrushTool(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M14 4l6 6-7 7H9v-4z"/>
    <path d="M9 17c0 2-1 3-3 3-0 0 1-1 1-3"/>
  </Ico>;
}

export function IconEraserTool(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M4 16l8-8 6 6-6 6H6z"/>
    <line x1="9" y1="13" x2="15" y2="19"/>
  </Ico>;
}

export function IconZoomTool(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="11" cy="11" r="6"/>
    <line x1="15.5" y1="15.5" x2="20" y2="20"/>
    <line x1="8"  y1="11" x2="14" y2="11"/>
    <line x1="11" y1="8"  x2="11" y2="14"/>
  </Ico>;
}

export function IconExportArrow(p: VDIconProps) {
  return <Ico {...p}>
    <path d="M5 12V6a2 2 0 0 1 2-2h8l4 4v8a2 2 0 0 1-2 2h-3"/>
    <polyline points="15,4 15,8 19,8"/>
    <line className="anim-arrow-up" x1="8" y1="20" x2="8" y2="13"/>
    <polyline className="anim-arrow-up" points="5,16 8,13 11,16"/>
  </Ico>;
}

export function IconCurves(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4" y="4" width="16" height="16" rx="1" style={{ stroke: 'var(--vd-stroke)', opacity: 0.4 }}/>
    <path d="M4 20 C 9 20, 12 12, 12 12 S 15 4, 20 4"/>
    <rect x="10.3" y="10.3" width="3.4" height="3.4" rx="0.5" className="fill-stroke"/>
  </Ico>;
}

export function IconLevels(p: VDIconProps) {
  return <Ico {...p}>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <path d="M4 18 L8 10 L10 14 L12 6 L14 12 L16 9 L20 18 Z" style={{ fill: 'var(--vd-stroke)', fillOpacity: 0.3, stroke: 'var(--vd-stroke)' }}/>
    <polygon points="12,19 10.5,21 13.5,21" className="fill-stroke"/>
  </Ico>;
}

export function IconCloneStamp(p: VDIconProps) {
  return <Ico {...p}>
    <ellipse cx="12" cy="17" rx="7" ry="2"/>
    <rect x="8" y="10" width="8" height="5" rx="1"/>
    <line x1="7" y1="10" x2="17" y2="10"/>
    <path d="M10 10V6a2 2 0 0 1 4 0v4"/>
  </Ico>;
}

export function IconScissorsCut(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="7" cy="7"  r="2.5"/>
    <circle cx="7" cy="17" r="2.5"/>
    <line x1="9" y1="8.5"  x2="20" y2="17"/>
    <line x1="9" y1="15.5" x2="20" y2="7"/>
  </Ico>;
}

export function IconMarkIn(p: VDIconProps) {
  return <Ico {...p}>
    <polyline points="5,5 5,19 8,19"/>
    <polyline points="5,5 8,5"/>
    <line x1="9" y1="12" x2="18" y2="12"/>
    <polyline points="15,9 18,12 15,15"/>
    <circle cx="19.5" cy="12" r="1.2" className="fill-stroke"/>
  </Ico>;
}

export function IconMarkOut(p: VDIconProps) {
  return <Ico {...p}>
    <circle cx="4.5" cy="12" r="1.2" className="fill-stroke"/>
    <line x1="6" y1="12" x2="15" y2="12"/>
    <polyline points="9,9 6,12 9,15"/>
    <polyline points="16,5 19,5 19,19 16,19"/>
  </Ico>;
}

export function IconDissolveTransition(p: VDIconProps) {
  return <Ico {...p}>
    <rect x="4" y="6" width="12" height="12" rx="1" style={{ fill: 'var(--vd-stroke)', fillOpacity: 0.35, stroke: 'var(--vd-stroke)' }}/>
    <rect x="8" y="6" width="12" height="12" rx="1" style={{ fill: 'var(--vd-stroke)', fillOpacity: 0.15, stroke: 'var(--vd-stroke)' }}/>
  </Ico>;
}

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
