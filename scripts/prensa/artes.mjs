/**
 * Las artes que el capturador genera: el fondo neutro de la barra flotante y
 * la tienda de mentira (manifiesto, perfiles, portadas y capturas).
 *
 * Nada de esto se dibuja a mano encima de una captura. El manifiesto y sus
 * imágenes son **las entradas que la aplicación enseña de verdad**, servidas
 * por `servicios.mjs` en el sitio del manifiesto de la galería (ver
 * `VD_PRENSA_TIENDA`), así que la ventana de la tienda corre su código de
 * siempre. Las portadas y capturas son retículas de puntos propias —ni una
 * marca ni una foto de terceros— y los perfiles llevan rutas, atajos y
 * direcciones inventadas a propósito para que el aviso de riesgo tenga algo
 * que resumir.
 *
 * El fondo neutro es lo que va **debajo** de la barra flotante: un escritorio
 * abstracto (dos ventanas y una trama) para que la captura deje claro que la
 * barra flota sobre otra aplicación sin publicar la interfaz de nadie.
 *
 * Todo se regenera en cada corrida: el guion es la fuente, los PNG son salida.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const FONDO = '#070809';
const SUPERFICIE = '#111315';
const ELEVADA = '#181b1e';
const TITULO_VENTANA = '#15181b';
const BORDE = '#26292e';
const APAGADO = 'rgba(230,232,235,0.05)';

const PALETA = ['#4a8ef0', '#2dd4bf', '#a78bfa', '#f0a04a', '#e05a5a'];

/** Generador determinista: la misma semilla da la misma imagen. */
function azar(semilla) {
  let s = semilla >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ── Puntos, glifos y tramas ───────────────────────────────────────────────

/** Los 32 bytes en base64 del catálogo a 16 filas de booleanos (ver `puntos16.ts`). */
function matrizDePuntos(bits) {
  const bytes = Array.from(Buffer.from(bits, 'base64'));
  if (bytes.length !== 32) return null;
  return Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => Boolean((bytes[(x + 16 * y) >> 3] >> (7 - ((x + 16 * y) & 7))) & 1)));
}

let cacheIconos = null;
/** Los bits de un icono del catálogo de acciones, o `null` si el id no existe. */
function bitsDe(id) {
  cacheIconos ??= JSON.parse(readFileSync(join(RAIZ, 'src', 'data', 'iconosDot', 'acciones.json'), 'utf-8')).iconos;
  return cacheIconos.find(([nombre]) => nombre === id)?.[1] ?? null;
}

/** Una retícula tenue de puntos, el fondo de todo. */
function tramaDeFondo(ancho, alto, paso = 24) {
  let puntos = '';
  for (let y = paso / 2; y < alto; y += paso) {
    for (let x = paso / 2; x < ancho; x += paso) {
      puntos += `<circle cx="${x}" cy="${y}" r="0.9" fill="#14171a"/>`;
    }
  }
  return puntos;
}

/** Un glifo 16×16 dibujado en puntos, centrado en (cx, cy). */
function glifoEnPuntos(matriz, { cx, cy, escala, color, apagados = true }) {
  if (!matriz) return '';
  const radio = Math.max(0.7, escala * 0.36);
  const radioApagado = Math.max(0.4, radio * 0.45);
  const delta = (escala * 15) / 2;
  let salida = '';
  matriz.forEach((fila, y) => fila.forEach((encendido, x) => {
    const px = cx - delta + x * escala;
    const py = cy - delta + y * escala;
    if (encendido) salida += `<circle cx="${px}" cy="${py}" r="${radio}" fill="${color}"/>`;
    else if (apagados) salida += `<circle cx="${px}" cy="${py}" r="${radioApagado}" fill="${APAGADO}"/>`;
  }));
  return salida;
}

function svg(cuerpo, ancho, alto) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">${cuerpo}</svg>`;
}

async function pngDe(svgTexto, destino) {
  const sharp = (await import('sharp')).default;
  writeFileSync(destino, await sharp(Buffer.from(svgTexto)).png().toBuffer());
}

// ── El fondo neutro de la barra flotante ──────────────────────────────────

