// MAIN A · Grid clásico 5×3 Stream Deck style + sidebar de páginas compacta.
// Glass sobre wallpaper gradient · iconos centrados · labels en puntos.
// Title bar integrado arriba. Barra inferior con métricas sistema + acento.

const MainA = () => {
  // Fake button data — 15 slots (5×3)
  const btns = [
    { i: 'spotify', label: 'SPOTIFY', color: '#1ed760' },
    { i: 'discord', label: 'DISCORD', color: '#5865f2' },
    { i: 'obs',     label: 'OBS',     color: '#ff3d3d' },
    { i: 'mute',    label: 'MUTE',    color: '#ffb800' },
    { i: 'cam',     label: 'CAM',     color: '#fff' },
    { i: 'code',    label: 'CODE',    color: '#00d4ff' },
    { i: 'term',    label: 'TERMINAL', color: '#fff' },
    { i: 'folder',  label: 'DOCS',    color: '#fff' },
    { i: 'chrome',  label: 'BROWSER', color: '#fff' },
    { i: null,      label: '', empty: true },
    { i: 'volup',   label: 'VOL+',    color: '#fff' },
    { i: 'voldn',   label: 'VOL−',    color: '#fff' },
    { i: 'prev',    label: 'PREV',    color: '#fff' },
    { i: 'next',    label: 'NEXT',    color: '#fff' },
    { i: 'play',    label: 'PLAY',    color: '#ff3d3d', active: true },
  ];

  const pages = [
    { id: 'main', name: 'MAIN', icon: '▣', active: true },
    { id: 'stream', name: 'STREAM', icon: '◉' },
    { id: 'work', name: 'WORK', icon: '⊞' },
    { id: 'music', name: 'MUSIC', icon: '♪' },
  ];

  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
      '--vd-accent': '#ff3d3d',
    }}>
      <Wallpaper kind="gradient"/>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <TitleBar pageName="MAIN / 01"/>

        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Sidebar de páginas */}
          <div style={{
            width: 68, borderRight: `1px solid ${VD.border}`,
            display: 'flex', flexDirection: 'column', padding: '16px 0', gap: 4,
            background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(20px)',
          }}>
            {pages.map(p => (
              <div key={p.id} style={{
                margin: '0 10px', padding: '12px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                borderRadius: 4,
                background: p.active ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderLeft: p.active ? `2px solid #ff3d3d` : '2px solid transparent',
                marginLeft: p.active ? 0 : 10,
              }}>
                <div style={{ fontSize: 18, color: p.active ? '#fff' : VD.textDim }}>{p.icon}</div>
                <div style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 1, color: p.active ? '#fff' : VD.textMuted }}>{p.name}</div>
              </div>
            ))}
            <div style={{ flex: 1 }}/>
            <div style={{ margin: '0 10px', padding: '12px 0', display: 'flex', justifyContent: 'center', color: VD.textMuted, fontSize: 14 }}>+</div>
          </div>

          {/* Grid area */}
          <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
              <DotText text="MAIN" dotSize={5} gap={1} color="#fff"/>
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 1 }}>
                15 BUTTONS · 5×3 GRID
              </div>
            </div>

            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: 12,
            }}>
              {btns.map((b, i) => (
                <div key={i} style={{
                  background: b.empty ? 'transparent' : 'rgba(20,20,26,0.55)',
                  backdropFilter: 'blur(24px)',
                  border: `1px solid ${b.empty ? 'rgba(255,255,255,0.04)' : VD.border}`,
                  borderRadius: 4,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  position: 'relative',
                  boxShadow: b.active ? `inset 0 0 0 1px #ff3d3d, 0 0 24px rgba(255,61,61,0.15)` : 'none',
                }}>
                  {b.empty ? (
                    <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>+ EMPTY</div>
                  ) : (
                    <>
                      <div style={{
                        width: 44, height: 44,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: b.color === '#fff' ? 'rgba(255,255,255,0.08)' : `${b.color}22`,
                        border: `1px solid ${b.color === '#fff' ? VD.border : b.color + '40'}`,
                        borderRadius: 4,
                        color: b.color,
                      }}>
                        {/* Placeholder icon shape */}
                        <div style={{ width: 18, height: 18, borderRadius: 2, background: b.color, opacity: 0.8 }}/>
                      </div>
                      <DotLabel size={11} color={b.active ? '#fff' : VD.textDim} spacing={1.5}>{b.label}</DotLabel>
                    </>
                  )}
                  {b.active && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: '#ff3d3d' }}/>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom system strip */}
        <div style={{
          height: 32, borderTop: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24,
          background: 'rgba(0,0,0,0.3)',
          fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 1,
        }}>
          <span>CPU <span style={{ color: '#fff' }}>24%</span></span>
          <span>RAM <span style={{ color: '#fff' }}>41%</span></span>
          <span>GPU <span style={{ color: '#fff' }}>08%</span></span>
          <div style={{ flex: 1 }}/>
          <span style={{ color: '#ff3d3d' }}>● REC</span>
          <span>14:32:08</span>
        </div>
      </div>
    </div>
  );
};

window.MainA = MainA;
