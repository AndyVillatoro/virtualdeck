import React, { CSSProperties } from 'react';
import { VD } from '../design';

interface WallpaperProps {
  kind?: 'solid' | 'gradient' | 'dotgrid' | 'photo' | 'scanlines';
  style?: CSSProperties;
}

export function Wallpaper({ kind = 'solid', style = {} }: WallpaperProps) {
  const common: CSSProperties = { position: 'absolute', inset: 0, ...style };

  if (kind === 'solid') {
    return <div style={{ ...common, background: VD.bg }} />;
  }
  if (kind === 'gradient') {
    return <div style={{ ...common, background: 'radial-gradient(ellipse at 30% 20%, #1a1a2e 0%, #0a0a0d 60%)' }} />;
  }
  if (kind === 'dotgrid') {
    return (
      <div
        style={{
          ...common,
          background: `radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / 14px 14px, ${VD.bg}`,
        }}
      />
    );
  }
  if (kind === 'photo') {
    return (
      <div
        style={{
          ...common,
          background: 'linear-gradient(135deg, #2a1a3d 0%, #0d1a2e 50%, #1a0d2e 100%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            background:
              'radial-gradient(circle at 70% 30%, rgba(255,61,61,0.3) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(100,100,255,0.25) 0%, transparent 50%)',
          }}
        />
      </div>
    );
  }
  if (kind === 'scanlines') {
    return (
      <div
        style={{
          ...common,
          background: `repeating-linear-gradient(0deg, #0a0a0d 0px, #0a0a0d 2px, #0d0d12 2px, #0d0d12 3px)`,
        }}
      />
    );
  }
  return null;
}
