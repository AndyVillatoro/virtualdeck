// MONITOR B · Novel: un único oscilloscope panel con todas las series
// superpuestas + lista de procesos top a la derecha tipo "htop".

const MonitorB = () => {
  const series = [
    { l: 'CPU', c: '#ff3d3d', data: [40,35,42,45,60,55,50,68,72,65,58,50,45,40,42,48,52,58,55,50,45,40,38,42,45,50,55,60,58,55,50,48] },
    { l: 'GPU', c: '#a855f7', data: [12,14,18,22,20,18,15,12,10,8,6,8,10,15,20,25,30,35,30,25,20,15,12,10,8,8,10,12,15,18,20,18] },
    { l: 'RAM', c: '#00d4ff', data: Array.from({length:32}, (_,i) => 38 + Math.sin(i*0.3)*4 + i*0.1) },
    { l: 'NET', c: '#ffb800', data: [5,8,12,20,18,15,10,8,30,45,35,25,20,15,12,10,8,6,5,8,10,15,22,28,35,40,38,32,25,20,15,12] },
  ];

  const procs = [
    { n: 'chrome.exe', cpu: '8.2', mem: '1.2G' },
    { n: 'code.exe', cpu: '5.4', mem: '890M' },
    { n: 'obs64.exe', cpu: '4.1', mem: '420M' },
    { n: 'discord', cpu: '2.8', mem: '310M' },
    { n: 'systeminfo', cpu: '0.4', mem: '42M' },
    { n: 'explorer', cpu: '0.2', mem: '95M' },
  ];

  return (
    <div style={{
      width: 1200, height: 340,
      background: VD.bg, color: VD.text,
      fontFamily: VD.font, position: 'relative', overflow: 'hidden',
      border: `1px solid ${VD.border}`,
    }}>
      <div style={{ height: 32, borderBottom: `1px solid ${VD.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 14 }}>
        <DotLabel size={10} color="#fff" spacing={2}>OSCILLOSCOPE</DotLabel>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>32S WINDOW · LIVE</span>
        <div style={{ flex: 1 }}/>
        {series.map(s => (
          <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 1 }}>
            <div style={{ width: 8, height: 2, background: s.c }}/>
            <span>{s.l}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', height: 'calc(100% - 32px)' }}>
        {/* Oscilloscope */}
        <div style={{ flex: 1, position: 'relative', padding: '14px 20px',
          borderRight: `1px solid ${VD.border}` }}>
          {/* grid lines */}
          <div style={{ position: 'absolute', inset: 14, background:
            `repeating-linear-gradient(0deg, transparent 0, transparent 24px, rgba(255,255,255,0.04) 24px, rgba(255,255,255,0.04) 25px),
             repeating-linear-gradient(90deg, transparent 0, transparent 30px, rgba(255,255,255,0.04) 30px, rgba(255,255,255,0.04) 31px)` }}/>

          {/* Y-axis labels */}
          <div style={{ position: 'absolute', left: 4, top: 14, bottom: 14,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
            <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
          </div>

          {/* SVG series */}
          <svg viewBox="0 0 320 220" preserveAspectRatio="none"
            style={{ position: 'absolute', left: 28, right: 14, top: 14, bottom: 14,
              width: 'calc(100% - 42px)', height: 'calc(100% - 28px)' }}>
            {series.map((s, si) => {
              const path = s.data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i/(s.data.length-1))*320} ${220 - (v/100)*220}`).join(' ');
              return <path key={s.l} d={path} stroke={s.c} strokeWidth="1.5" fill="none" opacity={0.9}/>;
            })}
          </svg>

          {/* bottom stats strip */}
          <div style={{ position: 'absolute', bottom: 14, left: 28, right: 14,
            display: 'flex', gap: 22, background: 'rgba(0,0,0,0.6)', padding: '8px 12px',
            borderLeft: '2px solid #ff3d3d' }}>
            {series.map(s => (
              <div key={s.l} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: VD.mono, fontSize: 9, color: s.c, letterSpacing: 1 }}>{s.l}</span>
                <DotText text={String(Math.round(s.data[s.data.length-1])).padStart(2,'0')} dotSize={3} gap={1} color="#fff"/>
              </div>
            ))}
          </div>
        </div>

        {/* Process list */}
        <div style={{ width: 300, padding: 14, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>TOP PROCESSES</DotLabel>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1 }}>CPU ▾</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px',
              fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, letterSpacing: 1,
              padding: '6px 0', borderBottom: `1px solid ${VD.border}` }}>
              <span>PROCESS</span><span style={{textAlign:'right'}}>CPU%</span><span style={{textAlign:'right'}}>MEM</span>
            </div>
            {procs.map((p, i) => (
              <div key={p.n} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px',
                fontFamily: VD.mono, fontSize: 11, color: i < 2 ? '#fff' : VD.textDim,
                padding: '6px 0', position: 'relative' }}>
                <span>{p.n}</span>
                <span style={{textAlign:'right'}}>{p.cpu}</span>
                <span style={{textAlign:'right'}}>{p.mem}</span>
                {/* inline bar */}
                <div style={{ position: 'absolute', left: 0, bottom: 0, height: 1,
                  width: `${Math.min(100, parseFloat(p.cpu) * 10)}%`, background: '#ff3d3d', opacity: 0.4 }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

window.MonitorB = MonitorB;
