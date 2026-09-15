import { useEffect, useReducer } from 'react';

/**
 * Carga diferida del catálogo de marcas (`data/brandIcons.ts`, ~42 KiB de
 * bitmaps 17×17).
 *
 * El catálogo solo hace falta al elegir/dibujar/mostrar un icono de marca,
 * pero cinco módulos lo importaban de forma estática y Vite lo metía en el
 * bundle inicial. Ahora todos pasan por aquí: `import()` crea un chunk
 * aparte que se baja la primera vez que algo lo pide.
 */

type Catalogo = typeof import('../data/brandIcons');

/** Tipo del catálogo para anotar helpers sin arrastrar los datos. */
export type CatalogoMarcas = Catalogo;

let mod: Catalogo | null = null;
let prom: Promise<Catalogo> | null = null;
const oyentes = new Set<() => void>();

/** Baja el chunk si hace falta. Compartida: un solo vuelo aunque la pidan varios. */
export function precargarCatalogoMarcas(): Promise<void> {
  if (!prom) {
    prom = import('../data/brandIcons').then((m) => {
      mod = m;
      for (const f of oyentes) f();
      return m;
    });
  }
  return prom.then(() => undefined);
}

/** Icono por clave, o undefined si el catálogo aún no llegó. */
export function iconoDeCatalogo(c: Catalogo | null, clave: string) {
  return c?.BRAND_ICONS_MAP[clave];
}

/**
 * Catálogo reactivo: dispara la carga al montar y re-renderiza al llegar.
 * Mientras tanto devuelve null y quien llama pinta su fallback.
 */
export function useCatalogoMarcas(): Catalogo | null {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (mod) return;
    const avisar = () => bump();
    oyentes.add(avisar);
    precargarCatalogoMarcas();
    return () => {
      oyentes.delete(avisar);
    };
  }, []);
  return mod;
}
