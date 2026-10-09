import React from 'react';
import type { DeckConfig, SoundProfileId, ModoPerilla } from '../types';
import type { DisposicionSuperficie } from '../types/superficies';
import type { DestinoPlantilla } from '../utils/useDeck/paginas';
import type { PresetHueco } from '../data/presetsDock';
import type { Superficies } from '../utils/superficies/useSuperficies';
import { FullscreenB } from './FullscreenB';

const WallpaperB = React.lazy(() => import('./WallpaperB').then((m) => ({ default: m.WallpaperB })));
const RGBManagerB = React.lazy(() => import('./RGBManagerB').then((m) => ({ default: m.RGBManagerB })));
const BarConfigB = React.lazy(() => import('./BarConfigB').then((m) => ({ default: m.BarConfigB })));
const DispositivosB = React.lazy(() => import('./DispositivosB').then((m) => ({ default: m.DispositivosB })));

export interface VistasSecundariasProps {
  view: 'fullscreen' | 'wallpaper' | 'rgb' | 'barra' | 'devices';
  config: DeckConfig;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  onExitFullscreen: () => void;
  onSetKioskPin: (pin: string) => void;
  onStateUpdate: (patch: Record<string, string>) => void;
  onToggle: (id: string) => void;
  onBack: () => void;
  onSaveConfig: (config: DeckConfig) => void;
  superficies: Superficies;
  fijarModosPerilla: (botonId: string, modos: ModoPerilla[], nombre: string) => void;
  onEditarBoton: (id: string) => void;
  api: typeof window.electronAPI;
  fijarBrilloSuperficie: (serial: string, valor: number) => void;
  fijarRotacionSuperficie: (serial: string, grados: number) => void;
  agregarPaginaSuperficie: (origenId: string, disposicion: DisposicionSuperficie) => void;
  fijarTargetAppPagina: (id: string, app: string, iconoApp?: string) => void;
  renamePage: (id: string, nombre: string) => void;
  deletePage: (id: string) => void;
  rellenarBotones: (ids: string[], contenidos: PresetHueco[], nombre: string) => void;
  crearPaginaDesdePlantilla?: (plantillaId: string, app: string, destino: DestinoPlantilla) => void;
}

export function VistasSecundarias({
  view,
  config,
  soundOnPress,
  soundProfile,
  onExitFullscreen,
  onSetKioskPin,
  onStateUpdate,
  onToggle,
  onBack,
  onSaveConfig,
  superficies,
  fijarModosPerilla,
  onEditarBoton,
  api,
  fijarBrilloSuperficie,
  fijarRotacionSuperficie,
  agregarPaginaSuperficie,
  fijarTargetAppPagina,
  renamePage,
  deletePage,
  rellenarBotones,
  crearPaginaDesdePlantilla,
}: VistasSecundariasProps) {
  if (view === 'fullscreen') {
    return (
      <FullscreenB
        config={config}
        soundOnPress={soundOnPress}
        soundProfile={soundProfile}
        onExit={onExitFullscreen}
        onSetKioskPin={onSetKioskPin}
        onStateUpdate={onStateUpdate}
        onToggle={onToggle}
      />
    );
  }

  if (view === 'wallpaper') {
    return (
      <WallpaperB
        config={config}
        onBack={onBack}
        onSave={(wallpaper) => onSaveConfig({ ...config, wallpaper })}
      />
    );
  }

  if (view === 'rgb') {
    return (
      <RGBManagerB
        config={config}
        onConfigChange={onSaveConfig}
        onBack={onBack}
      />
    );
  }

  if (view === 'devices') {
    return (
      <DispositivosB
        config={config}
        superficies={superficies.dispositivos}
        modelos={superficies.modelos}
        imagenes={superficies.imagenes}
        paginasActivas={superficies.paginasActivas}
        modosActivos={superficies.modosActivos}
        onFijarModosPerilla={fijarModosPerilla}
        onEditarBoton={onEditarBoton}
        onBrilloVivo={(serial, valor) => { void api?.superficies.brillo(serial, valor); }}
        onBrillo={fijarBrilloSuperficie}
        onRotacion={fijarRotacionSuperficie}
        onActivarPagina={superficies.activarPagina}
        onAgregarPagina={agregarPaginaSuperficie}
        onFijarTargetApp={fijarTargetAppPagina}
        onRenombrarPagina={renamePage}
        onBorrarPagina={deletePage}
        onRellenarHuecos={rellenarBotones}
        onCrearDesdePlantilla={crearPaginaDesdePlantilla}
        onVolver={onBack}
      />
    );
  }

  if (view === 'barra') {
    return (
      <BarConfigB
        config={config}
        onConfigChange={onSaveConfig}
        onBack={onBack}
      />
    );
  }

  return null;
}
