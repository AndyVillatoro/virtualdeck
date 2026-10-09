import React, { useEffect, useMemo, useState } from 'react';
import { DotLabel } from '../../components/DotLabel';
import { interpolate } from '../../comun/interpolar';
import { pintarTecla, resolverBotonLcd, COLORES_LCD } from '../../utils/superficies/pintarTecla';
import { svgDeBoton, esGlifoDot } from '../../components/celda/iconoSvg';
import { useDatosWidget, useClimaWidget, useDivisas } from '../../components/celda/useDatosWidget';
import { useSensors } from '../../utils/sensors';
import { useNowPlaying, useNowPlayingActivation } from '../../utils/nowPlaying';
import { useDockPresets } from './useDockPresets';
import type { DatosWidget } from '../../comun/widgets';
import type {
  ButtonConfig,
  ButtonAction,
  SubButtonConfig,
  DeckConfig,
  LcdControl,
  ElectronAPI,
  TipoWidget,
  SliderWidgetConfig,
} from '../../types';

export interface VistaCampos {
  label: string;
  sublabel: string;
  icon: string;
  imageData: string;
  brandIcon: string;
  brandIconAlwaysAnimate?: boolean;
  brandIconCustomBitmap?: string[];
  brandIconCustomColor?: string;
  brandIconCustomPalette?: Record<string, string>;
  customGlyph57?: number[];
  bgColor: string;
  fgColor: string;
  fijo?: boolean;
  widget?: TipoWidget;
  sliderWidget?: SliderWidgetConfig;
  iconoPuntos?: { bits: string; origen: string };
  animacion?: ButtonConfig['animacion'];
  efectoPulsar?: ButtonConfig['efectoPulsar'];
  aspectoEncendido?: ButtonConfig['aspectoEncendido'];
  varWidget?: ButtonConfig['varWidget'];
  sensorWidget?: ButtonConfig['sensorWidget'];
  currencyWidget?: ButtonConfig['currencyWidget'];
}

function resolverIcono(isEncendido: boolean, campos: VistaCampos) {
  if (isEncendido && campos.aspectoEncendido) {
    const enc = campos.aspectoEncendido;
    if (enc.icon || enc.iconoPuntos) {
      return {
        icon: enc.icon || (enc.iconoPuntos ? '' : campos.icon),
        iconoPuntos: enc.iconoPuntos || (enc.icon ? undefined : campos.iconoPuntos),
      };
    }
  }
  return { icon: campos.icon, iconoPuntos: campos.iconoPuntos };
}

function resolverColores(isEncendido: boolean, campos: VistaCampos) {
  if (isEncendido && campos.aspectoEncendido) {
    const enc = campos.aspectoEncendido;
    return {
      bgColor: enc.bgColor || campos.bgColor || undefined,
      fgColor: enc.fgColor || campos.fgColor || undefined,
    };
  }
  return {
    bgColor: campos.bgColor || undefined,
    fgColor: campos.fgColor || undefined,
  };
}

export function armarBotonParaVista({
  id,
  page,
  action,
  extraActions,
  isToggle,
  campos,
  subButtons,
  is2x2Mode,
  isEncendido,
  deckState,
  botonOriginal,
}: {
  id: string;
  page: number;
  action: ButtonAction;
  extraActions: ButtonAction[];
  isToggle: boolean;
  campos: VistaCampos;
  subButtons?: SubButtonConfig[];
  is2x2Mode?: boolean;
  isEncendido: boolean;
  deckState?: Record<string, string>;
  botonOriginal?: ButtonConfig;
}): ButtonConfig {
  const iconoRes = resolverIcono(isEncendido, campos);
  const coloresRes = resolverColores(isEncendido, campos);

  // En modo 2×2, si los cuadrantes no tienen texto ni icono (recién activado o vacíos),
  // se muestran 'Q1', 'Q2', 'Q3', 'Q4' como placeholder para que la vista previa
  // sea observable y se distingan claramente los 4 cuadrantes.
  const subBtnRes = is2x2Mode && subButtons && subButtons.length === 4
    ? subButtons.map((sb, i) => ({
        ...sb,
        label: sb.label || (sb.icon || sb.dotGlyph ? '' : `Q${i + 1}`),
      }))
    : undefined;

  const varWidget = campos.varWidget ?? botonOriginal?.varWidget;
  const sensorWidget = campos.sensorWidget ?? botonOriginal?.sensorWidget;
  const currencyWidget = campos.currencyWidget ?? botonOriginal?.currencyWidget;

  return {
    id,
    page,
    label: campos.label,
    sublabel: interpolate(campos.sublabel, deckState) || undefined,
    icon: iconoRes.icon,
    iconoPuntos: iconoRes.iconoPuntos,
    imageData: campos.imageData || undefined,
    brandIcon: campos.brandIcon || undefined,
    brandIconAlwaysAnimate: campos.brandIconAlwaysAnimate,
    brandIconCustomBitmap: campos.brandIconCustomBitmap,
    brandIconCustomColor: campos.brandIconCustomColor,
    brandIconCustomPalette: campos.brandIconCustomPalette,
    customGlyph57: campos.customGlyph57,
    bgColor: coloresRes.bgColor,
    fgColor: coloresRes.fgColor,
    action,
    actions: extraActions.length > 0 ? [action, ...extraActions] : undefined,
    isToggle,
    fijo: campos.fijo || undefined,
    widget: campos.widget,
    sliderWidget: campos.sliderWidget,
    subButtons: subBtnRes,
    animacion: campos.animacion,
    efectoPulsar: campos.efectoPulsar,
    aspectoEncendido: campos.aspectoEncendido,
    varWidget,
    sensorWidget,
    currencyWidget,
  };
}

