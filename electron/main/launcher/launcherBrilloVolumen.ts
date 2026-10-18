import { intentarNativo } from '../sistema/native';
import { BrowserWindow } from 'electron';
import { runPS, runPSBool } from './ps-helpers';

function emitirCambioVolumen(vol: number): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('audio:volumeChanged', vol);
    }
  }
}

function emitirCambioBrillo(bri: number): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('window:brightnessChanged', bri);
    }
  }
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
    emitirCambioBrillo(pct);
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
  if (ok) emitirCambioBrillo(pct);
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

export async function setVolume(percent: number): Promise<boolean> {
  const p = Math.min(100, Math.max(0, Math.round(percent)));
  const r = intentarNativo('setVolume', (n) => n.setVolume(p));
  if (r !== undefined) {
    if (r) emitirCambioVolumen(p);
    return r;
  }

  const script = `
param([int]$Percent)
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
    ((IAudioVol)d.Activate(ref g, 1, IntPtr.Zero)).SetMasterVolumeLevelScalar(v, IntPtr.Zero);
  }
}
'@
$v = [Math]::Max(0.0f, [Math]::Min(1.0f, [float]$Percent / 100.0f))
[AudioCtrl]::SetVol($v)
`;
  const ok = await runPSBool(script, { timeoutMs: 15000, args: [String(p)] });
  if (ok) emitirCambioVolumen(p);
  return ok;
}
