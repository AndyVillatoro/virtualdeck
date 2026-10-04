import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import { BRILLO_SUPERFICIE_POR_DEFECTO } from '../../utils/superficies/ajustesSuperficie';
import type { ButtonConfig } from '../../types';

interface TeclaLcdHardwareProps {
  indice: number;
  boton?: ButtonConfig;
  seleccionada: boolean;
  brillo?: number;
  disabled?: boolean;
  /** Última imagen que se mandó al aparato (data URL, sin rotar). Si está, se enseña tal cual. */
  imagen?: string;
  onSelect: () => void;
  onEditar: () => void;
}

function ContenidoGlifo({
  glifo,
  tieneContenido,
  fgColor,
  defaultFg,
  accent,
}: {
  glifo: string | null;
  tieneContenido: boolean;
  fgColor?: string;
  defaultFg: string;
  accent: string;
}) {
  if (glifo) {
    return <DotGlyphIcon glyph={glifo} size={18} color={fgColor || defaultFg} />;
  }
  if (tieneContenido) {
    return (
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 2,
          background: fgColor || accent,
          opacity: 0.8,
        }}
      />
    );
  }
  return <DotGlyphIcon glyph="ADD" size={14} color={defaultFg} />;
}

interface DatosTecla {
  glifo: string | null;
  tieneContenido: boolean;
  labelTexto: string;
  colorTexto: string;
  bgColor: string;
  fgColor?: string;
}

function calcularEstiloTecla(
  vd: ReturnType<typeof useTheme>,
  seleccionada: boolean,
  disabled: boolean,
): React.CSSProperties {
  return {
    aspectRatio: '1 / 1',
    background: vd.elevated,
    border: `1.5px solid ${seleccionada ? vd.accent : vd.border}`,
    borderRadius: vd.radius.md,
    padding: vd.space.xs,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: disabled ? 'default' : 'pointer',
    position: 'relative',
    boxShadow: seleccionada
      ? `0 0 0 2px ${vd.accent}, inset 0 0 12px rgba(0, 0, 0, 0.6)`
      : 'inset 0 0 10px rgba(0, 0, 0, 0.4)',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
}

function obtenerDatosTecla(
  boton: ButtonConfig | undefined,
  vd: ReturnType<typeof useTheme>,
  vacioTexto: string,
): DatosTecla {
  if (!boton) {
    return {
      glifo: null,
      tieneContenido: false,
      labelTexto: vacioTexto,
      colorTexto: vd.textMuted,
      bgColor: vd.bg,
    };
  }

  const glifo = resolveDotGlyph(boton.icon);
  const tieneContenido = Boolean(boton.label || boton.icon || glifo);
  let colorTexto = vd.textMuted;
  if (boton.fgColor) {
    colorTexto = boton.fgColor;
  } else if (tieneContenido) {
    colorTexto = vd.text;
  }

  return {
    glifo,
    tieneContenido,
    labelTexto: boton.label || vacioTexto,
    colorTexto,
    bgColor: boton.bgColor || vd.bg,
    fgColor: boton.fgColor,
  };
}

export function TeclaLcdHardware({
  indice,
  boton,
  seleccionada,
  brillo = BRILLO_SUPERFICIE_POR_DEFECTO,
  disabled = false,
  imagen,
  onSelect,
  onEditar,
}: TeclaLcdHardwareProps) {
  const VD = useTheme();
  const t = useT();

  const brilloFactor = Math.max(0.2, brillo / 100);
  const datos = obtenerDatosTecla(boton, VD, t('disp.vacio'));
  const estiloTecla = calcularEstiloTecla(VD, seleccionada, disabled);

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      onDoubleClick={disabled ? undefined : onEditar}
      style={estiloTecla}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: VD.radius.sm,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: VD.space.xs,
          background: datos.bgColor,
          border: `1px solid rgba(${VD.trama}, 0.08)`,
          position: 'relative',
          overflow: 'hidden',
          filter: `brightness(${brilloFactor})`,
        }}
      >
        {imagen ? (
          <img
            src={imagen}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        ) : (
          <>
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: 4,
                fontSize: 8,
                color: VD.textMuted,
                fontFamily: VD.mono,
                letterSpacing: 0.5,
              }}
            >
              {`K${indice + 1}`}
            </span>

            <ContenidoGlifo
              glifo={datos.glifo}
              tieneContenido={datos.tieneContenido}
              fgColor={datos.fgColor}
              defaultFg={VD.text}
              accent={VD.accent}
            />

            <span
              style={{
                fontSize: 8,
                textAlign: 'center',
                color: datos.colorTexto,
                fontFamily: VD.mono,
                maxWidth: '90%',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                letterSpacing: 0.5,
              }}
            >
              {datos.labelTexto}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
