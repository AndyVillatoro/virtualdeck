import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { VistaHardware } from './VistaHardware';
import { PestanasSuperficie } from './PestanasSuperficie';
import {
  AvisoModeloDesconocido,
  BannersDispositivoActivo,
  HeaderDispositivoActivo,
} from './BarraHardwareActivo';
import type { ButtonConfig, PageConfig } from '../../types';
import type { DisposicionSuperficie } from '../../types/superficies';
import type { DispositivoItem } from './ListaDispositivosHardware';

interface ContenidoDispositivosProps {
  dispositivoActivo: DispositivoItem | null;
  disposicionActiva: DisposicionSuperficie | null;
  resumenControles: string;
  tieneLcds: boolean;
  rotacionActual: number;
  brilloLocal: number;
  indicePagina: number;
  paginasDelSerial: PageConfig[];
  paginaActivaId: string | null;
  paginaEditadaId: string | null;
  paginaPredeterminadaId: string | null;
  puedeAgregar: boolean;
  botonesPagina: ButtonConfig[];
  selectedHueco: number | null;
  serialActivo?: string;
  imagenes?: Record<string, (string | undefined)[]>;
  onCambiarRotacion: (grados: number) => void;
  onBrilloMoving: (val: number) => void;
  onBrilloCommit: () => void;
  onElegirPagina: (id: string) => void;
  onAgregarPagina: (origenId: string, disposicion: DisposicionSuperficie) => void;
  onRenombrarPagina: (id: string, nombre: string) => void;
  onBorrarPagina: (id: string) => void;
  onFijarTargetApp: (id: string, app: string, iconoApp?: string) => void;
  /** Crear página preconfigurada desde plantilla (roadmap 75). */
  onCrearDesdePlantilla?: (plantillaId: string, app: string) => void;
  onSelectHueco: (hueco: number) => void;
  onEditarBoton: (id: string) => void;
}

function VistaSinDispositivos() {
  const VD = useTheme();
  const t = useT();

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: VD.space.md,
        color: VD.textMuted,
        textAlign: 'center',
        padding: VD.space['2xl'],
      }}
    >
      <DotGlyphIcon glyph="USB_PLUG" size={36} color={VD.textMuted} />
      <div style={{ fontSize: 12, fontWeight: 600, color: VD.text }}>
        {t('disp.sinDispositivos')}
      </div>
      <div style={{ fontSize: 9.5, maxWidth: 320, lineHeight: 1.5 }}>
        {t('disp.sinDispositivosDesc')}
      </div>
    </div>
  );
}

export function ContenidoDispositivos({
  dispositivoActivo,
  disposicionActiva,
  resumenControles,
  tieneLcds,
  rotacionActual,
  brilloLocal,
  indicePagina,
  paginasDelSerial,
  paginaActivaId,
  paginaEditadaId,
  paginaPredeterminadaId,
  puedeAgregar,
  botonesPagina,
  selectedHueco,
  serialActivo,
  imagenes,
  onCambiarRotacion,
  onBrilloMoving,
  onBrilloCommit,
  onElegirPagina,
  onAgregarPagina,
  onRenombrarPagina,
  onBorrarPagina,
  onFijarTargetApp,
  onCrearDesdePlantilla,
  onSelectHueco,
  onEditarBoton,
}: ContenidoDispositivosProps) {
  const VD = useTheme();
  const t = useT();

  if (!dispositivoActivo) {
    return <VistaSinDispositivos />;
  }

  return (
    <>
      <HeaderDispositivoActivo
        dispositivoActivo={dispositivoActivo}
        disposicionActiva={disposicionActiva}
        resumenControles={resumenControles}
        tieneLcds={tieneLcds}
        rotacionActual={rotacionActual}
        brilloLocal={brilloLocal}
        vd={VD}
        t={t}
        onCambiarRotacion={onCambiarRotacion}
        onBrilloMoving={onBrilloMoving}
        onBrilloCommit={onBrilloCommit}
      />

      <BannersDispositivoActivo
        conectado={dispositivoActivo.conectado}
        indicePagina={indicePagina}
        vd={VD}
        t={t}
      />

      {!disposicionActiva ? (
        <AvisoModeloDesconocido
          vd={VD}
          titulo={t('disp.modeloDesconocido')}
          descripcion={t('disp.modeloDesconocidoDesc')}
        />
      ) : (
        <>
          <PestanasSuperficie
            paginas={paginasDelSerial}
            paginaActivaId={paginaActivaId}
            paginaEditadaId={paginaEditadaId}
            paginaPredeterminadaId={paginaPredeterminadaId}
            disposicion={disposicionActiva}
            puedeAgregar={puedeAgregar}
            onElegirPagina={onElegirPagina}
            onAgregarPagina={onAgregarPagina}
            onRenombrarPagina={onRenombrarPagina}
            onBorrarPagina={onBorrarPagina}
            onFijarApp={onFijarTargetApp}
            onCrearDesdePlantilla={onCrearDesdePlantilla}
          />
          <VistaHardware
            disposicion={disposicionActiva}
            botones={botonesPagina}
            selectedHueco={selectedHueco}
            brillo={brilloLocal}
            conectado={dispositivoActivo.conectado}
            imagenes={serialActivo ? imagenes?.[serialActivo] : undefined}
            onSelectHueco={onSelectHueco}
            onEditarBoton={onEditarBoton}
          />
        </>
      )}
    </>
  );
}
