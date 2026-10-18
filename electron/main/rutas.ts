import { app } from 'electron';
import { join } from 'path';

/**
 * Rutas compartidas del proceso principal.
 *
 * Centraliza `join(app.getPath('userData'), 'images')`, que antes se repetía en
 * cuatro sitios (servidor del mando, protocolo `vd://`, diálogos de imagen).
 * Un único dueño evita que una ruta quede desfasada si cambia la carpeta.
 */
export function dirImagenes(): string {
  return join(app.getPath('userData'), 'images');
}