// EDITOR A · Modal de edición de botón — panel lateral derecho.
// Selecciona tipo de acción, icono, color, label. Preview en vivo arriba.

const EditorA = () => {
  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
    }}>
      <Wallpaper kind="gradient"/>

      {/* Faded main view atrás */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: 60, left: 60, right: 480, bottom: 60,
          display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: 10 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{ background: VD.surface, border: `1px solid ${VD.border}`, borderRadius: 4,
              boxShadow: i === 7 ? '0 0 0 2px #ff3d3d' : 'none' }}/>
          ))}
        </div>
      </div>

      <TitleBar pageName="EDIT BUTTON · POS 08"/>

      {/* Panel derecho */}
      <div style={{ position: 'absolute', top: 36, right: 0, bottom: 0, width: 440,
        background: 'rgba(13,13,18,0.92)', backdropFilter: 'blur(30px)',
        borderLeft: `1px solid ${VD.border}`,
        padding: 28, overflow: 'auto',
        display: 'flex', flexDirection: 'column', gap: 22 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <DotLabel size={16} color="#fff" spacing={2}>EDIT BUTTON</DotLabel>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, letterSpacing: 1 }}>ESC TO CLOSE</span>
        </div>

        {/* Live preview */}
        <div style={{ border: `1px solid ${VD.border}`, padding: 20,
          display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 90, height: 90, borderRadius: 4,
            background: 'rgba(255,61,61,0.1)', border: '1px solid #ff3d3d',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 3, background: '#ff3d3d' }}/>
            <DotLabel size={9} color="#fff" spacing={1.5}>OBS REC</DotLabel>
          </div>
          <div style={{ flex: 1 }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>PREVIEW</DotLabel>
            <div style={{ color: '#fff', fontFamily: VD.font, fontSize: 15, marginTop: 6 }}>OBS REC</div>
            <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, marginTop: 2 }}>command · toggle recording</div>
          </div>
        </div>

        {/* LABEL field */}
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>LABEL</DotLabel>
          <div style={{ background: VD.surface, border: `1px solid ${VD.borderStrong}`,
            padding: '10px 12px', color: '#fff', fontFamily: VD.mono, fontSize: 13 }}>OBS REC</div>
        </div>

        {/* ACTION TYPE tabs */}
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>ACTION TYPE</DotLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {['URL','COMMAND','APP','AUDIO','MONITOR','NONE'].map((t, i) => (
              <div key={t} style={{
                padding: '10px 0', textAlign: 'center',
                fontFamily: VD.mono, fontSize: 10, letterSpacing: 1,
                background: i === 1 ? 'rgba(255,61,61,0.1)' : VD.surface,
                border: `1px solid ${i === 1 ? '#ff3d3d' : VD.border}`,
                color: i === 1 ? '#fff' : VD.textDim,
              }}>{t}</div>
            ))}
          </div>
        </div>

        {/* COMMAND */}
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>COMMAND</DotLabel>
          <div style={{ background: VD.surface, border: `1px solid ${VD.borderStrong}`,
            padding: '10px 12px', color: '#fff', fontFamily: VD.mono, fontSize: 12 }}>obs-cli record toggle</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <div style={{ width: 32, height: 18, background: '#ff3d3d', borderRadius: 9, padding: 2, position: 'relative' }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute', right: 2, top: 2 }}/>
            </div>
            <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.textDim, letterSpacing: 1 }}>RUN IN BACKGROUND</span>
          </div>
        </div>

        {/* ICON row */}
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>ICON</DotLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {['●','▲','◆','■','▶','◉','□','+'].map((g, i) => (
              <div key={i} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: VD.surface, border: `1px solid ${i === 0 ? '#ff3d3d' : VD.border}`,
                color: i === 0 ? '#ff3d3d' : '#fff', fontFamily: VD.mono, fontSize: 14 }}>{g}</div>
            ))}
          </div>
        </div>

        {/* COLOR swatches */}
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>ACCENT</DotLabel>
          <div style={{ display: 'flex', gap: 6 }}>
            {['#ff3d3d','#ffb800','#00ff88','#00d4ff','#a855f7','#ff3d8f','#fff','#8a8a93'].map((c, i) => (
              <div key={c} style={{ width: 28, height: 28, borderRadius: 14, background: c,
                boxShadow: i === 0 ? `0 0 0 2px ${VD.bg}, 0 0 0 3px #ff3d3d` : 'none' }}/>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 16, borderTop: `1px solid ${VD.border}` }}>
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', border: `1px solid ${VD.border}`,
            fontFamily: VD.mono, fontSize: 11, letterSpacing: 2, color: VD.textDim }}>DELETE</div>
          <div style={{ flex: 1, padding: '12px 0', textAlign: 'center', border: `1px solid ${VD.border}`,
            fontFamily: VD.mono, fontSize: 11, letterSpacing: 2, color: '#fff' }}>CANCEL</div>
          <div style={{ flex: 2, padding: '12px 0', textAlign: 'center', background: '#ff3d3d',
            fontFamily: VD.mono, fontSize: 11, letterSpacing: 2, color: '#fff' }}>SAVE BUTTON</div>
        </div>
      </div>
    </div>
  );
};

window.EditorA = EditorA;
