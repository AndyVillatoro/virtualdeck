import { runPS } from './ps-helpers';

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
}

// C# embedded in PowerShell: uses Windows Core Audio COM API
// Works on Windows 10 and 11 without any external tools or modules
const AUDIO_CS = `
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IMMDeviceCollection ppDevices);
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
    [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);
    [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr pClient);
    [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr pClient);
}
[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceCollection {
    [PreserveSig] int GetCount(out uint pcDevices);
    [PreserveSig] int Item(uint nDevice, out IMMDevice ppDevice);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IntPtr ppInterface);
    [PreserveSig] int OpenPropertyStore(int stgmAccess, out IPropertyStore ppProperties);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
    [PreserveSig] int GetState(out int pdwState);
}
[Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
    [PreserveSig] int GetCount(out int cProps);
    [PreserveSig] int GetAt(int iProp, out PropertyKey pkey);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant pv);
    [PreserveSig] int SetValue(ref PropertyKey key, ref PropVariant propvar);
    [PreserveSig] int Commit();
}
[StructLayout(LayoutKind.Sequential)]
public struct PropertyKey { public Guid fmtid; public int pid; }
[StructLayout(LayoutKind.Explicit)]
public struct PropVariant {
    [FieldOffset(0)] public short vt;
    [FieldOffset(8)] public IntPtr pointerValue;
}
// IID for the modern IPolicyConfig interface (Win 7+ / 10 / 11). The previous
// value (870AF99C-...) is the *class* CLSID, not the interface IID — using it
// here makes QueryInterface return E_NOINTERFACE on current Windows builds.
// Method order/signature must match the undocumented vtable exactly.
// IPolicyConfig (Windows 7+) — interfaz "moderna". El layout y orden de la
// vtable debe coincidir 1:1 con la API no documentada de Windows. Si MSFT
// rompe esto en una build futura habrá que revisar SoundSwitch / EarTrumpet.
[Guid("F8679F50-850A-41CF-9C72-430F290290C8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig {
    [PreserveSig] int GetMixFormat(string s, IntPtr p);
    [PreserveSig] int GetDeviceFormat(string s, bool b, IntPtr p);
    [PreserveSig] int ResetDeviceFormat(string s);
    [PreserveSig] int SetDeviceFormat(string s, IntPtr p1, IntPtr p2);
    [PreserveSig] int GetProcessingPeriod(string s, bool b, IntPtr p1, IntPtr p2);
    [PreserveSig] int SetProcessingPeriod(string s, IntPtr p);
    [PreserveSig] int GetShareMode(string s, IntPtr p);
    [PreserveSig] int SetShareMode(string s, IntPtr p);
    [PreserveSig] int GetPropertyValue(string s, IntPtr key, IntPtr p1);
    [PreserveSig] int SetPropertyValue(string s, IntPtr key, IntPtr p1);
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, uint role);
    [PreserveSig] int SetEndpointVisibility(string s, bool b);
}
// IPolicyConfigVista — fallback usado por algunas builds Win10/11 donde el
// QueryInterface por IPolicyConfig devuelve E_NOINTERFACE. Tiene el mismo
// SetDefaultEndpoint pero sin SetEndpointVisibility al final.
[Guid("568b9108-44bf-40b4-9006-86afe5b5a620"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfigVista {
    [PreserveSig] int GetMixFormat(string s, IntPtr p);
    [PreserveSig] int GetDeviceFormat(string s, bool b, IntPtr p);
    [PreserveSig] int SetDeviceFormat(string s, IntPtr p1, IntPtr p2);
    [PreserveSig] int GetProcessingPeriod(string s, bool b, IntPtr p1, IntPtr p2);
    [PreserveSig] int SetProcessingPeriod(string s, IntPtr p);
    [PreserveSig] int GetShareMode(string s, IntPtr p);
    [PreserveSig] int SetShareMode(string s, IntPtr p);
    [PreserveSig] int GetPropertyValue(string s, IntPtr key, IntPtr p1);
    [PreserveSig] int SetPropertyValue(string s, IntPtr key, IntPtr p1);
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, uint role);
    [PreserveSig] int SetEndpointVisibility(string s, bool b);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"), ClassInterface(ClassInterfaceType.None)]
class MMDeviceEnumeratorCom {}
[ComImport, Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9"), ClassInterface(ClassInterfaceType.None)]
class PolicyConfigClientCom {}

public class VDAudio {
    static PropertyKey FriendlyName = new PropertyKey {
        fmtid = new Guid("A45C254E-DF1C-4EFD-8020-67D146A850E0"), pid = 14
    };
    public static List<string[]> ListDevices() {
        var result = new List<string[]>();
        try {
            var enumerator = (IMMDeviceEnumerator)(object)new MMDeviceEnumeratorCom();
            IMMDeviceCollection col; enumerator.EnumAudioEndpoints(0, 1, out col);
            uint count; col.GetCount(out count);
            IMMDevice def; enumerator.GetDefaultAudioEndpoint(0, 1, out def);
            string defId; def.GetId(out defId);
            for (uint i = 0; i < count; i++) {
                IMMDevice dev; col.Item(i, out dev);
                string id; dev.GetId(out id);
                IPropertyStore store; dev.OpenPropertyStore(0, out store);
                PropVariant pv = new PropVariant(); var key = FriendlyName;
                store.GetValue(ref key, out pv);
                string name = Marshal.PtrToStringAuto(pv.pointerValue) ?? "Desconocido";
                result.Add(new string[]{ id, name, id == defId ? "true" : "false" });
            }
        } catch (Exception ex) {
            result.Add(new string[]{ "__ERROR__", ex.Message, "false" });
        }
        return result;
    }
    static bool TrySet(IPolicyConfig cfg, string deviceId, out string err) {
        int h0 = cfg.SetDefaultEndpoint(deviceId, 0);
        int h1 = cfg.SetDefaultEndpoint(deviceId, 1);
        int h2 = cfg.SetDefaultEndpoint(deviceId, 2);
        if (h0 >= 0 && h1 >= 0 && h2 >= 0) { err = null; return true; }
        err = "policy-hr=" + h0.ToString("X8") + "," + h1.ToString("X8") + "," + h2.ToString("X8");
        return false;
    }
    static bool TrySetVista(IPolicyConfigVista cfg, string deviceId, out string err) {
        int h0 = cfg.SetDefaultEndpoint(deviceId, 0);
        int h1 = cfg.SetDefaultEndpoint(deviceId, 1);
        int h2 = cfg.SetDefaultEndpoint(deviceId, 2);
        if (h0 >= 0 && h1 >= 0 && h2 >= 0) { err = null; return true; }
        err = "vista-hr=" + h0.ToString("X8") + "," + h1.ToString("X8") + "," + h2.ToString("X8");
        return false;
    }
    static string GetDefaultId() {
        try {
            var enumerator = (IMMDeviceEnumerator)(object)new MMDeviceEnumeratorCom();
            IMMDevice def; enumerator.GetDefaultAudioEndpoint(0, 1, out def);
            string id; def.GetId(out id);
            return id;
        } catch { return ""; }
    }

    public static string SetDefault(string deviceId) {
        // Roles: 0=Console (default for sound), 1=Multimedia, 2=Communications.
        // Win 7+ usa IPolicyConfig; algunas builds de Win10/11 sólo aceptan
        // IPolicyConfigVista. [PreserveSig] = los HRESULT vuelven como int.
        if (string.IsNullOrEmpty(deviceId)) return "ERROR:empty-deviceId";

        object com = null;
        try { com = new PolicyConfigClientCom(); }
        catch (Exception ex) { return "ERROR:cocreate-failed:" + ex.Message; }

        string err1 = null, err2 = null;
        bool ok = false;
        IPolicyConfig cfg = com as IPolicyConfig;
        if (cfg != null) {
            ok = TrySet(cfg, deviceId, out err1);
        }
        if (!ok) {
            IPolicyConfigVista vista = com as IPolicyConfigVista;
            if (vista != null) {
                ok = TrySetVista(vista, deviceId, out err2);
            }
        }
        if (!ok) {
            string both = (err1 ?? "no-IPolicyConfig") + " | " + (err2 ?? "no-IPolicyConfigVista");
            return "ERROR:" + both;
        }

        // Verificar que el default realmente cambió. Algunas combinaciones de
        // driver/Windows aceptan el HRESULT sin aplicar el cambio.
        string actualId = GetDefaultId();
        if (string.Equals(actualId, deviceId, StringComparison.OrdinalIgnoreCase)) return "OK";
        return "ERROR:not-applied (default sigue siendo " + (actualId ?? "<null>") + ")";
    }
}
`.trim();

