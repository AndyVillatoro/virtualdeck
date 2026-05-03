import { exec } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
[Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig {
    [PreserveSig] int GetMixFormat(string s, IntPtr p);
    [PreserveSig] int GetDeviceFormat(string s, bool b, IntPtr p);
    [PreserveSig] int ResetDeviceFormat(string s);
    [PreserveSig] int SetDeviceFormat(string s, IntPtr p1, IntPtr p2);
    [PreserveSig] int GetProcessingPeriod(string s, bool b, IntPtr p1, IntPtr p2);
    [PreserveSig] int SetProcessingPeriod(string s, IntPtr p);
    [PreserveSig] int GetShareMode(string s, IntPtr p);
    [PreserveSig] int SetShareMode(string s, IntPtr p);
    [PreserveSig] int GetPropertyValue(string s, bool b, IntPtr p1, IntPtr p2);
    [PreserveSig] int SetPropertyValue(string s, bool b, IntPtr p1, IntPtr p2);
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, uint role);
    [PreserveSig] int SetEndpointVisibility(string s, bool b);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"), ClassInterface(ClassInterfaceType.None)]
class MMDeviceEnumeratorCom {}
[ComImport, Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9"), ClassInterface(ClassInterfaceType.None)]
class PolicyConfigClientCom {}
[ComImport, Guid("294935CE-F637-4E7C-A41B-AB255460B862"), ClassInterface(ClassInterfaceType.None)]
class PolicyConfigVistaClientCom {}

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
    public static string SetDefault(string deviceId) {
        try {
            var cfg = (IPolicyConfig)(object)new PolicyConfigClientCom();
            cfg.SetDefaultEndpoint(deviceId, 0);
            cfg.SetDefaultEndpoint(deviceId, 1);
            cfg.SetDefaultEndpoint(deviceId, 2);
            return "OK";
        } catch {
            try {
                var cfg2 = (IPolicyConfig)(object)new PolicyConfigVistaClientCom();
                cfg2.SetDefaultEndpoint(deviceId, 0);
                cfg2.SetDefaultEndpoint(deviceId, 1);
                cfg2.SetDefaultEndpoint(deviceId, 2);
                return "OK";
            } catch (Exception ex2) {
                return "ERROR:" + ex2.Message;
            }
        }
    }
}
`.trim();

function runPS(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmp = join(tmpdir(), `vd_ps_${Date.now()}.ps1`);
    // BOM + UTF-8 header so PowerShell parses accents in the script and emits UTF-8 stdout.
    const header = '﻿[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n';
    writeFileSync(tmp, header + script, 'utf-8');
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -NonInteractive -File "${tmp}"`,
      { timeout: 15000, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        try { unlinkSync(tmp); } catch {}
        if (err && !stdout) reject(new Error(stderr || err.message));
        else resolve(stdout.trim());
      }
    );
  });
}

export async function listAudioDevices(): Promise<AudioDevice[]> {
  const script = `
Add-Type -TypeDefinition @"
${AUDIO_CS}
"@ -IgnoreWarnings -ErrorAction SilentlyContinue
$devices = [VDAudio]::ListDevices()
foreach ($d in $devices) { Write-Output "$($d[0])|$($d[1])|$($d[2])" }
`;
  try {
    const output = await runPS(script);
    if (!output) return [];
    return output.split('\n').filter(Boolean).map((line) => {
      const parts = line.split('|');
      return {
        id: parts[0]?.trim() ?? '',
        name: parts[1]?.trim() ?? 'Dispositivo',
        isDefault: parts[2]?.trim() === 'true',
      };
    }).filter((d) => d.id !== '__ERROR__');
  } catch (e) {
    console.error('[audio] listAudioDevices failed:', e);
    return [];
  }
}

export async function setDefaultAudioDevice(deviceId: string): Promise<boolean> {
  const safeId = deviceId.replace(/"/g, '').replace(/`/g, '');
  const script = `
Add-Type -TypeDefinition @"
${AUDIO_CS}
"@ -IgnoreWarnings -ErrorAction SilentlyContinue
$result = [VDAudio]::SetDefault("${safeId}")
Write-Output $result
`;
  try {
    const out = await runPS(script);
    if (!out.startsWith('OK')) console.error('[audio] setDefault result:', out);
    return out.startsWith('OK');
  } catch (e) {
    console.error('[audio] setDefaultAudioDevice failed:', e);
    return false;
  }
}
