import { BrowserWindow } from 'electron';
import { getRunningProcesses } from '../launcher';
import { listAudioDevices } from '../audio';
import * as rgb from '../rgb';

/**
 * Lo que el deck sabe del sistema: qué salida de audio manda, qué procesos
 * corren y cómo está el RGB.
 *
 * Vivía en la **pantalla**, con un `setInterval` dentro de `useEstadoSistema`.
 * Eso funcionaba mientras hubo una sola ventana, pero la barra flotante es otra
 * ventana con otro React y no lo tenía: un botón con «visible solo si corre tal
 * aplicación» **se veía siempre en la barra**, aunque el deck lo ocultara.
 * Medido: el deck no lo pintaba y la barra lo pintaba entero.
 *
 * La salida obvia —añadir el mismo sondeo a la barra— duplicaba el coste, y no
 * es un coste despreciable: `getRunningProcesses` tiene camino nativo, pero cae
 * a lanzar `tasklist` si el núcleo nativo no está.
 *
 * Aquí hay **un solo sondeo** para todas las ventanas, y encima desaparecen las
 * tres llamadas IPC que la pantalla hacía en cada tic: ahora el dato viaja en
 * una sola dirección, del proceso que lo tiene a quien lo pinta.
 */

export interface EstadoSistema {
  rgbStatus: unknown;
  activeAudioDeviceId: string | null;
  /**
   * Nombre legible de la salida activa. El id del endpoint de Windows cambia
   * al reconectar un USB, y los cuadrantes 2×2 solo guardan el nombre: con
   * este dato hay coincidencia por nombre en `botonActivo` y en
   * `resolverAspectoAudio` (T-AUD-04).
   */
  activeAudioDeviceName: string | null;
  /** Nombres de ejecutable, sin extensión y en minúsculas. */
  runningProcesses: string[];
}

const CADA_MS = 5000;

let actual: EstadoSistema = { rgbStatus: null, activeAudioDeviceId: null, activeAudioDeviceName: null, runningProcesses: [] };
let temporizador: NodeJS.Timeout | null = null;

export function estadoActual(): EstadoSistema {
  return actual;
}

async function tic(): Promise<void> {
  const [estadoRgb, audio, procesos] = await Promise.all([
    Promise.resolve(rgb.status()).catch(() => null),
    listAudioDevices().catch(() => [] as Array<{ id: string; name: string; isDefault?: boolean }>),
    getRunningProcesses().catch(() => [] as string[]),
  ]);
  const dispActivo = audio.find((d) => d.isDefault) ?? null;
  actual = {
    rgbStatus: estadoRgb ?? null,
    activeAudioDeviceId: dispActivo?.id ?? null,
    activeAudioDeviceName: dispActivo?.name ?? null,
    runningProcesses: procesos,
  };
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('estado:changed', actual);
  }
}

export function arrancarSondeo(): void {
  if (temporizador) return;
  void tic();
  temporizador = setInterval(() => { void tic(); }, CADA_MS);
}

export function pararSondeo(): void {
  if (temporizador) { clearInterval(temporizador); temporizador = null; }
}

/**
 * Un tic fuera de turno.
 *
 * Lo llama el módulo RGB cuando cambian los dispositivos: esperar hasta cinco
 * segundos a que la insignia de estado se entere se nota.
 */
export function refrescarYa(): void {
  void tic();
}