export function AlternadorToggle({
  isEncendido,
  onTogglePreview,
  accent,
  vdElevated,
  vdBorder,
  vdRadiusSm,
  vdTextDim,
  vdMono,
  labelApagado,
  labelEncendido,
  labelModo,
}: {
  isEncendido: boolean;
  onTogglePreview?: () => void;
  accent: string;
  vdElevated: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdTextDim: string;
  vdMono: string;
  labelApagado: string;
  labelEncendido: string;
  labelModo: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontFamily: vdMono, fontSize: 9, color: accent, textAlign: 'center' }}>
        {labelModo}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={() => {
            if (isEncendido && onTogglePreview) onTogglePreview();
          }}
          style={{
            height: 24,
            padding: '0 8px',
            background: !isEncendido ? `${accent}24` : vdElevated,
            border: `1px solid ${!isEncendido ? accent : vdBorder}`,
            borderRadius: vdRadiusSm,
            color: !isEncendido ? accent : vdTextDim,
            fontFamily: vdMono,
            fontSize: 8.5,
            fontWeight: !isEncendido ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {labelApagado}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isEncendido && onTogglePreview) onTogglePreview();
          }}
          style={{
            height: 24,
            padding: '0 8px',
            background: isEncendido ? `${accent}24` : vdElevated,
            border: `1px solid ${isEncendido ? accent : vdBorder}`,
            borderRadius: vdRadiusSm,
            color: isEncendido ? accent : vdTextDim,
            fontFamily: vdMono,
            fontSize: 8.5,
            fontWeight: isEncendido ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {labelEncendido}
        </button>
      </div>
    </div>
  );
}

