import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../utils/theme';
import { useT } from '../utils/i18n';
import { DotGlyphIcon } from '../components/dot480/DotGlyphIcon';
import { DISPOSICIONES, controlDeHueco } from '../utils/superficies/disposicion';
import { ListaDispositivosHardware, type DispositivoItem } from './dispositivos/ListaDispositivosHardware';
import { VistaHardwareN3 } from './dispositivos/VistaHardwareN3';
import { PanelInspectorControl } from './dispositivos/PanelInspectorControl';
import type { DeckConfig } from '../types';
import type { InfoSuperficie } from '../types/superficies';

export interface DispositivosBProps {
  config: DeckConfig;
  superficies: InfoSuperficie[];
  onEditarBoton: (id: string) => void;
  onBrillo: (serial: string, valor: number) => void;
  onVolver: () => void;
}

export function DispositivosB({
  config,
  superficies,
  onEditarBoton,
  onBrillo,
  onVolver,
}: DispositivosBProps) {
  const VD = useTheme();
  const t = useT();

  // 1. Unificar lista de dispositivos: los reportados en vivo + los que tienen página en config
  const todosDispositivos: DispositivoItem[] = useMemo(() => {
    const mapa = new Map<string, DispositivoItem>();

    // Añadir primero los dispositivos reportados por el hardware
    for (const sup of superficies) {
      const pag = config.pages.find((p) => p.superficie?.serial === sup.serial);
      mapa.set(sup.serial, {
        ...sup,
        paginaNombre: pag?.name,
      });
    }

    // Añadir páginas guardadas de dispositivos que actualmente no estén conectados
    for (const pag of config.pages) {
      if (pag.superficie && !mapa.has(pag.superficie.serial)) {
        const modelo = pag.superficie.modelo;
        const nombreModelo = DISPOSICIONES[modelo]?.nombre ?? t('disp.titulo');
        mapa.set(pag.superficie.serial, {
          serial: pag.superficie.serial,
          modelo,
          nombre: nombreModelo,
          conectado: false,
          paginaNombre: pag.name,
        });
      }
    }

    return Array.from(mapa.values());
  }, [superficies, config.pages, t]);

  // 2. Selección de dispositivo actual
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

  // 3. Obtener página y botones del dispositivo activo
  const indicePagina = useMemo(() => {
    if (!dispositivoActivo) return -1;
    return config.pages.findIndex((p) => p.superficie?.serial === dispositivoActivo.serial);
  }, [config.pages, dispositivoActivo]);

  const paginaConfig = indicePagina >= 0 ? config.pages[indicePagina] : undefined;

  const botonesPagina = useMemo(() => {
    if (indicePagina < 0) return [];
    return config.buttons.filter((b) => b.page === indicePagina);
  }, [config.buttons, indicePagina]);

  // 4. Hueco seleccionado para el inspector (0..17)
  const [selectedHueco, setSelectedHueco] = useState<number | null>(null);

  // 5. Control de brillo
  const brilloActual = paginaConfig?.superficie?.brillo ?? 80;
  const [brilloLocal, setBrilloLocal] = useState<number>(brilloActual);
  // Al cambiar de dispositivo, el deslizador tiene que enseñar el brillo del nuevo.
  const serialActivo = dispositivoActivo?.serial;
  useEffect(() => { setBrilloLocal(brilloActual); }, [serialActivo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBrilloChange = (val: number) => {
    setBrilloLocal(val);
    if (dispositivoActivo) {
      onBrillo(dispositivoActivo.serial, val);
    }
  };

  // 6. Metadata del control seleccionado
  const controlSeleccionado = useMemo(() => {
    if (selectedHueco === null || !dispositivoActivo) return null;
    return controlDeHueco(dispositivoActivo.modelo, selectedHueco);
  }, [selectedHueco, dispositivoActivo]);

  const botonSeleccionado = selectedHueco !== null ? botonesPagina[selectedHueco] : undefined;

  const handleEditarActual = () => {
    if (botonSeleccionado) {
      onEditarBoton(botonSeleccionado.id);
    }
  };

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
      {/* Barra superior de navegación */}
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

      {/* Cuerpo principal con 3 columnas */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Columna 1: Lista de dispositivos */}
        <ListaDispositivosHardware
          dispositivos={todosDispositivos}
          selectedSerial={dispositivoActivo?.serial ?? null}
          onSelectSerial={(serial) => {
            setSelectedSerial(serial);
            setSelectedHueco(null);
          }}
        />

        {/* Columna 2: Lienzo central del hardware seleccionado */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: `${VD.space.xl}px ${VD.space['2xl']}px`,
            gap: VD.space.lg,
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
              {/* Barra de herramientas superior del hardware */}
              <div
                style={{
                  background: VD.surface,
                  border: `1px solid ${VD.border}`,
                  borderRadius: VD.radius.md,
                  padding: `${VD.space.sm}px ${VD.space.lg}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: VD.space.lg,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: VD.text }}>
                    {dispositivoActivo.nombre}
                  </div>
                  <div style={{ fontSize: 8.5, color: VD.textMuted, marginTop: 2 }}>
                    {t('disp.resumenN3')}
                  </div>
                </div>

                {/* Control de brillo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm }}>
                    <DotGlyphIcon glyph="BRIGHTNESS" size={12} color={VD.textMuted} />
                    <label style={{ fontSize: 8.5, color: VD.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {t('disp.brillo')}:
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={brilloLocal}
                      disabled={!dispositivoActivo.conectado}
                      onChange={(e) => handleBrilloChange(Number(e.target.value))}
                      style={{
                        width: 140,
                        accentColor: VD.accent,
                        cursor: dispositivoActivo.conectado ? 'pointer' : 'default',
                      }}
                    />
                    <span style={{ fontSize: 9, minWidth: 28, color: VD.text }}>
                      {`${brilloLocal}%`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Banners de advertencia si no está conectado o no tiene página */}
              {!dispositivoActivo.conectado && (
                <div
                  style={{
                    background: `${VD.warning}18`,
                    border: `1px solid ${VD.warning}`,
                    color: VD.warning,
                    borderRadius: VD.radius.md,
                    padding: `${VD.space.sm}px ${VD.space.md}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: VD.space.sm,
                    fontSize: 9.5,
                  }}
                >
                  <DotGlyphIcon glyph="WARN" size={12} color={VD.warning} />
                  <span>{t('disp.avisoDesconectado')}</span>
                </div>
              )}

              {indicePagina < 0 && (
                <div
                  style={{
                    background: `${VD.warning}18`,
                    border: `1px solid ${VD.warning}`,
                    color: VD.warning,
                    borderRadius: VD.radius.md,
                    padding: `${VD.space.sm}px ${VD.space.md}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: VD.space.sm,
                    fontSize: 9.5,
                  }}
                >
                  <DotGlyphIcon glyph="WARN" size={12} color={VD.warning} />
                  <span>{t('disp.avisoSinPagina')}</span>
                </div>
              )}

              {/* Visualización física interactiva del N3 */}
              <VistaHardwareN3
                botones={botonesPagina}
                selectedHueco={selectedHueco}
                brillo={brilloLocal}
                conectado={dispositivoActivo.conectado}
                onSelectHueco={(h) => setSelectedHueco(h)}
                onEditarBoton={onEditarBoton}
              />
            </>
          )}
        </main>

        {/* Columna 3: Inspector del control seleccionado */}
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
