import type { PageConfig } from '../../types';

export { normalizarApp, esAppPropia } from '../apps';

import { normalizarApp } from '../apps';

/**
 * Qué página de un dock físico se enseña según la aplicación en primer plano.
 *
 * Todas las páginas con el mismo `superficie.serial` son del mismo
 * dispositivo. La **predeterminada** es la primera de ese serial sin
 * `targetApp` (si todas tienen, la primera de ese serial). Con una
 * aplicación delante, la página de ese serial cuyo `targetApp` coincide; si
 * ninguna, la **base** elegida a mano (si sigue existiendo) y si no la
 * predeterminada. La base nunca se adivina por índice: va por id de página.
 *
 * Es una **función pura** a propósito: la misma elección la usan el pintado
 * (`useSuperficies`, que guarda la página activa y la base en memoria) y las
 * pruebas, sin montar ningún hook. Lo que no es puro —el evento, el filtro
 * del propio VirtualDeck y el interruptor `autoProfileSwitch`— vive en cada
 * hook.
 */

/** Las páginas del deck que son de un dispositivo, en el orden de la config. */
export function paginasDeSerial(paginas: readonly PageConfig[], serial: string): PageConfig[] {
  return paginas.filter((p) => p.superficie?.serial === serial);
}

/** El id de la página predeterminada de un serial, o `null` si no tiene ninguna. */
export function idPaginaPredeterminada(paginas: readonly PageConfig[], serial: string): string | null {
  const delSerial = paginasDeSerial(paginas, serial);
  if (delSerial.length === 0) return null;
  return (delSerial.find((p) => !p.targetApp) ?? delSerial[0]).id;
}

/**
 * El id de la página de un serial para una aplicación (ya normalizada con
 * `normalizarApp`): la vinculada si la hay; si no, la base elegida a mano
 * (por id: si se borró ya no está y se ignora); si no, la predeterminada.
 */
export function idPaginaSegunApp(
  paginas: readonly PageConfig[],
  serial: string,
  appNormalizada: string,
  baseId?: string | null,
): string | null {
  const delSerial = paginasDeSerial(paginas, serial);
  if (delSerial.length === 0) return null;
  const exacta = delSerial.find(
    (p) => p.targetApp !== undefined && normalizarApp(p.targetApp) === appNormalizada,
  );
  if (exacta) return exacta.id;
  if (baseId) {
    const base = delSerial.find((p) => p.id === baseId);
    if (base) return base.id;
  }
  return (delSerial.find((p) => !p.targetApp) ?? delSerial[0]).id;
}
