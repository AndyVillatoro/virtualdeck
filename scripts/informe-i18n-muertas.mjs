// Informe de claves i18n sin usar. **No falla el build: informa.** Por eso va
// aparte de `check-i18n.mjs` y no está en la cadena de `npm run check`.
//
// `check-i18n.mjs` comprueba dos cosas: que ES y EN tengan las mismas claves, y
// que cada `t('...')` del código tenga entrada. Ninguna de las dos detecta lo
// contrario —una clave que lleva meses en el diccionario sin que nadie la
// llame—, así que el recuento hay que hacerlo aparte. Y "aparte" es donde se
// borran traducciones vivas: la primera vez, de 8 candidatas que daba el
// detector, 1 estaba viva y la salvó el propio guardián.
//
// Tres cosas que este script hace a propósito, y que costaron un disgusto:
//
//  1. **Una pasada por tipo de comilla, no una alternancia.** Con una sola
//     expresión `('...'|"...")`, la clase `[^'\\\n]` de la alternativa simple
//     también admite comillas dobles, así que se come el contenido de las
//     dobles: `tf("TÍTULO")` pasaba desapercibido y salían 117 textos de campo
//     como muertos. Eran 117 traducciones vivas.
//
//  2. **Un literal de un solo carácter cuenta.** Con un mínimo de dos, `tf('A')`
//     —el placeholder de «cantidad» en `CamposDivisa.tsx`— no se veía, y su
//     traducción parecía huérfana.
//
//  3. **Las claves con `${}` se resuelven, no se eximen.** `t(\`rgb.preset.${id}\`)
//     se genera desde la fuente de datos real, así que un preset borrado deja
//     una clave que sí se cuenta como muerta. Eximir la familia entera la
//     dejaría muerta para siempre.
//
// Se reportan las tres familias: ES/EN, los textos de campo (`FIELDS_EN`) y las
// claves con `${}`.

import { readFileSync, globSync } from 'node:fs';

const RAIZ = 'src';
const DICCIONARIOS = [
  'src/utils/idiomas/esComun.ts',
  'src/utils/idiomas/esEditor.ts',
  'src/utils/idiomas/esAcciones.ts',
  'src/utils/idiomas/esAjustes.ts',
  'src/utils/idiomas/enComun.ts',
  'src/utils/idiomas/enEditor.ts',
  'src/utils/idiomas/enAcciones.ts',
  'src/utils/idiomas/enAjustes.ts',
  'src/utils/idiomas/campos.ts',
];
// Los ficheros que **definen** las claves no cuentan como referencia de sí
// mismos, y `i18n.tsx`/`idioma.ts` se saltan porque sus literales son el
// diccionario o el traductor, no una llamada.
const NO_ES_REFERENCIA = new Set([...DICCIONARIOS, 'src/utils/i18n.tsx', 'electron/main/idioma.ts']);

