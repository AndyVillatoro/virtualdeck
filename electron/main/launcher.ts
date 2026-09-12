import { intentarNativo } from './native';
import { exec, spawn } from 'child_process';
import { shell } from 'electron';
import { runPS, runPSBool, runCmd, injectUtf8Prefix } from './ps-helpers';

/**
 * Lanza un programa. Camino de respaldo cuando no hay nucleo nativo.
 *
 * **Sin `shell: true`.** Lo tenia, y con eso la ruta pasaba por `cmd.exe`, que
 * la parte por los espacios. Medido con un ejecutable en
 * `...\carpeta con espacios\mi app.exe`:
 *
 *   shell: true   ->  «"C:\Users\..." no se reconoce como un comando»
 *   shell: false  ->  arranca
 *
 * O sea que **cualquier programa en `C:\Program Files\...`** —la mayoria— no se
 * abria por este camino. Y el `resolve(true)` era incondicional: el fallo pasa
 * en el proceso hijo, asi que el boton decia que habia ido bien y no pasaba
 * nada. Sin `shell`, Node entrecomilla los argumentos por su cuenta, y ademas
 * desaparece la puerta que abria: con `cmd` de por medio, un `&` o un `|` en la
 * ruta o en los argumentos —los trae quien escribio el perfil, que puede no ser
 * el usuario— se ejecutaban como ordenes.
 *
 * Los `.bat` y `.cmd` **si** necesitan interprete: Node ya no los lanza
 * directamente. Ahi se llama a `cmd.exe /c` con la ruta como argumento aparte,
 * que Node entrecomilla igualmente.
 */
export async function launchApp(appPath: string, args: string[] = []): Promise<boolean> {
  const r = intentarNativo('launchApp', (n) => n.launchApp(appPath, args));
  if (r !== undefined) return r;

  return new Promise((resolve) => {
    try {
      const esLote = /\.(bat|cmd)$/i.test(appPath.trim());
      const child = esLote
        ? spawn('cmd.exe', ['/c', appPath, ...args], { detached: true, stdio: 'ignore', windowsHide: true })
        : spawn(appPath, args, { detached: true, stdio: 'ignore' });
      // `spawn` no lanza al fallar: avisa por el evento. Sin esto, «no existe
      // ese programa» se contaba como exito.
      child.on('error', () => resolve(false));
      child.on('spawn', () => { child.unref(); resolve(true); });
    } catch {
      resolve(false);
    }
  });
}

export async function openShortcut(path: string): Promise<boolean> {
  const r = intentarNativo('openShortcut', (n) => n.openPath(path));
  if (r !== undefined) return r;

  try { await shell.openPath(path); return true; } catch { return false; }
}

/**
 * El preambulo UTF-8, antes de decidir por que camino va el script.
 *
 * El nucleo nativo lanza `powershell -Command <script>` y lee la salida con
 * `from_utf8_lossy`, pero **no inyecta el preambulo**: PowerShell escribe en la
 * pagina de codigos de la consola, esos bytes no son UTF-8 validos y cada
 * acento volvia como el caracter de reemplazo. Medido con la accion «script»
 * que guarda la salida en una variable:
 *
 *   esperado       Hola ¿qué? Añadí más música
 *   sin preambulo  Hola ?qu?? A?ad? m?s m?sica
 *   con preambulo  Hola ¿qué? Añadí más música
 *
 * El arreglo de raiz esta en `crates/vd-core`, que ahora mismo no se puede
 * recompilar. Inyectarlo aqui lo arregla con el `.node` que ya hay, y no le
 * hace nada al camino de respaldo porque `injectUtf8Prefix` es idempotente.
 *
 * Solo para PowerShell: en `cmd` esas tres lineas no son sintaxis valida.
 */
function conUtf8(script: string, shell_: string): string {
  return shell_ === 'powershell' ? injectUtf8Prefix(script) : script;
}

