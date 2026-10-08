/**
 * Las otras ventanas del capturador: la tienda, la barra flotante y la página
 * del mando móvil. La principal la maneja `capturar.mjs`; estas se buscan por
 * su dirección en el depurador y cada una tiene su propia conexión CDP.
 *
 * La página del mando **no es una ventana de Electron**: la sirve el propio
 * proceso principal en `http://127.0.0.1:<puerto>/` desde que la config
 * siembra `remote.enabled`. Aquí se abre una pestaña nueva por el puerto del
 * depurador, se le mete el token en `localStorage` antes de que cargue (la
 * página lo lee al arrancar) y se captura con vista de teléfono.
 */

import { conectar, dormir, evaluar } from './cdp.mjs';

export const PUERTO_CDP = 9333;

/** Las páginas vivas del depurador (la principal, la barra, la tienda, la pestaña del mando). */
async function paginas() {
  const r = await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`);
  return (await r.json()).filter((t) => t.type === 'page');
}

/** Espera a que exista una página que cumpla el predicado. */
export async function esperarPagina(cumple, queEs, msMax = 20000) {
  const hasta = Date.now() + msMax;
  while (Date.now() < hasta) {
    try {
      if ((await paginas()).some(cumple)) return;
    } catch { /* el depurador todavía no responde */ }
    await dormir(400);
  }
  throw new Error(`${queEs} no apareció en ${Math.round(msMax / 1000)} s`);
}

/** Se conecta a la página que cumpla el predicado, esperándola si hace falta. */
export async function conectarPagina(cumple, queEs, msMax = 20000) {
  await esperarPagina(cumple, queEs, msMax);
  return conectar(PUERTO_CDP, cumple);
}

/** El viewport virtual de una ventana secundaria, al tamaño de la escena. */
export async function medirVentana(cdp, { ancho, alto, escala }) {
  await cdp.enviar('Emulation.setDeviceMetricsOverride', {
    width: ancho, height: alto, deviceScaleFactor: escala, mobile: false,
  });
}

/**
 * La ventana de la tienda (`#tienda`), abierta por IPC desde la principal —
 * lo mismo que pulsar «ABRIR TIENDA»— y medida como el resto.
 */
export async function abrirVentanaTienda(cdpPrincipal, medidas) {
  await evaluar(cdpPrincipal, 'window.electronAPI.tienda.open()');
  const cdp = await conectarPagina((t) => t.url.includes('#tienda'), 'la ventana de la tienda');
  await medirVentana(cdp, medidas);
  return cdp;
}

/** Espera a que el proceso principal conteste en el puerto del servidor remoto. */
async function esperarRemoto(puerto, msMax = 20000) {
  const hasta = Date.now() + msMax;
  while (Date.now() < hasta) {
    try {
      const r = await fetch(`http://127.0.0.1:${puerto}/api/ping`);
      if (r.ok) return;
    } catch { /* todavía no escucha */ }
    await dormir(400);
  }
  throw new Error(`el servidor del mando no contestó en 127.0.0.1:${puerto} (¿la config sembrada trae remote.enabled?)`);
}

/** Espera a que un selector exista en la página; si no llega, dice qué se ve. */
async function esperarSelector(cdp, selector, queEs, msMax = 20000) {
  const hasta = Date.now() + msMax;
  while (Date.now() < hasta) {
    const hay = await evaluar(cdp, `!!document.querySelector(${JSON.stringify(selector)})`).catch(() => false);
    if (hay) return;
    await dormir(400);
  }
  const visto = await evaluar(cdp, `(() => ({
    url: location.href,
    titulo: document.title,
    token: (() => { try { return localStorage.getItem('vd-token'); } catch (e) { return 'bloqueado'; } })(),
    texto: (document.body?.innerText ?? '').slice(0, 240),
  }))()`).catch(() => null);
  throw new Error(`${queEs} (${selector}) no apareció en ${Math.round(msMax / 1000)} s${visto ? ` — se ve ${JSON.stringify(visto)}` : ''}`);
}

/** Un `enviar` que no pierde de vista qué comando falló. */
async function enviar(cdp, metodo, parametros = {}) {
  try {
    return await cdp.enviar(metodo, parametros);
  } catch (e) {
    throw new Error(`${metodo}: ${e.message}`);
  }
}

/**
 * La página del mando móvil, en una vista de teléfono.
 *
 * Se navega **la propia ventana principal** a la página que sirve el proceso
 * principal. No se abre una pestaña nueva: el proxy CDP de Electron no expone
 * `Target.createTarget` («Not supported») y el endpoint HTTP `/json/new`
 * contesta 500; además el mando no necesita el renderer, porque el servidor y
 * los botones vivos viven en el proceso principal y leen la config del disco.
 *
 * El token se siembra en `localStorage` **antes** de navegar (`about:blank`
 * ya es del mismo origen que la página final), que es de donde la página lo
 * lee al arrancar. El idioma sale de `navigator.language`: se fija con
 * `acceptLanguage` para que la tanda en inglés no salga con los textos del
 * sistema.
 */
export async function capturarMando(cdp, { puerto, token, ancho, alto, escala }, idioma) {
  await esperarRemoto(puerto);
  const url = `http://127.0.0.1:${puerto}/`;
  await enviar(cdp, 'Emulation.setDeviceMetricsOverride', {
    width: ancho, height: alto, deviceScaleFactor: escala, mobile: true,
  });
  await enviar(cdp, 'Emulation.setUserAgentOverride', {
    userAgent: '', acceptLanguage: idioma === 'en' ? 'en-US' : 'es-ES',
  });
  // Se navega, se siembra el token **ya en el origen de la página** y se
  // recarga: la página lo lee al arrancar y lo manda en cada `fetch`. Con el
  // script de documento nuevo no llegaba a guardarse (la captura salía en la
  // pantalla de emparejar).
  await enviar(cdp, 'Page.navigate', { url });
  await dormir(600);
  await evaluar(cdp, `try { localStorage.setItem('vd-token', ${JSON.stringify(token)}); } catch (e) {}`);
  await enviar(cdp, 'Page.reload');
  await esperarSelector(cdp, '.celda[data-boton]', 'la rejilla del mando');
  await dormir(1500);
  const { data } = await enviar(cdp, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  return Buffer.from(data, 'base64');
}
