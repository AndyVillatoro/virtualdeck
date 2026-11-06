/**
 * Prueba pura de eventos de perilla (`dialRotate`, `dialDown`, `dialUp`) en el
 * anfitrión y manejador de plugins (roadmap 83 d, T-PLG-06).
 *
 *   npx tsx scripts/probar-dial-plugin.ts
 */
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { crearAnfitrion } from '../electron/main/plugins/anfitrion';
import { anotarContextos, anotarGiroPlugin, PLUGINS } from '../src/utils/acciones/plugins';
import type { ElectronAPI } from '../src/types';

async function main(): Promise<void> {
  let resolverRegistro: (() => void) | null = null;
  const promesaRegistro = new Promise<void>((r) => {
    resolverRegistro = r;
  });

  const anfitrion = await crearAnfitrion(
    {
      puertoArchivos: 55123,
      uuid: 'com.vd.prueba-dial',
      version: '1.0.0',
      idioma: 'es',
      carpeta: process.cwd(),
    },
    () => {
      resolverRegistro?.();
    },
  );

  const recibidos: Array<Record<string, any>> = [];
  const ws = new WebSocket(`ws://127.0.0.1:${anfitrion.puerto}`);

  ws.on('open', () => {
    ws.send(JSON.stringify({ event: 'registerPlugin', uuid: anfitrion.uuidRegistro }));
  });
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw)) as Record<string, any>;
    recibidos.push(msg);
  });

  await promesaRegistro;

  // 1. Aparecer con controlador Encoder
  anfitrion.aparecer('N3:dial-1', {
    accion: 'com.vd.prueba-dial.volumen',
    settings: { paso: 5 },
    columna: 1,
    fila: 0,
    controlador: 'Encoder',
  });

  // 2. Giro izquierda (-1) y derecha (+3)
  anfitrion.girar('N3:dial-1', -1);
  anfitrion.girar('N3:dial-1', 3, true);

  // 3. Pulsación de encoder (dialDown / dialUp)
  anfitrion.dial('N3:dial-1', true);
  anfitrion.dial('N3:dial-1', false);

  await new Promise((r) => setTimeout(r, 40));

  const appear = recibidos.find((m) => m.event === 'willAppear');
  assert.ok(appear, 'llega willAppear');
  assert.equal(appear.payload?.controller, 'Encoder', 'willAppear lleva controller Encoder');
  assert.deepEqual(appear.payload?.settings, { paso: 5 }, 'willAppear lleva settings');

  const giros = recibidos.filter((m) => m.event === 'dialRotate');
  assert.equal(giros.length, 2, 'llegan 2 eventos dialRotate');
  assert.equal(giros[0]?.payload?.ticks, -1, 'primer giro ticks = -1');
  assert.equal(giros[0]?.payload?.pressed, false, 'primer giro pressed = false');
  assert.equal(giros[1]?.payload?.ticks, 3, 'segundo giro ticks = 3');
  assert.equal(giros[1]?.payload?.pressed, true, 'segundo giro pressed = true');

  const dialDown = recibidos.find((m) => m.event === 'dialDown');
  const dialUp = recibidos.find((m) => m.event === 'dialUp');
  assert.ok(dialDown, 'llega dialDown');
  assert.ok(dialUp, 'llega dialUp');
  assert.equal(dialDown.payload?.controller, 'Encoder', 'dialDown lleva controller Encoder');

  ws.close();
  anfitrion.cerrar();

  // 4. Manejador renderer: cuando se anota giro, invoca api.plugins.rotate en vez de press
  const llamadas: Array<{ tipo: 'rotate' | 'press'; ticks?: number; abajo?: boolean }> = [];
  const apiFalsa = {
    plugins: {
      rotate: async (_ref: unknown, ticks: number) => {
        llamadas.push({ tipo: 'rotate', ticks });
        return true;
      },
      press: async (_ref: unknown, abajo: boolean) => {
        llamadas.push({ tipo: 'press', abajo });
        return true;
      },
    },
  } as unknown as ElectronAPI;

  const accionGiro = {
    type: 'plugin' as const,
    plugin: { pluginUuid: 'com.vd.prueba-dial', accionUuid: 'com.vd.prueba-dial.volumen' },
  };
  anotarContextos([accionGiro], 'N3:btn-1');
  anotarGiroPlugin(accionGiro, -1);

  const resGiro = await PLUGINS.plugin({
    action: accionGiro,
    api: apiFalsa,
    state: {},
    t: (k) => k,
  });
  assert.equal(resGiro.ok, true, 'manejador con giro devuelve ok');
  assert.deepEqual(llamadas, [{ tipo: 'rotate', ticks: -1 }], 'manejador llama a rotate(-1) y no a press');

  // 5. La siguiente ejecución sin anotar giro usa press normal
  llamadas.length = 0;
  anotarContextos([accionGiro], 'N3:btn-1');
  const resPress = await PLUGINS.plugin({
    action: accionGiro,
    api: apiFalsa,
    state: {},
    t: (k) => k,
  });
  assert.equal(resPress.ok, true, 'manejador sin giro devuelve ok');
  assert.deepEqual(llamadas, [{ tipo: 'press', abajo: true }], 'sin giro llama a press(true)');

  console.log('probar-dial-plugin: ok (willAppear Encoder, dialRotate, dialDown/Up y manejador rotate)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
