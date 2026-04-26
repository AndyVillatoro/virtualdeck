import React, { CSSProperties } from 'react';
import { VD } from '../design';

interface WallpaperProps {
  kind?: string;
  style?: CSSProperties;
}

export function Wallpaper({ kind = 'solid', style = {} }: WallpaperProps) {
  const common: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', ...style };

  if (kind === 'gradient' || kind === 'grid-blue') {
    return <div style={{ ...common, background: 'linear-gradient(135deg, #0d1020 0%, #101828 100%)' }} />;
  }
  if (kind === 'dotgrid') {
    return (
      <div style={{
        ...common,
        background: `radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px) 0 0 / 14px 14px, ${VD.bg}`,
      }} />
    );
  }
  if (kind === 'photo' || kind === 'neon') {
    return (
      <div style={{ ...common, background: 'radial-gradient(circle at 30% 30%, #1a2040 0%, #0f0f1a 60%)' }} />
    );
  }
  if (kind === 'scanlines') {
    return (
      <div style={{
        ...common,
        background: `repeating-linear-gradient(0deg, ${VD.bg} 0px, ${VD.bg} 2px, #131313 2px, #131313 3px)`,
      }} />
    );
  }
  if (kind === 'crt') {
    // 5.2 — Grid CRT con scanlines + viñeta + flicker. Coherente con el lenguaje dot-matrix.
    return (
      <>
        <div style={{
          ...common,
          background:
            'radial-gradient(ellipse at center, rgba(20,30,40,0.0) 50%, rgba(0,0,0,0.45) 100%),' +
            'repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(255,255,255,0.025) 2px, rgba(255,255,255,0.025) 3px),' +
            'repeating-linear-gradient(0deg, #0d1410 0px, #0d1410 14px, #0e1612 14px, #0e1612 28px),' +
            'repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(255,255,255,0.02) 14px, rgba(255,255,255,0.02) 15px)',
        }} />
        <div className="vd-crt-flicker" style={{
          ...common,
          background: 'rgba(74,142,240,0.018)',
          animation: 'vd-crt-flicker 4.2s steps(40,end) infinite',
        }} />
      </>
    );
  }
  if (kind === 'mesh') {
    // 5.2 — Grid sutil tipo papel técnico, 28px de paso.
    return (
      <div style={{
        ...common,
        background:
          'repeating-linear-gradient(0deg, transparent 0px, transparent 27px, rgba(255,255,255,0.04) 27px, rgba(255,255,255,0.04) 28px),' +
          'repeating-linear-gradient(90deg, transparent 0px, transparent 27px, rgba(255,255,255,0.04) 27px, rgba(255,255,255,0.04) 28px),' +
          VD.bg,
      }} />
    );
  }
  // solid (default)
  return <div style={{ ...common, background: VD.bg }} />;
}
