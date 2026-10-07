/**
 * generar-iconos-dot.mjs — catálogo grande de iconos pasados a la estética DOT.
 *
 * Fuentes (devDependencies, leídas de node_modules):
 *   · marcas   → simple-icons  (CC0-1.0)  https://github.com/simple-icons/simple-icons
 *   · acciones → @tabler/icons (MIT)      https://github.com/tabler/tabler-icons
 *
 * Cada SVG se rasteriza a 16×16 (se renderiza a 96×96 con `density` y se reduce,
 * que acumula la tinta de los trazos finos), se umbraliza y sale como 256 bits
 * (32 bytes) en base64.
 *
 * Sobre las marcas:
 *   · se descartan las casi vacías y casi llenas (a ese tamaño no se leen);
 *   · se descartan los logotipos de texto: su caja de tinta es una banda
 *     (alto/ancho < 0.35) y a 16×16 quedan en una raya ilegible;
 *   · las que pasan de RELLENO_CONTORNO se dibujan **en contorno** (borde de la
 *     forma y de sus huecos) en vez de rellenas: a 16×16 un logo relleno con
 *     detalle interior se vuelve una mancha.
 *
 * Uso:
 *   npm run build:iconos
 *   node scripts/generar-iconos-dot.mjs [--umbral 0.4] [--texto 0.45]
 *                                       [--relleno 0.45] [--muestras <dir>]
 *
 * Escribe siempre:
 *   src/data/iconosDot/marcas.json     — [id, bits] por icono
 *   src/data/iconosDot/acciones.json   — [id, bits] por icono
 *   src/data/iconosDot/indice.json     — índice de búsqueda compacto:
 *     · `etiquetas`: tabla compartida de etiquetas (los iconos la referencian
 *       por índice; antes cada etiqueta se repetía entera en su entrada);
 *     · `categorias`: [titulo, recuento] de Tabler, que antes solo vivía
 *       mezclado en minúsculas dentro de las etiquetas;
 *     · `destacadas`: subgrupos de marcas con los ids de Simple Icons que
 *       casan con los 6 grupos viejos de `BRAND_ICONS` (las que no casan se
 *       listan por consola, no se inventan);
 *     · `acciones`: [id, [etq], cat] — el nombre de una acción es su id con
 *       guiones, así que no se guarda;
 *     · `marcas`: [id, nombre, [etq]?] — sin el tercer elemento si no hay
 *       etiquetas.
 * y las muestras en <dir>: 100 al azar por catálogo + los rellenos a contorno.
 */

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');

// ── Parámetros ───────────────────────────────────────────────────────────────
// Umbral de cobertura por celda. Probados 0.35, 0.40 y 0.45 sobre las muestras:
// 0.35 engorda los trazos finos hasta casi cerrar contraagujeros; 0.45 rompe las
// líneas de Tabler en puntos sueltos (a 16×16 un trazo de 2/24 mide 1.3 px).
const UMBRAL = 0.4;
// Descartado «casi vacío» (menos del 5 % de las 256 celdas = 12 celdas) y
// «casi lleno» (más del 90 % = 230 celdas). El tope se probó primero en el
// 55 % y era un error: media Simple Icons son logos rellenos con el glifo en
// hueco, y a ese corte se tiraban 929 marcas perfectamente legibles. Solo son
// mancha los que dejan menos de 26 celdas libres; ahí ya no hay silueta.
const MIN_ENCENDIDOS = Math.round(0.05 * 256);
const MAX_ENCENDIDOS = Math.round(0.9 * 256);
// Logotipo de texto: caja de tinta con alto/ancho por debajo de esto. Probado
// 0.35/0.40/0.45: los propios ejemplos del encargo (lenovo, itvx, tide) dan
// 16×6 = 0.375, así que a 0.35 sobrevivían; pero la banda no acaba ahí — a
// 0.40 seguían colándose los 15×6 (intel, visa, zara) y a 0.45 quedan fuera
// también los 16×7 tipo Rasa. A 6-7 puntos de altura todo eso es una raya.
const UMBRAL_TEXTO = 0.45;
// Relleno a partir del cual se dibuja contorno. Probado 0.45/0.50/0.55 sobre
// muestras: a 0.55 seguían manchados snapdragon (51 %) y triller (49 %), que el
// supervisor puso como ejemplos; a 0.45 convierten los dos y las siluetas
// densas (apple, patreon, lottiefiles) quedan legibles en contorno.
const RELLENO_CONTORNO = 0.45;
// Ejemplos señalados en la revisión: si convirtieron, van delante en la muestra
// de contorno para poder comprobarlos de un vistazo.
const CONTORNO_REVISADOS = [
  'databricks', 'snapdragon', 'gatsby', 'lottiefiles', 'downdetector', 'triller', 'patreon',
];
const MUESTRAS_CONTORNO = 40;
const SEMILLA_MUESTRA = 20261004;
const MUESTRAS_POR_CATALOGO = 100;

