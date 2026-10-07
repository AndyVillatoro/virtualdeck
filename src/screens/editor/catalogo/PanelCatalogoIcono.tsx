import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText, useT } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../../components/dot480/IconoPuntos';
import { BrandIconDisplay } from '../../../components/BrandIconDisplay';
import { useCatalogoMarcas } from '../../../utils/catalogoMarcas';
import { Btn } from '../comunes';
import { PanelMarcaIcono } from '../PanelMarcaIcono';
import { FilaGlifosRapidos } from './FilaGlifosRapidos';
import { PREFIJO_MARCAS } from '../constantesCatalogo';
import type { TipoIcono } from '../tiposIcono';

export interface PanelCatalogoIconoProps {
  tipoIcono: TipoIcono;
  accent: string;
  icon: string;
  setIcon: React.Dispatch<React.SetStateAction<string>>;
  iconoPuntos?: { bits: string; origen: string };
  setIconoPuntos?: React.Dispatch<React.SetStateAction<{ bits: string; origen: string } | undefined>>;
  brandIcon: string;
  setBrandIcon: React.Dispatch<React.SetStateAction<string>>;
  brandIconAlwaysAnimate: boolean;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  glifoEncima: string;
  setGlifoEncima: (g: string) => void;
  onAbrirCatalogo: () => void;
}

/**
 * La pestaña CATÁLOGO del campo ICONO: la vista del icono elegido (glifo o
 * marca), el botón para abrir el catálogo grande, los glifos rápidos y —solo
 * si es una marca— sus opciones.
 */
export function PanelCatalogoIcono(props: PanelCatalogoIconoProps) {
  const {
    tipoIcono,
    accent,
    icon,
    setIcon,
    iconoPuntos,
    setIconoPuntos,
    brandIcon,
    setBrandIcon,
    brandIconAlwaysAnimate,
    setBrandIconAlwaysAnimate,
    brandIconCustomBitmap,
    brandIconCustomColor,
    brandIconCustomPalette,
    setBrandIconCustomBitmap,
    setBrandIconCustomColor,
    glifoEncima,
    setGlifoEncima,
    onAbrirCatalogo,
  } = props;
  const VD = useTheme();
  const tf = useFieldText();
  const t = useT();
  const catalogoMarcas = useCatalogoMarcas();

  const tienePuntosMarca = Boolean(iconoPuntos?.origen.startsWith(PREFIJO_MARCAS));
  const etiquetaMarca = catalogoMarcas?.BRAND_ICONS_MAP[brandIcon]?.label ?? brandIcon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {iconoPuntos ? (
          <>
            <VistaPuntos iconoPuntos={iconoPuntos} accent={accent} />
            <Btn onClick={() => setIconoPuntos?.(undefined)} style={{ color: VD.danger }}>
              {tf('Quitar')}
            </Btn>
          </>
        ) : icon ? (
          <>
            <div
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: VD.elevated,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
              }}
            >
              <DotGlyphIcon glyph={icon} size={22} color={accent} showRecessed />
            </div>
            <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, fontWeight: 'bold' }}>
              {icon.toUpperCase()}
            </span>
            <Btn onClick={() => setIcon('')} style={{ color: VD.danger }}>
              {tf('Quitar')}
            </Btn>
          </>
        ) : brandIcon ? (
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
              {etiquetaMarca}
            </span>
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
          <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>
            {t('cat.sinIcono')}
          </span>
        )}

        <Btn onClick={onAbrirCatalogo}>{t('cat.abrir')}</Btn>
      </div>

      {tipoIcono === 'marca' && (
        <PanelMarcaIcono
          brandIcon={brandIcon}
          brandIconAlwaysAnimate={brandIconAlwaysAnimate}
          setBrandIconAlwaysAnimate={setBrandIconAlwaysAnimate}
          glifoEncima={glifoEncima}
          setGlifoEncima={setGlifoEncima}
          accent={accent}
          tienePuntosMarca={tienePuntosMarca}
        />
      )}

      <FilaGlifosRapidos
        icon={icon}
        setIcon={setIcon}
        accent={accent}
        setIconoPuntos={setIconoPuntos}
      />
    </div>
  );
}

function VistaPuntos({
  iconoPuntos,
  accent,
}: {
  iconoPuntos: { bits: string; origen: string };
  accent: string;
}) {
  const VD = useTheme();
  const nombre = iconoPuntos.origen
    .slice(iconoPuntos.origen.indexOf(':') + 1)
    .replace(/-/g, ' ')
    .toUpperCase();

  return (
    <>
      <div
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: VD.elevated,
          border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.sm,
        }}
      >
        <IconoPuntos bits={iconoPuntos.bits} size={24} color={accent} showRecessed />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, fontWeight: 'bold' }}>
          {nombre}
        </span>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5 }}>
          {iconoPuntos.origen}
        </span>
      </div>
    </>
  );
}
