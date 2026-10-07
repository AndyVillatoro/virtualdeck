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

const TIPOS = 'src/types/actions.ts';
const DIR = 'src/utils/acciones';
const FORMULARIOS = 'src/screens/editor/formularios/index.tsx';
const PRESETS_RENDERER = 'src/data/rgbPresets.ts';
const PRESETS_MAIN = 'electron/main/rgb.ts';
const ACTION_DATA = 'src/screens/editor/actionData.ts';

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

// Y el paso **1**: el tipo tiene que poder elegirse.
//
// `rgb-preset` tenia manejador, formulario y doce botones sembrados, y no
// estaba en `ACTION_TYPES`: no se podia crear uno desde el editor, y al abrir
// uno que ya existia —de los presets, o llegado en un perfil de la galeria—
// el paso 1 salia **sin ningun tipo marcado**. Se vio abriendo la aplicacion,
// no compilando: las tres comprobaciones de arriba lo daban por bueno.
const fuenteSelector = readFileSync(ACTION_DATA, 'utf-8');
const enElSelector = new Set(
  [...fuenteSelector.slice(fuenteSelector.indexOf('ACTION_TYPES'))
    .matchAll(/\{ type: '([a-z-]+)',\s+label:/g)].map((m) => m[1]),
);
for (const tipo of declarados) {
  if (!enElSelector.has(tipo)) {
    problemas.push(`'${tipo}' no está en ACTION_TYPES — no se puede elegir en el paso 1 del editor`);
  }
}

// Y en una **familia**: el selector agrupa los tipos en fichas (Apps, Audio,
// Música...). Un tipo sin familia solo se encuentra en «TODAS» o buscando, y
// con 43 tipos eso es perderlo. `none` es la excepción: sale en todas.
const inicioTipos = fuenteSelector.indexOf('export const ACTION_TYPES');
const bloqueTipos = fuenteSelector.slice(inicioTipos, fuenteSelector.indexOf('\n];', inicioTipos));
for (const m of bloqueTipos.matchAll(/\{ type: '([a-z-]+)',[^\n]*\}/g)) {
  if (m[1] !== 'none' && !/familia: '[a-z]+'/.test(m[0])) {
    problemas.push(`'${m[1]}' no tiene familia en ACTION_TYPES — en el selector solo saldría en «TODAS»`);
  }
}

// Los presets RGB que ofrece el editor tienen que existir en el proceso
// principal. `applySmartPreset` devuelve false para un id desconocido: el
// boton no hace **nada** y no hay error en ninguna parte.
const fuenteRend = readFileSync(PRESETS_RENDERER, 'utf-8');
const idsRend = new Set(
  [...fuenteRend.slice(fuenteRend.indexOf('RGB_PRESET_IDS')).matchAll(/'([a-z-]+)'/g)].map((m) => m[1]),
);
const fuenteMainRgb = readFileSync(PRESETS_MAIN, 'utf-8');
const bloqueMain = fuenteMainRgb.slice(
  fuenteMainRgb.indexOf('const SMART_PRESETS'),
  fuenteMainRgb.indexOf('\n};', fuenteMainRgb.indexOf('const SMART_PRESETS')),
);
const idsMain = new Set(
  [...bloqueMain.matchAll(/^\s{2}'?([a-z-]+)'?:\s*\{/gm)].map((m) => m[1]),
);
for (const id of idsRend) {
  if (!idsMain.has(id)) problemas.push(`el preset RGB '${id}' esta en el editor y no en SMART_PRESETS — el boton no haria nada`);
}
for (const id of idsMain) {
  if (!idsRend.has(id)) problemas.push(`el preset RGB '${id}' existe en SMART_PRESETS y el editor no lo ofrece`);
}

// La lista de tipos válidos que usa el validador de configuraciones.
//
// Está escrita a mano y se quedó atrás: le faltaba `adjust`, con lo que un deck
// con botones ± de brillo o volumen —cuatro de los presets sembrados lo son— se
// rechazaba **entero** al importarlo, y en la carga se borraban esos botones.
// Un tipo nuevo no puede volver a olvidarse aquí.
{
  const fuenteMig = readFileSync('src/utils/configMigration.ts', 'utf-8');
  const bloque = fuenteMig.match(/const ACTION_TYPES = new Set\(\[([\s\S]*?)\]\);/);
  if (!bloque) {
    problemas.push('no encuentro ACTION_TYPES en configMigration.ts');
  } else {
    const validos = new Set([...bloque[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]));
    for (const tipo of declarados) {
      if (!validos.has(tipo)) {
        problemas.push(`'${tipo}' es un tipo de accion y falta en ACTION_TYPES — importar un deck que lo use se rechazaria entero`);
      }
    }
    for (const tipo of validos) {
      if (!declarados.has(tipo)) problemas.push(`'${tipo}' esta en ACTION_TYPES y ya no es un tipo de accion`);
    }
  }
}

// Los iconos sembrados (presets, carpetas, plantillas) tienen que resolverse
// a un glifo DOT 8×8.
//
// La celda dibuja `button.icon` con `DotGlyphIcon` solo si `resolveDotGlyph`
// lo conoce; si no, cae a texto con la fuente de puntos —y en el mando móvil
// y la tecla física, a nada o a un recorte—. Un preset con un icono no DOT
// siembra botones que se ven mal desde que se crean. Desde T-UI-04 todos los
// `icon` sembrados son nombres que `resolveDotGlyph` conoce, y este bloque lo
// mantiene: falla si alguno deja de resolver.
{
  const fuenteGlifos = readFileSync('src/components/dot480/dotGlyphs8x8.ts', 'utf-8');
  const glifos = new Set([...fuenteGlifos.matchAll(/^  ([A-Z0-9_]+): \[$/gm)].map((m) => m[1]));
  const fuenteMapa = readFileSync('src/components/dot480/resolveDotGlyph.ts', 'utf-8');
  const alias = new Map();
  for (const m of fuenteMapa.matchAll(/^\s*'((?:[^'\\]|\\.)*)': '([A-Z0-9_]+)',?$/gm)) {
    alias.set(m[1].replace(/\\(.)/g, '$1'), m[2]);
  }
  // Misma resolución que `resolveDotGlyph`: nombre directo o alias.
  const resuelve = (icono) => {
    if (typeof icono !== 'string') return null;
    const recortado = icono.trim();
    if (glifos.has(recortado.toUpperCase())) return recortado.toUpperCase();
    return alias.get(recortado.toUpperCase()) ?? alias.get(recortado) ?? null;
  };
  const iconos = [];
  for (const m of fuenteSelector.matchAll(/icon: '([^']+)'/g)) iconos.push(['actionData.ts', m[1]]);
  const fuenteDock = readFileSync('src/data/presetsDock.ts', 'utf-8');
  for (const m of fuenteDock.matchAll(/icon: '([^']+)'/g)) iconos.push(['presetsDock.ts', m[1]]);
  const fuentePlantillas = readFileSync('src/data/plantillasApp.ts', 'utf-8');
  for (const m of fuentePlantillas.matchAll(/\bh\(\s*'[^']*',\s*'([^']+)'/g)) iconos.push(['plantillasApp.ts', m[1]]);
  const vistos = new Set();
  for (const [archivo, icono] of iconos) {
    if (!resuelve(icono) && !vistos.has(icono)) {
      vistos.add(icono);
      problemas.push(`el icono '${icono}' de ${archivo} no lo resuelve resolveDotGlyph — el boton sembrado caeria a texto`);
    }
  }
  // El icono por tipo también tiene que existir en la tabla de glifos.
  const fuentePorTipo = readFileSync('src/components/dot480/glifosPorTipoAccion.ts', 'utf-8');
  for (const m of fuentePorTipo.matchAll(/: '([A-Z0-9_]+)'/g)) {
    if (!glifos.has(m[1])) problemas.push(`GLIFO_POR_TIPO_ACCION usa '${m[1]}', que no existe en DOT_GLYPHS_8X8`);
  }
}

if (problemas.length) {
  console.error(`acciones: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(
  `acciones: ok — ${declarados.size} tipos, ${implementados.size} con manejador, ` +
  `${porElLlamador.size} los resuelve quien llama, ${conFormulario.size} con formulario, ` +
  `${idsRend.size} presets RGB, ${enElSelector.size} elegibles en el paso 1`,
);
