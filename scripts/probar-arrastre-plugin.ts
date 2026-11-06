/** Prueba pura del arrastre de plugins: `npx tsx scripts/probar-arrastre-plugin.ts` */
import assert from 'node:assert/strict';
import type { ButtonConfig } from '../src/types';
import {
  PREFIJO_ARRASTRE_PLUGIN,
  aplicarPluginABoton,
  botonAHueco,
  cargaAHuecoPlugin,
  codificarArrastrePlugin,
  construirHuecosSoltarPlugin,
  decodificarArrastrePlugin,
  type CargaArrastrePlugin,
} from '../src/utils/plugins/arrastrePlugin';

const boton = (parcial: Record<string, unknown> = {}): ButtonConfig =>
  ({ id: 'b1', page: 'p1', label: 'X', icon: 'ico', ...parcial }) as unknown as ButtonConfig;

const carga: CargaArrastrePlugin = { pluginUuid: 'com.demo.plugin', accionUuid: 'com.demo.plugin.accion', nombre: 'Reloj' };
const accionEsperada = { type: 'plugin', plugin: { pluginUuid: carga.pluginUuid, accionUuid: carga.accionUuid } };

let total = 0;
function prueba(nombre: string, fn: () => void): void {
  fn();
  total++;
  console.log(`OK   ${nombre}`);
}

// --- codificar / decodificar ---
prueba('codificar lleva el prefijo y omite esEncoder si no es true', () => {
  const t = codificarArrastrePlugin(carga);
  assert.ok(t.startsWith(PREFIJO_ARRASTRE_PLUGIN));
  assert.deepEqual(JSON.parse(t.slice(PREFIJO_ARRASTRE_PLUGIN.length)), carga);
  assert.ok(!t.includes('esEncoder'));
  assert.ok(!codificarArrastrePlugin({ ...carga, esEncoder: false }).includes('esEncoder'));
});

prueba('codificar incluye esEncoder cuando es true', () => {
  const t = codificarArrastrePlugin({ ...carga, esEncoder: true });
  assert.equal(JSON.parse(t.slice(PREFIJO_ARRASTRE_PLUGIN.length)).esEncoder, true);
});

prueba('ida y vuelta conserva la carga', () => {
  assert.deepEqual(decodificarArrastrePlugin(codificarArrastrePlugin(carga)), carga);
  const enc = { ...carga, esEncoder: true };
  assert.deepEqual(decodificarArrastrePlugin(codificarArrastrePlugin(enc)), enc);
  const raro = { ...carga, nombre: 'Ñandú "x" 🎛️ \n' };
  assert.deepEqual(decodificarArrastrePlugin(codificarArrastrePlugin(raro)), raro);
});

prueba('decodificar rechaza textos nulos, vacíos y sin prefijo', () => {
  assert.equal(decodificarArrastrePlugin(null), null);
  assert.equal(decodificarArrastrePlugin(undefined), null);
  assert.equal(decodificarArrastrePlugin(''), null);
  assert.equal(decodificarArrastrePlugin('hola'), null);
  assert.equal(decodificarArrastrePlugin(JSON.stringify(carga)), null);
});

prueba('decodificar ignora ids normales de botón', () => {
  assert.equal(decodificarArrastrePlugin('b1'), null);
  assert.equal(decodificarArrastrePlugin('btn-12'), null);
  assert.equal(decodificarArrastrePlugin('0'), null);
  assert.equal(decodificarArrastrePlugin('vd-button:3'), null);
  assert.equal(decodificarArrastrePlugin(' ' + PREFIJO_ARRASTRE_PLUGIN + '{}'), null);
});

prueba('decodificar rechaza JSON inválido o con forma incorrecta', () => {
  const p = PREFIJO_ARRASTRE_PLUGIN;
  assert.equal(decodificarArrastrePlugin(p), null);
  assert.equal(decodificarArrastrePlugin(p + '{no json'), null);
  assert.equal(decodificarArrastrePlugin(p + 'null'), null);
  assert.equal(decodificarArrastrePlugin(p + '[]'), null);
  assert.equal(decodificarArrastrePlugin(p + '"texto"'), null);
  assert.equal(decodificarArrastrePlugin(p + '{}'), null);
  assert.equal(decodificarArrastrePlugin(p + '{"pluginUuid":"a"}'), null);
  assert.equal(decodificarArrastrePlugin(p + '{"accionUuid":"a"}'), null);
  assert.equal(decodificarArrastrePlugin(p + '{"pluginUuid":1,"accionUuid":2}'), null);
  assert.equal(decodificarArrastrePlugin(p + '{"pluginUuid":"  ","accionUuid":"a"}'), null);
  assert.equal(decodificarArrastrePlugin(p + '{"pluginUuid":"a","accionUuid":"\\t"}'), null);
});

