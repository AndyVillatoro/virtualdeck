import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT, useLang } from '../utils/i18n';
import { PinKiosko, type ModoPin } from './fullscreen/PinKiosko';
import { SonandoAhora } from './fullscreen/SonandoAhora';
import { BarraSuperiorFullscreen } from './fullscreen/BarraSuperiorFullscreen';
import { PanelLateralFullscreen } from './fullscreen/PanelLateralFullscreen';
import { useFullscreenHotkeys } from './fullscreen/useFullscreenHotkeys';
import { Wallpaper } from '../components/Wallpaper';
import { ButtonCell } from '../components/ButtonCell';
import { useDatosWidget, useClimaWidget, useDivisas } from '../components/celda/useDatosWidget';
import { useEstadoSistema, botonActivo, botonVisible } from '../utils/estadoSistema';
import { formatoDia, formatoDiaMes } from '../utils/formatos';
import { RejillaBotones } from '../components/rejilla/RejillaBotones';
import { resolverBotonesPagina } from '../utils/botonesPagina';
import { FolderOverlay } from './main/OverlayCarpeta';
// `interpolate` viene de `acciones/base` y no del barril `utils/actions`: es un
// sustituto de texto sin dependencias y el barril arrastra el ejecutor entero.
import { interpolate } from '../utils/acciones/base';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from '../utils/pulsarBoton';
import { navegarDeck, indicesPaginasDeck, posicionEnDeck } from '../utils/acciones/pageNav';
import { useNowPlaying, useNowPlayingActivation } from '../utils/nowPlaying';
import { useSensors } from '../utils/sensors';
import { useFormatoPantalla } from '../utils/useFormatoPantalla';
import { textoSobre } from '../design';
import { groupSensorsByHardware } from '../components/SensorPanel';
import { DotGlyphIcon } from '../components/dot480/DotGlyphIcon';
import { BotonIcono } from '../components/ui/BotonIcono';
import { DotLabel } from '../components/DotLabel';
import type { ButtonConfig, DeckConfig, SoundProfileId } from '../types';

interface FullscreenBProps {
  config: DeckConfig;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  onExit: () => void;
  /** Persiste el PIN del modo kiosko para próximas activaciones. */
  onSetKioskPin: (pin: string) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  /** Enciende o apaga un interruptor. Vive en la configuracion, compartido. */
  onToggle: (id: string) => void;
}

function getSourceName(src: string): string {
  if (!src) return '';
  if (/youtube\s*music/i.test(src)) return 'YouTube Music';
  if (/youtube/i.test(src))         return 'YouTube';
  if (/spotify/i.test(src))         return 'Spotify';
  if (/soundcloud/i.test(src))      return 'SoundCloud';
  if (/chrome/i.test(src))          return 'Chrome';
  if (/msedge|edge/i.test(src))     return 'Edge';
  if (/firefox/i.test(src))         return 'Firefox';
  if (/vlc/i.test(src))             return 'VLC';
  const parts = src.split(/[\\./]/);
  return parts[parts.length - 1]?.replace(/\.exe$/i, '') || '';
}

