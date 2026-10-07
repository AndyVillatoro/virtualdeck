import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { EditorSubdivision2x2 } from './EditorSubdivision2x2';
import { Btn } from './comunes';
import type { SubButtonConfig } from '../../types';

interface SeccionAvanzadoProps {
  parentId: string;
  is2x2Mode: boolean;
  /** Página de un dock físico: el aparato no ejecuta cuadrantes. */
  esDock?: boolean;
  setIs2x2Mode: (v: boolean) => void;
  subButtons: SubButtonConfig[];
  setSubButtons: React.Dispatch<React.SetStateAction<SubButtonConfig[]>>;
  accent: string;
  /** Abre el catálogo grande para el cuadrante `idx` (roadmap 93). */
  onAbrirCatalogoCuadrante?: (idx: number) => void;
}

export function SeccionAvanzado({
  parentId,
  is2x2Mode,
  esDock = false,
  setIs2x2Mode,
  subButtons,
  setSubButtons,
  accent,
  onAbrirCatalogoCuadrante,
}: SeccionAvanzadoProps) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Subdivisión 2×2 */}
      {esDock ? (
        <div>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 }}>
            {tf('El aparato no ejecuta cuadrantes 2×2: este control no los admite.')}
          </div>
          {is2x2Mode && (
            <Btn
              onClick={() => setIs2x2Mode(false)}
              style={{ marginTop: 8, borderColor: VD.danger, color: VD.danger }}
            >
              {tf('QUITAR CUADRANTES')}
            </Btn>
          )}
        </div>
      ) : (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={is2x2Mode}
              onChange={(e) => setIs2x2Mode(e.target.checked)}
              style={{ accentColor: accent }}
            />
            <DotGlyphIcon glyph="FULLSCREEN" size={10} color={is2x2Mode ? accent : VD.textMuted} />
            <span style={{ fontFamily: VD.mono, fontSize: 9, letterSpacing: 1, color: is2x2Mode ? VD.text : VD.textDim, fontWeight: 600 }}>
              {t('ed.mode.split2x2')}
            </span>
          </label>
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginLeft: 22, marginBottom: is2x2Mode ? 12 : 0 }}>
            {t('ed.mode.hint')}
          </div>

          {is2x2Mode && (
            <div style={{ borderTop: `1px solid ${VD.border}`, paddingTop: 12 }}>
              <EditorSubdivision2x2
                parentId={parentId}
                subButtons={subButtons}
                onChange={setSubButtons}
                accent={accent}
                onAbrirCatalogo={onAbrirCatalogoCuadrante}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
