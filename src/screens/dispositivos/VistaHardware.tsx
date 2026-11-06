import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { TeclaLcdHardware, type BotonConCatalogo } from './TeclaLcdHardware';
import { BotonFisicoHardware } from './BotonFisicoHardware';
import { PerillaRotativaHardware } from './PerillaRotativaHardware';
import { TiraTactilHardware } from './TiraTactilHardware';
import { huecosDeControl } from '../../utils/superficies/disposicion';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import type { CargaArrastrePlugin } from '../../utils/plugins/arrastrePlugin';
import type { ControlFisico, DisposicionSuperficie } from '../../types/superficies';

export interface VistaHardwareProps {
  disposicion: DisposicionSuperficie;
  botones: BotonConCatalogo[];
  selectedHueco: number | null;
  brillo: number;
  conectado: boolean;
  serial?: string;
  /** Huecos que están mostrando una vista previa temporal de preset o perfil. */
  huecosEnPrevia?: ReadonlySet<number>;
  /** Última imagen pintada de cada tecla, indexada por hueco. */
  imagenes?: (string | undefined)[];
  onSelectHueco: (hueco: number) => void;
  onEditarBoton: (id: string) => void;
  onSoltarPluginControl?: (
    control: ControlFisico,
    indiceHuecoEnControl: number,
    carga: CargaArrastrePlugin,
    enEjeCentral?: boolean,
  ) => void;
  esBarra?: boolean;
}

interface ControlElementoProps {
  control: ControlFisico;
  disposicion: DisposicionSuperficie;
  botones: BotonConCatalogo[];
  selectedHueco: number | null;
  brillo: number;
  serial?: string;
  huecosEnPrevia?: ReadonlySet<number>;
  imagenes?: (string | undefined)[];
  onSelectHueco: (hueco: number) => void;
  onEditarBoton: (id: string) => void;
  onSoltarPluginControl?: (
    control: ControlFisico,
    indiceHuecoEnControl: number,
    carga: CargaArrastrePlugin,
    enEjeCentral?: boolean,
  ) => void;
}

function ChasisTornillos({ color }: { color: string }) {
  return (
    <>
      <div style={{ position: 'absolute', top: 8, left: 8, width: 6, height: 6, borderRadius: '50%', background: color }} />
      <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: color }} />
      <div style={{ position: 'absolute', bottom: 8, left: 8, width: 6, height: 6, borderRadius: '50%', background: color }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: color }} />
    </>
  );
}

