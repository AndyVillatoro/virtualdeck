// FULLSCREEN A · Kiosco minimal: reloj gigante en puntos centrado, grid 4×4
// debajo, métricas pequeñas en esquinas. Sin title bar, sin controles.

const FullscreenA = () => {
  const btns = Array.from({ length: 16 }).map((_, i) => ({
    i, label: ['MUTE','CAM','MIC','REC','OBS','CHAT','VOL+','VOL−','PLAY','PREV','NEXT','LIGHT','FAN','LOCK','HOME','MENU'][i],
    accent: [3, 8].includes(i),
  }));

  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
    }}>
      <Wallpaper kind="gradient"/>

      {/* Top bar — métricas mínimas */}
      <div style={{ position: 'absolute', top: 20, left: 28, right: 28,
        display: 'flex', justifyContent: 'space-between',
        fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 2 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <span>● ONLINE</span>
          <span>CPU 24%</span>
          <span>RAM 41%</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span>WED · APR 21</span>
          <span style={{ color: '#ff3d3d' }}>KIOSK</span>
        </div>
      </div>

      {/* Reloj gigante */}
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <DotText text="14:32" dotSize={10} gap={3} color="#fff"/>
      </div>

      {/* Grid de botones */}
      <div style={{ position: 'absolute', top: 220, left: 60, right: 60, bottom: 60,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
        gap: 14 }}>
        {btns.slice(0, 8).map((b) => (
          <div key={b.i} style={{
            background: 'rgba(20,20,26,0.5)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${b.accent ? '#ff3d3d60' : VD.border}`,
            borderRadius: 4,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
            boxShadow: b.accent ? '0 0 30px rgba(255,61,61,0.15)' : 'none',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 4,
              background: b.accent ? '#ff3d3d20' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${b.accent ? '#ff3d3d' : VD.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 16, height: 16, background: b.accent ? '#ff3d3d' : '#fff', opacity: 0.8, borderRadius: 2 }}/>
            </div>
            <DotLabel size={13} color={b.accent ? '#fff' : VD.textDim} spacing={2}>{b.label}</DotLabel>
          </div>
        ))}
      </div>

      {/* Page indicator puntos */}
      <div style={{ position: 'absolute', bottom: 22, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 8 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%',
            background: i === 0 ? '#fff' : 'rgba(255,255,255,0.2)' }}/>
        ))}
      </div>
    </div>
  );
};

window.FullscreenA = FullscreenA;
