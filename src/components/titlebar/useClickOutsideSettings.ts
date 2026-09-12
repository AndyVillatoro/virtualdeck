import { useEffect } from 'react';

/**
 * Cierra el panel de ajustes cuando se hace clic fuera del panel y de la rueda.
 * La propia rueda queda excluida: si no, el mousedown cerraría el panel
 * y el onClick del botón lo volvería a abrir un instante después.
 */
export function useClickOutsideSettings(
  isOpen: boolean,
  onClose: () => void,
  panelRef: React.RefObject<HTMLElement | null>,
  ruedaRef: React.RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!isOpen) return;
    const cerrar = (e: MouseEvent) => {
      const donde = e.target as Node;
      if (panelRef.current?.contains(donde)) return;
      if (ruedaRef.current?.contains(donde)) return;
      onClose();
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [isOpen, onClose, panelRef, ruedaRef]);
}

