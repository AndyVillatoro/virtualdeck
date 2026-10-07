import React, { useMemo } from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useLang } from '../../utils/i18n';
import { formatoHora, formatoFecha } from '../../utils/formatos';
import { DotLabel } from '../../components/DotLabel';
import { DotText } from '../../components/DotText';
import { SensorCard, groupSensorsByHardware } from '../../components/SensorPanel';
import { WeatherWidget } from '../../components/WeatherWidget';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { EstadoRGB, RegistroEjecucion, FranjaMusica, type EntradaRegistro } from './apartadosBarraLateral';
import type { DeckConfig, ElectronAPI, NowPlaying, RGBStatus, Sensor, SensorsStatus } from '../../types';

/**
 * El panel de la derecha: reloj, clima, sensores, estado del RGB, registro de
 * ejecucion y lo que suena.
 *
 * Son seis apartados que no comparten nada entre ellos ni con la grilla. Solo
 * leen: lo unico que escriben es limpiar el registro, y eso llega por props
 * como todo lo demas.
 */


// El tipo bueno vive en `types.ts`. Aqui habia una copia escrita a mano, mas
// estrecha: no tenia `controls`, asi que la franja no podia saber si la fuente
// admite anterior o siguiente aunque el dato llegara.
type NowPlayingInfo = NowPlaying | null;

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
  /** El panel de musica ya enseña todo esto, y en grande. */
  ocultarMusica?: boolean;
  isPlaying: boolean;
  sourceName: string;
  showToast: (s: string) => void;
}

export function BarraLateral({ config, clock, api, sensorList, sensorStatus, rgbStatus, onRGB, execLog, setExecLog, showLog, setShowLog, nowPlaying, isPlaying, sourceName, showToast, ocultarMusica }: Props) {
  const VD = useTheme();
  const t = useT();
  const lang = useLang();
  // Memoizados: son dependencia de un `useMemo` y de un `useEffect`, y sin
  // referencia estable los harian recalcular en cada render.
  const TIME_FMT = useMemo(() => formatoHora(lang), [lang]);
  const DATE_FMT = useMemo(() => formatoFecha(lang), [lang]);

  return (
        <div className="vd-scroll" style={{
          width: 220, borderLeft: `1px solid ${VD.border}`,
          padding: '10px 14px 10px', background: VD.surface,
          display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0,
          // Lo que crece es la lista de sensores, y es la que se desplaza (va
          // con `flex: 1` y su propio scroll), así la franja de música anclada
          // abajo no se va del borde. Pero en una ventana baja ni sin sensores
          // cabe el resto (reloj, clima, RGB, registro, música), y con
          // `overflow: hidden` se recortaba la música: la columna entera se
          // desplaza **solo** en ese caso.
          overflowX: 'hidden', overflowY: 'auto',
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
                <DotGlyphIcon glyph="DOTS" size={6} color={sensorStatus?.connected ? VD.success : VD.textMuted} />
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
          <EstadoRGB rgbStatus={rgbStatus} onRGB={onRGB} accent={config.accent} />

          <RegistroEjecucion execLog={execLog} setExecLog={setExecLog} showLog={showLog} setShowLog={setShowLog} />

          {!ocultarMusica && (
            <FranjaMusica nowPlaying={nowPlaying} isPlaying={isPlaying} sourceName={sourceName} api={api} accent={config.accent} showToast={showToast} />
          )}
        </div>
  );
}
