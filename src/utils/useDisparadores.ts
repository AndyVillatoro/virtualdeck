import { useEffect, useMemo, useRef } from 'react';
import { formatoHora } from './formatos';
import { findSensor, evalCondition } from './sensors';
import { useLang } from './i18n';
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

/** Cada cuánto se mira el reloj. Menos de un minuto para no perder el minuto. */
const MS_TIC_RELOJ = 15000;
/** Sin enfriamiento propio, un sensor caliente dispararía en cada sondeo. */
const MS_ENFRIAMIENTO = 60000;

export function useDisparadores({ botones, sensores, disparar }: Opciones) {
  const lang = useLang();
  const hora = useMemo(() => formatoHora(lang), [lang]);

  // Las opciones van por referencia para que los efectos no se rearmen con
  // cada repintado: `disparar` cambia de identidad al cambiar la
  // configuración, y con él se reiniciaría el intervalo del reloj.
  const ref = useRef({ botones, sensores, disparar });
  ref.current = { botones, sensores, disparar };

  // --- Por hora.
  const ultimoMinuto = useRef<string>('');
  useEffect(() => {
    const t = setInterval(() => {
      const ahora = hora.format(new Date());
      if (ahora === ultimoMinuto.current) return;
      const tocan = ref.current.botones.filter((b) => b.timerTriggerAt === ahora);
      if (tocan.length === 0) return;
      ultimoMinuto.current = ahora;
      for (const b of tocan) void ref.current.disparar(b);
    }, MS_TIC_RELOJ);
    return () => clearInterval(t);
  }, [hora]);

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
