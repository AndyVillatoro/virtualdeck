import { useEffect, useState } from 'react';
import { findSensor, evalCondition } from './sensors';
import type { ButtonConfig, RGBStatus, Sensor } from '../types';

/**
 * Lo que el deck sabe del sistema: qué salida de audio manda, qué procesos
 * corren y cómo está el RGB.
 *
 * Vivía dentro de `MainB`, junto con las dos funciones que lo interpretan
 * (`isButtonActive` e `isButtonVisible`). `FullscreenB` no tenía ninguna de
 * las tres, así que en kiosko:
 *
 * - un botón con «visible solo si corre tal aplicación» **salía siempre**
 *   (medido: la principal lo ocultaba y kiosko lo mostraba),
 * - y el anillo del dispositivo de audio activo no se pintaba.
 *
 * Las dos pantallas se turnan en la misma ventana —kiosko sustituye a la
 * principal, no conviven— así que compartir el sondeo no duplica nada: hay
 * exactamente uno, el de la pantalla que esté montada.
 */

export interface EstadoSistema {
  rgbStatus: RGBStatus | null;
  activeAudioDeviceId: string | null;
  runningProcesses: Set<string>;
}

/**
 * `C:\Programas\obs64.exe --startvirtualcam` -> `obs64`.
 *
 * Copiada tal cual de `MainB`: recorta los argumentos que vengan detras y
 * acepta .lnk/.bat/.cmd ademas de .exe. Simplificarla cambiaria en silencio
 * que botones se ven como activos.
 */
export function extractExeName(appPath: string): string | null {
  if (!appPath) return null;
  const seg = appPath.split(/[/\\]/).pop() ?? appPath;
  return seg.replace(/\s.*$/, '').replace(/\.(exe|lnk|bat|cmd)$/i, '').toLowerCase() || null;
}

/**
 * Un tic de 5 s para las tres cosas a la vez.
 *
 * Un solo intervalo y un solo `Promise.all` cuestan menos que tres: menos idas
 * y venidas por IPC y un único repintado cuando llegan. El RGB además se
 * refresca en cuanto el proceso principal avisa de un cambio de dispositivos.
 */
export function useEstadoSistema(api: typeof window.electronAPI | null | undefined): EstadoSistema {
  const [rgbStatus, setRgbStatus] = useState<RGBStatus | null>(null);
  const [activeAudioDeviceId, setActiveAudioDeviceId] = useState<string | null>(null);
  const [runningProcesses, setRunningProcesses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!api) return;
    let cancelado = false;
    const tic = async () => {
      const [rgb, audio, procesos] = await Promise.all([
        api.rgb.status().catch(() => null),
        api.audio.list().catch(() => []),
        api.state.activeApps().catch(() => [] as string[]),
      ]);
      if (cancelado) return;
      setRgbStatus(rgb ?? null);
      setActiveAudioDeviceId(audio.find((d) => d.isDefault)?.id ?? null);
      setRunningProcesses(new Set(procesos));
    };
    tic();
    const t = setInterval(tic, 5000);
    const off = api.events.onRGBDevicesChanged?.(() => { tic(); });
    return () => { cancelado = true; clearInterval(t); off?.(); };
  }, [api]);

  return { rgbStatus, activeAudioDeviceId, runningProcesses };
}

/** El botón representa algo que ya está puesto: la salida de audio, una app abierta. */
export function botonActivo(b: ButtonConfig, e: EstadoSistema): boolean {
  const a = b.action;
  if (a.type === 'audio-device' && a.deviceId) return a.deviceId === e.activeAudioDeviceId;
  if (a.type === 'app' && a.appPath) {
    const nombre = extractExeName(a.appPath);
    return !!nombre && e.runningProcesses.has(nombre);
  }
  if (a.type === 'kill-process' && a.processName) {
    return e.runningProcesses.has(a.processName.replace(/\.exe$/i, '').toLowerCase());
  }
  return false;
}

/** Visibilidad condicional: por aplicación en primer plano o por sensor. */
export function botonVisible(b: ButtonConfig, e: EstadoSistema, sensores: Sensor[]): boolean {
  const v = b.visibleIf;
  if (!v) return true;
  if (v.app) {
    const nombre = v.app.replace(/\.exe$/i, '').toLowerCase();
    if (!e.runningProcesses.has(nombre)) return false;
  }
  if (v.sensor) {
    const s = findSensor(v.sensor.id, sensores);
    // Sin dato todavía → se mantiene oculto, que es lo mismo que «la condición
    // no se cumple». Mejor eso que enseñarlo un instante en cada recarga.
    if (!s) return false;
    if (!evalCondition(v.sensor, s.value)) return false;
  }
  return true;
}
