/**
 * Los servicios de los que VirtualDeck lee mientras se saca una captura.
 *
 * Ninguno inventa nada dentro de la aplicación: son **el otro extremo del
 * cable**. La aplicación usa su código de siempre —`net.fetch` a
 * `/data.json` para los sensores, `openrgb-sdk` para el RGB, `fetch` a los
 * dos servicios del clima— y lo que contesta al otro lado es esto.
 *
 * La galería **no** está aquí: la del proyecto se lee de su sitio de verdad,
 * porque desde este contenedor sí se llega a ella. Ver `capturar.mjs`.
 *
 * Se hace así, y no con dispositivos y pistas falsas metidos en
 * `electron/main`, porque una captura tiene que enseñar la pantalla que el
 * usuario verá, con el código que la dibuja de verdad.
 *
 * Lo que **no** se puede montar de esta forma es la sesión de medios de
 * Windows (SMTC): no hay red por medio, es una API del sistema. Ver
 * `mediosFijos.ts` y `docs/prensa/README.md`.
 */
import { createServer as servidorHttp } from 'node:http';
import { createServer as servidorHttps } from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { arrancar as arrancarOpenRGB } from './openrgb-falso.mjs';

// ── Sensores: el `/data.json` de LibreHardwareMonitor ─────────────────────
// El árbol es el de LHM de verdad: raíz → equipo → pieza de hardware →
// tipo de sensor → hoja. `electron/main/sensors.ts` busca el nombre de la
// pieza a profundidad 2 y la categoría en el nombre del icono.
//
// El nodo del equipo se llama «PC» a propósito: en un LHM real ahí va el
// nombre de la máquina, que identifica a su dueño.
const hoja = (id, texto, tipo, valor, min, max) => ({
  id, Text: texto, Children: [], Min: min, Value: valor, Max: max, SensorId: id, Type: tipo,
});
const grupo = (texto, hijos) => ({ id: texto, Text: texto, Children: hijos, Min: '', Value: '', Max: '' });

function arbolDeSensores() {
  // Un poco de vida: las capturas se sacan en varios instantes y unos valores
  // clavados delatarían que no hay nada leyendo.
  const jitter = (n, d) => (n + (Math.random() * 2 - 1) * d).toFixed(1);
  return {
    id: 0, Text: 'Sensor', Min: '', Value: '', Max: '',
    Children: [{
      id: 1, Text: 'PC', Min: '', Value: '', Max: '', Children: [
        {
          id: 10, Text: 'AMD Ryzen 7 7800X3D', ImageURL: 'images/cpu.png', Min: '', Value: '', Max: '',
          Children: [
            grupo('Temperatures', [hoja('/amdcpu/0/temperature/0', 'Core (Tctl/Tdie)', 'Temperature', `${jitter(61.4, 1.5)} °C`, '38.9 °C', '82.1 °C')]),
            grupo('Load', [hoja('/amdcpu/0/load/0', 'CPU Total', 'Load', `${jitter(23.8, 4)} %`, '1.2 %', '99.6 %')]),
            grupo('Powers', [hoja('/amdcpu/0/power/0', 'Package', 'Power', `${jitter(48.7, 3)} W`, '17.4 W', '88.2 W')]),
            grupo('Clocks', [hoja('/amdcpu/0/clock/0', 'Core #1', 'Clock', '4825.0 MHz', '3400.0 MHz', '5050.0 MHz')]),
          ],
        },
        {
          id: 20, Text: 'NVIDIA GeForce RTX 4070', ImageURL: 'images/nvidia.png', Min: '', Value: '', Max: '',
          Children: [
            grupo('Temperatures', [hoja('/gpu-nvidia/0/temperature/0', 'GPU Core', 'Temperature', `${jitter(54.0, 2)} °C`, '31.0 °C', '73.0 °C')]),
            grupo('Load', [hoja('/gpu-nvidia/0/load/0', 'GPU Core', 'Load', `${jitter(41.0, 8)} %`, '0.0 %', '100.0 %')]),
            grupo('Powers', [hoja('/gpu-nvidia/0/power/0', 'GPU Power', 'Power', `${jitter(112.0, 9)} W`, '11.0 W', '199.0 W')]),
            grupo('Fans', [hoja('/gpu-nvidia/0/fan/0', 'GPU Fan', 'Fan', `${jitter(1180, 40)} RPM`, '0.0 RPM', '2400.0 RPM')]),
          ],
        },
        {
          id: 30, Text: 'ASUS ROG STRIX B650-E', ImageURL: 'images/mainboard.png', Min: '', Value: '', Max: '',
          Children: [
            grupo('Temperatures', [hoja('/lpc/nct6798d/0/temperature/0', 'Motherboard', 'Temperature', `${jitter(37.5, 1)} °C`, '28.0 °C', '48.0 °C')]),
            grupo('Fans', [hoja('/lpc/nct6798d/0/fan/1', 'Fan #2', 'Fan', `${jitter(842, 25)} RPM`, '0.0 RPM', '1800.0 RPM')]),
          ],
        },
        {
          id: 40, Text: 'Generic Memory', ImageURL: 'images/ram.png', Min: '', Value: '', Max: '',
          Children: [grupo('Load', [hoja('/ram/load/0', 'Memory', 'Load', `${jitter(46.2, 2)} %`, '18.0 %', '81.4 %')])],
        },
        {
          id: 50, Text: 'Samsung SSD 990 PRO 2TB', ImageURL: 'images/nvme.png', Min: '', Value: '', Max: '',
          Children: [
            grupo('Temperatures', [hoja('/nvme/0/temperature/0', 'Temperature', 'Temperature', `${jitter(43.0, 1)} °C`, '29.0 °C', '61.0 °C')]),
            grupo('Load', [hoja('/nvme/0/load/0', 'Used Space', 'Load', '68.4 %', '12.0 %', '68.4 %')]),
          ],
        },
        // Un segundo disco no está para rellenar: la columna izquierda del
        // modo kiosko reparte el alto entre las tarjetas de sensores, y con
        // cinco quedaba un tercio de columna en negro. Dos discos es lo normal
        // en el equipo al que va dirigida la aplicación.
        {
          id: 60, Text: 'WD_BLACK SN850X 1TB', ImageURL: 'images/nvme.png', Min: '', Value: '', Max: '',
          Children: [
            grupo('Temperatures', [hoja('/nvme/1/temperature/0', 'Temperature', 'Temperature', `${jitter(39.0, 1)} °C`, '27.0 °C', '54.0 °C')]),
            grupo('Load', [hoja('/nvme/1/load/0', 'Used Space', 'Load', '31.7 %', '4.0 %', '31.7 %')]),
          ],
        },
      ],
    }],
  };
}

