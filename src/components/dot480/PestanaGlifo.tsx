import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { LienzoPuntos } from './LienzoPuntos';
import { VistaPreviaPuntos } from './VistaPreviaPuntos';
import { useEditorPuntos, type ManejadorPestanaPuntos } from './useEditorPuntos';
import {
  ALTO_GLIFO,
  ANCHO_GLIFO,
  contarPuntos,
  desplazarMatriz,
  filas57AMatriz,
  invertirMatriz,
  matrizAFilas57,
  matrizLlena,
  matrizVacia,
  voltearHMatriz,
  voltearVMatriz,
} from './matricesPuntos';
import { SIMBOLOS_5X7, filasDesdeFuente57, letrasDeFuente57 } from './preajustesPuntos';

interface PestanaGlifoProps {
  accent: string;
  inicial?: number[];
  activa: boolean;
  alGuardar: (rows: number[]) => void;
}

type Tema = ReturnType<typeof useTheme>;

function estiloHerramienta(VD: Tema): React.CSSProperties {
  return {
    padding: '4px 7px',
    background: 'transparent',
    border: `1px solid ${VD.border}`,
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textDim,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
    letterSpacing: 0.5,
  };
}

/**
 * EditorPuntos — pestaña 5×7 monocromo (lo que era `Glyph57Editor`).
 * Guarda en `ButtonConfig.customGlyph57`; el vaciado a «sin glifo» lo decide
 * quien la monta (filas a cero → `undefined`).
 */
export const PestanaGlifo = forwardRef<ManejadorPestanaPuntos, PestanaGlifoProps>(function PestanaGlifo(
  { accent, inicial, activa, alGuardar },
  ref,
) {
  const VD = useTheme();
  const t = useT();
  const ed = useEditorPuntos(filas57AMatriz(inicial ?? [], accent));
  const [solapa, setSolapa] = useState<'simbolos' | 'fuente'>('simbolos');

  useImperativeHandle(
    ref,
    () => ({
      guardar: () => alGuardar(matrizAFilas57(ed.matriz)),
      deshacer: () => ed.deshacer(),
    }),
    [alGuardar, ed],
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

  function cargarFilas(filas: number[]) {
    ed.reemplazarTodo(filas57AMatriz(filas, accent));
  }

  const puntos = contarPuntos(ed.matriz);
  const pad: React.CSSProperties = {
    width: 20,
    height: 20,
    background: VD.elevated,
    border: `1px solid ${VD.border}`,
    fontFamily: VD.mono,
    fontSize: 8,
    color: VD.textDim,
    cursor: 'pointer',
    borderRadius: VD.radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
        <LienzoPuntos
          matriz={ed.matriz}
          colorDibujo={accent}
          borrando={false}
          alIniciarTrazo={ed.iniciarTrazo}
          alPintar={ed.fijarMatriz}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 1, color: VD.textMuted }}>
            {t('puntos.vistaPrevia')}
          </span>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: VD.radius.md,
              background: '#070809',
              border: `1px solid ${accent}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)',
            }}
          >
            <VistaPreviaPuntos matriz={ed.matriz} tamPunto={5} hueco={1} />
          </div>
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
            {t('puntos.puntos', { n: String(puntos) })}
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 20px)', gap: 2, marginTop: 4 }}>
            <div />
            <button type="button" onClick={() => ed.transformar((m) => desplazarMatriz(m, 0, -1))} style={pad}>
              ▲
            </button>
            <div />
            <button type="button" onClick={() => ed.transformar((m) => desplazarMatriz(m, -1, 0))} style={pad}>
              ◀
            </button>
            <div />
            <button type="button" onClick={() => ed.transformar((m) => desplazarMatriz(m, 1, 0))} style={pad}>
              ▶
            </button>
            <div />
            <button type="button" onClick={() => ed.transformar((m) => desplazarMatriz(m, 0, 1))} style={pad}>
              ▼
            </button>
            <div />
          </div>
          {ed.puedeDeshacer && (
            <button type="button" onClick={ed.deshacer} style={estiloHerramienta(VD)}>
              {t('puntos.deshacer')}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => ed.transformar((m) => invertirMatriz(m, accent))}
          style={estiloHerramienta(VD)}
        >
          {t('puntos.invertir')}
        </button>
        <button type="button" onClick={() => ed.transformar(voltearHMatriz)} style={estiloHerramienta(VD)}>
          {t('puntos.espejoH')}
        </button>
        <button type="button" onClick={() => ed.transformar(voltearVMatriz)} style={estiloHerramienta(VD)}>
          {t('puntos.espejoV')}
        </button>
        <button
          type="button"
          onClick={() => ed.transformar(() => matrizVacia(ANCHO_GLIFO, ALTO_GLIFO))}
          style={estiloHerramienta(VD)}
        >
          {t('ui.clear')}
        </button>
        <button
          type="button"
          onClick={() => ed.transformar(() => matrizLlena(ANCHO_GLIFO, ALTO_GLIFO, accent))}
          style={estiloHerramienta(VD)}
        >
          {t('ui.fill')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${VD.border}`, paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => setSolapa('simbolos')}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: VD.mono,
            fontSize: 9,
            cursor: 'pointer',
            color: solapa === 'simbolos' ? accent : VD.textMuted,
            fontWeight: solapa === 'simbolos' ? 'bold' : 'normal',
          }}
        >
          {t('puntos.simbolos')}
        </button>
        <button
          type="button"
          onClick={() => setSolapa('fuente')}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: VD.mono,
            fontSize: 9,
            cursor: 'pointer',
            color: solapa === 'fuente' ? accent : VD.textMuted,
            fontWeight: solapa === 'fuente' ? 'bold' : 'normal',
          }}
        >
          {t('puntos.fuente')}
        </button>
      </div>

      <div style={{ maxHeight: 72, overflowY: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {solapa === 'simbolos'
          ? Object.entries(SIMBOLOS_5X7).map(([nombre, filas]) => (
              <button
                key={nombre}
                type="button"
                onClick={() => cargarFilas(filas)}
                title={nombre}
                style={{
                  padding: '3px 6px',
                  background: VD.elevated,
                  border: `1px solid ${VD.border}`,
                  fontFamily: VD.mono,
                  fontSize: 8,
                  color: VD.textDim,
                  cursor: 'pointer',
                  borderRadius: VD.radius.sm,
                }}
              >
                {nombre}
              </button>
            ))
          : letrasDeFuente57().map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => {
                  const filas = filasDesdeFuente57(ch);
                  if (filas) cargarFilas(filas);
                }}
                title={t('puntos.cargarLetra', { ch })}
                style={{
                  width: 20,
                  height: 20,
                  background: VD.elevated,
                  border: `1px solid ${VD.border}`,
                  fontFamily: VD.mono,
                  fontSize: 9,
                  color: VD.textDim,
                  cursor: 'pointer',
                  borderRadius: VD.radius.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ch}
              </button>
            ))}
      </div>

      {puntos === 0 && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, textAlign: 'center' }}>
          {t('puntos.vacio')}
        </div>
      )}
    </div>
  );
});
