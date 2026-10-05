import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { LienzoPuntos } from './LienzoPuntos';
import { VistaPreviaPuntos } from './VistaPreviaPuntos';
import { PanelColorPuntos } from './PanelColorPuntos';
import { HerramientasMoverPuntos } from './HerramientasMoverPuntos';
import { useEditorPuntos, type ManejadorPestanaPuntos } from './useEditorPuntos';
import {
  ALTO_MARCA,
  ANCHO_MARCA,
  coloresUsados,
  contarPuntos,
  desplazarMatriz,
  estaVacia,
  invertirMatriz,
  mapaBitsAMatriz,
  matrizAMapaBits,
  matrizVacia,
  mismoHex,
  unificarColor,
  voltearHMatriz,
  voltearVMatriz,
} from './matricesPuntos';

interface MarcaCustom {
  bitmap?: string[];
  color?: string;
  palette?: Record<string, string>;
}

interface MarcaBase {
  bitmap: string[];
  color: string;
  palette?: Record<string, string>;
}

interface PestanaMarcaProps {
  accent: string;
  etiqueta: string;
  activa: boolean;
  custom?: MarcaCustom;
  base?: MarcaBase;
  alGuardar: (bitmap: string[], color: string, palette: Record<string, string>) => void;
}

type ModoMarca = 'mono' | 'paleta';

/** Matriz con la que nace el lienzo: lo guardado, la base del catálogo o vacío. */
function matrizDeArranque(custom: MarcaCustom | undefined, base: MarcaBase | undefined, respaldo: string) {
  if (custom?.bitmap) {
    return mapaBitsAMatriz(custom.bitmap, custom.color ?? base?.color ?? respaldo, {
      ...(base?.palette ?? {}),
      ...(custom.palette ?? {}),
    });
  }
  if (base) return mapaBitsAMatriz(base.bitmap, base.color, base.palette ?? {});
  return matrizVacia(ANCHO_MARCA, ALTO_MARCA);
}

/**
 * EditorPuntos — pestaña 17×17 (lo que era `BrandIconEditor`).
 *
 * Guarda en `brandIconCustomBitmap` / `...Color` / `...Palette`. El catálogo
 * llega diferido: si al abrir aún no está, el lienzo nace vacío y adopta el
 * icono base al llegar, sin pisar lo dibujado ni lo ya guardado en el botón.
 */