export function FullscreenB({
  config,
  soundOnPress,
  soundProfile,
  onExit,
  onSetKioskPin,
  onStateUpdate,
  onToggle,
}: FullscreenBProps) {
  const VD = useTheme();
  const t = useT();
  const lang = useLang();
  const [now, setNow] = useState(new Date());
  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation('fullscreen');
  // En `barra` (monitor 1280×480 del dueño) el alto es lo escaso: barra
  // superior y panel laterales se pliegan, la rejilla llena el ancho y la
  // franja inferior —música y fichas de página en una sola— queda baja.
  const enBarra = useFormatoPantalla().formato === 'barra';

  useEffect(() => {
    setNowPlayingActive(true);
    return () => { setNowPlayingActive(false); };
  }, [setNowPlayingActive]);

  const { sensors: sensorList, status: sensorStatus } = useSensors();
  const [activePage, setActivePage] = useState(0);
  // Kiosko enseña las páginas del deck, como la principal: las de dock se
  // editan en `Dispositivos` (ver `utils/paginasDeck`). `activePage` sigue
  // siendo un índice real de `config.pages`; si apunta a una de dock (config
  // de antes), se vuelve a la primera del deck.
  const indicesDeck = useMemo(() => indicesPaginasDeck(config.pages), [config.pages]);
  useEffect(() => {
    if (indicesDeck.length > 0 && !indicesDeck.includes(activePage)) {
      setActivePage(indicesDeck[0]);
    }
  }, [indicesDeck, activePage]);
  const toggledIds = useMemo(() => new Set(config.toggledIds ?? []), [config.toggledIds]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const errorTimer = useRef<number>();

  const [kioskActive, setKioskActive] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<ModoPin>(null);
  const storedPin = config.kiosk?.pin ?? '';

  const enterKiosk = () => {
    if (!storedPin) {
      setPinPrompt('set');
    } else {
      setKioskActive(true);
    }
  };
  const requestExitKiosk = () => setPinPrompt('exit');

  useEffect(() => {
    if (!runtimeError) return;
    clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setRuntimeError(null), 5000);
    return () => clearTimeout(errorTimer.current);
  }, [runtimeError]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useFullscreenHotkeys({
    onExit,
    totalPages: indicesDeck.length,
    kioskActive,
    pinPrompt,
    setPinPrompt,
    requestExitKiosk,
    setActivePage: (pos) => {
      const real = indicesDeck[pos];
      if (real !== undefined) setActivePage(real);
    },
  });

  const configRef = useRef(config);
  configRef.current = config;

  const toggledRef = useRef(toggledIds);
  toggledRef.current = toggledIds;

  // Por referencia, como `config`: la celda conserva el manejador de su primer
  // render y la página del cierre sería la de entonces.
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  const entorno = useCallback((): EntornoPulsacion => ({
    api: window.electronAPI!,
    config: configRef.current,
    toggledIds: () => toggledRef.current,
    onToggle,
    onStateUpdate,
    avisar: setRuntimeError,
    t,
    // Kiosko navega entre las páginas del deck igual que la principal, con su
    // propio `setActivePage` (la principal no está montada aquí).
    navegar: (a) => navegarDeck(a, configRef.current.pages, configRef.current.pages[activePageRef.current]?.id, setActivePage),
  }), [onToggle, onStateUpdate, t]);

  const [ejecutando, setEjecutando] = useState<Set<string>>(new Set());
  const [carpetaAbierta, setCarpetaAbierta] = useState<ButtonConfig | null>(null);

  const executeLongPress = useCallback(async (btn: ButtonConfig) => {
    if (!window.electronAPI) return;
    await pulsacionLarga(btn, entorno());
  }, [entorno]);

  const executeButton = useCallback(async (btn: ButtonConfig) => {
    if (!window.electronAPI) return;
    if (btn.action.type === 'folder') { setCarpetaAbierta(btn); return; }
    setEjecutando((prev) => new Set(prev).add(btn.id));
    try {
      await pulsarBoton(btn, entorno());
    } finally {
      setEjecutando((prev) => { const s = new Set(prev); s.delete(btn.id); return s; });
    }
  }, [entorno]);

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const dayStr = formatoDia(lang).format(now).toUpperCase();
  const dateStr = formatoDiaMes(lang).format(now).toUpperCase();

  const currentPage = config.pages[activePage];
  const posDeck = posicionEnDeck(config.pages, activePage);
  const { modo: modoRejilla, relleno: rellenoRejilla } = medidasRejilla(enBarra, config.tileMode);
  const gridSize = currentPage?.gridSize ?? 4;
  const gridRows = currentPage?.gridRows ?? gridSize;
  const pageButtons = resolverBotonesPagina(config.buttons, activePage, gridSize, gridRows, config.pages);
  const isPlaying = nowPlaying?.status === 'Playing';
  const sourceName = nowPlaying ? getSourceName(nowPlaying.source) : '';

  const sensorGroups = useMemo(() => groupSensorsByHardware(sensorList), [sensorList]);
  const estadoSistema = useEstadoSistema(window.electronAPI);

  const hasWeather = useMemo(() => config.buttons.some((b) => b.widget === 'weather'), [config.buttons]);
  const clima = useClimaWidget(hasWeather, window.electronAPI);
  const divisas = useDivisas(config.buttons, window.electronAPI);
  const datosWidget = useDatosWidget({
    botones: config.buttons,
    estado: config.state,
    reloj: now,
    clima,
    sonando: nowPlaying,
    sensores: sensorList,
    divisas,
  });

  return (
    <div
      onContextMenu={(e) => { if (kioskActive) e.preventDefault(); }}
      style={{
        width: '100%', height: '100%', background: VD.bg,
        color: VD.text, fontFamily: VD.font,
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <Wallpaper kind={config.wallpaper} />

      {!kioskActive && (
        <BarraSuperiorFullscreen
          accent={config.accent}
          dayStr={dayStr}
          dateStr={dateStr}
          onEnterKiosk={enterKiosk}
          onExit={onExit}
        />
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative', zIndex: 1 }}>
        <PanelLateralFullscreen
          hours={hours}
          minutes={minutes}
          pages={config.pages}
          activePage={activePage}
          setActivePage={setActivePage}
          accent={config.accent}
          showSensors={config.sensors?.showWidget ?? true}
          sensorStatus={sensorStatus}
          sensorGroups={sensorGroups}
        />

        <RejillaBotones
          botones={pageButtons}
          columnas={gridSize}
          filas={gridRows}
          modo={modoRejilla}
          relleno={rellenoRejilla}
          celda={(btn) => {
            const esFija = btn.fijo === true && btn.page !== activePage;
            const paginaOriginal = config.pages[btn.page];
            const nombrePaginaOriginal = paginaOriginal?.name || t('page.defaultName', { n: btn.page + 1 });
            return (
              <ButtonCell
                key={btn.id}
                button={btn}
                accent={config.accent}
                esFija={esFija}
                nombrePaginaOriginal={nombrePaginaOriginal}
                onIrAPagina={() => setActivePage(btn.page)}
                onAvisoFijo={() => setRuntimeError(t('cell.fijoAviso', { pagina: nombrePaginaOriginal }))}
                toggled={toggledIds.has(btn.id)}
                subToggled={btn.subButtons?.map((s) => toggledIds.has(s.id))}
                isActive={botonActivo(btn, estadoSistema)}
                isHidden={!botonVisible(btn, estadoSistema, sensorList)}
                isRunning={ejecutando.has(btn.id)}
                widgetData={datosWidget[btn.id]}
                resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, config.state ?? {}) : undefined}
                soundEnabled={soundOnPress}
                soundProfile={soundProfile}
                deckState={config.state ?? {}}
                onStateUpdate={(k, v) => onStateUpdate({ [k]: v })}
                onEdit={() => {}}
                onExecute={(target) => executeButton(target ?? btn)}
                onAdjustWheel={(signo) => executeButton({
                  ...btn,
                  action: {
                    ...btn.action,
                    adjustDelta: Math.abs(btn.action.adjustDelta ?? 10) * signo,
                  },
                })}
                onLongPress={(target) => {
                  const b = target ?? btn;
                  if (b.longPressAction && b.longPressAction.type !== 'none') executeLongPress(b);
                }}
              />
            );
          }}
        />
      </div>

      <PinKiosko
        modo={pinPrompt}
        setModo={setPinPrompt}
        pinGuardado={storedPin}
        accent={config.accent ?? VD.accent}
        onGuardarPin={onSetKioskPin}
        setKioskActive={setKioskActive}
      />

      {runtimeError && (
        <div style={{
          position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, background: VD.surface, border: `1px solid ${VD.danger}`,
          borderRadius: VD.radius.md, padding: '10px 16px',
          fontFamily: VD.mono, fontSize: 11, color: VD.text,
          maxWidth: 'min(560px, 70%)', boxShadow: VD.shadow.menu,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <DotGlyphIcon glyph="WARN" size={12} color={VD.danger} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{runtimeError}</span>
          <BotonIcono
            glifo="CLOSE"
            title={t('comun.cerrar')}
            onClick={() => setRuntimeError(null)}
            tamano={20}
            tamanoGlifo={10}
            color={VD.textMuted}
          />
        </div>
      )}

      <FranjaInferior
        enBarra={enBarra}
        nowPlaying={nowPlaying}
        isPlaying={isPlaying}
        sourceName={sourceName}
        config={config}
        soundOnPress={soundOnPress}
        soundProfile={soundProfile}
        indicesDeck={indicesDeck}
        activePage={activePage}
        setActivePage={setActivePage}
        posDeck={posDeck}
        nombrePagina={currentPage?.name}
      />

      {carpetaAbierta && (
        <FolderOverlay
          btn={carpetaAbierta}
          accent={config.accent}
          soundEnabled={soundOnPress}
          soundProfile={soundProfile}
          entorno={entorno}
          onClose={() => setCarpetaAbierta(null)}
        />
      )}
    </div>
  );
}

/** En `barra` la rejilla llena el ancho (casillas rectangulares) y deja menos margen. */
function medidasRejilla(enBarra: boolean, tileMode?: 'square' | 'fill'): { modo: 'square' | 'fill'; relleno: number } {
  return {
    modo: enBarra || tileMode === 'fill' ? 'fill' : 'square',
    relleno: enBarra ? 8 : 20,
  };
}

type NowPlayingProp = React.ComponentProps<typeof SonandoAhora>['nowPlaying'];

interface FranjaInferiorProps {
  enBarra: boolean;
  nowPlaying: NowPlayingProp;
  isPlaying: boolean;
  sourceName: string;
  config: DeckConfig;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  indicesDeck: number[];
  activePage: number;
  setActivePage: (i: number) => void;
  posDeck: number | null;
  nombrePagina?: string;
}

/**
 * La franja de abajo del kiosko. En `barra` es una sola pieza —el reproductor
 * y las fichas de página juntos— para no comerse el alto de la rejilla; en el
 * resto se mantiene la tarjeta de página grande.
 */
function FranjaInferior({
  enBarra, nowPlaying, isPlaying, sourceName, config, soundOnPress, soundProfile,
  indicesDeck, activePage, setActivePage, posDeck, nombrePagina,
}: FranjaInferiorProps) {
  const VD = useTheme();
  const t = useT();

  return (
    <div style={{
      borderTop: `1px solid ${VD.border}`,
      padding: enBarra ? '4px 8px' : '6px 10px', display: 'flex', gap: enBarra ? 4 : 6,
      background: VD.surface, flexShrink: 0, position: 'relative', zIndex: 1,
    }}>
      <SonandoAhora
        nowPlaying={nowPlaying}
        isPlaying={isPlaying}
        sourceName={sourceName}
        config={config}
        soundOnPress={soundOnPress}
        soundProfile={soundProfile}
        compacto={enBarra}
      />

      {enBarra ? (
        // Fichas pequeñas: el número, y el nombre de la página en el tooltip.
        <div style={{ display: 'flex', gap: 3, flexShrink: 0, alignItems: 'center' }}>
          {indicesDeck.map((realIdx, pos) => {
            const p = config.pages[realIdx];
            const isActive = realIdx === activePage;
            return (
              <button
                key={p.id}
                onClick={() => setActivePage(realIdx)}
                title={p.name}
                style={{
                  minWidth: 30, height: 30, padding: '0 7px',
                  background: isActive ? config.accent : VD.elevated,
                  border: `1px solid ${isActive ? config.accent : VD.border}`,
                  color: isActive ? textoSobre(config.accent) : VD.textMuted,
                  fontFamily: VD.mono, fontSize: 10, letterSpacing: 1,
                  cursor: 'pointer', borderRadius: VD.radius.sm, flexShrink: 0,
                }}
              >
                {pos + 1}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="vd-fs-page" style={{
          width: 86, border: `1px solid ${VD.border}`, padding: '5px 8px',
          background: VD.elevated, flexShrink: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: 2,
        }}>
          <DotLabel size={7} color={VD.textMuted} spacing={2}>{t('full.page')}</DotLabel>
          <div style={{ fontFamily: VD.mono, fontSize: 15, color: VD.text, lineHeight: 1 }}>
            {posDeck === null ? '--' : String(posDeck + 1).padStart(2, '0')}/{indicesDeck.length}
          </div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nombrePagina}
          </div>
        </div>
      )}
    </div>
  );
}
