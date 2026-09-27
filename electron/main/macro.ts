/**
 * Motor de macros â€” grabaciÃ³n con uiohook-napi (hook global) y reproducciÃ³n
 * con el nÃºcleo nativo.
 *
 * La grabaciÃ³n ya era nativa desde el principio: uiohook-napi usa un binario
 * N-API estable, sin recompilar por versiÃ³n de Electron. Lo que sÃ­ pasaba por
 * PowerShell era la **reproducciÃ³n**, con un script generado al vuelo que
 * mezclaba SendKeys y `mouse_event` de user32.dll â€” con todo el escapado de
 * metacaracteres que eso arrastraba. Ahora lo hace `vd-core` con SendInput, y
 * el script se conserva solo como respaldo.
 */

import { intentarNativo } from './native';
import { runPS } from './ps-helpers';
import { buildPlaybackScript, entero, pasoSeguro, MAX_REPETICIONES } from './macroScript';
import type { MacroStep } from '../../src/types';
import { tm } from './idioma';

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

// uiohook-napi is loaded lazily (dynamic require) so a missing binary doesn't
// crash the whole main process on startup; it only errors when the user tries
// to record a macro.
let _uio: any | null = null;

function getUio() {
  if (_uio) return _uio;
  try {
    _uio = require('uiohook-napi');
    return _uio;
  } catch (e) {
    console.error('[macro] uiohook-napi unavailable:', e);
    return null;
  }
}

let _recording = false;
let _steps: MacroStep[] = [];
let _lastTs = 0;
let _esNuestro: ((x: number, y: number) => boolean) | null = null;

/**
 * Empieza a capturar teclado y ratÃ³n, globalmente.
 *
 * `esNuestro` dice si un punto de la pantalla cae sobre la propia ventana de
 * VirtualDeck. Los clics ahÃ­ **no son parte de la macro**: son los de quien
 * estÃ¡ manejando el grabador. Sin esto, toda macro grabada terminaba con un
 * clic en las coordenadas del botÃ³n de detener â€” y al reproducirla, ese clic
 * se repetÃ­a sobre lo que hubiera en ese punto.
 */
export function startRecording(esNuestro?: (x: number, y: number) => boolean): void {
  const uio = getUio();
  if (!uio) throw new Error(tm('macro.noUiohook'));
  if (_recording) return;

  _recording = true;
  _steps = [];
  _lastTs = Date.now();
  _esNuestro = esNuestro ?? null;

  uio.uIOhook.on('keydown', (e: any) => {
    if (!_recording) return;
    const base = keycodeToSendKey(e.keycode);
    // Un modificador suelto no es un paso: viaja pegado a la tecla siguiente.
    if (!base) return;
    const now = Date.now();
    const delay = Math.max(0, now - _lastTs - 30);
    _lastTs = now;
    // `Ctrl+C` y no `^c`: es el formato que documenta el nÃºcleo nativo como el
    // de disco, el que acepta tambiÃ©n escrito a mano en el editor, y el Ãºnico
    // que se lee en la lista de pasos.
    const mods = [
      e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Win',
    ].filter(Boolean) as string[];
    _steps.push({
      type: mods.length > 0 ? 'hotkey' : 'key',
      value: mods.length > 0 ? `${mods.join('+')}+${base}` : base,
      delayMs: delay,
    });
  });

  uio.uIOhook.on('click', (e: any) => {
    if (!_recording) return;
    if (_esNuestro?.(e.x, e.y)) return;
    const now = Date.now();
    const delay = Math.max(0, now - _lastTs - 30);
    _lastTs = now;
    _steps.push({ type: 'click', x: e.x, y: e.y, button: (e.button - 1) as 0 | 1 | 2, delayMs: delay });
  });

  uio.uIOhook.start();
}

/** Stop recording and return the captured steps. */
export function stopRecording(): MacroStep[] {
  const uio = getUio();
  if (!_recording) return _steps;
  _recording = false;
  _esNuestro = null;
  if (uio) {
    try { uio.uIOhook.stop(); } catch {}
    try { uio.uIOhook.removeAllListeners(); } catch {}
  }
  return _steps;
}

export function isRecording(): boolean { return _recording; }

// ---------------------------------------------------------------------------
// Reproduccion: nativa, con PowerShell de respaldo
// ---------------------------------------------------------------------------

/** Reproduce los pasos. Nativo si esta disponible; si no, el script de siempre. */
export async function playMacro(
  steps: MacroStep[],
  repeat = 1,
): Promise<{ ok: boolean; error?: string }> {
  if (!Array.isArray(steps) || steps.length === 0) return { ok: false, error: tm('macro.noSteps') };

  // Los numÃ©ricos se acotan **antes** de los dos caminos. Ver `pasoSeguro`.
  const pasos = steps.map(pasoSeguro);
  const veces = entero(repeat, 1, MAX_REPETICIONES, 1);

  // Camino nativo: SendInput directo, sin generar ni ejecutar ningÃºn script.
  // Los pasos viajan como JSON y los lee el mismo modelo que lee la
  // configuraciÃ³n del disco, asÃ­ que no hay forma de que las dos formas del
  // paso se desvÃ­en entre sÃ­.
  const nativo = intentarNativo('playMacro', (n) =>
    n.playMacro(JSON.stringify(pasos), veces),
  );
  if (nativo !== undefined) {
    return nativo
      ? { ok: true }
      : { ok: false, error: tm('macro.playFailed') };
  }

  const script = buildPlaybackScript(pasos, veces);
  const r = await runPS(script, { timeoutMs: 120_000 });
  if (!r.ok && r.stderr) console.error('[macro] playback error:', r.stderr.slice(0, 500));
  return r.ok ? { ok: true } : { ok: false, error: r.stderr?.slice(0, 300) || tm('macro.unknownError') };
}


