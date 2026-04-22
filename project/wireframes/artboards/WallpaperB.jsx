// WALLPAPER B · Novel: preview fullscreen con carousel tipo terminal.
// Mitad superior es preview en vivo con el deck encima, mitad inferior
// tira horizontal de thumbnails + filtros tipo "LIVE / IMG / GRAD / SOLID".

const WallpaperB = () => {
  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
    }}>
      {/* Preview area — full wallpaper con deck superpuesto */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 460,
        background: 'linear-gradient(135deg,#2a1a3d 0%,#0d1a2e 50%,#1a0d2e 100%)' }}>
        <div style={{ position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 70% 30%,rgba(255,61,61,0.3) 0%,transparent 40%), radial-gradient(circle at 20% 80%,rgba(100,100,255,0.25) 0%,transparent 50%)' }}/>

        {/* Deck overlay (preview of how it looks) */}
        <div style={{ position: 'absolute', top: 60, left: 80, right: 80, bottom: 40,
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: 10 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{
              background: 'rgba(20,20,26,0.45)',
              backdropFilter: 'blur(24px)',
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 3, background: 'rgba(255,255,255,0.5)' }}/>
            </div>
          ))}
        </div>

        {/* Floating title top */}
        <div style={{ position: 'absolute', top: 20, left: 24, right: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <DotLabel size={11} color="#fff" spacing={3}>PREVIEW · LIVE</DotLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.15)`,
              fontFamily: VD.mono, fontSize: 10, color: '#fff', letterSpacing: 1 }}>◀ PREV</div>
            <div style={{ padding: '6px 12px', background: 'rgba(0,0,0,0.4)', border: `1px solid rgba(255,255,255,0.15)`,
              fontFamily: VD.mono, fontSize: 10, color: '#fff', letterSpacing: 1 }}>NEXT ▶</div>
          </div>
        </div>
      </div>

      {/* Bottom tray */}
      <div style={{ position: 'absolute', top: 460, left: 0, right: 0, bottom: 0,
        background: VD.surface, borderTop: `1px solid ${VD.border}`,
        padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Info + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div>
            <DotLabel size={18} color="#fff" spacing={2}>NEON DUSK</DotLabel>
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, marginTop: 6, letterSpacing: 1 }}>
              GRADIENT · 04 / 18 · TAGS: PURPLE, SPACE, DARK
            </div>
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ padding: '10px 16px', border: `1px solid ${VD.border}`,
            fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>★ SAVE</div>
          <div style={{ padding: '10px 16px', border: `1px solid ${VD.border}`,
            fontFamily: VD.mono, fontSize: 10, color: '#fff', letterSpacing: 2 }}>⇪ UPLOAD</div>
          <div style={{ padding: '10px 22px', background: '#ff3d3d',
            fontFamily: VD.mono, fontSize: 10, color: '#fff', letterSpacing: 2 }}>APPLY →</div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: 'ALL', c: 218, active: false },
            { n: 'GRAD', c: 18, active: true },
            { n: 'IMG', c: 42 },
            { n: 'SOLID', c: 24 },
            { n: 'LIVE', c: 6 },
            { n: 'MY', c: 12 },
          ].map(f => (
            <div key={f.n} style={{
              padding: '6px 12px',
              background: f.active ? '#fff' : 'transparent',
              border: `1px solid ${f.active ? '#fff' : VD.border}`,
              fontFamily: VD.mono, fontSize: 10, color: f.active ? '#000' : VD.textDim, letterSpacing: 1,
              display: 'flex', gap: 8,
            }}>
              <span>{f.n}</span>
              <span style={{ opacity: 0.6 }}>{f.c}</span>
            </div>
          ))}
        </div>

        {/* Thumbnail strip */}
        <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
          {[
            'linear-gradient(135deg,#2a1a3d,#0d1a2e)',
            'linear-gradient(135deg,#1a0d2e,#2a1a0d)',
            'radial-gradient(circle at 30% 30%,#ff3d3d33,#0a0a0d 60%)',
            'linear-gradient(180deg,#0a1a2e,#0a0a0d)',
            'linear-gradient(135deg,#0d2a1a,#0a0a0d)',
            'linear-gradient(135deg,#2e1a0d,#0a0a0d)',
            'radial-gradient(circle at 70% 70%,#a855f733,#0a0a0d 60%)',
            'linear-gradient(135deg,#0a0a0d,#1a1a1a)',
          ].map((g, i) => (
            <div key={i} style={{ width: 136, height: 88, background: g, flexShrink: 0,
              border: `1px solid ${i === 2 ? '#ff3d3d' : VD.border}`, borderRadius: 2,
              boxShadow: i === 2 ? '0 0 0 2px #ff3d3d20' : 'none',
              position: 'relative' }}>
              {i === 2 && <div style={{ position: 'absolute', bottom: 4, left: 6, fontFamily: VD.mono, fontSize: 8, color: '#fff', letterSpacing: 1 }}>● SELECTED</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

window.WallpaperB = WallpaperB;
