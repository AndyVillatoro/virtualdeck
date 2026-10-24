import React, { useRef } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { ButtonConfig, DeckConfig, ElectronAPI, SoundProfileId } from '../../types';
import type { useEstadoSistema } from '../../utils/estadoSistema';
import type { useSensors } from '../../utils/sensors';
import type { useNowPlaying } from '../../utils/nowPlaying';
import type { useDatosWidget } from '../../components/celda/useDatosWidget';
import { indicesPaginasDeck } from '../../utils/acciones/pageNav';
import { BotonIcono } from '../../components/ui/BotonIcono';
import { RejillaBotones } from '../../components/rejilla/RejillaBotones';
import { PanelMusicaLateral } from './PanelesMusica';
import { AvisosContextuales } from './AvisosContextuales';
import { AvisoBarra } from './AvisoBarra';
import { BarraSeleccionLote } from './BarraSeleccionLote';
import { BarraLateral } from './BarraLateral';
import { CeldaPrincipal } from './CeldaPrincipal';

/**
 * La fila central de `MainB`: panel de música (izquierda), avisos contextuales,
 * aviso del formato barra, la rejilla de botones con su celda cableada, la
 * barra de selección por lote, la barra lateral, el panel de música (derecha)
 * y el toast de salida de scripts. Movida tal cual desde `MainB.tsx` para que
 * la pantalla quede por debajo del límite de líneas.
 */
export function ZonaCentral({
  config, activePage, pageButtons, gridSize, gridRows, isCompact, enBarra,
  verBarraLateral, panelMusica, panelMusicaVisible, nowPlaying, isPlaying, sourceName, api,
  estadoSistema, rgbStatus, sensorList, sensorStatus, widgetDataMap, hasConfiguredButtons,
  hintsDismissed, onDismissHint, toggledIds, selectedIds, setSelectedIds, onCrearPaginaBarra,
  runningButtons, soundOnPress, soundProfile, canPasteButton, onEditButton,
  executeButton, executeLongPressButton, onStateUpdate, showSidebar,
  onDuplicateButton, onCopyButton, onPasteButton, onClearButton, onUpdateButton,
  onToggleFijo, onConmutarSeleccion, setDragSourceId, onSwapButtons,
  onMoveButtonsToPage, onClearButtons, onConfigChange, onRGB,
  clock, execLog, setExecLog, showLog, setShowLog, showToast, onPageChange,
  toast, setToast,
}: ZonaCentralProps) {
  const VD = useTheme();
  const t = useT();
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const lastSwipeAtRef = useRef<number>(0);

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
          {/* El panel de musica, si toca por la izquierda. */}
          <PanelMusicaLateral
            config={config}
            panelMusica={panelMusicaVisible}
            lado="left"
            onConfigChange={onConfigChange}
            nowPlaying={nowPlaying}
            isPlaying={isPlaying}
            sourceName={sourceName}
            api={api}
          />
          {/* Hints contextuales (uno a la vez). Descartables. */}
          <AvisosContextuales
            hayBotones={hasConfiguredButtons}
            hintsDismissed={hintsDismissed}
            onDismissHint={onDismissHint}
            accent={config.accent}
          />
          {/* Formato barra: propone una página 6×2 (la rejilla admite hasta 6 columnas). */}
          <AvisoBarra
            enBarra={enBarra}
            gridSize={gridSize}
            gridRows={gridRows}
            hintsDismissed={hintsDismissed}
            onDismissHint={onDismissHint}
            onCrearPagina={onCrearPaginaBarra}
            accent={config.accent}
          />
          <RejillaBotones
            botones={pageButtons}
            columnas={gridSize}
            filas={gridRows}
            modo={enBarra || config.tileMode === 'fill' ? 'fill' : 'square'}
            relleno={isCompact ? 6 : 16}
            senal={showSidebar}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0].clientX;
              touchStartYRef.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touchStartXRef.current;
              const dy = e.changedTouches[0].clientY - touchStartYRef.current;
              const w = (e.currentTarget as HTMLDivElement).clientWidth || 600;
              const threshold = Math.max(50, Math.min(120, w * 0.08));
              const now = Date.now();
              const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
              const debounced = now - lastSwipeAtRef.current < 300;
              if (!isHorizontal || debounced || Math.abs(dx) < threshold) return;
              lastSwipeAtRef.current = now;
              // Solo entre páginas del deck (índices reales, sin renumerar).
              const indices = indicesPaginasDeck(config.pages);
              const pos = indices.indexOf(activePage);
              if (pos === -1) return;
              if (dx < 0 && pos < indices.length - 1) onPageChange(indices[pos + 1]);
              else if (dx > 0 && pos > 0) onPageChange(indices[pos - 1]);
            }}
            celda={(btn) => {
              const esFija = btn.fijo === true && btn.page !== activePage;
              const paginaOriginal = config.pages[btn.page];
              const nombrePaginaOriginal = paginaOriginal?.name || t('page.defaultName', { n: btn.page + 1 });
              return (
                <CeldaPrincipal
                  btn={btn}
                  esFija={esFija}
                  nombrePaginaOriginal={nombrePaginaOriginal}
                  onQuitarFijo={() => onUpdateButton?.({ ...btn, fijo: false })}
                  onIrAPagina={() => onPageChange(btn.page)}
                  accent={config.accent}
                toggledIds={toggledIds}
                selectedIds={selectedIds}
                estadoSistema={estadoSistema}
                sensorList={sensorList}
                widgetDataMap={widgetDataMap}
                runningButtons={runningButtons}
                soundOnPress={soundOnPress}
                soundProfile={soundProfile}
                deckState={config.state ?? {}}
                canPasteButton={canPasteButton}
                onEditButton={onEditButton}
                executeButton={executeButton}
                executeLongPressButton={executeLongPressButton}
                onStateUpdate={onStateUpdate}
                onDuplicateButton={onDuplicateButton}
                onCopyButton={onCopyButton}
                onPasteButton={onPasteButton}
                onClearButton={onClearButton}
                onUpdateButton={onUpdateButton}
                onToggleFijo={onToggleFijo}
                onConmutarSeleccion={onConmutarSeleccion}
                onArrastrar={setDragSourceId}
                onSwapButtons={onSwapButtons}
                showToast={showToast}
              />
            );
            }}
          />

          {/* Bulk-select toolbar */}
          <BarraSeleccionLote
            selectedIds={selectedIds}
            pages={config.pages}
            activePage={activePage}
            accent={config.accent}
            onMoveButtonsToPage={onMoveButtonsToPage}
            onClearButtons={onClearButtons}
            onClearSelection={() => setSelectedIds(new Set())}
            showToast={showToast}
          />

          {/* Sidebar */}
          {verBarraLateral && (
            <BarraLateral
              config={config}
              clock={clock}
              api={api}
              sensorList={sensorList}
              sensorStatus={sensorStatus}
              rgbStatus={rgbStatus}
              onRGB={onRGB}
              execLog={execLog}
              setExecLog={setExecLog}
              showLog={showLog}
              setShowLog={setShowLog}
              nowPlaying={nowPlaying}
              isPlaying={isPlaying}
              sourceName={sourceName}
              showToast={showToast}
              ocultarMusica={panelMusicaVisible.enabled}
              panelMusicaAbierto={panelMusica.enabled}
              onAlternarPanelMusica={() => onConfigChange({ ...config, musicPanel: { ...panelMusica, enabled: !panelMusica.enabled } })}
            />
          )}

          <PanelMusicaLateral
            config={config}
            panelMusica={panelMusicaVisible}
            lado="right"
            onConfigChange={onConfigChange}
            nowPlaying={nowPlaying}
            isPlaying={isPlaying}
            sourceName={sourceName}
            api={api}
          />

          {/* Script output toast */}
          {toast && (
            <div style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              background: VD.surface, border: `1px solid ${VD.borderStrong}`,
              borderRadius: VD.radius.lg, padding: '10px 16px',
              maxWidth: 'min(500px, 90%)', minWidth: 'min(240px, 90%)',
              fontFamily: VD.mono, fontSize: 10, color: VD.text,
              boxShadow: VD.shadow.menu, zIndex: 100,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ flex: 1, whiteSpace: 'pre-wrap', maxHeight: 140, overflowY: 'auto', lineHeight: 1.6 }}>{toast}</span>
              <BotonIcono glifo="CLOSE" title={t('comun.cerrar')} onClick={() => setToast(null)} tamano={20} tamanoGlifo={8} color={VD.textMuted} />
            </div>
          )}
    </div>
  );
}

