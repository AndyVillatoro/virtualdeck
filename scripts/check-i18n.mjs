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
// El proceso principal tambien enseña texto —el menu de la bandeja, los
// titulos de los dialogos— y era un punto ciego: la auditoria solo miraba
// `src/`, asi que la bandeja seguia en español con la interfaz en ingles.
// Su diccionario es `electron/main/idioma.ts`, con su propia funcion `tm`.
const RAIZ_MAIN = 'electron/main';
const IDIOMA_MAIN = 'electron/main/idioma.ts';
// Los tres diccionarios viven cada uno en su archivo desde que `i18n.tsx`
// paso de las mil lineas. `I18N` sigue siendo el modulo que **no** se audita
// como codigo de interfaz (sus literales son el diccionario en si).
const I18N = 'src/utils/i18n.tsx';
const DICCIONARIOS = {
  'ES: Dict': 'src/utils/idiomas/es.ts',
  'EN: Dict': 'src/utils/idiomas/en.ts',
  'FIELDS_EN': 'src/utils/idiomas/campos.ts',
};

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
function clavesDe(nombre) {
  const ruta = DICCIONARIOS[nombre];
  const fuente = readFileSync(ruta, 'utf-8');
  const inicio = fuente.indexOf(`const ${nombre}`);
  if (inicio < 0) throw new Error(`no encuentro ${nombre} en ${ruta}`);
  const fin = fuente.indexOf('\n};', inicio);
  const cuerpo = fuente.slice(inicio, fin);
  const claves = new Map();
  for (const m of cuerpo.matchAll(/'((?:[^'\\]|\\.)*)':/g)) {
    const clave = m[1].replace(/\\'/g, "'");
    claves.set(clave, (claves.get(clave) ?? 0) + 1);
  }
  return claves;
}

const ES = clavesDe('ES: Dict');
const EN = clavesDe('EN: Dict');
const CAMPOS = clavesDe('FIELDS_EN');

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
for (const ruta of [...archivos(RAIZ), ...archivos(RAIZ_MAIN)]) {
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
  // Encontradas mirando la aplicacion en ingles, no leyendo el codigo: la
  // heuristica las daba por buenas porque no llevan acento ni van acompanadas
  // de dos palabras funcionales.
  'rango', 'probar', 'probando', 'celdas', 'casillas', 'tecla', 'teclas',
  'aplicar', 'preset', 'elegir', 'clic', 'arrastrar',
  'salir', 'entrar', 'kiosko', 'activar', 'desactivar', 'conectar',
  'descargar', 'descarga', 'pudo', 'error de', 'importar', 'importacion',
  'secuencia', 'acciones', 'accion', 'opcional', 'funciona', 'atajos',
  'copiar', 'reordenar', 'seleccionados', 'vaciar', 'botones',
  'ratón', 'raton', 'combinación', 'texto', 'reproduciendo', 'pausado',
  'sólido', 'solido', 'vacío', 'vacio',
  // Los dos botones del grabador de macros. El patrón `>texto<` sí los veía;
  // lo que fallaba es esta lista: «GRABAR» y «DETENER» son una sola palabra,
  // sin acento, y la heurística las daba por buenas.
  'grabar', 'grabando', 'detener', 'detenido', 'reproducir', 'pasos', 'paso',
  // Los tres estados del boton de LibreHardwareMonitor, del mismo barrido.
  'iniciar', 'iniciando', 'activo', 'salida',
]);

// Los dos archivos de datos sembrados. Lo que hay aqui en espanol se **copia
// dentro** del boton que crea el usuario: traducirlo en caliente le cambiaria
// etiquetas que ya guardo.
//
// Al principio la comprobacion se salteaba todos los `.ts` por este motivo, y
// asi se colo el rotulo de deshacer de `useDeck.ts`, que si es interfaz viva.
const DATOS_SEMBRADOS = new Set([
  'src/screens/editor/actionData.ts',
  'src/data/brandIcons.ts',
]);

