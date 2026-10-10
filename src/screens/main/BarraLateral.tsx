import React, { useMemo } from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useLang } from '../../utils/i18n';
import { formatoHora, formatoFecha } from '../../utils/formatos';
import { DotLabel } from '../../components/DotLabel';
import { DotText } from '../../components/DotText';
import { SensorTile, getRepresentativeTiles } from '../../components/SensorPanel';
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
  /**
   * Abrir y cerrar el panel de música desde su franja (misma clave que
   * Ajustes → SONIDO). Opcionales: los cablea quien renderiza la barra
   * (MainB); sin ellos la franja no enseña el botón.
   */
  panelMusicaAbierto?: boolean;
  onAlternarPanelMusica?: () => void;
}

export function BarraLateral({ config, clock, api, sensorList, sensorStatus, rgbStatus, onRGB, execLog, setExecLog, showLog, setShowLog, nowPlaying, isPlaying, sourceName, showToast, ocultarMusica, panelMusicaAbierto, onAlternarPanelMusica }: Props) {
  const VD = useTheme();
  const t = useT();
  const lang = useLang();
  // Memoizados: son dependencia de un `useMemo` y de un `useEffect`, y sin
  // referencia estable los harian recalcular en cada render.
  const TIME_FMT = useMemo(() => formatoHora(lang), [lang]);
  const DATE_FMT = useMemo(() => formatoFecha(lang), [lang]);
  const sensorTiles = useMemo(() => getRepresentativeTiles(sensorList), [sensorList]);
  const sensorCols = sensorTiles.length <= 2 ? sensorTiles.length : sensorTiles.length === 4 ? 2 : 3;

  return (
        <div className="vd-scroll" style={{
          width: 220, borderLeft: `1px solid ${VD.border}`,
          background: VD.surface,
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          alignSelf: 'stretch', minHeight: 0, maxHeight: '100%',
          overflowX: 'hidden', overflowY: 'hidden',
        }}>
          {/* Zona que se desplaza: reloj, clima, sensores, RGB, registro */}
          <div style={{
            flex: 1, minHeight: 0,
            padding: '8px 10px 8px',
            display: 'flex', flexDirection: 'column', gap: 8,
            overflowX: 'hidden', overflowY: 'auto',
          }}>
          {/* Clock — DotText es la firma del reloj */}
          <div style={{
            paddingBottom: 8, borderBottom: `1px solid ${VD.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
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
            <DotLabel size={8} color={VD.textMuted} spacing={1} style={{ display: 'block', marginBottom: 4 }}>{t('panel.weather')}</DotLabel>
            <WeatherWidget />
          </div>

          {/* Sensor tiles — grid de cuadros representativos */}
          {sensorList.length > 0 && (config.sensors?.showWidget ?? true) && sensorTiles.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <DotLabel size={8} color={VD.textMuted} spacing={1}>{t('panel.sensors')}</DotLabel>
                <DotGlyphIcon glyph="DOTS" size={6} color={sensorStatus?.connected ? VD.success : VD.textMuted} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${sensorCols}, 1fr)`,
                gap: 4,
              }}>
                {sensorTiles.map((tile) => (
                  <SensorTile
                    key={tile.id}
                    category={tile.category}
                    metric={tile.metric}
                    value={tile.value}
                    hardware={tile.hardware}
                  />
                ))}
              </div>
            </div>
          )}

          {/* RGB status */}
          <EstadoRGB rgbStatus={rgbStatus} onRGB={onRGB} accent={config.accent} />

          <RegistroEjecucion execLog={execLog} setExecLog={setExecLog} showLog={showLog} setShowLog={setShowLog} />
          </div>

          {/* Franja de música: anclada abajo y fija, fuera de la zona con scroll.
              No se encoge y no se sale del borde en ventanas bajas. */}
          {!ocultarMusica && (
            <div style={{ flexShrink: 0, padding: '0 10px 8px', background: VD.surface }}>
            <FranjaMusica nowPlaying={nowPlaying} isPlaying={isPlaying} sourceName={sourceName} api={api} accent={config.accent} showToast={showToast} panelAbierto={panelMusicaAbierto} onAlternarPanel={onAlternarPanelMusica} />
            </div>
          )}
        </div>
  );
}
