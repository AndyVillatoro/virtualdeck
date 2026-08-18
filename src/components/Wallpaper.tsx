import React, { CSSProperties } from 'react';
import { useTheme } from '../utils/theme';

interface WallpaperProps {
  kind?: string;
  style?: CSSProperties;
}

export function Wallpaper({ kind = 'solid', style = {} }: WallpaperProps) {
  // El tema se lee del contexto y no de la paleta oscura importada: asi el
  // fondo sigue al modo claro en vez de dibujar trama blanca sobre blanco.
  const VD = useTheme();
  const common: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', ...style };

  if (kind === 'gradient' || kind === 'grid-blue') {
    return <div style={{ ...common, background: 'linear-gradient(135deg, #0d1020 0%, #101828 100%)' }} />;
  }
  if (kind === 'dotgrid') {
    return (
      <div style={{
        ...common,
        background: `radial-gradient(rgba(${VD.trama},0.14) 1px, transparent 1px) 0 0 / 14px 14px, ${VD.bg}`,
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
            `repeating-linear-gradient(0deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(${VD.trama},0.06) 2px, rgba(${VD.trama},0.06) 3px),` +
            'repeating-linear-gradient(0deg, #0d1410 0px, #0d1410 14px, #0e1612 14px, #0e1612 28px),' +
            `repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(${VD.trama},0.05) 14px, rgba(${VD.trama},0.05) 15px)`,
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
          `repeating-linear-gradient(0deg, transparent 0px, transparent 27px, rgba(${VD.trama},0.10) 27px, rgba(${VD.trama},0.10) 28px),` +
          `repeating-linear-gradient(90deg, transparent 0px, transparent 27px, rgba(${VD.trama},0.10) 27px, rgba(${VD.trama},0.10) 28px),` +
          VD.bg,
      }} />
    );
  }
  // solid (default)
  return <div style={{ ...common, background: VD.bg }} />;
}
