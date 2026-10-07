/* Los últimos iconos elegidos, en `localStorage` (opcional: si falla, el
 * catálogo funciona igual, solo no recuerda). */

const CLAVE = 'vd.catalogo.iconos.recientes';
const MAX_RECIENTES = 24;

export function leerRecientes(): string[] {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return [];
    const lista: unknown = JSON.parse(bruto);
    if (!Array.isArray(lista)) return [];
    return lista.filter((c): c is string => typeof c === 'string').slice(0, MAX_RECIENTES);
  } catch {
    return [];
  }
}

/** Devuelve la lista nueva (primero el último elegido, sin repetidos) y la guarda. */
export function guardarReciente(claves: string[], clave: string): string[] {
  const lista = [clave, ...claves.filter((c) => c !== clave)].slice(0, MAX_RECIENTES);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento: la lista en memoria sigue valiendo para esta sesión.
  }
  return lista;
}
