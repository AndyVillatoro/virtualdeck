import { useEffect } from 'react';

/**
 * Pegar una imagen del portapapeles como icono del boton.
 *
 * Escucha en el documento mientras el editor esta abierto, pero **ignora los
 * pegados dentro de un campo de texto**: si no, pegar una URL en el campo de
 * la accion se llevaria por delante el icono.
 */
export function usePegarImagen(onImagen: (url: string) => void): void {
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    const onPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (!items[i].type.startsWith('image/')) continue;
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = async () => {
          const url = await api.dialog.saveClipboardImage(reader.result as string);
          if (url) onImagen(url);
        };
        reader.readAsDataURL(blob);
        return;
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