const PERMITIDOS = new Set([
  'VirtualDeck',
  // `color` es igual en los dos idiomas. En minuscula ademas casi siempre es
  // CSS (`transition: 'color 0.15s'`, `<input type="color">`), no un texto.
  'COLOR', 'Color', 'color', 'color 0.15s',
]);

function pareceEspanol(s) {
  const limpio = s.trim();
  if (limpio.length < 3 || PERMITIDOS.has(limpio)) return false;
  if (/^[\s\d\W]*$/.test(limpio)) return false;          // solo símbolos o números
  if (/^(https?:|[A-Za-z]:[\\/]|\.{0,2}\/)/.test(limpio)) return false;  // URL o ruta
  // Una clave de diccionario no es texto: `rgb.preset.${id}` es con lo que se
  // busca la traducción, no la traducción.
  if (/^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9${}_-]+)+$/.test(limpio)) return false;
  // Una expresión regular no es idioma aunque lleve palabras en español: son
  // precisamente las que tiene que reconocer. `media.ts` casa así los títulos
  // de pestaña del navegador («y 3 páginas más»).
  if (/^\(\?[:=!]/.test(limpio) || /\\d\+/.test(limpio)) return false;
  // Operadores: es código, no idioma. La `y` de «y» es además un nombre de
  // variable de lo más normal, y por su culpa se marcaba como texto en español
  // el trozo `= b.y && y` de una comprobación de coordenadas.
  if (/(&&|\|\||[<>!=]=|\+\+|=>|\?\?)/.test(limpio)) return false;
  if (ACENTOS.test(limpio)) return true;
  // Frases cortas: basta una palabra inequívoca.
  // Se parte tambien por `:` y `;`: sin ellos «Rango: 75%» daba la palabra
  // «rango:», que no esta en la lista, y el texto pasaba.
  const palabras = limpio.split(/[\s·/,.;:…]+/).filter(Boolean);
  if (palabras.length <= 4 && palabras.some((p) => PALABRAS_SUELTAS.has(p.toLowerCase()))) return true;
  return (limpio.match(PALABRAS_ES) ?? []).length >= 2;
}

