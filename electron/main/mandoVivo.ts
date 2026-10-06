import { app } from 'electron';
import { loadConfig } from './configManager';
import { estadoActual } from './estadoSistema';
import { list as listarSensores, type Sensor } from './sensors';
import { getNowPlaying, type NowPlaying } from './media';
import { getWeather, type WeatherData } from './weather';
import { obtenerTasas, type TasasDivisa } from './divisas';
import { DOT_GLYPHS_8X8 } from '../../src/components/dot480/dotGlyphs8x8';
import { botonAMando, type BotonFuenteMando, type BotonMandoMovil, type IconoPuntosMando } from './iconosMando';

/**
 * Lo vivo del mando móvil (roadmap 82, T-PAR-02): variables, visibilidad y
 * widgets, con el mismo criterio que el deck.
 *
 * Vive aquí y no en `servidorLocal.ts` porque ese archivo ya va cargado: la
 * regla del proyecto pide sacar lo nuevo a archivos aparte (≤600 líneas).
 *
 * La lógica está **duplicada a propósito** con `src/` (`interpolate` de
 * `utils/acciones/base.ts`, `botonVisible` de `utils/estadoSistema.ts`,
 * `CONSTRUCTORES` de `celda/useDatosWidget.ts`): la regla `main-no-renderer`
 * de `.dependency-cruiser.cjs` prohíbe al proceso principal importar de `src/`
 * salvo tipos y los datos puros de los glifos DOT, y no se puede cambiar en
 * este encargo. Si el deck cambia su criterio, hay que cambiarlo aquí también.
 */

/** Lo que la página del móvil pinta encima del botón, como el deck. */
export interface DatoWidgetVivo {
  line1: string;
  line2?: string;
  tone?: 'warn' | 'crit';
  /** Nombre del glifo DOT, por compatibilidad; la página dibuja `puntos`. */
  glyph?: string;
  puntos?: IconoPuntosMando;
}

type CondicionSensorMando = {
  id: string;
  op: '>' | '<' | '>=' | '<=' | '==';
  value: number;
};

type BotonVisibleMando = {
  visibleIf?: { app?: string; sensor?: CondicionSensorMando };
};

type BotonWidgetMando = BotonFuenteMando & {
  action?: { type: string };
};

/** Todo lo que un widget puede necesitar, ya juntado. */
interface FuentesVivo {
  estado: Record<string, string>;
  ahora: Date;
  lang: 'es' | 'en';
  clima: WeatherData | null;
  sonando: NowPlaying | null;
  sensores: Sensor[];
  tasas: Record<string, TasasDivisa>;
}

/**
 * `{NOMBRE}` → valor de la variable. Igual que `interpolate` del deck: la
 * variable que no existe sale como cadena vacía, no rompe la etiqueta.
 */
export function interpolarEtiquetaMando(
  plantilla: string | undefined,
  estado: Record<string, string> | undefined,
): string {
  if (!plantilla) return '';
  if (!estado) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (_todo, clave) => estado[clave] ?? '');
}

/** `C:\Prog\OBS64.exe` → `obs64`: igual que `normalizarApp` del deck. */
export function normalizarAppMando(valor: string | null | undefined): string {
  return (valor ?? '').trim().replace(/\.exe$/i, '').toLowerCase();
}

/** Igual que `evalCondition` de `src/utils/sensors.ts`. */
function cumpleCondicionMando(cond: CondicionSensorMando, actual: number): boolean {
  switch (cond.op) {
    case '>': return actual > cond.value;
    case '<': return actual < cond.value;
    case '>=': return actual >= cond.value;
    case '<=': return actual <= cond.value;
    case '==': return actual === cond.value;
  }
}

/**
 * Visibilidad condicional, con el mismo criterio que el deck (`botonVisible`):
 * la app se mira en los procesos que ya conoce el proceso principal
 * (`estadoSistema`, el mismo dato que pinta el deck) y el sensor en la lista
 * de sensores. Sin dato del sensor → oculto, como en el deck.
 */
