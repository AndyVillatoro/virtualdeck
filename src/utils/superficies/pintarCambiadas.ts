import type { ButtonConfig, DeckConfig, ElectronAPI } from '../../types';
import type { DatosWidget } from '../../comun/widgets';
import {
  aplicarAspectoAudio, resolverAspectoAudio, type AspectoAudio,
} from '../../comun/audioIcono';
import { teclasLcd } from './disposicion';
import { contextoDe } from '../plugins/ref';
import { leerVisual } from '../plugins/visual';
import type { PluginVisual } from '../../types/plugins';
import { firmaWidget } from './widgetLcd';
import {
  pintarTecla, resolverBotonLcd, type ColoresSuperficie, type OpcionesPintado,
} from './pintarTecla';
import type { PaginaDispositivo } from './paginasSuperficie';

/**
 * El repintado incremental de las teclas del dock (antes en `useSuperficies`):
 * la firma de cada tecla —si no cambia, no se pinta—, la imagen del plugin que
 * manda sobre ella, el envío al aparato y el brillo aplicado una sola vez por
 * valor.
 */

/** Lo que se dibuja de una tecla. Si no cambia, no se vuelve a pintar. */
function firmaDe(
  boton: ButtonConfig | undefined, encendido: boolean,
  ancho: number, alto: number, rotacion: number,
  colores: ColoresSuperficie, fuentes: boolean, datos?: DatosWidget | null,
  visual?: PluginVisual | null, audio?: string | null,
): string {
  if (!boton) return `empty:${ancho}:${alto}:${rotacion}:${fuentes}`;
  // `label`/`sublabel` llegan ya interpolados desde `paginaDe`: la firma lleva
  // el texto final (`{VOL}` resuelto), así que un cambio de variable repinta.
  // `firmaWidget` es la parte del dato vivo: solo repinta la tecla cuyo
  // `line1`/`line2`/`tone`/`glyph` cambió. Lo que el plugin pinta (`setImage`/
  // `setTitle`) también firma: sin esto la tecla no se repinta al llegar.
  // `audio` es la salida activa + el aspecto reactivo de los botones de
  // audio: sin esto la tecla no se repinta al cambiar la salida fuera del
  // botón (Fase 2 del switch).
  return JSON.stringify([
    boton.label, boton.sublabel, boton.icon, boton.iconoPuntos?.bits, boton.imageData,
    boton.customGlyph57, boton.brandIcon, boton.subButtons,
    boton.brandIconCustomBitmap, boton.brandIconCustomColor, boton.brandIconCustomPalette,
    boton.bgColor, boton.fgColor, boton.action?.type,
    boton.isToggle, boton.animacion, boton.efectoPulsar, boton.aspectoEncendido, encendido,
    ancho, alto, rotacion, colores.fondo, colores.texto, colores.aviso, colores.critico,
    fuentes, firmaWidget(datos), visual?.imagen ?? null, visual?.titulo ?? null, audio ?? null,
  ]);
}

/** Lo que el plugin de la tecla está pintando, por su contexto de superficie. */
function visualDe(boton: ButtonConfig | undefined, config: DeckConfig): PluginVisual | undefined {
  if (boton?.action.type !== 'plugin') return undefined;
  return leerVisual(contextoDe(boton, config));
}

/** La salida que manda ahora mismo, con los nombres para la heurística. */
interface ContextoAudio {
  porId: Map<string, string>;
  defecto: string | null;
}

let cacheAudio: { ts: number; ctx: ContextoAudio } | null = null;
const TTL_AUDIO_MS = 2000;

/**
 * Foto de audio para la página: solo se pide si hay botones de audio en
 * ella. Con caché corta compartida: el efecto que llama aquí corre en cada
 * cambio del estado del sistema (cada ~5 s), y sin caché sería una consulta
 * al sistema por repintado.
 */