prueba('decodificar recorta uuids, normaliza nombre y esEncoder estricto', () => {
  const p = PREFIJO_ARRASTRE_PLUGIN;
  assert.deepEqual(decodificarArrastrePlugin(p + '{"pluginUuid":" a ","accionUuid":" b "}'), {
    pluginUuid: 'a',
    accionUuid: 'b',
    nombre: '',
  });
  assert.deepEqual(decodificarArrastrePlugin(p + '{"pluginUuid":"a","accionUuid":"b","nombre":7}'), {
    pluginUuid: 'a',
    accionUuid: 'b',
    nombre: '',
  });
  assert.deepEqual(decodificarArrastrePlugin(p + '{"pluginUuid":"a","accionUuid":"b","nombre":"N","esEncoder":"true"}'), {
    pluginUuid: 'a',
    accionUuid: 'b',
    nombre: 'N',
  });
  assert.equal(
    decodificarArrastrePlugin(p + '{"pluginUuid":"a","accionUuid":"b","esEncoder":true}')?.esEncoder,
    true,
  );
});

// --- aplicarPluginABoton ---
prueba('aplicarPluginABoton limpia la apariencia previa', () => {
  const previo = boton({
    bgColor: '#111',
    fgColor: '#222',
    isToggle: true,
    actionToggleOff: { type: 'none' },
    action: { type: 'launch', path: 'x' },
    modosPerilla: [{ a: 1 }],
    iconoPuntos: { origen: 'si:spotify' },
  });
  const r = aplicarPluginABoton(previo, carga);
  assert.deepEqual(r, { id: 'b1', page: 'p1', label: 'Reloj', icon: '', action: accionEsperada });
  assert.ok(!('fijo' in r));
});

prueba('aplicarPluginABoton conserva fijo solo si es verdadero', () => {
  const r = aplicarPluginABoton(boton({ fijo: true }), carga);
  assert.deepEqual(r, { id: 'b1', page: 'p1', label: 'Reloj', icon: '', action: accionEsperada, fijo: true });
  assert.ok(!('fijo' in aplicarPluginABoton(boton({ fijo: false }), carga)));
});

prueba('aplicarPluginABoton no muta el botón original', () => {
  const previo = boton({ bgColor: '#111' });
  const copia = structuredClone(previo);
  aplicarPluginABoton(previo, carga);
  assert.deepEqual(previo, copia);
});

// --- botonAHueco ---
prueba('botonAHueco de undefined da hueco vacío', () => {
  assert.deepEqual(botonAHueco(undefined), {
    label: '',
    icon: '',
    bgColor: undefined,
    fgColor: undefined,
    action: { type: 'none' },
  });
});

prueba('botonAHueco simple copia campos y omite opcionales', () => {
  const b = boton({ bgColor: '#a', fgColor: '#b', action: { type: 'launch', path: 'p' } });
  const h = botonAHueco(b);
  assert.deepEqual(h, { label: 'X', icon: 'ico', bgColor: '#a', fgColor: '#b', action: { type: 'launch', path: 'p' } });
  for (const k of ['isToggle', 'actionToggleOff', 'fijo', 'modosPerilla', 'iconoCatalogo']) assert.ok(!(k in h), k);
});

prueba('botonAHueco conserva toggle, fijo, modos de perilla e icono del catálogo', () => {
  const modos = [{ id: 'm' }];
  const off = { type: 'none' };
  const h = botonAHueco(
    boton({
      isToggle: true,
      actionToggleOff: off,
      fijo: true,
      modosPerilla: modos,
      iconoPuntos: { origen: 'si:obs', otro: 1 },
      action: { type: 'launch', path: 'p' },
    }),
  ) as unknown as Record<string, unknown>;
  assert.equal(h.isToggle, true);
  assert.deepEqual(h.actionToggleOff, off);
  assert.equal(h.fijo, true);
  assert.equal(h.modosPerilla, modos);
  assert.equal(h.iconoCatalogo, 'si:obs');
});

prueba('botonAHueco sin acción usa none', () => {
  assert.deepEqual(botonAHueco(boton()).action, { type: 'none' });
});

