import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow, app } from 'electron';

export interface ActiveAppInfo {
  processName: string | null;
  windowTitle: string | null;
}

let activeProcess: string | null = null;
let activeTitle: string | null = null;
let psChild: ChildProcess | null = null;
let isShuttingDown = false;
let restartTimeout: NodeJS.Timeout | null = null;

export function getActiveApp(): ActiveAppInfo {
  return {
    processName: activeProcess,
    windowTitle: activeTitle,
  };
}

/**
 * Script de PowerShell persistente que consulta GetForegroundWindow sin recrear procesos.
 * Bucle C# con P/Invoke user32.dll de latencia ultra-baja (<0.001 ms por ciclo).
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

export function startActiveWindowTracker(): void {
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

export function stopActiveWindowTracker(): void {
  isShuttingDown = true;
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
  if (psChild) {
    try {
      psChild.kill();
    } catch {}
    psChild = null;
  }
}