export async function listAudioDevices(): Promise<AudioDevice[]> {
  const script = `
Add-Type -TypeDefinition @"
${AUDIO_CS}
"@ -IgnoreWarnings -ErrorAction SilentlyContinue
$devices = [VDAudio]::ListDevices()
foreach ($d in $devices) { Write-Output "$($d[0])|$($d[1])|$($d[2])" }
`;
  const r = await runPS(script, { timeoutMs: 15000, maxBufferBytes: 4 * 1024 * 1024 });
  if (!r.ok && !r.stdout) {
    if (r.stderr) console.error('[audio] listAudioDevices failed:', r.stderr);
    return [];
  }
  if (!r.stdout) return [];
  return r.stdout.split('\n').filter(Boolean).map((line) => {
    const parts = line.split('|');
    return {
      id: parts[0]?.trim() ?? '',
      name: parts[1]?.trim() ?? 'Dispositivo',
      isDefault: parts[2]?.trim() === 'true',
    };
  }).filter((d) => d.id !== '__ERROR__');
}

export async function setDefaultAudioDevice(deviceId: string): Promise<boolean> {
  // deviceId arrives via param() — never interpolated into the script body —
  // so PowerShell's $-expansion can't be abused to inject commands.
  const script = `
param([string]$Id)
Add-Type -TypeDefinition @"
${AUDIO_CS}
"@ -IgnoreWarnings -ErrorAction SilentlyContinue
$result = [VDAudio]::SetDefault($Id)
Write-Output $result
`;
  const r = await runPS(script, { timeoutMs: 15000, args: [deviceId] });
  const out = (r.stdout || '').trim();
  if (!out.startsWith('OK')) {
    // Always log the diagnostic — useful when reporting the issue.
    console.error('[audio] setDefault failed for deviceId=', deviceId);
    console.error('[audio]   stdout:', out || '(empty)');
    if (r.stderr) console.error('[audio]   stderr:', r.stderr.slice(0, 500));
    return false;
  }
  return true;
}