export function arrancarLHM(puerto = 8085) {
  const s = servidorHttp((req, res) => {
    if (!req.url.startsWith('/data.json')) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(arbolDeSensores()));
  });
  return new Promise((ok) => s.listen(puerto, '127.0.0.1', () => ok(s)));
}

// ── Lo que la aplicación pide a internet, servido en local por https ──────
//
// Cinco nombres, y por dos motivos distintos:
//
// · `ipapi.co` y `api.open-meteo.com` son los dos proveedores del clima, con
//   la dirección escrita dentro de `weather.ts`. Desde aquí no se alcanzan, y
//   además una captura no debería llevar la ciudad de quien la saca: se
//   contesta con una elegida a mano.
//
// · `fonts.googleapis.com`, `fonts.gstatic.com` y `raw.githubusercontent.com`
//   sí existen y sí hacen falta **de verdad**: las tres fuentes de la interfaz
//   (Inter, JetBrains Mono y DotGothic16) y el manifiesto de la galería del
//   proyecto. La pila de red de Chromium no sale de este contenedor —el túnel
//   se corta a los seis segundos—, pero el `fetch` de Node sí. Así que estos
//   tres se **reflejan**: se piden al sitio de verdad desde aquí y se sirven
//   tal cual, así que el contenido es el auténtico.
//
// Lo de las fuentes no es un detalle: sin ellas las capturas salían con la
// tipografía de reserva del sistema —parecida de lejos, distinta de cerca— y
// la aplicación instalada en Windows sí carga las de Google.

/**
 * Los puertos de los servicios de mentira, cambiables por entorno.
 *
 * Los de fabrica son los de siempre — 8085 para LibreHardwareMonitor y 6742
 * para OpenRGB— porque son los que espera la aplicación sin configurar. Pero
 * si quien saca las capturas tiene **su** OpenRGB abierto, el puerto está
 * cogido y el guion se cae con EADDRINUSE. Antes que pedirle que lo cierre
 * —apagándole las luces— se cambian los dos aquí y en la escena:
 *
 *   VD_PRENSA_PUERTO_RGB=6743 node scripts/prensa/capturar.mjs
 */
export const PUERTO_LHM = Number(process.env.VD_PRENSA_PUERTO_LHM) || 8085;
export const PUERTO_RGB = Number(process.env.VD_PRENSA_PUERTO_RGB) || 6742;

export const HOSTS = [
  'ipapi.co', 'api.open-meteo.com',
  'fonts.googleapis.com', 'fonts.gstatic.com', 'raw.githubusercontent.com',
];

