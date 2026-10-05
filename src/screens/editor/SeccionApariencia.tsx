import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { DotMatrixImageOverlay } from '../../components/dot480/DotMatrixImageOverlay';
import { BrandIconDisplay } from '../../components/BrandIconDisplay';
import { Glyph57View as Glyph57Inline } from '../../components/Glyph57Editor';
import { useCatalogoMarcas, type CatalogoMarcas } from '../../utils/catalogoMarcas';
import { Field, Btn, estiloEntrada } from './comunes';
import { BloqueWidgetApariencia } from './BloqueWidgetApariencia';
import type { ButtonAction, ButtonConfig, Sensor, TipoWidget, SliderWidgetConfig } from '../../types';

function etiquetaMarca(catalogo: CatalogoMarcas | null, clave: string): string {
  return catalogo?.BRAND_ICONS_MAP[clave]?.label ?? clave;
}

const GLIFOS_RAPIDOS = [
  'PLAY', 'PAUSE', 'NEXT', 'PREV', 'MIC', 'SPEAKER', 'AUDIO_WAVE',
  'TERMINAL', 'WEB', 'CODE', 'GEAR', 'CHECK', 'CLOSE', 'BELL',
  'TRASH', 'CLOCK', 'FOLDER', 'SPARKLE', 'DOTS', 'ARROW_UP', 'ARROW_DOWN',
  'CPU', 'GPU', 'FAN', 'BOLT', 'RAM', 'STORAGE', 'LOCK', 'HEART',
  'WARN', 'BOOK', 'BUG', 'GRADUATION', 'WEATHER_THERMO', 'WEATHER_SUN',
  'WEATHER_RAIN', 'BATTERY', 'VOLUME_MUTE',
];

interface BloqueMarcaProps {
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap: string[] | undefined;
  brandIconCustomColor: string | undefined;
  brandIconCustomPalette: Record<string, string> | undefined;
  setBrandIconCustomPalette: React.Dispatch<React.SetStateAction<Record<string, string> | undefined>>;
  setBrandIcon: React.Dispatch<React.SetStateAction<string>>;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  setShowBrandPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrandEditor: React.Dispatch<React.SetStateAction<boolean>>;
  accent: string;
}

function BloqueIconoMarca({
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
  accent,
}: BloqueMarcaProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const catalogoMarcas = useCatalogoMarcas();

  return (
    <Field label={tf("ICONO DE MARCA ANIMADO (DOT-MATRIX)")}>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={brandIconAlwaysAnimate}
            onChange={(e) => setBrandIconAlwaysAnimate(e.target.checked)}
            style={{ accentColor: accent }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: VD.textDim }}>
            {tf('ANIMACIÓN SIEMPRE ACTIVA — si está desactivado, anima solo cuando el botón está encendido (toggle ON)')}
          </span>
        </label>
      )}
    </Field>
  );
}

interface BloqueGlifoProps {
  customGlyph57: number[] | undefined;
  fgColor: string;
  setShowGlyphEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setCustomGlyph57: React.Dispatch<React.SetStateAction<number[] | undefined>>;
}

function BloqueGlifo57({
  customGlyph57,
  fgColor,
  setShowGlyphEditor,
  setCustomGlyph57,
}: BloqueGlifoProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const tieneGlifo = customGlyph57 && customGlyph57.length === 7 && customGlyph57.some((r) => r > 0);

  return (
    <Field label={tf("GLIFO PERSONAL 5×7 (DOT-MATRIX)")}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {tieneGlifo ? (
          <>
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
            <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Editar')}</Btn>
            <Btn onClick={() => setCustomGlyph57(undefined)} style={{ color: VD.danger }}>
              {tf('Quitar')}
            </Btn>
          </>
        ) : (
          <Btn onClick={() => setShowGlyphEditor(true)}>{tf('Dibujar glifo')}</Btn>
        )}
      </div>
    </Field>
  );
}

