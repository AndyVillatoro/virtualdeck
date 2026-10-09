import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../components/dot480/DotMatrixImageOverlay';
import { BrandIconDisplay } from '../../components/BrandIconDisplay';
import { Glyph57View as Glyph57Inline } from '../../components/Glyph57View';
import { GLIFO_POR_TIPO_ACCION } from '../../components/dot480/glifosPorTipoAccion';
import { Field, Btn } from './comunes';
import { PanelCatalogoIcono } from './catalogo/PanelCatalogoIcono';
import { CAT_ACCIONES, CAT_MARCAS } from './constantesCatalogo';
import type { TipoIcono } from './tiposIcono';
import type { ButtonAction } from '../../types';
import type { NombreCatalogo } from '../../data/iconosDot/tipos';

// La pestaña CATÁLOGO cubre los dos tipos internos (glifo y marca) sin cambiar
// el formato guardado: `fichaDeTipo` los une y `elegirFicha` los conserva.
type FichaIcono = 'auto' | 'catalogo' | 'dibujo' | 'imagen';

const TIPOS_ICONO: FichaIcono[] = ['auto', 'catalogo', 'dibujo', 'imagen'];

function fichaDeTipo(tipo: TipoIcono): FichaIcono {
  return tipo === 'glifo' || tipo === 'marca' ? 'catalogo' : tipo;
}

function etiquetaDeTipo(ficha: FichaIcono, tf: (s: string) => string): string {
  switch (ficha) {
    case 'auto':
      return tf('AUTOMÁTICO');
    case 'catalogo':
      return tf('CATÁLOGO');
    case 'dibujo':
      return tf('DIBUJO PROPIO');
    case 'imagen':
      return tf('IMAGEN / GIF');
  }
}

export interface CampoIconoUnificadoProps {
  accent: string;
  action: ButtonAction;
  tipoIcono: TipoIcono;
  setTipoIcono: (t: TipoIcono) => void;
  habiaVariosCamposIcono?: boolean;
  glifoEncima: string;
  setGlifoEncima: (g: string) => void;
  icon: string;
  setIcon: React.Dispatch<React.SetStateAction<string>>;
  imageData: string;
  setImageData: React.Dispatch<React.SetStateAction<string>>;
  pickImage: () => void;
  brandIcon: string;
  setBrandIcon: React.Dispatch<React.SetStateAction<string>>;
  brandIconAlwaysAnimate: boolean;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  brandIconCustomBitmap?: string[];
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  brandIconCustomColor?: string;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  brandIconCustomPalette?: Record<string, string>;
  setBrandIconCustomPalette: React.Dispatch<React.SetStateAction<Record<string, string> | undefined>>;
  customGlyph57?: number[];
  setCustomGlyph57: React.Dispatch<React.SetStateAction<number[] | undefined>>;
  setShowBrandPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrandEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGlyphEditor: React.Dispatch<React.SetStateAction<boolean>>;
  fgColor: string;
  iconoPuntos?: { bits: string; origen: string };
  setIconoPuntos?: React.Dispatch<React.SetStateAction<{ bits: string; origen: string } | undefined>>;
  onAbrirCatalogoDot?: (catalogo: NombreCatalogo) => void;
}

