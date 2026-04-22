// FULLSCREEN B · Novel: "Nothing-style" info-tile dashboard.
// Reloj a la izquierda, grid de 3×3 a la derecha, barra de widgets abajo.
// Denso, un poco CCTV/machine-interface.

const FullscreenB = () => {
  const btns = [
    { label: 'SCENE 1', sub: 'GAMING', active: true },
    { label: 'SCENE 2', sub: 'PODCAST' },
    { label: 'SCENE 3', sub: 'BRB' },
    { label: 'MIC',     sub: 'ON',  dot: '#00ff88' },
    { label: 'CAM',     sub: 'ON',  dot: '#00ff88' },
    { label: 'REC',     sub: 'OFF', dot: '#ff3d3d' },
    { label: 'LIGHT',   sub: '80%' },
    { label: 'FAN',     sub: 'MID' },
    { label: 'LOCK',    sub: '' },
  ];

  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
    }}>
      <Wallpaper kind="dotgrid"/>

      {/* Top thin strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 28,
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
        borderBottom: `1px solid ${VD.border}`,
        fontFamily: VD.mono, fontSize: 9, letterSpacing: 2, color: VD.textDim }}>
        <span style={{ color: '#00ff88' }}>●</span>
        <span>VIRTUALDECK · KIOSK MODE</span>
        <div style={{ flex: 1 }}/>
        <span>WED APR 21 2026</span>
        <span>WIFI -42DBM</span>
        <span>BAT 84%</span>
      </div>

      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, bottom: 120,
        display: 'flex' }}>
        {/* Left: clock + metrics column */}
        <div style={{ width: 460, padding: '40px 40px 40px 50px',
          borderRight: `1px solid ${VD.border}`, display: 'flex', flexDirection: 'column' }}>
            <DotLabel size={11} color={VD.textMuted} spacing={3} style={{ marginBottom: 16, display: 'block' }}>LOCAL TIME</DotLabel>
            <DotText text="14" dotSize={16} gap={4} color="#fff"/>
            <div style={{ height: 16 }}/>
            <DotText text="32" dotSize={16} gap={4} color="#fff" style={{ opacity: 0.7 }}/>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { l: 'CPU', v: '24', note: '48°C · 4.2 GHz' },
                { l: 'RAM', v: '41', note: '13.1 / 32 GB' },
                { l: 'GPU', v: '08', note: 'RTX 4070' },
              ].map(m => (
                <div key={m.l} style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                  <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, letterSpacing: 2, width: 40 }}>{m.l}</span>
                  <DotText text={m.v} dotSize={4} gap={1} color="#fff"/>
                  <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>{m.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3x3 grid */}
          <div style={{ flex: 1, padding: 30, display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
            gap: 10 }}>
            {btns.map((b, i) => (
              <div key={i} style={{
                background: b.active ? 'rgba(255,61,61,0.08)' : 'rgba(20,20,26,0.5)',
                border: `1px solid ${b.active ? '#ff3d3d60' : VD.border}`,
                padding: 16,
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>0{i+1}</div>
                  {b.dot && <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.dot }}/>}
                </div>
                <div>
                  <DotLabel size={18} color={b.active ? '#ff3d3d' : '#fff'} spacing={2}>{b.label}</DotLabel>
                  {b.sub && <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, marginTop: 6, letterSpacing: 1 }}>{b.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom widgets strip */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
          borderTop: `1px solid ${VD.border}`, padding: '16px 24px',
          display: 'flex', gap: 14, background: 'rgba(0,0,0,0.3)' }}>
          {/* NOW PLAYING */}
          <div style={{ flex: 1, border: `1px solid ${VD.border}`, padding: 14,
            display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#333,#111)' }}/>
            <div style={{ flex: 1 }}>
              <DotLabel size={10} color={VD.textMuted} spacing={2}>NOW PLAYING</DotLabel>
              <div style={{ color: '#fff', fontFamily: VD.font, fontSize: 14, marginTop: 6 }}>Interstellar — Main Theme</div>
              <div style={{ height: 2, background: VD.border, marginTop: 8, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: '42%', background: '#fff' }}/>
              </div>
            </div>
          </div>
          {/* NETWORK */}
          <div style={{ width: 220, border: `1px solid ${VD.border}`, padding: 14 }}>
            <DotLabel size={10} color={VD.textMuted} spacing={2}>NETWORK</DotLabel>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#fff', fontFamily: VD.mono, fontSize: 12 }}>
              <span>↓ 12.4 MB/s</span><span>↑ 0.8</span>
            </div>
            <div style={{ height: 20, display: 'flex', gap: 2, alignItems: 'flex-end', marginTop: 8 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} style={{ flex: 1, background: '#fff', height: `${20 + Math.sin(i) * 30 + i * 1.5}%`, opacity: 0.8 }}/>
              ))}
            </div>
          </div>
          {/* PAGE DOTS */}
          <div style={{ width: 180, border: `1px solid ${VD.border}`, padding: 14,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <DotLabel size={10} color={VD.textMuted} spacing={2}>PAGE</DotLabel>
            <DotText text="01/04" dotSize={3} gap={1} color="#fff"/>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 3, background: i === 0 ? '#ff3d3d' : VD.border }}/>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

window.FullscreenB = FullscreenB;
