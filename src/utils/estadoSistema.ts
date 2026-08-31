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

/** Lo que se enseña mientras no ha llegado la primera foto. */
const VACIO: EstadoSistema = { rgbStatus: null, activeAudioDeviceId: null, runningProcesses: new Set() };

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
function extractExeName(appPath: string): string | null {
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
/**
 * Se **suscribe** al estado que publica el proceso principal.
 *
 * Antes sondeaba desde aquí, con su propio `setInterval` y tres llamadas IPC
 * por tic. Eso ataba el dato a la ventana que tuviera el hook montado, y la
 * barra flotante —otra ventana, otro React— se quedaba sin él: un botón con
 * «visible solo si corre tal aplicación» se veía siempre allí, aunque el deck
 * lo ocultara.
 *
 * Ahora hay un solo sondeo, en el proceso principal, y todas las ventanas
 * reciben lo mismo. Se pide una foto al montar para no esperar al primer tic.
 */
export function useEstadoSistema(api: typeof window.electronAPI | null | undefined): EstadoSistema {
  const [estado, setEstado] = useState<EstadoSistema>(VACIO);

  useEffect(() => {
    if (!api) return;
    let cancelado = false;
    const adoptar = (crudo: unknown) => {
      const d = crudo as { rgbStatus?: RGBStatus | null; activeAudioDeviceId?: string | null; runningProcesses?: string[] } | null;
      if (!d || cancelado) return;
      setEstado({
        rgbStatus: d.rgbStatus ?? null,
        activeAudioDeviceId: d.activeAudioDeviceId ?? null,
        // Llega como array por IPC; el `Set` es cosa de quien lo consulta.
        runningProcesses: new Set(d.runningProcesses ?? []),
      });
    };
    api.state.snapshot().then(adoptar).catch(() => {});
    const off = api.events.onEstadoSistema?.(adoptar);
    return () => { cancelado = true; off?.(); };
  }, [api]);

  return estado;
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

/**
 * Visibilidad condicional: por aplicación en primer plano o por sensor.
 *
 * `sensores` puede ser `null`, que significa «aquí no hay lecturas de
 * sensores», no «el sensor no tiene valor». Es el caso de la barra flotante,
 * que no sondea sensores: allí la condición por sensor se ignora y el botón se
 * ve. Tratarlo como «no se cumple» lo habría escondido siempre, que es peor.
 */
export function botonVisible(b: ButtonConfig, e: EstadoSistema, sensores: Sensor[] | null): boolean {
  const v = b.visibleIf;
  if (!v) return true;
  if (v.app) {
    const nombre = v.app.replace(/\.exe$/i, '').toLowerCase();
    if (!e.runningProcesses.has(nombre)) return false;
  }
  if (v.sensor && sensores !== null) {
    const s = findSensor(v.sensor.id, sensores);
    // Sin dato todavía → se mantiene oculto, que es lo mismo que «la condición
    // no se cumple». Mejor eso que enseñarlo un instante en cada recarga.
    if (!s) return false;
    if (!evalCondition(v.sensor, s.value)) return false;
  }
  return true;
}
