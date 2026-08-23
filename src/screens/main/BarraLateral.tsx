import React, { useMemo } from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useLang } from '../../utils/i18n';
import { formatoHora, formatoFecha } from '../../utils/formatos';
import { DotLabel } from '../../components/DotLabel';
import { DotText } from '../../components/DotText';
import { SensorCard, groupSensorsByHardware } from '../../components/SensorPanel';
import { WeatherWidget } from '../../components/WeatherWidget';
import { IconMediaSkipBack, IconMediaPlay, IconMediaPause, IconMediaSkipForward } from '../../components/VDIcon';
import type { DeckConfig, ElectronAPI, RGBStatus, Sensor, SensorsStatus } from '../../types';

/**
 * El panel de la derecha: reloj, clima, sensores, estado del RGB, registro de
 * ejecucion y lo que suena.
 *
 * Son seis apartados que no comparten nada entre ellos ni con la grilla. Solo
 * leen: lo unico que escriben es limpiar el registro, y eso llega por props
 * como todo lo demas.
 */

/** Una linea del registro de ejecucion. */
interface EntradaRegistro {
  id: number;
  ts: number;
  label: string;
  actionType: string;
  ok: boolean;
  error?: string;
}

type NowPlayingInfo = { title: string; artist: string; status: string; source: string; thumbnail?: string } | null;

interface Props {
  config: DeckConfig;
  clock: Date;
  api: ElectronAPI | undefined;
  sensorList: Sensor[];
  sensorStatus: SensorsStatus | null;
  rgbStatus: RGBStatus | null;
  onRGB: () => void;
  execLog: EntradaRegistro[];
  setExecLog: React.Dispatch<React.SetStateAction<EntradaRegistro[]>>;
  showLog: boolean;
  setShowLog: React.Dispatch<React.SetStateAction<boolean>>;
  nowPlaying: NowPlayingInfo;
  isPlaying: boolean;
  sourceName: string;
  showToast: (s: string) => void;
}