const DIR_SALIDA = join(RAIZ, 'src', 'data', 'iconosDot');
const DIR_MUESTRAS_POR_DEFECTO = String.raw`C:\Users\andyf\code proyects\_referencias\render-iconos`;

const COLORES_MUESTRA = {
  fondo: '#070809',
  casilla: '#0b0c0e',
  borde: '#26292e',
  puntoOn: '#c9ced6',   // gris claro — nunca #ffffff
  puntoOff: '#17191d',
  texto: '#8b919b',
};

// ── Utilidades ───────────────────────────────────────────────────────────────

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(nombre);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

/** PRNG determinista: las muestras no cambian entre ejecuciones. */
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar(lista, al) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(al() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function palabras(texto) {
  return String(texto)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9áéíóúüñ]+/)
    .filter((p) => p.length >= 2);
}

function sinDuplicados(lista) {
  return [...new Set(lista)];
}

/**
 * Poda de etiquetas del índice de búsqueda (T-OPT-01).
 *
 * La búsqueda (`coincideBusqueda` en `useSelectorIconosDot`) hace `includes`
 * del término sobre id, nombre y cada etiqueta, así que sobra todo lo que ya
 * se encuentra por otro camino:
 *   · subcadena del id o del nombre (`arrow` en `arrow-right`, `football` en
 *     `ball-football`, alias que repiten el título de la marca);
 *   · duplicadas insensible a mayúsculas;
 *   · de menos de 3 letras, **solo si son redundantes**: las cortas que
 *     aportan (`3d`, `ai`, `ui`, `tv`, `js`…) son a veces la única vía para
 *     encontrar el icono y se quedan;
 *   · subcadena de otra etiqueta conservada del mismo icono (`sport` en
 *     `sports`): el término se encuentra por la larga.
 */
function podarEtiquetas(id, nombre, etiquetas) {
  const idM = String(id).toLowerCase();
  const nombreM = String(nombre).toLowerCase();
  const vistas = new Set();
  const utiles = [];
  for (const t of etiquetas) {
    const tl = String(t).toLowerCase();
    if (vistas.has(tl)) continue;
    vistas.add(tl);
    if (idM.includes(tl) || nombreM.includes(tl)) continue;
    // Las de menos de 3 letras que llegan aquí NO son redundantes: no están
    // en el id ni en el nombre (`3d`, `ai`, `ui`, `tv`, `js`…) y a veces son
    // la única vía para encontrar el icono, así que se quedan. Las cortas
    // redundantes ya cayeron en la regla anterior.
    utiles.push(t);
  }
  // De las que quedan, fuera las subcadenas de una hermana más larga. Se
  // ordena de larga a corta para que la larga gane siempre.
  const ordenadas = [...new Set(utiles.map((t) => String(t).toLowerCase()))]
    .sort((a, b) => b.length - a.length);
  const conservadas = [];
  for (const tl of ordenadas) {
    if (conservadas.some((u) => u.includes(tl))) continue;
    conservadas.push(tl);
  }
  const juego = new Set(conservadas);
  return utiles.filter((t) => juego.has(String(t).toLowerCase()));
}

function encendido(bits, x, y) {
  if (x < 0 || x > 15 || y < 0 || y > 15) return false;
  const i = x + 16 * y;
  return (bits[i >> 3] & (0x80 >> (i & 7))) !== 0;
}

// ── Rasterizado y formas ─────────────────────────────────────────────────────

