/**
 * El clima de las capturas, contestado desde dentro del proceso principal.
 *
 * `servicios.mjs` ya contesta a `ipapi.co` y `api.open-meteo.com` con una
 * ciudad elegida a mano, pero ese camino solo llega al `fetch` de Node cuando
 * los nombres se resuelven por el archivo `hosts` —y en Windows no se toca,
 * pide administrador—. `--host-resolver-rules` tampoco sirve: es de la pila de
 * red de Chromium, que no es la que usa el proceso principal para el clima. El
 * resultado, medido: la petición salía a internet de verdad y las capturas
 * salían con la ciudad real de la máquina («Guaimaca» en la corrida del
 * 2026-10-07).
 *
 * Este archivo se carga con `NODE_OPTIONS=--require` en la copia que se
 * fotografía (lo pone `capturar.mjs`) y envuelve `fetch` para que los tres
 * proveedores de geo y el de pronóstico contesten lo que diga `VD_PRENSA_CLIMA`
 * —el mismo objeto `CLIMA` que sirve `servicios.mjs`—. Ni la IP ni la ciudad
 * de quien saca las capturas entran en juego, corra donde corra el guion.
 *
 * Es CommonJS a propósito: `--require` de `NODE_OPTIONS` solo carga CJS.
 */
const CLIMA = JSON.parse(process.env.VD_PRENSA_CLIMA || '{}');
const lat = CLIMA.lat ?? 14.0723;
const lon = CLIMA.lon ?? -87.1921;
const ciudad = {
  // ipapi.co lee latitude/longitude; ip-api.com, lat/lon; ipwho.is vuelve a
  // latitude/longitude. Se contestan todos para que cualquiera de los tres
  // pase su propio parseador.
  latitude: lat, longitude: lon, lat, lon,
  city: CLIMA.ciudad ?? 'Tegucigalpa', country_name: CLIMA.pais ?? 'Honduras',
  country: CLIMA.pais ?? 'Honduras', success: true,
};

const json = (obj) => Promise.resolve(new Response(JSON.stringify(obj), {
  status: 200, headers: { 'content-type': 'application/json' },
}));

const real = globalThis.fetch;
globalThis.fetch = function (recurso, opciones) {
  const url = typeof recurso === 'string' ? recurso : (recurso && recurso.url) || String(recurso);
  if (/^https?:\/\/(ipapi\.co|ip-api\.com|ipwho\.is)\//.test(url)) return json(ciudad);
  if (/^https?:\/\/api\.open-meteo\.com\//.test(url)) {
    return json({ current: { temperature_2m: CLIMA.temp ?? 24.6, weather_code: CLIMA.codigo ?? 2 } });
  }
  return real.call(this, recurso, opciones);
};
