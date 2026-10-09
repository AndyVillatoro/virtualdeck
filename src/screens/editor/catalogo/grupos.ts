/* Grupos, items y búsqueda del catálogo de iconos (lógica pura, sin React).
 *
 * Los discriminadores son nombres de código (`glifo8`, `tabler`, `simple`),
 * no palabras de la interfaz: el texto visible sale del i18n. */

import { ALL_DOT_GLYPHS } from '../../../components/dot480/dotGlyphs8x8';
import type { EntradaIndice, IndiceDot } from '../../../data/iconosDot/tipos';
import type { SeccionCatalogo } from '../constantesCatalogo';

export type ClaseIcono = 'glifo8' | 'tabler' | 'simple';

export interface ItemCatalogo {
  /** Única en todo el catálogo: `glifo:PLAY`, `catálogo:id`. */
  clave: string;
  clase: ClaseIcono;
  id: string;
  nombre: string;
  etiquetas: string[];
  /** `catálogo:id` del icono de puntos; los glifos no tienen mapa de puntos. */
  origen?: string;
  /** Categoría de Tabler, solo en las acciones. */
  categoria?: string;
}

export const GRUPO_TODAS = 'todas';
export const GRUPO_RECIENTES = 'recientes';
export const GRUPO_GLIFOS = 'glifos';
export const GRUPO_TABLER = 'tabler';
export const GRUPO_SIMPLE = 'simple';

export const grupoAccionCategoria = (titulo: string) => `${GRUPO_TABLER}:${titulo}`;
export const grupoMarcaDestacada = (titulo: string) => `destacada:${titulo}`;
const claveGlifo = (nombre: string) => `glifo:${nombre}`;

export interface MapasIndice {
  accionesPorId: Map<string, EntradaIndice>;
  marcasPorId: Map<string, EntradaIndice>;
  /** id de marca → títulos de los grupos destacados a los que pertenece. */
  destacadasDeId: Map<string, string[]>;
}

export function indexarIndice(indice: IndiceDot | null): MapasIndice {
  const accionesPorId = new Map<string, EntradaIndice>();
  const marcasPorId = new Map<string, EntradaIndice>();
  const destacadasDeId = new Map<string, string[]>();
  if (!indice) return { accionesPorId, marcasPorId, destacadasDeId };
  for (const entrada of indice.acciones) accionesPorId.set(entrada[0], entrada);
  for (const entrada of indice.marcas) marcasPorId.set(entrada[0], entrada);
  for (const grupo of indice.destacadas) {
    for (const id of grupo.ids ?? []) {
      const titulos = destacadasDeId.get(id) ?? [];
      titulos.push(grupo.titulo);
      destacadasDeId.set(id, titulos);
    }
  }
  return { accionesPorId, marcasPorId, destacadasDeId };
}

/** Todos los iconos elegibles: los 69 glifos 8×8 y cada entrada del índice. */
export function construirItems(indice: IndiceDot): ItemCatalogo[] {
  const items: ItemCatalogo[] = [];
  for (const glifo of ALL_DOT_GLYPHS) {
    items.push({ clave: claveGlifo(glifo), clase: 'glifo8', id: glifo, nombre: glifo, etiquetas: [] });
  }
  for (const [id, nombre, etiquetas, origen] of indice.acciones) {
    items.push({
      clave: `${origen.catalogo}:${id}`,
      clase: 'tabler',
      id,
      nombre,
      etiquetas,
      origen: `${origen.catalogo}:${id}`,
      categoria: origen.categoria,
    });
  }
  for (const [id, nombre, etiquetas, origen] of indice.marcas) {
    items.push({
      clave: `${origen.catalogo}:${id}`,
      clase: 'simple',
      id,
      nombre,
      etiquetas,
      origen: `${origen.catalogo}:${id}`,
    });
  }
  return items;
}

/** La misma búsqueda de antes (id, nombre y etiquetas) más la categoría, que dejó de vivir en las etiquetas. */
export function coincideBusqueda(
  item: ItemCatalogo,
  terminos: string[],
  alias?: MapasAlias,
): boolean {
  const id = item.id.toLowerCase();
  const nombre = item.nombre.toLowerCase();
  const categoria = (item.categoria ?? '').toLowerCase();
  const etiquetas = item.etiquetas.map((e) => e.toLowerCase());
  const categoriaTrad =
    alias && item.categoria ? (alias.categoriaTraducida.get(item.categoria) ?? '') : '';
  const aliasTexto = alias
    ? item.etiquetas.map((e) => alias.aliasPorEtiqueta.get(e) ?? '').join(' ')
    : '';
  return terminos.every((crudo) => {
    const t = normalizarBusqueda(crudo);
    return (
      id.includes(t) ||
      nombre.includes(t) ||
      categoria.includes(t) ||
      categoriaTrad.includes(t) ||
      aliasTexto.includes(t) ||
      etiquetas.some((e) => e.includes(t))
    );
  });
}