/** SVG → 256 bits (fila a fila, x + 16·y, bit más significativo primero). */
async function aBits(svg, umbral) {
  const { data, info } = await sharp(svg, { density: 288 })
    .resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bits = Buffer.alloc(32);
  let encendidos = 0;
  for (let i = 0; i < 256; i++) {
    const alfa = data[i * info.channels + 3] / 255;
    if (alfa >= umbral) {
      bits[i >> 3] |= 0x80 >> (i & 7);
      encendidos++;
    }
  }
  return { bits, encendidos };
}

/** Caja de la tinta encendida. `null` si no hay nada (no debería: hay mínimo). */
function cajaDeTinta(bits) {
  let minX = 16, maxX = -1, minY = 16, maxY = -1;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!encendido(bits, x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { ancho: maxX - minX + 1, alto: maxY - minY + 1 };
}

/** Un logotipo de texto es una banda: su tinta ocupa mucha anchura y poca altura. */
function esLogotipoDeTexto(bits, umbralTexto) {
  const caja = cajaDeTinta(bits);
  if (!caja) return false;
  return caja.alto / caja.ancho < umbralTexto;
}

/**
 * Contorno: deja encendida solo la celda que toca una apagada (o el borde de la
 * rejilla). Dibuja el borde de la forma y el de sus huecos interiores; en un
 * trazo fino ya de una celda no cambia nada.
 */
function aContorno(bits) {
  const fuera = Buffer.alloc(32);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!encendido(bits, x, y)) continue;
      const borde =
        !encendido(bits, x - 1, y) || !encendido(bits, x + 1, y) ||
        !encendido(bits, x, y - 1) || !encendido(bits, x, y + 1);
      if (borde) {
        const i = x + 16 * y;
        fuera[i >> 3] |= 0x80 >> (i & 7);
      }
    }
  }
  return fuera;
}

/** Recorre una lista en lotes para no saturar libvips. */
async function enLotes(items, tamano, tarea) {
  const salida = [];
  for (let i = 0; i < items.length; i += tamano) {
    salida.push(...(await Promise.all(items.slice(i, i + tamano).map(tarea))));
  }
  return salida;
}

// ── Catálogos ────────────────────────────────────────────────────────────────

const LICENCIAS_LIBRES = new Set(['CC0-1.0', 'Unlicense']);

// Nombres canónicos en Simple Icons para marcas viejas que no casan por slug
// ni por título. Son renombres documentados (`Chrome` es `googlechrome`), no
// ids inventados: si el slug no existe en la versión instalada, la pareja
// queda sin casar y se reporta igual que las demás.
const ALIAS_MARCAS_SI = new Map([
  ['chrome', 'googlechrome'],
  ['vscode', 'visualstudiocode'],
  ['illustrator', 'adobeillustrator'],
  ['aftereffects', 'adobeaftereffects'],
  ['photoshop', 'adobephotoshop'],
  ['premiere', 'adobepremierepro'],
  ['excel', 'microsoftexcel'],
  ['word', 'microsoftword'],
  ['powerpoint', 'microsoftpowerpoint'],
  ['outlook', 'microsoftoutlook'],
  ['onenote', 'microsoftonenote'],
  ['teams', 'microsoftteams'],
  ['edge', 'microsoftedge'],
  ['nintendo', 'nintendoswitch'],
  ['notepadpp', 'notepadplusplus'],
]);