/** Los nombres que se piden al sitio real y se devuelven tal cual. */
const ESPEJOS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'raw.githubusercontent.com']);

// Una fuente o un manifiesto se piden varias veces por escena, y son seis
// escenas: sin caché serían decenas de viajes idénticos a internet.
const cacheEspejo = new Map();

async function reflejar(host, url, cabecerasEntrantes) {
  const clave = `${host}${url}`;
  if (cacheEspejo.has(clave)) return cacheEspejo.get(clave);
  // El `user-agent` se reenvía porque Google Fonts contesta un CSS distinto
  // según el navegador: sin él manda `truetype` en vez de `woff2`.
  const r = await fetch(`https://${host}${url}`, {
    headers: {
      'user-agent': cabecerasEntrantes['user-agent'] ?? 'Mozilla/5.0',
      accept: cabecerasEntrantes.accept ?? '*/*',
    },
  });
  const salida = {
    estado: r.status,
    tipo: r.headers.get('content-type') ?? 'application/octet-stream',
    cuerpo: Buffer.from(await r.arrayBuffer()),
  };
  cacheEspejo.set(clave, salida);
  return salida;
}

/** Certificado autofirmado válido para los cinco nombres. Se tira al acabar. */
export function certificado() {
  const dir = mkdtempSync(join(tmpdir(), 'vd-prensa-tls-'));
  const clave = join(dir, 'clave.pem');
  const cert = join(dir, 'cert.pem');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2',
    '-keyout', clave, '-out', cert, '-subj', '/CN=virtualdeck-prensa',
    '-addext', `subjectAltName=${HOSTS.map((h) => `DNS:${h}`).join(',')}`,
  ], { stdio: 'ignore' });
  return { clave: readFileSync(clave), cert: readFileSync(cert), rutaCert: cert };
}

/**
 * El clima que se enseña.
 *
 * La ciudad se elige a mano y no se saca de la IP: una captura con la ciudad
 * real de quien la sacó es un dato personal en la ficha de la Store, y aquí la
 * IP sería la del contenedor donde corre esto, que tampoco dice nada útil.
 * Código 2 de la WMO = parcialmente nublado.
 */
const CLIMA = { ciudad: 'Tegucigalpa', pais: 'Honduras', lat: 14.0723, lon: -87.1921, temp: 24.6, codigo: 2 };

export function arrancarHttps({ clave, cert }, puerto = 443) {
  const s = servidorHttps({ key: clave, cert }, async (req, res) => {
    const host = (req.headers.host ?? '').split(':')[0];
    const responder = (obj) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    if (ESPEJOS.has(host)) {
      try {
        const r = await reflejar(host, req.url, req.headers);
        // `access-control-allow-origin` porque el `<link>` de las fuentes va
        // con `crossorigin`, y sin la cabecera Chromium descarta el woff2.
        res.writeHead(r.estado, { 'content-type': r.tipo, 'access-control-allow-origin': '*' });
        return res.end(r.cuerpo);
      } catch (e) {
        res.writeHead(502, { 'content-type': 'text/plain' });
        return res.end(String(e.message ?? e));
      }
    }
    // ipapi.co: el proveedor de geo por IP que `weather.ts` prueba primero.
    if (host === 'ipapi.co') {
      return responder({ latitude: CLIMA.lat, longitude: CLIMA.lon, city: CLIMA.ciudad, country_name: CLIMA.pais });
    }
    if (host === 'api.open-meteo.com') {
      return responder({ current: { temperature_2m: CLIMA.temp, weather_code: CLIMA.codigo } });
    }
    res.writeHead(404); res.end();
  });
  return new Promise((ok, mal) => {
    s.on('error', mal);
    s.listen(puerto, '0.0.0.0', () => ok(s));
  });
}

/**
 * Deja en caché lo que el espejo va a servir, antes de la primera escena.
 *
 * El manifiesto de la galería y sus perfiles son un viaje a internet que la
 * aplicación hace con diez segundos de plazo; si el primero coincide con la
 * escena que los pide, llega tarde y la lista sale vacía. Falló así una vez de
 * cada dos. Pidiéndolos aquí, la escena los encuentra ya guardados.
 */
export async function precalentar(urls) {
  for (const u of urls) {
    const { host, pathname, search } = new URL(u);
    try { await reflejar(host, `${pathname}${search}`, {}); } catch {}
  }
}

export async function arrancarTodo(tls) {
  const servidores = [
    await arrancarLHM(PUERTO_LHM),
    await arrancarOpenRGB(PUERTO_RGB),
    await arrancarHttps(tls, 443),
  ];
  return { parar: () => servidores.forEach((s) => { try { s.close(); } catch {} }) };
}