/**
 * Abre «Configuración de la tableta» del Panel de control.
 *
 * Es la herramienta donde Windows pregunta **cuál de los monitores responde al
 * tacto**. Hace falta en cuanto hay más de una pantalla: sin ese mapeo, tocar
 * la tableta mueve el cursor en el monitor equivocado, y VirtualDeck en modo
 * kiosko sobre una pantalla táctil se vuelve inservible. No es algo que
 * VirtualDeck pueda arreglar por su cuenta: el mapeo lo guarda Windows.
 *
 * `control /name Microsoft.TabletPCSettings` es el nombre canónico; comprobado
 * en el registro, resuelve a
 * `rundll32 shell32.dll,Control_RunDLL tabletpc.cpl @1`. Ese es el respaldo por
 * si `control.exe` no acepta el nombre en alguna edición de Windows.
 *
 * Si el equipo no tiene digitalizador, la herramienta puede no existir; por eso
 * se devuelve si abrió o no, en vez de fallar en silencio.
 */
export async function abrirAjustesTactiles(): Promise<boolean> {
  const intentos: [string, string[]][] = [
    ['control.exe', ['/name', 'Microsoft.TabletPCSettings']],
    ['rundll32.exe', ['shell32.dll,Control_RunDLL', 'tabletpc.cpl', '@1']],
  ];
  for (const [cmd, args] of intentos) {
    const ok = await new Promise<boolean>((resolve) => {
      try {
        const hijo = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: false });
        hijo.on('error', () => resolve(false));
        // `control.exe` termina en cuanto delega en el panel, asi que no se
        // puede esperar a su codigo de salida: si no ha fallado al arrancar,
        // se da por bueno.
        setTimeout(() => resolve(true), 400);
      } catch { resolve(false); }
    });
    if (ok) return true;
  }
  return false;
}

export async function runScript(script: string, shell_: string = 'powershell'): Promise<boolean> {
  const listo = conUtf8(script, shell_);
  const r = intentarNativo('runScript', (n) => n.runScript(listo, shell_).success);
  if (r !== undefined) return r;

  // Los dos van por su ayudante, que escribe un archivo temporal. El comentario
  // que habia aqui decia que los de `cmd` son «one-liners del usuario»; el
  // editor ofrece un area de texto de varias lineas, y de esas solo corria la
  // primera.
  if (shell_ === 'powershell') return runPSBool(listo, { timeoutMs: 30000 });
  return (await runCmd(listo, { timeoutMs: 30000 })).ok;
}

export async function runScriptCapture(script: string, shell_: string = 'powershell'): Promise<{ success: boolean; output: string }> {
  const listo = conUtf8(script, shell_);
  const r = intentarNativo('runScriptCapture', (n) => n.runScript(listo, shell_));
  if (r !== undefined) return r;

  if (shell_ === 'powershell') {
    const r = await runPS(listo, { timeoutMs: 30000 });
    return { success: r.ok, output: (r.stdout || r.stderr || '').trim() };
  }
  // `cmd` va por `runCmd`, que escribe un `.bat` de verdad. Con `exec(script)`
  // —que le pasa la cadena entera a `cmd /c`— de un script de varias lineas
  // **solo corria la primera**, y los acentos volvian rotos.
  const r2 = await runCmd(listo, { timeoutMs: 30000 });
  return { success: r2.ok, output: (r2.stdout || r2.stderr || '').trim() };
}

/**
 * Último brillo conocido (0..100). Permite calcular ajustes relativos (+/- 10%)
 * con resiliencia en pantallas donde DDC/CI soporta escritura pero falla en lectura,
 * o cuando se usa hardware pasivo.
 */
let ultimoBrilloConocido: number | null = null;

