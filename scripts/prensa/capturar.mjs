/**
 * Saca las capturas de la ficha de la Microsoft Store desde la aplicación real.
 *
 *   node scripts/prensa/capturar.mjs                     # las once, a docs/prensa/
 *   node scripts/prensa/capturar.mjs 03 05               # solo esas
 *   VD_PRENSA_IDIOMA=en node scripts/prensa/capturar.mjs # tanda en inglés, a docs/prensa/en/
 *
 *   # A una carpeta de borrador, sin pisar las definitivas:
 *   $env:VD_PRENSA_SALIDA='_referencias/informes/prensa-borrador/es'
 *   $env:VD_PRENSA_FUENTES='_referencias/informes/prensa-borrador/fuentes'
 *   node scripts/prensa/capturar.mjs
 *
 * Cómo funciona, y por qué así:
 *
 * · Se siembra un `deck-config.json` **antes** de arrancar, con
 *   `onboardingCompleted: true`. Sin eso el tutorial se abre encima y todas
 *   las capturas salen con el diálogo tapando la pantalla.
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
 * · Antes de la primera escena se espera a que `probar-app.mjs` esté libre:
 *   las dos cosas usan el puerto 9333 y no se lanzan a la vez.
 */
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conectar, evaluar, dormir } from './cdp.mjs';
import { arrancarTodo, certificado, CLIMA, HOSTS } from './servicios.mjs';
import { ESCENAS, IDIOMA } from './escenas.mjs';
import { reproduccion } from './caratula.mjs';
import { generarArtesTienda, generarFondoNeutro } from './artes.mjs';
import { PUERTO_CDP, abrirVentanaTienda, capturarMando } from './ventanas.mjs';
import { conBarraFlotante, conLienzo, fondoDeEscritorio } from './composicion.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const PRENSA = join(RAIZ, 'docs', 'prensa');
/**
 * El inglés va a su propia carpeta.
 *
 * La ficha de la Store pide las imágenes **una vez por idioma**, así que hacen
 * falta las dos tandas a la vez. Con una sola carpeta, correr esto en inglés
 * pisaba las de español sin avisar. `VD_PRENSA_SALIDA` y `VD_PRENSA_FUENTES`
 * permiten sacarlas a un borrador sin tocar las definitivas.
 */
const SALIDA = process.env.VD_PRENSA_SALIDA
  ? resolve(RAIZ, process.env.VD_PRENSA_SALIDA)
  : IDIOMA === 'en' ? join(PRENSA, 'en') : PRENSA;
const FUENTES = process.env.VD_PRENSA_FUENTES
  ? resolve(RAIZ, process.env.VD_PRENSA_FUENTES)
  : join(PRENSA, 'fuentes');

const WINDOWS = process.platform === 'win32';

/**
 * El binario de Electron, no `npx`. Con `shell: true` el PID que devuelve
 * `spawn` es el del shell, no el de Electron, y al cerrar se quedaba todo el
 * arbol vivo aguantando el puerto de depuracion.
 */
const ELECTRON_EXE = join(RAIZ, 'node_modules', 'electron', 'dist', 'electron.exe');

// ── El candado de la copia de prueba ──────────────────────────────────────

/**
 * Espera a que `probar-app.mjs` no tenga una copia abierta.
 *
 * Las dos herramientas usan el puerto 9333. El candado es el mismo archivo
 * (`%TEMP%\vd-prueba.lock`): si hay una copia viva, aquí se espera en vez de
 * chocar. Un candado con el PID muerto se ignora.
 */
const CANDADO = join(tmpdir(), 'vd-prueba.lock');

