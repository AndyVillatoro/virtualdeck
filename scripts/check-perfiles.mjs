// Comprueba que un perfil de galeria solo use cosas que la aplicacion sabe hacer.
//
// Existe porque el ejemplo que venia en el repositorio usaba `media-play` y
// `volume-mute`, que **no son tipos de accion**: los de verdad son
// `media-play-pause` y `mute`. Un perfil asi se importa igual —el camino de la
// galeria no valida los tipos— y los botones no hacen nada al pulsarlos.
//
// Uso: node scripts/check-perfiles.mjs <carpeta-o-archivo> [...]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const tipos = new Set([...readFileSync('src/types.ts', 'utf-8')
  .match(/export type ActionType\s*=([\s\S]*?);/)[1]
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));

const widgets = new Set([...readFileSync('src/types.ts', 'utf-8')
  .match(/export type TipoWidget\s*=([^;]*);/)[1]
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));

const snaps = new Set([...readFileSync('src/types.ts', 'utf-8')
  .match(/snapPosition\?:([^;]*);/)[1]
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));

const fuenteRgb = readFileSync('src/data/rgbPresets.ts', 'utf-8');
const presets = new Set([...fuenteRgb.slice(fuenteRgb.indexOf('RGB_PRESET_IDS'))
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));

const problemas = [];

function revisarAccion(a, donde) {
  if (!a || typeof a !== 'object') return;
  if (!tipos.has(a.type)) problemas.push(`${donde}: '${a.type}' no es un tipo de accion`);
  if (a.snapPosition && !snaps.has(a.snapPosition)) problemas.push(`${donde}: snapPosition '${a.snapPosition}' no existe`);
  if (a.rgbPresetId && !presets.has(a.rgbPresetId)) problemas.push(`${donde}: preset RGB '${a.rgbPresetId}' no existe`);
  for (const clave of ['branchThen', 'branchElse', 'timerActions']) {
    for (const [i, sub] of (a[clave] ?? []).entries()) revisarAccion(sub, `${donde}.${clave}[${i}]`);
  }
}

function revisarPerfil(ruta, texto) {
  let j;
  try { j = JSON.parse(texto ?? readFileSync(ruta, 'utf-8')); }
  catch (e) { problemas.push(`${ruta}: no es JSON valido — ${e.message}`); return; }

  // Lo mismo que exige `validateConfig` del renderer.
  if (!Array.isArray(j.pages) || j.pages.length === 0) problemas.push(`${ruta}: 'pages' tiene que ser una lista no vacia`);
  if (!Array.isArray(j.buttons)) { problemas.push(`${ruta}: 'buttons' tiene que ser una lista`); return; }
  if (typeof j.accent !== 'string') problemas.push(`${ruta}: falta 'accent'`);
  if (typeof j.wallpaper !== 'string') problemas.push(`${ruta}: falta 'wallpaper'`);

  for (const [i, p] of (j.pages ?? []).entries()) {
    if (typeof p?.id !== 'string' || typeof p?.name !== 'string') problemas.push(`${ruta}: pagina ${i + 1} sin id o sin name`);
    // El mismo rango que acota `sanearPagina`; fuera de el la rejilla se
    // descarta al importar y el perfil no se ve como su autor lo dejo.
    if (p?.gridSize !== undefined && ![3, 4, 5, 6].includes(p.gridSize)) problemas.push(`${ruta}: gridSize ${p.gridSize} fuera de rango (3-6)`);
    if (p?.gridRows !== undefined && (p.gridRows < 1 || p.gridRows > 8)) problemas.push(`${ruta}: gridRows ${p.gridRows} fuera de rango (1-8)`);
  }

  const huecos = (j.pages?.[0]?.gridSize ?? 4) * (j.pages?.[0]?.gridRows ?? j.pages?.[0]?.gridSize ?? 4);
  const vistos = new Set();
  for (const [i, b] of j.buttons.entries()) {
    const donde = `${ruta} boton ${i + 1}`;
    if (typeof b?.id !== 'string') problemas.push(`${donde}: sin id`);
    else if (vistos.has(b.id)) problemas.push(`${donde}: id '${b.id}' repetido`);
    else vistos.add(b.id);
    if (typeof b?.page !== 'number') problemas.push(`${donde}: sin page`);
    else if (b.page >= (j.pages?.length ?? 0)) problemas.push(`${donde}: page ${b.page} y solo hay ${j.pages?.length} paginas`);
    if (typeof b?.label !== 'string') problemas.push(`${donde}: sin label`);
    if (b?.widget && !widgets.has(b.widget)) problemas.push(`${donde}: widget '${b.widget}' no existe`);
    revisarAccion(b?.action, donde);
    for (const [k, a] of (b?.actions ?? []).entries()) revisarAccion(a, `${donde} accion ${k + 1}`);
    if (b?.actionToggleOff) revisarAccion(b.actionToggleOff, `${donde} (apagar)`);
    if (b?.longPressAction) revisarAccion(b.longPressAction, `${donde} (mantener)`);
  }
  // Menos botones que huecos no rompe nada —se rellenan— pero mas de los que
  // caben quedan escondidos detras de la rejilla y el autor no lo sabe.
  const enPrimera = j.buttons.filter((b) => b.page === 0).length;
  if (enPrimera > huecos) problemas.push(`${ruta}: ${enPrimera} botones en la pagina 1 y solo caben ${huecos}`);
  return j.buttons.length;
}

