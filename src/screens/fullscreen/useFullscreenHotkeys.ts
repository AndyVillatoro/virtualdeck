import { useEffect } from 'react';
import type { ModoPin } from './PinKiosko';

export interface UseFullscreenHotkeysOptions {
  onExit: () => void;
  totalPages: number;
  kioskActive: boolean;
  pinPrompt: ModoPin;
  setPinPrompt: (modo: ModoPin) => void;
  requestExitKiosk: () => void;
  setActivePage: (page: number) => void;
}

/**
 * Atajos de teclado para el modo de pantalla completa y kiosko:
 * - Escape: sale de pantalla completa, o solicita PIN si el modo kiosko está activo,
 *   o cancela el diálogo de PIN si está abierto. Usa captura de eventos con
 *   `stopImmediatePropagation` para evitar que el manejador global de la app intercepte la tecla.
 * - Teclas numéricas 1..9: conmutan de página, salvo que el modal de PIN o un input esté activo.
 */
export function useFullscreenHotkeys({
  onExit,
  totalPages,
  kioskActive,
  pinPrompt,
  setPinPrompt,
  requestExitKiosk,
  setActivePage,
}: UseFullscreenHotkeysOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pinPrompt) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setPinPrompt(null);
          return;
        }
        if (kioskActive) {
          e.preventDefault();
          e.stopImmediatePropagation();
          requestExitKiosk();
          return;
        }
        onExit();
        return;
      }

      if (pinPrompt || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        setActivePage(num - 1);
      }
    };

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onExit, totalPages, kioskActive, pinPrompt, setPinPrompt, requestExitKiosk, setActivePage]);
}

