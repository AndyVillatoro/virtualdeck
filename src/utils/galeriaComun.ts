/**
 * Versiones y manifiesto compartidos entre la galería empotrada y la tienda.
 *
 * Vive en `utils` y no en `screens/tienda` a propósito: `GallerySection`
 * (components) también lo usa y las capas no dejan que un componente importe
 * de una pantalla (ver `.dependency-cruiser.cjs`).
 */

/** Compara semver simple: 1 si a > b, -1 si a < b, 0 si empatan. */
function compararVersiones(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/** "1.2.0" > "0.12.0". Las partes no numéricas valen 0. */
export function versionMayor(a: string, b: string): boolean {
  return compararVersiones(a, b) > 0;
}

/**
 * La galería que mantiene el proyecto. Se lee igual que cualquier otra: por
 * `manifest.json`, y pasando por el mismo aviso de lo que el perfil ejecuta.
 * Tener una por defecto no la convierte en de fiar — solo ahorra teclearla.
 *
 * Va por `raw.githubusercontent.com` y no por Pages: el repo no tiene Pages
 * activado, y el archivo crudo se sirve igual sin depender de eso.
 */
export const GALERIA_OFICIAL =
  'https://raw.githubusercontent.com/AndyVillatoro/virtualdeck-gallery/main/manifest.json';
