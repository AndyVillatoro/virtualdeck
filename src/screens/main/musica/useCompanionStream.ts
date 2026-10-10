import { useEffect, useState } from 'react';
import type { ElectronAPI, CompanionStatus, CompanionMetadata } from '../../../types';

export interface EstadoCompanionHook {
  frame: string | null;
  status: CompanionStatus | null;
  conectado: boolean;
  metadata: CompanionMetadata | null;
  fps: number;
}

/**
 * Hook para consumir los fotogramas y estado de la extensión VirtualDeck Companion.
 * Cuando la extensión está conectada y transmitiendo, entrega fotogramas directos
 * sin depender de la oclusión del sistema operativo ni de capturas HWND.
 */
export function useCompanionStream(api: ElectronAPI | undefined): EstadoCompanionHook {
  const [frame, setFrame] = useState<string | null>(null);
  const [status, setStatus] = useState<CompanionStatus | null>(null);
  const [conectado, setConectado] = useState(false);
  const [metadata, setMetadata] = useState<CompanionMetadata | null>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!api?.companion) return undefined;

    let montado = true;

    api.companion
      .getStatus()
      .then((s) => {
        if (!montado) return;
        setStatus(s);
        setConectado(s.conectado);
        setMetadata(s.metadata);
        setFps(s.fps);
      })
      .catch(() => {});

    const unsubStatus = api.companion.onStatus((s) => {
      if (!montado) return;
      setStatus(s);
      setConectado(s.conectado);
      setMetadata(s.metadata);
      setFps(s.fps);
    });

    const unsubMetadata = api.companion.onMetadata((m) => {
      if (!montado) return;
      setMetadata(m);
    });

    const unsubFrame = api.companion.onFrame((f) => {
      if (!montado) return;
      setFrame(f.payload);
    });

    return () => {
      montado = false;
      unsubStatus();
      unsubMetadata();
      unsubFrame();
    };
  }, [api]);

  return {
    frame,
    status,
    conectado,
    metadata,
    fps,
  };
}