export function visibleMando(boton: BotonVisibleMando, procesos: string[], sensores: Sensor[]): boolean {
  const v = boton.visibleIf;
  if (!v) return true;
  if (v.app && !procesos.includes(normalizarAppMando(v.app))) return false;
  if (v.sensor) {
    const s = sensores.find((x) => x.id === v.sensor!.id) ?? null;
    if (!s) return false;
    if (!cumpleCondicionMando(v.sensor, s.value)) return false;
  }
  return true;
}

/** Código de estado del tiempo → glifo DOT. Igual que `wxDotGlyph` del deck. */
const GLIFO_CLIMA_MANDO: Record<number, string> = {
  0: 'WEATHER_SUN', 1: 'WEATHER_SUN_CLOUD', 2: 'WEATHER_SUN_CLOUD', 3: 'WEATHER_CLOUD',
  45: 'WEATHER_FOG', 48: 'WEATHER_FOG',
  51: 'WEATHER_RAIN', 53: 'WEATHER_RAIN', 55: 'WEATHER_RAIN',
  61: 'WEATHER_RAIN', 63: 'WEATHER_RAIN', 65: 'WEATHER_RAIN',
  71: 'WEATHER_SNOW', 73: 'WEATHER_SNOW', 75: 'WEATHER_SNOW', 77: 'WEATHER_SNOW',
  80: 'WEATHER_RAIN', 81: 'WEATHER_RAIN', 82: 'WEATHER_RAIN', 85: 'WEATHER_SNOW',
  95: 'WEATHER_THUNDER', 96: 'WEATHER_THUNDER', 99: 'WEATHER_THUNDER',
};

function glifoClimaMando(code: number): string {
  if (GLIFO_CLIMA_MANDO[code] !== undefined) return GLIFO_CLIMA_MANDO[code];
  const decena = Math.floor(code / 10) * 10;
  return GLIFO_CLIMA_MANDO[decena] ?? 'WEATHER_THERMO';
}

/** Nombre de glifo → puntos 8×8, para que la página solo dibuje. */
function puntosDeGlifo(nombre: string | undefined): IconoPuntosMando | undefined {
  if (!nombre) return undefined;
  const filas = DOT_GLYPHS_8X8[nombre];
  return filas ? { lado: 8, filas: [...filas] } : undefined;
}

function conPuntos(dato: DatoWidgetVivo): DatoWidgetVivo {
  const puntos = puntosDeGlifo(dato.glyph);
  return puntos ? { ...dato, puntos } : dato;
}

const formatoHoraMando = (() => {
  const cache = new Map<string, Intl.DateTimeFormat>();
  return (lang: 'es' | 'en'): Intl.DateTimeFormat => {
    let f = cache.get(lang);
    // 24 h a propósito, como el deck (`formatos.ts`): de un vistazo se lee mejor.
    if (!f) { f = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false }); cache.set(lang, f); }
    return f;
  };
})();

const formatoFechaMando = (() => {
  const cache = new Map<string, Intl.DateTimeFormat>();
  return (lang: 'es' | 'en'): Intl.DateTimeFormat => {
    let f = cache.get(lang);
    if (!f) { f = new Intl.DateTimeFormat(lang, { weekday: 'short', day: '2-digit', month: 'short' }); cache.set(lang, f); }
    return f;
  };
})();

function datoRelojMando(f: FuentesVivo): DatoWidgetVivo {
  return conPuntos({
    line1: formatoHoraMando(f.lang).format(f.ahora),
    line2: formatoFechaMando(f.lang).format(f.ahora).toUpperCase(),
    glyph: 'CLOCK',
  });
}

function datoClimaMando(f: FuentesVivo): DatoWidgetVivo | null {
  if (!f.clima) return null;
  return conPuntos({ line1: `${f.clima.temp}°`, line2: f.clima.city, glyph: glifoClimaMando(f.clima.code) });
}

function datoSonandoMando(boton: BotonWidgetMando, f: FuentesVivo): DatoWidgetVivo | null {
  // Combinación inválida, como en el deck: el botón elige un dispositivo de
  // audio, no enseña la canción que suena.
  if (boton.action?.type === 'audio-device') return null;
  if (!f.sonando) return null;
  return conPuntos({
    line1: f.sonando.title || '—',
    line2: f.sonando.artist || undefined,
    glyph: f.sonando.status === 'Paused' ? 'PAUSE' : 'PLAY',
  });
}