export function AlternadorCuadrantes2x2({
  subButtons,
  subToggled,
  onToggleCuadrante,
  accent,
  vdElevated,
  vdBorder,
  vdRadiusSm,
  vdTextDim,
  vdMono,
  labelModo,
}: {
  subButtons: SubButtonConfig[];
  subToggled: boolean[];
  onToggleCuadrante: (idx: number) => void;
  accent: string;
  vdElevated: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdTextDim: string;
  vdMono: string;
  labelModo: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontFamily: vdMono, fontSize: 8.5, color: accent, textAlign: 'center' }}>
        {labelModo}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {subButtons.map((sb, idx) => {
          const enc = Boolean(subToggled[idx]);
          const nombre = sb.label || `Q${idx + 1}`;
          return (
            <button
              key={sb.id || idx}
              type="button"
              onClick={() => onToggleCuadrante(idx)}
              title={nombre}
              style={{
                height: 22,
                padding: '0 6px',
                background: enc ? `${accent}24` : vdElevated,
                border: `1px solid ${enc ? accent : vdBorder}`,
                borderRadius: vdRadiusSm,
                color: enc ? accent : vdTextDim,
                fontFamily: vdMono,
                fontSize: 8,
                fontWeight: enc ? 600 : 400,
                cursor: 'pointer',
                maxWidth: 40,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {`Q${idx + 1}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VistaHardwareLcd({
  dataUrl,
  titulo,
  vdBorder,
  vdRadiusSm,
  vdMono,
  vdTextDim,
}: {
  dataUrl: string | null;
  titulo: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdMono: string;
  vdTextDim: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
      <DotLabel size={8} color={vdTextDim} spacing={1}>
        {titulo}
      </DotLabel>
      <div
        style={{
          width: 68,
          height: 68,
          background: '#070809',
          border: `1.5px solid ${vdBorder}`,
          borderRadius: vdRadiusSm,
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.8)',
        }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="LCD 64x64"
            style={{
              width: 64,
              height: 64,
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        ) : (
          <span style={{ fontFamily: vdMono, fontSize: 8, color: vdTextDim }}>···</span>
        )}
      </div>
    </div>
  );
}

export function SeccionHardwareDock({
  esDock,
  conPantalla,
  lcdDataUrl,
  titulo,
  vdBorder,
  vdRadiusSm,
  vdMono,
  vdTextDim,
  avisoSinPantalla,
}: {
  esDock: boolean;
  conPantalla: boolean;
  lcdDataUrl: string | null;
  titulo: string;
  vdBorder: string;
  vdRadiusSm: number | string;
  vdMono: string;
  vdTextDim: string;
  avisoSinPantalla: string;
}) {
  if (!esDock) return null;
  if (conPantalla) {
    return (
      <VistaHardwareLcd
        dataUrl={lcdDataUrl}
        titulo={titulo}
        vdBorder={vdBorder}
        vdRadiusSm={vdRadiusSm}
        vdMono={vdMono}
        vdTextDim={vdTextDim}
      />
    );
  }
  return (
    <div style={{ fontFamily: vdMono, fontSize: 8.5, color: vdTextDim, textAlign: 'center', lineHeight: 1.4, maxWidth: 160 }}>
      {avisoSinPantalla}
    </div>
  );
}

export function useConfigVivo(api: ElectronAPI | undefined) {
  const [deckConfig, setDeckConfig] = useState<DeckConfig | null>(null);

  useEffect(() => {
    let montado = true;
    if (api?.config?.load) {
      api.config.load().then((c) => {
        if (montado && c) setDeckConfig(c as DeckConfig);
      }).catch(() => {});
    }
    if (api?.bar?.onConfigChanged) {
      const desuscribir = api.bar.onConfigChanged((data) => {
        if (montado && data) {
          api.config.load().then((c) => {
            if (montado && c) setDeckConfig(c as DeckConfig);
          }).catch(() => {});
        }
      });
      return () => {
        montado = false;
        desuscribir();
      };
    }
    return () => {
      montado = false;
    };
  }, [api]);

  return deckConfig;
}

function useLcdPreview(
  esDock: boolean,
  conPantalla: boolean,
  boton: ButtonConfig,
  isEncendido: boolean,
  widgetData: { line1: string; line2?: string; tone?: 'warn' | 'crit' } | undefined,
) {
  const [lcdDataUrl, setLcdDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!esDock || !conPantalla) {
      setLcdDataUrl(null);
      return;
    }
    let activo = true;
    const botonLcd = resolverBotonLcd(boton, isEncendido);
    const lcd: LcdControl = { ancho: 64, alto: 64, rotacion: 0 };
    const opciones = { iconoSvg: svgDeBoton, esGlifoDot };

    pintarTecla(botonLcd, lcd, COLORES_LCD, opciones, 0, undefined, widgetData)
      .then((img) => {
        if (activo) setLcdDataUrl(img.dataUrl);
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, [esDock, conPantalla, boton, isEncendido, widgetData]);

  return lcdDataUrl;
}

function conmutarCuadrante(
  targetId: string | undefined,
  subButtons: SubButtonConfig[] | undefined,
  setSubToggled: React.Dispatch<React.SetStateAction<boolean[]>>,
) {
  if (!targetId || !subButtons) return;
  const idx = subButtons.findIndex((sb) => sb.id === targetId);
  if (idx >= 0) {
    setSubToggled((prev) => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  }
}

export function ejecutarClickPreview(
  esModo2x2: boolean,
  targetId: string | undefined,
  subButtons: SubButtonConfig[] | undefined,
  setSubToggled: React.Dispatch<React.SetStateAction<boolean[]>>,
  isToggle: boolean,
  onTogglePreview?: () => void,
) {
  if (esModo2x2) {
    conmutarCuadrante(targetId, subButtons, setSubToggled);
  } else if (isToggle && onTogglePreview) {
    onTogglePreview();
  }
}

export function useLiveWidgetData(
  boton: ButtonConfig,
  deckState: Record<string, string>,
  api?: ElectronAPI,
) {
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tieneClima = boton.widget === 'weather';
  const clima = useClimaWidget(tieneClima, api);

  const nowPlaying = useNowPlaying();
  const setNowPlayingActive = useNowPlayingActivation('editor-preview');
  const tieneNowPlaying = boton.widget === 'now-playing';
  useEffect(() => {
    setNowPlayingActive(tieneNowPlaying);
  }, [tieneNowPlaying, setNowPlayingActive]);

  const { sensors: sensorList } = useSensors();
  const arrayBoton = useMemo(() => [boton], [boton]);
  const divisas = useDivisas(arrayBoton, api);

  const widgetDataMap = useDatosWidget({
    botones: arrayBoton,
    estado: deckState,
    reloj: clock,
    clima,
    sonando: nowPlaying,
    sensores: sensorList,
    divisas,
  });

  return widgetDataMap[boton.id];
}

export function useDockInfoVista(
  boton: ButtonConfig,
  pages: DeckConfig['pages'] | undefined,
  isEncendido: boolean,
  widgetData: DatosWidget,
) {
  const dockInfo = useDockPresets(boton, pages ?? []);
  const conPantalla = Boolean(dockInfo.contexto?.conPantalla ?? (dockInfo.controlMeta?.control === 'key'));
  const lcdDataUrl = useLcdPreview(dockInfo.esDock, conPantalla, boton, isEncendido, widgetData);
  const indice = (dockInfo.controlMeta?.indice ?? 0) + 1;

  return {
    esDock: dockInfo.esDock,
    conPantalla,
    lcdDataUrl,
    indice,
  };
}

export function InfoAccionesExtra({
  count,
  vdMono,
  vdTextMuted,
  label,
}: {
  count: number;
  vdMono: string;
  vdTextMuted: string;
  label: string;
}) {
  if (count <= 0) return null;
  return (
    <div style={{ fontFamily: vdMono, fontSize: 9, color: vdTextMuted, textAlign: 'center' }}>
      + {count} {label}
    </div>
  );
}

