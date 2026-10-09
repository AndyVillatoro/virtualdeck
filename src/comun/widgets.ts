import type { Sensor, SliderWidgetConfig, TasasDivisa, TipoWidget } from '../types';

/**
 * Los datos que enseña un widget, compartidos entre el deck y el mando.
 *
 * Vive en `src/comun/` porque los dos lados los calculan y tienen que dar lo
 * mismo: la regla `main-no-renderer` no deja que `electron/main` importe de
 * `src/components`, y las copias ya se habían separado (la divisa del móvil no
 * ponía `USD` por defecto y formateaba los importes con `en-US` fijo).
 */

/** Lo que la celda (o la tecla del móvil) pinta encima del botón. */
export interface DatosWidget {
  line1: string;
  line2?: string;
  tone?: 'warn' | 'crit';
  glyph?: string;
}

export interface DatosClima {
  temp: number;
  code: number;
  city: string;
  country: string;
}

/** Lo mínimo que se lee de la reproducción actual. */
interface SonandoWidget {
  title?: string;
  artist?: string;
  status?: string;
}

/** Lo mínimo que los constructores leen de un botón. */
export interface BotonWidget {
  widget?: TipoWidget | string;
  action?: { type: string };
  varWidget?: { varName: string; prefix?: string; suffix?: string };
  sensorWidget?: { sensorId: string; suffix?: string; warnAt?: number; critAt?: number };
  currencyWidget?: { from: string; to: string; amount?: number };
  sliderWidget?: SliderWidgetConfig;
}

/** Lo que cada constructor tiene a mano. */
export interface FuentesWidget {
  estado?: Record<string, string>;
  reloj: Date;
  clima: DatosClima | null;
  sonando: SonandoWidget | null;
  sensores: Sensor[];
  divisas?: Record<string, TasasDivisa>;
  /** El reloj de la pantalla ya formateado; cada lado conserva su caché. */
  hora: Intl.DateTimeFormat;
  fecha: Intl.DateTimeFormat;
  /** Idioma para los importes de divisa (`toLocaleString(lang)`). */
  lang: string;
}

const WX_GLYPH: Record<number, string> = {
  0: 'WEATHER_SUN', 1: 'WEATHER_SUN_CLOUD', 2: 'WEATHER_SUN_CLOUD', 3: 'WEATHER_CLOUD',
  45: 'WEATHER_FOG', 48: 'WEATHER_FOG',
  51: 'WEATHER_RAIN', 53: 'WEATHER_RAIN', 55: 'WEATHER_RAIN',
  61: 'WEATHER_RAIN', 63: 'WEATHER_RAIN', 65: 'WEATHER_RAIN',
  71: 'WEATHER_SNOW', 73: 'WEATHER_SNOW', 75: 'WEATHER_SNOW', 77: 'WEATHER_SNOW',
  80: 'WEATHER_RAIN', 81: 'WEATHER_RAIN', 82: 'WEATHER_RAIN', 85: 'WEATHER_SNOW',
  95: 'WEATHER_THUNDER', 96: 'WEATHER_THUNDER', 99: 'WEATHER_THUNDER',
};

/** El código exacto, o el de su decena; si tampoco, ninguno. */
export function codigoConocido(code: number): number | null {
  if (WX_GLYPH[code] !== undefined) return code;
  const decena = Math.floor(code / 10) * 10;
  return WX_GLYPH[decena] !== undefined ? decena : null;
}

/** Código de estado del tiempo → glifo DOT. */
export function wxDotGlyph(code: number): string {
  const c = codigoConocido(code);
  return c === null ? 'WEATHER_THERMO' : (WX_GLYPH[c] ?? 'WEATHER_SUN');
}

function datosDeSensor(
  cfg: NonNullable<BotonWidget['sensorWidget']>,
  sensores: Sensor[],
): DatosWidget {
  const s = sensores.find((x) => x.id === cfg.sensorId) ?? null;
  if (!s) return { line1: '—', line2: cfg.suffix || 'sin datos' };
  // Unidad compacta: ° en vez de °C, RPM tal cual. Todo se redondea salvo el
  // voltaje, donde los decimales son la información.
  const unidad = s.unit.replace('°C', '°').replace('°F', '°');
  const v = s.kind === 'Voltage' ? s.value.toFixed(2) : Math.round(s.value).toString();
  const tone =
    cfg.critAt !== undefined && s.value >= cfg.critAt ? 'crit' as const :
    cfg.warnAt !== undefined && s.value >= cfg.warnAt ? 'warn' as const :
    undefined;
  const glyph =
    s.kind === 'Temperature' ? 'WEATHER_THERMO' :
    s.kind === 'Fan' ? 'FAN' :
    s.kind === 'Voltage' || s.kind === 'Power' ? 'BOLT' :
    s.category === 'cpu' ? 'CPU' :
    s.category === 'gpu' ? 'GPU' :
    s.category === 'memory' ? 'RAM' :
    s.category === 'storage' ? 'STORAGE' :
    'GEAR';
  return { line1: `${v}${unidad}`, line2: cfg.suffix || s.name, tone, glyph };
}