/** Slug de una categoría de Tabler: el título en minúsculas con guiones (`icat.<slug>`). */
export function slugCategoria(titulo: string): string {
  return titulo.toLowerCase().replace(/\s+/g, '-');
}

/** Minúsculas sin tildes, para comparar lo que se escribe con lo traducido. */
function normalizarBusqueda(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mapa inverso de la búsqueda en el idioma actual: cada etiqueta inglesa y
 * cada categoría, a su texto traducido ya normalizado. Se construye una vez
 * por idioma (memo en el hook), no una por icono y tecla.
 */
export interface MapasAlias {
  aliasPorEtiqueta: Map<string, string>;
  categoriaTraducida: Map<string, string>;
}

export function construirMapaAlias(
  items: ItemCatalogo[],
  t: (clave: string) => string,
): MapasAlias {
  const aliasPorEtiqueta = new Map<string, string>();
  const categoriaTraducida = new Map<string, string>();
  for (const item of items) {
    for (const etiqueta of item.etiquetas) {
      if (aliasPorEtiqueta.has(etiqueta)) continue;
      const clave = `ialias.${etiqueta}`;
      const traducido = t(clave);
      aliasPorEtiqueta.set(etiqueta, clave === traducido ? '' : normalizarBusqueda(traducido));
    }
    const categoria = item.categoria;
    if (categoria && !categoriaTraducida.has(categoria)) {
      const clave = `icat.${slugCategoria(categoria)}`;
      const traducido = t(clave);
      categoriaTraducida.set(categoria, normalizarBusqueda(clave === traducido ? categoria : traducido));
    }
  }
  return { aliasPorEtiqueta, categoriaTraducida };
}

export function perteneceAGrupo(
  item: ItemCatalogo,
  grupo: string,
  mapas: MapasIndice,
  recientes: Set<string>,
): boolean {
  if (grupo === GRUPO_TODAS) return true;
  if (grupo === GRUPO_RECIENTES) return recientes.has(item.clave);
  if (grupo === GRUPO_GLIFOS) return item.clase === 'glifo8';
  if (grupo === GRUPO_TABLER) return item.clase === 'tabler';
  if (grupo === GRUPO_SIMPLE) return item.clase === 'simple';
  if (grupo.startsWith(`${GRUPO_TABLER}:`)) {
    return item.clase === 'tabler' && item.categoria === grupo.slice(GRUPO_TABLER.length + 1);
  }
  if (grupo.startsWith('destacada:')) {
    const titulo = grupo.slice('destacada:'.length);
    return item.clase === 'simple' && (mapas.destacadasDeId.get(item.id) ?? []).includes(titulo);
  }
  return false;
}

/** Cuántos de estos items caen en cada grupo (para los recuentos de la barra). */
export function contarGrupos(
  items: ItemCatalogo[],
  mapas: MapasIndice,
  recientes: Set<string>,
): Map<string, number> {
  const cuenta = new Map<string, number>();
  const sumar = (grupo: string) => cuenta.set(grupo, (cuenta.get(grupo) ?? 0) + 1);
  for (const item of items) {
    sumar(GRUPO_TODAS);
    if (recientes.has(item.clave)) sumar(GRUPO_RECIENTES);
    if (item.clase === 'glifo8') {
      sumar(GRUPO_GLIFOS);
    } else if (item.clase === 'tabler') {
      sumar(GRUPO_TABLER);
      if (item.categoria) sumar(grupoAccionCategoria(item.categoria));
    } else {
      sumar(GRUPO_SIMPLE);
      for (const titulo of mapas.destacadasDeId.get(item.id) ?? []) sumar(grupoMarcaDestacada(titulo));
    }
  }
  return cuenta;
}

/** El grupo del icono que ya tiene el botón, o el catálogo por defecto. */
export function grupoInicial(
  mapas: MapasIndice,
  origen: string | undefined,
  catalogoInicial: SeccionCatalogo,
): string {
  if (origen) {
    const separador = origen.indexOf(':');
    const id = separador >= 0 ? origen.slice(separador + 1) : '';
    const accion = mapas.accionesPorId.get(id);
    if (accion) {
      const categoria = accion[3].categoria;
      return categoria ? grupoAccionCategoria(categoria) : GRUPO_TABLER;
    }
    if (mapas.marcasPorId.has(id)) {
      const titulos = mapas.destacadasDeId.get(id);
      return titulos?.length ? grupoMarcaDestacada(titulos[0]) : GRUPO_SIMPLE;
    }
  }
  if (catalogoInicial === 'glifos') return GRUPO_GLIFOS;
  return catalogoInicial === 'marcas' ? GRUPO_SIMPLE : GRUPO_TABLER;
}

/** Items de los recientes, en el orden en que se guardaron; los que ya no existen se saltan. */
export function resolverRecientes(
  claves: string[],
  itemsPorClave: Map<string, ItemCatalogo>,
): ItemCatalogo[] {
  const items: ItemCatalogo[] = [];
  for (const clave of claves) {
    const item = itemsPorClave.get(clave);
    if (item) items.push(item);
  }
  return items;
}
