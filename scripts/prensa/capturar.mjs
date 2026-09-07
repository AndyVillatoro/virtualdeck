/**
 * Saca las capturas de la ficha de la Microsoft Store desde la aplicación real.
 *
 *   node scripts/prensa/capturar.mjs            # las seis, a docs/prensa/
 *   node scripts/prensa/capturar.mjs 03 05      # solo esas
 *
 * Cómo funciona, y por qué así:
 *
 * · Se siembra un `deck-config.json` **antes** de arrancar, con
 *   `onboardingCompleted: true`. Sin eso el tutorial se abre encima y las seis
 *   capturas salen con el diálogo tapando la pantalla.
 * · La interfaz se maneja con `Input.dispatchMouseEvent`, que son eventos de
 *   entrada de verdad. Un `element.click()` desde `Runtime.evaluate` no vale:
 *   los gestos de las casillas van por `pointerdown`/`pointerup` con sus
 *   referencias, y React no ve nada.
 * · El tamaño se fuerza con `Emulation.setDeviceMetricsOverride`, no
 *   redimensionando la ventana: se pide una vista de 1280×720 con factor de
 *   escala 1,5 y el PNG sale a 1920×1080 exactos, con la interfaz a un tamaño
 *   legible en vez de diminuta en una esquina.
 * · Cada escena arranca su propia copia con su propio directorio de datos: el
 *   estado de la ventana y los interruptores encendidos se guardan en disco, y
 *   reutilizarlo arrastraría lo de la escena anterior.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, appendFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conectar, evaluar, dormir } from './cdp.mjs';
import { arrancarTodo, certificado, precalentar, HOSTS } from './servicios.mjs';
import { ESCENAS } from './escenas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const SALIDA = join(RAIZ, 'docs', 'prensa');
const FUENTES = join(SALIDA, 'fuentes');
const PUERTO_CDP = 9333;

/**
 * La galería del proyecto, la misma dirección que rellena el botón «GALERÍA
 * DEL PROYECTO» de los ajustes (`GALERIA_OFICIAL` en `GallerySection.tsx`).
 * Aquí solo sirve para dejarla en caché antes de empezar.
 */
const GALERIA = 'https://raw.githubusercontent.com/AndyVillatoro/virtualdeck-gallery/main';

// ── /etc/hosts: los cinco nombres que la aplicación pide a internet ───────
//
// El clima, las tres fuentes de la interfaz y el manifiesto de la galería. Los
// cinco se mandan al servidor local de `servicios.mjs`, que contesta al clima
// con una ciudad elegida a mano y **refleja** el resto desde el sitio de
// verdad.
//
// Para conseguirlo no se toca nada de la aplicación: `weather.ts` sigue con
// sus direcciones escritas dentro y `galeria.ts` sigue exigiendo `https` y
// rechazando toda dirección de la propia máquina —que es lo que impide que un
// manifiesto ajeno le haga sondear la red interna—. Las entradas se quitan al
// terminar, salga bien o mal.
const MARCA = '# virtualdeck-capturas';

function ponerHosts() {
  const antes = readFileSync('/etc/hosts', 'utf-8');
  if (antes.includes(MARCA)) return () => {};
  appendFileSync('/etc/hosts', `\n${HOSTS.map((h) => `127.0.0.1 ${h} ${MARCA}`).join('\n')}\n`);
  return () => writeFileSync('/etc/hosts', antes);
}

// ── Manejo de la interfaz ─────────────────────────────────────────────────

/**
 * El rectángulo del primer elemento que cumpla el buscador, ya a la vista.
 *
 * El `scrollIntoView` no es un adorno: el panel de ajustes es una columna con
 * su propio desplazamiento y la galería está al fondo. Sin traerla a la vista
 * primero, `getBoundingClientRect` devolvía las coordenadas de un elemento que
 * está fuera del panel, el clic caía en la rejilla de detrás y —como el panel
 * se cierra al pulsar fuera— la escena seguía con el panel ya cerrado.
 */
