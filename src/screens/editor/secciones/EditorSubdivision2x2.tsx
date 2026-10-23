/**
 * Editor compacto de los cuatro sub-botones de una carpeta.
 *
 * Se extrajo de `screens/EditorB.tsx`, que hasta entonces tenía aquí todo el
 * formulario de los cuadrantes y acababa con el comentario que ahora está aquí.
 * Se separó en dos: este es el **editor**, y `components/celda/Subdivision2x2.tsx`
 * es la celda que los pinta en la rejilla.
 *
 * Los cuatro sub-botones siempre son cuatro: si un botón tiene `subButtons` con
 * otra longitud no se considera subdividido (ver `editor/datos/botonConfigurado.ts`),
 * y al abrir el editor se rellenan los huecos con sub-botones vacíos para que no
 * haya que comprobar el tamaño en cada sitio.
 */
import React, { useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText } from '../../../utils/i18n';
import { DotLabel } from '../../../components/DotLabel';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../../components/dot480/IconoPuntos';
import { ACTION_TYPES } from '../datos/actionData';
import { QuadActionInputs, inputEstilo } from '../campos/QuadActionInputs';
import { QuadColorPicker, QuadGlyphPicker } from './subdivision2x2/pickers';
import { SUBDIVISION_PRESETS } from './subdivision2x2/presets';
import type { ActionType, SubButtonConfig } from '../../../types';

// Export público que se mantiene en la misma ruta (quien lo importa no cambia).
export { SUBDIVISION_PRESETS };

interface EditorSubdivision2x2Props {
  parentId: string;
  subButtons: SubButtonConfig[];
  onChange: (subs: SubButtonConfig[]) => void;
  accent: string;
  /** Abre el catálogo grande para el cuadrante `idx` (roadmap 93). */
  onAbrirCatalogo?: (idx: number) => void;
}

const BG_SWATCHES = ['#111315', '#1a1424', '#0d1b2a', '#1a3320', '#2a0000', '#242014', '#1f150a', '#141414'];
const FG_SWATCHES = ['#e6e8eb', '#38bdf8', '#4ade80', '#fbbf24', '#f43f5e', '#a78bfa', '#ff9a00', '#ffffff'];

const QUAD_KEYS = [
  { idx: 0, code: 'TL', labelKey: 'ed.quadrant.tl' },
  { idx: 1, code: 'TR', labelKey: 'ed.quadrant.tr' },
  { idx: 2, code: 'BL', labelKey: 'ed.quadrant.bl' },
  { idx: 3, code: 'BR', labelKey: 'ed.quadrant.br' },
];