/** Una barra de "código": el bloque de color que hace de línea sin escribir nada. */
function lineaDeCodigo(x, y, ancho, color) {
  return `<rect x="${x}" y="${y}" width="${ancho}" height="8" rx="3" fill="${color}" fill-opacity="0.75"/>`;
}

function ventana(x, y, ancho, alto, cuerpo) {
  return `<g>
    <rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="8" fill="${SUPERFICIE}" stroke="${BORDE}"/>
    <rect x="${x}" y="${y}" width="${ancho}" height="34" rx="8" fill="${TITULO_VENTANA}"/>
    <rect x="${x}" y="${y + 17}" width="${ancho}" height="17" fill="${TITULO_VENTANA}"/>
    <circle cx="${x + 22}" cy="${y + 17}" r="5" fill="#3a3f45"/>
    <circle cx="${x + 40}" cy="${y + 17}" r="5" fill="#3a3f45"/>
    <circle cx="${x + 58}" cy="${y + 17}" r="5" fill="#3a3f45"/>
    ${cuerpo}
  </g>`;
}

/** El editor abstracto: barra lateral de archivos y líneas de colores, sin texto. */
function editorAbstracto(x, y, ancho, alto, semilla) {
  const r = azar(semilla);
  let filas = '';
  const yPrimera = y + 34;
  for (let i = 0; i < 26; i++) {
    const fy = yPrimera + 22 + i * 30;
    if (fy > y + alto - 20) break;
    filas += `<rect x="${x + 26}" y="${fy + 1}" width="10" height="6" rx="2" fill="#2b3036"/>`;
    let fx = x + 262 + Math.floor(r() * 3) * 22;
    const anchoMax = x + ancho - 40;
    let restante = 80 + Math.floor(r() * 420);
    const trozos = 1 + Math.floor(r() * 3);
    for (let t = 0; t < trozos && fx < anchoMax; t++) {
      const w = Math.max(24, Math.min(restante, anchoMax - fx));
      const color = r() < 0.32 ? PALETA[0] : r() < 0.2 ? PALETA[1] : r() < 0.2 ? PALETA[2] : '#6b7480';
      filas += lineaDeCodigo(fx, fy, w, color);
      fx += w + 14;
      restante -= w + 14;
    }
  }
  let arbol = '';
  for (let i = 0; i < 22; i++) {
    const fy = yPrimera + 16 + i * 30;
    if (fy > y + alto - 16) break;
    const sangria = i % 4 === 0 ? 0 : 14;
    arbol += `<rect x="${x + 20 + sangria}" y="${fy}" width="${90 + Math.floor(r() * 130)}" height="7" rx="3" fill="#20242a"/>`;
  }
  return ventana(x, y, ancho, alto, `
    <rect x="${x}" y="${yPrimera}" width="230" height="${alto - 34}" fill="#0d1012"/>
    <rect x="${x + 230}" y="${yPrimera}" width="1" height="${alto - 34}" fill="${BORDE}"/>
    <rect x="${x + 250}" y="${yPrimera + 10}" width="1" height="${alto - 54}" fill="#171a1d"/>
    ${arbol}${filas}
  `);
}

/** La terminal abstracta: bloques de salida con un cuadro de aviso. */
function terminalAbstracta(x, y, ancho, alto, semilla) {
  const r = azar(semilla);
  let filas = '';
  for (let i = 0; i < 10; i++) {
    const fy = y + 60 + i * 32;
    if (fy > y + alto - 20) break;
    filas += `<rect x="${x + 18}" y="${fy}" width="10" height="10" rx="2" fill="${r() < 0.5 ? PALETA[1] : PALETA[0]}" fill-opacity="0.8"/>`;
    filas += `<rect x="${x + 40}" y="${fy + 2}" width="${60 + Math.floor(r() * 420)}" height="7" rx="3" fill="#6b7480" fill-opacity="0.8"/>`;
  }
  return ventana(x, y, ancho, alto, `
    <rect x="${x + 16}" y="${y + 50}" width="${ancho - 32}" height="${alto - 66}" rx="4" fill="#0b0e10"/>
    ${filas}
  `);
}