/** Clave de cotejo: sin mayúsculas, sin tildes, solo letras y dígitos. */
function normalizarMarca(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Los 6 grupos de `BRAND_ICONS` (clave vieja → etiqueta), leídos del fuente. */
function leerGruposMarcasViejas() {
  const fuente = readFileSync(join(RAIZ, 'src', 'comun', 'brandIcons.ts'), 'utf-8');
  const bloque = fuente.slice(
    fuente.indexOf('BRAND_ICON_GROUPS'),
    fuente.indexOf('// ── Build flat lookup map'),
  );
  const grupos = [];
  let actual = null;
  for (const linea of bloque.split(/\r?\n/)) {
    const titulo = linea.match(/title:\s*'((?:[^'\\]|\\.)*)'/);
    if (titulo) {
      actual = { titulo: titulo[1], claves: [] };
      grupos.push(actual);
      continue;
    }
    const clave = linea.match(/^\s*\['([^']+)',\s*'((?:[^'\\]|\\.)*)'/);
    if (clave && actual) actual.claves.push({ key: clave[1], label: clave[2] });
  }
  return grupos;
}

/**
 * Empareja cada marca vieja con un id de Simple Icons por slug, título, alias
 * o el renombre de `ALIAS_MARCAS_SI`. Devuelve los subgrupos con los ids que
 * de verdad existen en el catálogo (los filtros de calidad pueden descartar
 * una pareja) y la lista de las que no casan, para no inventar ninguna.
 */
function emparejarDestacadas(grupos, meta, idsValidos) {
  const porNombre = new Map();
  const apuntar = (nombre, slug) => {
    const clave = normalizarMarca(nombre);
    if (clave && !porNombre.has(clave)) porNombre.set(clave, slug);
  };
  for (const [slug, datos] of meta) {
    apuntar(slug, slug);
    apuntar(datos.title ?? '', slug);
    for (const alias of datos.aliases?.aka ?? []) apuntar(alias, slug);
  }
  const destacadas = [];
  const sinPareja = [];
  const descartadas = [];
  for (const grupo of grupos) {
    const ids = [];
    for (const { key, label } of grupo.claves) {
      // El alias solo vale si el slug existe en la versión instalada; si no,
      // es una marca sin pareja, no una pareja descartada por los filtros.
      const alias = ALIAS_MARCAS_SI.get(key);
      const slug =
        (alias && meta.has(alias) ? alias : undefined) ??
        porNombre.get(normalizarMarca(key)) ??
        porNombre.get(normalizarMarca(label));
      if (!slug) {
        sinPareja.push(key);
        continue;
      }
      if (!idsValidos.has(slug)) {
        descartadas.push(`${key}→${slug}`);
        continue;
      }
      if (!ids.includes(slug)) ids.push(slug);
    }
    if (ids.length) destacadas.push([grupo.titulo, ids]);
  }
  return { destacadas, sinPareja, descartadas };
}

function cargarMarcasCrudas() {
  const raiz = join(RAIZ, 'node_modules', 'simple-icons');
  const meta = new Map(
    JSON.parse(readFileSync(join(raiz, 'data', 'simple-icons.json'), 'utf-8')).map((e) => [e.slug, e]),
  );
  const iconos = [];
  let excluidosPorLicencia = 0;
  for (const archivo of readdirSync(join(raiz, 'icons'))) {
    if (!archivo.endsWith('.svg')) continue;
    const id = basename(archivo, '.svg');
    const datos = meta.get(id);
    // El paquete es CC0, pero ~225 iconos declaran licencia propia (GPL, AGPL,
    // CC-BY-NC, CC-BY-ND…). El aviso de simple-icons lo dice: "CC0 does not
    // imply that all icons are CC0". Los derivados (aquí, un mapa de bits) de
    // ND/NC no son libres, así que fuera.
    const licencia = datos?.license?.type;
    if (licencia && !LICENCIAS_LIBRES.has(licencia)) {
      excluidosPorLicencia++;
      continue;
    }
    const nombre = datos?.title ?? id;
    const etiquetas = sinDuplicados([
      ...palabras(nombre),
      ...palabras(id),
      ...(datos?.aliases?.aka ?? []).flatMap(palabras),
    ]);
    iconos.push({ id, nombre, etiquetas, svg: join(raiz, 'icons', archivo) });
  }
  return { iconos, excluidosPorLicencia, meta };
}

function cargarAccionesCrudas() {
  const raiz = join(RAIZ, 'node_modules', '@tabler', 'icons');
  const meta = JSON.parse(readFileSync(join(raiz, 'icons.json'), 'utf-8'));
  const iconos = [];
  for (const archivo of readdirSync(join(raiz, 'icons', 'outline'))) {
    if (!archivo.endsWith('.svg')) continue;
    const id = basename(archivo, '.svg');
    const datos = meta[id] ?? {};
    // La categoría ya no se mezcla en las etiquetas: sale como campo aparte
    // (`categoria`) para poder agrupar la barra lateral.
    const etiquetas = sinDuplicados([
      ...(Array.isArray(datos.tags) ? datos.tags.filter((t) => typeof t === 'string' && t.length >= 2) : []),
      ...palabras(id),
    ]);
    iconos.push({
      id,
      nombre: id.replace(/-/g, ' '),
      etiquetas,
      categoria: datos.category ? String(datos.category) : '',
      svg: join(raiz, 'icons', 'outline', archivo),
    });
  }
  return { iconos, excluidosPorLicencia: 0 };
}

async function generarCatalogo(nombre, crudo, umbral, opciones) {
  const validos = [];
  const descartados = { vacios: 0, llenos: 0, texto: 0 };
  const resultados = await enLotes(crudo.iconos, 32, async (icono) => {
    try {
      const { bits, encendidos } = await aBits(readFileSync(icono.svg), umbral);
      return { ...icono, bits, encendidos };
    } catch (e) {
      return { ...icono, error: e.message };
    }
  });
  let errores = 0;
  for (const r of resultados) {
    if (r.error) {
      errores++;
      console.error(`  ! ${nombre}/${r.id}: ${r.error}`);
      continue;
    }
    if (r.encendidos < MIN_ENCENDIDOS) descartados.vacios++;
    else if (r.encendidos > MAX_ENCENDIDOS) descartados.llenos++;
    // Los logotipos de texto solo son un problema en las marcas: las letras de
    // Tabler (`letter-a`, `time-duration-90`…) son iconos de acción legítimos.
    else if (nombre === 'marcas' && esLogotipoDeTexto(r.bits, opciones.umbralTexto)) descartados.texto++;
    else {
      const contorno = nombre === 'marcas' && r.encendidos / 256 > opciones.relleno;
      validos.push({
        id: r.id,
        nombre: r.nombre,
        etiquetas: r.etiquetas,
        categoria: r.categoria,
        bits: contorno ? aContorno(r.bits) : r.bits,
        encendidos: r.encendidos,
        contorno,
      });
    }
  }
  return { validos, descartados, errores };
}

// ── Salida ───────────────────────────────────────────────────────────────────

const FORMATO_BITS =
  '16x16, fila a fila (x + 16*y), bit mas significativo primero, 1 = punto encendido, base64 de 32 bytes';

function escribirJson(ruta, catalogo) {
  const lineas = [
    '{',
    `"fuente": ${JSON.stringify(catalogo.fuente)},`,
    `"licencia": ${JSON.stringify(catalogo.licencia)},`,
    `"umbral": ${catalogo.umbral},`,
    `"formatoBits": ${JSON.stringify(FORMATO_BITS)},`,
    `"iconos": [`,
    ...catalogo.iconos.map((i) => JSON.stringify(i) + ','),
    ']',
    '}',
    '',
  ];
  // La última coma sobra: se quita para que el archivo sea JSON válido.
  const texto = lineas.join('\n').replace(/,\n\]\n\}\n$/, '\n]\n}\n');
  writeFileSync(ruta, texto, 'utf-8');
  return statSync(ruta).size;
}