// --- cargaAHuecoPlugin ---
prueba('cargaAHuecoPlugin sin botón previo', () => {
  assert.deepEqual(cargaAHuecoPlugin(undefined, carga), {
    label: 'Reloj',
    icon: '',
    bgColor: undefined,
    fgColor: undefined,
    action: accionEsperada,
  });
});

prueba('cargaAHuecoPlugin limpia apariencia y conserva fijo y modosPerilla', () => {
  const modos = [{ id: 'm' }];
  const h = cargaAHuecoPlugin(
    boton({ bgColor: '#1', fgColor: '#2', isToggle: true, fijo: true, modosPerilla: modos, iconoPuntos: { origen: 'x' } }),
    carga,
  ) as unknown as Record<string, unknown>;
  assert.deepEqual(h.action, accionEsperada);
  assert.equal(h.label, 'Reloj');
  assert.equal(h.icon, '');
  assert.equal(h.bgColor, undefined);
  assert.equal(h.fgColor, undefined);
  assert.equal(h.fijo, true);
  assert.equal(h.modosPerilla, modos);
  assert.ok(!('isToggle' in h));
  assert.ok(!('iconoCatalogo' in h));
});

// --- construirHuecosSoltarPlugin ---
prueba('tecla de 1 hueco: se sustituye el único hueco', () => {
  const r = construirHuecosSoltarPlugin([boton({ fijo: true })], 0, carga);
  assert.equal(r.length, 1);
  assert.deepEqual(r[0], cargaAHuecoPlugin(boton({ fijo: true }), carga));
  const sin = construirHuecosSoltarPlugin([undefined], 0, carga);
  assert.deepEqual(sin, [cargaAHuecoPlugin(undefined, carga)]);
});

prueba('tira de 2: solo cambia el hueco indicado', () => {
  const a = boton({ id: 'a', label: 'A', action: { type: 'launch', path: 'a' } });
  const b = boton({ id: 'b', label: 'B', action: { type: 'launch', path: 'b' } });
  const r0 = construirHuecosSoltarPlugin([a, b], 0, carga);
  assert.deepEqual(r0, [cargaAHuecoPlugin(a, carga), botonAHueco(b)]);
  const r1 = construirHuecosSoltarPlugin([a, b], 1, carga);
  assert.deepEqual(r1, [botonAHueco(a), cargaAHuecoPlugin(b, carga)]);
});

prueba('perilla de 3 sin aplicarATodaLaPerilla: solo el hueco soltado', () => {
  const bs = [boton({ label: 'g' }), boton({ label: 'p' }), boton({ label: 'd' })];
  for (let i = 0; i < 3; i++) {
    const r = construirHuecosSoltarPlugin(bs, i, carga);
    assert.equal(r.length, 3);
    r.forEach((h, j) => {
      assert.deepEqual(h, j === i ? cargaAHuecoPlugin(bs[j], carga) : botonAHueco(bs[j]));
    });
    assert.equal(r.filter((h) => h.label === 'Reloj').length, 1);
  }
  const explicito = construirHuecosSoltarPlugin(bs, 1, carga, false);
  assert.deepEqual(explicito, construirHuecosSoltarPlugin(bs, 1, carga));
});

prueba('perilla de 3 con aplicarATodaLaPerilla: los tres huecos llevan el plugin', () => {
  const modos = [{ id: 'm' }];
  const bs = [boton({ label: 'g' }), boton({ label: 'p', fijo: true, modosPerilla: modos }), undefined];
  const r = construirHuecosSoltarPlugin(bs, 0, carga, true);
  assert.deepEqual(r, bs.map((b) => cargaAHuecoPlugin(b, carga)));
  assert.ok(r.every((h) => h.label === 'Reloj' && (h.action as { type: string }).type === 'plugin'));
  assert.equal((r[1] as unknown as Record<string, unknown>).fijo, true);
  assert.ok(!('fijo' in r[0]));
});

prueba('lista vacía y no muta la entrada', () => {
  assert.deepEqual(construirHuecosSoltarPlugin([], 0, carga), []);
  assert.deepEqual(construirHuecosSoltarPlugin([], 0, carga, true), []);
  const bs = [boton({ bgColor: '#1' }), boton()];
  const copia = structuredClone(bs);
  construirHuecosSoltarPlugin(bs, 0, carga, true);
  assert.deepEqual(bs, copia);
});

console.log(`\nTodas las pruebas pasaron (${total})`);