// Una pasada por tipo de comilla. Ver el punto 1 de la cabecera.
const LITERALES = [
  /'((?:[^'\\\n]|\\.)+)'/g,
  /"((?:[^"\\\n]|\\.)+)"/g,
  /`((?:[^`\\$]|\\.)+)`/g,
];

const FICH_CODIGO = [
  ...globSync(`${RAIZ}/**/*.{ts,tsx}`, { cwd: '.' }),
  ...globSync('electron/**/*.ts', { cwd: '.' }),
];
const FICH_SCRIPTS = globSync('scripts/**/*.mjs', { cwd: '.' });
const FICH_DOCS = globSync('docs/**/*.{md,html}', { cwd: '.' });

/** Claves de un `const NOMBRE = { 'k': 'v', ... }`. */
function clavesDeFragmento(ruta, nombre) {
  const fuente = readFileSync(ruta, 'utf-8');
  const inicio = fuente.indexOf(`const ${nombre}`);
  if (inicio < 0) throw new Error(`no encuentro ${nombre} en ${ruta}`);
  const cuerpo = fuente.slice(inicio, fuente.indexOf('\n};', inicio));
  return new Set([...cuerpo.matchAll(/'((?:[^'\\]|\\.)*)':/g)].map((m) => m[1].replace(/\\'/g, "'")));
}

const ES = new Map();
for (const [fich, nombre] of [
  ['esComun', 'ES_COMUN'], ['esEditor', 'ES_EDITOR'],
  ['esAcciones', 'ES_ACCIONES'], ['esAjustes', 'ES_AJUSTES'],
]) {
  for (const k of clavesDeFragmento(`src/utils/idiomas/${fich}.ts`, nombre)) {
    if (!ES.has(k)) ES.set(k, `${fich}.ts`);
  }
}
const CAMPOS = new Set(
  [...readFileSync('src/utils/idiomas/campos.ts', 'utf-8').matchAll(/^\s{2}'((?:[^'\\]|\\.)*)':/gm)]
    .map((m) => m[1].replace(/\\'/g, "'")),
);

// ── Referencias ──────────────────────────────────────────────────────────────
const ref = { codigo: new Set(), scripts: new Set(), docs: new Set() };
for (const [destino, ficheros] of [['codigo', FICH_CODIGO], ['scripts', FICH_SCRIPTS], ['docs', FICH_DOCS]]) {
  for (const ruta of ficheros) {
    if (NO_ES_REFERENCIA.has(ruta.split('\\').join('/'))) continue;
    const fuente = readFileSync(ruta, 'utf-8');
    for (const re of LITERALES) {
      for (const m of fuente.matchAll(re)) {
        if (ES.has(m[1])) ref[destino].add(m[1]);
        if (CAMPOS.has(m[1])) ref[destino].add(m[1]);
      }
    }
  }
}

// ── Las familias con `${}`, contra su fuente de datos ────────────────────────
//
// Cada una devuelve el conjunto de claves que la aplicación puede pedir de
// verdad. Resolverlas —en vez de eximir el prefijo entero— es lo que permite
// que un preset o un paso borrado dejen una clave que se cuenta como muerta.
// Recorta un objeto desde `desde` hasta su cierre `\n};`, que es como lo hace
// `check-i18n.mjs`. Una ventana de N caracteres no vale: se comió el final de
// WX_GLYPH y dejó `wx.99` fuera, que es justo lo que caza el autotest de abajo.
function bloqueDe(ruta, desde) {
  const fuente = readFileSync(ruta, 'utf-8');
  const inicio = fuente.indexOf(desde);
  if (inicio < 0) throw new Error(`no encuentro '${desde}' en ${ruta}`);
  // Objeto (`};`), array (`];`) o array con `as const` (`] as const;`).
  const cierres = ['\n};', '\n];', '\n] as const;', '\n]'].map((c) => fuente.indexOf(c, inicio)).filter((i) => i > inicio);
  if (!cierres.length) throw new Error(`no encuentro el cierre de '${desde}' en ${ruta}`);
  return fuente.slice(inicio, Math.min(...cierres));
}
function idsDe(ruta, desde) {
  return [...bloqueDe(ruta, desde).matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const FAMILIAS = [
  // t(`wp.name.${w.id}`) — ids de WALLPAPERS, en WallpaperB.tsx
  { nombre: 'wp.name.*', de: 'WALLPAPERS (WallpaperB.tsx)', claves: idsDe('src/screens/WallpaperB.tsx', 'WALLPAPERS').map((id) => `wp.name.${id}`) },
  // t(`rgb.preset.${p.id}`) y clavePreset(id) — RGB_PRESET_IDS, en data/rgbPresets.ts
  { nombre: 'rgb.preset.*', de: 'RGB_PRESET_IDS (data/rgbPresets.ts)', claves: idsDe('src/data/rgbPresets.ts', 'const RGB_PRESET_IDS').map((id) => `rgb.preset.${id}`) },
];
// Las de abajo se anaden con push porque su resolucion necesita mas codigo, y
// empujar dentro del literal que se esta inicializando seria un ReferenceError.
{
  // t(`cat.${cat}`) — categorías de PRESETS, en actionData.ts. Se leen todas
  // las `category:` del fichero, no las que caen en los primeros 1600
  // caracteres: con la ventana se perdían MEDIA, SISTEMA, CREATIVO y RGB, que
  // salían como muertas.
  const cats = [...new Set([...readFileSync('src/screens/editor/actionData.ts', 'utf-8').matchAll(/category:\s*'([^']+)'/g)].map((m) => m[1]))];
  FAMILIAS.push({ nombre: 'cat.*', de: 'category: de PRESETS (editor/actionData.ts)', claves: cats.map((c) => `cat.${c}`) });
}
// t(`settings.language.${opt}`) — el array de la fila, en PanelAjustes.tsx
FAMILIAS.push({
  nombre: 'settings.language.*',
  de: "['system', 'es', 'en'] (settings/PanelAjustes.tsx)",
  claves: ['system', 'es', 'en'].map((c) => `settings.language.${c}`),
});
// t(`onb.${n}.title|body|hint`) — n es `step + 1` y step va de 0 a
// STEP_COUNT-1, o sea n va de **1 a STEP_COUNT**, con el último incluido.
// Hayendo del +1, `onb.7.*` salía como muerta cuando es el paso de ayuda.
{
  const total = Number(/STEP_COUNT\s*=\s*(\d+)/.exec(readFileSync('src/components/Onboarding.tsx', 'utf-8'))?.[1] ?? 0);
  FAMILIAS.push({
    nombre: 'onb.*',
    de: 'step + 1, de 1 a STEP_COUNT (components/Onboarding.tsx)',
    claves: Array.from({ length: total }, (_, i) => i + 1).flatMap((n) => ['title', 'body', 'hint'].map((s) => `onb.${n}.${s}`)),
  });
}
// t(`wx.${c}`) — el código viene de la API del tiempo, pero `codigoConocido()`
// lo recorta a lo que hay en WX_GLYPH (o a su decena), así que **sí** es
// resoluble: los códigos son de una API externa, pero los que llegan aquí
// están escritos en el repo. Sin esta familia, las 23 claves `wx.*` salían
// como muertas cuando todas están vivas.
{
  // Sin anclar con `^`: las claves van varias por línea (`0: '…', 1: '…',`) y
  // anclado solo se cogía la primera de cada una, dejando 16 códigos fuera.
  const codigos = [...bloqueDe('src/components/WeatherWidget.tsx', 'const WX_GLYPH').matchAll(/(\d+)\s*:/g)].map((m) => Number(m[1]));
  const conDecena = [...new Set([...codigos, ...codigos.map((c) => Math.floor(c / 10) * 10)])];
  FAMILIAS.push({ nombre: 'wx.*', de: 'WX_GLYPH, y su decena (components/WeatherWidget.tsx)', claves: conDecena.map((c) => `wx.${c}`) });
}
const DINAMICAS = new Set(FAMILIAS.flatMap((f) => f.claves));


// ── Autotest ─────────────────────────────────────────────────────────────────
//
// Un detector que dice «0 claves muertas» sin más es indistinguible de uno que
// ha dejado de ver el código entero: en la primera versión de este script
// déclaraba 0 mientras se le escapaban `onb.1.title` y `settings.language.es`,
// que se piden con `${}` y están vivas. Así que antes de imprimir nada, se
// comprueba que sigue encontrando claves que se sabe que se usan. Si alguna
// falta, el veredicto no vale y el script lo dice en mayúsculas.
const DEBEN_VERSE = [
  ['act.err.script', 'pulsarBoton.ts, literal'],
  ['settings.language', 'settings/PanelAjustes.tsx, literal'],
  ['onb.step', 'components/Onboarding.tsx, literal'],
  ['media.playing', 'main/BarraLateral.tsx, literal'],
  ['gal.load', 'tienda/ContenidoTienda.tsx, literal'],
  ['wp.name.solid', 'familia wp.name.*'],
  ['wp.name.grid-blue', 'familia wp.name.*, ultimo fondo'],
  ['rgb.preset.off', 'familia rgb.preset.*'],
  ['rgb.preset.alert-red', 'familia rgb.preset.*, ultimo preset'],
  ['cat.APPS', 'familia cat.*'],
  ['cat.RGB', 'familia cat.*, ultima categoria'],
  ['settings.language.es', 'familia settings.language.*'],
  ['settings.language.en', 'familia settings.language.*, ultimo'],
  ['onb.1.title', 'familia onb.*'],
  ['onb.7.title', 'familia onb.*, ULTIMO paso (n = step + 1)'],
  ['wx.0', 'familia wx.*'],
  ['wx.99', 'familia wx.*, ultimo codigo'],
];
const noLasVe = DEBEN_VERSE.filter(([k]) => !ref.codigo.has(k) && !DINAMICAS.has(k));
if (noLasVe.length) {
  console.error('\nEL DETECTOR ESTA ROTO — su recuento de claves muertas NO vale:\n');
  for (const [k, de] of noLasVe) console.error(`  · no encuentra '${k}' (${de})`);
  console.error('\nSuele ser un fichero que cambio de sitio, un glob que dejo de casar o una');
  console.error('familia con ${} que hay que volver a resolver aqui. No se arregla en el');
  console.error('diccionario: se arregla en este script.\n');
  process.exit(2);
}
console.log(`autotest: ok — encuentra las ${DEBEN_VERSE.length} claves de control`);

// ── Informe ──────────────────────────────────────────────────────────────────
const sinUso = [...ES.keys()].filter((k) => !ref.codigo.has(k) && !DINAMICAS.has(k) && !ref.scripts.has(k) && !ref.docs.has(k));
const soloDocs = [...ES.keys()].filter((k) => !ref.codigo.has(k) && !DINAMICAS.has(k) && !ref.scripts.has(k) && ref.docs.has(k));
const camposSinUso = [...CAMPOS].filter((k) => !ref.codigo.has(k) && !ref.scripts.has(k));

const porFamilia = FAMILIAS.map((f) => {
  const prefijo = f.nombre.replace('*', '');
  // Solo las que no se piden de forma literal: `onb.step` empieza por `onb.`
  // pero se llama con `t('onb.step')`, y no es una clave de la familia.
  const huerfanas = [...ES.keys()].filter((k) => k.startsWith(prefijo) && !f.claves.includes(k) && !ref.codigo.has(k));
  return `  ${f.nombre.padEnd(22)} ${String(f.claves.length).padStart(3)} claves posibles segun ${f.de} — ${huerfanas.length} huerfanas${huerfanas.length ? ': ' + huerfanas.join(', ') : ''}`;
});

console.log(`i18n-muertas: ${ES.size} claves ES/EN, ${CAMPOS.size} textos de campo`);
console.log(`  referencias: ${ref.codigo.size} en código, ${ref.scripts.size} en scripts, ${ref.docs.size} en docs`);
console.log('\nclaves ES/EN sin ninguna llamada:');
if (sinUso.length === 0) console.log('  ninguna');
else for (const k of sinUso) console.log(`  ${k}  (${ES.get(k)})`);

console.log('\nclaves ES/EN que solo aparecen en docs (no se consideran muertas):');
if (soloDocs.length === 0) console.log('  ninguna');
else for (const k of soloDocs) console.log(`  ${k}`);

console.log('\ntextos de campo sin ningún tf():');
if (camposSinUso.length === 0) console.log('  ninguno');
else for (const k of camposSinUso) console.log(`  ${k}`);

console.log('\nclaves con ${}, contra su fuente de datos:');
for (const l of porFamilia) console.log(l);

console.log('\nEste script informa, no falla: se ejecuta a mano cuando se tocan los diccionarios.');
