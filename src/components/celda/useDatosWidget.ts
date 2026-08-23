import { useEffect, useMemo, useState } from 'react';
import { formatoHora, formatoFecha } from '../../utils/formatos';
import { useLang } from '../../utils/i18n';
import { wxInfo } from '../WeatherWidget';
import { findSensor } from '../../utils/sensors';
import type { ButtonConfig, Sensor, TasasDivisa, TipoWidget } from '../../types';

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
  /** Tasas por moneda base, para los widgets de divisas. */
  divisas?: Record<string, TasasDivisa>;
  /** Las variables interpolables, para el widget de tipo `variable`. */
  estado?: Record<string, string>;
  /** El reloj que ya tiene la pantalla; no se crea otro. */
  reloj: Date;
  clima: DatosClima | null;
  sonando: { title?: string; artist?: string } | null;
  sensores: Sensor[];
}

/** Lo que cada constructor tiene a mano. */
interface Fuentes {
  estado?: Record<string, string>;
  reloj: Date;
  clima: DatosClima | null;
  sonando: { title?: string; artist?: string } | null;
  sensores: Sensor[];
  divisas?: Record<string, TasasDivisa>;
  hora: Intl.DateTimeFormat;
  fecha: Intl.DateTimeFormat;
}

/**
 * Un constructor por tipo de widget. Devolver `null` es «este botón no tiene
 * nada que enseñar todavía»: la celda se queda con su icono.
 *
 * Es un mapa y no una cadena de `else if` —como sí lo es `actionLabel`— porque
 * aquí el tipo no estrecha nada: `b.widget` es un campo suelto y todas las
 * ramas reciben el mismo `ButtonConfig`. Así añadir un widget es una entrada,
 * y el `Record<TipoWidget, ...>` obliga a que no falte ninguna: si se añade un
 * tipo y se olvida el constructor, no compila. Mejor que un guardián aparte.
 */
const CONSTRUCTORES: Record<TipoWidget, (b: ButtonConfig, f: Fuentes) => DatosWidget | null> = {
  'clock': (_b, f) => ({
    line1: f.hora.format(f.reloj),
    line2: f.fecha.format(f.reloj).toUpperCase(),
  }),

  'weather': (_b, f) => {
    if (!f.clima) return null;
    const [emoji] = wxInfo(f.clima.code);
    return { line1: `${emoji} ${f.clima.temp}°`, line2: f.clima.city };
  },

  'now-playing': (_b, f) => (f.sonando
    ? { line1: f.sonando.title || '—', line2: f.sonando.artist || undefined }
    : null),

  'variable': (b, f) => {
    const cfg = b.varWidget;
    if (!cfg?.varName) return null;
    const bruto = f.estado?.[cfg.varName] ?? '0';
    return { line1: `${cfg.prefix ?? ''}${bruto}`, line2: cfg.suffix || cfg.varName };
  },

  'sensor': (b, f) => (b.sensorWidget ? datosDeSensor(b, f.sensores) : null),

  'currency': (b, f) => (b.currencyWidget ? datosDeDivisa(b.currencyWidget, f.divisas) : null),
};

export function useDatosWidget({ botones, estado, reloj, clima, sonando, sensores, divisas }: Entradas) {
  const lang = useLang();
  const hora = useMemo(() => formatoHora(lang), [lang]);
  const fecha = useMemo(() => formatoFecha(lang), [lang]);

  return useMemo(() => {
    const fuentes: Fuentes = { estado, reloj, clima, sonando, sensores, divisas, hora, fecha };
    const mapa: Record<string, DatosWidget> = {};
    for (const b of botones) {
      if (!b.widget) continue;
      // 'now-playing' sobre un botón de dispositivo de audio es una
      // combinación inválida: la celda mostraría la canción en vez del
      // dispositivo que el botón selecciona.
      if (b.widget === 'now-playing' && b.action.type === 'audio-device') continue;
      const datos = CONSTRUCTORES[b.widget]?.(b, fuentes);
      if (datos) mapa[b.id] = datos;
    }
    return mapa;
  }, [botones, estado, reloj, clima, sonando, sensores, divisas, hora, fecha]);
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
 * Cuánto vale `amount` de una moneda en la otra.
 *
 * Las tasas son diarias y el proceso principal las cachea, así que aquí no hay
 * ninguna llamada: solo la cuenta. Sin tasas todavía —primer arranque sin
 * conexión— se enseña un guion en vez de un cero, que sería mentira.
 */
function datosDeDivisa(
  cfg: NonNullable<ButtonConfig['currencyWidget']>,
  divisas: Record<string, TasasDivisa> | undefined,
): DatosWidget {
  const de = (cfg.from || 'USD').toUpperCase();
  const a = (cfg.to || 'USD').toUpperCase();
  const cuanto = cfg.amount && cfg.amount > 0 ? cfg.amount : 1;
  const segunda = `${formatearImporte(cuanto)} ${de}`;
  const tasa = de === a ? 1 : divisas?.[de]?.rates?.[a];
  if (tasa === undefined) return { line1: '—', line2: segunda };
  return { line1: `${formatearImporte(cuanto * tasa)} ${a}`, line2: segunda };
}

/**
 * Dos decimales para lo normal, cuatro para lo muy pequeño.
 *
 * Un euro son 0,86 dolares y se lee bien con dos; pero un yen son 0,0063 y con
 * dos decimales saldria «0.01», que no dice nada.
 */
function formatearImporte(v: number): string {
  if (v >= 1000) return Math.round(v).toLocaleString();
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
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