function datoVariableMando(boton: BotonWidgetMando, f: FuentesVivo): DatoWidgetVivo | null {
  const cfg = boton.varWidget;
  if (!cfg?.varName) return null;
  const bruto = f.estado[cfg.varName] ?? '0';
  return conPuntos({ line1: `${cfg.prefix ?? ''}${bruto}`, line2: cfg.suffix || cfg.varName, glyph: 'CODE' });
}

function glifoSensorMando(s: Sensor): string {
  if (s.kind === 'Temperature') return 'WEATHER_THERMO';
  if (s.kind === 'Fan') return 'FAN';
  if (s.kind === 'Voltage' || s.kind === 'Power') return 'BOLT';
  if (s.category === 'cpu') return 'CPU';
  if (s.category === 'gpu') return 'GPU';
  if (s.category === 'memory') return 'RAM';
  if (s.category === 'storage') return 'STORAGE';
  return 'GEAR';
}

function datoSensorMando(boton: BotonWidgetMando, sensores: Sensor[]): DatoWidgetVivo | null {
  const cfg = boton.sensorWidget;
  if (!cfg?.sensorId) return null;
  const s = sensores.find((x) => x.id === cfg.sensorId) ?? null;
  if (!s) return { line1: '—', line2: cfg.suffix || 'sin datos' };
  // Unidad compacta y redondeo, como el deck: ° en vez de °C, voltaje con decimales.
  const unidad = s.unit.replace('°C', '°').replace('°F', '°');
  const v = s.kind === 'Voltage' ? s.value.toFixed(2) : Math.round(s.value).toString();
  const tone =
    cfg.critAt !== undefined && s.value >= cfg.critAt ? 'crit' as const :
    cfg.warnAt !== undefined && s.value >= cfg.warnAt ? 'warn' as const :
    undefined;
  const dato: DatoWidgetVivo = { line1: `${v}${unidad}`, line2: cfg.suffix || s.name, glyph: glifoSensorMando(s) };
  return conPuntos(tone ? { ...dato, tone } : dato);
}