/** El escritorio neutro de 1920×1080 sobre el que flota la barra (sin marca ajena). */
export function fondoNeutroSvg() {
  return svg(`
    <rect width="1920" height="1080" fill="${FONDO}"/>
    ${tramaDeFondo(1920, 1080)}
    ${editorAbstracto(70, 70, 1440, 880, 20261007)}
    ${terminalAbstracta(1080, 560, 760, 440, 7)}
  `, 1920, 1080);
}

export async function generarFondoNeutro(destino) {
  mkdirSync(dirname(destino), { recursive: true });
  await pngDe(fondoNeutroSvg(), destino);
}

// ── La tienda de mentira ──────────────────────────────────────────────────

/**
 * Las cinco entradas del manifiesto local. Ninguna menciona un producto real:
 * las apps destino y las descripciones son inventadas, y las imágenes son
 * retículas generadas. La primera es la que se abre en la ficha de la captura.
 */
const ENTRADAS = [
  {
    id: 'estudio-en-vivo', kind: 'profile', icono: 'broadcast', acento: PALETA[0], version: '1.2.0',
    targetApp: 'mi_estudio', tags: { es: ['estudio', 'directo'], en: ['studio', 'live'] },
    label: { es: 'Estudio en vivo', en: 'Live Studio' },
    desc: {
      es: 'Botones de grabación, micrófono y cambio de escena, con el reloj del directo.',
      en: 'Recording, microphone and scene buttons, plus the live clock.',
    },
  },
  {
    id: 'mesa-de-edicion', kind: 'profile', icono: 'movie', acento: '#a78bfa', version: '0.9.1',
    targetApp: 'mi_editor', tags: { es: ['edicion', 'video'], en: ['editing', 'video'] },
    label: { es: 'Mesa de edición', en: 'Editing Desk' },
    desc: {
      es: 'Cortar, reproducir y marcar clips sin soltar el ratón de la línea de tiempo.',
      en: 'Cut, play and mark clips without leaving the timeline.',
    },
  },
  {
    id: 'pagina-luces', kind: 'page', icono: 'bulb', acento: '#f0a04a', version: '1.0.0',
    tags: { es: ['rgb', 'luces'], en: ['rgb', 'lights'] },
    label: { es: 'Página de luces', en: 'Lights Page' },
    desc: {
      es: 'Una página suelta con escenas de luz y brillo, para agregar sin borrar el deck.',
      en: 'A standalone page with light scenes and brightness, to add without wiping your deck.',
    },
  },
  {
    id: 'panel-multimedia', kind: 'profile', icono: 'player-play', acento: '#2dd4bf', version: '1.1.0',
    tags: { es: ['multimedia', 'musica'], en: ['media', 'music'] },
    label: { es: 'Panel multimedia', en: 'Media Panel' },
    desc: {
      es: 'Transporte, volumen y dispositivos de audio en una sola página.',
      en: 'Transport, volume and audio devices on a single page.',
    },
  },
  {
    id: 'accesos-rapidos', kind: 'page', icono: 'layout-grid', acento: '#e05a5a', version: '0.4.2',
    tags: { es: ['accesos', 'productividad'], en: ['shortcuts', 'productivity'] },
    label: { es: 'Accesos rápidos', en: 'Quick Access' },
    desc: {
      es: 'Nueve casillas con las herramientas del día, sin carpetas de por medio.',
      en: 'Nine tiles with the tools of the day, no folders in between.',
    },
  },
];

/** La entrada que la escena de la tienda abre en la ficha (la primera del manifiesto). */
export const PRIMERA_ENTRADA = ENTRADAS[0];

/** El botón de un perfil de mentira, con la forma mínima que lee el resumen de riesgo. */
const botonPerfil = (id, label, accion, extra = {}) => ({
  id, page: 0, label, icon: '', bgColor: PALETA[id % PALETA.length], action: accion, ...extra,
});