export async function setBrightness(level: number): Promise<boolean> {
  const pct = Math.min(100, Math.max(0, Math.round(level)));

  // Intentar primero el núcleo nativo en Rust (rápido, sin procesos externos)
  const r = intentarNativo('setBrightness', (n) => n.setBrightness(pct));
  if (r === true) {
    ultimoBrilloConocido = pct;
    return true;
  }

  // Fallback multi-nivel:
  // 1. WinRT BrightnessOverride: Surface Pro 8 y portátiles modernos Intel Xe / AMD
  // 2. DDC/CI (dxva2.dll): monitores externos de escritorio
  // 3. WMI clásico: WmiMonitorBrightnessMethods en root\wmi
  const script = `
param([int]$Pct)
$aplicado = $false

# 1. WinRT BrightnessOverride (Surface Pro 8 y equipos con pantalla moderna)
try {
  [Windows.Graphics.Display.BrightnessOverride, Windows.Graphics.Display, ContentType = WindowsRuntime] | Out-Null
  $bo = [Windows.Graphics.Display.BrightnessOverride]::GetDefaultForSystem()
  if ($bo -and $bo.IsSupported) {
    $bo.StartOverride()
    $opt = [Windows.Graphics.Display.DisplayBrightnessOverrideOptions]::None
    $bo.SetBrightnessLevel($Pct / 100.0, $opt)
    $aplicado = $true
  }
} catch {}

# 2. DDC/CI para monitores externos
if (-not $aplicado) {
  try {
    Add-Type -TypeDefinition @'
    using System;
    using System.Runtime.InteropServices;
    using System.Threading;
    public class DdcWriter {
      [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
      public struct PHYSICAL_MONITOR {
        public IntPtr hPhysicalMonitor;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
        public string sz;
      }
      [DllImport("user32.dll")]
      public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumProc lpfn, IntPtr dwData);
      public delegate bool MonitorEnumProc(IntPtr hMon, IntPtr hdcMon, IntPtr lprcMon, IntPtr dwData);
      [DllImport("dxva2.dll", SetLastError = true)]
      public static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMon, ref uint pCount);
      [DllImport("dxva2.dll", SetLastError = true)]
      public static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMon, uint count, [Out] PHYSICAL_MONITOR[] pArray);
      [DllImport("dxva2.dll", SetLastError = true)]
      public static extern bool SetMonitorBrightness(IntPtr hMon, uint dwNew);
      [DllImport("dxva2.dll", SetLastError = true)]
      public static extern bool DestroyPhysicalMonitors(uint count, PHYSICAL_MONITOR[] pArray);

      public static int SetAll(uint level) {
        int ok = 0;
        EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, delegate(IntPtr hMon, IntPtr hdc, IntPtr lprc, IntPtr data) {
          uint c = 0;
          if (GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, ref c) && c > 0) {
            PHYSICAL_MONITOR[] mons = new PHYSICAL_MONITOR[c];
            if (GetPhysicalMonitorsFromHMONITOR(hMon, c, mons)) {
              for (int i = 0; i < c; i++) {
                if (SetMonitorBrightness(mons[i].hPhysicalMonitor, level)) {
                  ok++;
                } else {
                  Thread.Sleep(40);
                  if (SetMonitorBrightness(mons[i].hPhysicalMonitor, level)) ok++;
                }
              }
              DestroyPhysicalMonitors(c, mons);
            }
          }
          return true;
        }, IntPtr.Zero);
        return ok;
      }
    }
'@ -ErrorAction SilentlyContinue
    if ([DdcWriter]::SetAll($Pct) -gt 0) {
      $aplicado = $true
    }
  } catch {}
}

# 3. WMI clásico (paneles de generaciones anteriores)
if (-not $aplicado) {
  try {
    $m = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue
    if ($m) {
      $m.WmiSetBrightness(1, $Pct)
      $aplicado = $true
    }
  } catch {}
}

if ($aplicado) { Write-Output "OK" }
`;

  const ok = await runPSBool(script, { timeoutMs: 10000, args: [String(pct)] });
  ultimoBrilloConocido = pct;
  return ok;
}

/** La primera línea de la salida, que es donde el script deja el número. */
function primeraLinea(salida: string | undefined): string {
  return (salida ?? '').trim().split(/\r?\n/)[0] ?? '';
}

