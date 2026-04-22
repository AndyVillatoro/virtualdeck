// Design notes shown at the top of the canvas — acts like the junior-designer
// "here's what I'm thinking" memo before the variations.

const DesignNotes = () => (
  <div style={{
    position: 'absolute', top: 20, left: 60, right: 60,
    background: '#181818', color: '#e6e6e6',
    borderRadius: 2, padding: '28px 36px',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 13, lineHeight: 1.7,
    boxShadow: '0 2px 10px rgba(0,0,0,.2)',
    zIndex: 3,
  }}>
    <div style={{ fontFamily: '"DotGothic16", monospace', fontSize: 28, letterSpacing: 2, marginBottom: 14, color: '#fff' }}>
      VIRTUALDECK · WIREFRAMES
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, color: '#a8a8a8' }}>
      <div>
        <div style={{ color: '#ff3d3d', marginBottom: 6 }}>// SYSTEM</div>
        Dark mode puro · neutros sin tinte<br/>
        Bg <span style={{color:'#fff'}}>#0a0a0d</span> · Surf <span style={{color:'#fff'}}>#14141a</span><br/>
        Acento configurable (default rojo)<br/>
        Tipo display: puntos matriciales<br/>
        UI: mono, Labels: sans
      </div>
      <div>
        <div style={{ color: '#ff3d3d', marginBottom: 6 }}>// SCOPE</div>
        5 pantallas × 2 variantes<br/>
        Grid adaptativo · Glass sobre wallpaper<br/>
        Title bar integrado (no chrome)<br/>
        Fullscreen kiosco sin controles<br/>
        Puntos: reloj · labels · detalles
      </div>
      <div>
        <div style={{ color: '#ff3d3d', marginBottom: 6 }}>// TWEAKS EN VIVO</div>
        Tamaño de grid (3×3 → 6×4)<br/>
        Densidad de puntos (sutil/bold)<br/>
        Toggle métricas CPU/RAM<br/>
        Toggle fullscreen kiosco<br/>
        Acento (hue picker)
      </div>
    </div>
  </div>
);

window.DesignNotes = DesignNotes;
