import { useEffect } from 'react';

/**
 * Capturar una combinacion de teclas pulsandola, en vez de escribirla.
 *
 * Se engancha en fase de captura (`true`) y corta el evento: mientras se graba,
 * ni el editor ni la aplicacion deben reaccionar a la tecla. Los modificadores
 * solos no cierran la captura — `Ctrl` no es un atajo.
 */
export function useCapturaHotkey(
  activa: boolean,
  onCapturada: (combo: string) => void,
  onFin: () => void,
  onAviso?: (comboRechazado: string) => void,
): void {
  useEffect(() => {
    if (!activa) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const MODIFICADORES = ['Control', 'Alt', 'Shift', 'Meta'];
      if (MODIFICADORES.includes(e.key)) return;
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Super');
      const tecla = e.key.length === 1 ? e.key.toUpperCase() : e.key;

      // Combinaciones reservadas por el kernel de Windows que no se pueden registrar
      if (e.metaKey && (tecla === 'L' || tecla === 'D')) {
        onAviso?.(`Win+${tecla}`);
        onFin();
        return;
      }

      parts.push(tecla);
      onCapturada(parts.join('+'));
      onFin();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa]);
}
