import React, { useState } from 'react';
import { VD } from '../design';
import { DotLabel } from '../components/DotLabel';

interface WallpaperBProps {
  onBack: () => void;
  accent: string;
}

const THUMBNAILS = [
  'linear-gradient(135deg,#2a1a3d,#0d1a2e)',
  'linear-gradient(135deg,#1a0d2e,#2a1a0d)',
  'radial-gradient(circle at 30% 30%,#ff3d3d33,#0a0a0d 60%)',
  'linear-gradient(180deg,#0a1a2e,#0a0a0d)',
  'linear-gradient(135deg,#0d2a1a,#0a0a0d)',
  'linear-gradient(135deg,#2e1a0d,#0a0a0d)',
  'radial-gradient(circle at 70% 70%,#a855f733,#0a0a0d 60%)',
  'linear-gradient(135deg,#0a0a0d,#1a1a1a)',
];

const FILTERS = [
  { n: 'ALL', c: 218, active: false },
  { n: 'GRAD', c: 18, active: true },
  { n: 'IMG', c: 42, active: false },
  { n: 'SOLID', c: 24, active: false },
  { n: 'LIVE', c: 6, active: false },
  { n: 'MY', c: 12, active: false },
];

const PREVIEW_BG = 'linear-gradient(135deg, #2a1a3d 0%, #0d1a2e 50%, #1a0d2e 100%)';

export function WallpaperB({ onBack, accent }: WallpaperBProps) {
  const [selected, setSelected] = useState(2);
  const [activeFilter, setActiveFilter] = useState(1);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: VD.bg,
        color: VD.text,
        fontFamily: VD.font,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Preview area — fullscreen with deck overlay */}
      <div
        style={{
          flex: '0 0 60%',
          background: PREVIEW_BG,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Color blobs */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 70% 30%, rgba(255,61,61,0.3) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(100,100,255,0.25) 0%, transparent 50%)',
          }}
        />

        {/* Deck overlay */}
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 80,
            right: 80,
            bottom: 40,
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(20,20,26,0.45)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{ width: 22, height: 22, borderRadius: 3, background: 'rgba(255,255,255,0.5)' }}
              />
            </div>
          ))}
        </div>

        {/* Floating top bar */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 24,
            right: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={onBack}
              style={{
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontFamily: VD.mono,
                fontSize: 10,
                color: '#fff',
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              ← BACK
            </button>
            <DotLabel size={11} color="#fff" spacing={3}>
              PREVIEW · LIVE
            </DotLabel>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: VD.mono,
                fontSize: 10,
                color: '#fff',
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              ◀ PREV
            </button>
            <button
              style={{
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: VD.mono,
                fontSize: 10,
                color: '#fff',
                letterSpacing: 1,
                cursor: 'pointer',
              }}
            >
              NEXT ▶
            </button>
          </div>
        </div>
      </div>

      {/* Bottom tray */}
      <div
        style={{
          flex: 1,
          background: VD.surface,
          borderTop: `1px solid ${VD.border}`,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          minHeight: 0,
        }}
      >
        {/* Info + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div>
            <DotLabel size={18} color="#fff" spacing={2}>
              NEON DUSK
            </DotLabel>
            <div
              style={{
                fontFamily: VD.mono,
                fontSize: 10,
                color: VD.textDim,
                marginTop: 6,
                letterSpacing: 1,
              }}
            >
              GRADIENT · 04 / 18 · TAGS: PURPLE, SPACE, DARK
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            style={{
              padding: '10px 16px',
              border: `1px solid ${VD.border}`,
              fontFamily: VD.mono,
              fontSize: 10,
              color: VD.textDim,
              letterSpacing: 2,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            ★ SAVE
          </button>
          <button
            style={{
              padding: '10px 16px',
              border: `1px solid ${VD.border}`,
              fontFamily: VD.mono,
              fontSize: 10,
              color: '#fff',
              letterSpacing: 2,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            ⇪ UPLOAD
          </button>
          <button
            style={{
              padding: '10px 22px',
              background: '#ff3d3d',
              border: 'none',
              fontFamily: VD.mono,
              fontSize: 10,
              color: '#fff',
              letterSpacing: 2,
              cursor: 'pointer',
            }}
          >
            APPLY →
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map((f, i) => (
            <button
              key={f.n}
              onClick={() => setActiveFilter(i)}
              style={{
                padding: '6px 12px',
                background: activeFilter === i ? '#fff' : 'transparent',
                border: `1px solid ${activeFilter === i ? '#fff' : VD.border}`,
                fontFamily: VD.mono,
                fontSize: 10,
                color: activeFilter === i ? '#000' : VD.textDim,
                letterSpacing: 1,
                display: 'flex',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <span>{f.n}</span>
              <span style={{ opacity: 0.6 }}>{f.c}</span>
            </button>
          ))}
        </div>

        {/* Thumbnail strip */}
        <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
          {THUMBNAILS.map((g, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              style={{
                width: 120,
                height: 76,
                background: g,
                flexShrink: 0,
                border: `1px solid ${selected === i ? '#ff3d3d' : VD.border}`,
                borderRadius: 2,
                boxShadow: selected === i ? '0 0 0 2px rgba(255,61,61,0.2)' : 'none',
                position: 'relative',
                cursor: 'pointer',
                padding: 0,
                transition: 'border-color 0.15s',
              }}
            >
              {selected === i && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 6,
                    fontFamily: VD.mono,
                    fontSize: 8,
                    color: '#fff',
                    letterSpacing: 1,
                  }}
                >
                  ● SELECTED
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