/** Dos decimales para lo normal, cuatro para lo muy pequeño. Como el deck. */
function formatearImporteMando(v: number): string {
  if (v >= 1000) return Math.round(v).toLocaleString('en-US');
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function datoDivisaMando(boton: BotonWidgetMando, tasas: Record<string, TasasDivisa>): DatoWidgetVivo | null {
  const cfg = boton.currencyWidget;
  if (!cfg?.from || !cfg?.to) return null;
  const de = cfg.from.toUpperCase();
  const a = cfg.to.toUpperCase();
  const cuanto = cfg.amount && cfg.amount > 0 ? cfg.amount : 1;
  const segunda = `${formatearImporteMando(cuanto)} ${de}`;
  const tasa = de === a ? 1 : tasas[de]?.rates?.[a];
  if (tasa === undefined) return { line1: '—', line2: segunda };
  return { line1: `${formatearImporteMando(cuanto * tasa)} ${a}`, line2: segunda };
}

/**
 * El dato de un widget, o `null` si no hay nada que enseñar todavía (la
 * página deja entonces el icono). Mismo mapa que `CONSTRUCTORES` del deck; el
 * `slider` lo pinta la propia página con su control interactivo.
 */
function datoWidgetMando(boton: BotonWidgetMando, f: FuentesVivo): DatoWidgetVivo | null {
  switch (boton.widget) {
    case 'clock': return datoRelojMando(f);
    case 'weather': return datoClimaMando(f);
    case 'now-playing': return datoSonandoMando(boton, f);
    case 'variable': return datoVariableMando(boton, f);
    case 'sensor': return datoSensorMando(boton, f.sensores);
    case 'currency': return datoDivisaMando(boton, f.tasas);
    default: return null;
  }
}

function idiomaMando(pref: string | undefined): 'es' | 'en' {
  if (pref === 'es') return 'es';
  if (pref === 'en') return 'en';
  try {
    return app.getLocale().toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

interface BaseViva {
  botones: BotonFuenteMando[];
  encendidos: Set<string>;
  estado: Record<string, string>;
  lang: 'es' | 'en';
  sensores: Sensor[];
  procesos: string[];
}

/**
 * Los botones tal como los ve el deck ahora mismo: sin páginas de
 * superficie, sin botones sin acción, con la etiqueta ya interpolada y sin
 * los que la visibilidad condicional oculta.
 */
async function baseViva(): Promise<BaseViva> {
  const cfg = loadConfig() as {
    pages?: Array<{ superficie?: unknown }>;
    buttons?: BotonFuenteMando[];
    toggledIds?: string[];
    state?: Record<string, string>;
    language?: string;
  };
  const paginas = cfg?.pages ?? [];
  let sensores: Sensor[] = [];
  try {
    sensores = await listarSensores();
  } catch {
    // Sin sensores las condiciones por sensor se evalúan sin dato (oculto),
    // igual que el deck antes del primer sondeo.
  }
  // El mismo dato que pinta el deck: el sondeo único del proceso principal.
  const procesos = estadoActual().runningProcesses;
  const botones = (cfg?.buttons ?? []).filter((b) => {
    if (paginas[b.page ?? 0]?.superficie) return false;
    const tieneAccion = b.action && b.action.type !== 'none';
    const es2x2 = b.subButtons && b.subButtons.length === 4;
    const esSlider = b.widget === 'slider' || !!b.sliderWidget;
    if (!(tieneAccion || es2x2 || esSlider)) return false;
    return visibleMando(b, procesos, sensores);
  });
  return {
    botones,
    encendidos: new Set(cfg?.toggledIds ?? []),
    estado: cfg?.state ?? {},
    lang: idiomaMando(cfg?.language),
    sensores,
    procesos,
  };
}

/** Lo que sirve `/api/buttons`: puntos, etiqueta interpolada y visibilidad del deck. */
export async function botonesVivosParaMando(): Promise<BotonMandoMovil[]> {
  const base = await baseViva();
  return base.botones.map((b) => {
    const m = botonAMando(b, b.isToggle === true && base.encendidos.has(b.id));
    // Solo la etiqueta principal, como el deck (`resolvedLabel`): la
    // subetiqueta viaja tal cual.
    if (m.label.includes('{')) m.label = interpolarEtiquetaMando(m.label, base.estado);
    return m;
  });
}

async function juntarFuentesVivo(
  botones: BotonFuenteMando[],
  base: BaseViva,
): Promise<FuentesVivo> {
  const [sonando, clima] = await Promise.all([
    getNowPlaying().catch(() => null),
    getWeather().catch(() => null),
  ]);
  // Una petición por moneda base, no por botón: una respuesta trae 166 monedas.
  const monedas = botones
    .filter((b) => (b as BotonWidgetMando).widget === 'currency' && (b as BotonWidgetMando).currencyWidget?.from)
    .map((b) => (b as BotonWidgetMando).currencyWidget!.from.toUpperCase());
  const bases = [...new Set(monedas)];
  const tasas: Record<string, TasasDivisa> = {};
  for (const cu of bases) {
    const r = await obtenerTasas(cu).catch(() => null);
    if (r && r.ok && r.datos) tasas[cu] = r.datos;
  }
  return {
    estado: base.estado,
    ahora: new Date(),
    lang: base.lang,
    clima,
    sonando,
    sensores: base.sensores,
    tasas,
  };
}

/**
 * Lo que sirve `/api/widgets`: el dato de cada botón con widget en vivo.
 * Detrás del token como todo lo demás: no expone nada que el servidor no
 * exponga ya (sensores, reproducción, tasas y variables del propio deck).
 */
export async function widgetsVivosParaMando(): Promise<Record<string, DatoWidgetVivo>> {
  const base = await baseViva();
  const conWidget = base.botones.filter(
    (b) => !!(b as BotonWidgetMando).widget && (b as BotonWidgetMando).widget !== 'slider',
  );
  if (conWidget.length === 0) return {};
  const f = await juntarFuentesVivo(conWidget, base);
  const mapa: Record<string, DatoWidgetVivo> = {};
  for (const b of conWidget) {
    const d = datoWidgetMando(b as BotonWidgetMando, f);
    if (d) mapa[b.id] = d;
  }
  return mapa;
}
