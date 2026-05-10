/**
 * Macro engine — recording via uiohook-napi (global hook) and
 * playback via a single PowerShell script generated from MacroStep[].
 *
 * uiohook-napi uses a stable N-API binary — no Electron-specific rebuild needed.
 */

import { runPS } from './ps-helpers';
import type { MacroStep } from '../../src/types';

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

/** Start capturing keyboard + mouse events globally. */
export function startRecording(): void {
  const uio = getUio();
  if (!uio) throw new Error('uiohook-napi no está disponible en este sistema.');
  if (_recording) return;

  _recording = true;
  _steps = [];
  _lastTs = Date.now();

  uio.uIOhook.on('keydown', (e: any) => {
    if (!_recording) return;
    const now = Date.now();
    const delay = Math.max(0, now - _lastTs - 30);
    _lastTs = now;
    const key = keycodeToSendKey(e.keycode);
    if (!key) return;
    _steps.push({ type: 'key', value: key, delayMs: delay });
  });

  uio.uIOhook.on('click', (e: any) => {
    if (!_recording) return;
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
  if (uio) {
    try { uio.uIOhook.stop(); } catch {}
    try { uio.uIOhook.removeAllListeners(); } catch {}
  }
  return _steps;
}

export function isRecording(): boolean { return _recording; }

// ---------------------------------------------------------------------------
// Playback via PowerShell
// ---------------------------------------------------------------------------

/** Generate and run a PowerShell script that executes the macro steps. */
export async function playMacro(
  steps: MacroStep[],
  repeat = 1,
): Promise<{ ok: boolean; error?: string }> {
  if (!steps || steps.length === 0) return { ok: false, error: 'Sin pasos en la macro.' };
  const script = buildPlaybackScript(steps, Math.max(1, repeat));
  const r = await runPS(script, { timeoutMs: 120_000 });
  if (!r.ok && r.stderr) console.error('[macro] playback error:', r.stderr.slice(0, 500));
  return r.ok ? { ok: true } : { ok: false, error: r.stderr?.slice(0, 300) || 'Error desconocido' };
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

/** Wrap SendKeys special characters in braces. */
function escapeSendKeys(value: string): string {
  // Common modifier shorthands the user might type
  return value
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
// uiohook keycode → SendKeys string
// uiohook-napi keycodes: https://github.com/nicholasdille/uiohook-napi/blob/main/src/uiohook.ts
// ---------------------------------------------------------------------------

const KEYCODE_MAP: Record<number, string> = {
  // Letters (A-Z) are 0x41..0x5A in uiohook
  0x41: 'a', 0x42: 'b', 0x43: 'c', 0x44: 'd', 0x45: 'e', 0x46: 'f',
  0x47: 'g', 0x48: 'h', 0x49: 'i', 0x4A: 'j', 0x4B: 'k', 0x4C: 'l',
  0x4D: 'm', 0x4E: 'n', 0x4F: 'o', 0x50: 'p', 0x51: 'q', 0x52: 'r',
  0x53: 's', 0x54: 't', 0x55: 'u', 0x56: 'v', 0x57: 'w', 0x58: 'x',
  0x59: 'y', 0x5A: 'z',
  // Digits
  0x30: '0', 0x31: '1', 0x32: '2', 0x33: '3', 0x34: '4',
  0x35: '5', 0x36: '6', 0x37: '7', 0x38: '8', 0x39: '9',
  // Special
  0x0D: '{ENTER}', 0x09: '{TAB}', 0x1B: '{ESC}', 0x08: '{BACKSPACE}',
  0x20: ' ', 0x2E: '{DELETE}',
  0x26: '{UP}', 0x28: '{DOWN}', 0x25: '{LEFT}', 0x27: '{RIGHT}',
  0x24: '{HOME}', 0x23: '{END}', 0x21: '{PGUP}', 0x22: '{PGDN}',
  // F-keys
  0x70: '{F1}', 0x71: '{F2}', 0x72: '{F3}', 0x73: '{F4}',
  0x74: '{F5}', 0x75: '{F6}', 0x76: '{F7}', 0x77: '{F8}',
  0x78: '{F9}', 0x79: '{F10}', 0x7A: '{F11}', 0x7B: '{F12}',
};

function keycodeToSendKey(code: number): string | null {
  return KEYCODE_MAP[code] ?? null;
}
