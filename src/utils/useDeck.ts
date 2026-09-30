import type React from 'react';
import type { ElectronAPI } from '../types';
import { useDeckEstado } from './useDeck/estado';
import { useDeckBotones } from './useDeck/botones';
import { useDeckPaginas } from './useDeck/paginas';
import { useDeckPerfiles } from './useDeck/perfiles';
import { useDeckPreferencias } from './useDeck/preferencias';
import type { ContextoDeck } from './useDeck/contexto';

/**
 * La configuracion del deck y todo lo que la cambia.
 *
 * Estaba en `App`, mezclado con la vista actual, los avisos y el onboarding:
 * veinticinco `useCallback` seguidos que solo tenian en comun que escriben en
 * el mismo objeto. Aqui se ven juntos, y `App` se queda con lo que de verdad
 * es suyo — que pantalla se muestra y que se le avisa al usuario.
 *
 * Cada operacion pasa por `withHistory`, que es lo que hace que Ctrl+Z
 * funcione: guarda el estado anterior antes de cambiarlo. Guardar en disco es
 * un efecto secundario de cada cambio, no un paso aparte, para que no exista
 * el caso "lo cambie y no se guardo".
 *
 * ---
 *
 * **Por qué son cinco hooks y no uno de 600 líneas.** Este hook devolvía 40
 * cosas —un solo `useCallback` por operación— y lo único que tenían en común
 * era escribir en el mismo objeto. Se reparte por responsabilidad, en
 * `src/utils/useDeck/`:
 *
 * | grupo | qué lleva | qué posee |
 * |---|---|---|
 * | `estado` | `config`, `t`, `withHistory`, `undo`, `saveConfig` | los `useState` y el `useRef` del historial |
 * | `botones` | editar, duplicar, copiar, pegar, limpiar, mover, intercambiar | el portapapeles |
 * | `paginas` | crear, duplicar, renombrar, borrar, reordenar, cuadrícula | nada: mueve la vista con `setActivePage` |
 * | `perfiles` | guardar, cargar, borrar, añadir de la galería | nada: también mueve la vista |
 * | `preferencias` | escala, tema, idioma, sonido, PIN, variables, interruptores | los dos relojes de escritura con respiro |
 *
 * Los cuatro últimos reciben un `ContextoDeck` y solo devuelven sus
 * operaciones; el único que tiene estado propio es `estado`, y el padre lo
 * compone. **`App` no se entera**: el `return` sigue siendo el mismo objeto
 * plano con las mismas 40 claves, que es lo único que consume.
 *
 * La forma de partirlo no es libre: `withHistory` y `saveConfig` los necesitan
 * todos los grupos, así que tienen que salir de `estado` y llegar por el
 * contexto. Y los dos relojes de `preferencias` **no** pueden subir, porque
 * cada uno pertenece a su grupo: si los compartieran, escribir una variable
 * armaría el respiro del interruptor y un cambio se perdería al otro 400 ms.
 */

interface Opciones {
  api: ElectronAPI | undefined;
  /** Aviso flotante de "se deshizo X". Lo pinta App. */
  showUndoToast: (texto: string) => void;
  /** La pagina visible: al borrar o reordenar hay que moverla. */
  setActivePage: React.Dispatch<React.SetStateAction<number>>;
}

export function useDeck({ api, showUndoToast, setActivePage }: Opciones) {
  const estado = useDeckEstado({ api, showUndoToast });

  // Un solo objeto para los cinco grupos: es lo que hace que cambiar un grupo
  // no altere a los otros, porque todos ven la misma referencia de `config`.
  const contexto: ContextoDeck = {
    api,
    config: estado.config,
    setConfig: estado.setConfig,
    t: estado.t,
    withHistory: estado.withHistory,
    saveConfig: estado.saveConfig,
    setActivePage,
  };

  const botones = useDeckBotones(contexto);
  const paginas = useDeckPaginas(contexto);
  const perfiles = useDeckPerfiles(contexto);
  const preferencias = useDeckPreferencias(contexto);

  return {
    ...estado,
    ...botones,
    ...paginas,
    ...perfiles,
    ...preferencias,
  };
}