export function BarraLateral({ config, clock, api, sensorList, sensorStatus, rgbStatus, onRGB, execLog, setExecLog, showLog, setShowLog, nowPlaying, isPlaying, sourceName, showToast }: Props) {
  const VD = useTheme();
  const t = useT();
  const lang = useLang();
  // Memoizados: son dependencia de un `useMemo` y de un `useEffect`, y sin
  // referencia estable los harian recalcular en cada render.
  const TIME_FMT = useMemo(() => formatoHora(lang), [lang]);
  const DATE_FMT = useMemo(() => formatoFecha(lang), [lang]);

  return (
        <div style={{
          width: 220, borderLeft: `1px solid ${VD.border}`,
          padding: '10px 14px 10px', background: VD.surface,
          display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
          // La columna **no** se desplaza. Antes si, y con unos cuantos
          // sensores la franja de musica —que va anclada abajo— se salia por
          // debajo del borde y habia que buscarla desplazando. Ahora lo unico
          // que se desplaza es la lista de sensores, que es lo que crece.
          overflow: 'hidden',
        }}>
          {/* Clock — DotText es la firma del reloj */}
          <div style={{
            paddingBottom: 10, borderBottom: `1px solid ${VD.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <DotText
              text={TIME_FMT.format(clock)}
              dotSize={3} gap={1} color={VD.text}
            />
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1 }}>
              {DATE_FMT.format(clock).toUpperCase()}
            </div>
          </div>

          {/* Weather */}
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>{t('panel.weather')}</DotLabel>
            <WeatherWidget />
          </div>

          {/* Sensor cards — compact, below weather. Only shows when LHM has data. */}
          {sensorList.length > 0 && (config.sensors?.showWidget ?? true) && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.sensors')}</DotLabel>
                <span style={{
                  fontFamily: VD.mono, fontSize: 7, letterSpacing: 1,
                  color: sensorStatus?.connected ? VD.success : VD.textMuted,
                }}>
                  {sensorStatus?.connected ? '●' : '○'}
                </span>
              </div>
              <div className="vd-scroll" style={{
                display: 'flex', flexDirection: 'column', gap: 6,
                flex: 1, minHeight: 0, overflowY: 'auto',
              }}>
                {groupSensorsByHardware(sensorList).map((g) => (
                  <SensorCard key={g.hardware} group={g} compact />
                ))}
              </div>
            </div>
          )}

          {/* RGB status */}
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>RGB</DotLabel>
            <div
              onClick={onRGB}
              title={t('panel.openRgb')}
              style={{
                background: VD.elevated, border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.md, padding: '8px 10px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: rgbStatus?.connected ? VD.success : rgbStatus?.serverRunning ? VD.warning : VD.textMuted,
              }} />
              <div style={{ flex: 1, fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5 }}>
                {rgbStatus?.connected
                  ? `${rgbStatus.deviceCount} ${rgbStatus.deviceCount === 1 ? 'DEVICE' : 'DEVICES'}`
                  : rgbStatus?.serverRunning ? 'SERVER ACTIVO' : 'DESCONECTADO'}
              </div>
              <span style={{ fontFamily: VD.mono, fontSize: 9, color: config.accent }}>→</span>
            </div>
          </div>

          {/* Execution log */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showLog ? 6 : 0 }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.log')}</DotLabel>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {execLog.length > 0 && (
                  <span
                    onClick={() => setExecLog([])}
                    title={t('panel.clearLog')}
                    style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, cursor: 'pointer', letterSpacing: 0.5 }}
                  >✕</span>
                )}
                <span
                  onClick={() => setShowLog((v) => !v)}
                  style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, cursor: 'pointer', userSelect: 'none' }}
                >{showLog ? '▲' : '▼'}</span>
              </div>
            </div>
            {showLog && (
              <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {execLog.length === 0 ? (
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted }}>Sin actividad</div>
                ) : execLog.map((entry) => (
                  <div key={entry.id} title={entry.error} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: entry.ok ? VD.success : VD.danger, fontSize: 8, flexShrink: 0 }}>●</span>
                    <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</span>
                    <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, flexShrink: 0 }}>
                      {new Date(entry.ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Now Playing */}
          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${VD.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('panel.playing')}</DotLabel>
              <span
                onClick={async () => {
                  const r = await api?.media.diagnose();
                  if (!r) return;
                  const lines = r.stdout.split(/\r?\n/).slice(0, 25).join('\n');
                  showToast(`${t('media.diagTitle')}\n${lines}${r.stderr ? '\n\nstderr:\n' + r.stderr.slice(0, 300) : ''}`);
                }}
                title={t('media.diagnose')}
                style={{
                  fontFamily: VD.mono, fontSize: 8, color: VD.textMuted,
                  cursor: 'pointer', letterSpacing: 1, padding: '2px 4px',
                }}
              >?</span>
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
                      {isPlaying
                        ? <IconMediaPlay size={18} color={VD.textMuted} />
                        : <IconMediaPause size={18} color={VD.textMuted} />
                      }
                    </div>
                    {nowPlaying.thumbnail && (
                      <img
                        src={nowPlaying.thumbnail}
                        alt=""
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
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
                {/* Media controls — Lucide icons, matching app design */}
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  {([
            { key: 'prev',       Icon: IconMediaSkipBack,                          title: t('media.prev') },
                    { key: 'play-pause', Icon: isPlaying ? IconMediaPause : IconMediaPlay, title: t('media.playPause') },
                    { key: 'next',       Icon: IconMediaSkipForward,                       title: t('media.next') },
                  ] as const).map(({ key, Icon, title }) => (
                    <button
                      key={key}
                      title={title}
                      onClick={() => {
                        // Usa SMTC nativo (TrySkipNext/Previous/TogglePlayPause); cae a SendKeys si falla.
                        api?.media.control(key as 'play-pause' | 'next' | 'prev');
                      }}
                      style={{
                        flex: 1, padding: '6px 0',
                        background: VD.elevated, border: `1px solid ${VD.border}`,
                        cursor: 'pointer', borderRadius: VD.radius.md,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.1s, border-color 0.1s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = config.accent; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = VD.border; }}
                    >
                      <Icon size={13} color={VD.textDim} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>{t('panel.noMedia')}</div>
            )}
          </div>
        </div>
  );
}
