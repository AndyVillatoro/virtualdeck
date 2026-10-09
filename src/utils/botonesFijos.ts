import type { ButtonConfig, DeckConfig, PageConfig } from '../types';

/**
 * Botones fijos por grupo (T-HW-12).
 *
 * Un botón con `fijo: true` **vive en su página** (la de su `page`) y se ve y
 * se dispara en el **mismo hueco** de todas las demás páginas de su **grupo**:
 *
 * - grupo deck = las páginas sin `superficie`;
 * - grupo dock = las páginas con el mismo `superficie.serial`.
 *
 * Los huecos van **por posición** (como `conHuecosCompletos`): el hueco de un
 * botón es su índice entre los botones de su página, nunca su id. El botón
 * propio del hueco en las otras páginas **no se borra**: queda debajo en la
 * configuración y vuelve en cuanto se quita el fijo —la resolución es solo una
 * vista, `config.buttons` no se toca—. Si dos páginas del mismo grupo marcan
 * fijo el mismo hueco, gana la primera en el orden de `config.pages`.
 *
 * Todo lo que **pinta o dispara** por página resuelve con `botonesResueltos`.
 * Donde se **edita o guarda** (`useDeck`, `configDefaults`) se sigue usando la
 * lista real, sin resolver. La exportación de página también resuelve: lo que
 * se exporta es lo que se ve, y el fijo viaja con su marca para proyectarse en
 * su grupo nuevo al importar.
 */

/** Grupo de visibilidad de una página: `'deck'` o `'dock:<serial>'`. */
function grupoDePagina(pages: PageConfig[], indice: number): string {
  const serial = pages[indice]?.superficie?.serial;
  return serial ? `dock:${serial}` : 'deck';
}

/** Los botones de cada página, en orden de hueco (por posición). */
function botonesPorPagina(buttons: ButtonConfig[]): Map<number, ButtonConfig[]> {
  const mapa = new Map<number, ButtonConfig[]>();
  for (const b of buttons) {
    let lista = mapa.get(b.page);
    if (!lista) {
      lista = [];
      mapa.set(b.page, lista);
    }
    lista.push(b);
  }
  return mapa;
}

/**
 * Lo mismo que `botonesResueltos`, con las dos listas por separado: para quien
 * ya tiene los botones a mano sin la config entera (la rejilla principal).
 */
export function resolverFijos(
  pages: PageConfig[], buttons: ButtonConfig[], indicePagina: number,
): ButtonConfig[] {
  const propios = buttons.filter((b) => b.page === indicePagina);
  if (indicePagina < 0 || indicePagina >= pages.length) return propios;
  const grupo = grupoDePagina(pages, indicePagina);
  const porPagina = botonesPorPagina(buttons);
  // Fijos del grupo por hueco. Se recorre en el orden de `pages`: el primero
  // que reclama un hueco se lo queda.
  const fijos = new Map<number, ButtonConfig>();
  for (let i = 0; i < pages.length; i++) {
    if (grupoDePagina(pages, i) !== grupo) continue;
    const lista = porPagina.get(i) ?? [];
    for (let hueco = 0; hueco < lista.length; hueco++) {
      const candidato = lista[hueco];
      if (candidato !== undefined && candidato.fijo === true && !fijos.has(hueco)) {
        fijos.set(hueco, candidato);
      }
    }
  }
  if (fijos.size === 0) return propios;
  const resueltos = propios.slice();
  for (const [hueco, fijo] of fijos) {
    // La página puede tener menos huecos que la de origen: lo que no cabe en
    // su rejilla no se pinta (el propio sigue debajo, intacto).
    if (hueco < resueltos.length) resueltos[hueco] = fijo;
  }
  return resueltos;
}

/**
 * La lista de botones que se ve y se dispara en una página: los propios, con
 * los fijos de su grupo superpuestos en su hueco.
 */
export function botonesResueltos(config: DeckConfig, indicePagina: number): ButtonConfig[] {
  return resolverFijos(config.pages, config.buttons, indicePagina);
}
