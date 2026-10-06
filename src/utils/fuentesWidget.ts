import { useEffect, useState } from 'react';
import type { DatosClima } from '../comun/widgets';
import type { ButtonConfig, TasasDivisa } from '../types';

/**
 * Las fuentes vivas de los widgets: clima y divisas.
 *
 * Eran dos hooks de `components/celda/useDatosWidget`, pero no son de UI: los
 * consume la celda, kiosko, la barra flotante y ahora la tecla física del dock
 * (`useWidgetsSuperficie`), y `src/utils` no puede importar componentes. Aquí
 * viven con su sondeo y `useDatosWidget` los reexporta para no tocar a sus
 * llamadores.
 */

/**
 * Las tasas que hacen falta para los widgets que haya puestos.
 *
 * Se piden **por moneda base**, no por par: una sola respuesta trae las 166
 * monedas, asi que dos widgets con la misma base son una peticion. Y se pide
 * cuando toca segun el propio servicio, que dice en la respuesta cuando vuelve
 * a actualizar; entre medias todo sale de la cache del proceso principal.
 */
export function useDivisas(
  botones: ButtonConfig[],
  api: { currency: { rates: (base: string, force?: boolean) => Promise<{ ok: boolean; datos?: TasasDivisa }> } } | null | undefined,
) {
  const [tasas, setTasas] = useState<Record<string, TasasDivisa>>({});

  // Las bases van como texto ordenado: asi el efecto no se rearma en cada
  // repintado solo porque el array sea otro.
  const bases = [...new Set(
    botones.filter((b) => b.widget === 'currency' && b.currencyWidget?.from)
      .map((b) => b.currencyWidget!.from.toUpperCase()),
  )].sort().join(',');

  useEffect(() => {
    if (!api || !bases) return;
    let cancelado = false;
    const consultar = async () => {
      for (const base of bases.split(',')) {
        try {
          const r = await api.currency.rates(base);
          if (!cancelado && r.ok && r.datos) {
            setTasas((prev) => ({ ...prev, [base]: r.datos! }));
          }
        } catch { /* sin conexion: se reintenta en el siguiente ciclo */ }
      }
    };
    consultar();
    // Cada hora se vuelve a preguntar; el proceso principal responde de su
    // cache hasta que el servicio publica las del dia siguiente.
    const t = setInterval(consultar, 60 * 60 * 1000);
    return () => { cancelado = true; clearInterval(t); };
  }, [api, bases]);

  return tasas;
}

/**
 * El clima que consumen los widgets, con su sondeo.
 *
 * `hay` es un booleano y no la lista de botones a propósito: dependiendo de
 * `config.buttons` el temporizador se reiniciaría con cada edición de
 * cualquier botón. Y se calcula fuera del efecto, que es lo que hacía que
 * poner un widget de clima no arrancara el sondeo hasta reiniciar.
 */
export function useClimaWidget(hay: boolean, api: { weather: { get: () => Promise<DatosClima | null> } } | null | undefined) {
  const [clima, setClima] = useState<DatosClima | null>(null);
  useEffect(() => {
    if (!api || !hay) return;
    let cancelado = false;
    const consultar = async () => {
      try {
        const d = await api.weather.get();
        if (!cancelado && d) setClima(d);
      } catch { /* sin conexión: se reintenta en el siguiente ciclo */ }
    };
    consultar();
    // 15 minutos, el mismo TTL que usa el widget del panel lateral.
    const t = setInterval(consultar, 15 * 60 * 1000);
    return () => { cancelado = true; clearInterval(t); };
  }, [api, hay]);
  return clima;
}