export function CampoIconoUnificado(props: CampoIconoUnificadoProps) {
  const tf = useFieldText();
  const { tipoIcono, setTipoIcono, habiaVariosCamposIcono, accent } = props;
  const fichaActiva = fichaDeTipo(tipoIcono);

  const elegirFicha = (ficha: FichaIcono) => {
    if (ficha === 'catalogo') {
      // Sin un icono de catálogo elegido, la pestaña abre el modal directamente.
      if (fichaActiva !== 'catalogo') props.onAbrirCatalogoDot?.(CAT_ACCIONES);
      return;
    }
    setTipoIcono(ficha);
  };

  return (
    <Field label={tf('ICONO')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habiaVariosCamposIcono && (
          <AvisoVariosCampos
            mensaje={tf('Este botón tenía varios campos de icono a la vez. Se muestra el de mayor precedencia.')}
          />
        )}

        <FichasSelector fichaActiva={fichaActiva} onElegirFicha={elegirFicha} accent={accent} />

        <div style={{ paddingTop: 4 }}>
          {tipoIcono === 'auto' && <PanelAuto action={props.action} fgColor={props.fgColor} />}
          {fichaActiva === 'catalogo' && (
            <PanelCatalogoIcono
              tipoIcono={tipoIcono}
              accent={accent}
              icon={props.icon}
              setIcon={props.setIcon}
              iconoPuntos={props.iconoPuntos}
              setIconoPuntos={props.setIconoPuntos}
              brandIcon={props.brandIcon}
              setBrandIcon={props.setBrandIcon}
              brandIconAlwaysAnimate={props.brandIconAlwaysAnimate}
              setBrandIconAlwaysAnimate={props.setBrandIconAlwaysAnimate}
              brandIconCustomBitmap={props.brandIconCustomBitmap}
              brandIconCustomColor={props.brandIconCustomColor}
              brandIconCustomPalette={props.brandIconCustomPalette}
              setBrandIconCustomBitmap={props.setBrandIconCustomBitmap}
              setBrandIconCustomColor={props.setBrandIconCustomColor}
              glifoEncima={props.glifoEncima}
              setGlifoEncima={props.setGlifoEncima}
              onAbrirCatalogo={() =>
                props.onAbrirCatalogoDot?.(tipoIcono === 'marca' ? CAT_MARCAS : CAT_ACCIONES)
              }
            />
          )}
          {tipoIcono === 'dibujo' && (
            <PanelDibujo
              customGlyph57={props.customGlyph57}
              setCustomGlyph57={props.setCustomGlyph57}
              brandIconCustomBitmap={props.brandIconCustomBitmap}
              brandIconCustomColor={props.brandIconCustomColor}
              brandIconCustomPalette={props.brandIconCustomPalette}
              setBrandIconCustomBitmap={props.setBrandIconCustomBitmap}
              setBrandIconCustomColor={props.setBrandIconCustomColor}
              setShowGlyphEditor={props.setShowGlyphEditor}
              setShowBrandEditor={props.setShowBrandEditor}
              fgColor={props.fgColor}
            />
          )}
          {tipoIcono === 'imagen' && <PanelImagen {...props} />}
        </div>
      </div>
    </Field>
  );
}

function AvisoVariosCampos({ mensaje }: { mensaje: string }) {
  const VD = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        background: 'rgba(235, 160, 0, 0.1)',
        border: `1px solid ${VD.warning}`,
        borderRadius: VD.radius.sm,
        fontFamily: VD.mono,
        fontSize: 9,
        color: VD.warning,
        letterSpacing: 0.5,
      }}
    >
      <DotGlyphIcon glyph="WARN" size={12} color={VD.warning} />
      <span>{mensaje}</span>
    </div>
  );
}

function FichasSelector({
  fichaActiva,
  onElegirFicha,
  accent,
}: {
  fichaActiva: FichaIcono;
  onElegirFicha: (ficha: FichaIcono) => void;
  accent: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 6,
      }}
    >
      {TIPOS_ICONO.map((id) => {
        const activa = fichaActiva === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onElegirFicha(id)}
            style={{
              minHeight: 38,
              padding: '8px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontFamily: VD.mono,
              fontSize: 10,
              fontWeight: activa ? 'bold' : 'normal',
              letterSpacing: 0.8,
              borderRadius: VD.radius.md,
              cursor: 'pointer',
              background: activa ? VD.accentBg : VD.elevated,
              border: `1px solid ${activa ? accent : VD.border}`,
              color: activa ? accent : VD.textDim,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            {etiquetaDeTipo(id, tf)}
          </button>
        );
      })}
    </div>
  );
}

