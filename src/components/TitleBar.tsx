import React from 'react';
import { VD } from '../design';

interface TitleBarProps {
  showControls?: boolean;
  pageName?: string;
  accent?: string;
  onFullscreen?: () => void;
  onWallpaper?: () => void;
}

export function TitleBar({
  showControls = true,
  pageName = 'MAIN',
  accent = 'var(--vd-accent)',
  onFullscreen,
  onWallpaper,
}: TitleBarProps) {
  return (
    <div
      style={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 10,
        borderBottom: `1px solid ${VD.border}`,
        fontFamily: VD.mono,
        fontSize: 11,
        color: VD.textDim,
        flexShrink: 0,
        background: 'rgba(10,10,13,0.6)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
        <span style={{ color: VD.text, letterSpacing: 2, fontSize: 10 }}>VIRTUALDECK</span>
      </div>
      <div style={{ width: 1, height: 14, background: VD.border }} />
      {pageName && <span style={{ fontSize: 10, letterSpacing: 1 }}>{pageName}</span>}
      <div style={{ flex: 1 }} />
      {showControls && (
        <div style={{ display: 'flex', gap: 4 }}>
          {onWallpaper && (
            <button
              onClick={onWallpaper}
              style={{
                height: 22,
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 9,
                letterSpacing: 1,
                color: VD.textDim,
                background: 'transparent',
                border: `1px solid ${VD.border}`,
                borderRadius: 2,
              }}
            >
              WALLPAPER
            </button>
          )}
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: VD.textDim,
                background: 'transparent',
                border: 'none',
                borderRadius: 2,
              }}
              title="Enter kiosk mode"
            >
              ⤢
            </button>
          )}
          {['—', '×'].map((g, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                color: VD.textMuted,
                borderRadius: 2,
              }}
            >
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