function pidVivo(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function esperarCopiaDePrueba() {
  const hasta = Date.now() + 15 * 60 * 1000;
  let avisado = false;
  for (;;) {
    let ocupado = null;
    if (existsSync(CANDADO)) {
      try {
        const c = JSON.parse(readFileSync(CANDADO, 'utf-8'));
        if (c?.pid && pidVivo(c.pid)) ocupado = c;
      } catch { /* candado ilegible: se trata como libre */ }
    }
    if (!ocupado) return;
    if (!avisado) {
      process.stdout.write(`· hay una copia de prueba abierta por «${ocupado.quien}»: se espera a que se cierre...\n`);
      avisado = true;
    }
    if (Date.now() > hasta) throw new Error('la copia de prueba no se cerró en 15 minutos; no se captura a la vez');
    await dormir(5000);
  }
}

// ── /etc/hosts: los cinco nombres que la aplicación pide a internet ───────
//
// El clima, las tres fuentes de la interfaz y el manifiesto de la galería. Los
// cinco se mandan al servidor local de `servicios.mjs`, que contesta al clima
// con una ciudad elegida a mano y **refleja** el resto desde el sitio de
// verdad. En Windows no se toca el archivo `hosts` (pide administrador): los
// nombres se redirigen solo para esa copia con `--host-resolver-rules`.
const MARCA = '# virtualdeck-capturas';

function reglasDeNombres() {
  return `MAP ${HOSTS.join(' 127.0.0.1, MAP ')} 127.0.0.1`;
}

function ponerHosts() {
  if (WINDOWS) return () => {};
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

/**
 * Pone la vista arriba del todo.
 *
 * Los pasos que buscan un elemento lo traen a la vista con `scrollIntoView`
 * (ver `rectangulo`), y eso deja desplazado el contenedor que se fotografía:
 * la captura de la tienda salía empezando por la mitad de la ficha, con la
 * portada cortada. Esta vuelta lo deshace justo antes de disparar.
 */
async function irArriba(cdp) {
  await evaluar(cdp, `(() => {
    let movidos = 0;
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollTop > 0) { el.scrollTop = 0; movidos++; }
    }
    return movidos;
  })()`);
  await dormir(400);
}

/**
 * Sustituye en la pantalla los datos de la máquina donde corre la captura.
 *
 * Quedan dos costuras por las que se cuelan datos reales y que no se pueden
 * cerrar desde fuera:
 *
 * · El número de serie del dock sale del aparato enumerado por `node-hid`
 *   (el `atarAlN3` lo necesita para que la página salga «CONECTADO»), y no
 *   hay forma de que el aparato reporte uno inventado.
 * · La lista de aplicaciones en ejecución sale del núcleo nativo, que
 *   enumera las ventanas del sistema.
 *
 * Así que se sustituyen **después de pintar y antes de disparar**, que es lo
 * que pidió el supervisor: serial inventado (el aparato sigue «CONECTADO») y
 * aplicaciones inventadas. Se buscan por su forma —el rótulo «… Serie: …» y la
 * caja que cuelga de «APLICACIONES EN EJECUCIÓN»— y no por su valor: el serial
 * real no tiene por qué estar escrito en este archivo. A las fichas de apps se
 * les quita además el icono, que sale del ejecutable de verdad.
 */
async function enmascarar(cdp, { serial, apps }) {
  const cambios = await evaluar(cdp, `(() => {
    const Serial = ${JSON.stringify(serial)};
    const apps = ${JSON.stringify(apps ?? [])};
    let cambios = 0;
    const paseo = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while (paseo.nextNode()) nodos.push(paseo.currentNode);
    for (const n of nodos) {
      const m = /^(.*(?:serie|serial)[^:]*:\\s*)\\S+\\s*$/i.exec(n.data);
      if (m) { n.data = m[1] + Serial; cambios++; }
    }
    const etiqueta = [...document.querySelectorAll('span')].find((e) => e.children.length === 0
      && /APLICACIONES EN EJECUCIÓN|RUNNING APPLICATIONS/i.test(e.textContent ?? ''));
    const caja = etiqueta?.parentElement?.nextElementSibling;
    const fichas = caja ? [...caja.querySelectorAll('button')] : [];
    fichas.forEach((f, i) => {
      for (const hijo of [...f.children]) if (hijo.tagName !== 'SPAN') hijo.remove();
      const texto = f.querySelector('span');
      if (texto) texto.textContent = apps[i % apps.length];
    });
    if (etiqueta && fichas.length) {
      etiqueta.textContent = etiqueta.textContent.replace(/\\(\\d+\\)/, \`(\${Math.min(apps.length, fichas.length)})\`);
      cambios++;
    }
    return cambios;
  })()`);
  if (cambios === 0) process.stdout.write('  aviso: la escena pide privacidad y no se sustituyó nada\n');
}

// La comparación del texto va en mayúsculas: la interfaz mezcla rótulos en
// versalitas («KIOSKO») con los del menú contextual («Editar»), y los pasos no
// deberían depender de eso.
const buscarPorTexto = (texto, etiqueta = '*') => `() => {
  const quiero = ${JSON.stringify(texto)}.toUpperCase();
  return [...document.querySelectorAll(${JSON.stringify(etiqueta)})]
    .filter((e) => e.offsetParent !== null && (e.textContent ?? '').toUpperCase().includes(quiero))
    .sort((a, b) => (a.textContent.length - b.textContent.length))[0];
}`;

const buscarCasillaVacia = `() => [...document.querySelectorAll('[title]')]
  .find((e) => (e.getAttribute('title') ?? '').startsWith(${JSON.stringify(IDIOMA === 'en' ? 'Click to configure' : 'Clic para configurar')}))`;

/** Por su `title`, para los botones que solo llevan un símbolo dentro. */
const buscarPorTitulo = (titulo) => `() => [...document.querySelectorAll('[title]')]
  .find((e) => e.offsetParent !== null && (e.getAttribute('title') ?? '') === ${JSON.stringify(titulo)})`;

/** `title` que **contiene** el texto: la casilla de un botón lleva la etiqueta dentro. */
const buscarPorTituloIncluye = (texto) => `() => [...document.querySelectorAll('[title]')]
  .filter((e) => e.offsetParent !== null && (e.getAttribute('title') ?? '').includes(${JSON.stringify(texto)}))
  .sort((a, b) => ((a.getAttribute('title') ?? '').length - (b.getAttribute('title') ?? '').length))[0]`;

/** Un campo por su placeholder, para el buscador de acciones y el del catálogo. */
const buscarPorPlaceholder = (texto) => `() => [...document.querySelectorAll('input')]
  .find((e) => e.offsetParent !== null && (e.placeholder ?? '').includes(${JSON.stringify(texto)}))`;

/** Una tarjeta de la tienda: el único `div[role="button"]` de la pantalla. */
const buscarTarjeta = (texto) => `() => [...document.querySelectorAll('div[role="button"]')]
  .find((e) => e.offsetParent !== null && (e.textContent ?? '').includes(${JSON.stringify(texto)}))`;

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
 * `abrirTienda` pasa el testigo: los pasos siguientes van contra la ventana
 * de la tienda, que es otra página del mismo depurador. `escribir` enfoca el
 * campo por su placeholder (los eventos de texto del depurador son de verdad,
 * así que React los ve) y escribe.
 */
async function escribirEn(cdp, { texto, en }) {
  await clicPorBuscador(cdp, buscarPorPlaceholder(en), `el campo «${en}»`);
  await cdp.enviar('Input.insertText', { text: texto });
}

/**
 * El clic derecho abre el menú de la casilla; el paso siguiente pulsa «Editar».
 *
 * Se lanza el `contextmenu` desde la página y no con `Input.dispatchMouseEvent`:
 * el botón derecho del depurador no llega a generar el evento del menú nativo
 * (la casilla quedaba sin menú). El manejador lee `clientX/clientY`, así que un
 * `MouseEvent` con las coordenadas del centro vale; el `preventDefault()` de la
 * celda no molesta.
 */
async function clicDerecho(cdp, buscador, queEs) {
  const ok = await evaluar(cdp, `(() => {
    const el = (${buscador})();
    if (!el) return false;
    const c = el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, button: 2, buttons: 2,
      clientX: c.x + c.width / 2, clientY: c.y + c.height / 2,
    }));
    return true;
  })()`);
  if (!ok) throw new Error(`no encuentro ${queEs} en la pantalla`);
  await dormir(300);
}

async function ejecutarPaso(cdp, paso, ctx) {
  const activo = () => ctx.cdpDestino ?? cdp;
  if (paso.hacer === 'esperar') return dormir(paso.ms);
  if (paso.hacer === 'clicEnTexto') return clicPorBuscador(activo(), buscarPorTexto(paso.texto, 'button'), `«${paso.texto}»`);
  // Para los rótulos del menú contextual, que son `div` con `onClick` y no `<button>`.
  if (paso.hacer === 'clicEnTextoLibre') return clicPorBuscador(activo(), buscarPorTexto(paso.texto), `«${paso.texto}»`);
  if (paso.hacer === 'clicEnTitulo') return clicPorBuscador(activo(), buscarPorTitulo(paso.titulo), `«${paso.titulo}»`);
  if (paso.hacer === 'clicEnCasillaVacia') return clicPorBuscador(activo(), buscarCasillaVacia, 'una casilla vacía');
  if (paso.hacer === 'clicDerechoEnCasilla') return clicDerecho(activo(), buscarPorTituloIncluye(paso.titulo), `la casilla «${paso.titulo}»`);
  if (paso.hacer === 'clicEnTarjeta') return clicPorBuscador(activo(), buscarTarjeta(paso.texto), `la tarjeta «${paso.texto}»`);
  if (paso.hacer === 'esperarTexto') return esperarPorBuscador(activo(), buscarPorTexto(paso.texto), `«${paso.texto}»`);
  if (paso.hacer === 'scrollArriba') return irArriba(activo());
  if (paso.hacer === 'escribir') return escribirEn(activo(), paso);
  if (paso.hacer === 'abrirTienda') {
    ctx.cdpDestino = await abrirVentanaTienda(cdp, ctx.escena);
    return;
  }
  throw new Error(`paso desconocido: ${paso.hacer}`);
}

// ── Una escena ────────────────────────────────────────────────────────────

/**
 * ¿Queda alguien escuchando en el puerto del depurador?
 *
 * Hace falta comprobarlo entre escena y escena. En Linux `xvfb-run` lanza a
 * Electron **como hijo**, y matar el proceso que devuelve `spawn` deja a
 * Electron vivo con el puerto cogido: la escena siguiente se conectaba sin
 * saberlo a la copia anterior. Por eso también se lanza en su propio grupo de
 * procesos y se mata el grupo entero.
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

/**
 * Cerrar la copia y **todo lo que colgaba de ella**.
 *
 * En Windows no hay grupos de procesos: un Electron abre cuatro o cinco hijos
 * (GPU, red, cada renderer) y matar solo al primero deja el resto vivo — con
 * el puerto de depuración cogido. `taskkill /T` se lleva el árbol entero.
 */
function matarGrupo(hijo) {
  if (WINDOWS) {
    try { spawnSync('taskkill', ['/PID', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {}
    try { hijo.kill(); } catch {}
    return;
  }
  try { process.kill(-hijo.pid, 'SIGKILL'); } catch { try { hijo.kill('SIGKILL'); } catch {} }
}

/**
 * Borra el directorio de datos de la copia. **Sin poder tumbar la ejecución.**
 *
 * En Windows los archivos siguen abiertos un rato después de que el proceso
 * muera, así que `rmSync` daba `EPERM` — y al estar en un `finally`, esa
 * excepción **sustituía al error de verdad**. Un temporal que se queda en
 * `%TEMP%` no es motivo para tirar una tanda de capturas: se reintenta y, si
 * no se puede, se avisa y se sigue.
 */
async function borrarTemporal(ruta) {
  for (let i = 0; i < 5; i++) {
    try { rmSync(ruta, { recursive: true, force: true }); return; }
    catch { await dormir(400); }
  }
  console.warn(`  (no se pudo borrar ${ruta} — queda en el temporal)`);
}

async function capturar(escena, entorno) {
  await esperarCopiaDePrueba();
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
  const deElectron = [
    '.',
    '--no-sandbox',
    `--user-data-dir=${datos}`,
    `--remote-debugging-port=${PUERTO_CDP}`,
    // Solo para el certificado local de `servicios.mjs`. Afecta a esta copia
    // suelta y a nada más: no se toca la comprobación de `galeria.ts`.
    '--ignore-certificate-errors',
  ];
  // En Windows hay pantalla de verdad: ni xvfb ni tamaño que fingir. Y los
  // nombres se redirigen por línea de órdenes en vez de en el archivo `hosts`.
  const hijo = WINDOWS
    ? spawn(ELECTRON_EXE, [...deElectron, `--host-resolver-rules=${reglasDeNombres()}`],
        { cwd: RAIZ, env: { ...entorno, ...(escena.entorno ?? {}) }, stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn('xvfb-run', [
        '-a', '-s', `-screen 0 ${pantalla.ancho}x${pantalla.alto}x24`,
        'npx', 'electron', ...deElectron,
      ], { cwd: RAIZ, env: { ...entorno, ...(escena.entorno ?? {}) }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });

  let registro = '';
  hijo.stdout.on('data', (d) => { registro += d; });
  hijo.stderr.on('data', (d) => { registro += d; });

  try {
    const cdp = await esperarCdp(() => registro);
    await cdp.enviar('Emulation.setDeviceMetricsOverride', {
      width: escena.ancho, height: escena.alto,
      deviceScaleFactor: escena.escala, mobile: false,
    });
    await esperarInterfaz(cdp);
    const ctx = { escena, cdpDestino: null };
    for (const paso of escena.pasos) await ejecutarPaso(cdp, paso, ctx);
    if (ctx.cdpDestino) await comprobarFuentes(ctx.cdpDestino);
    if (escena.privacidad) await enmascarar(ctx.cdpDestino ?? cdp, escena.privacidad);
    await apartarCursor(ctx.cdpDestino ?? cdp);

    let png;
    if (escena.mando) {
      png = await capturarMando(cdp, escena.mando, IDIOMA);
    } else {
      const { data } = await (ctx.cdpDestino ?? cdp).enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      png = Buffer.from(data, 'base64');
      if (escena.compuesta) {
        png = await conBarraFlotante(await fondoDeEscritorio(escena), escena);
      }
    }
    if (escena.lienzo) png = await conLienzo(png, escena.lienzo);

    const rutaSalida = join(SALIDA, escena.archivo);
    mkdirSync(dirname(rutaSalida), { recursive: true });
    writeFileSync(rutaSalida, png);
    cdp.cerrar();
    return { png, registro };
  } finally {
    matarGrupo(hijo);
    await esperarPuertoLibre();
    await borrarTemporal(datos);
  }
}

async function esperarCdp(getRegistro) {
  let ultimoError = null;
  for (let i = 0; i < 60; i++) {
    try {
      return await conectar(PUERTO_CDP);
    } catch (e) {
      ultimoError = e;
      await dormir(500);
    }
  }
  const reg = getRegistro ? getRegistro() : '';
  throw new Error(`el depurador no llegó a abrir (${ultimoError?.message ?? ultimoError})\n--- Log de Electron ---\n${reg}\n-----------------------`);
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
  await evaluar(cdp, `Promise.all([
    document.fonts.load('12px "Inter"'),
    document.fonts.load('12px "JetBrains Mono"'),
    document.fonts.load('12px "DotGothic16"'),
    document.fonts.ready
  ]).catch(() => {})`);
  const falta = () => evaluar(cdp, `(() => {
    const quiero = ['Inter', 'JetBrains Mono', 'DotGothic16'];
    return quiero.filter((f) => !document.fonts.check(\`12px "\${f}"\`));
  })()`);
  for (let i = 0; i < 15; i++) {
    const faltan = await falta();
    if (!faltan || faltan.length === 0) return;
    await dormir(500);
  }
  const faltan = await falta();
  if (faltan.length) {
    throw new Error(`no cargaron las fuentes: ${faltan.join(', ')} — ¿está en pie el espejo de fonts.googleapis.com?`);
  }
}

// ── El icono de mosaico de 300×300 ────────────────────────────────────────
//
// No es una captura: es el icono de la aplicación, que ya se genera con
// `npm run build:icon`. Se reescala con sharp, la misma herramienta que usa
// `scripts/generate-icon.js`, para que salga exactamente a 300×300 (la Store
// rechaza cualquier otra medida) y sobre el fondo del tema en vez de
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

// ── Fuentes locales: la pista de música y las artes de la tienda ──────────

/**
 * Deja en `FUENTES` lo que las escenas leen: la pista inventada que hace
 * `VD_MEDIOS_FIJOS` (con su carátula generada), las artes de la tienda y el
 * fondo neutro de la barra. Todo se regenera aquí; `VD_PRENSA_TIENDA` apunta
 * al directorio para que `servicios.mjs` sirva esas artes en el sitio del
 * manifiesto de la galería.
 */
async function prepararFuentes() {
  mkdirSync(FUENTES, { recursive: true });
  const pista = join(FUENTES, 'reproduccion.json');
  if (!existsSync(pista)) writeFileSync(pista, `${JSON.stringify(await reproduccion(), null, 2)}\n`);
  process.env.VD_PRENSA_TIENDA = join(FUENTES, 'tienda');
  await generarArtesTienda(process.env.VD_PRENSA_TIENDA, IDIOMA);
  await generarFondoNeutro(join(FUENTES, 'fondo-neutro.png'));
}

// ── El N3 del banco de pruebas ────────────────────────────────────────────

/**
 * La página de dock sembrada se ata al N3 que esté enchufado.
 *
 * `node-hid` es la misma enumeración que hace el proceso principal (mismos
 * VID/PID y la interfaz de control), así que la página se siembra con el
 * serial del aparato y queda **un solo** dispositivo, conectado y pintado. Sin
 * hardware no hay nada que atar: la escena sigue sirviendo con el serial
 * inventado, «Desconectado» — que es como se capturó la primera vez.
 * `VD_PRENSA_N3_SERIAL=sin-n3` fuerza ese modo sin aparato.
 */
async function serieN3Viva() {
  const forzada = process.env.VD_PRENSA_N3_SERIAL?.trim();
  if (forzada === 'sin-n3') return null;
  if (forzada) return forzada;
  try {
    const hid = await import('node-hid');
    const devices = hid.devices ?? hid.default?.devices;
    const usb = [[0x5548, [0x1001]], [0x6602, [0x1003]], [0x6603, [0x1003]]];
    const encontrado = devices?.().find((d) =>
      usb.some(([vid, pids]) => d.vendorId === vid && pids.includes(d.productId))
      && d.interface === 0 && (d.serialNumber ?? '').trim());
    return encontrado?.serialNumber?.trim() ?? null;
  } catch (e) {
    process.stdout.write(`  aviso: no se pudo enumerar el N3 (${e.message ?? e}); la página sale desconectada\n`);
    return null;
  }
}

async function atarAlN3(escenas) {
  const serie = await serieN3Viva();
  if (!serie) return escenas;
  return escenas.map((escena) => {
    const pages = escena.config.pages ?? [];
    if (!pages.some((p) => p.superficie?.modelo === 'n3')) return escena;
    process.stdout.write('  (hay un N3 enchufado: la página del dock se siembra con su serial)\n');
    return {
      ...escena,
      config: {
        ...escena.config,
        pages: pages.map((p) => (p.superficie?.modelo === 'n3'
          ? { ...p, superficie: { ...p.superficie, serial: serie } }
          : p)),
      },
    };
  });
}

// ── Programa ──────────────────────────────────────────────────────────────

/**
 * `--fondo=<ruta>`: la captura de escritorio sobre la que va la barra flotante.
 *
 * Sin ella, la 07 va sobre el escritorio abstracto que genera `artes.mjs` —
 * sin interfaz ni marca de terceros, así que la imagen puede ir a la Store—.
 * Con una captura de escritorio de verdad se rehace sobre esa:
 *
 *     node scripts/prensa/capturar.mjs 07 --fondo=docs/prensa/fuentes/escritorio.png
 */
function aplicarFondo(escenas, ruta) {
  const absoluta = resolve(RAIZ, ruta);
  if (!existsSync(absoluta)) throw new Error(`no existe el fondo: ${absoluta}`);
  const compuestas = escenas.filter((e) => e.compuesta);
  if (compuestas.length === 0) throw new Error('--fondo solo sirve para la escena de la barra flotante (07)');
  return escenas.map((e) => (e.compuesta ? { ...e, fondo: absoluta } : e));
}

async function main() {
  const argumentos = process.argv.slice(2);
  const fondo = argumentos.find((a) => a.startsWith('--fondo='))?.slice('--fondo='.length);
  const pedidas = argumentos.filter((a) => !a.startsWith('--'));
  let escenas = pedidas.length
    ? ESCENAS.filter((e) => pedidas.some((p) => e.archivo.startsWith(p)))
    : ESCENAS;
  if (escenas.length === 0) throw new Error(`ninguna escena coincide con ${pedidas.join(', ')}`);
  if (fondo) escenas = aplicarFondo(escenas, fondo);
  escenas = escenas.map((e) => (e.compuesta && !e.fondo ? { ...e, fondo: join(FUENTES, 'fondo-neutro.png') } : e));
  escenas = await atarAlN3(escenas);

  if (!existsSync(SALIDA)) mkdirSync(SALIDA, { recursive: true });
  await esperarCopiaDePrueba();
  await prepararFuentes();
  const tls = certificado();
  const servicios = await arrancarTodo(tls);
  const quitarHosts = ponerHosts();

  // Sin proxy en la copia que se fotografía: todo lo que pide durante una
  // captura está en 127.0.0.1, o llega ahí por los nombres redirigidos. El
  // `fetch` de Node del proceso principal ignora estas variables de todos
  // modos, pero `net.fetch` —la pila de red de Chromium— sí las lee, y su
  // túnel por el proxy se corta a los seis segundos.
  const entornoSinProxy = { ...process.env };
  for (const k of Object.keys(entornoSinProxy)) {
    if (/^(https?|all|no)_proxy$/i.test(k)) delete entornoSinProxy[k];
  }
  delete entornoSinProxy.ELECTRON_RUN_AS_NODE;
  delete entornoSinProxy.ELECTRON_NO_ATTACH_CONSOLE;

  const entorno = {
    ...entornoSinProxy,
    // El certificado local, para el `fetch` de Node del proceso principal.
    NODE_EXTRA_CA_CERTS: tls.rutaCert,
    // La ciudad del clima la contesta `climaFijo.cjs`, que se precarga en el
    // proceso principal (ver el porqué en su encabezado). La ruta va entre
    // comillas y con barras normales porque el camino del repositorio lleva
    // espacios y `NODE_OPTIONS` se parte por espacios.
    NODE_OPTIONS: [entornoSinProxy.NODE_OPTIONS,
      `--require "${join(AQUI, 'climaFijo.cjs').replace(/\\/g, '/')}"`].filter(Boolean).join(' '),
    VD_PRENSA_CLIMA: JSON.stringify(CLIMA),
    // La pista de la franja de reproducción. El por qué, en `mediosFijos.ts`.
    VD_MEDIOS_FIJOS: join(FUENTES, 'reproduccion.json'),
    // El reloj de la captura y la ciudad del clima, en la misma zona: con el
    // contenedor en UTC salía un deck de estudio a las 04:31.
    TZ: 'America/Tegucigalpa',
    // Sin núcleo nativo: sus sensores y su lista de aplicaciones son los de la
    // máquina de quien captura —hardware, discos y ventanas reales—, y una
    // captura de la Store no puede llevar nada de eso. La escena del dock lo
    // vuelve a encender porque su lista de apps se sustituye por inventadas
    // (`privacidad`, más arriba); es la única pantalla que lo necesita.
    VD_SIN_NUCLEO: '1',
  };

  try {
    for (const escena of escenas) {
      process.stdout.write(`· ${escena.archivo} — ${escena.titulo}\n`);
      const { png, registro } = await capturar(escena, entorno);
      const { width, height } = await medir(png);
      const esperada = escena.lienzo ?? { ancho: 1920, alto: 1080 };
      const bien = width === esperada.ancho && height === esperada.alto;
      process.stdout.write(`  ${width}×${height} ${(png.length / 1024).toFixed(0)} kB ${bien ? '✓' : `✗ NO es ${esperada.ancho}×${esperada.alto}`}\n`);
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
