// Shared primitives for all VirtualDeck artboards.
// Everything scoped under `vd-*` classes so it can't collide.

const VD = {
  bg: '#0a0a0d',
  surface: '#14141a',
  elevated: '#1d1d25',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#f0f0f2',
  textDim: '#8a8a93',
  textMuted: '#55555e',
  // Default accent (override per-artboard via `--vd-accent` inline style)
  accent: 'var(--vd-accent, #ff3d3d)',
  font: '"Inter", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  dots: '"DotGothic16", monospace',  // matrix dot display (Google Fonts)
};

// ─────────────────────────────────────────────
// DotText — renders big numbers/letters via a 5×7 matrix mask
// rather than relying on the font. This gives us true-dot rendering
// at any size (no subpixel artifacts) and makes density tweakable.
// We ALSO keep the DotGothic16 font for medium text.
// ─────────────────────────────────────────────

// 5x7 dot-matrix glyph table (hand-authored for digits + key letters)
// Each row is a bitmask (bits 4..0 = left..right).
const GLYPHS_5x7 = {
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F],
  '3': [0x1F,0x02,0x04,0x02,0x01,0x11,0x0E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  ':': [0x00,0x04,0x04,0x00,0x04,0x04,0x00],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x0C,0x0C],
  '/': [0x01,0x02,0x02,0x04,0x08,0x08,0x10],
  '%': [0x19,0x19,0x02,0x04,0x08,0x13,0x13],
  '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
  'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
  'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
  'D': [0x1E,0x11,0x11,0x11,0x11,0x11,0x1E],
  'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0E],
  'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
  'N': [0x11,0x11,0x19,0x15,0x13,0x11,0x11],
  'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S': [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
  'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  'W': [0x11,0x11,0x11,0x15,0x15,0x15,0x0A],
  'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x11,0x0A,0x04,0x04,0x04],
  '·': [0x00,0x00,0x00,0x04,0x00,0x00,0x00],
};

function DotText({ text, dotSize = 6, gap = 2, color = '#fff', density = 1, style = {} }) {
  const chars = String(text).toUpperCase().split('');
  return (
    <div style={{ display: 'inline-flex', gap: dotSize + gap * 2, alignItems: 'center', ...style }}>
      {chars.map((ch, i) => {
        const g = GLYPHS_5x7[ch] || GLYPHS_5x7[' '];
        return (
          <div key={i} style={{ display: 'grid', gridTemplateRows: `repeat(7, ${dotSize}px)`, gridTemplateColumns: `repeat(5, ${dotSize}px)`, gap: gap }}>
            {g.map((row, r) =>
              [4,3,2,1,0].map((col) => {
                const on = (row >> col) & 1;
                return (
                  <div key={`${r}-${col}`} style={{
                    width: dotSize, height: dotSize, borderRadius: '50%',
                    background: on ? color : `rgba(255,255,255,${0.04 * density})`,
                  }}/>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

// Small dotted label (for button captions etc.) using the DotGothic16 font
function DotLabel({ children, size = 14, color = VD.text, spacing = 1, style = {} }) {
  return (
    <span style={{
      fontFamily: VD.dots,
      fontSize: size,
      color,
      letterSpacing: spacing,
      textTransform: 'uppercase',
      lineHeight: 1,
      ...style,
    }}>{children}</span>
  );
}

// Integrated title bar — no native chrome. Shows the left drag region,
// current deck, right-side kiosco toggle + settings.
function TitleBar({ showControls = true, pageName = 'MAIN', accent = '#ff3d3d' }) {
  return (
    <div style={{
      height: 36, display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: 10,
      borderBottom: `1px solid ${VD.border}`,
      fontFamily: VD.mono, fontSize: 11, color: VD.textDim,
      WebkitAppRegion: 'drag',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }}/>
        <span style={{ color: VD.text, letterSpacing: 2, fontSize: 10 }}>VIRTUALDECK</span>
      </div>
      <div style={{ width: 1, height: 14, background: VD.border }}/>
      <span style={{ fontSize: 10, letterSpacing: 1 }}>{pageName}</span>
      <div style={{ flex: 1 }}/>
      {showControls && (
        <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}>
          {['⤢','—','×'].map((g,i) => (
            <div key={i} style={{
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: VD.textMuted,
              borderRadius: 2,
            }}>{g}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// Wallpaper backgrounds — cheap, keep on-canvas perf sane.
function Wallpaper({ kind = 'solid', style = {} }) {
  const common = { position: 'absolute', inset: 0, ...style };
  if (kind === 'solid') return <div style={{ ...common, background: VD.bg }}/>;
  if (kind === 'gradient') return <div style={{ ...common, background: 'radial-gradient(ellipse at 30% 20%, #1a1a2e 0%, #0a0a0d 60%)' }}/>;
  if (kind === 'dotgrid') return <div style={{ ...common,
      background: `radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / 14px 14px, ${VD.bg}`
    }}/>;
  if (kind === 'photo') return (
    <div style={{ ...common,
      background: 'linear-gradient(135deg, #2a1a3d 0%, #0d1a2e 50%, #1a0d2e 100%)',
    }}>
      {/* simulated blurred photo wallpaper */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
        background: 'radial-gradient(circle at 70% 30%, rgba(255,61,61,0.3) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(100,100,255,0.25) 0%, transparent 50%)'}}/>
    </div>
  );
  if (kind === 'scanlines') return (
    <div style={{ ...common,
      background: `repeating-linear-gradient(0deg, #0a0a0d 0px, #0a0a0d 2px, #0d0d12 2px, #0d0d12 3px)`,
    }}/>
  );
  return null;
}

Object.assign(window, { VD, DotText, DotLabel, TitleBar, Wallpaper });
