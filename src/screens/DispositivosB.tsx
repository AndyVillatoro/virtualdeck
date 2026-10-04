import React from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { CabeceraDispositivos } from './dispositivos/CabeceraDispositivos';
import { ContenidoDispositivos } from './dispositivos/ContenidoDispositivos';
import { LateralInspector, LateralLista } from './dispositivos/PanelesLaterales';
import { useResponsivePaneles } from './dispositivos/useResponsivePaneles';
import { useDockHardwareState } from './dispositivos/useDockHardwareState';
import type { DeckConfig } from '../types';
import type { DestinoPlantilla } from '../utils/useDeck/paginas';
import type { PresetHueco } from '../data/presetsDock';
import type { DisposicionSuperficie, InfoSuperficie } from '../types/superficies';

export interface DispositivosBProps {
  config: DeckConfig;
  superficies: InfoSuperficie[];
  /** Todas las disposiciones por id de modelo: para dibujar también dispositivos desconectados. */
  modelos: Record<string, DisposicionSuperficie>;
  /** Última imagen pintada de cada tecla, por serial e indexada por hueco. */
  imagenes?: Record<string, (string | undefined)[]>;
  /** Página activa de cada serial, por id (la que enseña el aparato). */
  paginasActivas: Record<string, string>;
  onEditarBoton: (id: string) => void;
  onBrilloVivo: (serial: string, valor: number) => void;
  onBrillo: (serial: string, valor: number) => void;
  onRotacion: (serial: string, grados: number) => void;
  /** Elegir una pestaña la pone activa en el aparato. */
  onActivarPagina: (serial: string, paginaId: string) => void;
  /** El `+` de las pestañas: otra página del mismo dispositivo. */
  onAgregarPagina: (origenId: string, disposicion: DisposicionSuperficie) => void;
  /** Vincular una app a la página (`''` la desvincula). */
  onFijarTargetApp: (id: string, app: string) => void;
  onRenombrarPagina: (id: string, nombre: string) => void;
  onBorrarPagina: (id: string) => void;
  /** Crear página preconfigurada desde plantilla (roadmap 75). */
  /** Página preconfigurada para el dispositivo activo: el destino lo añade esta pantalla. */
  onCrearDesdePlantilla?: (plantillaId: string, app: string, destino: DestinoPlantilla) => void;
  /** Un preset del inspector: rellena todos los huecos del control (3 en una perilla) en un solo deshacer. */
  onRellenarHuecos: (ids: string[], contenidos: PresetHueco[], nombre: string) => void;
  onVolver: () => void;
}

