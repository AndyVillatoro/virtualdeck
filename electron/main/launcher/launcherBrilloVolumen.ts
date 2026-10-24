import { intentarNativo } from '../sistema/native';
import { BrowserWindow } from 'electron';
import { runPS } from './ps-helpers';
import type { PSResult } from './ps-helpers';
import { ejecutarPSPersistente } from './psPersistente';
import { VOLUMEN_PS } from './volumenPS';

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

/** Intenta ejecutar por PowerShell persistente; si falla, cae a runPS. */
async function ejecutarConRespaldo(script: string, timeoutMs: number): Promise<PSResult> {
  const persistente = await ejecutarPSPersistente(script);
  if (persistente.ok) return persistente;
  return runPS(script, { timeoutMs });
}

/** La primera línea de la salida, que es donde el script deja el número. */
function primeraLinea(salida: string | undefined): string {
  return (salida ?? '').trim().split(/\r?\n/)[0] ?? '';
}

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
$__vd_pct = ${pct}
function Asegurar-Tipo($nombre, $definicion) {
  try { Add-Type -TypeDefinition $definicion } catch {
    $existe = $false
    try { Invoke-Expression "[$nombre] | Out-Null"; $existe = $true } catch {}
    if (-not $existe) { throw }
  }
}
function Set-BrilloVD {
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
      Asegurar-Tipo 'DdcWriter' @'
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
'@
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
}
Set-BrilloVD -Pct $__vd_pct
`;

  const res = await ejecutarConRespaldo(script, 10000);
  const ok = res.ok && primeraLinea(res.stdout) === 'OK';
  ultimoBrilloConocido = pct;
  if (ok) emitirCambioBrillo(pct);
  return ok;
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

  const script = `
function Asegurar-Tipo($nombre, $definicion) {
  try { Add-Type -TypeDefinition $definicion } catch {
    $existe = $false
    try { Invoke-Expression "[$nombre] | Out-Null"; $existe = $true } catch {}
    if (-not $existe) { throw }
  }
}
function Get-BrilloVD {
  # 1. WinRT BrightnessOverride (Surface Pro 8 / portátiles modernos)
  try {
    [Windows.Graphics.Display.BrightnessOverride, Windows.Graphics.Display, ContentType = WindowsRuntime] | Out-Null
    $bo = [Windows.Graphics.Display.BrightnessOverride]::GetDefaultForSystem()
    if ($bo -and $bo.IsSupported) {
      $lvl = [math]::Round($bo.BrightnessLevel * 100)
      Write-Output $lvl
      return
    }
  } catch {}

  # 2. DDC/CI (dxva2.dll)
  try {
    Asegurar-Tipo 'DdcReader' @'
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
'@
    $d = [DdcReader]::ReadFirst()
    if ($d -ge 0) {
      Write-Output $d
      return
    }
  } catch {}

  # 3. WMI clásico
  try {
    $b = Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness -ErrorAction SilentlyContinue
    if ($b -and $b.CurrentBrightness -ne $null) {
      Write-Output $b.CurrentBrightness
      return
    }
  } catch {}
}
Get-BrilloVD
`;

  const res = await ejecutarConRespaldo(script, 8000);
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

  const res = await ejecutarConRespaldo(`${VOLUMEN_PS}\nWrite-Output ([VolumenVD]::Get())\n`, 8000);
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

  // `p` es un entero 0..100 ya acotado: interpolarlo no abre inyección.
  const res = await ejecutarConRespaldo(`${VOLUMEN_PS}\n[VolumenVD]::Set(${p} / 100.0)\n`, 15000);
  const ok = res.ok;
  if (ok) emitirCambioVolumen(p);
  return ok;
}
