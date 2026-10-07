import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Chip } from '../../components/ui/Chip';
import { VistaHardware } from './VistaHardware';
import { PestanasSuperficie } from './PestanasSuperficie';
import {
  AvisoModeloDesconocido,
  BannersDispositivoActivo,
  ControlBrillo,
  ControlRotacion,
  HeaderDispositivoActivo,
} from './BarraHardwareActivo';
import type { ButtonConfig, PageConfig } from '../../types';
import type { DisposicionSuperficie } from '../../types/superficies';
import type { DispositivoItem } from './ListaDispositivosHardware';

interface ContenidoDispositivosProps {
  dispositivoActivo: DispositivoItem | null;
  disposicionActiva: DisposicionSuperficie | null;
  todosDispositivos?: DispositivoItem[];
  onSelectSerial?: (serial: string) => void;
  esBarra?: boolean;
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
  todosDispositivos,
  onSelectSerial,
  esBarra = false,
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

  if (esBarra) {
    const hayVariosDispositivos = Boolean(todosDispositivos && todosDispositivos.length > 1);

    return (
      <>
        {hayVariosDispositivos && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexWrap: 'wrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 8,
                color: VD.textMuted,
                letterSpacing: 1,
                fontFamily: VD.mono,
                textTransform: 'uppercase',
                marginRight: 2,
              }}
            >
              {t('disp.panel.dispositivos')}:
            </span>
            {todosDispositivos?.map((d) => {
              const activo = d.serial === dispositivoActivo.serial;
              return (
                <Chip
                  key={d.serial}
                  activo={activo}
                  onClick={() => onSelectSerial?.(d.serial)}
                  title={`${d.nombre} (${d.serial})`}
                  style={{ padding: '2px 6px', minHeight: 20, fontSize: 8 }}
                >
                  <DotGlyphIcon glyph="USB_PLUG" size={8} color={activo ? VD.accent : VD.textDim} />
                  <span>{d.nombre}</span>
                  {d.conectado ? (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: VD.success, marginLeft: 2 }} />
                  ) : (
                    <span style={{ fontSize: 7, color: VD.textMuted, marginLeft: 2 }}>({t('disp.desconectado')})</span>
                  )}
                </Chip>
              );
            })}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: VD.space.sm,
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            padding: '2px 8px',
            minHeight: 30,
            flexShrink: 0,
            position: 'relative',
            minWidth: 0,
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm, minWidth: 0, flex: 1, position: 'relative' }}>
            {disposicionActiva && (
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
                esBarra={true}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.md, flexShrink: 0 }}>
            {tieneLcds && (
              <ControlRotacion
                rotacionActual={rotacionActual}
                conectado={dispositivoActivo.conectado}
                vd={VD}
                labelRotacion={t('disp.rotacion')}
                ayudaRotacion={t('disp.rotacionAyuda')}
                onCambiarRotacion={onCambiarRotacion}
              />
            )}
            <ControlBrillo
              brillo={brilloLocal}
              conectado={dispositivoActivo.conectado}
              vd={VD}
              labelBrillo={t('disp.brillo')}
              onChangeVivo={onBrilloMoving}
              onCommit={onBrilloCommit}
            />
          </div>
        </div>

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
          <VistaHardware
            disposicion={disposicionActiva}
            botones={botonesPagina}
            selectedHueco={selectedHueco}
            brillo={brilloLocal}
            conectado={dispositivoActivo.conectado}
            imagenes={serialActivo ? imagenes?.[serialActivo] : undefined}
            onSelectHueco={onSelectHueco}
            onEditarBoton={onEditarBoton}
            esBarra={true}
          />
        )}
      </>
    );
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