export const PestanaMarca = forwardRef<ManejadorPestanaPuntos, PestanaMarcaProps>(function PestanaMarca(
  { accent, etiqueta, activa, custom, base, alGuardar },
  ref,
) {
  const VD = useTheme();
  const t = useT();
  const colorInicial = custom?.color ?? base?.color ?? VD.text;
  const [primario, setPrimario] = useState(colorInicial);
  const [activo, setActivo] = useState(colorInicial);
  const [borrando, setBorrando] = useState(false);
  const [modo, setModo] = useState<ModoMarca>('paleta');

  const matrizInicial = matrizDeArranque(custom, base, VD.text);
  const ed = useEditorPuntos(matrizInicial);

  const adoptadoPara = useRef<string | null>(null);
  const claveBase = base ? etiqueta : null;
  useEffect(() => {
    if (!base || !claveBase || adoptadoPara.current === claveBase) return;
    adoptadoPara.current = claveBase;
    if (!custom?.bitmap) {
      ed.reemplazarTodo(mapaBitsAMatriz(base.bitmap, base.color, base.palette ?? {}));
    }
    if (!custom?.color) {
      setPrimario(base.color);
      setActivo(base.color);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, claveBase, custom?.bitmap, custom?.color]);

  useImperativeHandle(
    ref,
    () => ({
      guardar: () => {
        const { bitmap, paleta } = matrizAMapaBits(ed.matriz, primario, base?.palette ?? {});
        alGuardar(bitmap, primario, paleta);
      },
      deshacer: () => ed.deshacer(),
    }),
    [alGuardar, base, ed, primario],
  );

  useEffect(() => {
    if (!activa) return;
    function alTeclar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        ed.deshacer();
      }
    }
    document.addEventListener('keydown', alTeclar);
    return () => document.removeEventListener('keydown', alTeclar);
  }, [activa, ed]);

  function cambiarModo(nuevo: ModoMarca) {
    if (nuevo === modo) return;
    setModo(nuevo);
    if (nuevo === 'mono') ed.transformar((m) => unificarColor(m, primario));
  }

  function restaurar() {
    if (!base) {
      ed.reemplazarTodo(matrizVacia(ANCHO_MARCA, ALTO_MARCA));
      return;
    }
    setPrimario(base.color);
    setActivo(base.color);
    ed.reemplazarTodo(mapaBitsAMatriz(base.bitmap, base.color, base.palette ?? {}));
  }

  const colorDibujo = modo === 'mono' ? primario : activo;
  const puntos = contarPuntos(ed.matriz);
  const usados = coloresUsados(ed.matriz);
  const btn: React.CSSProperties = {
    padding: '5px 10px',
    border: `1px solid ${VD.border}`,
    background: 'transparent',
    color: VD.textDim,
    fontFamily: VD.mono,
    fontSize: 9,
    letterSpacing: 1,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
  };
  const btnActivo: React.CSSProperties = {
    ...btn,
    border: `1px solid ${accent}`,
    background: VD.accentBg,
    color: accent,
  };

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      <div
        style={{
          padding: 16,
          flex: '0 0 auto',
          borderRight: `1px solid ${VD.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 1, color: VD.textMuted }}>
          {t('puntos.ayudaTrazo')}
        </span>
        <LienzoPuntos
          matriz={ed.matriz}
          colorDibujo={colorDibujo}
          borrando={borrando}
          tamCelda={20}
          alIniciarTrazo={ed.iniciarTrazo}
          alPintar={ed.fijarMatriz}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => cambiarModo('mono')} style={modo === 'mono' ? btnActivo : btn}>
            {t('puntos.mono')}
          </button>
          <button
            type="button"
            onClick={() => cambiarModo('paleta')}
            style={modo === 'paleta' ? btnActivo : btn}
          >
            {t('puntos.paleta')}
          </button>
          <button type="button" onClick={restaurar} style={btn}>
            {t('puntos.restaurar')}
          </button>
          {ed.puedeDeshacer && (
            <button type="button" onClick={ed.deshacer} style={btn}>
              {t('puntos.deshacer')}
            </button>
          )}
        </div>
        <HerramientasMoverPuntos
          alDesplazar={(dx, dy) => ed.transformar((m) => desplazarMatriz(m, dx, dy))}
          alInvertir={() => ed.transformar((m) => invertirMatriz(m, colorDibujo))}
          alEspejoH={() => ed.transformar(voltearHMatriz)}
          alEspejoV={() => ed.transformar(voltearVMatriz)}
        />
      </div>

      <div
        style={{
          flex: 1,
          padding: 16,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          overflowY: 'auto',
        }}
      >
        <div>
          <span
            style={{
              display: 'block',
              marginBottom: 8,
              fontFamily: VD.mono,
              fontSize: 8,
              letterSpacing: 2,
              color: VD.textMuted,
            }}
          >
            {t('puntos.vistaPrevia')} · {etiqueta.toUpperCase()} · {t('puntos.puntos', { n: String(puntos) })}
          </span>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: VD.radius.lg,
              background: '#070809',
              border: `1px solid ${VD.borderStrong}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VistaPreviaPuntos matriz={ed.matriz} tamPunto={3} hueco={0} />
          </div>
        </div>
        <PanelColorPuntos
          activo={activo}
          alCambiarActivo={setActivo}
          primario={primario}
          alFijarPrimario={() => setPrimario(activo)}
          esPrimario={mismoHex(activo, primario)}
          colorOriginal={base?.color}
          paletaBase={base?.palette ?? {}}
          usados={usados}
          borrando={borrando}
          alCambiarBorrando={setBorrando}
          alLimpiar={() => ed.reemplazarTodo(matrizVacia(ANCHO_MARCA, ALTO_MARCA))}
        />
        {estaVacia(ed.matriz) && (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{t('puntos.vacio')}</div>
        )}
      </div>
    </div>
  );
});
