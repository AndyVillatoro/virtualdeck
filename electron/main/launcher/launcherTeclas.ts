import { intentarNativo } from '../sistema/native';
import { getUio } from './macro';
import { runPSBool } from './ps-helpers';

const HOTKEY_MAP: Record<string, string> = {
  'F1':'{F1}','F2':'{F2}','F3':'{F3}','F4':'{F4}','F5':'{F5}','F6':'{F6}',
  'F7':'{F7}','F8':'{F8}','F9':'{F9}','F10':'{F10}','F11':'{F11}','F12':'{F12}',
  'Enter':'{ENTER}','Return':'{ENTER}','Esc':'{ESC}','Escape':'{ESC}',
  'Tab':'{TAB}','Space':'{SPACE}','Backspace':'{BACKSPACE}','Back':'{BACKSPACE}',
  'Delete':'{DELETE}','Del':'{DELETE}','Insert':'{INSERT}','Ins':'{INSERT}',
  'Home':'{HOME}','End':'{END}','PageUp':'{PGUP}','PageDown':'{PGDN}',
  'PgUp':'{PGUP}','PgDn':'{PGDN}','Up':'{UP}','Down':'{DOWN}',
  'Left':'{LEFT}','Right':'{RIGHT}','PrintScreen':'{PRTSC}',
  'CapsLock':'{CAPSLOCK}','NumLock':'{NUMLOCK}','ScrollLock':'{SCROLLLOCK}',
};

function buildSendKeys(combo: string): string {
  let mods = '';
  let key = '';
  for (const part of combo.split('+').map(s => s.trim()).filter(Boolean)) {
    const lo = part.toLowerCase();
    if (lo === 'ctrl' || lo === 'control') { mods += '^'; continue; }
    if (lo === 'alt') { mods += '%'; continue; }
    if (lo === 'shift') { mods += '+'; continue; }
    if (lo === 'win' || lo === 'windows') { mods += '^{ESC}'; continue; }
    key = HOTKEY_MAP[part] ?? (part.length === 1 ? teclaSendKeys(part) : `{${part.toUpperCase()}}`);
  }
  return mods + key;
}

/** SendKeys da significado a `+^%~(){}[]`: sueltos hay que ponerlos entre llaves. */
function teclaSendKeys(c: string): string {
  return '+^%~(){}[]'.includes(c) ? `{${c}}` : c.toUpperCase();
}

/**
 * Atajos cuya tecla es un signo (`Ctrl+-`, `[`) o del teclado numérico. El
 * núcleo nuevo los resuelve con el idioma de teclado actual (`VkKeyScanW` en
 * `crates/vd-core/src/macros/keys.rs`); uno viejo los rechazaba devolviendo
 * `false` en vez de fallar. Si eso pasa, se reintenta por PowerShell.
 */
function teclaSigno(combo: string): boolean {
  const tecla = combo.split('+').map((s) => s.trim()).filter(Boolean).pop() ?? '';
  return (tecla.length === 1 && !/[a-z0-9]/i.test(tecla)) || tecla.toLowerCase() in TECLAS_UIOHOOK;
}

/**
 * Teclas que no dependen del idioma del teclado y que el núcleo nativo no
 * sabe enviar: el teclado numérico. Van por `uiohook-napi`, que ya está en la
 * app (grabador de macros, que es quien la carga: `getUio`) y envía en el propio proceso, sin arrancar
 * PowerShell (~400 ms por pulsación: una perilla que se gira rápido las
 * encolaba). Clave: el nombre en el atajo, en minúsculas; valor: el de `UiohookKey`.
 */
const TECLAS_UIOHOOK: Record<string, string> = {
  add: 'NumpadAdd', subtract: 'NumpadSubtract', multiply: 'NumpadMultiply', divide: 'NumpadDivide',
};
const MODIFICADORES_UIOHOOK: Record<string, string> = {
  ctrl: 'Ctrl', control: 'Ctrl', alt: 'Alt', shift: 'Shift', win: 'Meta', windows: 'Meta',
};

/** `true` si se envió por uiohook; `false` si no aplica o no se pudo (sigue el camino de siempre). */
function enviarPorUiohook(combo: string): boolean {
  const partes = combo.split('+').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const tecla = TECLAS_UIOHOOK[partes[partes.length - 1] ?? ''];
  const u = tecla ? getUio() : null;
  if (!tecla || !u) return false;
  const mods = partes.slice(0, -1).map((m) => u.UiohookKey[MODIFICADORES_UIOHOOK[m] ?? '']);
  if (mods.some((m) => m === undefined)) return false;
  try {
    u.uIOhook.keyTap(u.UiohookKey[tecla], mods);
    return true;
  } catch (e) {
    console.error('[hotkey] uiohook falló:', (e as Error).message);
    return false;
  }
}

export async function sendHotkey(combo: string): Promise<boolean> {
  if (enviarPorUiohook(combo)) return true;
  const r = intentarNativo('sendHotkey', (n) => n.sendHotkey(combo));
  if (r === true || (r === false && !teclaSigno(combo))) return r;

  const keys = buildSendKeys(combo);
  if (!keys) return false;
  const script = `param([string]$Keys)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($Keys)`;
  return runPSBool(script, { timeoutMs: 10000, args: [keys] });
}
