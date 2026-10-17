import { useEffect, useRef } from 'react';
import type { PluginRef } from '../../types/plugins';

/**
 * Mantiene un `willAppear` activo mientras un botón de plugin se previsualiza
 * en el editor o en el inspector de docks. Al desmontar o al cambiar de
 * acción/plugin, manda `willDisappear`.
 */
export function useAppearPluginPreview(ref: PluginRef | null, activo: boolean): void {
  const refActiva = useRef<PluginRef | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.plugins) return;

    if (!activo || !ref) {
      if (refActiva.current) {
        api.plugins.appear(refActiva.current, false).catch(() => {});
        refActiva.current = null;
      }
      return;
    }

    const previa = refActiva.current;
    if (
      previa &&
      previa.pluginUuid === ref.pluginUuid &&
      previa.accionUuid === ref.accionUuid &&
      previa.contexto === ref.contexto
    ) {
      return;
    }

    if (previa) {
      api.plugins.appear(previa, false).catch(() => {});
    }

    refActiva.current = ref;
    api.plugins.appear(ref, true).catch(() => {});

    return () => {
      if (refActiva.current) {
        api.plugins.appear(refActiva.current, false).catch(() => {});
        refActiva.current = null;
      }
    };
  }, [ref, activo]);
}
