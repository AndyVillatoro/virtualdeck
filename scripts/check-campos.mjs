// Todo campo de accion que el ejecutor lee tiene que poder rellenarse.
//
// `check-acciones.mjs` comprueba que cada tipo tenga **un** formulario. No basta:
// `countdown` lo tenia, y el formulario solo ofrecia el retardo. `timerActions`
// —lo que el temporizador ejecuta cuando termina— no se podia rellenar desde
// ninguna parte, asi que un boton de temporizador hecho en el editor esperaba y
// **no hacia nada**, diciendo que habia ido bien. Es exactamente el fallo que
// aquel guardian existe para evitar, una capa mas abajo.
//
// Aqui se cruzan dos listas: los campos de `ButtonAction` que el ejecutor lee,
// y los que alguna pantalla escribe.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const problemas = [];

// ── los campos declarados ─────────────────────────────────────────────────
const tipos = readFileSync('src/types.ts', 'utf-8');
const bloque = tipos.slice(tipos.indexOf('export interface ButtonAction'));
const campos = new Set(
  [...bloque.slice(0, bloque.indexOf('\n}')).matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]),
);
campos.delete('type');

function fuentesDe(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) fuentesDe(ruta, acc);
    else if (/\.tsx?$/.test(f)) acc.push(ruta);
  }
  return acc;
}

// ── los que el ejecutor lee ───────────────────────────────────────────────
const leidos = new Set();
for (const ruta of [...fuentesDe('src/utils/acciones'), 'src/utils/actions.ts']) {
  const s = readFileSync(ruta, 'utf-8');
  // Sin expresiones regulares a proposito: el escapado se rompe con demasiada
  // facilidad y un guardian que no encuentra nada pasa por «todo correcto».
  for (const c of campos) if (s.includes('.' + c)) leidos.add(c);
}

// ── los que alguna pantalla escribe ───────────────────────────────────────
const escritos = new Set();
for (const ruta of [...fuentesDe('src/screens'), ...fuentesDe('src/components')]) {
  const s = readFileSync(ruta, 'utf-8');
  for (const c of campos) if (s.includes(c + ':') || s.includes(c + ' :')) escritos.add(c);
}

for (const c of leidos) {
  if (!escritos.has(c)) {
    problemas.push(`'${c}' lo lee el ejecutor y **ninguna pantalla lo escribe** — el boton no haria esa parte y no lo diria`);
  }
}

if (problemas.length) {
  console.error(`campos: ${problemas.length} problema(s)\n`);
  for (const p of problemas) console.error('  · ' + p);
  process.exit(1);
}
console.log(`campos: ok — ${campos.size} campos de accion, ${leidos.size} los lee el ejecutor, todos rellenables`);
