import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import { resolverIconoCatalogo } from '../../data/iconosDot';
import { BRILLO_SUPERFICIE_POR_DEFECTO } from '../../utils/superficies/ajustesSuperficie';
import { decodificarArrastrePlugin, type CargaArrastrePlugin } from '../../utils/plugins/arrastrePlugin';
import { useVisualPlugin } from '../../utils/plugins/visual';
import { contextoDeBoton, esAccionPlugin } from '../../utils/plugins/ref';
import type { ButtonConfig } from '../../types';

export type BotonConCatalogo = ButtonConfig & { iconoCatalogo?: string };

interface TeclaLcdHardwareProps {
  indice: number;
  boton?: BotonConCatalogo;
  seleccionada: boolean;
  brillo?: number;
  disabled?: boolean;
  /** Última imagen que se mandó al aparato (data URL, sin rotar). Si está, se enseña salvo en vista previa. */
  imagen?: string;
  /** En vista previa de preset o perfil se enseña el diseño del preset en vez de la foto vieja del aparato. */
  enPrevia?: boolean;
  serial?: string;
  onSelect: () => void;
  onEditar: () => void;
  onDropPlugin?: (carga: CargaArrastrePlugin) => void;
}

function useBitsCatalogo(origen?: string, bitsExistentes?: string): string | null {
  const [bits, setBits] = useState<string | null>(bitsExistentes ?? null);
  useEffect(() => {
    if (bitsExistentes) {
      setBits(bitsExistentes);
      return;
    }
    if (!origen) {
      setBits(null);
      return;
    }
    let vivo = true;
    resolverIconoCatalogo(origen)
      .then((r) => { if (vivo) setBits(r ? r.bits : null); })
      .catch(() => { if (vivo) setBits(null); });
    return () => { vivo = false; };
  }, [origen, bitsExistentes]);
  return bitsExistentes ?? bits;
}

function ContenidoGlifo({
  bitsPuntos,
  glifo,
  tieneContenido,
  fgColor,
  defaultFg,
  accent,
}: {
  bitsPuntos: string | null;
  glifo: string | null;
  tieneContenido: boolean;
  fgColor?: string;
  defaultFg: string;
  accent: string;
}) {
  if (bitsPuntos) {
    return <IconoPuntos bits={bitsPuntos} size={20} color={fgColor || defaultFg} />;
  }
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
  bitsPuntos: string | null;
  glifo: string | null;
  tieneContenido: boolean;
  labelTexto: string;
  colorTexto: string;
  bgColor: string;
  fgColor?: string;
}

function calcularEstiloTecla(
  vd: ReturnType<typeof useTheme>,
  resaltada: boolean,
  disabled: boolean,
): React.CSSProperties {
  return {
    aspectRatio: '1 / 1',
    background: vd.elevated,
    border: `1.5px solid ${resaltada ? vd.accent : vd.border}`,
    borderRadius: vd.radius.md,
    padding: vd.space.xs,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: disabled ? 'default' : 'pointer',
    position: 'relative',
    boxShadow: resaltada
      ? `0 0 0 2px ${vd.accent}, inset 0 0 12px rgba(0, 0, 0, 0.6)`
      : 'inset 0 0 10px rgba(0, 0, 0, 0.4)',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
}

function obtenerDatosTecla(
  boton: BotonConCatalogo | undefined,
  bitsPuntos: string | null,
  tituloPlugin: string | undefined,
  vd: ReturnType<typeof useTheme>,
  vacioTexto: string,
): DatosTecla {
  if (!boton) {
    return {
      bitsPuntos: null,
      glifo: null,
      tieneContenido: false,
      labelTexto: vacioTexto,
      colorTexto: vd.textMuted,
      bgColor: vd.bg,
    };
  }

  const glifo = resolveDotGlyph(boton.icon) || (esAccionPlugin(boton.action) ? 'PLUG' : null);
  const labelEfectivo = tituloPlugin || boton.label;
  const tieneContenido = Boolean(labelEfectivo || boton.icon || glifo || bitsPuntos || boton.imageData);
  let colorTexto = vd.textMuted;
  if (boton.fgColor) {
    colorTexto = boton.fgColor;
  } else if (tieneContenido) {
    colorTexto = vd.text;
  }

  return {
    bitsPuntos,
    glifo,
    tieneContenido,
    labelTexto: labelEfectivo || vacioTexto,
    colorTexto,
    bgColor: boton.bgColor || vd.bg,
    fgColor: boton.fgColor,
  };
}

function contextoPluginTecla(boton: BotonConCatalogo | undefined, serial?: string): string | null {
  if (!boton || !esAccionPlugin(boton.action)) return null;
  return serial ? `${serial}:${boton.id}` : contextoDeBoton(boton.id);
}

function resolverImagenEfectiva(
  enPrevia: boolean,
  imagen?: string,
  imagenPlugin?: string,
  imageData?: string,
): string | undefined {
  if (enPrevia) return undefined;
  return imagen || imagenPlugin || imageData;
}

export function TeclaLcdHardware({
  indice,
  boton,
  seleccionada,
  brillo = BRILLO_SUPERFICIE_POR_DEFECTO,
  disabled = false,
  imagen,
  enPrevia = false,
  serial,
  onSelect,
  onEditar,
  onDropPlugin,
}: TeclaLcdHardwareProps) {
  const VD = useTheme();
  const t = useT();
  const [dragOver, setDragOver] = useState(false);

  const visualPlugin = useVisualPlugin(contextoPluginTecla(boton, serial));
  const bitsPuntos = useBitsCatalogo(boton?.iconoCatalogo ?? boton?.iconoPuntos?.origen, boton?.iconoPuntos?.bits);

  const brilloFactor = Math.max(0.2, brillo / 100);
  const datos = obtenerDatosTecla(boton, bitsPuntos, visualPlugin?.titulo, VD, t('disp.vacio'));
  const estiloTecla = calcularEstiloTecla(VD, seleccionada || dragOver, disabled);
  const imagenEfectiva = resolverImagenEfectiva(enPrevia, imagen, visualPlugin?.imagen, boton?.imageData);
  const puedeSoltar = !disabled && Boolean(onDropPlugin);

  return (
    <div
      onClick={disabled ? undefined : onSelect}
      onDoubleClick={disabled ? undefined : onEditar}
      onDragOver={(e) => {
        if (!puedeSoltar) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (!puedeSoltar) return;
        e.preventDefault();
        const carga = decodificarArrastrePlugin(e.dataTransfer.getData('text/plain'));
        if (carga) onDropPlugin?.(carga);
      }}
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
        {imagenEfectiva ? (
          <img
            src={imagenEfectiva}
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
              bitsPuntos={datos.bitsPuntos}
              glifo={datos.glifo}
              tieneContenido={datos.tieneContenido}
              fgColor={datos.fgColor}
              defaultFg={VD.text}
              accent={VD.accent}
            />

            <span
              title={datos.labelTexto}
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
