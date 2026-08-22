// Comprueba que todo tipo de acción tenga quien lo ejecute.
//
// Antes `executeAction` era un `switch` que terminaba en `default: return OK`.
// Eso significa que añadir un tipo a `ActionType` y olvidar implementarlo
// producía un botón que **no hacía nada y decía que había ido bien**: sin
// error, sin aviso, sin nada que mirar. Es el peor fallo posible en una
// aplicación cuyo único trabajo es ejecutar lo que le pides.
//
// Ahora hay un mapa de manejadores, así que la ausencia se puede detectar —
// pero solo si alguien la busca. Eso es este archivo, y por eso lo corre
// `npm run check`.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const TIPOS = 'src/types.ts';
const DIR = 'src/utils/acciones';
const FORMULARIOS = 'src/screens/editor/formularios/index.tsx';

// ── tipos declarados ──────────────────────────────────────────────────────
const fuenteTipos = readFileSync(TIPOS, 'utf-8');
const bloque = fuenteTipos.slice(
  fuenteTipos.indexOf('export type ActionType ='),
  fuenteTipos.indexOf(';', fuenteTipos.indexOf('export type ActionType =')),
);
const declarados = new Set([...bloque.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));

// ── tipos con manejador ───────────────────────────────────────────────────
const implementados = new Set();
for (const archivo of readdirSync(DIR)) {
  if (!archivo.endsWith('.ts') || archivo === 'base.ts' || archivo === 'index.ts') continue;
  const fuente = readFileSync(join(DIR, archivo), 'utf-8');
  // Claves del objeto: `'tipo': async (...)` o `'tipo': ({...})`
  for (const m of fuente.matchAll(/^\s{2}'([a-z-]+)':\s*(?:async\s*)?\(/gm)) implementados.add(m[1]);
  // Los que se registran en bucle: `for (const tipo of ['a', 'b'])` y
  // `const TABLA = { 'a': ..., }` seguido de un for que asigna.
  for (const m of fuente.matchAll(/^\s{2}'([a-z-]+)':\s*'[a-z-]+',$/gm)) implementados.add(m[1]);
  for (const m of fuente.matchAll(/for \(const tipo of \[([^\]]+)\]\)/g)) {
    for (const t of m[1].matchAll(/'([a-z-]+)'/g)) implementados.add(t[1]);
  }
}

// ── tipos que resuelve quien llama ────────────────────────────────────────
const fuenteIndex = readFileSync(join(DIR, 'index.ts'), 'utf-8');
const listaLlamador = fuenteIndex.slice(
  fuenteIndex.indexOf('RESUELTAS_POR_EL_LLAMADOR'),
  fuenteIndex.indexOf(']', fuenteIndex.indexOf('RESUELTAS_POR_EL_LLAMADOR')),
);
const porElLlamador = new Set([...listaLlamador.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]));

const problemas = [];

for (const tipo of declarados) {
  if (!implementados.has(tipo) && !porElLlamador.has(tipo)) {
    problemas.push(`'${tipo}' está en ActionType y nadie lo ejecuta — el botón no haría nada`);
  }
  if (implementados.has(tipo) && porElLlamador.has(tipo)) {
    problemas.push(`'${tipo}' tiene manejador Y está en RESUELTAS_POR_EL_LLAMADOR — uno de los dos sobra`);
  }
}
for (const tipo of implementados) {
  if (!declarados.has(tipo)) problemas.push(`'${tipo}' tiene manejador pero no está en ActionType`);
}
for (const tipo of porElLlamador) {
  if (!declarados.has(tipo)) problemas.push(`'${tipo}' está en RESUELTAS_POR_EL_LLAMADOR pero no en ActionType`);
}

// Que el tipo se ejecute no basta: hay que poder configurarlo.
//
// `media-shuffle` y `media-repeat` estaban en el selector de acciones, y
// `rgb-preset` en el de sub-acciones, los tres sin entrada en FORMULARIOS. El
// paso 2 del editor salia en blanco: la accion se elegia y no habia con que
// ajustarla. Ninguna de las otras comprobaciones lo veia, porque los tres
// tenian manejador y hacian su trabajo al pulsar.
const fuenteForm = readFileSync(FORMULARIOS, 'utf-8');
const conFormulario = new Set(
  [...fuenteForm.slice(fuenteForm.indexOf('FORMULARIOS')).matchAll(/^  '([a-z-]+)':/gm)].map((m) => m[1]),
);
for (const tipo of declarados) {
  if (!conFormulario.has(tipo)) {
    problemas.push(`'${tipo}' no tiene entrada en FORMULARIOS — el paso 2 del editor saldría vacío`);
  }
}
for (const tipo of conFormulario) {
  if (!declarados.has(tipo)) problemas.push(`'${tipo}' tiene formulario pero no está en ActionType`);
}

if (problemas.length) {
  console.error(`acciones: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(
  `acciones: ok — ${declarados.size} tipos, ${implementados.size} con manejador, ` +
  `${porElLlamador.size} los resuelve quien llama, ${conFormulario.size} con formulario`,
);
