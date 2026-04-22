// WALLPAPER A · Picker tipo galería en grid 4×2 + sección arriba para
// gradientes y arriba del todo el wallpaper actual con controles.

const WallpaperA = () => {
  const solids = ['#0a0a0d', '#1a1a1a', '#0d1a2e', '#2a0d1a', '#0d2a1a'];
  const gradients = [
    'linear-gradient(135deg,#1a1a2e,#0a0a0d)',
    'linear-gradient(135deg,#2a1a3d,#0d1a2e)',
    'linear-gradient(135deg,#1a0d2e,#0a0a0d)',
    'radial-gradient(circle at 30% 20%,#2a1a3d,#0a0a0d)',
    'linear-gradient(180deg,#0a1a2e,#0a0a0d)',
  ];

  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
    }}>
      <TitleBar pageName="WALLPAPER"/>

      <div style={{ position: 'absolute', top: 36, left: 0, right: 0, bottom: 0,
        display: 'flex' }}>
        {/* Left column: categorías */}
        <div style={{ width: 180, borderRight: `1px solid ${VD.border}`,
          padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { n: 'CURRENT', c: 12, active: true },
            { n: 'SOLIDS', c: 24 },
            { n: 'GRADIENTS', c: 18 },
            { n: 'IMAGES', c: 42 },
            { n: 'LIVE', c: 6 },
            { n: 'COMMUNITY', c: 128 },
          ].map(x => (
            <div key={x.n} style={{
              padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: x.active ? 'rgba(255,255,255,0.05)' : 'transparent',
              borderLeft: `2px solid ${x.active ? '#ff3d3d' : 'transparent'}`,
              fontFamily: VD.mono, fontSize: 11, color: x.active ? '#fff' : VD.textDim, letterSpacing: 2,
            }}>
              <span>{x.n}</span>
              <span style={{ fontSize: 9, color: VD.textMuted }}>{x.c}</span>
            </div>
          ))}
        </div>

        {/* Main area */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {/* Current preview */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
            <div style={{ width: 340, height: 200,
              background: 'linear-gradient(135deg,#2a1a3d 0%,#0d1a2e 100%)',
              borderRadius: 4, border: `1px solid ${VD.border}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
                background: 'radial-gradient(circle at 70% 30%,rgba(255,61,61,0.3) 0%,transparent 40%)' }}/>
              <div style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: VD.mono, fontSize: 9, color: '#fff', letterSpacing: 1 }}>CURRENT</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <DotLabel size={14} color="#fff" spacing={2}>NEON DUSK</DotLabel>
              <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, letterSpacing: 1 }}>
                GRADIENT · 1920×1080 · APPLIED 2 DAYS AGO
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ padding: '10px 16px', border: `1px solid ${VD.border}`,
                  fontFamily: VD.mono, fontSize: 10, color: '#fff', letterSpacing: 2 }}>⇪ UPLOAD</div>
                <div style={{ padding: '10px 16px', border: `1px solid ${VD.border}`,
                  fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>ADJUST</div>
                <div style={{ padding: '10px 16px', background: '#ff3d3d',
                  fontFamily: VD.mono, fontSize: 10, color: '#fff', letterSpacing: 2 }}>APPLY</div>
              </div>
              {/* Adjustments */}
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { l: 'BLUR', v: 0 },
                  { l: 'DIM', v: 35 },
                  { l: 'SATURATION', v: 80 },
                ].map(a => (
                  <div key={a.l} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 90, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 1 }}>{a.l}</span>
                    <div style={{ flex: 1, height: 2, background: VD.border, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${a.v}%`, background: '#ff3d3d' }}/>
                      <div style={{ position: 'absolute', left: `${a.v}%`, top: -4, width: 10, height: 10, borderRadius: 5, background: '#fff', transform: 'translateX(-5px)' }}/>
                    </div>
                    <span style={{ width: 32, fontFamily: VD.mono, fontSize: 10, color: '#fff', textAlign: 'right' }}>{a.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DotLabel size={10} color={VD.textMuted} spacing={2} style={{ marginBottom: 14, display: 'block' }}>GRADIENTS</DotLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 24 }}>
            {gradients.map((g, i) => (
              <div key={i} style={{ paddingBottom: '62%', background: g,
                border: `1px solid ${i === 0 ? '#ff3d3d' : VD.border}`, borderRadius: 3,
                position: 'relative' }}>
                {i === 0 && <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, background: '#ff3d3d' }}/>}
              </div>
            ))}
          </div>

          <DotLabel size={10} color={VD.textMuted} spacing={2} style={{ marginBottom: 14, display: 'block' }}>SOLIDS</DotLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {solids.map((c, i) => (
              <div key={i} style={{ paddingBottom: '62%', background: c,
                border: `1px solid ${VD.border}`, borderRadius: 3 }}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.WallpaperA = WallpaperA;