// Índice compacto: sin bitmaps, etiquetas en tabla compartida y el nombre de
// una acción derivado de su id. Repetir cada etiqueta entera en su entrada
// engordaba el archivo sin aportar nada (roadmap 84).
function escribirIndice(ruta, { marcas, acciones, categorias, destacadas }) {
  const tabla = new Map();
  const referencia = (t) => {
    if (!tabla.has(t)) tabla.set(t, tabla.size);
    return tabla.get(t);
  };
  const refs = (lista) => lista.map(referencia);
  const bloque = (nombre, entradas) => [`"${nombre}": [`, ...entradas.map((e) => JSON.stringify(e) + ','), '],'];
  const entradasAcciones = acciones.map((i) => [
    i.id,
    refs(podarEtiquetas(i.id, i.nombre, i.etiquetas)),
    categorias.indice.get(i.categoria) ?? -1,
  ]);
  const entradasMarcas = marcas.map((i) => {
    const etiquetas = refs(podarEtiquetas(i.id, i.nombre, i.etiquetas));
    // Sin etiquetas no se escribe el tercer elemento: son miles de `[]`.
    return etiquetas.length ? [i.id, i.nombre, etiquetas] : [i.id, i.nombre];
  });
  const lineas = [
    '{',
    `"formato": ${JSON.stringify('[id, [etq], cat] acciones; [id, nombre, [etq]?] marcas — etq = indice en "etiquetas", cat = indice en "categorias" (-1 = sin categoria), el nombre de una accion es su id con guiones')},`,
    ...bloque('etiquetas', [...tabla.keys()]),
    `"categorias": ${JSON.stringify(categorias.lista)},`,
    `"destacadas": ${JSON.stringify(destacadas)},`,
    ...bloque('marcas', entradasMarcas),
    ...bloque('acciones', entradasAcciones),
    '}',
    '',
  ];
  const texto = lineas.join('\n').replace(/,\n(?=\s*[\]}])/g, '\n');
  writeFileSync(ruta, texto, 'utf-8');
  return statSync(ruta).size;
}

