import type { Manejador } from './base';
import { LANZAR } from './lanzar';
import { AUDIO } from './audio';
import { MEDIA } from './media';
import { ENTRADA } from './entrada';
import { DATOS } from './datos';
import { RGB } from './rgb';

/**
 * Qué hace cada tipo de acción, por familia.
 *
 * Antes era un `switch` de 190 líneas dentro de `executeAction`, con una
 * complejidad ciclomática de 105. El problema no era el tamaño: era que
 * terminaba en `default: return OK`, así que **un tipo de acción nuevo no
 * hacía nada y decía que todo había ido bien**. Con un mapa, "no hay
 * manejador" se puede detectar — y `scripts/check-acciones.mjs` lo detecta.
 */
export const MANEJADORES: Record<string, Manejador> = {
  ...LANZAR, ...AUDIO, ...MEDIA, ...ENTRADA, ...DATOS, ...RGB,
};

/**
 * Tipos que `executeAction` **no** despacha a propósito, porque los resuelve
 * quien la llama: necesitan cosas que esta capa no tiene (el hook de scripts,
 * abrir una carpeta en pantalla, decidir una rama, o esperar un temporizador).
 */
export const RESUELTAS_POR_EL_LLAMADOR = new Set([
  'none', 'script', 'folder', 'branch', 'countdown',
]);

// Sin reexportar nada: todo el mundo importa de './base' directamente, y el
// barril solo hacia que knip contara seis exports muertos.
