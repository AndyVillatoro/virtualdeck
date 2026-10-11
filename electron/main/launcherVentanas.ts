import { intentarNativo } from './native';
import { runPSBool } from './ps-helpers';

export async function snapWindow(position: string, processName?: string): Promise<boolean> {
  const r = intentarNativo('snapWindow', (n) => n.snapWindow(position, processName));
  if (r !== undefined) return r;

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
  'minimize'     { [void][WinSnap]::ShowWindow($hw, 6) }
  'maximize'     { [void][WinSnap]::ShowWindow($hw, 3) }
  'restore'      { [void][WinSnap]::ShowWindow($hw, 9) }
  'center'       { [void][WinSnap]::SetWindowPos($hw,[IntPtr]::Zero,$sx+[int]($sw/4),$sy+[int]($sh/4),[int]($sw/2),[int]($sh/2),$f) }
}
`;
  return runPSBool(script, { timeoutMs: 15000, args: [pname, position] });
}

/**
 * Trae al frente la ventana siguiente (`adelante`) o la anterior, en un orden
 * estable por proceso —no el de uso reciente de `Alt+Tab`, donde «la
 * siguiente» cambia cada vez—. La actual es la de arriba de la pila, así que
 * funciona aunque se pulse desde la propia pantalla de VirtualDeck.
 *
 * **Sin núcleo no hay nada que hacer, y no hay respaldo en PowerShell.**
 * Recorrer en orden estable exige enumerar las ventanas por Z-order y robar el
 * primer plano con pegado de hilos (`AttachThreadInput`); un `AppActivate` por
 * nombre de proceso no garantiza ni el orden ni qué ventana de ese proceso
 * queda delante. Así que sin núcleo —o con un `.node` viejo que aún no trae
 * `cycleWindow`, que llega como `undefined` y revienta al llamarla— se devuelve
 * `false` con el error en el registro, y quien llama lo enseña.
 */
export async function cycleWindow(adelante: boolean): Promise<boolean> {
  const r = intentarNativo('cycleWindow', (n) => {
    if (typeof n.cycleWindow !== 'function') {
      throw new Error('loaded native core has no cycleWindow: rebuild it with `npm run build:native`');
    }
    return n.cycleWindow(adelante);
  });
  if (r !== undefined) return r;
  console.error('[ventanas] cycleWindow sin núcleo nativo (o núcleo viejo sin esa función): hace falta compilar con `npm run build:native`');
  return false;
}

/**
 * Las apps con una ventana abierta (nombre de proceso, sin `.exe`, sin
 * repetir), para elegir la app de una página sin teclear. Sin núcleo —o con uno
 * viejo sin la función— la lista sale vacía y la pantalla deja escribirla o
 * buscar el `.exe`: no hay respaldo en PowerShell que distinga ventanas de
 * aplicación de los cientos de procesos de fondo.
 */
export async function openApps(): Promise<string[]> {
  const r = intentarNativo('openApps', (n) => (typeof n.openApps === 'function' ? n.openApps() : undefined));
  return r ?? [];
}

/**
 * El icono de una app abierta en puntos 16×16 (base64, el formato de
 * `iconoPuntos`), para enseñarla en el selector de apps y como icono de su
 * página. Sin núcleo —o con uno viejo sin la función— `null`: se enseña el
 * nombre solo, no hay respaldo en PowerShell.
 */
export async function iconoApp(proceso: string): Promise<string | null> {
  const r = intentarNativo('iconoApp', (n) => (typeof n.iconoApp === 'function' ? n.iconoApp(proceso) : null));
  return r ?? null;
}

export async function focusWindow(processName: string): Promise<boolean> {
  const r = intentarNativo('focusWindow', (n) => n.focusWindow(processName));
  if (r !== undefined) return r;
  return snapWindow('restore', processName);
}

export async function closeWindow(processName?: string): Promise<boolean> {
  const r = intentarNativo('closeWindow', (n) => n.closeWindow(processName));
  if (r !== undefined) return r;

  const pname = (processName ?? '').replace(/\.exe$/i, '').trim();
  const script = `
param([string]$Pname)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WinClose {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
}
'@
$hw = if ($Pname) { (Get-Process -Name $Pname -EA SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1).MainWindowHandle } else { [WinClose]::GetForegroundWindow() }
if ($hw -and $hw -ne [IntPtr]::Zero) { [void][WinClose]::PostMessage($hw, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }
`;
  return runPSBool(script, { timeoutMs: 5000, args: [pname] });
}