/** El perfil de la primera entrada: trae de todo para que el aviso de riesgo se vea. */
function perfilRico(idioma) {
  const es = idioma !== 'en';
  return {
    name: es ? 'Estudio en vivo' : 'Live Studio',
    accent: PALETA[0], wallpaper: 'dotgrid',
    pages: [{ id: 'main', name: es ? 'DIRECTO' : 'LIVE', gridSize: 4, gridRows: 2 }],
    buttons: [
      botonPerfil(0, es ? 'GRABAR' : 'RECORD', { type: 'script', script: 'Get-Date | Out-File ultimo_acceso.txt' }),
      botonPerfil(1, es ? 'ESTUDIO' : 'STUDIO', { type: 'app', appPath: 'C:\\Programas\\Estudio\\estudio.exe' }),
      botonPerfil(2, es ? 'ESCENA 1' : 'SCENE 1', { type: 'hotkey', hotkey: 'Ctrl+Alt+1' }),
      botonPerfil(3, es ? 'TÍTULO' : 'TITLE', { type: 'type-text', typeText: es ? 'Escena 1' : 'Scene 1' }),
      botonPerfil(4, 'AVISO', { type: 'webhook', webhookUrl: 'https://ejemplo.invalid/aviso' }),
      botonPerfil(5, es ? 'PANEL' : 'PANEL', { type: 'web', url: 'https://ejemplo.invalid/panel' }),
      botonPerfil(6, 'MULETA', { type: 'none' }, { timerTriggerAt: '20:00', timerTriggerDias: [1, 3, 5] }),
      botonPerfil(7, es ? 'AURICULARES' : 'HEADSET', { type: 'audio-device', deviceName: es ? 'Auriculares USB' : 'USB headset' }),
    ],
  };
}

/** Un perfil o una página de relleno: no se llega a abrir, pero debe existir si se pulsa. */
function perfilSimple(entrada, idioma) {
  const es = idioma !== 'en';
  const botones = [0, 1, 2, 3].map((i) => botonPerfil(i, `BOTON ${i + 1}`, { type: 'none' }));
  if (entrada.kind === 'page') {
    return { page: { id: 'p1', name: es ? 'PÁGINA' : 'PAGE', gridSize: 2, gridRows: 2 }, buttons: botones };
  }
  return { name: entrada.label[idioma] ?? entrada.label.es, accent: entrada.acento, wallpaper: 'dotgrid', pages: [{ id: 'p1', name: 'PAGE', gridSize: 2, gridRows: 2 }], buttons: botones };
}

/** La portada: el glifo de la entrada en grande sobre la trama y un halo de su acento. */
function svgPortada(entrada) {
  const ancho = 640;
  const alto = 360;
  const matriz = matrizDePuntos(bitsDe(entrada.icono) ?? '');
  return svg(`
    <defs>
      <radialGradient id="halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${entrada.acento}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${entrada.acento}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${ancho}" height="${alto}" fill="${FONDO}"/>
    ${tramaDeFondo(ancho, alto)}
    <circle cx="${ancho / 2}" cy="${alto / 2}" r="170" fill="url(#halo)"/>
    ${glifoEnPuntos(matriz, { cx: ancho / 2, cy: alto / 2, escala: 13, color: entrada.acento })}
    <rect x="0" y="${alto - 6}" width="${ancho}" height="6" fill="${entrada.acento}" fill-opacity="0.65"/>
  `, ancho, alto);
}

