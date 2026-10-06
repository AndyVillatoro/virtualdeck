// Cada campo de boton tiene que llegar a las cinco superficies.
//
// `docs/PARIDAD.md` es la matriz hecha a mano: varias veces una superficie se
// quedo atras sin que nada avisara, y nada mantenia ese documento al dia.
// Aqui se cruzan dos listas: las propiedades de primer nivel de
// `ButtonConfig` (leidas con la API del compilador de TypeScript, no con una
// expresion regular) y lo que declara `scripts/paridad.json` para cada grupo
// (`pantallas`, `movil`, `dock`). Anadir un campo a `ButtonConfig` sin decidir
// su paridad rompe este guardian, que es justo lo que se quiere.
//
// El guardian busca olvidos, no prueba que funcione: un `si` solo exige que
// el nombre del campo aparezca como acceso de propiedad en algun archivo del
// grupo. Cuando una superficie lo consume a traves de un ayudante que vive
// fuera de su lista (`fijo` via `botonesFijos.ts` en el dock; `actions` via
// `pulsarBoton.ts` en el movil, que dispara por App tras `/api/press`), la
// entrada lo declara con `via: { grupo: [rutas] }` y esos archivos se suman a
// la busqueda de ese campo. Asi queda `si` y sigue verificado, en vez de un
// `no-aplica` que diria algo falso. `no-aplica` es solo para lo que de verdad
// no tiene sentido en esa superficie (perillas en una pantalla, disparos de
// fondo a nivel de app), y `hueco` para lo que falta; los dos llevan `nota`.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const CONFIG = 'src/types/config.ts';
const MATRIZ = 'scripts/paridad.json';
const GRUPOS = ['pantallas', 'movil', 'dock'];

const errores = [];
const avisos = [];

// ── archivos de cada grupo (los de T-PAR-04, literales) ─────────────────────
function paseo(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const f of readdirSync(dir)) {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) paseo(ruta, acc);
    else if (/\.tsx?$/.test(f)) acc.push(ruta);
  }
  return acc;
}

const ARCHIVOS = {
  pantallas: [
    'src/components/ButtonCell.tsx',
    ...paseo('src/components/celda'),
    ...paseo('src/components/rejilla'),
    'src/screens/main/CeldaPrincipal.tsx',
    'src/screens/FullscreenB.tsx',
    'src/screens/FloatingBarB.tsx',
    'src/utils/pulsarBoton.ts',
    'src/utils/estadoSistema.ts',
    'src/utils/botonesFijos.ts',
    ...paseo('src/comun'),
  ],
  movil: [
    'electron/main/iconosMando.ts',
    'electron/main/paginaMando.ts',
    'electron/main/mandoVivo.ts',
    'electron/main/servidorLocal.ts',
    ...paseo('src/comun'),
  ],
  dock: [
    ...paseo('src/utils/superficies'),
    'src/components/celda/iconoSvg.tsx',
    'src/utils/pulsarBoton.ts',
    ...paseo('src/comun'),
  ],
};

// ── las propiedades de primer nivel de ButtonConfig ─────────────────────────
function camposDeButtonConfig() {
  const fuente = readFileSync(CONFIG, 'utf-8');
  const ast = ts.createSourceFile(CONFIG, fuente, ts.ScriptTarget.Latest, true);
  const campos = [];
  ts.forEachChild(ast, (nodo) => {
    if (!ts.isInterfaceDeclaration(nodo) || nodo.name.text !== 'ButtonConfig') return;
    for (const miembro of nodo.members) {
      if (ts.isPropertySignature(miembro) && miembro.name && ts.isIdentifier(miembro.name)) {
        campos.push(miembro.name.text);
      }
    }
  });
  if (campos.length === 0) errores.push(`${CONFIG}: no pude leer ButtonConfig con la API de TypeScript`);
  return campos;
}

// ── accesos de propiedad que cuentan como evidencia ─────────────────────────
function patronesDe(campo) {
  return ['.' + campo, campo + ':', campo + ',', '{ ' + campo, '{' + campo, `'${campo}'`, `"${campo}"`];
}

