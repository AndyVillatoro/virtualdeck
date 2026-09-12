/**
 * El mando móvil (1.1): la página que sirve el servidor local en `/`.
 *
 * Es una sola página sin compilar y sin dependencias — el renderer de
 * VirtualDeck es React con Vite, pero meter ese build aquí significaría un
 * segundo bundle para algo que son dos pantallas: pedir el código y una
 * rejilla de botones. Va como cadena porque tiene que salir del proceso
 * principal, que es quien tiene el servidor.
 *
 * **El token no viaja en la dirección.** El teléfono escribe
 * `http://<ip>:<puerto>` a mano, que es corto, y el emparejamiento se hace con
 * un código de seis cifras que caduca. Un enlace con el token dentro habría
 * quedado en el historial del navegador del teléfono y en cualquier captura de
 * pantalla que alguien mande para pedir ayuda.
 *
 * Los textos van en los dos idiomas dentro de la propia página: no puede usar
 * el i18n de `src/` (otro proceso, y encima otro dispositivo) ni el de
 * `idioma.ts`, porque el idioma que manda aquí es el del **teléfono**, no el
 * del equipo. Por eso `check-i18n.mjs` la trata aparte.
 */

const TEXTOS = {
  es: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'Escriba el código de seis cifras que aparece en VirtualDeck',
    emparejar: 'EMPAREJAR',
    codigoMal: 'El código no vale o ya caducó.',
    sinBotones: 'No hay botones con acción en este deck.',
    reintentar: 'REINTENTAR',
    sinConexion: 'Sin conexión con VirtualDeck.',
    olvidar: 'DESCONECTAR',
    pagina: 'PÁGINA',
    pantallaCompleta: 'PANTALLA COMPLETA',
    salirPantallaCompleta: 'SALIR DE PANTALLA COMPLETA',
  },
  en: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'Enter the six-digit code shown in VirtualDeck',
    emparejar: 'PAIR',
    codigoMal: 'That code is wrong or has expired.',
    sinBotones: 'This deck has no buttons with an action.',
    reintentar: 'RETRY',
    sinConexion: 'No connection to VirtualDeck.',
    olvidar: 'DISCONNECT',
    pagina: 'PAGE',
    pantallaCompleta: 'FULLSCREEN',
    salirPantallaCompleta: 'EXIT FULLSCREEN',
  },
};

