// MONITOR A · Panel inferior integrado tipo "drawer" con métricas horizontales
// dispuestas como cards pequeñas. Sobrio, informativo.

const MonitorA = () => {
  const metrics = [
    { l: 'CPU', v: '24', unit: '%', note: '4.2 GHz · 48°C', spark: true },
    { l: 'RAM', v: '41', unit: '%', note: '13.1 / 32 GB', bar: 41 },
    { l: 'GPU', v: '08', unit: '%', note: 'RTX 4070 · 52°C', spark: true },
    { l: 'DISK', v: '62', unit: '%', note: '620 / 1000 GB', bar: 62 },
    { l: 'NET', v: '12', unit: 'MB/s', note: '↓ 12.4  ↑ 0.8', spark: true },
  ];

  return (
    <div style={{
      width: 1200, height: 340,
      background: VD.surface, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
      border: `1px solid ${VD.border}`,
    }}>
      {/* Header */}
      <div style={{ height: 36, borderBottom: `1px solid ${VD.border}`,
        display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#00ff88' }}/>
        <DotLabel size={11} color="#fff" spacing={2}>SYSTEM MONITOR</DotLabel>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>REFRESH 1S · LIVE</span>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 4 }}>
          {['1S','5S','30S','1M'].map((t, i) => (
            <div key={t} style={{ padding: '4px 10px', fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
              border: `1px solid ${i === 0 ? '#ff3d3d' : VD.border}`,
              color: i === 0 ? '#fff' : VD.textDim }}>{t}</div>
          ))}
        </div>
        <div style={{ color: VD.textMuted, fontSize: 14, marginLeft: 8 }}>✕</div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, padding: 16, height: 'calc(100% - 36px)' }}>
        {metrics.map(m => (
          <div key={m.l} style={{ border: `1px solid ${VD.border}`, padding: 14,
            display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <DotLabel size={9} color={VD.textDim} spacing={2}>{m.l}</DotLabel>
              <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>{m.unit}</span>
            </div>
            <DotText text={m.v} dotSize={5} gap={1} color="#fff"/>
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, marginTop: 10, letterSpacing: 1 }}>{m.note}</div>

            <div style={{ flex: 1 }}/>

            {m.spark && (
              <div style={{ height: 32, display: 'flex', gap: 1, alignItems: 'flex-end', marginTop: 10 }}>
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, background: i > 26 ? '#ff3d3d' : '#fff',
                    opacity: i > 26 ? 1 : 0.7,
                    height: `${20 + Math.abs(Math.sin(i * 0.4 + m.l.length)) * 75}%` }}/>
                ))}
              </div>
            )}
            {m.bar !== undefined && (
              <div style={{ height: 4, background: VD.border, marginTop: 10, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${m.bar}%`, background: '#fff' }}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

window.MonitorA = MonitorA;
