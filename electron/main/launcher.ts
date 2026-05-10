import { exec, spawn } from 'child_process';
import { shell } from 'electron';
import { runPS, runPSBool } from './ps-helpers';

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
  // PS branch goes through the shared helper (tmp .ps1 + UTF-8 + -File). Other
  // shells fall back to direct exec — those are cmd one-liners from the user.
  if (shell_ === 'powershell') {
    return runPSBool(script, { timeoutMs: 30000 });
  }
  return new Promise((resolve) => {
    exec(script, { timeout: 30000 }, (err) => resolve(!err));
  });
}

export async function runScriptCapture(script: string, shell_: string = 'powershell'): Promise<{ success: boolean; output: string }> {
  if (shell_ === 'powershell') {
    const r = await runPS(script, { timeoutMs: 30000 });
    return { success: r.ok, output: (r.stdout || r.stderr || '').trim() };
  }
  return new Promise((resolve) => {
    exec(script, { timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ success: !err, output: (stdout || stderr || '').trim() });
    });
  });
}

export async function setBrightness(level: number): Promise<boolean> {
  const pct = Math.min(100, Math.max(0, Math.round(level)));
  const script = `
param([int]$Pct)
try {
  $m = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods
  if ($m) { $m.WmiSetBrightness(1, $Pct) }
} catch {}
`;
  return runPSBool(script, { timeoutMs: 10000, args: [String(pct)] });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  // $Text arrives via param() — never interpolated, so PS string-escape rules
  // and `$()` subshell expansion don't apply.
  const script = `param([string]$Text)
Set-Clipboard -Value $Text`;
  return runPSBool(script, { timeoutMs: 10000, args: [text] });
}

export async function typeTextKeys(text: string): Promise<boolean> {
  // SendKeys metachars (+ ^ % ~ ( ) { } [ ]) must be wrapped — that's a
  // SendKeys-level concern, not a shell-level injection issue.
  const escaped = text.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
  const script = `param([string]$Keys)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($Keys)`;
  return runPSBool(script, { timeoutMs: 10000, args: [escaped] });
}

export async function getRunningProcesses(): Promise<string[]> {
  return new Promise((resolve) => {
    exec('tasklist /NH /FO CSV', { timeout: 5000 }, (err, stdout) => {
      if (err) { resolve([]); return; }
      const names: string[] = [];
      for (const line of stdout.split('\n')) {
        const m = /^"([^"]+)"/.exec(line.trim());
        if (m) names.push(m[1].replace(/\.exe$/i, '').toLowerCase());
      }
      resolve(names);
    });
  });
}

export async function killProcess(name: string): Promise<boolean> {
  const safe = name.replace(/['"&|<>]/g, '').trim();
  if (!safe) return false;
  return new Promise((resolve) => {
    exec(`taskkill /IM "${safe}" /F`, { timeout: 10000 }, (err) => resolve(!err));
  });
}

export async function setVolume(percent: number): Promise<boolean> {
  const level = Math.min(1.0, Math.max(0.0, percent / 100));
  const script = `
param([float]$V)
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
[AudioCtrl]::SetVol($V)
`;
  return runPSBool(script, { timeoutMs: 15000, args: [level.toFixed(4)] });
}

export async function snapWindow(position: string, processName?: string): Promise<boolean> {
  const pname = (processName ?? '').replace(/\.exe$/i, '').trim();
  const script = `
param([string]$Pname, [string]$Pos)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public class WinSnap {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int n);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
}
'@
if ($Pname -ne '') {
  $p  = Get-Process -Name $Pname -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  $hw = if ($p) { $p.MainWindowHandle } else { [WinSnap]::GetForegroundWindow() }
} else {
  $hw = [WinSnap]::GetForegroundWindow()
}
if ($hw -eq [IntPtr]::Zero) { return }
if ([WinSnap]::IsIconic($hw)) { [void][WinSnap]::ShowWindow($hw, 9) }
$s  = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$sw = $s.Width; $sh = $s.Height; $sx = $s.X; $sy = $s.Y
$f  = [uint32]0x0004
switch ($Pos) {
  'left-half'    { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx,$sy,[int]($sw/2),$sh,$f) }
  'right-half'   { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx+[int]($sw/2),$sy,[int]($sw/2),$sh,$f) }
  'top-half'     { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx,$sy,$sw,[int]($sh/2),$f) }
  'bottom-half'  { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx,$sy+[int]($sh/2),$sw,[int]($sh/2),$f) }
  'top-left'     { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx,$sy,[int]($sw/2),[int]($sh/2),$f) }
  'top-right'    { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx+[int]($sw/2),$sy,[int]($sw/2),[int]($sh/2),$f) }
  'bottom-left'  { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx,$sy+[int]($sh/2),[int]($sw/2),[int]($sh/2),$f) }
  'bottom-right' { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx+[int]($sw/2),$sy+[int]($sh/2),[int]($sw/2),[int]($sh/2),$f) }
  'maximize'     { [void][WinSnap]::ShowWindow($hw, 3) }
  'restore'      { [void][WinSnap]::ShowWindow($hw, 9) }
  'center'       { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx+[int]($sw/4),$sy+[int]($sh/4),[int]($sw/2),[int]($sh/2),$f) }
}
`;
  return runPSBool(script, { timeoutMs: 15000, args: [pname, position] });
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
  const script = `param([string]$Keys)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($Keys)`;
  return runPSBool(script, { timeoutMs: 10000, args: [keys] });
}