/**
 * Dos decimales para lo normal, cuatro para lo muy pequeño.
 *
 * Un euro son 0,86 dólares y se lee bien con dos; pero un yen son 0,0063 y con
 * dos decimales saldría «0.01», que no dice nada.
 */
function formatearImporte(v: number, lang: string): string {
  if (v >= 1000) return Math.round(v).toLocaleString(lang);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

/**
 * Cuánto vale `amount` de una moneda en la otra.
 *
 * Las tasas son diarias y las cachea el proceso principal; aquí solo se hace
 * la cuenta. Sin tasas todavía —primer arranque sin conexión— se enseña un
 * guion en vez de un cero, que sería mentira. La moneda que falta es USD,
 * como en el deck.
 */
function datosDeDivisa(
  cfg: NonNullable<BotonWidget['currencyWidget']>,
  divisas: Record<string, TasasDivisa> | undefined,
  lang: string,
): DatosWidget {
  const de = (cfg.from || 'USD').toUpperCase();
  const a = (cfg.to || 'USD').toUpperCase();
  const cuanto = cfg.amount && cfg.amount > 0 ? cfg.amount : 1;
  const segunda = `${formatearImporte(cuanto, lang)} ${de}`;
  const tasa = de === a ? 1 : divisas?.[de]?.rates?.[a];
  if (tasa === undefined) return { line1: '—', line2: segunda };
  return { line1: `${formatearImporte(cuanto * tasa, lang)} ${a}`, line2: segunda };
}

/**
 * Un constructor por tipo de widget. Devolver `null` es «este botón no tiene
 * nada que enseñar todavía»: la celda se queda con su icono.
 *
 * Es un mapa y no una cadena de condiciones para que añadir un widget sea una
 * entrada, y el `Record<TipoWidget, ...>` obligue a que no falte ninguna.
 */
const CONSTRUCTORES: Record<TipoWidget, (b: BotonWidget, f: FuentesWidget) => DatosWidget | null> = {
  'clock': (_b, f) => ({
    line1: f.hora.format(f.reloj),
    line2: f.fecha.format(f.reloj).toUpperCase(),
    glyph: 'CLOCK',
  }),

  'weather': (_b, f) => {
    if (!f.clima) return null;
    return { line1: `${f.clima.temp}°`, line2: f.clima.city, glyph: wxDotGlyph(f.clima.code) };
  },

  'now-playing': (_b, f) => (f.sonando
    ? {
        line1: f.sonando.title || '—',
        line2: f.sonando.artist || undefined,
        glyph: f.sonando.status === 'Paused' ? 'PAUSE' : 'PLAY',
      }
    : null),

  'variable': (b, f) => {
    const cfg = b.varWidget;
    if (!cfg?.varName) return null;
    const bruto = f.estado?.[cfg.varName] ?? '0';
    return { line1: `${cfg.prefix ?? ''}${bruto}`, line2: cfg.suffix || cfg.varName, glyph: 'CODE' };
  },

  'sensor': (b, f) => (b.sensorWidget ? datosDeSensor(b.sensorWidget, f.sensores) : null),

  'currency': (b, f) => (b.currencyWidget ? datosDeDivisa(b.currencyWidget, f.divisas, f.lang) : null),

  'slider': (b, f) => {
    const cfg = b.sliderWidget;
    const target = cfg?.target ?? 'volume';
    if (target === 'variable') {
      const v = cfg?.varName ? (f.estado?.[cfg.varName] ?? '0') : '0';
      return { line1: `${v}`, line2: cfg?.label || cfg?.varName || 'VAR', glyph: 'CODE' };
    }
    const glyph = target === 'brightness' ? 'SUN' : 'VOLUME';
    const tag = target === 'brightness' ? 'BRI' : 'VOL';
    return { line1: cfg?.label || tag, line2: target.toUpperCase(), glyph };
  },
};

// Sale de `CONSTRUCTORES` y no de una lista escrita aparte: un tipo nuevo
// entra en el mapa (lo exige el `Record`) y con eso ya se reconoce aquí.
function esTipoWidget(valor: string): valor is TipoWidget {
  return Object.prototype.hasOwnProperty.call(CONSTRUCTORES, valor);
}

/**
 * El dato de un widget, o `null` si no hay nada que enseñar todavía.
 *
 * Aplica aquí la regla «`now-playing` sobre un botón de dispositivo de audio →
 * nada»: la celda mostraría la canción en vez del dispositivo que el botón
 * selecciona. El tipo se valida en ejecución porque el mando lo recibe como
 * cadena suelta de la configuración.
 */
export function datosDeWidget(boton: BotonWidget, fuentes: FuentesWidget): DatosWidget | null {
  const tipo = boton.widget;
  if (!tipo || !esTipoWidget(tipo)) return null;
  if (tipo === 'now-playing' && boton.action?.type === 'audio-device') return null;
  return CONSTRUCTORES[tipo](boton, fuentes);
}
