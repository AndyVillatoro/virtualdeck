/**
 * La plantilla HTML del mando móvil: cabecera, hoja de estilos y el script con
 * nonce que arma el arranque (`guionMandoPagina`) y las pantallas
 * (`pantallaMandoPagina`).
 *
 * `paginaMando` decide el tema y el cromo; aquí solo se colocan en su sitio.
 * El resultado tiene que ser el mismo byte a byte que el de antes de partir el
 * archivo: la página se sirve tal cual al teléfono.
 */
import { estiloPaginaMando } from './estiloMandoPagina';
import { guionMandoPagina, type DatosGuionMando } from './guionMandoPagina';
import { PANTALLA_MANDO_PAGINA } from './pantallaMandoPagina';

/** Todo lo que la plantilla necesita, ya resuelto por `paginaMando`. */
export interface DatosPlantillaMando extends DatosGuionMando {
  /** `dark`, `light` o `system`: el valor de `data-theme` al servirla. */
  temaInicial: string;
  /** `meta name="color-scheme"`. */
  colorScheme: string;
  /** `meta name="theme-color"`, el fondo del tema. */
  metaThemeColor: string;
  /** El acento tal cual (CSS); su versión serializada va en `acentoJson`. */
  acento: string;
  nonceScript: string;
  nonceEstilo: string;
}

/** La página entera, lista para servir. */
export function plantillaMandoPagina(d: DatosPlantillaMando): string {
  return `<!doctype html>
<html lang="es" data-theme="${d.temaInicial}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="${d.colorScheme}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta id="meta-theme-color" name="theme-color" content="${d.metaThemeColor}">
<title>VirtualDeck</title>
<style nonce="${d.nonceEstilo}">
${estiloPaginaMando(d.acento)}
</style>
</head>
<body>
<header>
  <div class="logo"><span class="punto"></span><span id="titulo"></span></div>
  <div class="cab-acciones">
    <button id="btn-fullscreen" class="cab-btn"></button>
    <button id="btn-olvidar" class="cab-btn"></button>
  </div>
</header>
<div id="app"></div>
<script nonce="${d.nonceScript}">
${guionMandoPagina(d)}${PANTALLA_MANDO_PAGINA}</script>
</body>
</html>`;
}