export function DispositivosB({
  config,
  superficies,
  modelos,
  imagenes,
  paginasActivas,
  onEditarBoton,
  onBrilloVivo,
  onBrillo,
  onRotacion,
  onActivarPagina,
  onAgregarPagina,
  onFijarTargetApp,
  onRenombrarPagina,
  onBorrarPagina,
  onCrearDesdePlantilla,
  onRellenarHuecos,
  onVolver,
}: DispositivosBProps) {
  const VD = useTheme();
  const t = useT();

  const paneles = useResponsivePaneles();
  const {
    anchoVentana, esPequenoLista, esPequenoInspector,
    listaAbierta, inspectorAbierto, anchoLista, anchoInspector,
    toggleLista, toggleInspector, cerrarLista, cerrarInspector,
    abrirInspectorSiPequeno,
  } = paneles;

  const dock = useDockHardwareState({
    config,
    superficies,
    modelos,
    paginasActivas,
    t,
    onBrilloVivo,
    onBrillo,
    onRotacion,
    onActivarPagina,
    onEditarBoton,
    onRellenarHuecos,
  });

  const {
    todosDispositivos, dispositivoActivo, setSelectedSerial, pestanas,
    botonesPagina, disposicionActiva, selectedHueco, setSelectedHueco,
    serialActivo, brilloLocal, handleBrilloMoving, handleBrilloCommit,
    lcds, rotacionActual, handleCambiarRotacion, controlSeleccionado,
    botonSeleccionado, hermanosPerilla, handleEditarActual, handleAplicarPreset, resumenControles,
  } = dock;

  const {
    paginasDelSerial, paginaActivaId, paginaEditadaId, paginaPredeterminadaId,
    indicePagina, puedeAgregar, handleElegirPagina,
  } = pestanas;

  const handleSelectHueco = (hueco: number) => {
    setSelectedHueco(hueco);
    abrirInspectorSiPequeno();
  };

  const handleSelectSerial = (serial: string) => {
    setSelectedSerial(serial);
    setSelectedHueco(null);
    if (esPequenoLista) cerrarLista();
  };

  const mostrarFondoOscuro = (esPequenoLista && listaAbierta) || (esPequenoInspector && inspectorAbierto);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: VD.bg,
        color: VD.text,
        fontFamily: VD.mono,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <CabeceraDispositivos
        anchoVentana={anchoVentana}
        listaAbierta={listaAbierta}
        inspectorAbierto={inspectorAbierto}
        onVolver={onVolver}
        onToggleLista={toggleLista}
        onToggleInspector={toggleInspector}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minWidth: 0, minHeight: 0 }}>
        <LateralLista
          abierta={listaAbierta}
          esPequeno={esPequenoLista}
          dispositivos={todosDispositivos}
          selectedSerial={dispositivoActivo?.serial ?? null}
          ancho={anchoLista}
          anchoVentana={anchoVentana}
          onSelectSerial={handleSelectSerial}
          onCerrar={cerrarLista}
        />

        {mostrarFondoOscuro && (
          <div
            onClick={() => {
              if (esPequenoLista) cerrarLista();
              if (esPequenoInspector) cerrarInspector();
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: 15,
            }}
          />
        )}

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: `${VD.space.sm}px ${VD.space.md}px`,
            gap: VD.space.sm,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <ContenidoDispositivos
            dispositivoActivo={dispositivoActivo}
            disposicionActiva={disposicionActiva}
            resumenControles={resumenControles}
            tieneLcds={lcds.length > 0}
            rotacionActual={rotacionActual}
            brilloLocal={brilloLocal}
            indicePagina={indicePagina}
            paginasDelSerial={paginasDelSerial}
            paginaActivaId={paginaActivaId}
            paginaEditadaId={paginaEditadaId}
            paginaPredeterminadaId={paginaPredeterminadaId}
            puedeAgregar={puedeAgregar}
            botonesPagina={botonesPagina}
            selectedHueco={selectedHueco}
            serialActivo={serialActivo}
            imagenes={imagenes}
            onCambiarRotacion={handleCambiarRotacion}
            onBrilloMoving={handleBrilloMoving}
            onBrilloCommit={handleBrilloCommit}
            onElegirPagina={handleElegirPagina}
            onAgregarPagina={onAgregarPagina}
            onRenombrarPagina={onRenombrarPagina}
            onBorrarPagina={onBorrarPagina}
            onFijarTargetApp={onFijarTargetApp}
            onCrearDesdePlantilla={onCrearDesdePlantilla && dispositivoActivo && disposicionActiva
              ? (plantillaId, app) => onCrearDesdePlantilla(plantillaId, app, {
                serial: dispositivoActivo.serial, modelo: dispositivoActivo.modelo, disposicion: disposicionActiva,
              })
              : undefined}
            onSelectHueco={handleSelectHueco}
            onEditarBoton={onEditarBoton}
          />
        </main>

        <LateralInspector
          abierta={inspectorAbierto}
          esPequeno={esPequenoInspector}
          controlMeta={controlSeleccionado}
          boton={botonSeleccionado}
          disabled={!dispositivoActivo}
          ancho={anchoInspector}
          anchoVentana={anchoVentana}
          onEditar={handleEditarActual}
          onAplicarPreset={dispositivoActivo ? handleAplicarPreset : undefined}
          onCerrar={cerrarInspector}
          hermanosPerilla={hermanosPerilla}
          onSelectHueco={handleSelectHueco}
        />
      </div>
    </div>
  );
}
