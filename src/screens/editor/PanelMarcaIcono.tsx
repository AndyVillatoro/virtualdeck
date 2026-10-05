import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { BrandIconDisplay } from '../../components/BrandIconDisplay';
import { useCatalogoMarcas, type CatalogoMarcas } from '../../utils/catalogoMarcas';
import { Btn } from './comunes';
import { SubseccionGlifoEncima } from './SubseccionGlifoEncima';

function etiquetaMarca(catalogo: CatalogoMarcas | null, clave: string): string {
  return catalogo?.BRAND_ICONS_MAP[clave]?.label ?? clave;
}

export interface PanelMarcaIconoProps {
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  setBrandIcon: React.Dispatch<React.SetStateAction<string>>;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  setShowBrandPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrandEditor: React.Dispatch<React.SetStateAction<boolean>>;
  glifoEncima: string;
  setGlifoEncima: (g: string) => void;
  accent: string;
}

export function PanelMarcaIcono(props: PanelMarcaIconoProps) {
  const {
    brandIcon,
    brandIconAlwaysAnimate,
    brandIconCustomBitmap,
    brandIconCustomColor,
    brandIconCustomPalette,
    setBrandIcon,
    setBrandIconAlwaysAnimate,
    setBrandIconCustomBitmap,
    setBrandIconCustomColor,
    setShowBrandPicker,
    setShowBrandEditor,
    glifoEncima,
    setGlifoEncima,
    accent,
  } = props;
  const VD = useTheme();
  const tf = useFieldText();
  const catalogoMarcas = useCatalogoMarcas();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {brandIcon ? (
          <>
            <div
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: VD.radius.lg,
                border: `1px solid ${VD.border}`,
                overflow: 'hidden',
                background: VD.elevated,
              }}
            >
              <BrandIconDisplay
                iconKey={brandIcon}
                customBitmap={brandIconCustomBitmap}
                customColor={brandIconCustomColor}
                customPalette={brandIconCustomPalette}
                animated={false}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              />
            </div>
            <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>
              {etiquetaMarca(catalogoMarcas, brandIcon)}
              {brandIconCustomBitmap && (
                <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}>
                  <DotGlyphIcon glyph="EDIT" size={8} color={accent} />
                </span>
              )}
            </span>
            <Btn onClick={() => setShowBrandPicker(true)}>{tf('Cambiar')}</Btn>
            <Btn onClick={() => setShowBrandEditor(true)}>{tf('Editar puntos')}</Btn>
            {brandIconCustomBitmap && (
              <Btn
                onClick={() => {
                  setBrandIconCustomBitmap(undefined);
                  setBrandIconCustomColor(undefined);
                }}
              >
                {tf('Restaurar')}
              </Btn>
            )}
            <Btn
              onClick={() => {
                setBrandIcon('');
                setBrandIconCustomBitmap(undefined);
                setBrandIconCustomColor(undefined);
              }}
              style={{ color: VD.danger }}
            >
              {tf('Quitar')}
            </Btn>
          </>
        ) : (
          <Btn onClick={() => setShowBrandPicker(true)}>{tf('Elegir icono de marca')}</Btn>
        )}
      </div>

      {brandIcon && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={brandIconAlwaysAnimate}
            onChange={(e) => setBrandIconAlwaysAnimate(e.target.checked)}
            style={{ accentColor: accent }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 0.5, color: VD.textDim }}>
            {tf('ANIMACIÓN SIEMPRE ACTIVA — si está desactivado, anima solo cuando el botón está encendido (toggle ON)')}
          </span>
        </label>
      )}

      {brandIcon && (
        <SubseccionGlifoEncima
          glifoEncima={glifoEncima}
          setGlifoEncima={setGlifoEncima}
          accent={accent}
        />
      )}
    </div>
  );
}