export function paginaMando(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#070809">
<title>VirtualDeck</title>
<style>
  :root {
    --bg: #070809;
    --sup: #121417;
    --alt: #181b20;
    --bor: #282c35;
    --txt: #e2e4e8;
    --ten: #78808d;
    --ac: #4a8ef0;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; background: var(--bg); color: var(--txt);
    font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
    min-height: 100vh; display: flex; flex-direction: column;
  }
  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 2px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 12px;
  }
  .logo { display: flex; align-items: center; gap: 8px; letter-spacing: 3px; font-size: 12px; font-weight: 700; }
  .punto { width: 8px; height: 8px; border-radius: 50%; background: var(--ac); box-shadow: 0 0 8px var(--ac); }
  .cab-btn {
    background: var(--sup); border: 1px solid var(--bor); border-radius: 6px;
    color: var(--txt); font-size: 11px; padding: 6px 10px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 5px; font-family: inherit;
    transition: background 0.12s, border-color 0.12s;
  }
  .cab-btn:active { background: var(--alt); border-color: var(--ac); }
  .cab-acciones { display: flex; gap: 6px; align-items: center; }
  .rejilla {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px; padding-bottom: 24px; width: 100%;
  }
  .celda {
    aspect-ratio: 1; background: var(--alt); border: 1px solid var(--bor); border-radius: 10px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; overflow: hidden; user-select: none; cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    transition: transform 0.08s ease, border-color 0.12s, box-shadow 0.12s;
  }
  .celda:active {
    transform: scale(0.93); border-color: var(--ac);
    box-shadow: 0 0 14px rgba(74, 142, 240, 0.4);
  }
  .celda.ok { border-color: #22c55e !important; box-shadow: 0 0 16px rgba(34, 197, 94, 0.5) !important; }
  .celda.mal { border-color: #ef4444 !important; box-shadow: 0 0 16px rgba(239, 68, 68, 0.5) !important; }
  .fondo-img {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
    opacity: 0.88; border-radius: inherit; pointer-events: none;
  }
  .icono-centro {
    font-size: 26px; line-height: 1; z-index: 1;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9)); pointer-events: none;
  }
  .rotulo {
    position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 6px;
    background: rgba(7, 8, 9, 0.82); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
    border-top: 1px solid rgba(255, 255, 255, 0.06); border-radius: 0 0 9px 9px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; pointer-events: none; z-index: 2;
  }
  .label-txt {
    font-size: 9px; font-weight: 600; letter-spacing: 0.5px;
    max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .sublabel-txt {
    font-size: 7px; color: var(--ten); letter-spacing: 0.5px;
    max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;
  }
  input {
    width: 100%; background: var(--sup); border: 1px solid var(--bor); border-radius: 8px;
    color: var(--txt); font: inherit; font-size: 24px; letter-spacing: 8px; text-align: center;
    padding: 14px; outline: none; margin-top: 12px;
  }
  input:focus { border-color: var(--ac); box-shadow: 0 0 10px rgba(74, 142, 240, 0.25); }
  button.principal {
    width: 100%; margin-top: 12px; padding: 14px; background: var(--ac); border: none; border-radius: 8px;
    color: #fff; font: inherit; font-size: 13px; font-weight: 700; letter-spacing: 2px; cursor: pointer;
    box-shadow: 0 2px 10px rgba(74, 142, 240, 0.35);
  }
  button.principal:active { transform: scale(0.98); }
  .paginas { display: flex; gap: 6px; overflow-x: auto; padding: 0 0 12px; scrollbar-width: none; }
  .paginas::-webkit-scrollbar { display: none; }
  .pest {
    flex: 0 0 auto; padding: 7px 14px; border: 1px solid var(--bor); background: var(--sup);
    border-radius: 7px; font-size: 10px; letter-spacing: 1px; color: var(--ten); cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }
  .pest.viva {
    border-color: var(--ac); color: var(--ac); background: rgba(74, 142, 240, 0.12); font-weight: 700;
  }
  p { font-size: 12px; line-height: 1.6; color: var(--ten); margin: 6px 0; }
  .mal { color: #ef4444; }
</style>
</head>
<body>
<header>
  <div class="logo"><span class="punto"></span><span id="titulo"></span></div>
  <div class="cab-acciones">
    <button id="btn-fullscreen" class="cab-btn" title="Pantalla completa">⛶</button>
    <button id="btn-olvidar" class="cab-btn" style="display:none" title="Desconectar">✕</button>
  </div>
</header>
<div id="app"></div>
<script>
const T = ${JSON.stringify(TEXTOS)};
const t = T[(navigator.language || 'es').slice(0,2) === 'es' ? 'es' : 'en'];
document.getElementById('titulo').textContent = t.titulo;
const btnFs = document.getElementById('btn-fullscreen');
const btnOlvidar = document.getElementById('btn-olvidar');
btnFs.title = t.pantallaCompleta;
btnOlvidar.title = t.olvidar;

function alternarFullscreen() {
  const doc = document;
  const el = doc.documentElement;
  const estaFs = doc.fullscreenElement || doc.webkitFullscreenElement;
  if (!estaFs) {
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  }
}
btnFs.onclick = alternarFullscreen;
document.addEventListener('fullscreenchange', () => {
  const estaFs = !!document.fullscreenElement;
  btnFs.textContent = estaFs ? '🗗' : '⛶';
  btnFs.title = estaFs ? t.salirPantallaCompleta : t.pantallaCompleta;
});

const app = document.getElementById('app');
let token = null;
try { token = localStorage.getItem('vd-token'); } catch (e) { /* privado */ }
let paginaViva = 0;

btnOlvidar.onclick = olvidar;

const pedir = (ruta, opciones) => fetch(ruta, {
  ...opciones,
  headers: { 'X-VD-Token': token || '', ...(opciones && opciones.headers) },
});

function vaciar() { app.innerHTML = ''; }
function nodo(tag, props, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  for (const h of hijos) if (h) e.append(h);
  return e;
}

function svgGlifo57(filas, color) {
  let puntos = '';
  for (let y = 0; y < 7; y++) {
    const fila = filas[y] || 0;
    for (let x = 0; x < 5; x++) {
      if ((fila >> (4 - x)) & 1) {
        puntos += '<circle cx="' + (x * 5 + 3) + '" cy="' + (y * 5 + 3) + '" r="1.8" fill="' + (color || 'currentColor') + '" />';
      }
    }
  }
  return '<svg viewBox="0 0 26 36" width="22" height="30" style="display:block;z-index:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">' + puntos + '</svg>';
}

function pantallaEmparejar(error) {
  btnOlvidar.style.display = 'none';
  vaciar();
  app.append(nodo('p', { textContent: t.pedirCodigo }));
  if (error) app.append(nodo('p', { className: 'mal', textContent: error }));
  const campo = nodo('input', { inputMode: 'numeric', maxLength: 6, autocomplete: 'off', placeholder: '······' });
  const boton = nodo('button', { className: 'principal', textContent: t.emparejar });
  const enviar = async () => {
    boton.disabled = true;
    try {
      const r = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: campo.value.trim() }),
      });
      const d = await r.json();
      if (!d.ok) return pantallaEmparejar(t.codigoMal);
      token = d.token;
      try { localStorage.setItem('vd-token', token); } catch (e) { /* modo privado */ }
      pantallaDeck();
    } catch (e) {
      pantallaEmparejar(t.sinConexion);
    } finally { boton.disabled = false; }
  };
  boton.onclick = enviar;
  campo.onkeydown = (e) => { if (e.key === 'Enter') enviar(); };
  app.append(campo, boton);
  campo.focus();
}

