import { useCallback, useRef, useState } from 'react';
import { playSound } from '../../utils/sound';
import type { SoundProfileId } from '../../types';

/**
 * Clic y pulsación larga con el ratón.
 *
 * El doble clic se quitó: hacía lo mismo que la pulsación larga y no aportaba
 * ningún gesto que faltara.
 *
 * Es el hermano de [usePulsacionTactil], aunque ya no hacen lo mismo: con el
 * dedo, mantener pulsado arrastra; con el ratón lanza la acción alternativa,
 * porque el ratón ya arrastra por su cuenta con el arrastre nativo.
 * Estaban los dos en `ButtonCell`, pero el táctil ya se había sacado y el de
 * ratón se quedó dentro, repartido entre cinco funciones sueltas, dos estados
 * y dos refs — la mitad de las ramas del componente.
 *
 * Lo que de verdad arregla al juntarlo: **el destello y el sonido estaban
 * escritos tres veces**, una por gesto. Existía `destellar()`, pero solo lo
 * usaba el táctil; las tres copias del ratón leían `soundEnabled` y
 * `soundProfile` de las props en vez de las referencias. Como el comparador
 * del `memo` ignora esas props a propósito, las copias podían sonar con el
 * perfil anterior mientras el táctil sonaba con el nuevo. Aquí hay un solo
 * `destellar`, y va por referencia.
 */

/** Lo que tarda una pulsación en contar como larga. Igual que en el táctil. */
const MS_LARGA = 500;
/** Lo que dura el destello de confirmación. */
const MS_DESTELLO = 300;

interface Opciones {
  /** Sin acción, sin etiqueta y sin icono: el clic abre el editor. */
  isEmpty: boolean;
  /** Solo hay pulsación larga si el botón tiene acción alternativa. */
  hasLongPress: boolean;
  soundEnabled: boolean;
  soundProfile: SoundProfileId;
  onEdit: () => void;
  onExecute: () => void;
  onLongPress?: () => void;
  /** Ctrl/⌘+clic marca la celda en vez de ejecutarla. */
  onSelect?: () => void;
  /** false en la barra flotante y en kiosko. */
  showContextMenu: boolean;
  abrirMenu: (x: number, y: number) => void;
}

export function usePulsacionRaton(o: Opciones) {
  const [pressed, setPressed] = useState(false);
  const [flash, setFlash] = useState(false);
  const temporizador = useRef<number | null>(null);
  /** Puesto a true por la larga, para que el clic que viene detrás se ignore. */
  const yaDisparo = useRef(false);

  // Las opciones van por referencia y no por dependencias: el comparador del
  // `memo` de la celda ignora la identidad de los manejadores a proposito, asi
  // que un `useCallback` que dependiera de ellos se quedaria con los viejos.
  const ref = useRef(o);
  ref.current = o;

  const destellar = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), MS_DESTELLO);
    if (ref.current.soundEnabled) playSound(ref.current.soundProfile);
  }, []);

  const cancelarTemporizador = useCallback(() => {
    if (temporizador.current === null) return;
    clearTimeout(temporizador.current);
    temporizador.current = null;
  }, []);

  const alBajar = useCallback(() => {
    setPressed(true);
    yaDisparo.current = false;
    const { hasLongPress, onLongPress } = ref.current;
    if (!hasLongPress || !onLongPress) return;
    temporizador.current = window.setTimeout(() => {
      yaDisparo.current = true;
      temporizador.current = null;
      setPressed(false);
      destellar();
      ref.current.onLongPress?.();
    }, MS_LARGA);
  }, [destellar]);

  const alSubirOSalir = useCallback(() => {
    setPressed(false);
    cancelarTemporizador();
  }, [cancelarTemporizador]);

  const alClic = useCallback((e: React.MouseEvent) => {
    // La larga ya hizo el trabajo; el navegador manda el clic igual.
    if (yaDisparo.current) { yaDisparo.current = false; return; }
    const { onSelect, isEmpty, onEdit, onExecute } = ref.current;
    if ((e.ctrlKey || e.metaKey) && onSelect) { onSelect(); return; }
    if (isEmpty) { onEdit(); return; }
    destellar();
    onExecute();
  }, [destellar]);

  const alMenuContextual = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    // Tras una larga el navegador genera su propio contextmenu (~500 ms en
    // tactil, segun navegador y sistema). Ese hay que tragarselo.
    if (yaDisparo.current) { yaDisparo.current = false; return; }
    if (!ref.current.showContextMenu) return;
    ref.current.abrirMenu(e.clientX, e.clientY);
  }, []);

  /**
   * El arrastre HTML5 se come el `mouseup`, asi que sin esto el temporizador
   * de los 500 ms saltaria en mitad del arrastre, ejecutaria la accion y
   * redibujaria la celda (por `isRunning`) — rompiendo el arrastre.
   */
  const alEmpezarArrastre = useCallback(() => {
    cancelarTemporizador();
    yaDisparo.current = false;
    setPressed(false);
  }, [cancelarTemporizador]);

  return {
    pressed, setPressed, flash, destellar, yaDisparo,
    alBajar, alSubirOSalir, alClic, alMenuContextual, alEmpezarArrastre,
  };
}
