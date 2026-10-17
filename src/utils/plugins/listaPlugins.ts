import { useEffect, useState } from 'react';
import type { PluginInfo } from '../../types';

/**
 * Los plugins instalados, y aviso de que la lista sigue cargando.
 *
 * Se recarga sola cuando cambia algo (instalar, desinstalar, habilitar): sin
 * `onChanged`, un desplegable seguiría con lo que había al abrirse.
 *
 * Vive aquí y no en el formulario del editor para que el inspector del dock
 * ofrezca los mismos plugins sin duplicar la suscripción.
 */
export function useListaPlugins(): { lista: PluginInfo[]; cargando: boolean } {
  const [lista, setLista] = useState<PluginInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const plugins = window.electronAPI?.plugins;
    if (!plugins) { setCargando(false); return; }
    let vivo = true;
    const cargar = () => {
      const poner = (l: PluginInfo[]) => { if (vivo) { setLista(l); setCargando(false); } };
      plugins.list().then(poner).catch(() => poner([]));
    };
    cargar();
    const fuera = plugins.onChanged(cargar);
    return () => { vivo = false; fuera(); };
  }, []);
  return { lista, cargando };
}
