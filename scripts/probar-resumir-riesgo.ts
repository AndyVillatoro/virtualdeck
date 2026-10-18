/* Prueba pura del resumen de riesgo de la galería (D-070).

   Verifica que un perfil anidado 12 niveles con un script al fondo se detecta
   (antes el tope de profundidad 8 lo ocultaba), y que un perfil que supera el
   tope de nodos se marca como no importable en vez de silenciarlo.

   Correr en la raíz del repo:
     npx tsx scripts/probar-resumir-riesgo.ts
 */

import Module, { createRequire } from 'node:module';

const RAIZ = process.cwd();
const URL = 'https://example.com/perfil.json';

const electronFalso = {
  net: {
    fetch: async (url: string) => {
      // El perfil se inyecta por variable global antes de llamar.
      const cuerpo = (globalThis as any).__PERFIL_ACTUAL__;
      return { ok: true, status: 200, statusText: 'OK', text: async () => JSON.stringify(cuerpo) };
    },
  },
  app: { getLocale: () => 'es-ES', getPath: () => RAIZ, isPackaged: false, on: () => undefined, whenReady: async () => undefined },
};

function cargarGaleria() {
  const cargaOriginal = Module._load;
  Module._load = function (request: string, ...resto: unknown[]) {
    if (request === 'electron') return electronFalso;
    return cargaOriginal.call(this, request, ...resto);
  };
  const cargar = createRequire(import.meta.url);
  let g: any;
  try { g = cargar('../electron/main/galeria.ts'); } finally { Module._load = cargaOriginal; }
  return g;
}

const fallos: string[] = [];
function comprobar(cond: boolean, msg: string) { if (!cond) { fallos.push(msg); console.error('  FALLO: ' + msg); } }

async function main() {
  const galeria = cargarGaleria();

  // 1) Anidado 12 niveles con script al fondo: debe aparecer en el resumen.
  let profundo: any = { type: 'script', script: 'echo secreto' };
  for (let i = 0; i < 12; i++) profundo = { type: 'branch', branchThen: [profundo] };
  (globalThis as any).__PERFIL_ACTUAL__ = { buttons: [{ action: profundo }] };
  const r1 = await galeria.perfil(URL);
  comprobar(r1.ok === true, `perfil profundo no se importó: ${r1.error ?? '?'}`);
  if (r1.ok) {
    comprobar(Array.isArray(r1.riesgo.scripts) && r1.riesgo.scripts.some((s: string) => s.includes('secreto')),
      'el script a 12 niveles no apareció en el resumen (tope de profundidad)');
    console.log('  ok anidado 12 niveles: script detectado');
  }

  // 2) Perfil que supera el tope de nodos: debe marcarse como no importable.
  const muchos: any[] = [];
  for (let i = 0; i < 20005; i++) muchos.push({ type: 'script', script: `echo ${i}` });
  (globalThis as any).__PERFIL_ACTUAL__ = { buttons: [{ actions: muchos }] };
  const r2 = await galeria.perfil(URL);
  comprobar(r2.ok === false, 'un perfil con >20000 nodos debería ser no importable');
  if (r2.ok === false) console.log('  ok tope de nodos: marcado como no importable');

  if (fallos.length) { console.error(`\nprobar-resumir-riesgo: ${fallos.length} fallo(s)`); process.exitCode = 1; return; }
  console.log('probar-resumir-riesgo: ok');
}

main();