async function contextoAudio(
  api: ElectronAPI, pagina: PaginaDispositivo,
): Promise<ContextoAudio | null> {
  if (!pagina.botones.some((b) => b?.action.type === 'audio-device')) return null;
  const ahora = Date.now();
  if (cacheAudio && ahora - cacheAudio.ts < TTL_AUDIO_MS) return cacheAudio.ctx;
  try {
    const lista = await api.audio.list();
    const porId = new Map(lista.map((d) => [d.id.trim().toLowerCase(), d.name] as const));
    const ctx = { porId, defecto: lista.find((d) => d.isDefault)?.id ?? null };
    cacheAudio = { ts: ahora, ctx };
    return ctx;
  } catch {
    return cacheAudio?.ctx ?? null;
  }
}

/** El aspecto reactivo de un botón de audio y su parte de la firma. */
function aspectoAudioDe(
  boton: ButtonConfig | undefined, ctx: ContextoAudio | null,
): { aspecto: AspectoAudio | null; firma: string | null } {
  if (!boton || boton.action.type !== 'audio-device' || !ctx) {
    return { aspecto: null, firma: null };
  }
  const defecto = ctx.defecto;
  const nombre = defecto && ctx.porId.get(defecto.trim().toLowerCase());
  const aspecto = resolverAspectoAudio(boton.action, defecto, nombre);
  const firma = `${defecto ?? ''}|${aspecto?.icon ?? ''}|${aspecto?.sublabel ?? ''}`;
  return { aspecto, firma };
}

/** Pinta las teclas cuya firma cambió y devuelve las imágenes nuevas por hueco. */
export async function pintarCambiadas(
  api: ElectronAPI,
  serial: string,
  pagina: PaginaDispositivo,
  colores: ColoresSuperficie,
  opciones: OpcionesPintado,
  firmas: Map<string, string[]>,
  fuentes: boolean,
  encendidos: Set<string>,
  widgets: Record<string, DatosWidget>,
  config: DeckConfig,
  conAviso?: (serial: string, hueco: number) => boolean,
): Promise<Record<number, string>> {
  const previas = firmas.get(serial) ?? [];
  const nuevas: string[] = [];
  const pintadas: Record<number, string> = {};
  const ctxAudio = await contextoAudio(api, pagina);
  for (const { hueco, indice, lcd } of teclasLcd(pagina.disposicion)) {
    const boton = pagina.botones[hueco];
    const encendido = !!boton && encendidos.has(boton.id);
    const { aspecto, firma: firmaAudio } = aspectoAudioDe(boton, ctxAudio);
    const efectivo = boton ? aplicarAspectoAudio(resolverBotonLcd(boton, encendido), aspecto) : boton;
    const datos = boton ? widgets[boton.id] : undefined;
    const visual = visualDe(boton, config);
    const rotacion = pagina.rotacion ?? lcd.rotacion;
    const firma = firmaDe(efectivo, encendido, lcd.ancho, lcd.alto, rotacion, colores, fuentes, datos, visual, firmaAudio);
    nuevas[hueco] = firma;
    if (previas[hueco] === firma) continue;
    // Una tecla que está enseñando un aviso no se pisa: la firma queda al día
    // y el aviso repinta lo normal al vencer (T-HW-21).
    if (conAviso?.(serial, hueco)) continue;
    const imagen = await pintarTecla(efectivo ?? null, lcd, colores, opciones, rotacion, undefined, datos, visual);
    await api.superficies.imagen(serial, indice, imagen.jpegBase64);
    if (imagen.dataUrl) pintadas[hueco] = imagen.dataUrl;
  }
  firmas.set(serial, nuevas);
  return pintadas;
}

export function aplicarBrillo(
  api: ElectronAPI,
  serial: string,
  brillo: number | undefined,
  aplicados: Map<string, number>,
): void {
  if (brillo === undefined || aplicados.get(serial) === brillo) return;
  aplicados.set(serial, brillo);
  void api.superficies.brillo(serial, brillo);
}
