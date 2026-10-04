import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotGlyphIcon } from '../components/dot480/DotGlyphIcon';
import { controlDeHueco, teclasLcd } from '../utils/superficies/disposicion';
import { ListaDispositivosHardware, type DispositivoItem } from './dispositivos/ListaDispositivosHardware';
import { VistaHardware } from './dispositivos/VistaHardware';
import { PanelInspectorControl } from './dispositivos/PanelInspectorControl';
import {
  AvisoModeloDesconocido,
  BannersDispositivoActivo,
  generarResumenControles,
  HeaderDispositivoActivo,
} from './dispositivos/BarraHardwareActivo';
import type { DeckConfig } from '../types';
import type { DisposicionSuperficie, InfoSuperficie } from '../types/superficies';

export interface DispositivosBProps {
  config: DeckConfig;
  superficies: InfoSuperficie[];
  /** Todas las disposiciones por id de modelo: para dibujar también dispositivos desconectados. */
  modelos: Record<string, DisposicionSuperficie>;
  onEditarBoton: (id: string) => void;
  onBrilloVivo: (serial: string, valor: number) => void;
  onBrillo: (serial: string, valor: number) => void;
  onRotacion: (serial: string, grados: number) => void;
  onVolver: () => void;
}

function obtenerTodosDispositivos(
  superficies: InfoSuperficie[],
  pages: DeckConfig['pages'],
  modelos: Record<string, DisposicionSuperficie>,
): DispositivoItem[] {
  const mapa = new Map<string, DispositivoItem>();

  for (const sup of superficies) {
    const pag = pages.find((p) => p.superficie?.serial === sup.serial);
    mapa.set(sup.serial, {
      ...sup,
      paginaNombre: pag?.name,
    });
  }

  for (const pag of pages) {
    if (pag.superficie && !mapa.has(pag.superficie.serial)) {
      const modeloId = pag.superficie.modelo;
      const disp = modelos[modeloId];
      const nombreModelo = disp?.nombre ?? modeloId;
      mapa.set(pag.superficie.serial, {
        serial: pag.superficie.serial,
        modelo: modeloId,
        nombre: nombreModelo,
        conectado: false,
        disposicion: disp,
        paginaNombre: pag.name,
      });
    }
  }

  return Array.from(mapa.values());
}

function obtenerDisposicionActiva(
  dispositivoActivo: DispositivoItem | null,
  superficies: InfoSuperficie[],
  paginaConfig: DeckConfig['pages'][number] | undefined,
  modelos: Record<string, DisposicionSuperficie>,
): DisposicionSuperficie | null {
  if (!dispositivoActivo) return null;
  if (dispositivoActivo.conectado && dispositivoActivo.disposicion) {
    return dispositivoActivo.disposicion;
  }
  const supViva = superficies.find((s) => s.serial === dispositivoActivo.serial);
  if (supViva?.disposicion) return supViva.disposicion;

  const modeloId = paginaConfig?.superficie?.modelo || dispositivoActivo.modelo;
  if (modeloId && modelos[modeloId]) {
    return modelos[modeloId];
  }
  return null;
}

