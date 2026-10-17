import type {
  CodigoInstalacion,
  DeckConfig,
  EntradaGaleria,
  InstaladoTienda,
  PluginInfo,
  ResumenRiesgo,
} from '../../types';
import { versionMayor } from '../../utils/galeriaComun';
import { estadoPluginTienda, type EstadoPluginTienda } from '../../utils/plugins/estadoTienda';

/**
 * Lógica de la tienda sin pantalla: comparar versiones, resumir lo instalado
 * desde la configuración y los plugins, filtrar el manifiesto y traducir errores.
 */

export type EstadoEntrada = 'nuevo' | 'instalado' | 'update';

/**
 * Lo instalado desde la tienda, resumido para comparar.
 * Los perfiles y las páginas sellan su `origen` al instalarse (T-P4 Fase 1);
 * lo que no lo trae (instalado a mano o de antes) no participa en updates.
 */
export function instaladosDeConfig(cfg: DeckConfig): InstaladoTienda[] {
  const salida: InstaladoTienda[] = [];
  for (const p of cfg.profiles ?? []) {
    if (!p.origen?.entryId) continue;
    salida.push({
      kind: 'profile', label: p.name,
      entryId: p.origen.entryId, manifestUrl: p.origen.manifestUrl, version: p.origen.version,
    });
  }
  for (const p of cfg.pages ?? []) {
    if (!p.origen?.entryId) continue;
    salida.push({
      kind: 'page', label: p.name,
      entryId: p.origen.entryId, manifestUrl: p.origen.manifestUrl, version: p.origen.version,
    });
  }
  return salida;
}

/** Si el instalado es de esta entrada: mismo id y mismo manifiesto (o sin dato). */
function esElMismo(e: EntradaGaleria, i: InstaladoTienda, manifestUrl: string): boolean {
  if (i.entryId !== e.id) return false;
  if (i.manifestUrl && manifestUrl && i.manifestUrl !== manifestUrl) return false;
  return true;
}

/**
 * Estado de una entrada de perfil o página frente a lo instalado: nueva,
 * instalada o con versión nueva publicada.
 */
export function estadoDeEntrada(
  e: EntradaGaleria, instalados: InstaladoTienda[], manifestUrl: string,
): { estado: EstadoEntrada; instalado?: InstaladoTienda } {
  const instalado = instalados.find((i) => esElMismo(e, i, manifestUrl));
  if (!instalado) return { estado: 'nuevo' };
  if (e.version && instalado.version && versionMayor(e.version, instalado.version)) {
    return { estado: 'update', instalado };
  }
  return { estado: 'instalado', instalado };
}

/**
 * Estado unificado para cualquier entrada del manifiesto (perfil, página o plugin).
 * Para plugins delega en `estadoPluginTienda` (`src/utils/plugins/estadoTienda.ts`).
 */
export function estadoGeneralDeEntrada(
  e: EntradaGaleria,
  instalados: InstaladoTienda[],
  pluginsInstalados: PluginInfo[],
  manifestUrl: string,
): { estado: EstadoEntrada; estadoPlugin?: EstadoPluginTienda; versionInstalada?: string } {
  if (e.kind === 'plugin') {
    const estPlugin = estadoPluginTienda(e, pluginsInstalados);
    const plg = e.uuid ? pluginsInstalados.find((p) => p.uuid === e.uuid) : undefined;
    const estado: EstadoEntrada = estPlugin === 'actualizable'
      ? 'update'
      : estPlugin === 'instalado'
        ? 'instalado'
        : 'nuevo';
    return { estado, estadoPlugin: estPlugin, versionInstalada: plg?.version };
  }
  const { estado, instalado } = estadoDeEntrada(e, instalados, manifestUrl);
  return { estado, versionInstalada: instalado?.version };
}

export type TipoFiltroTienda = 'all' | 'profile' | 'page' | 'plugin';

export interface FiltrosTienda {
  texto: string;
  kind: TipoFiltroTienda;
  app: string;
  tag: string;
}

export const FILTROS_VACIOS: FiltrosTienda = { texto: '', kind: 'all', app: '', tag: '' };

/** Una entrada casa con el texto si aparece en nombre, autor, descripción, uuid, app o etiquetas. */
function casaTexto(e: EntradaGaleria, texto: string): boolean {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  const donde = [
    e.label,
    e.author ?? '',
    e.description ?? '',
    e.uuid ?? '',
    e.targetApp ?? '',
    ...(e.tags ?? []),
  ].join(' ').toLowerCase();
  return donde.includes(q);
}

