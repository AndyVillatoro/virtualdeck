import { CURRENT_CONFIG_VERSION } from './configMigration';
import type { ButtonConfig, DeckConfig, PageConfig } from '../types';

/**
 * La configuración de una instalación nueva.
 *
 * Vive aparte de `App` porque la necesitan dos sitios: la pantalla, y el hook
 * que gestiona la configuración.
 */

export const PAGES_DEFAULT: PageConfig[] = [
  { id: 'main', name: 'Main' },
];

export function makeDefaultButtons(pages: PageConfig[] = PAGES_DEFAULT): ButtonConfig[] {
  const btns: ButtonConfig[] = [];
  for (let page = 0; page < pages.length; page++) {
    const gs = pages[page]?.gridSize ?? 4;
    const gr = pages[page]?.gridRows ?? gs;
    const slots = gs * gr;
    for (let slot = 0; slot < Math.max(16, slots); slot++) {
      btns.push({ id: `${page}-${slot}`, page, label: '', icon: '', action: { type: 'none' } });
    }
  }
  return btns;
}

/**
 * Los botones de una configuracion guardada, con todos los huecos cubiertos.
 *
 * Sustituye a la fusion **por id** que hacia `App` al cargar
 * (`makeDefaultButtons(pages).map(def => guardados.find(b => b.id === def.id) ?? def)`).
 * Aquella daba por hecho que el id de un boton es siempre `${pagina}-${hueco}`,
 * y hay cuatro caminos en los que no lo es:
 *
 *   · `addPage` acuña `p<timestamp>_<hueco>`
 *   · `setPageGridSize`, al agrandar la rejilla, tambien
 *   · la importacion de una pagina, tambien
 *   · borrar una pagina renumera `b.page` pero **no** los ids, asi que un
 *     boton que era `2-5` acaba en la pagina 1 con ese id
 *
 * En los cuatro casos el `find` no encontraba nada y devolvia el hueco vacio:
 * los botones existian en el archivo y desaparecian de la pantalla al
 * reiniciar. Medido con dos paginas en el mismo arranque, una con ids
 * canonicos y otra creada con «agregar pagina»: la primera conservo sus cuatro
 * etiquetas y la segunda ninguna.
 *
 * Aqui la correspondencia es **por posicion**, que es lo que el usuario ve: el
 * hueco N de una pagina es el N-esimo boton guardado de esa pagina. Con eso
 * tambien se recuperan los decks que ya estan en disco, cosa que arreglar solo
 * los generadores de id no haria.
 *
 * Los botones que sobran de una pagina no se tiran: se dejan detras. Encoger la
 * rejilla los esconde y volver a agrandarla los devuelve, que es como se
 * comportaba antes.
 */
export function conHuecosCompletos(
  pages: PageConfig[],
  guardados: ButtonConfig[],
): ButtonConfig[] {
  const usados = new Set(guardados.map((b) => b.id));
  const salida: ButtonConfig[] = [];
  for (let page = 0; page < pages.length; page++) {
    const gs = pages[page]?.gridSize ?? 4;
    const gr = pages[page]?.gridRows ?? gs;
    const huecos = Math.max(16, gs * gr);
    const suyos = guardados.filter((b) => b.page === page);
    for (let slot = 0; slot < huecos; slot++) {
      const b = suyos[slot];
      if (b) { salida.push({ ...b, page }); continue; }
      // Un id ya en uso puede coincidir con el que toca aqui: tras borrar una
      // pagina hay botones con ids de otra. Dos botones con el mismo id harian
      // que editar uno editara el otro.
      let id = `${page}-${slot}`;
      while (usados.has(id)) id = `${page}-${slot}-${usados.size}`;
      usados.add(id);
      salida.push({ id, page, label: '', icon: '', action: { type: 'none' as ButtonConfig['action']['type'] } });
    }
    // Los que no caben en la rejilla actual, detras y sin tocar.
    for (const extra of suyos.slice(huecos)) salida.push({ ...extra, page });
  }
  return salida;
}

export const DEFAULT_CONFIG: DeckConfig = {
  pages: PAGES_DEFAULT,
  buttons: makeDefaultButtons(),
  accent: '#4a8ef0',
  wallpaper: 'solid',
  profiles: [],
  configVersion: CURRENT_CONFIG_VERSION,
  language: 'system',
  // onboardingCompleted intencionalmente SIN setear: una instalación nueva
  // (sin config en disco) dispara el onboarding. La migración v3→v4 lo marca
  // como true para usuarios existentes.
};
