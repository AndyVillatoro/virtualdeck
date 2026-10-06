import { app } from 'electron';
import { loadConfig } from './configManager';
import { estadoActual } from './estadoSistema';
import { list as listarSensores, type Sensor } from './sensors';
import { getNowPlaying } from './media';
import { getWeather } from './weather';
import { obtenerTasas, type TasasDivisa } from './divisas';
import { DOT_GLYPHS_8X8 } from '../../src/components/dot480/dotGlyphs8x8';
import { interpolate } from '../../src/comun/interpolar';
import { botonVisibleSegun } from '../../src/comun/visibilidad';
import { datosDeWidget, type DatosWidget, type FuentesWidget } from '../../src/comun/widgets';
import { botonAMando, type BotonFuenteMando, type BotonMandoMovil, type IconoPuntosMando } from './iconosMando';

/**
 * Lo vivo del mando móvil (roadmap 82, T-PAR-02): variables, visibilidad y
 * widgets, con el mismo criterio que el deck.
 *
 * Vive aquí y no en `servidorLocal.ts` porque ese archivo ya va cargado: la
 * regla del proyecto pide sacar lo nuevo a archivos aparte (≤600 líneas).
 *
 * La lógica compartida con el deck sale de `src/comun/` (`interpolate`,
 * `botonVisibleSegun` y `datosDeWidget`): el proceso principal no puede
 * importar de `src/utils` ni de `src/components` (regla `main-no-renderer`),
 * y las copias a mano que había antes ya habían divergido.
 */

/** Lo que la página del móvil pinta encima del botón, como el deck. */
export interface DatoWidgetVivo extends DatosWidget {
  puntos?: IconoPuntosMando;
}

/** Nombre de glifo → puntos 8×8, para que la página solo dibuje. */
function puntosDeGlifo(nombre: string | undefined): IconoPuntosMando | undefined {
  if (!nombre) return undefined;
  const filas = DOT_GLYPHS_8X8[nombre];
  return filas ? { lado: 8, filas: [...filas] } : undefined;
}

function conPuntos(dato: DatosWidget): DatoWidgetVivo {
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
  const conjuntoProcesos = new Set(procesos);
  const botones = (cfg?.buttons ?? []).filter((b) => {
    if (paginas[b.page ?? 0]?.superficie) return false;
    const tieneAccion = b.action && b.action.type !== 'none';
    const es2x2 = b.subButtons && b.subButtons.length === 4;
    const esSlider = b.widget === 'slider' || !!b.sliderWidget;
    if (!(tieneAccion || es2x2 || esSlider)) return false;
    return botonVisibleSegun(b, conjuntoProcesos, sensores);
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
    if (m.label.includes('{')) m.label = interpolate(m.label, base.estado);
    return m;
  });
}

async function juntarFuentesVivo(
  botones: BotonFuenteMando[],
  base: BaseViva,
): Promise<FuentesWidget> {
  const [sonando, clima] = await Promise.all([
    getNowPlaying().catch(() => null),
    getWeather().catch(() => null),
  ]);
  // Una petición por moneda base, no por botón: una respuesta trae 166 monedas.
  const monedas = botones
    .filter((b) => b.widget === 'currency' && b.currencyWidget?.from)
    .map((b) => b.currencyWidget!.from.toUpperCase());
  const bases = [...new Set(monedas)];
  const tasas: Record<string, TasasDivisa> = {};
  for (const cu of bases) {
    const r = await obtenerTasas(cu).catch(() => null);
    if (r && r.ok && r.datos) tasas[cu] = r.datos;
  }
  return {
    estado: base.estado,
    reloj: new Date(),
    lang: base.lang,
    clima,
    sonando,
    sensores: base.sensores,
    divisas: tasas,
    hora: formatoHoraMando(base.lang),
    fecha: formatoFechaMando(base.lang),
  };
}

/**
 * Lo que sirve `/api/widgets`: el dato de cada botón con widget en vivo.
 * Detrás del token como todo lo demás: no expone nada que el servidor no
 * exponga ya (sensores, reproducción, tasas y variables del propio deck).
 */
export async function widgetsVivosParaMando(): Promise<Record<string, DatoWidgetVivo>> {
  const base = await baseViva();
  const conWidget = base.botones.filter((b) => !!b.widget && b.widget !== 'slider');
  if (conWidget.length === 0) return {};
  const f = await juntarFuentesVivo(conWidget, base);
  const mapa: Record<string, DatoWidgetVivo> = {};
  for (const b of conWidget) {
    const d = datosDeWidget(b, f);
    if (d) mapa[b.id] = conPuntos(d);
  }
  return mapa;
}