function PanelAuto({ action, fgColor }: { action: ButtonAction; fgColor: string }) {
  const VD = useTheme();
  const tf = useFieldText();
  const actionGlyph = GLIFO_POR_TIPO_ACCION[action.type] ?? 'DOTS';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: VD.elevated,
        borderRadius: VD.radius.md,
        border: `1px solid ${VD.border}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: VD.surface,
          borderRadius: VD.radius.sm,
          border: `1px solid ${VD.border}`,
        }}
      >
        <DotGlyphIcon glyph={actionGlyph} size={22} color={fgColor || VD.text} showRecessed />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, fontWeight: 'bold' }}>
          {actionGlyph}
        </span>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.5 }}>
          {tf('El glifo se toma automáticamente del tipo de acción.')}
        </span>
      </div>
    </div>
  );
}



function PanelDibujo({
  customGlyph57,
  setCustomGlyph57,
  brandIconCustomBitmap,
  brandIconCustomColor,
  brandIconCustomPalette,
  setBrandIconCustomBitmap,
  setBrandIconCustomColor,
  setShowGlyphEditor,
  setShowBrandEditor,
  fgColor,
}: {
  customGlyph57?: number[];
  setCustomGlyph57: React.Dispatch<React.SetStateAction<number[] | undefined>>;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  setShowGlyphEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrandEditor: React.Dispatch<React.SetStateAction<boolean>>;
  fgColor: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();
  const tieneGlifo57 = Boolean(
    customGlyph57 && customGlyph57.length === 7 && customGlyph57.some((r) => r > 0),
  );
  const tiene17x17 = Boolean(brandIconCustomBitmap && brandIconCustomBitmap.length > 0);

  if (tieneGlifo57) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: VD.radius.md,
            border: `1px solid ${VD.border}`,
            background: VD.elevated,
          }}
        >
          <Glyph57Inline rows={customGlyph57!} color={fgColor || VD.text} />
        </div>
        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>{tf('GLIFO 5×7')}</span>
        <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Editar')}</Btn>
        <Btn onClick={() => setCustomGlyph57(undefined)} style={{ color: VD.danger }}>
          {tf('Quitar')}
        </Btn>
      </div>
    );
  }

  if (tiene17x17) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: VD.radius.lg,
            border: `1px solid ${VD.border}`,
            overflow: 'hidden',
            background: VD.elevated,
            position: 'relative',
          }}
        >
          <BrandIconDisplay
            iconKey="blender"
            customBitmap={brandIconCustomBitmap}
            customColor={brandIconCustomColor}
            customPalette={brandIconCustomPalette}
            animated={false}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          />
        </div>
        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>{tf('MAPA 17×17')}</span>
        <Btn onClick={() => setShowBrandEditor(true)}>{tf('Editar puntos')}</Btn>
        <Btn
          onClick={() => {
            setBrandIconCustomBitmap(undefined);
            setBrandIconCustomColor(undefined);
          }}
          style={{ color: VD.danger }}
        >
          {tf('Quitar')}
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Dibujar 5×7')}</Btn>
      <Btn onClick={() => setShowBrandEditor(true)}>{tf('Dibujar 17×17')}</Btn>
    </div>
  );
}

function PanelImagen(props: CampoIconoUnificadoProps) {
  const { imageData, setImageData, pickImage } = props;
  const VD = useTheme();
  const tf = useFieldText();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn onClick={pickImage}>{tf('Elegir imagen')}</Btn>
        {imageData && (
          <>
            <img
              src={imageData}
              alt=""
              style={{
                width: 32,
                height: 32,
                objectFit: 'cover',
                borderRadius: VD.radius.md,
                border: `1px solid ${VD.border}`,
              }}
            />
            <div
              style={{
                position: 'relative',
                width: 32,
                height: 32,
                borderRadius: VD.radius.md,
                overflow: 'hidden',
                border: `1px solid ${VD.border}`,
              }}
            >
              <img
                src={imageData}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  imageRendering: 'pixelated',
                }}
              />
              <DotMatrixImageOverlay pitch={3} />
            </div>
            <Btn onClick={() => setImageData('')} style={{ color: VD.danger }}>
              {tf('Quitar')}
            </Btn>
          </>
        )}
      </div>

      {/* Sin «GLIFO ENCIMA» sobre una imagen sola: el dibujante (ContenidoCentral,
          pintarTecla) solo lo pinta sobre una MARCA, y aquí sería una opción que
          no hace nada. */}
    </div>
  );
}
