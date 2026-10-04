import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { TeclaLcdHardware } from './TeclaLcdHardware';
import { BotonFisicoHardware } from './BotonFisicoHardware';
import { PerillaRotativaHardware } from './PerillaRotativaHardware';
import { TiraTactilHardware } from './TiraTactilHardware';
import { huecosDeControl } from '../../utils/superficies/disposicion';
import type { ButtonConfig } from '../../types';
import type { ControlFisico, DisposicionSuperficie } from '../../types/superficies';

export interface VistaHardwareProps {
  disposicion: DisposicionSuperficie;
  botones: ButtonConfig[];
  selectedHueco: number | null;
  brillo: number;
  conectado: boolean;
  /** Última imagen pintada de cada tecla, indexada por hueco. */
  imagenes?: (string | undefined)[];
  onSelectHueco: (hueco: number) => void;
  onEditarBoton: (id: string) => void;
}

interface ControlElementoProps {
  control: ControlFisico;
  disposicion: DisposicionSuperficie;
  botones: ButtonConfig[];
  selectedHueco: number | null;
  brillo: number;
  conectado: boolean;
  imagenes?: (string | undefined)[];
  onSelectHueco: (hueco: number) => void;
  onEditarBoton: (id: string) => void;
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
  conectado,
  imagenes,
  onSelectHueco,
  onEditarBoton,
}: ControlElementoProps) {
  const huecos = huecosDeControl(disposicion, control);
  if (huecos.length === 0) return null;

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
          disabled={!conectado}
          imagen={imagenes?.[h]}
          onSelect={() => onSelectHueco(h)}
          onEditar={() => handleEditar(h)}
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
          disabled={!conectado}
          onSelect={() => onSelectHueco(h)}
          onEditar={() => handleEditar(h)}
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

    nodoContenido = (
      <div style={{ width: '100%', maxWidth: 140 }}>
        <PerillaRotativaHardware
          indice={control.indice}
          botonIzq={botones[hIzq]}
          botonPulsar={botones[hPulsar]}
          botonDer={botones[hDer]}
          subAccionSeleccionada={subSeleccionada}
          disabled={!conectado}
          onSelectGesto={handleSelectGesto}
          onEditarGesto={handleEditarGesto}
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

    nodoContenido = (
      <div style={{ width: '100%' }}>
        <TiraTactilHardware
          indice={control.indice}
          botonIzq={botones[hIzq]}
          botonDer={botones[hDer]}
          subAccionSeleccionada={subSeleccionada}
          disabled={!conectado}
          onSelectGesto={handleSelectGesto}
          onEditarGesto={handleEditarGesto}
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
  imagenes,
  onSelectHueco,
  onEditarBoton,
}: VistaHardwareProps) {
  const VD = useTheme();
  const t = useT();

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
    const pad = 12;
    const anchoDisp = Math.max(20, contenedorDims.ancho - pad);
    const altoDisp = Math.max(20, contenedorDims.alto - pad);
    const escalaX = anchoDisp / anchoChasis;
    const escalaY = altoDisp / altoBase;
    escala = Math.min(1, Math.min(escalaX, escalaY));
  }

  const anchoEscalado = Math.round(anchoChasis * escala);
  const altoEscalado = Math.round(altoBase * escala);

  return (
    <div
      ref={contenedorRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: VD.space.xs,
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
            opacity: conectado ? 1 : 0.7,
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
                conectado={conectado}
                imagenes={imagenes}
                onSelectHueco={onSelectHueco}
                onEditarBoton={onEditarBoton}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
