import type React from 'react';
import type { DeckConfig, ElectronAPI } from '../../types';
import type { TFunc } from '../i18n';

/**
 * Lo que tienen en común los cinco hooks en que se parte `useDeck`.
 *
 * Vive aquí y no en `useDeck.ts` a propósito: los hooks hijos lo necesitan, y si
 * lo importaran de su padre se montaría un ciclo (`useDeck` → hijo → `useDeck`).
 * El padre es quien compone, nunca quien exporta el tipo a sus hijos.
 *
 * Todos reciben el **mismo objeto**, construido una vez por `useDeck`. Por eso
 * un cambio en un grupo no puede invalidar la identidad de los callbacks de otro
 * grupo: los dos grupos reciben la misma referencia de `config`, y eso es
 * exactamente lo que ya pasaba cuando todo estaba en un solo hook.
 */
export interface ContextoDeck {
  api: ElectronAPI | undefined;
  /** La configuración viva. Los grupos la leen, no la escriben. */
  config: DeckConfig;
  /**
   * Escribir la configuración **sin** pasar por el historial.
   *
   * Solo lo usan el grupo de preferencias, para lo que no se deshace: un
   * interruptor encendido, el PIN del kiosco, una variable. El resto de la
   * aplicación va por `withHistory`, y por eso no está aquí nada más: mantener
   * esta puerta en un solo grupo es la forma de que nadie la use por.atajo.
   */
  setConfig: React.Dispatch<React.SetStateAction<DeckConfig>>;
  t: TFunc;
  /**
   * El paso de historial: apila el estado anterior y aplica el siguiente.
   * Todo lo que se puede deshacer pasa por aquí, y es lo que guarda en disco.
   */
  withHistory: (
    label: string,
    updater: (prev: DeckConfig) => DeckConfig,
    rotulo?: (prev: DeckConfig) => string,
  ) => void;
  /** Sustituye la configuración entera y lo apila en el historial. */
  saveConfig: (next: DeckConfig) => void;
  /** La página visible: al borrar o reordenar hay que moverla. */
  setActivePage: React.Dispatch<React.SetStateAction<number>>;
}
