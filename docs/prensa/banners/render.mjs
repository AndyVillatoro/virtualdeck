/**
 * render.mjs — Renderizador de composiciones HTML de prensa a PNG
 *
 * Utiliza Chrome headless con CDP para renderizar a 2x de densidad
 * (deviceScaleFactor: 2) y luego reduce con sharp (Lanczos3) a las dimensiones
 * exactas requeridas para garantizar nitidez extrema sin aliasing.
 *
 * Ejecución:
 *   node docs/prensa/banners/render.mjs
 */

import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PRENSA = resolve(AQUI, '..');
const RAIZ = resolve(PRENSA, '..', '..');
const BANNERS = AQUI;
const STORE_REF = resolve(RAIZ, '_referencias', 'store-0.14.0');

const RUTAS_CHROME = [
  'C:\\Users\\andyf\\.cache\\hyperframes\\chrome\\chrome-headless-shell\\win64-152.0.7977.30\\chrome-headless-shell-win64\\chrome-headless-shell.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

const chromeBin = RUTAS_CHROME.find((r) => existsSync(r));
if (!chromeBin) {
  console.error('No se encontró ningún binario de Chrome / Edge');
  process.exit(1);
}

const PUERTO = 9455;
const CAPTURAS = [
  '01-deck',
  '02-editor',
  '03-catalogo',
  '04-dock',
  '05-movil',
  '05b-movil-marco',
  '06-tienda',
  '06b-tienda-ficha',
  '07-barra-flotante',
  '08-kiosko-barra',
  '09-rgb'
];

async function obtenerPaginaCDP(puerto) {
  let lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
  let pagina = lista.find((t) => t.type === 'page');
  if (!pagina) {
    try {
      pagina = await (await fetch(`http://127.0.0.1:${puerto}/json/new?about:blank`, { method: 'PUT' })).json();
    } catch {}
  }
  if (!pagina) {
    lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
    pagina = lista.find((t) => t.type === 'page');
  }
  if (!pagina) throw new Error('No hay página disponible en Chrome CDP');
  return pagina;
}

async function crearClienteCDP(puerto) {
  const pagina = await obtenerPaginaCDP(puerto);
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((ok, mal) => {
    ws.onopen = ok;
    ws.onerror = mal;
  });

  let id = 0;
  const pendientes = new Map();
  const oyentes = new Map();

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendientes.has(m.id)) {
      const { ok, mal } = pendientes.get(m.id);
      pendientes.delete(m.id);
      if (m.error) mal(new Error(m.error.message));
      else ok(m.result);
      return;
    }
    if (m.method && oyentes.has(m.method)) {
      oyentes.get(m.method).forEach((cb) => cb(m.params));
    }
  };

  const enviar = (method, params = {}) =>
    new Promise((ok, mal) => {
      const n = ++id;
      pendientes.set(n, { ok, mal });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  const al = (method, cb) => {
    if (!oyentes.has(method)) oyentes.set(method, []);
    oyentes.get(method).push(cb);
  };

  const cerrar = () => ws.close();

  return { enviar, al, cerrar };
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function capturarComposicion(cdp, url, ancho, alto, salidaPath) {
  await cdp.enviar('Emulation.setDeviceMetricsOverride', {
    width: ancho,
    height: alto,
    deviceScaleFactor: 2,
    mobile: false
  });

  let cargado = false;
  const onCarga = () => { cargado = true; };
  cdp.al('Page.loadEventFired', onCarga);

  await cdp.enviar('Page.navigate', { url });
  for (let w = 0; w < 30 && !cargado; w++) await dormir(100);
  await dormir(500);

  const r = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
  const buf2x = Buffer.from(r.data, 'base64');
  await sharp(buf2x)
    .resize(ancho, alto, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(salidaPath);
}

async function renderBanners(cdp) {
  console.log('\n--- Renderizando Banners 1920x1080 (ES y EN con supersampling 2x) ---');
  for (const cap of CAPTURAS) {
    const htmlPath = join(BANNERS, `${cap}.html`);
    if (!existsSync(htmlPath)) continue;

    for (const lang of ['es', 'en']) {
      const url = `${pathToFileURL(htmlPath).href}?lang=${lang}`;
      const salidaPng = join(BANNERS, lang, `${cap}.png`);
      await capturarComposicion(cdp, url, 1920, 1080, salidaPng);
      console.log(`✓ [${lang.toUpperCase()}] ${cap}.png -> 1920x1080`);
    }
  }
}

async function renderArtes(cdp) {
  console.log('\n--- Renderizando Artes de Marca (miniatura, superheroe, banner, og-image) ---');
  // Miniatura
  for (const lang of ['es', 'en']) {
    const url = `${pathToFileURL(join(BANNERS, 'miniatura.html')).href}?lang=${lang}`;
    const salida = lang === 'es' ? join(PRENSA, 'miniatura.png') : join(PRENSA, 'en', 'miniatura.png');
    await capturarComposicion(cdp, url, 1920, 1080, salida);
    console.log(`✓ miniatura.png [${lang}] -> 1920x1080`);
  }

  // Superhéroe (sin texto)
  const urlHero = pathToFileURL(join(BANNERS, 'superheroe.html')).href;
  const salidaHero = join(PRENSA, 'superheroe.png');
  await capturarComposicion(cdp, urlHero, 1920, 1080, salidaHero);
  copyFileSync(salidaHero, join(PRENSA, 'en', 'superheroe.png'));
  if (existsSync(STORE_REF)) {
    copyFileSync(salidaHero, join(STORE_REF, 'superheroe.png'));
  }
  console.log(`✓ superheroe.png -> 1920x1080 (docs/prensa y store-0.14.0)`);

  // Banner cabecera (1280x640)
  for (const lang of ['es', 'en']) {
    const url = `${pathToFileURL(join(BANNERS, 'banner.html')).href}?lang=${lang}`;
    const salida = lang === 'es' ? join(PRENSA, 'banner.png') : join(PRENSA, 'en', 'banner.png');
    await capturarComposicion(cdp, url, 1280, 640, salida);
    console.log(`✓ banner.png [${lang}] -> 1280x640`);
  }

  // OpenGraph (1200x630)
  for (const lang of ['es', 'en']) {
    const url = `${pathToFileURL(join(BANNERS, 'og-image.html')).href}?lang=${lang}`;
    const salida = lang === 'es' ? join(PRENSA, 'og-image.png') : join(PRENSA, 'en', 'og-image.png');
    await capturarComposicion(cdp, url, 1200, 630, salida);
    console.log(`✓ og-image.png [${lang}] -> 1200x630`);
  }
}

function sincronizarConStore() {
  if (!existsSync(STORE_REF)) return;
  console.log('\n--- Actualizando _referencias/store-0.14.0/capturas-* ---');
  for (const idioma of ['es', 'en']) {
    const dirDest = join(STORE_REF, `capturas-${idioma}`);
    const dirOrig = join(dirDest, 'originales');
    mkdirSync(dirOrig, { recursive: true });

    for (const cap of CAPTURAS) {
      const existente = join(dirDest, `${cap}.png`);
      const respaldo = join(dirOrig, `${cap}.png`);
      if (existsSync(existente) && !existsSync(respaldo)) {
        copyFileSync(existente, respaldo);
      }
      const origen = join(BANNERS, idioma, `${cap}.png`);
      if (existsSync(origen)) {
        copyFileSync(origen, existente);
      }
    }
  }
  console.log('✓ Sincronización con Store completada (originales respaldados)');
}

async function esperarChrome() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PUERTO}/json/version`);
      if (res.ok) return true;
    } catch {}
    await dormir(300);
  }
  return false;
}

async function main() {
  console.log('===> Iniciando Chrome headless en puerto', PUERTO);
  const chromeProc = spawn(chromeBin, [
    '--headless',
    `--remote-debugging-port=${PUERTO}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    'about:blank'
  ]);

  if (!(await esperarChrome())) {
    chromeProc.kill();
    throw new Error('Chrome no respondió en el puerto CDP');
  }

  const cdp = await crearClienteCDP(PUERTO);
  await cdp.enviar('Page.enable');
  await cdp.enviar('Runtime.enable');

  mkdirSync(join(BANNERS, 'es'), { recursive: true });
  mkdirSync(join(BANNERS, 'en'), { recursive: true });
  mkdirSync(join(PRENSA, 'en'), { recursive: true });

  await renderBanners(cdp);
  await renderArtes(cdp);

  cdp.cerrar();
  chromeProc.kill();
  console.log('\n--- Cerrando proceso de Chrome ---');

  sincronizarConStore();
  console.log('\n===> RENDERIZADO COMPLETADO CON ÉXITO <===');
}

main().catch((err) => {
  console.error('Error fatal durante el renderizado:', err);
  process.exit(1);
});