interface SeccionAparienciaProps {
  accent: string;
  action: ButtonAction;
  bgColor: string;
  brandIcon: string;
  brandIconAlwaysAnimate: boolean;
  brandIconCustomBitmap: string[] | undefined;
  brandIconCustomColor: string | undefined;
  brandIconCustomPalette: Record<string, string> | undefined;
  setBrandIconCustomPalette: React.Dispatch<React.SetStateAction<Record<string, string> | undefined>>;
  customGlyph57: number[] | undefined;
  deckState: Record<string, string>;
  fgColor: string;
  icon: string;
  imageData: string;
  label: string;
  pickImage: () => void;
  sensorList: Sensor[];
  sensorWidgetCrit: string;
  sensorWidgetId: string;
  sensorWidgetSuffix: string;
  sensorWidgetWarn: string;
  setBgColor: React.Dispatch<React.SetStateAction<string>>;
  setBrandIcon: React.Dispatch<React.SetStateAction<string>>;
  setBrandIconAlwaysAnimate: React.Dispatch<React.SetStateAction<boolean>>;
  setBrandIconCustomBitmap: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  setBrandIconCustomColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  setCustomGlyph57: React.Dispatch<React.SetStateAction<number[] | undefined>>;
  setFgColor: React.Dispatch<React.SetStateAction<string>>;
  setIcon: React.Dispatch<React.SetStateAction<string>>;
  setImageData: React.Dispatch<React.SetStateAction<string>>;
  setLabel: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetCrit: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetId: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetSuffix: React.Dispatch<React.SetStateAction<string>>;
  setSensorWidgetWarn: React.Dispatch<React.SetStateAction<string>>;
  setShowBrandEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBrandPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setShowGlyphEditor: React.Dispatch<React.SetStateAction<boolean>>;
  setSublabel: React.Dispatch<React.SetStateAction<string>>;
  setVarWidgetName: React.Dispatch<React.SetStateAction<string>>;
  setVarWidgetPrefix: React.Dispatch<React.SetStateAction<string>>;
  setVarWidgetSuffix: React.Dispatch<React.SetStateAction<string>>;
  setWidget: React.Dispatch<React.SetStateAction<TipoWidget | undefined>>;
  sublabel: string;
  varWidgetName: string;
  varWidgetPrefix: string;
  varWidgetSuffix: string;
  widget: TipoWidget | undefined;
  currencyWidget: ButtonConfig['currencyWidget'];
  setCurrencyWidget: React.Dispatch<React.SetStateAction<ButtonConfig['currencyWidget']>>;
  sliderWidget: SliderWidgetConfig | undefined;
  setSliderWidget: React.Dispatch<React.SetStateAction<SliderWidgetConfig | undefined>>;
}

