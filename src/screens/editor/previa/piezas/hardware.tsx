/**
 * Previsualización del hardware del dock: LCD 64×64 y datos del control (roadmap 121b).
 *
 * Salió tal cual de `previa/VistaPreviaPiezas.tsx`. `useLcdPreview` pinta la
 * tecla real con `pintarTecla` (mismo camino que la rejilla) y se refresca con
 * `alCambiarVisual`; los colores del marco llegan por props (`useTheme()` en el
 * que los usa), nunca importados de `design`.
 */
import { useEffect, useState } from 'react';
import { DotLabel } from '../../../../components/DotLabel';
import { pintarTecla, resolverBotonLcd, COLORES_LCD } from '../../../../utils/superficies/pintarTecla';
import { svgDeBoton, esGlifoDot } from '../../../../components/celda/iconoSvg';
import { useDockPresets } from '../../estado/useDockPresets';
import { alCambiarVisual, leerVisual } from '../../../../utils/plugins/visual';
import type { DatosWidget } from '../../../../comun/widgets';
import type { ButtonConfig, DeckConfig, LcdControl } from '../../../../types';

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

function useLcdPreview(
  esDock: boolean,
  conPantalla: boolean,
  boton: ButtonConfig,
  isEncendido: boolean,
  widgetData: { line1: string; line2?: string; tone?: 'warn' | 'crit' } | undefined,
  contexto?: string | null,
) {
  const [lcdDataUrl, setLcdDataUrl] = useState<string | null>(null);
  const [versionVisual, setVersionVisual] = useState(0);

  useEffect(() => {
    return alCambiarVisual(() => setVersionVisual((v) => v + 1));
  }, []);

  useEffect(() => {
    if (!esDock || !conPantalla) {
      setLcdDataUrl(null);
      return;
    }
    let activo = true;
    const botonLcd = resolverBotonLcd(boton, isEncendido);
    const lcd: LcdControl = { ancho: 64, alto: 64, rotacion: 0 };
    const opciones = { iconoSvg: svgDeBoton, esGlifoDot };
    const visual = contexto ? leerVisual(contexto) : undefined;

    pintarTecla(botonLcd, lcd, COLORES_LCD, opciones, 0, undefined, widgetData, visual)
      .then((img) => {
        if (activo) setLcdDataUrl(img.dataUrl);
      })
      .catch(() => {});

    return () => {
      activo = false;
    };
  }, [esDock, conPantalla, boton, isEncendido, widgetData, contexto, versionVisual]);

  return lcdDataUrl;
}

export function useDockInfoVista(
  boton: ButtonConfig,
  pages: DeckConfig['pages'] | undefined,
  isEncendido: boolean,
  widgetData: DatosWidget,
  contexto?: string | null,
) {
  const dockInfo = useDockPresets(boton, pages ?? []);
  const conPantalla = Boolean(dockInfo.contexto?.conPantalla ?? (dockInfo.controlMeta?.control === 'key'));
  const lcdDataUrl = useLcdPreview(dockInfo.esDock, conPantalla, boton, isEncendido, widgetData, contexto);
  const indice = (dockInfo.controlMeta?.indice ?? 0) + 1;

  return {
    esDock: dockInfo.esDock,
    conPantalla,
    lcdDataUrl,
    indice,
  };
}
