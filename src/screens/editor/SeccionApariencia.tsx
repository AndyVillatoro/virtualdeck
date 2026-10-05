import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { Field, Btn, estiloEntrada } from './comunes';
import { BloqueWidgetApariencia } from './BloqueWidgetApariencia';
import { CampoIconoUnificado } from './CampoIconoUnificado';
import type { TipoIcono } from './tiposIcono';
import type { NombreCatalogo } from '../../data/iconosDot/tipos';
import type { ButtonAction, ButtonConfig, Sensor, TipoWidget, SliderWidgetConfig } from '../../types';

export interface SeccionAparienciaProps {
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
  tipoIcono: TipoIcono;
  setTipoIcono: (t: TipoIcono) => void;
  habiaVariosCamposIcono?: boolean;
  glifoEncima: string;
  setGlifoEncima: (g: string) => void;
  iconoPuntos?: { bits: string; origen: string };
  setIconoPuntos?: React.Dispatch<React.SetStateAction<{ bits: string; origen: string } | undefined>>;
  onAbrirCatalogoDot?: (catalogo: NombreCatalogo) => void;
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
    sliderWidget, setSliderWidget, tipoIcono, setTipoIcono, habiaVariosCamposIcono,
    glifoEncima, setGlifoEncima, iconoPuntos, setIconoPuntos, onAbrirCatalogoDot,
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

      {/* Un solo campo ICONO con selector de tipo excluyente */}
      <CampoIconoUnificado
        accent={accent}
        action={action}
        tipoIcono={tipoIcono}
        setTipoIcono={setTipoIcono}
        habiaVariosCamposIcono={habiaVariosCamposIcono}
        glifoEncima={glifoEncima}
        setGlifoEncima={setGlifoEncima}
        icon={icon}
        setIcon={setIcon}
        imageData={imageData}
        setImageData={setImageData}
        pickImage={pickImage}
        brandIcon={brandIcon}
        setBrandIcon={setBrandIcon}
        brandIconAlwaysAnimate={brandIconAlwaysAnimate}
        setBrandIconAlwaysAnimate={setBrandIconAlwaysAnimate}
        brandIconCustomBitmap={brandIconCustomBitmap}
        setBrandIconCustomBitmap={setBrandIconCustomBitmap}
        brandIconCustomColor={brandIconCustomColor}
        setBrandIconCustomColor={setBrandIconCustomColor}
        brandIconCustomPalette={brandIconCustomPalette}
        setBrandIconCustomPalette={setBrandIconCustomPalette}
        customGlyph57={customGlyph57}
        setCustomGlyph57={setCustomGlyph57}
        setShowBrandPicker={setShowBrandPicker}
        setShowBrandEditor={setShowBrandEditor}
        setShowGlyphEditor={setShowGlyphEditor}
        fgColor={fgColor}
        iconoPuntos={iconoPuntos}
        setIconoPuntos={setIconoPuntos}
        onAbrirCatalogoDot={onAbrirCatalogoDot}
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