export function EditorSubdivision2x2({
  parentId,
  subButtons,
  onChange,
  accent,
  onAbrirCatalogo,
}: EditorSubdivision2x2Props) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  // Asegurar siempre 4 cuadrantes
  const normalized: SubButtonConfig[] = Array.from({ length: 4 }, (_, i) => {
    return subButtons[i] || {
      id: `${parentId}-q${i}`,
      label: '',
      action: { type: 'none' },
    };
  });

  const activeSub = normalized[selectedIdx];

  const updateActiveSub = (patch: Partial<SubButtonConfig>) => {
    const next = [...normalized];
    next[selectedIdx] = { ...activeSub, ...patch };
    onChange(next);
  };

  const applyPreset = (preset: typeof SUBDIVISION_PRESETS[0]) => {
    const next: SubButtonConfig[] = preset.buttons.map((b) => ({
      id: `${parentId}-${b.idSuffix}`,
      label: b.label,
      dotGlyph: b.dotGlyph,
      action: { ...b.action },
      isToggle: b.isToggle,
    }));
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de Presets 2×2 */}
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.presets')}</DotLabel>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {SUBDIVISION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 10,
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = accent;
                e.currentTarget.style.background = VD.elevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = VD.border;
                e.currentTarget.style.background = VD.surface;
              }}
            >
              <DotGlyphIcon glyph={p.glyph} size={10} color={accent} />
              <span>{t(p.nameKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selector interactivo de cuadrantes (TL, TR, BL, BR) */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ width: 140, flexShrink: 0 }}>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.quadrant.selected')}</DotLabel>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 4,
              width: 130,
              height: 130,
              marginTop: 8,
              padding: 4,
              background: VD.bg,
              borderRadius: VD.radius.md,
              border: `1px solid ${VD.borderStrong}`,
            }}
          >
            {QUAD_KEYS.map((q) => {
              const isSel = selectedIdx === q.idx;
              const sub = normalized[q.idx];
              const glyph = (sub.dotGlyph || sub.icon || '').toUpperCase();
              const bg = sub.bgColor || (isSel ? `${accent}25` : VD.surface);
              const fg = sub.fgColor || (isSel ? accent : VD.text);

              return (
                <div
                  key={q.idx}
                  onClick={() => setSelectedIdx(q.idx)}
                  style={{
                    background: bg,
                    border: isSel ? `1.5px solid ${accent}` : `1px solid ${VD.border}`,
                    borderRadius: VD.radius.sm,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 0.12s ease',
                  }}
                >
                  <span style={{ position: 'absolute', top: 3, left: 4, fontFamily: VD.mono, fontSize: 7, color: isSel ? accent : VD.textMuted }}>
                    {q.code}
                  </span>
                  {sub.iconoPuntos?.bits ? (
                    <IconoPuntos bits={sub.iconoPuntos.bits} size={12} color={fg} />
                  ) : glyph ? (
                    <DotGlyphIcon glyph={glyph} size={12} color={fg} />
                  ) : (
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: fg, opacity: 0.4 }} />
                  )}
                  <span style={{ fontFamily: VD.mono, fontSize: 8, color: fg, fontWeight: 600, maxWidth: 55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sub.label || `Q${q.idx + 1}`}
                  </span>
                  {sub.sublabel && (
                    <span style={{ fontFamily: VD.mono, fontSize: 6, color: VD.textDim, maxWidth: 55, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.sublabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de configuración del cuadrante seleccionado */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Cabecera del cuadrante activo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${VD.border}`, paddingBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
            <span style={{ fontFamily: VD.mono, fontSize: 11, fontWeight: 600, color: VD.text, letterSpacing: '1px' }}>
              {t(QUAD_KEYS[selectedIdx].labelKey)}
            </span>
          </div>

          {/* Fila: Acción del cuadrante */}
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.action')}</DotLabel>
            <select
              value={activeSub.action.type}
              onChange={(e) => updateActiveSub({ action: { ...activeSub.action, type: e.target.value as ActionType } })}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '6px 10px',
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                color: VD.text,
                fontFamily: VD.mono,
                fontSize: 11,
                borderRadius: VD.radius.sm,
                outline: 'none',
              }}
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.type} value={a.type}>
                  {t(a.label)}
                </option>
              ))}
            </select>
          </div>

          {/* Parámetros específicos de la acción */}
          <QuadActionInputs
            action={activeSub.action}
            onChange={(patch) => updateActiveSub({ action: { ...activeSub.action, ...patch } })}
            VD={VD}
          />

          {/* Fila: Etiqueta y Sub-etiqueta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.label')}</DotLabel>
              <input
                type="text"
                maxLength={10}
                placeholder="PLAY, MUTE..."
                value={activeSub.label || ''}
                onChange={(e) => updateActiveSub({ label: e.target.value.toUpperCase() })}
                style={inputEstilo(VD)}
              />
            </div>
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2}>{t('ed.split.sublabel')}</DotLabel>
              <input
                type="text"
                maxLength={10}
                placeholder="MAIN, VOL..."
                value={activeSub.sublabel || ''}
                onChange={(e) => updateActiveSub({ sublabel: e.target.value.toUpperCase() })}
                style={inputEstilo(VD)}
              />
            </div>
          </div>

          {/* Paletas de color del cuadrante: Fondo y Texto/Icono */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <QuadColorPicker
              label={t('ed.split.bgColor')}
              value={activeSub.bgColor}
              swatches={BG_SWATCHES}
              onChange={(bgColor) => updateActiveSub({ bgColor })}
              VD={VD}
              tf={tf}
            />
            <QuadColorPicker
              label={t('ed.split.fgColor')}
              value={activeSub.fgColor}
              swatches={FG_SWATCHES}
              onChange={(fgColor) => updateActiveSub({ fgColor })}
              VD={VD}
              tf={tf}
            />
          </div>

          {/* Selector de Glifo Dot-Matrix */}
          <QuadGlyphPicker
            selectedGlyph={(activeSub.dotGlyph || activeSub.icon || '').toUpperCase()}
            onSelect={(glyph) => updateActiveSub({ dotGlyph: glyph, icon: glyph, iconoPuntos: undefined })}
            onAbrirCatalogo={onAbrirCatalogo ? () => onAbrirCatalogo(selectedIdx) : undefined}
            accent={accent}
            VD={VD}
            t={t}
            tf={tf}
          />

          {/* Interruptor (Toggle) */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={!!activeSub.isToggle}
              onChange={(e) => updateActiveSub({ isToggle: e.target.checked })}
              style={{ accentColor: accent }}
            />
            <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, letterSpacing: '0.5px' }}>
              {t('ed.split.toggle')}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
