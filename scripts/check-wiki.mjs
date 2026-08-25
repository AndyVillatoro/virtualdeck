// Comprobaciones de la wiki pública.
//
// Existe por lo mismo que `check-acciones.mjs`: la documentación declara un
// inventario —qué páginas hay, qué tipos de acción existen— y ese inventario se
// separa del código sin que nada avise. Cuando se escribió, el menú lateral
// apuntaba a **seis páginas que no existían**, la referencia de acciones se
// había quedado sin **once** de los treinta y seis tipos, y la guía anunciaba
// un atajo `F11` que nunca estuvo en el código.

import { readFileSync, readdirSync } from 'node:fs';

const WIKI = 'docs/wiki';
const problemas = [];

const archivos = readdirSync(WIKI).filter((f) => f.endsWith('.md'));
const paginas = new Set(archivos.map((f) => f.replace(/\.md$/, '')));

// 1. Ningún enlace interno puede apuntar a una página que no existe.
for (const f of archivos) {
  const s = readFileSync(`${WIKI}/${f}`, 'utf-8');
  for (const m of s.matchAll(/\[[^\]]+\]\(([A-Za-z][A-Za-z0-9-]*)\)/g)) {
    if (!paginas.has(m[1])) problemas.push(`${f}: enlace a '${m[1]}', que no existe`);
  }
}

// 2. Cada tipo de acción tiene que estar en las dos referencias. `none` es la
//    celda vacía: no es una acción que el usuario elija.
const tipos = [...readFileSync('src/types.ts', 'utf-8')
  .match(/export type ActionType\s*=([\s\S]*?);/)[1]
  .matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).filter((t) => t !== 'none');

for (const ref of ['Referencia-de-Acciones', 'Actions-Reference']) {
  const s = readFileSync(`${WIKI}/${ref}.md`, 'utf-8');
  const faltan = tipos.filter((t) => !s.includes(`\`${t}\``));
  if (faltan.length) problemas.push(`${ref}.md: sin documentar — ${faltan.join(', ')}`);
}

// 3. Paridad ES/EN: cada página en un idioma tiene su pareja en el otro.
const PAREJAS = [
  ['Home', 'Home-EN'],
  ['Primeros-Pasos', 'Getting-Started'],
  ['Guia-de-Uso', 'Usage-Guide'],
  ['Referencia-de-Acciones', 'Actions-Reference'],
  ['Widgets-y-Variables', 'Widgets-and-Variables'],
  ['Sensores-y-RGB', 'Sensors-and-RGB'],
  ['Atajos-y-Macros', 'Shortcuts-and-Macros'],
];
for (const [es, en] of PAREJAS) {
  if (!paginas.has(es)) problemas.push(`falta la página en español '${es}'`);
  if (!paginas.has(en)) problemas.push(`falta la página en inglés '${en}'`);
}

// 4. El menú lateral las lista todas.
const menu = readFileSync(`${WIKI}/_Sidebar.md`, 'utf-8');
for (const [es, en] of PAREJAS) {
  for (const p of [es, en]) {
    if (!menu.includes(`(${p})`)) problemas.push(`_Sidebar.md: no lista '${p}'`);
  }
}

if (problemas.length) {
  console.error(`wiki: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(`wiki: ok — ${paginas.size - 2} páginas, ${PAREJAS.length} parejas ES/EN, ${tipos.length} tipos de acción documentados`);