/** Filtra el manifiesto por texto + tipo + app + etiqueta. Todo a la vez. */
export function filtrarEntradas(lista: EntradaGaleria[], f: FiltrosTienda): EntradaGaleria[] {
  return lista.filter((e) => {
    const kind = e.kind ?? 'profile';
    if (f.kind !== 'all' && kind !== f.kind) return false;
    if (f.app && (e.targetApp ?? '') !== f.app) return false;
    if (f.tag && !(e.tags ?? []).includes(f.tag)) return false;
    return casaTexto(e, f.texto);
  });
}

/** Conteo de entradas por categoría para las pestañas de navegación. */
export function contarPorTipo(lista: EntradaGaleria[]): Record<TipoFiltroTienda, number> {
  const conteos: Record<TipoFiltroTienda, number> = { all: lista.length, profile: 0, page: 0, plugin: 0 };
  for (const e of lista) {
    const k = e.kind ?? 'profile';
    if (k === 'page') conteos.page += 1;
    else if (k === 'plugin') conteos.plugin += 1;
    else conteos.profile += 1;
  }
  return conteos;
}

/**
 * Selecciona hasta 2 entradas destacadas para la vitrina superior cuando no hay
 * búsqueda textual ni filtros secundarios activos. Prioriza las que tienen
 * imagen de portada o variedad de tipos.
 */
export function elegirDestacados(lista: EntradaGaleria[]): EntradaGaleria[] {
  if (lista.length === 0) return [];
  const conPortada = lista.filter((e) => Boolean(e.portada));
  if (conPortada.length >= 2) return conPortada.slice(0, 2);
  if (conPortada.length === 1) {
    const otra = lista.find((e) => e.id !== conPortada[0].id);
    return otra ? [conPortada[0], otra] : conPortada;
  }
  const primera = lista[0];
  const distintoTipo = lista.find((e) => e.id !== primera.id && (e.kind ?? 'profile') !== (primera.kind ?? 'profile'));
  const segunda = distintoTipo ?? lista[1];
  return segunda ? [primera, segunda] : [primera];
}

/** Apps destino presentes en el manifiesto, para el desplegable. */
export function appsDeEntradas(lista: EntradaGaleria[]): string[] {
  const vistas = new Set<string>();
  for (const e of lista) if (e.targetApp) vistas.add(e.targetApp);
  return [...vistas].sort();
}

/** Etiquetas presentes en el manifiesto (o en la pestaña activa), para los chips. */
export function tagsDeEntradas(lista: EntradaGaleria[], kind: TipoFiltroTienda = 'all'): string[] {
  const vistas = new Set<string>();
  for (const e of lista) {
    if (kind !== 'all' && (e.kind ?? 'profile') !== kind) continue;
    for (const tag of e.tags ?? []) vistas.add(tag);
  }
  return [...vistas].sort();
}

/** Traduce el código de fallo de instalación de un plugin a una cadena localizada. */
export function traducirErrorPlugin(
  codigo: CodigoInstalacion,
  detalle: string | undefined,
  t: (k: string, vars?: Record<string, string | number>) => string,
): string {
  switch (codigo) {
    case 'descarga': return t('tienda.errDescarga');
    case 'hash': return t('tienda.errHash');
    case 'zip': return t('tienda.errZip');
    case 'tamano': return t('tienda.errTamano');
    case 'cifrado': return t('tienda.errCifrado');
    case 'invalido': return detalle ? `${t('tienda.errInvalido')} (${detalle})` : t('tienda.errInvalido');
    case 'os': return t('tienda.errOs');
    case 'exe': return t('tienda.errExe');
    case 'duplicado': return t('tienda.errDuplicado');
    case 'cancelado': return '';
    default: return t('tienda.errGenerico');
  }
}

/** Arma el resumen de riesgo de un plugin para mostrarlo con `BloquesRiesgoTienda`. */
export function construirRiesgoPlugin(
  e: EntradaGaleria,
  t: (k: string, vars?: Record<string, string | number>) => string,
): ResumenRiesgo {
  const idPlugin = e.uuid && e.uuid.trim() ? e.uuid : e.id;
  return {
    botones: 0,
    scripts: [t('tienda.pluginRiskScript', { plugin: idPlugin })],
    programas: [],
    atajosGlobales: [],
    webhooks: [],
    urls: [],
    teclas: [],
    automaticos: [],
    integraciones: [],
  };
}
