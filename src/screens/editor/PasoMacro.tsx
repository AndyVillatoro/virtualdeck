import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { BotonIcono } from '../../components/ui/BotonIcono';
import type { MacroStep, MacroStepType } from '../../types';

// El nombre de cada paso se guarda como **clave**, no como texto: el mapa es
// una constante de modulo y ahi no se puede llamar a `useT()`.
export const STEP_LABELS: Record<MacroStepType, string> = {
  key: 'macro.step.key',
  hotkey: 'macro.step.hotkey',
  text: 'macro.step.text',
  click: 'macro.step.click',
  move: 'macro.step.move',
  delay: 'macro.step.delay',
  scroll: 'macro.step.scroll',
};

export interface PropsFilaPasoMacro {
  step: MacroStep;
  idx: number;
  total: number;
  abierto: boolean;
  accent: string;
  onMove: (idx: number, dir: -1 | 1) => void;
  onToggleEdit: (idx: number) => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number, patch: Partial<MacroStep>) => void;
}

export function FilaPasoMacro({ step, idx, total, abierto, accent, onMove, onToggleEdit, onRemove, onUpdate }: PropsFilaPasoMacro) {
  const t = useT();
  const VD = useTheme();
  return (
    <div style={{
      background: abierto ? VD.overlay : VD.elevated,
      border: `1px solid ${abierto ? accent : VD.border}`,
      borderRadius: VD.radius.sm, padding: '6px 8px',
    }}>
      {/* Step header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, width: 18, textAlign: 'right', flexShrink: 0 }}>
          {idx + 1}
        </span>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: accent, letterSpacing: 1, flex: 1 }}>
          {t(STEP_LABELS[step.type])}
          {step.value ? ` — ${step.value}` : ''}
          {(step.x !== undefined && step.type !== 'scroll') ? ` (${step.x}, ${step.y})` : ''}
          {step.delayMs ? ` +${step.delayMs}ms` : ''}
        </span>
        <BotonIcono
          glifo="ARROW_UP"
          title={t('comun.subir')}
          onClick={() => onMove(idx, -1)}
          disabled={idx === 0}
          tamano={20}
          tamanoGlifo={8}
        />
        <BotonIcono
          glifo="ARROW_DOWN"
          title={t('comun.bajar')}
          onClick={() => onMove(idx, 1)}
          disabled={idx === total - 1}
          tamano={20}
          tamanoGlifo={8}
        />
        <BotonIcono
          glifo="EDIT"
          title={t('comun.editar')}
          onClick={() => onToggleEdit(idx)}
          color={abierto ? accent : VD.textMuted}
          tamano={20}
          tamanoGlifo={8}
        />
        <BotonIcono
          glifo="CLOSE"
          title={t('comun.eliminar')}
          onClick={() => onRemove(idx)}
          peligro
          tamano={20}
          tamanoGlifo={8}
        />
      </div>

      {/* Step editor */}
      {abierto && <EditorPasoMacro step={step} idx={idx} onUpdate={onUpdate} />}
    </div>
  );
}

function EditorPasoMacro({ step, idx, onUpdate }: { step: MacroStep; idx: number; onUpdate: (idx: number, patch: Partial<MacroStep>) => void }) {
  const t = useT();
  const VD = useTheme();
  const inputStyle: React.CSSProperties = {
    background: VD.elevated, border: `1px solid ${VD.border}`,
    color: VD.text, fontFamily: VD.mono, fontSize: 9,
    padding: '3px 6px', borderRadius: VD.radius.sm, outline: 'none',
  };
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {(step.type === 'key' || step.type === 'hotkey' || step.type === 'text') && (
        <>
          <span style={labelSm(VD)}>{t(step.type === 'text' ? 'macro.fieldText' : 'macro.fieldKey')}</span>
          <input
            value={step.value ?? ''}
            onChange={(e) => onUpdate(idx, { value: e.target.value })}
            placeholder={step.type === 'text' ? t('macro.textPlaceholder') : step.type === 'hotkey' ? 'Ctrl+C' : 'Enter'}
            style={{ ...inputStyle, flex: 1, minWidth: 80 }}
          />
        </>
      )}
      {(step.type === 'click' || step.type === 'move') && (
        <>
          <span style={labelSm(VD)}>X</span>
          <input type="number" value={step.x ?? 0} onChange={(e) => onUpdate(idx, { x: parseInt(e.target.value, 10) || 0 })} style={{ ...inputStyle, width: 60 }} />
          <span style={labelSm(VD)}>Y</span>
          <input type="number" value={step.y ?? 0} onChange={(e) => onUpdate(idx, { y: parseInt(e.target.value, 10) || 0 })} style={{ ...inputStyle, width: 60 }} />
          {step.type === 'click' && (
            <>
              <span style={labelSm(VD)}>BTN</span>
              <select value={step.button ?? 0} onChange={(e) => onUpdate(idx, { button: parseInt(e.target.value, 10) as 0|1|2 })} style={inputStyle}>
                <option value={0}>{t('ui.mouseL')}</option>
                <option value={1}>{t('ui.mouseR')}</option>
                <option value={2}>{t('ui.mouseM')}</option>
              </select>
            </>
          )}
        </>
      )}
      {step.type === 'scroll' && (
        <>
          <span style={labelSm(VD)}>{t('ui.units')}</span>
          <input type="number" value={step.scrollY ?? 3} onChange={(e) => onUpdate(idx, { scrollY: parseInt(e.target.value, 10) || 1 })} style={{ ...inputStyle, width: 60 }} />
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{t('macro.scrollHint')}</span>
        </>
      )}
      <span style={labelSm(VD)}>{t('ui.pause')}</span>
      <input
        type="number" min={0} value={step.delayMs ?? 0}
        onChange={(e) => onUpdate(idx, { delayMs: parseInt(e.target.value, 10) || 0 })}
        style={{ ...inputStyle, width: 60 }}
      />
      <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>ms antes</span>
    </div>
  );
}

function labelSm(VD: { mono: string; textMuted: string }): React.CSSProperties {
  return { fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, letterSpacing: 1, flexShrink: 0 };
}
