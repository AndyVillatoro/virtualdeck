import React, { useState } from 'react';
import { VD } from '../design';
import { DotLabel } from '../components/DotLabel';
import type { DeckConfig } from '../types';

interface WallpaperBProps {
  config: DeckConfig;
  onBack: () => void;
  onSave: (wallpaper: string) => void;
}

const WALLPAPERS: { id: string; label: string; preview: string }[] = [
  { id: 'solid', label: 'Sólido', preview: '#0f0f0f' },
  { id: 'gradient', label: 'Gradiente Azul', preview: 'linear-gradient(135deg,#0d1a2e,#1a1a2e)' },
  { id: 'dotgrid', label: 'Cuadrícula Dot', preview: 'repeating-linear-gradient(0deg,#222 0,#222 1px,transparent 0,transparent 14px),repeating-linear-gradient(90deg,#222 0,#222 1px,transparent 0,transparent 14px)' },
  { id: 'scanlines', label: 'Scanlines', preview: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.03) 0,rgba(255,255,255,0.03) 4px)' },
  { id: 'crt', label: 'CRT', preview: 'radial-gradient(ellipse,#0e1612 50%,#000 100%),repeating-linear-gradient(0deg,#0d1410 0,#0d1410 4px,#0e1612 4px,#0e1612 8px)' },
  { id: 'mesh', label: 'Mesh técnico', preview: 'repeating-linear-gradient(0deg,#0f0f0f 0,#0f0f0f 13px,#1a1a1a 13px,#1a1a1a 14px),repeating-linear-gradient(90deg,#0f0f0f 0,#0f0f0f 13px,#1a1a1a 13px,#1a1a1a 14px)' },
  { id: 'photo', label: 'Neón', preview: 'radial-gradient(circle at 30% 30%,#1a2040,#0f0f1a 60%)' },
  { id: 'grid-blue', label: 'Grid Azul', preview: 'linear-gradient(135deg,#0a1020,#101828)' },
];

const PREVIEW_GRID = Array.from({ length: 12 });

export function WallpaperB({ config, onBack, onSave }: WallpaperBProps) {
  const [selected, setSelected] = useState(config.wallpaper || 'solid');
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    onSave(selected);
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  const previewStyle = WALLPAPERS.find((w) => w.id === selected)?.preview ?? '#0f0f0f';

  return (
    <div style={{
      width: '100%', height: '100%', background: VD.bg,
      color: VD.text, fontFamily: VD.font,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Área de vista previa */}
      <div style={{
        flex: '0 0 58%', background: previewStyle, position: 'relative', overflow: 'hidden',
      }}>
        {/* Barra superior flotante */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', background: 'rgba(0,0,0,0.4)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={onBack} style={{
              padding: '6px 12px', background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${VD.border}`, fontFamily: VD.mono,
              fontSize: 10, color: VD.text, letterSpacing: 1, cursor: 'pointer',
            }}>
              ← VOLVER
            </button>
            <DotLabel size={10} color={VD.text} spacing={2}>VISTA PREVIA</DotLabel>
          </div>
        </div>

        {/* Mini-cuadrícula de botones (decorativa) */}
        <div style={{
          position: 'absolute', top: 70, left: 60, right: 60, bottom: 30,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)', gap: 8,
        }}>
          {PREVIEW_GRID.map((_, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: VD.radius.lg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 20, height: 20, borderRadius: VD.radius.md, background: 'rgba(255,255,255,0.15)' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Panel inferior */}
      <div style={{
        flex: 1, background: VD.surface, borderTop: `1px solid ${VD.border}`,
        padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0,
      }}>
        {/* Cabecera + botón aplicar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <DotLabel size={10} color={VD.textMuted} spacing={2}>SELECCIONAR FONDO</DotLabel>
          <button onClick={handleApply} style={{
            padding: '8px 20px', background: applied ? VD.success : VD.accent,
            border: 'none', fontFamily: VD.mono, fontSize: 10, letterSpacing: 2,
            color: '#fff', cursor: 'pointer', borderRadius: VD.radius.sm, transition: 'background 0.3s',
          }}>
            {applied ? '✓ APLICADO' : 'APLICAR →'}
          </button>
        </div>

        {/* Miniaturas */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w.id)}
              style={{
                width: 120, height: 70,
                background: w.preview,
                flexShrink: 0, borderRadius: VD.radius.md,
                border: `2px solid ${selected === w.id ? VD.accent : VD.border}`,
                cursor: 'pointer', position: 'relative', padding: 0,
                transition: 'border-color 0.15s',
              }}
            >
              {selected === w.id && (
                <div style={{
                  position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center',
                  fontFamily: VD.mono, fontSize: 8, color: '#fff', letterSpacing: 1,
                  textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                }}>
                  ● SELECCIONADO
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: selected === w.id ? 16 : 4, left: 0, right: 0,
                textAlign: 'center', fontFamily: VD.mono, fontSize: 9, color: 'rgba(255,255,255,0.7)',
                textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              }}>
                {w.label}
              </div>
            </button>
          ))}
        </div>

        <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>
          Los cambios se guardan automáticamente al presionar Aplicar.
        </div>
      </div>
    </div>
  );
}