for (const ruta of [...archivos(RAIZ), ...archivos(RAIZ_MAIN)]) {
  const rel = ruta.split(sep).join('/');
  const esMain = rel.startsWith(RAIZ_MAIN);
  let enConsola = false;
  let enComentario = false;
  if (rel === I18N || rel === IDIOMA_MAIN || Object.values(DICCIONARIOS).includes(rel)) continue;
  // Se parte por `\r?\n`, no por `\n`: los archivos del repo están en CRLF, y
  // partiendo solo por `\n` cada línea queda terminada en `\r`. Eso rompe el
  // recorte de comentarios —el `$` de `/\/\/.*$/` no cruza el `\r`— así que las
  // líneas con comentario al final se analizaban con el comentario incluido.
  // Daba falsos positivos y, peor, falsos negativos.
  for (const [i, linea] of readFileSync(ruta, 'utf-8').split(/\r?\n/).entries()) {
    // En el proceso principal, fuera lo que va a la consola: ese texto es para
    // quien depura, no para el usuario, y esta bien en el idioma del autor.
    // Sin esto la comprobacion saca veinte avisos de `console.error` y el
    // ruido tapa los tres o cuatro que si se ven en pantalla.
    if (esMain) {
      // Una llamada a consola puede ocupar varias lineas; el mensaje suele ir
      // en la segunda. Se sigue saltando hasta que la llamada cierra.
      if (enConsola) {
        if (/\);\s*$/.test(linea)) enConsola = false;
        continue;
      }
      if (/console\.(log|warn|error|info|debug)\s*\(/.test(linea)) {
        if (!/\);\s*$/.test(linea)) enConsola = true;
        continue;
      }
      // Lineas de los scripts de PowerShell que se generan aqui dentro: sus
      // comentarios y su `Write-Output` no son interfaz, son el protocolo por
      // el que el script le habla al proceso principal.
      if (/^\s*#/.test(linea) || /Write-(Output|Host|Error)/.test(linea)) continue;
    }
    // Un comentario de bloque o de JSX repartido en varias lineas: se salta
    // entero. Antes solo se quitaban los que cabian en una linea, asi que los
    // comentarios largos —que en este repo son casi todos, y en español— se
    // reportaban como interfaz sin traducir.
    if (enComentario) {
      if (/\*\//.test(linea)) enComentario = false;
      continue;
    }
    if (/(\{\s*)?\/\*/.test(linea) && !/\*\//.test(linea)) {
      enComentario = true;
      continue;
    }
    // Fuera los comentarios: los de linea, los de bloque y los de JSX
    // (`{/* ... */}`), que no son `//` y colaban su texto como si fuera
    // interfaz.
    const codigo = linea
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/, '');
    if (!codigo.trim() || codigo.trimStart().startsWith('*')) continue;
    const sospechas = [];
    for (const m of codigo.matchAll(/(?:label|title|placeholder|alt)=(['"])([^'"]{3,})\1/g)) sospechas.push(m[2]);
    for (const m of codigo.matchAll(/>([^<>{}\n]{3,})</g)) sospechas.push(m[1]);
    // Texto JSX que ocupa su propia línea: la etiqueta que lo abre está arriba
    // y la que lo cierra abajo, así que el patrón `>texto<` no lo ve. Se
    // colaron así "DISPARADORES EXTERNOS" y la ayuda del grupo radio, con la
    // auditoría en verde.
    // Literales de cadena sueltos, dentro de una expresion: los ternarios
    // (`x ? 'SI' : 'NO'`), los `??` y los mapas de objeto. Ninguno de los tres
    // patrones de arriba los ve —no son atributos ni texto entre etiquetas— y
    // por ahi se colaron los avisos de sensores, los modos de casilla, los
    // estados de RGB y las etiquetas del grabador de macros: veinte textos
    // visibles, con la auditoria en verde.
    //
    // Solo en `.tsx`. En `.ts` los literales en español que quedan son datos
    // sembrados (`actionData`, `brandIcons`): se copian dentro del boton que
    // crea el usuario, y traducirlos en caliente le cambiaria las etiquetas
    // que el ya guardo.
    if (!DATOS_SEMBRADOS.has(ruta.split(sep).join('/'))) {
      // Fuera lo que ya pasa por el traductor, para no marcarlo.
      const resto = codigo.replace(/\b(t|tf)\((['"`])(?:\.|(?!\2).)*?\2/g, '');
      for (const m of resto.matchAll(/(['"`])((?:\.|(?!\1)[^\n]){3,}?)\1/g)) sospechas.push(m[2]);
    }

    // Se quitan las etiquetas de por medio antes de mirar la linea suelta: un
    // parrafo con un `<strong>` dentro tiene `<` y `>`, y el filtro de abajo lo
    // descartaba entero. Asi se colo el aviso de LHM de la seccion de sensores.
    // Texto que acompaña a una expresión en la misma línea: `{n} SELECCIONADOS`.
    // El patrón de «línea suelta» lo descarta por llevar llaves, y el de
    // `>texto<` no lo ve porque la etiqueta no está en esa línea. Asi se colo
    // el rotulo de la barra de seleccion multiple.
    for (const m of codigo.matchAll(/\}\s*([^<>{}\n]{3,})(?=$|<)/g)) {
      const trozo = m[1].trim();
      // Sin puntuación de código: detrás de un `}` hay tanto texto de interfaz
      // como destructuring, imports y arrays de dependencias.
      if (/[;=,'"`()[\]]/.test(trozo)) continue;
      if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(trozo)) continue;
      sospechas.push(trozo);
    }

    const suelto = codigo.replace(/<\/?[A-Za-z][^<>]*>/g, ' ').trim();
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