async function rectangulo(cdp, expresionBuscadora) {
  const r = await evaluar(cdp, `(() => {
    const el = (${expresionBuscadora})();
    if (!el) return null;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  if (!r) return null;
  await dormir(250);
  return evaluar(cdp, `(() => {
    const el = (${expresionBuscadora})();
    if (!el) return null;
    const c = el.getBoundingClientRect();
    if (c.width === 0 || c.height === 0) return null;
    return { x: c.x + c.width / 2, y: c.y + c.height / 2 };
  })()`);
}

async function clicEn(cdp, { x, y }) {
  const comun = { x: Math.round(x), y: Math.round(y), button: 'left', clickCount: 1 };
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: comun.x, y: comun.y });
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mousePressed', ...comun });
  await dormir(60);
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', ...comun });
}

/** Aparta el cursor: si se queda encima de una casilla, sale resaltada. */
async function apartarCursor(cdp) {
  await cdp.enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2 });
  await dormir(250);
}

const buscarPorTexto = (texto, etiqueta = '*') => `() => [...document.querySelectorAll(${JSON.stringify(etiqueta)})]
  .filter((e) => e.offsetParent !== null && (e.textContent ?? '').includes(${JSON.stringify(texto)}))
  .sort((a, b) => (a.textContent.length - b.textContent.length))[0]`;

const buscarCasillaVacia = `() => [...document.querySelectorAll('[title]')]
  .find((e) => (e.getAttribute('title') ?? '').startsWith('Clic para configurar'))`;

/** Por su `title`, para los botones que solo llevan un símbolo dentro. */
const buscarPorTitulo = (titulo) => `() => [...document.querySelectorAll('[title]')]
  .find((e) => e.offsetParent !== null && (e.getAttribute('title') ?? '') === ${JSON.stringify(titulo)})`;

async function clicPorBuscador(cdp, buscador, queEs) {
  const r = await rectangulo(cdp, buscador);
  if (!r) throw new Error(`no encuentro ${queEs} en la pantalla`);
  await clicEn(cdp, r);
}

/**
 * Espera a que algo aparezca, en vez de dormir un rato y confiar.
 *
 * Lo pedía la lista de la galería: la aplicación va a buscar el manifiesto por
 * la red y con una espera fija de cuatro segundos fallaba una vez de cada dos.
 */
async function esperarPorBuscador(cdp, buscador, queEs, msMax = 20000) {
  const hasta = Date.now() + msMax;
  while (Date.now() < hasta) {
    if (await rectangulo(cdp, buscador)) return;
    await dormir(500);
  }
  throw new Error(`${queEs} no apareció en ${Math.round(msMax / 1000)} s`);
}

/**
 * Abre los ajustes, carga la galería del proyecto y despliega el aviso de
 * riesgo de uno de sus perfiles.
 *
 * Se pulsa el botón «GALERÍA DEL PROYECTO», que es lo que hace un usuario: así
 * la dirección que sale en la captura es la de verdad y los perfiles son los
 * que hay publicados, no unos inventados para la foto. Desde aquí se llega a
 * `raw.githubusercontent.com`, que es donde vive el manifiesto.
 *
 * El panel de ajustes es una columna estrecha con su propio desplazamiento y
 * la galería está al fondo; `rectangulo` ya trae cada cosa a la vista antes de
 * pulsarla, que es lo único que hace que los clics caigan donde deben.
 */
async function abrirGaleriaConRiesgo(cdp) {
  await clicPorBuscador(cdp, buscarPorTexto('⚙', 'button'), 'la rueda de ajustes');
  await dormir(600);
  await clicPorBuscador(cdp, buscarPorTexto('GALERIA DEL PROYECTO', 'button'), 'el botón de la galería del proyecto');
  await esperarPorBuscador(cdp, buscarPorTexto('Streaming'), 'la lista de perfiles de la galería');
  await clicPorBuscador(cdp, buscarPorTexto('Streaming'), 'el perfil «Streaming» de la galería');
  await esperarPorBuscador(cdp, buscarPorTexto('Un perfil no son solo datos'), 'el aviso de riesgo');
  await dormir(600);

  // El aviso ya está desplegado. Se sube el panel para que quepa entero en los
  // dos tercios de arriba, pero **no** hasta el borde: la holgura deja ver el
  // rótulo de la galería y el campo de la dirección enteros, sin los cuales la
  // captura es una lista de atajos sin decir de dónde sale.
  await evaluar(cdp, `(() => {
    const aviso = [...document.querySelectorAll('div')]
      .find((e) => (e.textContent ?? '').startsWith('Un perfil no son solo datos'));
    const panel = aviso?.closest('div[style*="overflow"]') ?? aviso?.parentElement?.parentElement;
    const caja = aviso?.parentElement;
    if (panel && caja) panel.scrollTop += caja.getBoundingClientRect().top - panel.getBoundingClientRect().top - 175;
    return true;
  })()`);
  await dormir(400);
}

async function ejecutarPaso(cdp, paso) {
  if (paso.hacer === 'esperar') return dormir(paso.ms);
  if (paso.hacer === 'clicEnTexto') return clicPorBuscador(cdp, buscarPorTexto(paso.texto, 'button'), `«${paso.texto}»`);
  if (paso.hacer === 'clicEnTitulo') return clicPorBuscador(cdp, buscarPorTitulo(paso.titulo), `«${paso.titulo}»`);
  if (paso.hacer === 'clicEnCasillaVacia') return clicPorBuscador(cdp, buscarCasillaVacia, 'una casilla vacía');
  if (paso.hacer === 'abrirGaleriaConRiesgo') return abrirGaleriaConRiesgo(cdp);
  throw new Error(`paso desconocido: ${paso.hacer}`);
}

// ── Una escena ────────────────────────────────────────────────────────────

/**
 * ¿Queda alguien escuchando en el puerto del depurador?
 *
 * Hace falta comprobarlo entre escena y escena. `xvfb-run` es un guion de
 * shell que lanza a Electron **como hijo**, así que matar el proceso que
 * devuelve `spawn` deja a Electron vivo con el puerto cogido: la escena
 * siguiente no lo podía abrir, se conectaba sin saberlo a la copia anterior y
 * fotografiaba la pantalla de la escena de antes. Por eso también se lanza en
 * su propio grupo de procesos y se mata el grupo entero.
 */
async function puertoOcupado() {
  try { await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`); return true; } catch { return false; }
}

