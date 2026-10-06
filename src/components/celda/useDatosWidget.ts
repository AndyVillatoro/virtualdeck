import { useEffect, useMemo, useState } from 'react';
import { formatoHora, formatoFecha } from '../../utils/formatos';
import { useLang } from '../../utils/i18n';
import { datosDeWidget, type DatosClima, type DatosWidget, type FuentesWidget } from '../../comun/widgets';
import type { ButtonConfig, Sensor, TasasDivisa } from '../../types';

/**
 * Lo que muestra cada widget encima de su botón, para todos los botones a la vez.
 *
 * Vivía dentro de `MainB`, y **`FullscreenB` no lo tenía**: la pantalla de
 * kiosko dibujaba sus celdas sin pasarles `widgetData`, así que un botón con
 * widget de reloj mostraba el reloj en la ventana normal y el icono de la
 * acción en pantalla completa. Medido: `22:34 VIE, 21 AGO` contra `EXPLORADOR`.
 * Y kiosko es justamente el modo de dejar el deck mirando a la habitación, que
 * es donde un reloj o una temperatura sirven de algo.
 *
 * Los constructores y los tipos de dato viven en `src/comun/widgets` porque el
 * mando móvil calcula los mismos; aquí queda solo el hook, que aporta la caché
 * de formatos del idioma y la fecha del render.
 */

export type { DatosClima, DatosWidget };

interface Entradas {
  botones: ButtonConfig[];
  /** Tasas por moneda base, para los widgets de divisas. */
  divisas?: Record<string, TasasDivisa>;
  /** Las variables interpolables, para el widget de tipo `variable`. */
  estado?: Record<string, string>;
  /** El reloj que ya tiene la pantalla; no se crea otro. */
  reloj: Date;
  clima: DatosClima | null;
  sonando: { title?: string; artist?: string; status?: string } | null;
  sensores: Sensor[];
}

export function useDatosWidget({ botones, estado, reloj, clima, sonando, sensores, divisas }: Entradas) {
  const lang = useLang();
  const hora = useMemo(() => formatoHora(lang), [lang]);
  const fecha = useMemo(() => formatoFecha(lang), [lang]);

  return useMemo(() => {
    const fuentes: FuentesWidget = { estado, reloj, clima, sonando, sensores, divisas, hora, fecha, lang };
    const mapa: Record<string, DatosWidget> = {};
    for (const b of botones) {
      if (!b.widget) continue;
      const datos = datosDeWidget(b, fuentes);
      if (datos) mapa[b.id] = datos;
    }
    return mapa;
  }, [botones, estado, reloj, clima, sonando, sensores, divisas, hora, fecha, lang]);
}

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
