import { useEffect, useRef } from 'react';
import { findSensor, evalCondition } from './sensors';
import type { ButtonConfig, Sensor } from '../types';

/**
 * Los botones que se disparan solos: a una hora, o cuando un sensor cruza un
 * umbral.
 *
 * Vivían dentro de `MainB`, y con ellos dos fallos:
 *
 * 1. **En kiosko no sonaban.** `FullscreenB` sustituye a `MainB` en la misma
 *    ventana, así que al entrar en pantalla completa los dos efectos se
 *    desmontaban. Y kiosko es el modo de dejar el deck solo mirando a la
 *    habitación — donde una acción programada es media razón de configurarla.
 * 2. **El programado solo miraba la página abierta** (`b.page === activePage`).
 *    Una acción puesta a las 08:00 saltaba únicamente si a esa hora tenías
 *    delante la página donde vive el botón. El de sensor no filtraba por
 *    página, lo que ya delataba que uno de los dos estaba mal.
 *
 * Ahora los llama `App`, que está montada siempre y no sabe de páginas.
 */

interface Opciones {
  botones: ButtonConfig[];
  sensores: Sensor[];
  disparar: (b: ButtonConfig) => void | Promise<void>;
}

/** Cada cuánto se mira el reloj. */
const MS_TIC_RELOJ = 15000;
/**
 * Más de esto entre dos tics y se da por perdido: el equipo estuvo suspendido
 * y no tiene sentido disparar de golpe todo lo que tocaba mientras dormía.
 */
const MS_HUECO_MAXIMO = 5 * 60 * 1000;
/** Sin enfriamiento propio, un sensor caliente dispararía en cada sondeo. */
const MS_ENFRIAMIENTO = 60000;

/**
 * ¿El instante «HH:MM» cae entre el tic anterior y este?
 *
 * Se compara sobre el día de `ahora`, que es lo correcto salvo justo al cruzar
 * la medianoche; ahí el hueco se resuelve en el tic siguiente.
 */
function inicioDelMinuto(d: Date): number {
  const m = new Date(d);
  m.setSeconds(0, 0);
  return m.getTime();
}

function cruzoLaHora(hhmm: string, previo: number, ahora: Date): boolean {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  const objetivo = new Date(ahora);
  objetivo.setHours(h, m, 0, 0);
  const t = objetivo.getTime();
  return t > previo && t <= ahora.getTime();
}

export function useDisparadores({ botones, sensores, disparar }: Opciones) {

  // Las opciones van por referencia para que los efectos no se rearmen con
  // cada repintado: `disparar` cambia de identidad al cambiar la
  // configuración, y con él se reiniciaría el intervalo del reloj.
  const ref = useRef({ botones, sensores, disparar });
  ref.current = { botones, sensores, disparar };

  // --- Por hora.
  //
  // Se mira el **intervalo transcurrido**, no si el reloj marca justo la hora
  // programada. Exigir igualdad obliga a que algun tic caiga dentro del minuto
  // exacto, y eso no se puede dar por hecho: si el equipo se suspende, si la
  // pestaña se estrangula o si el sistema va cargado, el tic se retrasa y el
  // minuto se pierde entero. Asi solo hace falta que el tic ocurra *despues*.
  const ultimoInstante = useRef<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      const ahora = new Date();
      // En el primer tic la referencia es el **principio del minuto en curso**,
      // no el instante actual. Asi se conserva lo de antes —que un programado
      // salta en cualquier momento de su minuto— sin repescar nada anterior:
      // abrir la aplicacion a las seis de la tarde no dispara lo del desayuno.
      const previo = ultimoInstante.current ?? inicioDelMinuto(ahora) - 1;
      ultimoInstante.current = ahora.getTime();
      // Un hueco enorme es que el equipo estuvo suspendido; no se recuperan
      // disparos viejos, se vuelve a tomar referencia y se sigue.
      if (ahora.getTime() - previo > MS_HUECO_MAXIMO) return;
      for (const b of ref.current.botones) {
        if (!b.timerTriggerAt) continue;
        if (!cruzoLaHora(b.timerTriggerAt, previo, ahora)) continue;
        void ref.current.disparar(b);
      }
    }, MS_TIC_RELOJ);
    return () => clearInterval(t);
  }, []);

  // --- Por sensor. Por nivel, no por flanco: se repite mientras la condición
  // siga siendo cierta, con enfriamiento entre disparos.
  const ultimoDisparo = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (sensores.length === 0) return;
    const previos = ultimoDisparo.current;
    const ahora = Date.now();
    for (const b of botones) {
      const trig = b.sensorTrigger;
      if (!trig) continue;
      const s = findSensor(trig.id, sensores);
      if (!s) continue;
      if (!evalCondition(trig, s.value)) {
        // Flanco de bajada: se reinicia para que el siguiente cruce dispare ya.
        if ((previos.get(b.id) ?? 0) > 0) previos.set(b.id, 0);
        continue;
      }
      if (ahora - (previos.get(b.id) ?? 0) < (trig.cooldownMs ?? MS_ENFRIAMIENTO)) continue;
      previos.set(b.id, ahora);
      void disparar(b);
    }
  }, [sensores, botones, disparar]);
}