async function esperarPuertoLibre() {
  for (let i = 0; i < 40; i++) {
    if (!(await puertoOcupado())) return;
    await dormir(400);
  }
  throw new Error(`el puerto ${PUERTO_CDP} sigue ocupado; queda una copia de VirtualDeck corriendo`);
}

function matarGrupo(hijo) {
  try { process.kill(-hijo.pid, 'SIGKILL'); } catch { try { hijo.kill('SIGKILL'); } catch {} }
}

async function capturar(escena, entorno) {
  await esperarPuertoLibre();
  const datos = mkdtempSync(join(tmpdir(), 'vd-prensa-ud-'));
  writeFileSync(join(datos, 'deck-config.json'), JSON.stringify(escena.config, null, 2));
  // `windowManager` lee este archivo al arrancar. Se siembra cuando la escena
  // necesita que la ventana ocupe una medida concreta de la pantalla, que es el
  // caso de la barra flotante: el proceso principal la coloca contra el borde
  // del monitor, no contra el borde de la ventana del deck.
  if (escena.ventana) {
    writeFileSync(join(datos, 'window-state.json'), JSON.stringify(escena.ventana));
  }

  const pantalla = escena.pantalla ?? { ancho: 1600, alto: 1000 };
  const hijo = spawn('xvfb-run', [
    '-a', '-s', `-screen 0 ${pantalla.ancho}x${pantalla.alto}x24`,
    'npx', 'electron', '.',
    '--no-sandbox',
    `--user-data-dir=${datos}`,
    `--remote-debugging-port=${PUERTO_CDP}`,
    // Solo para el certificado local de `servicios.mjs`. Afecta a esta copia
    // suelta y a nada más: no se toca la comprobación de `galeria.ts`.
    '--ignore-certificate-errors',
  ], { cwd: RAIZ, env: entorno, stdio: ['ignore', 'pipe', 'pipe'], detached: true });

  let registro = '';
  hijo.stdout.on('data', (d) => { registro += d; });
  hijo.stderr.on('data', (d) => { registro += d; });

  try {
    const cdp = await esperarCdp();
    await cdp.enviar('Emulation.setDeviceMetricsOverride', {
      width: escena.ancho, height: escena.alto,
      deviceScaleFactor: escena.escala, mobile: false,
    });
    await esperarInterfaz(cdp);
    for (const paso of escena.pasos) await ejecutarPaso(cdp, paso);
    await apartarCursor(cdp);

    const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    let png = Buffer.from(data, 'base64');
    if (escena.compuesta) png = await conBarraFlotante(png, escena);
    mkdirSync(SALIDA, { recursive: true });
    writeFileSync(join(SALIDA, escena.archivo), png);
    cdp.cerrar();
    return { png, registro };
  } finally {
    matarGrupo(hijo);
    await esperarPuertoLibre();
    rmSync(datos, { recursive: true, force: true });
  }
}

