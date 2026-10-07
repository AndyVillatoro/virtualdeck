import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useLang } from '../../utils/i18n';
import { useNowPlayingRefresh } from '../../utils/nowPlaying';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../components/dot480/DotMatrixImageOverlay';
import { BotonIcono } from '../../components/ui/BotonIcono';
import type { ElectronAPI, NowPlaying, RGBStatus } from '../../types';

/**
 * Los apartados de la barra lateral que llevan lógica propia (estado del RGB,
 * registro de ejecución y la franja de música). Vivían en el cuerpo de
 * `BarraLateral`, que llegó a complejidad 34; cada uno es independiente.
 */

/** Una linea del registro de ejecucion. */
export interface EntradaRegistro {
  id: number;
  ts: number;
  label: string;
  actionType: string;
  ok: boolean;
  error?: string;
}

export function EstadoRGB({ rgbStatus, onRGB, accent }: { rgbStatus: RGBStatus | null; onRGB: () => void; accent: string }) {
  const VD = useTheme();
  const t = useT();
  // Conectado con el acento, como el botón RGB de la barra de título: el
  // mismo estado salía en verde aquí y en acento allí.
  const punto = rgbStatus?.connected ? accent : rgbStatus?.serverRunning ? VD.warning : VD.textMuted;
  const texto = rgbStatus?.connected
    ? `${rgbStatus.deviceCount} ${t(rgbStatus.deviceCount === 1 ? 'rgb.deviceOne' : 'rgb.deviceMany')}`
    : t(rgbStatus?.serverRunning ? 'rgb.serverUp' : 'rgb.disconnected');
  return (
    <div>
      <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>RGB</DotLabel>
      <button
        type="button"
        onClick={onRGB}
        title={t('panel.openRgb')}
        style={{
          width: '100%', textAlign: 'left',
          background: VD.elevated, border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.md, padding: '8px 10px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: punto, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {texto}
        </div>
        <DotGlyphIcon glyph="ARROW_RIGHT" size={9} color={accent} />
      </button>
    </div>
  );
}

export function RegistroEjecucion({ execLog, setExecLog, showLog, setShowLog }: {
  execLog: EntradaRegistro[];
  setExecLog: React.Dispatch<React.SetStateAction<EntradaRegistro[]>>;
  showLog: boolean;
  setShowLog: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const VD = useTheme();
  const t = useT();
  const lang = useLang();
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLog ? 6 : 0 }}>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.log')}</DotLabel>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {execLog.length > 0 && (
            <span
              onClick={() => setExecLog([])}
              title={t('panel.clearLog')}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            >
              <DotGlyphIcon glyph="CLOSE" size={8} color={VD.textMuted} />
            </span>
          )}
          <span
            onClick={() => setShowLog((v) => !v)}
            title={t(showLog ? 'panel.ocultarRegistro' : 'panel.verRegistro')}
            role="button"
            style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            <DotGlyphIcon glyph={showLog ? 'ARROW_UP' : 'ARROW_DOWN'} size={8} color={VD.textMuted} />
          </span>
        </div>
      </div>
      {showLog && (
        <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {execLog.length === 0 ? (
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>{t('panel.noActivity')}</div>
          ) : execLog.map((entry) => (
            <div key={entry.id} title={entry.error} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <DotGlyphIcon glyph="DOTS" size={6} color={entry.ok ? VD.success : VD.danger} />
              <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</span>
              <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, flexShrink: 0 }}>
                {new Date(entry.ts).toLocaleTimeString(lang === 'en' ? 'en-US' : 'es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FranjaMusica({ nowPlaying, isPlaying, sourceName, api, accent, showToast, panelAbierto, onAlternarPanel }: {
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  sourceName: string;
  api: ElectronAPI | undefined;
  accent: string;
  showToast: (s: string) => void;
  /**
   * El panel grande de música está abierto. Junto con `onAlternarPanel`, enseña
   * el botón que lo abre y lo cierra desde esta franja — antes solo se podía
   * desde Ajustes → SONIDO, con la misma clave (`config.musicPanel`).
   * Opcionales: sin manejador no se enseña ningún botón muerto.
   */
  panelAbierto?: boolean;
  onAlternarPanel?: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const refrescarMedios = useNowPlayingRefresh();
  return (
    <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${VD.border}`, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.playing')}</DotLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {onAlternarPanel && (
            <BotonIcono
              glifo="AUDIO_WAVE"
              title={panelAbierto ? t('music.hide') : t('set.musicPanel')}
              onClick={() => onAlternarPanel()}
              tamano={32}
              tamanoGlifo={13}
              conMarco
              color={panelAbierto ? accent : VD.textMuted}
            />
          )}
          <span
            onClick={async () => {
              const r = await api?.media.diagnose();
              if (!r) return;
              const lines = r.stdout.split(/\r?\n/).slice(0, 25).join('\n');
              showToast(`${t('media.diagTitle')}\n${lines}${r.stderr ? '\n\nstderr:\n' + r.stderr.slice(0, 300) : ''}`);
            }}
            title={t('media.diagnose')}
            style={{
              cursor: 'pointer', padding: '2px 4px', display: 'inline-flex', alignItems: 'center',
            }}
          >
            <DotGlyphIcon glyph="HELP" size={9} color={VD.textMuted} />
          </span>
        </div>
      </div>
      {nowPlaying ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{
              width: 44, height: 44, flexShrink: 0, borderRadius: VD.radius.lg,
              background: VD.overlay, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${VD.border}`, position: 'relative',
            }}>
              <div style={{ opacity: 0.35 }}>
                <DotGlyphIcon glyph={isPlaying ? 'PLAY' : 'PAUSE'} size={16} color={VD.textMuted} showRecessed />
              </div>
              {nowPlaying.thumbnail && (
                <>
                  <img
                    src={nowPlaying.thumbnail}
                    alt=""
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      imageRendering: 'pixelated',
                    }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <DotMatrixImageOverlay pitch={3} />
                </>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: VD.font, fontSize: 11, color: VD.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
                {nowPlaying.title || '—'}
              </div>
              {nowPlaying.artist && (
                <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                  {nowPlaying.artist}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: VD.radius.md, background: isPlaying ? VD.success : VD.textMuted, flexShrink: 0 }} />
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>
              {t(isPlaying ? 'media.playing' : 'media.paused')}{sourceName ? ` · ${sourceName}` : ''}
            </span>
          </div>
          {/* Media controls — Dot-matrix icons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {([
              { key: 'prev',       glyph: 'PREV',                       title: t('media.prev'),      admite: nowPlaying.controls?.prev },
              { key: 'play-pause', glyph: isPlaying ? 'PAUSE' : 'PLAY', title: t('media.playPause'), admite: undefined },
              { key: 'next',       glyph: 'NEXT',                       title: t('media.next'),      admite: nowPlaying.controls?.next },
            ] as const).map(({ key, glyph, title, admite }) => {
              // Lo mismo que hace el panel de musica, que aqui faltaba: si la
              // fuente dice que no admite anterior o siguiente, el boton no se
              // enseña como si funcionara. Un video suelto de YouTube declara
              // `False` en los dos, y pulsarlos no hacia nada ni lo decia.
              // Sin dato (`undefined`) es «no se sabe» y se deja habilitado.
              const activo = admite !== false;
              return (
              <button
                key={key}
                title={activo ? title : t('media.unsupported', { que: title })}
                disabled={!activo}
                onClick={() => {
                  // Usa SMTC nativo (TrySkipNext/Previous/TogglePlayPause); cae a SendKeys si falla.
                  if (!activo) return;
                  // Preguntar de nuevo enseguida: si no, el icono se queda
                  // en «reproduciendo» hasta el siguiente sondeo (5 s).
                  api?.media.control(key as 'play-pause' | 'next' | 'prev').then(refrescarMedios);
                }}
                style={{
                  flex: 1, padding: '6px 0', minHeight: 32,
                  background: VD.elevated, border: `1px solid ${VD.border}`,
                  cursor: activo ? 'pointer' : 'not-allowed',
                  opacity: activo ? 1 : 0.35,
                  borderRadius: VD.radius.md,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s, border-color 0.1s',
                  touchAction: 'manipulation',
                }}
                onMouseEnter={(e) => { if (activo) (e.currentTarget as HTMLButtonElement).style.borderColor = accent; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = VD.border; }}
              >
                <DotGlyphIcon glyph={glyph} size={11} color={VD.textDim} showRecessed />
              </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>{t('panel.noMedia')}</div>
      )}
    </div>
  );
}
