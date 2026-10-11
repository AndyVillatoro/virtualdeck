export interface NowPlaying {
  title: string;
  artist: string;
  status: 'Playing' | 'Paused' | 'Stopped' | 'Unknown';
  source: string;
  thumbnail?: string;
  /**
   * Que admite **esta** sesion, segun ella misma.
   *
   * No todas las fuentes hacen todo: un video suelto de YouTube en Edge
   * declara `next=False prev=False shuffle=False repeat=False`, y el sistema
   * acepta la orden y no pasa nada. Sin esto la interfaz enseña cuatro botones
   * que en ese caso no hacen nada y no lo dicen. Ausente = no se sabe (camino
   * PowerShell, o un `.node` anterior a los controles nativos), y entonces se
   * enseñan todos.
   */
  controls?: { next: boolean; prev: boolean; shuffle: boolean; repeat: boolean; play?: boolean; pause?: boolean };
  /** Si el aleatorio está activo. Ausente = no se sabe. */
  isShuffleActive?: boolean;
  /** Repetición activa. Ausente = no se sabe. */
  autoRepeatMode?: 'none' | 'track' | 'list';
  /**
   * Posición de la pista en ms, solo del núcleo nativo (el respaldo PowerShell
   * no la pide). Ausente = sin barra: la app no publica timeline o no hay sesión.
   */
  positionMs?: number;
  /** Duración publicable de la pista en ms. Ausente = sin barra. */
  durationMs?: number;
  /** Cuándo SMTC midió la posición, en epoch ms Unix. */
  timelineUpdatedAt?: number;
}

export type MediaCommand = 'play-pause' | 'next' | 'prev' | 'stop';

export interface MediaDiagnostic {
  ok: boolean;
  stage: string;
  stdout: string;
  stderr: string;
  parsed?: { title: string; artist: string; status: string; source: string };
  sessionsCount?: number;
}
