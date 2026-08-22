import { useEffect, useMemo, useState } from 'react';
import { formatoHora, formatoFecha } from '../../utils/formatos';
import { useLang } from '../../utils/i18n';
import { wxInfo } from '../WeatherWidget';
import { findSensor } from '../../utils/sensors';
import type { ButtonConfig, Sensor } from '../../types';

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
 * Se comparte entero en vez de duplicarlo: son cinco tipos de widget con sus
 * casos raros (el umbral del sensor, la variable sin valor, la combinación
 * inválida de abajo), y mantenerlos dos veces es garantizar que se separen.
 */

export interface DatosWidget {
  line1: string;
  line2?: string;
  tone?: 'warn' | 'crit';
}

export interface DatosClima {
  temp: number;
  code: number;
  city: string;
  country: string;
}

interface Entradas {
  botones: ButtonConfig[];
  /** Las variables interpolables, para el widget de tipo `variable`. */
  estado?: Record<string, string>;
  /** El reloj que ya tiene la pantalla; no se crea otro. */
  reloj: Date;
  clima: DatosClima | null;
  sonando: { title?: string; artist?: string } | null;
  sensores: Sensor[];
}

export function useDatosWidget({ botones, estado, reloj, clima, sonando, sensores }: Entradas) {
  const lang = useLang();
  const hora = useMemo(() => formatoHora(lang), [lang]);
  const fecha = useMemo(() => formatoFecha(lang), [lang]);

  return useMemo(() => {
    const mapa: Record<string, DatosWidget> = {};
    for (const b of botones) {
      if (!b.widget) continue;
      // 'now-playing' sobre un botón de dispositivo de audio es una
      // combinación inválida: la celda mostraría la canción en vez del
      // dispositivo que el botón selecciona.
      if (b.widget === 'now-playing' && b.action.type === 'audio-device') continue;

      if (b.widget === 'clock') {
        mapa[b.id] = { line1: hora.format(reloj), line2: fecha.format(reloj).toUpperCase() };
      } else if (b.widget === 'weather' && clima) {
        const [emoji] = wxInfo(clima.code);
        mapa[b.id] = { line1: `${emoji} ${clima.temp}°`, line2: clima.city };
      } else if (b.widget === 'now-playing' && sonando) {
        mapa[b.id] = { line1: sonando.title || '—', line2: sonando.artist || undefined };
      } else if (b.widget === 'variable' && b.varWidget?.varName) {
        const bruto = estado?.[b.varWidget.varName] ?? '0';
        mapa[b.id] = {
          line1: `${b.varWidget.prefix ?? ''}${bruto}`,
          line2: b.varWidget.suffix || b.varWidget.varName,
        };
      } else if (b.widget === 'sensor' && b.sensorWidget) {
        mapa[b.id] = datosDeSensor(b, sensores);
      }
    }
    return mapa;
  }, [botones, estado, reloj, clima, sonando, sensores, hora, fecha]);
}

function datosDeSensor(b: ButtonConfig, sensores: Sensor[]): DatosWidget {
  const cfg = b.sensorWidget!;
  const s = findSensor(cfg.sensorId, sensores);
  if (!s) return { line1: '—', line2: cfg.suffix || 'sin datos' };
  // Unidad compacta: ° en vez de °C, RPM tal cual. Todo se redondea salvo el
  // voltaje, donde los decimales son la información.
  const unidad = s.unit.replace('°C', '°').replace('°F', '°');
  const v = s.kind === 'Voltage' ? s.value.toFixed(2) : Math.round(s.value).toString();
  const tone =
    cfg.critAt !== undefined && s.value >= cfg.critAt ? 'crit' as const :
    cfg.warnAt !== undefined && s.value >= cfg.warnAt ? 'warn' as const :
    undefined;
  return { line1: `${v}${unidad}`, line2: cfg.suffix || s.name, tone };
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