// ── Muestras ─────────────────────────────────────────────────────────────────

function rejillaSvg(iconos) {
  const columnas = 10;
  const filas = Math.ceil(iconos.length / columnas);
  const paso = 8;
  const lado = 16 * paso;
  const etiqueta = 14;
  const hueco = 10;
  const ancho = columnas * lado + (columnas - 1) * hueco;
  const alto = filas * (lado + etiqueta) + (filas - 1) * hueco;
  const partes = [
    `<svg width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="${ancho}" height="${alto}" fill="${COLORES_MUESTRA.fondo}"/>`,
  ];
  iconos.forEach((icono, n) => {
    const cx = (n % columnas) * (lado + hueco);
    const cy = Math.floor(n / columnas) * (lado + etiqueta + hueco);
    partes.push(
      `<g transform="translate(${cx},${cy})">`,
      `<rect width="${lado}" height="${lado + etiqueta}" rx="4" fill="${COLORES_MUESTRA.casilla}" stroke="${COLORES_MUESTRA.borde}"/>`,
    );
    const bits = Buffer.from(icono.bits, 'base64');
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const i = x + 16 * y;
        const on = (bits[i >> 3] & (0x80 >> (i & 7))) !== 0;
        if (!on && (x + y) % 2) continue;
        partes.push(
          `<circle cx="${x * paso + paso / 2}" cy="${y * paso + paso / 2}" r="${on ? 2.7 : 1}" fill="${on ? COLORES_MUESTRA.puntoOn : COLORES_MUESTRA.puntoOff}"/>`,
        );
      }
    }
    const nombre = icono.id.length > 22 ? icono.id.slice(0, 21) + '…' : icono.id;
    partes.push(
      `<text x="${lado / 2}" y="${lado + 10.5}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="9" fill="${COLORES_MUESTRA.texto}">${nombre}</text>`,
      '</g>',
    );
  });
  partes.push('</svg>');
  return partes.join('');
}

async function escribirMuestra(dir, archivo, iconos) {
  mkdirSync(dir, { recursive: true });
  const ruta = join(dir, archivo);
  writeFileSync(ruta, await sharp(Buffer.from(rejillaSvg(iconos))).png().toBuffer());
  return ruta;
}

// ── Principal ────────────────────────────────────────────────────────────────

const linea = (n, datos, excluidos = 0) =>
  `${n}: ${datos.validos.length} dentro, ${datos.descartados.vacios} vacíos, ` +
  `${datos.descartados.llenos} llenos, ${datos.descartados.texto} texto, ` +
  `${datos.validos.filter((i) => i.contorno).length} a contorno, ` +
  `${excluidos} por licencia, ${datos.errores} errores`;

