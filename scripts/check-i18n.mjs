// Auditoría de i18n. Falla el build si la interfaz se puede quedar en español
// aunque el usuario haya elegido inglés.
//
// Existe porque los dos mecanismos de traducción fallan en silencio:
//
//   · `t('clave')` cae a la clave literal si no está en el diccionario, así que
//     un typo se ve como `ed.step.acton` en pantalla, no como un error.
//   · `tf('Texto en español')` cae al propio español si no está en FIELDS_EN.
//     En inglés eso no se distingue de "aún no traducido": no rompe nada, no
//     avisa, y solo se nota si alguien mira esa pantalla concreta en inglés.
//
// Ninguno de los dos lo detecta TypeScript ni el build. Por eso se comprueba
// aquí, y por eso `npm run check` lo ejecuta.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const RAIZ = 'src';
const I18N = 'src/utils/i18n.tsx';

function archivos(dir) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (['.ts', '.tsx'].includes(extname(ruta))) salida.push(ruta);
  }
  return salida;
}

/** Extrae las claves de un objeto literal `const NOMBRE ... = { 'k': 'v', ... }`. */
function clavesDe(fuente, nombre) {
  const inicio = fuente.indexOf(`const ${nombre}`);
  if (inicio < 0) throw new Error(`no encuentro ${nombre} en ${I18N}`);
  const fin = fuente.indexOf('\n};', inicio);
  const cuerpo = fuente.slice(inicio, fin);
  const claves = new Map();
  for (const m of cuerpo.matchAll(/'((?:[^'\\]|\\.)*)':/g)) {
    const clave = m[1].replace(/\\'/g, "'");
    claves.set(clave, (claves.get(clave) ?? 0) + 1);
  }
  return claves;
}

const fuenteI18n = readFileSync(I18N, 'utf-8');
const ES = clavesDe(fuenteI18n, 'ES: Dict');
const EN = clavesDe(fuenteI18n, 'EN: Dict');
const CAMPOS = clavesDe(fuenteI18n, 'FIELDS_EN');

const problemas = [];

// 1. Claves duplicadas: la segunda pisa a la primera sin avisar.
for (const [nombre, dicc] of [['ES', ES], ['EN', EN], ['FIELDS_EN', CAMPOS]]) {
  for (const [clave, veces] of dicc) {
    if (veces > 1) problemas.push(`${nombre}: '${clave}' está ${veces} veces (la última gana)`);
  }
}

// 2. Toda clave española debe existir en inglés, y al revés.
for (const clave of ES.keys()) {
  if (!EN.has(clave)) problemas.push(`EN: falta '${clave}' (existe en ES)`);
}
for (const clave of EN.keys()) {
  if (!ES.has(clave)) problemas.push(`ES: falta '${clave}' (existe en EN)`);
}

// 3. Cada t('...') / tf('...') del código debe tener entrada.
//    Solo literales: `t(variable)` no se puede comprobar aquí.
for (const ruta of archivos(RAIZ)) {
  if (ruta.replace(/\\/g, '/') === I18N) continue;
  const fuente = readFileSync(ruta, 'utf-8');
  for (const m of fuente.matchAll(/(?<![A-Za-z0-9_])t\(\s*'((?:[^'\\]|\\.)*)'/g)) {
    const clave = m[1].replace(/\\'/g, "'");
    if (!ES.has(clave)) problemas.push(`${ruta}: t('${clave}') no está en el diccionario ES`);
  }
  // La comilla de cierre tiene que ser la misma que la de apertura: si no, un
  // texto con comillas dentro (`... acciones "Incrementar variable" ...`) se
  // cortaría por la mitad y se reportaría como si faltara.
  for (const m of fuente.matchAll(/(?<![A-Za-z0-9_])tf\(\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
    const clave = m[2].replace(/\\(['"])/g, '$1');
    if (!CAMPOS.has(clave)) problemas.push(`${ruta}: tf('${clave}') no está en FIELDS_EN — se vería en español`);
  }
}

if (problemas.length) {
  console.error(`i18n: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(`i18n: ok — ES/EN ${ES.size} claves, FIELDS_EN ${CAMPOS.size} textos`);
