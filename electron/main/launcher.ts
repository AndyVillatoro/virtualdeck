import { exec, spawn } from 'child_process';
import { shell } from 'electron';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export async function launchApp(appPath: string, args: string[] = []): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn(appPath, args, { detached: true, stdio: 'ignore', shell: true });
      child.unref();
      resolve(true);
    } catch {
      resolve(false);
    }
  });
}

export async function openUrl(url: string): Promise<boolean> {
  try { await shell.openExternal(url); return true; } catch { return false; }
}

export async function openShortcut(path: string): Promise<boolean> {
  try { await shell.openPath(path); return true; } catch { return false; }
}

export async function runScript(script: string, shell_: string = 'powershell'): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd =
      shell_ === 'powershell'
        ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`
        : script;
    exec(cmd, { timeout: 30000 }, (err) => resolve(!err));
  });
}

// Writes script to a temp .ps1 file and runs it — handles complex multi-line scripts
export async function runPSScript(script: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tmp = join(tmpdir(), `vd_${Date.now()}.ps1`);
    try {
      writeFileSync(tmp, script, 'utf-8');
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmp}"`,
        { timeout: 30000 },
        (err) => {
          try { unlinkSync(tmp); } catch {}
          resolve(!err);
        }
      );
    } catch {
      resolve(false);
    }
  });
}

export async function runScriptCapture(script: string, shell_: string = 'powershell'): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const cmd =
      shell_ === 'powershell'
        ? `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`
        : script;
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ success: !err, output: (stdout || stderr || '').trim() });
    });
  });
}

export async function setBrightness(level: number): Promise<boolean> {
  const pct = Math.min(100, Math.max(0, Math.round(level)));
  const script = `try { $m = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods; if ($m) { $m.WmiSetBrightness(1, ${pct}) } } catch {}`;
  return runScript(script, 'powershell');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const escaped = text.replace(/'/g, "''");
  return runScript(`Set-Clipboard -Value '${escaped}'`, 'powershell');
}

export async function typeTextKeys(text: string): Promise<boolean> {
  // Escape SendKeys special chars: + ^ % ~ ( ) { } [ ]
  const escaped = text
    .replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`)
    .replace(/'/g, "''");
  return runScript(
    `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`,
    'powershell'
  );
}

export async function killProcess(name: string): Promise<boolean> {
  const safe = name.replace(/['"&|<>]/g, '').trim();
  if (!safe) return false;
  return new Promise((resolve) => {
    exec(`taskkill /IM "${safe}" /F`, { timeout: 10000 }, (err) => resolve(!err));
  });
}

export async function setVolume(percent: number): Promise<boolean> {
  const level = Math.min(1.0, Math.max(0.0, percent / 100)).toFixed(4);
  const script = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"), ComImport]
class MMDev {}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevEnum { void R(); [return:MarshalAs(UnmanagedType.Interface)] object GetDefaultAudioEndpoint(int a, int b); }
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { [return:MarshalAs(UnmanagedType.Interface)] object Activate(ref Guid g, uint c, IntPtr p); }
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioVol { void R1(); void R2(); void R3(); void R4(); int SetMasterVolumeLevelScalar(float f, IntPtr g); }
public class AudioCtrl {
  public static void SetVol(float v) {
    var e = (IMMDevEnum)new MMDev();
    var d = (IMMDevice)e.GetDefaultAudioEndpoint(0, 1);
    var g = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
    ((IAudioVol)d.Activate(ref g, 0, IntPtr.Zero)).SetMasterVolumeLevelScalar(v, IntPtr.Zero);
  }
}
'@
[AudioCtrl]::SetVol(${level}f)
`;
  return runPSScript(script);
}

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
    key = HOTKEY_MAP[part] ?? (part.length === 1 ? part.toUpperCase() : `{${part.toUpperCase()}}`);
  }
  return mods + key;
}

export async function sendHotkey(combo: string): Promise<boolean> {
  const keys = buildSendKeys(combo);
  if (!keys) return false;
  const esc = keys.replace(/'/g, "''");
  return runScript(
    `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${esc}')`,
    'powershell'
  );
}
