/**
 * Motor de macros — grabación con uiohook-napi (hook global) y reproducción
 * con el núcleo nativo.
 *
 * La grabación ya era nativa desde el principio: uiohook-napi usa un binario
 * N-API estable, sin recompilar por versión de Electron. Lo que sí pasaba por
 * PowerShell era la **reproducción**, con un script generado al vuelo que
 * mezclaba SendKeys y `mouse_event` de user32.dll — con todo el escapado de
 * metacaracteres que eso arrastraba. Ahora lo hace `vd-core` con SendInput, y
 * el script se conserva solo como respaldo.
 */

import { intentarNativo } from './native';
import { runPS } from './ps-helpers';
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
 * Empieza a capturar teclado y ratón, globalmente.
 *
 * `esNuestro` dice si un punto de la pantalla cae sobre la propia ventana de
 * VirtualDeck. Los clics ahí **no son parte de la macro**: son los de quien
 * está manejando el grabador. Sin esto, toda macro grabada terminaba con un
 * clic en las coordenadas del botón de detener — y al reproducirla, ese clic
 * se repetía sobre lo que hubiera en ese punto.
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
    // `Ctrl+C` y no `^c`: es el formato que documenta el núcleo nativo como el
    // de disco, el que acepta también escrito a mano en el editor, y el único
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
  if (!steps || steps.length === 0) return { ok: false, error: tm('macro.noSteps') };

  // Camino nativo: SendInput directo, sin generar ni ejecutar ningún script.
  // Los pasos viajan como JSON y los lee el mismo modelo que lee la
  // configuración del disco, así que no hay forma de que las dos formas del
  // paso se desvíen entre sí.
  const nativo = intentarNativo('playMacro', (n) =>
    n.playMacro(JSON.stringify(steps), Math.max(1, repeat)),
  );
  if (nativo !== undefined) {
    return nativo
      ? { ok: true }
      : { ok: false, error: tm('macro.playFailed') };
  }

  const script = buildPlaybackScript(steps, Math.max(1, repeat));
  const r = await runPS(script, { timeoutMs: 120_000 });
  if (!r.ok && r.stderr) console.error('[macro] playback error:', r.stderr.slice(0, 500));
  return r.ok ? { ok: true } : { ok: false, error: r.stderr?.slice(0, 300) || tm('macro.unknownError') };
}

// ---------------------------------------------------------------------------
// Script builder
// ---------------------------------------------------------------------------