/**
 * Pega la barra flotante encima del deck, en las coordenadas donde está.
 *
 * La barra **es otra ventana de Electron**, así que no sale en la captura de la
 * página del deck: `Page.captureScreenshot` fotografía un documento, no la
 * pantalla. Y aquí no hay con qué fotografiar la pantalla entera —ni `import`,
 * ni `xwd`, ni `ffmpeg`— así que se juntan las dos ventanas por sus
 * coordenadas reales.
 *
 * No es un montaje libre: es lo que hace el compositor del sistema. La ventana
 * de la barra es **transparente** y lo único opaco son los tiles (ver
 * `src/main.tsx`, que le quita el fondo a `html`, `body` y `#root`), así que se
 * captura con fondo transparente y se superpone con su canal alfa. La posición
 * y el tamaño salen de la propia ventana, no de una cuenta repetida aquí: el
 * proceso principal la coloca con `posicion()` en `floatingBar.ts` y luego la
 * barra se mide y pide su tamaño exacto con `bar.fit`.
 */
async function conBarraFlotante(deckPng, escena) {
  const sharp = (await import('sharp')).default;
  const cdp = await conectar(PUERTO_CDP, (t) => t.url.includes('#barra'));
  try {
    const caja = await evaluar(cdp, `({
      x: window.screenX, y: window.screenY,
      ancho: window.innerWidth, alto: window.innerHeight,
    })`);
    if (!caja.ancho || !caja.alto) throw new Error('la ventana de la barra flotante no tiene tamaño');

    // Su propio tamaño y la escala de la escena: así los tiles quedan a la
    // misma escala que la ventana de debajo. Cambiar el ancho o el alto aquí
    // la relayoutaría y dejaría de ser la barra que hay en pantalla.
    await cdp.enviar('Emulation.setDeviceMetricsOverride', {
      width: caja.ancho, height: caja.alto,
      deviceScaleFactor: escena.escala, mobile: false,
    });
    await cdp.enviar('Emulation.setDefaultBackgroundColorOverride', {
      color: { r: 0, g: 0, b: 0, a: 0 },
    });
    await dormir(600);
    const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });

    return sharp(deckPng)
      .composite([{
        input: Buffer.from(data, 'base64'),
        left: Math.round(caja.x * escena.escala),
        top: Math.round(caja.y * escena.escala),
      }])
      .png()
      .toBuffer();
  } finally {
    cdp.cerrar();
  }
}

async function esperarCdp() {
  for (let i = 0; i < 60; i++) {
    try { return await conectar(PUERTO_CDP); } catch { await dormir(500); }
  }
  throw new Error('el depurador no llegó a abrir');
}

/**
 * Espera a que React haya pintado, y luego a que los sondeos hayan dado una
 * vuelta.
 *
 * Los siete segundos y medio no son por prudencia: el estado del sistema —del
 * que sale el «conectado» del RGB— se publica desde el proceso principal
 * **cada cinco segundos**, y los sensores tienen su propio tic de cinco. Con
 * la captura tomada antes del primer tic, la barra lateral salía diciendo
 * «RGB DESCONECTADO» con tres dispositivos ya enumerados.
 */
async function esperarInterfaz(cdp) {
  for (let i = 0; i < 80; i++) {
    const listo = await evaluar(cdp, `!!document.body && document.body.innerText.includes('VIRTUALDECK')`).catch(() => false);
    if (listo) { await dormir(7500); await comprobarFuentes(cdp); return; }
    await dormir(400);
  }
  throw new Error('la interfaz no llegó a pintarse');
}

/**
 * Que las tres fuentes de la interfaz estén cargadas de verdad.
 *
 * `index.html` las pide a Google Fonts sin bloquear el pintado, a propósito:
 * si la red no llega, la aplicación se dibuja igual con la tipografía de
 * reserva del sistema. Eso, que en la aplicación es lo correcto, en una
 * captura es una imagen que no se parece a la que verá el usuario — y no
 * avisa de nada. Se comprobó tarde: seis capturas ya sacadas iban con la
 * tipografía equivocada y solo se notaba comparándolas.
 */
async function comprobarFuentes(cdp) {
  const faltan = await evaluar(cdp, `(() => {
    const quiero = ['Inter', 'JetBrains Mono', 'DotGothic16'];
    return quiero.filter((f) => !document.fonts.check(\`12px "\${f}"\`));
  })()`);
  if (faltan.length) {
    throw new Error(`no cargaron las fuentes: ${faltan.join(', ')} — ¿está en pie el espejo de fonts.googleapis.com?`);
  }
}