/**
 * Brillo actual, 0..100, o `null` si el equipo no lo expone.
 *
 * Admite:
 * 1. Núcleo nativo (WMI, WinRT BrightnessOverride, DDC/CI).
 * 2. Fallback WinRT para Surface Pro 8 y portátiles modernos.
 * 3. Fallback DDC/CI para monitores externos.
 * 4. Fallback WMI clásico.
 * 5. Caché de último brillo conocido para resiliencia en pantallas donde
 *    la lectura DDC/CI falla pero la escritura funciona.
 */
export async function getBrightness(): Promise<number | null> {
  const r = intentarNativo('getBrightness', (n) => n.getBrightness());
  if (typeof r === 'number' && Number.isFinite(r)) {
    ultimoBrilloConocido = r;
    return r;
  }

  const res = await runPS(`
# 1. WinRT BrightnessOverride (Surface Pro 8 / portátiles modernos)
try {
  [Windows.Graphics.Display.BrightnessOverride, Windows.Graphics.Display, ContentType = WindowsRuntime] | Out-Null
  $bo = [Windows.Graphics.Display.BrightnessOverride]::GetDefaultForSystem()
  if ($bo -and $bo.IsSupported) {
    $lvl = [math]::Round($bo.BrightnessLevel * 100)
    Write-Output $lvl
    exit 0
  }
} catch {}

# 2. DDC/CI (dxva2.dll)
try {
  Add-Type -TypeDefinition @'
  using System;
  using System.Runtime.InteropServices;
  public class DdcReader {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    public struct PHYSICAL_MONITOR {
      public IntPtr hPhysicalMonitor;
      [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)]
      public string sz;
    }
    [DllImport("user32.dll")]
    public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumProc lpfn, IntPtr dwData);
    public delegate bool MonitorEnumProc(IntPtr hMon, IntPtr hdcMon, IntPtr lprcMon, IntPtr dwData);
    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetNumberOfPhysicalMonitorsFromHMONITOR(IntPtr hMon, ref uint pCount);
    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetPhysicalMonitorsFromHMONITOR(IntPtr hMon, uint count, [Out] PHYSICAL_MONITOR[] pArray);
    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool GetMonitorBrightness(IntPtr hMon, ref uint min, ref uint cur, ref uint max);
    [DllImport("dxva2.dll", SetLastError = true)]
    public static extern bool DestroyPhysicalMonitors(uint count, PHYSICAL_MONITOR[] pArray);

    public static int ReadFirst() {
      int result = -1;
      EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, delegate(IntPtr hMon, IntPtr hdc, IntPtr lprc, IntPtr data) {
        if (result >= 0) return false;
        uint c = 0;
        if (GetNumberOfPhysicalMonitorsFromHMONITOR(hMon, ref c) && c > 0) {
          PHYSICAL_MONITOR[] mons = new PHYSICAL_MONITOR[c];
          if (GetPhysicalMonitorsFromHMONITOR(hMon, c, mons)) {
            for (int i = 0; i < c; i++) {
              uint min = 0, cur = 0, max = 0;
              if (GetMonitorBrightness(mons[i].hPhysicalMonitor, ref min, ref cur, ref max)) {
                result = max > min ? (int)(((cur - min) * 100) / (max - min)) : (int)cur;
                break;
              }
            }
            DestroyPhysicalMonitors(c, mons);
          }
        }
        return result < 0;
      }, IntPtr.Zero);
      return result;
    }
  }
'@ -ErrorAction SilentlyContinue
  $d = [DdcReader]::ReadFirst()
  if ($d -ge 0) {
    Write-Output $d
    exit 0
  }
} catch {}

# 3. WMI clásico
try {
  $b = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness -ErrorAction SilentlyContinue
  if ($b -and $b.CurrentBrightness -ne $null) {
    Write-Output $b.CurrentBrightness
    exit 0
  }
} catch {}
`, { timeoutMs: 8000 });

  const n = parseInt(primeraLinea(res.stdout), 10);
  if (Number.isFinite(n)) {
    ultimoBrilloConocido = Math.min(100, Math.max(0, n));
    return ultimoBrilloConocido;
  }

  return ultimoBrilloConocido;
}

