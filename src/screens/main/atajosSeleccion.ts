import { useEffect } from 'react';
import type { TFunc } from '../../utils/i18n';

export type AtajoSeleccion = 'copy' | 'paste' | 'duplicate' | 'delete';

/** El atajo no aplica si el foco está en un campo editable. */
function esObjetivoEditable(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
}

/** Traduce la tecla a acción de lote, sin mirar capacidades. Función pura. */
function resolverAtajoSeleccion(e: KeyboardEvent): AtajoSeleccion | null {
  if (!(e.ctrlKey || e.metaKey)) {
    return e.key === 'Delete' || e.key === 'Backspace' ? 'delete' : null;
  }
  const k = e.key.toLowerCase();
  if (k === 'c') return 'copy';
  if (k === 'v') return 'paste';
  if (k === 'd') return 'duplicate';
  return null;
}

interface AtajosSeleccionOpts {
  selectedIds: Set<string>;
  onCopyButton?: (id: string) => void;
  onPasteButton?: (id: string) => void;
  canPasteButton?: boolean;
  onDuplicateButton: (id: string) => void;
  onClearButton: (id: string) => void;
  onLimpiarSeleccion: () => void;
  avisar: (texto: string) => void;
  t: TFunc;
}

/**
 * Ctrl+C/V/D y Supr sobre la selección múltiple de celdas.
 * Era el `handleKeyDown` de `MainB` (complejidad 22): la traducción
 * tecla→acción vive en `resolverAtajoSeleccion` y aquí solo quedan las
 * guardas y el despacho.
 */
export function useAtajosSeleccion(opts: AtajosSeleccionOpts) {
  const {
    selectedIds, onCopyButton, onPasteButton, canPasteButton,
    onDuplicateButton, onClearButton, onLimpiarSeleccion, avisar, t,
  } = opts;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (esObjetivoEditable(e)) return;
      if (selectedIds.size === 0) return;
      const atajo = resolverAtajoSeleccion(e);
      if (!atajo) return;
      const primero = Array.from(selectedIds)[0];
      if (atajo === 'copy') {
        if (primero && onCopyButton) {
          e.preventDefault();
          onCopyButton(primero);
          avisar(t('cell.copied'));
        }
      } else if (atajo === 'paste') {
        if (primero && canPasteButton && onPasteButton) {
          e.preventDefault();
          onPasteButton(primero);
          avisar(t('cell.pasted'));
        }
      } else if (atajo === 'duplicate') {
        if (primero) {
          e.preventDefault();
          onDuplicateButton(primero);
        }
      } else {
        e.preventDefault();
        selectedIds.forEach((id) => onClearButton(id));
        onLimpiarSeleccion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, onCopyButton, onPasteButton, canPasteButton, onDuplicateButton, onClearButton, onLimpiarSeleccion, avisar, t]);
}
