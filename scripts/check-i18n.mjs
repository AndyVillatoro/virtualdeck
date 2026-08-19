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
import { join, extname, sep } from 'node:path';

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

// 4. Texto visible en español que nunca pasó por t() ni tf().
//
// Este es el hueco que dejaron los tres primeros: comprueban que cada `t()` y
// cada `tf()` tenga traducción, y no dicen nada del texto que jamás se
// envolvió. Se coló así media interfaz —los mensajes de error de las acciones,
// los ajustes, los menús de página— y lo encontró el usuario, no el build.
//
// Es una heurística: marca lo que lleva acentos españoles o dos palabras
// funcionales seguidas. Lo que no sea idioma (rutas, atajos, marcas) va a
// PERMITIDOS, que es una lista corta y explícita a propósito: si crece mucho,
// probablemente la regla esté mal, no el código.
const PALABRAS_ES = /\b(el|la|los|las|de|del|con|para|por|sin|un|una|que|se|al|y|o|es|son|más|cada|todo|todos|desde|hasta|entre|sobre|clic|botón|página|archivo|nombre|nuevo|nueva|eliminar|guardar|abrir|cerrar|buscar|editar|copiar|pegar|borrar|mostrar|ocultar|activar|habilitado|sonido|ajustes|arrancar|arrastrar|renombrar|exportar|importar|agregar|añadir|seleccionar|configurar|reiniciar|actualizar)\b/gi;
const ACENTOS = /[áéíóúñÁÉÍÓÚÑ¿¡]/;

// Palabras que solas ya delatan el idioma. Hacen falta porque la regla de "dos
// palabras funcionales" no ve un botón que pone `FONDO` — y así se quedaron
// FONDO, CANCELAR, PUERTO, COLUMNAS y una docena más después de dar la
// traducción por terminada dos veces.
const PALABRAS_SUELTAS = new Set([
  'fondo', 'cancelar', 'aceptar', 'guardar', 'cargar', 'importar', 'exportar',
  'limpiar', 'rellenar', 'puerto', 'columnas', 'filas', 'repetir', 'veces',
  'unidades', 'pausa', 'ninguno', 'ninguna', 'izquierda', 'derecha', 'arriba',
  'abajo', 'centrar', 'volver', 'siguiente', 'anterior', 'cerrar', 'abrir',
  'quitar', 'añadir', 'agregar', 'editar', 'borrar', 'eliminar', 'duplicar',
  'buscar', 'mover', 'renombrar', 'perfiles', 'perfil', 'ajustes', 'tamaño',
  'color', 'idioma', 'tema', 'sonido', 'ayuda', 'acerca', 'sensores',
]);

const PERMITIDOS = new Set([
  'VirtualDeck',
  // `color` es igual en los dos idiomas.
  'COLOR', 'Color',
]);

function pareceEspanol(s) {
  const limpio = s.trim();
  if (limpio.length < 3 || PERMITIDOS.has(limpio)) return false;
  if (/^[\s\d\W]*$/.test(limpio)) return false;          // solo símbolos o números
  if (/^(https?:|[A-Za-z]:[\\/]|\.{0,2}\/)/.test(limpio)) return false;  // URL o ruta
  if (ACENTOS.test(limpio)) return true;
  // Frases cortas: basta una palabra inequívoca.
  const palabras = limpio.split(/[\s·/,.…]+/).filter(Boolean);
  if (palabras.length <= 4 && palabras.some((p) => PALABRAS_SUELTAS.has(p.toLowerCase()))) return true;
  return (limpio.match(PALABRAS_ES) ?? []).length >= 2;
}

for (const ruta of archivos(RAIZ)) {
  if (ruta.split(sep).join('/') === I18N) continue;
  for (const [i, linea] of readFileSync(ruta, 'utf-8').split('\n').entries()) {
    const codigo = linea.replace(/\/\/.*$/, '');
    if (!codigo.trim() || codigo.trimStart().startsWith('*')) continue;
    const sospechas = [];
    for (const m of codigo.matchAll(/(?:label|title|placeholder|alt)=(['"])([^'"]{3,})\1/g)) sospechas.push(m[2]);
    for (const m of codigo.matchAll(/>([^<>{}\n]{3,})</g)) sospechas.push(m[1]);
    // Texto JSX que ocupa su propia línea: la etiqueta que lo abre está arriba
    // y la que lo cierra abajo, así que el patrón `>texto<` no lo ve. Se
    // colaron así "DISPARADORES EXTERNOS" y la ayuda del grupo radio, con la
    // auditoría en verde.
    const suelto = codigo.trim();
    // Se excluye lo que acaba en coma: es una propiedad de objeto partida en
    // varias líneas (`color,`), no un texto de la interfaz.
    if (suelto.length >= 3 && !/[<>{}=;()[\]`'"]/.test(suelto) && !/[,]$/.test(suelto)
        && !/^(\/\/|\*|import|export)/.test(suelto)) {
      sospechas.push(suelto);
    }
    for (const s of sospechas) {
      if (pareceEspanol(s)) {
        problemas.push(`${ruta}:${i + 1}: "${s.trim().slice(0, 60)}" está en español y no pasa por t() ni tf()`);
      }
    }
  }
}

if (problemas.length) {
  console.error(`i18n: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(`i18n: ok — ES/EN ${ES.size} claves, FIELDS_EN ${CAMPOS.size} textos`);