function buildPlaybackScript(steps: MacroStep[], repeat: number): string {
  const lines: string[] = [
    `Add-Type -AssemblyName System.Windows.Forms`,
    `Add-Type -TypeDefinition @"`,
    `using System; using System.Runtime.InteropServices;`,
    `public class VDMacroInput {`,
    `  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);`,
    `  [DllImport("user32.dll")] public static extern void mouse_event(int f,int dx,int dy,int c,int ex);`,
    `}`,
    `"@ -IgnoreWarnings -ErrorAction SilentlyContinue`,
    ``,
  ];

  for (let i = 0; i < repeat; i++) {
    for (const step of steps) {
      if ((step.delayMs ?? 0) > 0) {
        lines.push(`Start-Sleep -Milliseconds ${step.delayMs}`);
      }
      switch (step.type) {
        case 'delay':
          // Delay-only step — already handled above
          break;
        case 'key':
        case 'hotkey': {
          const k = escapeSendKeys(step.value ?? '');
          if (k) lines.push(`[System.Windows.Forms.SendKeys]::SendWait("${k}")`);
          break;
        }
        case 'text': {
          // SendWait with literal text — each char that needs escaping is wrapped
          const chunks = escapeSendKeysText(step.value ?? '');
          if (chunks) lines.push(`[System.Windows.Forms.SendKeys]::SendWait("${chunks}")`);
          break;
        }
        case 'click': {
          const x = step.x ?? 0;
          const y = step.y ?? 0;
          lines.push(`[VDMacroInput]::SetCursorPos(${x}, ${y})`);
          // LBUTTONDOWN=2 LBUTTONUP=4  RBUTTONDOWN=8 RBUTTONUP=16  MBUTTONDOWN=32 MBUTTONUP=64
          const [down, up] = step.button === 1 ? [8, 16] : step.button === 2 ? [32, 64] : [2, 4];
          lines.push(`[VDMacroInput]::mouse_event(${down}, 0, 0, 0, 0)`);
          lines.push(`[VDMacroInput]::mouse_event(${up}, 0, 0, 0, 0)`);
          break;
        }
        case 'move': {
          lines.push(`[VDMacroInput]::SetCursorPos(${step.x ?? 0}, ${step.y ?? 0})`);
          break;
        }
        case 'scroll': {
          const amount = (step.scrollY ?? 1) * 120;
          if (amount !== 0) lines.push(`[VDMacroInput]::mouse_event(0x0800, 0, 0, ${amount}, 0)`);
          break;
        }
      }
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// SendKeys escaping helpers
// ---------------------------------------------------------------------------

/**
 * `Ctrl+C` → `^c`, `Enter` → `{ENTER}`, y lo que ya viene entre llaves se deja
 * en paz.
 *
 * Lo último es el arreglo: los reemplazos se aplicaban sobre la cadena entera,
 * así que un paso ya grabado como `{ENTER}` salía `{{ENTER}}` —y `{F5}` salía
 * `{{F5}}`—, que en SendKeys es una llave literal seguida de basura. O sea que
 * ninguna tecla con nombre se reproducía por este camino. Ahora la cadena se
 * parte por los tramos entre llaves y solo se traduce lo de fuera.
 */
function escapeSendKeys(value: string): string {
  return value
    .split(/(\{[^{}]*\})/)
    .map((tramo) => (tramo.startsWith('{') ? tramo : traducirNombres(tramo)))
    .join('');
}

function traducirNombres(t: string): string {
  return t
    .replace(/\bCtrl\+/gi, '^')
    .replace(/\bAlt\+/gi, '%')
    .replace(/\bShift\+/gi, '+')
    .replace(/\bWin\+/gi, '{LWIN}')
    .replace(/\bEnter\b/gi, '{ENTER}')
    .replace(/\bTab\b/gi, '{TAB}')
    .replace(/\bEsc\b/gi, '{ESC}')
    .replace(/\bDelete\b/gi, '{DELETE}')
    .replace(/\bBackspace\b/gi, '{BACKSPACE}')
    .replace(/\bSpace\b/gi, ' ')
    .replace(/\bF(\d{1,2})\b/gi, '{F$1}')
    .replace(/\bUp\b/gi, '{UP}')
    .replace(/\bDown\b/gi, '{DOWN}')
    .replace(/\bLeft\b/gi, '{LEFT}')
    .replace(/\bRight\b/gi, '{RIGHT}')
    .replace(/\bHome\b/gi, '{HOME}')
    .replace(/\bEnd\b/gi, '{END}')
    .replace(/\bPgUp\b/gi, '{PGUP}')
    .replace(/\bPgDn\b/gi, '{PGDN}');
}

/** Escape literal text for SendWait (escapes {+^%~()} → wrapped in braces). */
function escapeSendKeysText(text: string): string {
  return text.replace(/[{}()+^%~]/g, (c) => `{${c}}`);
}

// ---------------------------------------------------------------------------
// Código de uiohook → nombre de tecla
// ---------------------------------------------------------------------------

/**
 * El mapa se **deriva de `UiohookKey`**, la tabla que publica la propia
 * librería. Antes estaba escrito a mano y suponía los códigos virtuales de
 * Windows (`A` = 0x41), cuando uiohook entrega scancodes (`A` = 0x1E). Medido
 * grabando `abc1` y `Ctrl+C`:
 *
 *   a (0x1E) descartado · b (0x30) guardado como «0» · c (0x2E) descartado
 *   1 (0x02) descartado · Ctrl (0x1D) descartado · c descartado
 *
 * O sea: cinco de seis teclas perdidas y la sexta cambiada por otra. El
 * grabador de macros no ha producido nunca una macro correcta. Escrito a mano
 * volvería a pasar en cuanto la librería cambie un número; derivado, no puede.
 */

/** Nombres de `UiohookKey` que no siguen ningún patrón. */
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
 * Lo que se deja fuera a propósito, no por olvido.
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
    // El primero gana: `Enter` antes que `NumpadEnter` si compartieran código.
    if (m[codigo] === undefined) m[codigo] = token;
  }

  // Una actualización de la librería que añada teclas se ve aquí, y no en una
  // macro grabada a la que le faltan pasos.
  if (sinCubrir.length > 0) console.error('[macro] teclas sin mapear:', sinCubrir.join(', '));
  _mapa = m;
  return m;
}

function keycodeToSendKey(code: number): string | null {
  return mapaTeclas()[code] ?? null;
}