const textos = {};
function textoDe(grupo) {
  if (!textos[grupo]) {
    textos[grupo] = [];
    for (const ruta of ARCHIVOS[grupo]) {
      if (!existsSync(ruta)) {
        errores.push(`${ruta} (grupo ${grupo}) no existe — la lista de archivos del guardian esta desactualizada`);
        continue;
      }
      textos[grupo].push(readFileSync(ruta, 'utf-8'));
    }
  }
  return textos[grupo];
}

function textosVia(rutas) {
  const acc = [];
  for (const ruta of rutas) {
    if (!existsSync(ruta)) errores.push(`${ruta} (via) no existe`);
    else acc.push(readFileSync(ruta, 'utf-8'));
  }
  return acc;
}

function mencionadoEn(campo, grupo, via) {
  const patrones = patronesDe(campo);
  return [...textoDe(grupo), ...textosVia(via)].some((fuente) => patrones.some((p) => fuente.includes(p)));
}

function revisarVia(campo, entrada) {
  if (entrada.via === undefined) return;
  if (typeof entrada.via !== 'object' || entrada.via === null) {
    errores.push(`'${campo}': via tiene que ser { grupo: [rutas] }`);
    return;
  }
  for (const [grupo, rutas] of Object.entries(entrada.via)) {
    if (!GRUPOS.includes(grupo)) errores.push(`'${campo}': via nombra '${grupo}', que no es un grupo`);
    else if (!Array.isArray(rutas) || rutas.length === 0) errores.push(`'${campo}': via.${grupo} tiene que ser una lista de rutas`);
    else if (entrada[grupo] !== 'si') errores.push(`'${campo}': via.${grupo} solo tiene sentido con 'si'`);
  }
}

// ── la matriz declarada ─────────────────────────────────────────────────────
let matriz;
try {
  matriz = JSON.parse(readFileSync(MATRIZ, 'utf-8'));
} catch (e) {
  console.error(`paridad: no se pudo leer ${MATRIZ} — ${e.message}`);
  process.exit(1);
}

const campos = camposDeButtonConfig();

for (const campo of campos) {
  const entrada = matriz[campo];
  if (!entrada || typeof entrada !== 'object') {
    errores.push(`'${campo}' esta en ButtonConfig y no tiene entrada en paridad.json — hay que decidir su paridad`);
    continue;
  }
  for (const grupo of GRUPOS) {
    const valor = entrada[grupo];
    if (valor === undefined) {
      errores.push(`'${campo}' no trae valor para el grupo '${grupo}'`);
    } else if (valor !== 'si' && valor !== 'no-aplica' && valor !== 'hueco') {
      errores.push(`'${campo}' en '${grupo}' vale '${valor}' — solo vale si, no-aplica o hueco`);
    } else if (valor === 'si' && !mencionadoEn(campo, grupo, entrada.via?.[grupo] ?? [])) {
      errores.push(`'${campo}' dice si en '${grupo}' y el nombre no aparece en ninguno de sus archivos — o falta implementarlo o la entrada miente`);
    } else if (valor !== 'si' && typeof entrada.nota !== 'string') {
      errores.push(`'${campo}' es '${valor}' en '${grupo}' y no trae nota — hay que decir por que`);
    }
    if (valor === 'hueco') avisos.push(`'${campo}' en '${grupo}' es hueco — ${entrada.nota ?? 'sin nota'}`);
  }
  revisarVia(campo, entrada);
  for (const clave of Object.keys(entrada)) {
    if (clave !== 'nota' && clave !== 'via' && !GRUPOS.includes(clave)) errores.push(`'${campo}' trae la clave '${clave}', que no es un grupo (pantallas, movil, dock) ni nota ni via`);
  }
}
for (const campo of Object.keys(matriz)) {
  if (!campos.includes(campo)) errores.push(`'${campo}' esta en paridad.json y ya no existe en ButtonConfig`);
}

if (errores.length) {
  console.error(`paridad: ${errores.length} problema(s)\n`);
  for (const p of errores) console.error('  · ' + p);
  process.exit(1);
}
for (const a of avisos) console.log(`aviso paridad: ${a}`);

const enLasTres = campos.filter((c) => GRUPOS.every((g) => matriz[c][g] === 'si')).length;
let noAplica = 0;
for (const c of campos) for (const g of GRUPOS) if (matriz[c][g] === 'no-aplica') noAplica++;
console.log(`paridad: ok — ${campos.length} campos, ${enLasTres} en las tres, ${noAplica} no aplica, ${avisos.length} huecos`);
