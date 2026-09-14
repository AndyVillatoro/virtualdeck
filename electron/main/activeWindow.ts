import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { intentarNativo } from './native';

export interface ActiveAppInfo {
  processName: string | null;
  windowTitle: string | null;
}

let activeProcess: string | null = null;
let activeTitle: string | null = null;
let psChild: ChildProcess | null = null;
let nativeInterval: NodeJS.Timeout | null = null;
let isShuttingDown = false;
let restartTimeout: NodeJS.Timeout | null = null;

export function getActiveApp(): ActiveAppInfo {
  const nativo = intentarNativo('getActiveApp', (n) => n.getActiveWindow());
  if (nativo) {
    return {
      processName: nativo.processName?.toLowerCase() || null,
      windowTitle: nativo.windowTitle?.trim() || null,
    };
  }
  return {
    processName: activeProcess,
    windowTitle: activeTitle,
  };
}

/**
 * Script de PowerShell de respaldo cuando no hay núcleo nativo disponible (VD_SIN_NUCLEO=1).
 * Bucle C# con P/Invoke user32.dll.
 */
const SCRIPT_FOREGROUND = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WinFg {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@

$lastPid = 0
while ($true) {
    Start-Sleep -Milliseconds 350
    $hwnd = [WinFg]::GetForegroundWindow()
    if ($hwnd -ne [IntPtr]::Zero) {
        $pId = 0
        [void][WinFg]::GetWindowThreadProcessId($hwnd, [ref]$pId)
        if ($pId -gt 0 -and $pId -ne $lastPid) {
            $lastPid = $pId
            try {
                $proc = [System.Diagnostics.Process]::GetProcessById($pId)
                $name = $proc.ProcessName.ToLower()
                $title = $proc.MainWindowTitle
                [Console]::WriteLine("$name|$title")
            } catch {}
        }
    }
}
`;

function emitChange(processName: string | null, windowTitle: string | null) {
  activeProcess = processName;
  activeTitle = windowTitle;
  const payload: ActiveAppInfo = { processName, windowTitle };
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('window:activeAppChanged', payload);
    }
  }
}

function tickNativo(): void {
  const info = intentarNativo('getActiveWindow', (n) => n.getActiveWindow());
  if (info) {
    const proc = info.processName?.toLowerCase() || null;
    const title = info.windowTitle?.trim() || null;

    if (proc !== activeProcess || title !== activeTitle) {
      emitChange(proc, title);
    }
  }
}

function startPsFallback(): void {
  if (psChild || isShuttingDown) return;

  try {
    psChild = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', SCRIPT_FOREGROUND], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    let buffer = '';

    psChild.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [procRaw, ...rest] = trimmed.split('|');
        const proc = procRaw?.toLowerCase() || null;
        const title = rest.join('|').trim() || null;

        if (proc && proc !== activeProcess) {
          emitChange(proc, title);
        }
      }
    });

    psChild.on('close', () => {
      psChild = null;
      if (!isShuttingDown) {
        restartTimeout = setTimeout(() => startActiveWindowTracker(), 3000);
      }
    });

    psChild.on('error', () => {
      psChild = null;
    });
  } catch {
    psChild = null;
  }
}

export function startActiveWindowTracker(): void {
  if (isShuttingDown) return;

  // 1. Camino Nativo Rust (<0.05ms): en proceso sin runtime externo de PowerShell
  const infoInicial = intentarNativo('getActiveWindow', (n) => n.getActiveWindow());
  if (infoInicial !== undefined) {
    if (!nativeInterval) {
      // Chequeo inicial
      tickNativo();
      // Muestreo reactivo a 250ms con 0% de CPU
      nativeInterval = setInterval(tickNativo, 250);
    }
    return;
  }

  // 2. Respaldo PowerShell si no hay módulo compilado o VD_SIN_NUCLEO=1
  startPsFallback();
}

export function stopActiveWindowTracker(): void {
  isShuttingDown = true;
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
  if (nativeInterval) {
    clearInterval(nativeInterval);
    nativeInterval = null;
  }
  if (psChild) {
    try {
      psChild.kill();
    } catch {}
    psChild = null;
  }
}