function ControlElemento({
  control,
  disposicion,
  botones,
  selectedHueco,
  brillo,
  serial,
  huecosEnPrevia,
  imagenes,
  onSelectHueco,
  onEditarBoton,
  onSoltarPluginControl,
}: ControlElementoProps) {
  const huecos = huecosDeControl(disposicion, control);
  if (huecos.length === 0) return null;

  const sinPagina = botones.length === 0;

  const handleEditar = (h: number) => {
    const btn = botones[h];
    if (btn) onEditarBoton(btn.id);
  };

  let nodoContenido: React.ReactNode = null;

  if (control.tipo === 'key') {
    const h = huecos[0];
    nodoContenido = (
      <div style={{ width: '100%', maxWidth: 96 }}>
        <TeclaLcdHardware
          indice={control.indice}
          boton={botones[h]}
          seleccionada={selectedHueco === h}
          brillo={brillo}
          disabled={sinPagina}
          imagen={imagenes?.[h]}
          enPrevia={huecosEnPrevia?.has(h) ?? false}
          serial={serial}
          onSelect={() => onSelectHueco(h)}
          onEditar={() => handleEditar(h)}
          onDropPlugin={onSoltarPluginControl ? (c) => onSoltarPluginControl(control, 0, c) : undefined}
        />
      </div>
    );
  } else if (control.tipo === 'button') {
    const h = huecos[0];
    nodoContenido = (
      <div style={{ width: '100%' }}>
        <BotonFisicoHardware
          indice={control.indice}
          boton={botones[h]}
          seleccionado={selectedHueco === h}
          disabled={sinPagina}
          onSelect={() => onSelectHueco(h)}
          onEditar={() => handleEditar(h)}
          onDropPlugin={onSoltarPluginControl ? (c) => onSoltarPluginControl(control, 0, c) : undefined}
        />
      </div>
    );
  } else if (control.tipo === 'knob') {
    const [hIzq, hPulsar, hDer] = huecos;
    let subSeleccionada: 'izq' | 'pulsar' | 'der' | null = null;
    if (selectedHueco === hIzq) subSeleccionada = 'izq';
    else if (selectedHueco === hPulsar) subSeleccionada = 'pulsar';
    else if (selectedHueco === hDer) subSeleccionada = 'der';

    const handleSelectGesto = (gesto: 'izq' | 'pulsar' | 'der') => {
      const h = gesto === 'izq' ? hIzq : gesto === 'der' ? hDer : hPulsar;
      onSelectHueco(h);
    };

    const handleEditarGesto = (gesto: 'izq' | 'pulsar' | 'der') => {
      const h = gesto === 'izq' ? hIzq : gesto === 'der' ? hDer : hPulsar;
      handleEditar(h);
    };

    const handleDropGesto = onSoltarPluginControl
      ? (gesto: 'izq' | 'pulsar' | 'der', carga: CargaArrastrePlugin, enEjeCentral?: boolean) => {
          const idx = gesto === 'izq' ? 0 : gesto === 'der' ? 2 : 1;
          onSoltarPluginControl(control, idx, carga, enEjeCentral);
        }
      : undefined;

    nodoContenido = (
      <div style={{ width: '100%', maxWidth: 140 }}>
        <PerillaRotativaHardware
          indice={control.indice}
          botonIzq={botones[hIzq]}
          botonPulsar={botones[hPulsar]}
          botonDer={botones[hDer]}
          subAccionSeleccionada={subSeleccionada}
          disabled={sinPagina}
          onSelectGesto={handleSelectGesto}
          onEditarGesto={handleEditarGesto}
          onDropPluginGesto={handleDropGesto}
        />
      </div>
    );
  } else if (control.tipo === 'swipe') {
    const [hIzq, hDer] = huecos;
    let subSeleccionada: 'izq' | 'der' | null = null;
    if (selectedHueco === hIzq) subSeleccionada = 'izq';
    else if (selectedHueco === hDer) subSeleccionada = 'der';

    const handleSelectGesto = (gesto: 'izq' | 'der') => {
      const h = gesto === 'der' ? hDer : hIzq;
      onSelectHueco(h);
    };

    const handleEditarGesto = (gesto: 'izq' | 'der') => {
      const h = gesto === 'der' ? hDer : hIzq;
      handleEditar(h);
    };

    const handleDropGesto = onSoltarPluginControl
      ? (gesto: 'izq' | 'der', carga: CargaArrastrePlugin) => {
          const idx = gesto === 'der' ? 1 : 0;
          onSoltarPluginControl(control, idx, carga);
        }
      : undefined;

    nodoContenido = (
      <div style={{ width: '100%' }}>
        <TiraTactilHardware
          indice={control.indice}
          botonIzq={botones[hIzq]}
          botonDer={botones[hDer]}
          subAccionSeleccionada={subSeleccionada}
          disabled={sinPagina}
          onSelectGesto={handleSelectGesto}
          onEditarGesto={handleEditarGesto}
          onDropPluginGesto={handleDropGesto}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        gridRowStart: control.fila + 1,
        gridColumnStart: control.columna + 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      {nodoContenido}
    </div>
  );
}

export function VistaHardware({
  disposicion,
  botones,
  selectedHueco,
  brillo,
  conectado,
  serial,
  huecosEnPrevia,
  imagenes,
  onSelectHueco,
  onEditarBoton,
  onSoltarPluginControl,
  esBarra: esBarraProp,
}: VistaHardwareProps) {
  const VD = useTheme();
  const t = useT();
  const { formato: formatoPantalla } = useFormatoPantalla();
  const esBarra = esBarraProp ?? (formatoPantalla === 'barra');

  const contenedorRef = useRef<HTMLDivElement>(null);
  const chasisRef = useRef<HTMLDivElement>(null);
  const [contenedorDims, setContenedorDims] = useState<{ ancho: number; alto: number }>({ ancho: 0, alto: 0 });
  const [altoChasis, setAltoChasis] = useState<number>(0);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContenedorDims({
          ancho: entry.contentRect.width,
          alto: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = chasisRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (chasisRef.current) {
        setAltoChasis(chasisRef.current.offsetHeight);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [disposicion]);

  const numFilas = Math.max(...disposicion.controles.map((c) => c.fila), 0) + 1;
  const numColumnas = Math.max(...disposicion.controles.map((c) => c.columna), 0) + 1;
  const anchoChasis = Math.min(840, Math.max(460, numColumnas * 136 + 64));
  const altoBase = altoChasis > 0 ? altoChasis : numFilas * 128 + 96;

  let escala = 1;
  if (contenedorDims.ancho > 0 && contenedorDims.alto > 0) {
    const pad = esBarra ? 8 : 12;
    const anchoDisp = Math.max(20, contenedorDims.ancho - pad);
    const altoDisp = Math.max(20, contenedorDims.alto - pad);
    const escalaY = altoDisp / altoBase;
    const escalaX = anchoDisp / anchoChasis;
    escala = Math.min(1, Math.min(escalaY, escalaX));
  }

  const anchoEscalado = Math.round(anchoChasis * escala);
  const altoEscalado = Math.round(altoBase * escala);

  return (
    <div
      ref={contenedorRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: esBarra ? 'flex-start' : 'center',
        padding: esBarra ? '2px 4px' : VD.space.xs,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: anchoEscalado,
          height: altoEscalado,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          ref={chasisRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: anchoChasis,
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
            background: VD.surface,
            border: `2px solid ${VD.borderStrong}`,
            borderRadius: 14,
            padding: `${VD.space.xl}px ${VD.space.xl}px`,
            boxShadow: VD.shadow.modal,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: VD.space.lg,
            opacity: conectado ? 1 : 0.85,
            transition: 'opacity 0.2s',
            boxSizing: 'border-box',
          }}
        >
          <ChasisTornillos color={VD.borderStrong} />

          {/* Serigrafía central del chasis */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: VD.space.xs,
              fontSize: 8,
              letterSpacing: 2,
              color: VD.textMuted,
              fontFamily: VD.mono,
              fontWeight: 700,
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
          >
            <span>{disposicion.nombre}</span>
            {!disposicion.verificado && (
              <span
                style={{
                  fontSize: 7.5,
                  color: VD.warning,
                  letterSpacing: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                (<DotGlyphIcon glyph="WARN" size={8} color={VD.warning} />
                {t('disp.experimental')})
              </span>
            )}
          </div>

          {/* Rejilla de controles según fila y columna físicas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${numColumnas}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${numFilas}, auto)`,
              gap: VD.space.md,
              width: '100%',
              alignItems: 'center',
            }}
          >
            {disposicion.controles.map((ctrl) => (
              <ControlElemento
                key={`${ctrl.tipo}_${ctrl.indice}_${ctrl.fila}_${ctrl.columna}`}
                control={ctrl}
                disposicion={disposicion}
                botones={botones}
                selectedHueco={selectedHueco}
                brillo={brillo}
                serial={serial}
                huecosEnPrevia={huecosEnPrevia}
                imagenes={imagenes}
                onSelectHueco={onSelectHueco}
                onEditarBoton={onEditarBoton}
                onSoltarPluginControl={onSoltarPluginControl}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