interface ZonaCentralProps {
  config: DeckConfig;
  activePage: number;
  pageButtons: ButtonConfig[];
  gridSize: number;
  gridRows: number;
  isCompact: boolean;
  enBarra: boolean;
  verBarraLateral: boolean;
  panelMusica: NonNullable<DeckConfig['musicPanel']>;
  panelMusicaVisible: NonNullable<DeckConfig['musicPanel']>;
  nowPlaying: ReturnType<typeof useNowPlaying>;
  isPlaying: boolean;
  sourceName: string;
  api: ElectronAPI | undefined;
  estadoSistema: ReturnType<typeof useEstadoSistema>;
  rgbStatus: ReturnType<typeof useEstadoSistema>['rgbStatus'];
  sensorList: ReturnType<typeof useSensors>['sensors'];
  sensorStatus: ReturnType<typeof useSensors>['status'];
  widgetDataMap: ReturnType<typeof useDatosWidget>;
  hasConfiguredButtons: boolean;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  toggledIds: Set<string>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onCrearPaginaBarra: () => void;
  runningButtons: Set<string>;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  canPasteButton?: boolean;
  onEditButton: (id: string) => void;
  executeButton: (btn: ButtonConfig) => void;
  executeLongPressButton: (btn: ButtonConfig) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  onDuplicateButton: (id: string) => void;
  onCopyButton?: (id: string) => void;
  onPasteButton?: (id: string) => void;
  onClearButton: (id: string) => void;
  onUpdateButton?: (btn: ButtonConfig) => void;
  onToggleFijo: (id: string) => void;
  onConmutarSeleccion: (id: string) => void;
  setDragSourceId: React.Dispatch<React.SetStateAction<string | null>>;
  onSwapButtons: (idA: string, idB: string) => void;
  onMoveButtonsToPage: (ids: string[], targetPage: number, copy: boolean) => number;
  onClearButtons: (ids: string[]) => void;
  onConfigChange: (c: DeckConfig) => void;
  onRGB: () => void;
  clock: Date;
  showSidebar: boolean;
  execLog: { id: number; ts: number; label: string; actionType: string; ok: boolean; error?: string }[];
  setExecLog: React.Dispatch<React.SetStateAction<{ id: number; ts: number; label: string; actionType: string; ok: boolean; error?: string }[]>>;
  showLog: boolean;
  setShowLog: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (texto: string) => void;
  onPageChange: (page: number) => void;
  toast: string | null;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
}