async function main() {
  const umbral = Number(argumento('--umbral', UMBRAL));
  const umbralTexto = Number(argumento('--texto', UMBRAL_TEXTO));
  const relleno = Number(argumento('--relleno', RELLENO_CONTORNO));
  const dirMuestras = argumento('--muestras', DIR_MUESTRAS_POR_DEFECTO);

  console.log(`generar-iconos-dot: umbral ${umbral}, texto < ${umbralTexto}, contorno > ${relleno}, 16×16`);

  const marcasCrudo = cargarMarcasCrudas();
  const accionesCrudo = cargarAccionesCrudas();

  const opciones = { umbralTexto, relleno };
  const marcas = await generarCatalogo('marcas', marcasCrudo, umbral, opciones);
  const acciones = await generarCatalogo('acciones', accionesCrudo, umbral, opciones);

  mkdirSync(DIR_SALIDA, { recursive: true });
  const tam = {};
  tam.marcas = escribirJson(join(DIR_SALIDA, 'marcas.json'), {
    fuente: 'simple-icons 16.34.0 (CC0-1.0)',
    licencia: 'CC0-1.0; los iconos con licencia propia se excluyeron',
    umbral,
    iconos: marcas.validos.map((i) => [i.id, i.bits.toString('base64')]),
  });
  tam.acciones = escribirJson(join(DIR_SALIDA, 'acciones.json'), {
    fuente: '@tabler/icons 3.48.0 (MIT)',
    licencia: 'MIT',
    umbral,
    iconos: acciones.validos.map((i) => [i.id, i.bits.toString('base64')]),
  });
  // Las categorías de Tabler, con recuento de los iconos que sobrevivieron al
  // filtro, para la barra lateral de grupos del catálogo.
  const conteoCategorias = new Map();
  for (const icono of acciones.validos) {
    if (!icono.categoria) continue;
    conteoCategorias.set(icono.categoria, (conteoCategorias.get(icono.categoria) ?? 0) + 1);
  }
  const listaCategorias = [...conteoCategorias.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const categorias = {
    lista: listaCategorias,
    indice: new Map(listaCategorias.map(([titulo], n) => [titulo, n])),
  };
  // Subgrupos de marcas destacadas: los 6 grupos viejos de `BRAND_ICONS`
  // emparejados con su id de Simple Icons. Las que no casan se reportan.
  const gruposViejos = leerGruposMarcasViejas();
  const destacadas = emparejarDestacadas(
    gruposViejos,
    marcasCrudo.meta,
    new Set(marcas.validos.map((i) => i.id)),
  );
  // El índice guarda las etiquetas ya podadas: la búsqueda no cambia porque
  // todo lo quitado se encontraba por id, por nombre o por otra etiqueta.
  tam.indice = escribirIndice(join(DIR_SALIDA, 'indice.json'), {
    marcas: marcas.validos,
    acciones: acciones.validos,
    categorias,
    destacadas: destacadas.destacadas,
  });

  // Semilla propia por catálogo: la muestra de acciones ya estaba aprobada y no
  // debe cambiar porque las marcas cambien de tamaño.
  const rutaMarcas = await escribirMuestra(
    dirMuestras, 'muestra-marcas.png',
    barajar(marcas.validos, mulberry32(SEMILLA_MUESTRA)).slice(0, MUESTRAS_POR_CATALOGO),
  );
  const rutaAcciones = await escribirMuestra(
    dirMuestras, 'muestra-acciones.png',
    barajar(acciones.validos, mulberry32(SEMILLA_MUESTRA)).slice(0, MUESTRAS_POR_CATALOGO),
  );
  // Los rellenos a contorno: primero los ejemplos revisados que convirtieron,
  // después los más densos (son los que estaban peor).
  const convertidos = marcas.validos.filter((i) => i.contorno);
  const revisados = CONTORNO_REVISADOS
    .map((id) => convertidos.find((i) => i.id === id))
    .filter(Boolean);
  const aContornoMuestra = [
    ...revisados,
    ...convertidos
      .filter((i) => !revisados.includes(i))
      .sort((a, b) => b.encendidos - a.encendidos)
      .slice(0, MUESTRAS_CONTORNO - revisados.length),
  ];
  const rutaContorno = await escribirMuestra(dirMuestras, 'muestra-marcas-contorno.png', aContornoMuestra);

  console.log(linea('marcas  ', marcas, marcasCrudo.excluidosPorLicencia));
  console.log(linea('acciones', acciones));
  console.log(
    `categorias: ${listaCategorias.length} · destacadas: ` +
    destacadas.destacadas.map(([t, ids]) => `${t} (${ids.length})`).join(' · '),
  );
  if (destacadas.sinPareja.length) {
    console.log(`marcas viejas sin pareja en Simple Icons (${destacadas.sinPareja.length}): ${destacadas.sinPareja.join(', ')}`);
  }
  if (destacadas.descartadas.length) {
    console.log(`marcas viejas con pareja descartada por los filtros (${destacadas.descartadas.length}): ${destacadas.descartadas.join(', ')}`);
  }
  console.log(`archivos: marcas.json ${tam.marcas} B · acciones.json ${tam.acciones} B · indice.json ${tam.indice} B`);
  console.log(`muestras: ${rutaMarcas} · ${rutaAcciones} · contorno (${aContornoMuestra.length} de ${convertidos.length}): ${rutaContorno}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