/** Volumen actual del dispositivo de salida por defecto, 0..100. */
export async function getVolume(): Promise<number | null> {
  const r = intentarNativo('getVolume', (n) => n.getVolume());
  if (r !== undefined) return r;

  const res = await runPS(`
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"), ComImport] class MMDev {}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevEnum { void R(); [return:MarshalAs(UnmanagedType.Interface)] object GetDefaultAudioEndpoint(int a, int b); }
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { [return:MarshalAs(UnmanagedType.Interface)] object Activate(ref Guid g, uint c, IntPtr p); }
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  void NotImpl1(); void NotImpl2();
  int GetChannelCount(out uint c);
  int SetMasterVolumeLevel(float f, ref Guid g);
  int SetMasterVolumeLevelScalar(float f, ref Guid g);
  int GetMasterVolumeLevel(out float f);
  int GetMasterVolumeLevelScalar(out float f);
}
public class VolLeer {
  public static float Get() {
    var e = (IMMDevEnum)(new MMDev() as object);
    var d = (IMMDevice)e.GetDefaultAudioEndpoint(0, 1);
    var g = typeof(IAudioEndpointVolume).GUID;
    var v = (IAudioEndpointVolume)d.Activate(ref g, 1, IntPtr.Zero);
    float f; v.GetMasterVolumeLevelScalar(out f); return f;
  }
}
'@
Write-Output ([VolLeer]::Get())
`, { timeoutMs: 8000 });
  const f = parseFloat(primeraLinea(res.stdout));
  return Number.isFinite(f) ? Math.min(100, Math.max(0, Math.round(f * 100))) : null;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const r = intentarNativo('copyToClipboard', (n) => n.copyToClipboard(text));
  if (r !== undefined) return r;

  // $Text arrives via param() — never interpolated, so PS string-escape rules
  // and `$()` subshell expansion don't apply.
  const script = `param([string]$Text)
Set-Clipboard -Value $Text`;
  return runPSBool(script, { timeoutMs: 10000, args: [text] });
}

export async function typeTextKeys(text: string): Promise<boolean> {
  const r = intentarNativo('typeTextKeys', (n) => n.typeText(text));
  if (r !== undefined) return r;

  // SendKeys metachars (+ ^ % ~ ( ) { } [ ]) must be wrapped — that's a
  // SendKeys-level concern, not a shell-level injection issue.
  const escaped = text.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);
  const script = `param([string]$Keys)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($Keys)`;
  return runPSBool(script, { timeoutMs: 10000, args: [escaped] });
}

export async function getRunningProcesses(): Promise<string[]> {
  const r = intentarNativo('getRunningProcesses', (n) => n.getRunningProcesses());
  if (r !== undefined && r.length > 0) return r;

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
  const r = intentarNativo('killProcess', (n) => n.killProcess(name));
  if (r !== undefined) return r;

  const safe = name.replace(/['"&|<>]/g, '').trim();
  if (!safe) return false;
  return new Promise((resolve) => {
    exec(`taskkill /IM "${safe}" /F`, { timeout: 10000 }, (err) => resolve(!err));
  });
}

export async function setVolume(percent: number): Promise<boolean> {
  const r = intentarNativo('setVolume', (n) => n.setVolume(Math.round(percent)));
  if (r !== undefined) return r;

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
  const r = intentarNativo('sendHotkey', (n) => n.sendHotkey(combo));
  if (r !== undefined) return r;

  const keys = buildSendKeys(combo);
  if (!keys) return false;
  const script = `param([string]$Keys)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait($Keys)`;
  return runPSBool(script, { timeoutMs: 10000, args: [keys] });
}
