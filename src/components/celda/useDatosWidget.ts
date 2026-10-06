import { useMemo } from 'react';
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
 * de formatos del idioma y la fecha del render. El sondeo del clima y las
 * divisas vive en `src/utils/fuentesWidget`, que es de donde los toma también
 * la tecla física del dock.
 */

export type { DatosClima, DatosWidget };
export { useClimaWidget, useDivisas } from '../../utils/fuentesWidget';

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