// ---------------------------------------------------------------------------
// CÃ³digo de uiohook â†’ nombre de tecla
// ---------------------------------------------------------------------------

/**
 * El mapa se **deriva de `UiohookKey`**, la tabla que publica la propia
 * librerÃ­a. Antes estaba escrito a mano y suponÃ­a los cÃ³digos virtuales de
 * Windows (`A` = 0x41), cuando uiohook entrega scancodes (`A` = 0x1E). Medido
 * grabando `abc1` y `Ctrl+C`:
 *
 *   a (0x1E) descartado Â· b (0x30) guardado como Â«0Â» Â· c (0x2E) descartado
 *   1 (0x02) descartado Â· Ctrl (0x1D) descartado Â· c descartado
 *
 * O sea: cinco de seis teclas perdidas y la sexta cambiada por otra. El
 * grabador de macros no ha producido nunca una macro correcta. Escrito a mano
 * volverÃ­a a pasar en cuanto la librerÃ­a cambie un nÃºmero; derivado, no puede.
 */

/** Nombres de `UiohookKey` que no siguen ningÃºn patrÃ³n. */
const NOMBRADAS: Record<string, string> = {
  Backspace: '{BACKSPACE}', Tab: '{TAB}', Enter: '{ENTER}', NumpadEnter: '{ENTER}',
  Escape: '{ESC}', Space: ' ', Insert: '{INSERT}', Delete: '{DELETE}',
  PageUp: '{PGUP}', PageDown: '{PGDN}', End: '{END}', Home: '{HOME}',
  ArrowLeft: '{LEFT}', ArrowUp: '{UP}', ArrowRight: '{RIGHT}', ArrowDown: '{DOWN}',
  NumpadInsert: '{INSERT}', NumpadDelete: '{DELETE}',
  NumpadPageUp: '{PGUP}', NumpadPageDown: '{PGDN}',
  NumpadEnd: '{END}', NumpadHome: '{HOME}',
  NumpadArrowLeft: '{LEFT}', NumpadArrowUp: '{UP}',
  NumpadArrowRight: '{RIGHT}', NumpadArrowDown: '{DOWN}',
  NumpadMultiply: '{MULTIPLY}', NumpadAdd: '{ADD}',
  NumpadSubtract: '{SUBTRACT}', NumpadDivide: '{DIVIDE}', NumpadDecimal: '.',
  Semicolon: ';', Equal: '=', Comma: ',', Minus: '-', Period: '.', Slash: '/',
  Backquote: '`', BracketLeft: '[', Backslash: '\\', BracketRight: ']', Quote: "'",
};

/**
 * Lo que se deja fuera a propÃ³sito, no por olvido.
 *
 * Los modificadores porque viajan pegados a la tecla siguiente; los tres
 * bloqueos porque el reproductor no sabe pulsarlos y un paso que no hace nada
 * es peor que no tenerlo.
 */
const EXCLUIDAS = new Set([
  'Ctrl', 'CtrlRight', 'Alt', 'AltRight', 'Shift', 'ShiftRight', 'Meta', 'MetaRight',
  'CapsLock', 'NumLock', 'ScrollLock', 'PrintScreen',
]);

let _mapa: Record<number, string> | null = null;

function mapaTeclas(): Record<number, string> {
  if (_mapa) return _mapa;
  const uio = getUio();
  const tabla: Record<string, number> = uio?.UiohookKey ?? {};
  const m: Record<number, string> = {};
  const sinCubrir: string[] = [];

  for (const [nombre, codigo] of Object.entries(tabla)) {
    if (typeof codigo !== 'number' || EXCLUIDAS.has(nombre)) continue;
    let token: string | null = null;
    if (/^[A-Z]$/.test(nombre)) token = nombre.toLowerCase();
    else if (/^[0-9]$/.test(nombre)) token = nombre;
    else if (/^Numpad[0-9]$/.test(nombre)) token = nombre.slice(-1);
    else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(nombre)) token = `{${nombre}}`;
    else if (NOMBRADAS[nombre]) token = NOMBRADAS[nombre];

    if (token === null) { sinCubrir.push(nombre); continue; }
    // El primero gana: `Enter` antes que `NumpadEnter` si compartieran cÃ³digo.
    if (m[codigo] === undefined) m[codigo] = token;
  }

  // Una actualizaciÃ³n de la librerÃ­a que aÃ±ada teclas se ve aquÃ­, y no en una
  // macro grabada a la que le faltan pasos.
  if (sinCubrir.length > 0) console.error('[macro] teclas sin mapear:', sinCubrir.join(', '));
  _mapa = m;
  return m;
}

function keycodeToSendKey(code: number): string | null {
  return mapaTeclas()[code] ?? null;
}