// ── El icono de mosaico de 300×300 ────────────────────────────────────────
//
// No es una captura: es el icono de la aplicación, que ya se genera con
// `npm run build:icon`. Se reescala con sharp, que es la misma herramienta que
// usa `scripts/generate-icon.js`, para que salga exactamente a 300×300 (la
// Store rechaza cualquier otra medida) y sobre el fondo del tema en vez de
// transparente, que en la ficha se ve como un recorte.
async function icono300() {
  const sharp = (await import('sharp')).default;
  // Del SVG y no del PNG de 256: el icono se dibuja a 228 px y reescalar el
  // mapa de bits deja los puntos con el borde sucio.
  const svg = join(RAIZ, 'build', 'icon.svg');
  if (!existsSync(svg)) throw new Error('falta build/icon.svg — corré `npm run build:icon`');
  const dibujo = await sharp(readFileSync(svg), { density: 384 })
    .resize(228, 228, { fit: 'contain', background: '#00000000' })
    .png().toBuffer();
  const png = await sharp({ create: { width: 300, height: 300, channels: 4, background: '#0f0f0f' } })
    .composite([{ input: dibujo }])
    .png().toBuffer();
  writeFileSync(join(SALIDA, 'icono-mosaico-300.png'), png);
  return png;
}

// ── Programa ──────────────────────────────────────────────────────────────

async function main() {
  const pedidas = process.argv.slice(2);
  const escenas = pedidas.length
    ? ESCENAS.filter((e) => pedidas.some((p) => e.archivo.startsWith(p)))
    : ESCENAS;
  if (escenas.length === 0) throw new Error(`ninguna escena coincide con ${pedidas.join(', ')}`);

  mkdirSync(FUENTES, { recursive: true });
  const tls = certificado();
  const servicios = await arrancarTodo(tls);
  // La galería del proyecto, en caché antes de empezar: la aplicación la pide
  // con diez segundos de plazo y el primer viaje a internet no siempre entra.
  await precalentar([
    `${GALERIA}/manifest.json`,
    ...['esencial', 'streaming', 'trabajo', 'rgb'].map((p) => `${GALERIA}/profiles/${p}.json`),
  ]);
  const quitarHosts = ponerHosts();

  // Sin proxy en la copia que se fotografía: todo lo que pide durante una
  // captura está en 127.0.0.1, o llega ahí por `/etc/hosts`. El `fetch` de
  // Node del proceso principal ignora estas variables de todos modos, pero
  // `net.fetch` —la pila de red de Chromium— sí las lee, y su túnel por el
  // proxy se corta a los seis segundos: la galería devolvía «la operación se
  // canceló por tiempo de espera». Quien sí sale a internet es este guion,
  // para reflejar las fuentes y el manifiesto (ver `servicios.mjs`).
  const entornoSinProxy = { ...process.env };
  for (const k of Object.keys(entornoSinProxy)) {
    if (/^(https?|all|no)_proxy$/i.test(k)) delete entornoSinProxy[k];
  }

  const entorno = {
    ...entornoSinProxy,
    // El certificado local, para el `fetch` de Node del proceso principal.
    NODE_EXTRA_CA_CERTS: tls.rutaCert,
    // La pista de la franja de reproducción. El por qué, en `mediosFijos.ts`.
    VD_MEDIOS_FIJOS: join(FUENTES, 'reproduccion.json'),
    // El reloj de la captura y la ciudad del clima, en la misma zona: con el
    // contenedor en UTC salía un deck de estudio a las 04:31.
    TZ: 'America/Tegucigalpa',
  };

  try {
    for (const escena of escenas) {
      process.stdout.write(`· ${escena.archivo} — ${escena.titulo}\n`);
      const { png, registro } = await capturar(escena, entorno);
      const { width, height } = await medir(png);
      const bien = width === 1920 && height === 1080;
      process.stdout.write(`  ${width}×${height} ${(png.length / 1024).toFixed(0)} kB ${bien ? '✓' : '✗ NO es 1920×1080'}\n`);
      if (!bien) writeFileSync(join(SALIDA, `${escena.archivo}.registro.txt`), registro);
    }
    const icono = await icono300();
    const m = await medir(icono);
    process.stdout.write(`· icono-mosaico-300.png — ${m.width}×${m.height} ${m.width === 300 && m.height === 300 ? '✓' : '✗'}\n`);
  } finally {
    quitarHosts();
    servicios.parar();
  }
}

async function medir(png) {
  const sharp = (await import('sharp')).default;
  const { width, height } = await sharp(png).metadata();
  return { width, height };
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