export function SeccionApariencia(p: SeccionAparienciaProps) {
  const {
    accent, action, bgColor, brandIcon, brandIconAlwaysAnimate, brandIconCustomBitmap,
    brandIconCustomColor, brandIconCustomPalette, setBrandIconCustomPalette, customGlyph57,
    deckState, fgColor, icon, imageData, label, pickImage, sensorList, sensorWidgetCrit,
    sensorWidgetId, sensorWidgetSuffix, sensorWidgetWarn, setBgColor, setBrandIcon,
    setBrandIconAlwaysAnimate, setBrandIconCustomBitmap, setBrandIconCustomColor,
    setCustomGlyph57, setFgColor, setIcon, setImageData, setLabel, setSensorWidgetCrit,
    setSensorWidgetId, setSensorWidgetSuffix, setSensorWidgetWarn, setShowBrandEditor,
    setShowBrandPicker, setShowGlyphEditor, setSublabel, setVarWidgetName,
    setVarWidgetPrefix, setVarWidgetSuffix, setWidget, sublabel, varWidgetName,
    varWidgetPrefix, varWidgetSuffix, widget, currencyWidget, setCurrencyWidget,
    sliderWidget, setSliderWidget,
  } = p;

  const VD = useTheme();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Etiqueta y Sub-etiqueta */}
      <Field label={tf("ETIQUETA DEL BOTÓN")}>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={tf("Mi Botón")}
          maxLength={20}
          style={inputStyle}
        />
      </Field>

      <Field label={tf("SUB-ETIQUETA (OPCIONAL)")}>
        <input
          value={sublabel}
          onChange={(e) => setSublabel(e.target.value)}
          placeholder={tf("Descripción corta")}
          maxLength={30}
          style={inputStyle}
        />
      </Field>

      {/* Glifo DOT / Icono */}
      <Field label={tf("GLIFO DOT / ICONO (VACÍO = ICONO DEL TIPO)")}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="PLAY, GEAR, MIC, WEB, CODE..."
            maxLength={16}
            style={{ ...inputStyle, flex: 1, fontFamily: VD.mono, fontSize: 11 }}
          />
          {icon && (
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: VD.elevated,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
              }}
            >
              <DotGlyphIcon glyph={icon} size={16} color={accent} showRecessed />
            </div>
          )}
          {icon && (
            <Btn onClick={() => setIcon('')} style={{ color: VD.danger }}>
              {tf('Quitar')}
            </Btn>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
          {GLIFOS_RAPIDOS.map((g) => {
            const isSel = icon.trim().toUpperCase() === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setIcon(g)}
                title={g}
                style={{
                  width: 26,
                  height: 26,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSel ? VD.accentBg : VD.elevated,
                  border: `1px solid ${isSel ? accent : VD.border}`,
                  borderRadius: VD.radius.sm,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <DotGlyphIcon glyph={g} size={14} color={isSel ? accent : VD.textDim} />
              </button>
            );
          })}
        </div>
      </Field>

      {/* Imagen personalizada */}
      <Field label={tf("IMAGEN PERSONALIZADA (PNG / JPG / GIF)")}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
      </Field>

      {/* Bloque Marca */}
      <BloqueIconoMarca
        brandIcon={brandIcon}
        brandIconAlwaysAnimate={brandIconAlwaysAnimate}
        brandIconCustomBitmap={brandIconCustomBitmap}
        brandIconCustomColor={brandIconCustomColor}
        brandIconCustomPalette={brandIconCustomPalette}
        setBrandIconCustomPalette={setBrandIconCustomPalette}
        setBrandIcon={setBrandIcon}
        setBrandIconAlwaysAnimate={setBrandIconAlwaysAnimate}
        setBrandIconCustomBitmap={setBrandIconCustomBitmap}
        setBrandIconCustomColor={setBrandIconCustomColor}
        setShowBrandPicker={setShowBrandPicker}
        setShowBrandEditor={setShowBrandEditor}
        accent={accent}
      />

      {/* Bloque Glifo 5x7 */}
      <BloqueGlifo57
        customGlyph57={customGlyph57}
        fgColor={fgColor}
        setShowGlyphEditor={setShowGlyphEditor}
        setCustomGlyph57={setCustomGlyph57}
      />

      {/* Colores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={tf("COLOR DE FONDO")}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={bgColor || '#222222'}
              onChange={(e) => setBgColor(e.target.value)}
              style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }}
            />
            <input
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              placeholder={"#222222"}
              style={{ ...inputStyle, flex: 1 }}
            />
            {bgColor && (
              <Btn onClick={() => setBgColor('')}>
                <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
              </Btn>
            )}
          </div>
        </Field>
        <Field label={tf("COLOR DE TEXTO / ICONO")}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={fgColor || '#dcdcdc'}
              onChange={(e) => setFgColor(e.target.value)}
              style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, background: 'none', cursor: 'pointer', padding: 2 }}
            />
            <input
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              placeholder={"#dcdcdc"}
              style={{ ...inputStyle, flex: 1 }}
            />
            {fgColor && (
              <Btn onClick={() => setFgColor('')}>
                <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
              </Btn>
            )}
          </div>
        </Field>
      </div>

      <div style={{ height: 1, background: VD.border }} />

      {/* Bloque Widget */}
      <BloqueWidgetApariencia
        widget={widget}
        setWidget={setWidget}
        actionType={action.type}
        accent={accent}
        currencyWidget={currencyWidget}
        setCurrencyWidget={setCurrencyWidget}
        sliderWidget={sliderWidget}
        setSliderWidget={setSliderWidget}
        deckState={deckState}
        sensorList={sensorList}
        sensorWidgetId={sensorWidgetId}
        setSensorWidgetId={setSensorWidgetId}
        sensorWidgetSuffix={sensorWidgetSuffix}
        setSensorWidgetSuffix={setSensorWidgetSuffix}
        sensorWidgetWarn={sensorWidgetWarn}
        setSensorWidgetWarn={setSensorWidgetWarn}
        sensorWidgetCrit={sensorWidgetCrit}
        setSensorWidgetCrit={setSensorWidgetCrit}
        varWidgetName={varWidgetName}
        setVarWidgetName={setVarWidgetName}
        varWidgetPrefix={varWidgetPrefix}
        setVarWidgetPrefix={setVarWidgetPrefix}
        varWidgetSuffix={varWidgetSuffix}
        setVarWidgetSuffix={setVarWidgetSuffix}
      />
    </div>
  );
}