async function pantallaDeck() {
  btnOlvidar.style.display = 'inline-flex';
  let datos;
  try {
    const r = await pedir('/api/buttons');
    if (r.status === 401) { olvidar(); return; }
    datos = await r.json();
  } catch (e) {
    vaciar();
    app.append(nodo('p', { className: 'mal', textContent: t.sinConexion }),
               nodo('button', { className: 'principal', textContent: t.reintentar, onclick: pantallaDeck }));
    return;
  }
  const botones = datos.buttons || [];
  vaciar();
  const paginas = [...new Set(botones.map((b) => b.page))].sort((a, b) => a - b);
  if (paginas.length > 1) {
    const barra = nodo('div', { className: 'paginas' });
    for (const p of paginas) {
      barra.append(nodo('div', {
        className: 'pest' + (p === paginaViva ? ' viva' : ''),
        textContent: t.pagina + ' ' + (p + 1),
        onclick: () => { paginaViva = p; pantallaDeck(); },
      }));
    }
    app.append(barra);
  }
  const rejilla = nodo('div', { className: 'rejilla' });
  const visibles = botones.filter((b) => paginas.length <= 1 || b.page === paginaViva);
  if (visibles.length === 0) app.append(nodo('p', { textContent: t.sinBotones }));
  for (const b of visibles) {
    const celda = nodo('div', { className: 'celda' });
    if (b.bgColor) celda.style.backgroundColor = b.bgColor;
    if (b.fgColor) celda.style.color = b.fgColor;

    if (b.imageData) {
      const img = nodo('img', { className: 'fondo-img', src: b.imageData, alt: '' });
      celda.append(img);
    }

    if (b.customGlyph57 && b.customGlyph57.length === 7) {
      const wrap = nodo('div');
      wrap.innerHTML = svgGlifo57(b.customGlyph57, b.fgColor);
      celda.append(wrap);
    } else if (b.icon) {
      celda.append(nodo('div', { className: 'icono-centro', textContent: b.icon }));
    }

    if (b.label || b.sublabel) {
      const rotulo = nodo('div', { className: 'rotulo' });
      if (b.label) rotulo.append(nodo('span', { className: 'label-txt', textContent: b.label }));
      if (b.sublabel) rotulo.append(nodo('span', { className: 'sublabel-txt', textContent: b.sublabel }));
      celda.append(rotulo);
    }

    celda.onclick = async () => {
      if ('vibrate' in navigator) {
        try { navigator.vibrate(30); } catch (e) {}
      }
      let ok = false;
      try { ok = (await pedir('/api/press/' + encodeURIComponent(b.id))).ok; } catch (e) { ok = false; }
      celda.classList.add(ok ? 'ok' : 'mal');
      setTimeout(() => celda.classList.remove('ok', 'mal'), 350);
    };
    rejilla.append(celda);
  }
  app.append(rejilla);
}

function olvidar() {
  token = null;
  try { localStorage.removeItem('vd-token'); } catch (e) { /* modo privado */ }
  pantallaEmparejar();
}

if (token) pantallaDeck(); else pantallaEmparejar();
</script>
</body>
</html>`;
}
