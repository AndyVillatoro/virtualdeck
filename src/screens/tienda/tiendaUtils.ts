import type { DeckConfig, EntradaGaleria, InstaladoTienda } from '../../types';
import { versionMayor } from '../../utils/galeriaComun';

/**
 * Lógica de la tienda sin pantalla: comparar versiones, resumir lo instalado
 * desde la configuración y filtrar el manifiesto.
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
 * Estado de una entrada frente a lo instalado: nueva, instalada, o con
 * versión nueva publicada. Sin versión en los dos lados no hay update que
 * avisar: se queda en instalada.
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

export interface FiltrosTienda {
  texto: string;
  kind: 'all' | 'profile' | 'page';
  app: string;
  tag: string;
}

export const FILTROS_VACIOS: FiltrosTienda = { texto: '', kind: 'all', app: '', tag: '' };

/** Una entrada casa con el texto si aparece en nombre, autor, texto o etiquetas. */
function casaTexto(e: EntradaGaleria, texto: string): boolean {
  const q = texto.trim().toLowerCase();
  if (!q) return true;
  const donde = [e.label, e.author ?? '', e.description ?? '', ...(e.tags ?? [])]
    .join(' ').toLowerCase();
  return donde.includes(q);
}

/** Filtra el manifiesto por texto + tipo + app + etiqueta. Todo a la vez. */
export function filtrarEntradas(lista: EntradaGaleria[], f: FiltrosTienda): EntradaGaleria[] {
  return lista.filter((e) => {
    if (f.kind !== 'all' && (e.kind ?? 'profile') !== f.kind) return false;
    if (f.app && (e.targetApp ?? '') !== f.app) return false;
    if (f.tag && !(e.tags ?? []).includes(f.tag)) return false;
    return casaTexto(e, f.texto);
  });
}

/** Apps destino presentes en el manifiesto, para el desplegable. */
export function appsDeEntradas(lista: EntradaGaleria[]): string[] {
  const vistas = new Set<string>();
  for (const e of lista) if (e.targetApp) vistas.add(e.targetApp);
  return [...vistas].sort();
}

/** Etiquetas presentes en el manifiesto, para los chips. */
export function tagsDeEntradas(lista: EntradaGaleria[]): string[] {
  const vistas = new Set<string>();
  for (const e of lista) for (const tag of e.tags ?? []) vistas.add(tag);
  return [...vistas].sort();
}
