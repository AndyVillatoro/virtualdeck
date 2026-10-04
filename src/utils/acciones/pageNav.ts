import type { ButtonAction, PageConfig } from '../../types';
import { idPaginaPredeterminada } from '../superficies/paginaSegunApp';

// Las páginas del deck (sin las de dock) también se filtran al enseñar y al
// navegar con pestañas, gestos y atajos: se reexportan aquí para que cada
// pantalla no importe dos módulos de navegación.
export { esPaginaDeck, indicesPaginasDeck, posicionEnDeck, indiceRealPorNumero } from '../paginasDeck';

/**
 * Navegación entre páginas (`page-nav`), en un solo sitio.
 *
 * Es una acción que **resuelve quien la llama** (como `folder`): `pulsarBoton`
 * aparta los pasos `page-nav` de la secuencia y los resuelve con el callback
 * `navegar` que le pasa cada llamador, porque solo él sabe el contexto —desde
 * un dock se navega entre las páginas de ese dock, desde el deck entre las
 * del deck— y cómo aplicar el cambio (`onPageChange` o `activarPagina`).
 *
 * Lo único que sí es compartido es el cálculo del destino, que es puro: dada
 * la lista de ids ya filtrada al contexto, la página actual y el modo, dice a
 * qué id hay que ir. `next`/`prev` se paran en los extremos (devuelven `null`
 * y quien llama lo trata como OK sin efecto, igual que `folder` cuando no hay
 * nada que abrir); solo `cycle` da la vuelta al final.
 */

/** Las páginas entre las que se puede navegar, en orden. */
export function paginasNavegables(paginas: PageConfig[], serial: string | null): PageConfig[] {
  // Por id y por filtro, nunca por índice: borrar o reordenar páginas renumera
  // los índices. `serial === null` es el deck: sus páginas son las que no son
  // de ningún dock (ver `useAutoProfile`, que las salta por lo mismo).
  return paginas.filter((p) => (serial ? p.superficie?.serial === serial : !p.superficie));
}

/**
 * El id destino, o `null` si no hay a dónde ir.
 *
 * `ids` ya viene filtrada al contexto (`paginasNavegables`). Sin modo se va a
 * la siguiente, como los presets de perilla y botón. `next` en la última y
 * `prev` en la primera no van a ninguna parte (`null`): con dos páginas las
 * dos iban a la otra y no se distinguían. `cycle` es la siguiente con vuelta
 * al principio. Si la actual ya no está en la lista (página borrada), `next` y
 * `cycle` empiezan por la primera y `prev` por la última en vez de saltar a un
 * sitio arbitrario. `goto` a un id que no está en la lista no va a ninguna
 * parte —quien llama lo deja como OK, igual que `folder` cuando no hay nada
 * que abrir—.
 */
export function destinoPageNav(
  ids: string[],
  actualId: string | undefined,
  modo: ButtonAction['pageNav'],
  objetivoId: string | undefined,
): string | null {
  if (ids.length === 0) return null;
  switch (modo ?? 'next') {
    case 'first':
      return ids[0];
    case 'goto':
      return objetivoId !== undefined && ids.includes(objetivoId) ? objetivoId : null;
    case 'prev': {
      const i = actualId !== undefined ? ids.indexOf(actualId) : -1;
      if (i === -1) return ids[ids.length - 1];
      if (i === 0) return null;
      return ids[i - 1];
    }
    case 'cycle': {
      const i = actualId !== undefined ? ids.indexOf(actualId) : -1;
      if (i === -1) return ids[0];
      return ids[(i + 1) % ids.length];
    }
    case 'next': {
      const i = actualId !== undefined ? ids.indexOf(actualId) : -1;
      if (i === -1) return ids[0];
      if (i === ids.length - 1) return null;
      return ids[i + 1];
    }
  }
}

/**
 * Resuelve un paso `page-nav` con el contexto del llamador.
 *
 * Devuelve `true` si se navegó. Filtra las páginas al contexto (las del
 * `serial`, o las del deck si es `null`), calcula el destino puro y lo aplica
 * con `alIr`, que recibe el **id**. Cada llamador mapea el id a lo suyo —el
 * deck a su índice con `onPageChange`, el dock a `activarPagina`—.
 */
export function resolverPageNav(
  accion: ButtonAction,
  paginas: PageConfig[],
  actualId: string | undefined,
  serial: string | null,
  alIr: (paginaId: string) => void,
): boolean {
  const ids = paginasNavegables(paginas, serial).map((p) => p.id);
  const destino = destinoPageNav(ids, actualId, accion.pageNav, accion.pageNavTarget);
  if (!destino) return false;
  alIr(destino);
  return true;
}

/**
 * Callback `navegar` para el deck (principal, kiosko y disparador de `App`):
 * navega entre sus páginas con `onPageChange`, así `useAutoProfile` lo toma
 * como elección manual y la guarda como base.
 */
export function navegarDeck(
  accion: ButtonAction,
  paginas: PageConfig[],
  actualId: string | undefined,
  onPageChange: (indice: number) => void,
): boolean {
  return resolverPageNav(accion, paginas, actualId, null, (id) => {
    const i = paginas.findIndex((p) => p.id === id);
    if (i !== -1) onPageChange(i);
  });
}

/**
 * Callback `navegar` para un dock físico: navega entre sus páginas con
 * `activarPagina`, que además la marca como base.
 */
export function navegarDock(
  accion: ButtonAction,
  paginas: PageConfig[],
  serial: string,
  actualId: string | undefined,
  activar: (paginaId: string) => void,
): boolean {
  // Un dock que nunca cambió de página no tiene activa registrada: enseña la
  // predeterminada. Sin esto, «siguiente» calculaba desde ninguna, iba a la
  // primera —la que ya se veía— y la primera pulsación no hacía nada.
  const desde = actualId ?? idPaginaPredeterminada(paginas, serial) ?? undefined;
  return resolverPageNav(accion, paginas, desde, serial, activar);
}

/**
 * El `navegar` del disparador de `App` (hardware, atajos, bandeja, hora y
 * sensores): con serial navega en ese dock, sin él en el deck. Junta los dos
 * de arriba para no repetir el reparto.
 */
export function navegarDesdeApp(
  accion: ButtonAction,
  paginas: PageConfig[],
  indiceDeck: number,
  serial: string | undefined,
  onPageChange: (indice: number) => void,
  superficies: {
    paginasActivas: Record<string, string>;
    activarPagina: (serial: string, paginaId: string) => void;
  } | null,
): boolean {
  if (serial) {
    return navegarDock(accion, paginas, serial,
      superficies?.paginasActivas[serial],
      (id) => superficies?.activarPagina(serial, id));
  }
  return navegarDeck(accion, paginas, paginas[indiceDeck]?.id, onPageChange);
}
