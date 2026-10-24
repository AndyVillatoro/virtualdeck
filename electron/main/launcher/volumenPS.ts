/**
 * Lectura y escritura del volumen en **una sola** definición C#. En el
 * PowerShell persistente los tipos de `Add-Type` viven lo que vive el proceso:
 * con dos definiciones que declaraban su propio `MMDev`, la segunda compilaba
 * pero fallaba al convertir «`MMDev` a `MMDev`», y `setVolume` caía siempre
 * al proceso suelto.
 */
export const VOLUMEN_PS = `
function Asegurar-Tipo($nombre, $definicion) {
  try { Add-Type -TypeDefinition $definicion } catch {
    $existe = $false
    try { Invoke-Expression "[$nombre] | Out-Null"; $existe = $true } catch {}
    if (-not $existe) { throw }
  }
}
Asegurar-Tipo 'VolumenVD' @'
using System;
using System.Runtime.InteropServices;
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"), ComImport] class VdMMDev {}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IVdMMDevEnum { void R(); [return:MarshalAs(UnmanagedType.Interface)] object GetDefaultAudioEndpoint(int a, int b); }
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IVdMMDevice { [return:MarshalAs(UnmanagedType.Interface)] object Activate(ref Guid g, uint c, IntPtr p); }
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IVdAudioEndpointVolume {
  void NotImpl1(); void NotImpl2();
  int GetChannelCount(out uint c);
  int SetMasterVolumeLevel(float f, IntPtr g);
  int SetMasterVolumeLevelScalar(float f, IntPtr g);
  int GetMasterVolumeLevel(out float f);
  int GetMasterVolumeLevelScalar(out float f);
}
public class VolumenVD {
  static IVdAudioEndpointVolume Salida() {
    var e = (IVdMMDevEnum)(new VdMMDev() as object);
    var d = (IVdMMDevice)e.GetDefaultAudioEndpoint(0, 1);
    var g = typeof(IVdAudioEndpointVolume).GUID;
    return (IVdAudioEndpointVolume)d.Activate(ref g, 1, IntPtr.Zero);
  }
  public static float Get() { float f; Salida().GetMasterVolumeLevelScalar(out f); return f; }
  public static void Set(float v) { Salida().SetMasterVolumeLevelScalar(v, IntPtr.Zero); }
}
'@
`;
