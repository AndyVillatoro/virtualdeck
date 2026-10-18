import { useEffect, useMemo, useState } from 'react';
import { aplicarAspectoAudio, resolverAspectoAudio } from '../../comun/audioIcono';
import { useEstadoSistema } from '../../utils/estadoSistema';
import type { ButtonConfig } from '../../types';

/**
 * El botón tal como se pinta con la salida activa (Fase 2 del switch).
 *
 * Resuelve el icono y sublabel reactivos del `audio-device` según
 * `activeAudioDeviceId` y los fusiona sin pisar lo explícito del botón. El
 * nombre de la activa sale de `api.audio.list()` (caché corta compartida);
 * sin nombre solo resuelven los modos que no lo necesitan (`fixed` por id,
 * `cycle-list` por candidato).
 *
 * Solo se monta en celdas de audio (lo usa `CuerpoAudio`): el resto ni se
 * suscribe al estado ni pide la lista.
 */

interface CacheNombres {
  ts: number;
  porId: Map<string, string>;
}

let cache: CacheNombres | null = null;
const TTL_MS = 2000;

async function mapaNombres(
  listar: () => Promise<Array<{ id: string; name: string }>>,
): Promise<Map<string, string>> {
  const ahora = Date.now();
  if (cache && ahora - cache.ts < TTL_MS) return cache.porId;
  try {
    const lista = await listar();
    const porId = new Map(lista.map((d) => [d.id.trim().toLowerCase(), d.name] as const));
    cache = { ts: ahora, porId };
    return porId;
  } catch {
    return cache?.porId ?? new Map();
  }
}

export function useAspectoAudio(button: ButtonConfig): ButtonConfig {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const estado = useEstadoSistema(api);
  const [nombres, setNombres] = useState<Map<string, string> | null>(null);
  const activoId = estado.activeAudioDeviceId;

  useEffect(() => {
    if (!api || !activoId) return;
    let vivo = true;
    void mapaNombres(() => api.audio.list()).then((m) => {
      if (vivo) setNombres(m);
    });
    return () => {
      vivo = false;
    };
  }, [api, activoId]);

  return useMemo(() => {
    if (button.action.type !== 'audio-device') return button;
    const nombre = activoId && nombres?.get(activoId.trim().toLowerCase());
    const aspecto = resolverAspectoAudio(button.action, activoId, nombre);
    return aplicarAspectoAudio(button, aspecto);
  }, [button, activoId, nombres]);
}
