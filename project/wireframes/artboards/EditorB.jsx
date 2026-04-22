// EDITOR B · Novel: overlay centrado tipo "terminal card" con wizard en pasos.
// Paso 1: elige acción · Paso 2: configura · Paso 3: styling. Preview grande.

const EditorB = () => {
  return (
    <div style={{
      width: 1200, height: 760,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
    }}>
      <Wallpaper kind="scanlines"/>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>

      {/* Centered modal */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 880, height: 560,
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }}>

        {/* Header: title + close */}
        <div style={{ height: 42, borderBottom: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: '#ff3d3d' }}/>
          <DotLabel size={11} color="#fff" spacing={2}>CONFIGURE BUTTON</DotLabel>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>· PAGE MAIN / POSITION 08</span>
          <div style={{ flex: 1 }}/>
          <div style={{ color: VD.textDim, fontSize: 14 }}>×</div>
        </div>

        {/* Wizard steps */}
        <div style={{ display: 'flex', padding: '20px 28px', gap: 4, borderBottom: `1px solid ${VD.border}` }}>
          {['01 · ACTION', '02 · CONFIG', '03 · STYLE'].map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 2, background: i <= 1 ? '#ff3d3d' : VD.border }}/>
              <div style={{ marginTop: 10, fontFamily: VD.mono, fontSize: 10, letterSpacing: 2,
                color: i === 1 ? '#fff' : i < 1 ? VD.textDim : VD.textMuted }}>{s}</div>
            </div>
          ))}
        </div>

        {/* Body: split preview + form */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Preview */}
          <div style={{ width: 320, borderRight: `1px solid ${VD.border}`, padding: 28,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.2)' }}>
            <DotLabel size={10} color={VD.textMuted} spacing={2} style={{ marginBottom: 16 }}>LIVE PREVIEW</DotLabel>
            <div style={{ width: 180, height: 180, borderRadius: 6,
              background: 'rgba(255,61,61,0.08)', border: '1px solid #ff3d3d',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
              boxShadow: '0 0 60px rgba(255,61,61,0.2)' }}>
              <div style={{ width: 56, height: 56, borderRadius: 6, background: '#ff3d3d', opacity: 0.9 }}/>
              <DotLabel size={16} color="#fff" spacing={2}>OBS REC</DotLabel>
            </div>
            <div style={{ marginTop: 24, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, textAlign: 'center' }}>
              TAP TO TEST
            </div>
            <div style={{ marginTop: 4, fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, textAlign: 'center' }}>
              → obs-cli record toggle
            </div>
          </div>

          {/* Form */}
          <div style={{ flex: 1, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, overflow: 'auto' }}>
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>COMMAND</DotLabel>
              <div style={{ background: VD.bg, border: `1px solid ${VD.borderStrong}`, padding: '12px 14px',
                color: '#fff', fontFamily: VD.mono, fontSize: 12 }}>
                <span style={{ color: VD.textMuted }}>$</span> obs-cli record toggle
                <span style={{ color: '#ff3d3d', marginLeft: 4 }}>▋</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>WORKING DIR</DotLabel>
                <div style={{ background: VD.bg, border: `1px solid ${VD.border}`, padding: '10px 12px',
                  color: VD.textDim, fontFamily: VD.mono, fontSize: 11 }}>~/Documents</div>
              </div>
              <div>
                <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>SHELL</DotLabel>
                <div style={{ background: VD.bg, border: `1px solid ${VD.border}`, padding: '10px 12px',
                  color: '#fff', fontFamily: VD.mono, fontSize: 11 }}>powershell ▾</div>
              </div>
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 10 }}>OPTIONS</DotLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { l: 'RUN IN BACKGROUND', on: true },
                  { l: 'SHOW NOTIFICATION', on: false },
                  { l: 'CONFIRM BEFORE RUN', on: false },
                ].map(o => (
                  <div key={o.l} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 18, background: o.on ? '#ff3d3d' : VD.border,
                      borderRadius: 9, padding: 2, position: 'relative' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff', position: 'absolute',
                        [o.on ? 'right' : 'left']: 2, top: 2 }}/>
                    </div>
                    <span style={{ fontFamily: VD.mono, fontSize: 11, color: o.on ? '#fff' : VD.textDim, letterSpacing: 1 }}>{o.l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>HOTKEY (OPTIONAL)</DotLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {['CTRL','SHIFT','F9'].map(k => (
                  <div key={k} style={{ padding: '8px 12px', background: VD.bg, border: `1px solid ${VD.border}`,
                    fontFamily: VD.mono, fontSize: 11, color: '#fff', letterSpacing: 1 }}>{k}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ height: 56, borderTop: `1px solid ${VD.border}`,
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
          <div style={{ padding: '10px 16px', border: `1px solid ${VD.border}`,
            fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.textDim }}>← BACK</div>
          <div style={{ flex: 1 }}/>
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted, letterSpacing: 1 }}>STEP 02 OF 03</span>
          <div style={{ padding: '10px 16px', border: `1px solid ${VD.border}`,
            fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: VD.textDim }}>CANCEL</div>
          <div style={{ padding: '10px 22px', background: '#ff3d3d',
            fontFamily: VD.mono, fontSize: 10, letterSpacing: 2, color: '#fff' }}>NEXT →</div>
        </div>
      </div>
    </div>
  );
};

window.EditorB = EditorB;