/** Una captura: la rejilla de botones de una página, como la dibujaría el deck. */
function svgCaptura(entrada, { cols, filas, semilla }) {
  const ancho = 640;
  const alto = 360;
  const pozo = ['broadcast', 'music', 'bulb', 'layout-grid', 'player-play', 'camera', 'clock', 'settings']
    .map((id) => matrizDePuntos(bitsDe(id) ?? ''))
    .filter(Boolean);
  const r = azar(semilla);
  const margen = 18;
  const lado = Math.floor((ancho - margen * 2 - (cols - 1) * 12) / cols);
  const altoTile = Math.min(lado, Math.floor((alto - 74 - (filas - 1) * 12) / filas));
  let tiles = '';
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < cols; col++) {
      const x = margen + col * (lado + 12);
      const y = 62 + fila * (altoTile + 12);
      const acento = PALETA[Math.floor(r() * PALETA.length)];
      const matriz = pozo[Math.floor(r() * pozo.length)];
      tiles += `<g>
        <rect x="${x}" y="${y}" width="${lado}" height="${altoTile}" rx="10" fill="${ELEVADA}" stroke="${BORDE}"/>
        <rect x="${x}" y="${y}" width="${lado}" height="4" rx="2" fill="${acento}" fill-opacity="0.7"/>
        ${glifoEnPuntos(matriz, { cx: x + lado / 2, cy: y + altoTile / 2, escala: Math.max(3, lado / 26), color: acento })}
      </g>`;
    }
  }
  return svg(`
    <rect width="${ancho}" height="${alto}" fill="#0b0d0f"/>
    ${tramaDeFondo(ancho, alto)}
    <rect x="0" y="0" width="${ancho}" height="44" fill="${SUPERFICIE}"/>
    <rect x="0" y="44" width="${ancho}" height="1" fill="${BORDE}"/>
    <circle cx="24" cy="22" r="6" fill="${entrada.acento}"/>
    <rect x="42" y="17" width="86" height="10" rx="4" fill="#2b3036"/>
    <rect x="${ancho - 130}" y="15" width="112" height="14" rx="6" fill="#20242a"/>
    ${tiles}
  `, ancho, alto);
}

/** El manifiesto apuntando a las artes locales; `servicios.mjs` las sirve en el sitio. */
function manifiesto(idioma) {
  const prefijo = 'https://raw.githubusercontent.com/AndyVillatoro/virtualdeck-gallery/main/prensa';
  return {
    version: 2,
    profiles: ENTRADAS.map((e) => ({
      id: e.id,
      ...(e.kind === 'page' ? { kind: 'page' } : {}),
      label: e.label[idioma] ?? e.label.es,
      author: 'VirtualDeck',
      description: e.desc[idioma] ?? e.desc.es,
      url: `${prefijo}/${e.id}.json`,
      tags: e.tags[idioma] ?? e.tags.es,
      version: e.version,
      minAppVersion: '0.12.0',
      ...(e.targetApp ? { targetApp: e.targetApp } : {}),
      icono: e.icono,
      portada: `${prefijo}/portada-${e.id}.png`,
      capturas: [`${prefijo}/captura-${e.id}-1.png`, `${prefijo}/captura-${e.id}-2.png`],
    })),
  };
}

/**
 * Escribe el manifiesto, los perfiles y las imágenes de la tienda en `dir`.
 * `idioma` solo cambia los rótulos (datos del manifiesto y del perfil); las
 * portadas y capturas son las mismas en los dos idiomas porque no llevan texto.
 */
export async function generarArtesTienda(dir, idioma = 'es') {
  mkdirSync(dir, { recursive: true });
  const guardar = async (nombre, svgTexto) => pngDe(svgTexto, join(dir, nombre));
  ENTRADAS.forEach((e, i) => {
    writeFileSync(join(dir, `${e.id}.json`), `${JSON.stringify(i === 0 ? perfilRico(idioma) : perfilSimple(e, idioma), null, 2)}\n`);
  });
  await Promise.all(ENTRADAS.flatMap((e) => [
    guardar(`portada-${e.id}.png`, svgPortada(e)),
    guardar(`captura-${e.id}-1.png`, svgCaptura(e, { cols: 4, filas: 3, semilla: 11 })),
    guardar(`captura-${e.id}-2.png`, svgCaptura(e, { cols: 3, filas: 2, semilla: 29 })),
  ]));
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifiesto(idioma), null, 2)}\n`);
}

// Al ejecutarlo a mano deja las artes en `docs/prensa/fuentes/`, que es donde
// las buscará la corrida de verdad. El capturador las regenera por su cuenta.
if (import.meta.url === `file://${process.argv[1]}`) {
  const destino = join(RAIZ, 'docs', 'prensa', 'fuentes');
  await generarFondoNeutro(join(destino, 'fondo-neutro.png'));
  await generarArtesTienda(join(destino, 'tienda'), process.env.VD_PRENSA_IDIOMA === 'en' ? 'en' : 'es');
  console.log(`artes escritas en ${destino}`);
}
