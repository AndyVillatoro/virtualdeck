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
    olvidar: 'OLVIDAR ESTE TELÉFONO',
    pagina: 'PÁGINA',
  },
  en: {
    titulo: 'VIRTUALDECK',
    pedirCodigo: 'Enter the six-digit code shown in VirtualDeck',
    emparejar: 'PAIR',
    codigoMal: 'That code is wrong or has expired.',
    sinBotones: 'This deck has no buttons with an action.',
    reintentar: 'RETRY',
    sinConexion: 'No connection to VirtualDeck.',
    olvidar: 'FORGET THIS PHONE',
    pagina: 'PAGE',
  },
};

export function paginaMando(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>VirtualDeck</title>
<style>
  :root { --bg:#0f0f0f; --sup:#171717; --alt:#1f1f1f; --bor:#2e2e2e; --txt:#dcdcdc; --ten:#888; --ac:#4a8ef0; }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin:0; background:var(--bg); color:var(--txt);
         font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, monospace;
         padding: env(safe-area-inset-top) 12px env(safe-area-inset-bottom); }
  header { display:flex; align-items:center; gap:8px; padding:14px 2px; letter-spacing:3px; font-size:12px; }
  .punto { width:8px; height:8px; border-radius:50%; background:var(--ac); }
  .rejilla { display:grid; grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:8px; padding-bottom:24px; }
  .celda { aspect-ratio:1; background:var(--alt); border:1px solid var(--bor); border-radius:8px;
           display:flex; align-items:center; justify-content:center; text-align:center;
           padding:6px; font-size:10px; letter-spacing:1px; word-break:break-word;
           user-select:none; cursor:pointer; transition:background .12s, border-color .12s; }
  .celda:active, .celda.ok { background:rgba(74,142,240,.18); border-color:var(--ac); }
  .celda.mal { border-color:#e05252; }
  input { width:100%; background:var(--sup); border:1px solid var(--bor); border-radius:6px;
          color:var(--txt); font:inherit; font-size:22px; letter-spacing:8px; text-align:center;
          padding:12px; outline:none; }
  button { width:100%; margin-top:10px; padding:12px; background:var(--ac); border:none; border-radius:6px;
           color:#fff; font:inherit; font-size:12px; letter-spacing:2px; cursor:pointer; }
  .apagado { background:transparent; border:1px solid var(--bor); color:var(--ten); }
  p { font-size:11px; line-height:1.6; color:var(--ten); }
  .mal { color:#e05252; }
  .paginas { display:flex; gap:6px; overflow-x:auto; padding:0 0 10px; }
  .pest { flex:0 0 auto; padding:6px 12px; border:1px solid var(--bor); border-radius:6px;
          font-size:10px; letter-spacing:1px; color:var(--ten); cursor:pointer; }
  .pest.viva { border-color:var(--ac); color:var(--ac); }
</style>
</head>
<body>
<header><span class="punto"></span><span id="titulo"></span></header>
<div id="app"></div>
<script>
const T = ${JSON.stringify(TEXTOS)};
const t = T[(navigator.language || 'es').slice(0,2) === 'es' ? 'es' : 'en'];
document.getElementById('titulo').textContent = t.titulo;
const app = document.getElementById('app');
// El token vive solo en este telefono. No viaja en ninguna direccion.
let token = null;
try { token = localStorage.getItem('vd-token'); } catch (e) { /* modo privado */ }
let paginaViva = 0;

const pedir = (ruta, opciones) => fetch(ruta, {
  ...opciones,
  headers: { 'X-VD-Token': token || '', ...(opciones && opciones.headers) },
});

function vaciar() { app.innerHTML = ''; }
function nodo(tag, props, ...hijos) {
  const e = Object.assign(document.createElement(tag), props);
  for (const h of hijos) e.append(h);
  return e;
}

function pantallaEmparejar(error) {
  vaciar();
  app.append(nodo('p', { textContent: t.pedirCodigo }));
  if (error) app.append(nodo('p', { className: 'mal', textContent: error }));
  const campo = nodo('input', { inputMode: 'numeric', maxLength: 6, autocomplete: 'off' });
  const boton = nodo('button', { textContent: t.emparejar });
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
  let datos;
  try {
    const r = await pedir('/api/buttons');
    if (r.status === 401) { olvidar(); return; }
    datos = await r.json();
  } catch (e) {
    vaciar();
    app.append(nodo('p', { className: 'mal', textContent: t.sinConexion }),
               nodo('button', { textContent: t.reintentar, onclick: pantallaDeck }));
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
    const celda = nodo('div', { className: 'celda', textContent: b.label || b.id });
    celda.onclick = async () => {
      // La respuesta del deck marca la celda: sin eso, en el telefono no hay
      // ninguna señal de que el boton llego a hacer algo.
      let ok = false;
      try { ok = (await pedir('/api/press/' + encodeURIComponent(b.id))).ok; } catch (e) { ok = false; }
      celda.classList.add(ok ? 'ok' : 'mal');
      setTimeout(() => celda.classList.remove('ok', 'mal'), 400);
    };
    rejilla.append(celda);
  }
  app.append(rejilla);
  app.append(nodo('button', { className: 'apagado', textContent: t.olvidar, onclick: olvidar }));
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
