// MAIN B · Novel approach: grid radial/modular con foco + metric panels.
// Páginas como tabs horizontales arriba, grid 4×4 adaptativo con celdas de
// distinto tamaño (algunas dobles), y panel lateral derecho con métrica grande.

const MainB = () => {
  const btns = [
    { w: 2, h: 1, kind: 'media', label: 'NOW PLAYING', extra: 'Interstellar OST' },
    { w: 1, h: 1, kind: 'button', label: 'MUTE', icon: '□' },
    { w: 1, h: 1, kind: 'button', label: 'CAM', icon: '○' },
    { w: 1, h: 1, kind: 'button', label: 'DISCORD', icon: '▲', accent: true },
    { w: 1, h: 1, kind: 'button', label: 'CODE', icon: '◇' },
    { w: 1, h: 1, kind: 'button', label: 'TERM', icon: '▷' },
    { w: 1, h: 1, kind: 'button', label: 'FILES', icon: '▣' },
    { w: 1, h: 1, kind: 'button', label: 'BROWSE', icon: '◉' },
    { w: 1, h: 1, kind: 'button', label: 'OBS', icon: '●' },
    { w: 2, h: 1, kind: 'slider', label: 'VOLUME', value: 64 },
    { w: 1, h: 1, kind: 'button', label: 'PREV', icon: '◁◁' },
    { w: 1, h: 1, kind: 'button', label: 'PLAY', icon: '▷', accent: true },
    { w: 1, h: 1, kind: 'button', label: 'NEXT', icon: '▷▷' },
  ];

  const pages = ['MAIN', 'STREAM', 'WORK', 'MUSIC', 'MACROS'];

  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
      '--vd-accent': '#a855f7',
    }}>
      <Wallpaper kind="photo"/>
      {/* extra vignette for legibility */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,13,0.4) 0%, rgba(10,10,13,0.7) 100%)' }}/>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TitleBar pageName="" accent="#a855f7"/>

        {/* Tabs de páginas */}
        <div style={{
          display: 'flex', padding: '16px 24px 0', gap: 2,
          borderBottom: `1px solid ${VD.border}`,
        }}>
          {pages.map((p, i) => (
            <div key={p} style={{
              padding: '10px 18px',
              fontFamily: VD.mono, fontSize: 11, letterSpacing: 2,
              color: i === 0 ? '#fff' : VD.textDim,
              borderBottom: i === 0 ? '2px solid #a855f7' : '2px solid transparent',
              position: 'relative', top: 1,
            }}>{p}</div>
          ))}
          <div style={{ flex: 1 }}/>
          <div style={{ padding: '10px 8px', color: VD.textMuted, fontSize: 14 }}>+</div>
        </div>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Grid principal */}
          <div style={{ flex: 1, padding: 20, display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)',
            gap: 10,
          }}>
            {btns.map((b, i) => (
              <div key={i} style={{
                gridColumn: `span ${b.w}`, gridRow: `span ${b.h}`,
                background: 'rgba(20,20,26,0.5)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${b.accent ? '#a855f740' : VD.border}`,
                borderRadius: 3,
                padding: b.kind === 'button' ? 0 : 14,
                display: 'flex',
                flexDirection: b.kind === 'button' ? 'column' : 'column',
                alignItems: b.kind === 'button' ? 'center' : 'stretch',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: b.accent ? 'inset 0 0 0 1px rgba(168,85,247,0.4), 0 0 30px rgba(168,85,247,0.1)' : 'none',
              }}>
                {b.kind === 'button' && (
                  <>
                    <div style={{ fontSize: 28, color: b.accent ? '#a855f7' : '#fff', marginBottom: 8, fontFamily: VD.mono }}>{b.icon}</div>
                    <DotLabel size={9} color={b.accent ? '#fff' : VD.textDim} spacing={1.5}>{b.label}</DotLabel>
                  </>
                )}
                {b.kind === 'media' && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 2,
                        background: 'linear-gradient(135deg, #a855f7, #ff3d3d)', }}/>
                      <div>
                        <DotLabel size={9} color={VD.textDim} spacing={1.5}>{b.label}</DotLabel>
                        <div style={{ fontSize: 13, color: '#fff', marginTop: 4, fontFamily: VD.font }}>{b.extra}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, height: 2, background: VD.border, borderRadius: 1, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: '42%', background: '#a855f7', borderRadius: 1 }}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
                      <span>1:42</span><span>3:58</span>
                    </div>
                  </>
                )}
                {b.kind === 'slider' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <DotLabel size={9} color={VD.textDim} spacing={1.5}>{b.label}</DotLabel>
                      <span style={{ fontFamily: VD.mono, fontSize: 18, color: '#fff' }}>{b.value}</span>
                    </div>
                    <div style={{ height: 4, background: VD.border, borderRadius: 2, position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${b.value}%`, background: '#a855f7', borderRadius: 2 }}/>
                    </div>
                    {/* tick marks */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      {Array.from({ length: 11 }).map((_, i) => (
                        <div key={i} style={{ width: 1, height: 4, background: i === 6 ? '#a855f7' : VD.textMuted }}/>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Panel lateral derecho: detalle/monitor */}
          <div style={{
            width: 260, borderLeft: `1px solid ${VD.border}`,
            padding: 20, background: 'rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <DotLabel size={10} color={VD.textMuted} spacing={2}>SYSTEM</DotLabel>
            {/* Big dot CPU */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>CPU</span>
                <DotText text="24" dotSize={4} gap={1} color="#fff"/>
              </div>
              <div style={{ height: 24, display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, background: i < 24 ? (i > 26 ? '#a855f7' : '#fff') : VD.border,
                    opacity: i < 24 ? (i/32) * 0.8 + 0.2 : 1,
                    height: `${(Math.sin(i * 0.4) * 0.5 + 0.5) * 100}%`, minHeight: 2,
                  }}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>RAM</span>
                <DotText text="41" dotSize={4} gap={1} color="#fff"/>
              </div>
              <div style={{ height: 4, background: VD.border, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '41%', background: '#fff' }}/>
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4 }}>13.1 / 32.0 GB</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>GPU</span>
                <DotText text="08" dotSize={4} gap={1} color="#fff"/>
              </div>
              <div style={{ height: 4, background: VD.border, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '8%', background: '#fff' }}/>
              </div>
              <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4 }}>RTX 4070 · 48°C</div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <DotLabel size={10} color={VD.textMuted} spacing={2} style={{ marginBottom: 10, display: 'block' }}>NETWORK</DotLabel>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: VD.mono, fontSize: 10, color: '#fff' }}>
                <span>↓ 12.4 MB/s</span>
                <span>↑ 0.8 MB/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.MainB = MainB;