const rutas = process.argv.slice(2);
if (rutas.length === 0) { console.error('uso: node scripts/check-perfiles.mjs <carpeta|archivo|url-de-manifest>...'); process.exit(2); }

/**
 * Un `manifest.json` por HTTP: se baja y se revisa **cada perfil que anuncia**.
 *
 * Sin esto el guardian solo miraba el ejemplo que vive en este repositorio, y
 * los perfiles publicados de verdad —que estan en otro repositorio— no los
 * revisaba nadie. Si se renombra un tipo de accion, se rompen para quien los
 * importe y aqui todo sigue en verde: exactamente el agujero que ya costo caro
 * con los canales IPC.
 *
 * Va aparte de `npm run check` a proposito: una comprobacion de compilacion no
 * puede depender de que haya red.
 */
// `process.exit()` con un socket de `fetch` todavia vivo revienta libuv en
// Windows (`UV_HANDLE_CLOSING`) y el guardian salia con 127 en vez de 1 — o
// sea, fallaba por estrellarse, no por encontrar el fallo. Se pide cerrar la
// conexion y se marca `exitCode` en vez de matar el proceso a mano.
const SIN_KEEPALIVE = { headers: { connection: 'close' } };

async function revisarManifiesto(url) {
  let man;
  try {
    const r = await fetch(url, SIN_KEEPALIVE);
    if (!r.ok) { problemas.push(`${url}: HTTP ${r.status}`); return 0; }
    man = await r.json();
  } catch (e) { problemas.push(`${url}: no se pudo bajar — ${e.message}`); return 0; }
  if (!Array.isArray(man.profiles) || man.profiles.length === 0) {
    problemas.push(`${url}: el manifiesto no anuncia ningun perfil`);
    return 0;
  }
  let vistos = 0;
  for (const e of man.profiles) {
    if (!e.url) { problemas.push(`${url}: la entrada '${e.id ?? '?'}' no trae url`); continue; }
    try {
      const r = await fetch(e.url, SIN_KEEPALIVE);
      if (!r.ok) { problemas.push(`${e.id}: HTTP ${r.status} en ${e.url}`); continue; }
      revisarPerfil(e.id ?? e.url, await r.text());
      vistos++;
    } catch (err) { problemas.push(`${e.id}: no se pudo bajar — ${err.message}`); }
  }
  return vistos;
}

let n = 0;
for (const r of rutas) {
  if (/^https?:\/\//.test(r)) { n += await revisarManifiesto(r); continue; }
  const archivos = statSync(r).isDirectory()
    ? readdirSync(r).filter((f) => f.endsWith('.json')).map((f) => join(r, f))
    : [r];
  for (const a of archivos) { revisarPerfil(a); n++; }
}

// El `else` no sobra. Con `process.exit()` esta linea no se alcanzaba nunca;
// al pasar a `exitCode` la ejecucion sigue, y llego a imprimir «ok» **debajo**
// de la lista de problemas. Un guardian que se contradice a si mismo es peor
// que ninguno: lo que se lee de un vistazo es la ultima linea.
if (problemas.length) {
  console.error(`perfiles: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exitCode = 1;
} else {
  console.log(`perfiles: ok — ${n} revisado(s) contra ${tipos.size} tipos, ${widgets.size} widgets, ${presets.size} presets RGB, ${snaps.size} posiciones`);
}