export function DispositivosB({
  config,
  superficies,
  modelos,
  onEditarBoton,
  onBrilloVivo,
  onBrillo,
  onRotacion,
  onVolver,
}: DispositivosBProps) {
  const VD = useTheme();
  const t = useT();

  const todosDispositivos = useMemo(() => {
    return obtenerTodosDispositivos(superficies, config.pages, modelos);
  }, [superficies, config.pages, modelos]);

  const [selectedSerial, setSelectedSerial] = useState<string | null>(() => {
    return todosDispositivos[0]?.serial ?? null;
  });

  const dispositivoActivo = useMemo(() => {
    if (selectedSerial) {
      const encontrado = todosDispositivos.find((d) => d.serial === selectedSerial);
      if (encontrado) return encontrado;
    }
    return todosDispositivos[0] ?? null;
  }, [todosDispositivos, selectedSerial]);

  const indicePagina = useMemo(() => {
    if (!dispositivoActivo) return -1;
    return config.pages.findIndex((p) => p.superficie?.serial === dispositivoActivo.serial);
  }, [config.pages, dispositivoActivo]);

  const paginaConfig = indicePagina >= 0 ? config.pages[indicePagina] : undefined;

  const botonesPagina = useMemo(() => {
    if (indicePagina < 0) return [];
    return config.buttons.filter((b) => b.page === indicePagina);
  }, [config.buttons, indicePagina]);

  const disposicionActiva = useMemo(() => {
    return obtenerDisposicionActiva(dispositivoActivo, superficies, paginaConfig, modelos);
  }, [dispositivoActivo, superficies, paginaConfig, modelos]);

  const [selectedHueco, setSelectedHueco] = useState<number | null>(null);

  const brilloActual = paginaConfig?.superficie?.brillo ?? 80;
  const [brilloLocal, setBrilloLocal] = useState<number>(brilloActual);
  const serialActivo = dispositivoActivo?.serial;

  useEffect(() => {
    setBrilloLocal(brilloActual);
  }, [serialActivo, brilloActual]);

  const handleBrilloMoving = (val: number) => {
    setBrilloLocal(val);
    if (dispositivoActivo) {
      onBrilloVivo(dispositivoActivo.serial, val);
    }
  };

  const handleBrilloCommit = () => {
    if (dispositivoActivo) {
      onBrillo(dispositivoActivo.serial, brilloLocal);
    }
  };

  const lcds = useMemo(() => {
    return disposicionActiva ? teclasLcd(disposicionActiva) : [];
  }, [disposicionActiva]);

  const rotacionDefecto = lcds.length > 0 ? lcds[0].lcd.rotacion : 0;
  const rotacionActual = paginaConfig?.superficie?.rotacion ?? rotacionDefecto;

  const handleCambiarRotacion = (grados: number) => {
    if (dispositivoActivo) {
      onRotacion(dispositivoActivo.serial, grados);
    }
  };

  const controlSeleccionado = useMemo(() => {
    if (selectedHueco === null || !disposicionActiva) return null;
    return controlDeHueco(disposicionActiva, selectedHueco);
  }, [selectedHueco, disposicionActiva]);

  const botonSeleccionado = selectedHueco !== null ? botonesPagina[selectedHueco] : undefined;

  const handleEditarActual = () => {
    if (botonSeleccionado) {
      onEditarBoton(botonSeleccionado.id);
    }
  };

  const resumenControles = disposicionActiva ? generarResumenControles(disposicionActiva, t) : '';

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
      <header
        style={{
          height: 40,
          background: VD.surface,
          borderBottom: `1px solid ${VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${VD.space.lg}px`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.md }}>
          <button
            type="button"
            onClick={onVolver}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: VD.space.xs,
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              color: VD.text,
              padding: '4px 8px',
              borderRadius: VD.radius.sm,
              fontFamily: VD.mono,
              fontSize: 10,
              letterSpacing: 1,
              cursor: 'pointer',
            }}
          >
            <DotGlyphIcon glyph="ARROW_LEFT" size={10} color={VD.text} />
            <span>{t('disp.volver')}</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: VD.space.sm,
              fontSize: 10,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            <span style={{ color: VD.textMuted }}>{t('disp.breadcrumb.config')}</span>
            <span style={{ color: VD.textMuted, fontSize: 8 }}>/</span>
            <span style={{ color: VD.text, fontWeight: 600 }}>{t('disp.titulo')}</span>
          </div>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ListaDispositivosHardware
          dispositivos={todosDispositivos}
          selectedSerial={dispositivoActivo?.serial ?? null}
          onSelectSerial={(serial) => {
            setSelectedSerial(serial);
            setSelectedHueco(null);
          }}
        />

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: `${VD.space.lg}px ${VD.space.xl}px`,
            gap: VD.space.md,
          }}
        >
          {!dispositivoActivo ? (
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
                padding: VD.space['3xl'],
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
          ) : (
            <>
              <HeaderDispositivoActivo
                dispositivoActivo={dispositivoActivo}
                disposicionActiva={disposicionActiva}
                resumenControles={resumenControles}
                tieneLcds={lcds.length > 0}
                rotacionActual={rotacionActual}
                brilloLocal={brilloLocal}
                vd={VD}
                t={t}
                onCambiarRotacion={handleCambiarRotacion}
                onBrilloMoving={handleBrilloMoving}
                onBrilloCommit={handleBrilloCommit}
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
                <VistaHardware
                  disposicion={disposicionActiva}
                  botones={botonesPagina}
                  selectedHueco={selectedHueco}
                  brillo={brilloLocal}
                  conectado={dispositivoActivo.conectado}
                  onSelectHueco={(h) => setSelectedHueco(h)}
                  onEditarBoton={onEditarBoton}
                />
              )}
            </>
          )}
        </main>

        <PanelInspectorControl
          controlMeta={controlSeleccionado}
          boton={botonSeleccionado}
          disabled={!dispositivoActivo}
          onEditar={handleEditarActual}
        />
      </div>
    </div>
  );
}
