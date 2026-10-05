import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { Field, Btn, estiloEntrada } from '../comunes';
import { SelectorIconoGlifoCatalogo } from '../SelectorIconoGlifoCatalogo';
import { CAT_ACCIONES, CAT_MARCAS } from '../constantesCatalogo';
import type { NombreCatalogo } from '../../../data/iconosDot/tipos';

export interface CampoAspectoEncendidoProps {
  accent: string;
  encendidoIcon: string;
  setEncendidoIcon: (s: string) => void;
  encendidoIconoPuntos?: { bits: string; origen: string };
  setEncendidoIconoPuntos: (val?: { bits: string; origen: string }) => void;
  encendidoBgColor: string;
  setEncendidoBgColor: (s: string) => void;
  encendidoFgColor: string;
  setEncendidoFgColor: (s: string) => void;
  onAbrirCatalogoDot?: (catalogo: NombreCatalogo, destino?: 'principal' | 'encendido') => void;
  previewToggled: boolean;
  setPreviewToggled: (v: boolean) => void;
}

export function CampoAspectoEncendido({
  accent,
  encendidoIcon,
  setEncendidoIcon,
  encendidoIconoPuntos,
  setEncendidoIconoPuntos,
  encendidoBgColor,
  setEncendidoBgColor,
  encendidoFgColor,
  setEncendidoFgColor,
  onAbrirCatalogoDot,
  previewToggled,
  setPreviewToggled,
}: CampoAspectoEncendidoProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px',
        background: VD.surface,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.sm,
      }}
    >
      {/* Cabecera con alternador de vista previa */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <DotLabel size={9} color={accent} spacing={2}>
          {tf('ASPECTO ENCENDIDO')}
        </DotLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: VD.mono, fontSize: 8.5, color: VD.textDim }}>
            {tf('VISTA PREVIA:')}
          </span>
          <button
            type="button"
            onClick={() => setPreviewToggled(!previewToggled)}
            style={{
              height: 32,
              padding: '0 10px',
              background: previewToggled ? `${accent}24` : VD.elevated,
              border: `1px solid ${previewToggled ? accent : VD.border}`,
              borderRadius: VD.radius.sm,
              color: previewToggled ? accent : VD.textDim,
              fontFamily: VD.mono,
              fontSize: 8.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: previewToggled ? accent : VD.textDim,
              }}
            />
            {previewToggled ? tf('ENCENDIDO') : tf('APAGADO')}
          </button>
        </div>
      </div>

      {/* Selector de icono (reutiliza glifo y catálogo) */}
      <Field label={tf('ICONO (ENCENDIDO)')}>
        <SelectorIconoGlifoCatalogo
          icon={encendidoIcon}
          setIcon={setEncendidoIcon}
          accent={accent}
          iconoPuntos={encendidoIconoPuntos}
          setIconoPuntos={setEncendidoIconoPuntos}
          onAbrirCatalogoAcciones={() => onAbrirCatalogoDot?.(CAT_ACCIONES, 'encendido')}
          onAbrirCatalogoMarcas={() => onAbrirCatalogoDot?.(CAT_MARCAS, 'encendido')}
        />
      </Field>

      {/* Colores para el estado encendido */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tf('COLOR DE FONDO (ENCENDIDO)')}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={encendidoBgColor || '#222222'}
              onChange={(e) => setEncendidoBgColor(e.target.value)}
              style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }}
            />
            <input
              value={encendidoBgColor}
              onChange={(e) => setEncendidoBgColor(e.target.value)}
              placeholder="#222222"
              style={{ ...inputStyle, flex: 1 }}
            />
            {encendidoBgColor && (
              <Btn onClick={() => setEncendidoBgColor('')}>
                <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
              </Btn>
            )}
          </div>
        </Field>

        <Field label={tf('COLOR DE TEXTO / ICONO (ENCENDIDO)')}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={encendidoFgColor || '#dcdcdc'}
              onChange={(e) => setEncendidoFgColor(e.target.value)}
              style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }}
            />
            <input
              value={encendidoFgColor}
              onChange={(e) => setEncendidoFgColor(e.target.value)}
              placeholder="#dcdcdc"
              style={{ ...inputStyle, flex: 1 }}
            />
            {encendidoFgColor && (
              <Btn onClick={() => setEncendidoFgColor('')}>
                <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
              </Btn>
            )}
          </div>
        </Field>
      </div>
    </div>
  );
}
