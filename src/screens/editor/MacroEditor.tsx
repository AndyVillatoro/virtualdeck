import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { MacroStep, MacroStepType } from '../../types';
import { FilaPasoMacro, STEP_LABELS } from './PasoMacro';

interface MacroEditorProps {
  steps: MacroStep[];
  repeat: number;
  accent: string;
  onChange: (steps: MacroStep[], repeat: number) => void;
}

export function MacroEditor({ steps, repeat, accent, onChange }: MacroEditorProps) {
  const t = useT();
  const VD = useTheme();
  const api = window.electronAPI;
  const [recording, setRecording] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [vacia, setVacia] = useState(false);

  // Poll recording state every 300 ms to reflect stop from external source
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(async () => {
      const active = await api?.macro?.isRecording().catch(() => false);
      if (!active) setRecording(false);
    }, 300);
    return () => clearInterval(t);
  }, [recording, api]);

  const startRec = useCallback(async () => {
    if (!api?.macro) return;
    setVacia(false);
    await api.macro.startRecord();
    setRecording(true);
  }, [api]);

  const stopRec = useCallback(async () => {
    if (!api?.macro) return;
    const captured = await api.macro.stopRecord() as MacroStep[];
    setRecording(false);
    // Una grabación vacía no cambiaba nada y no decía nada: parecía que el
    // grabador no funcionaba. Casi siempre es que solo se hizo clic aquí
    // dentro, y esos clics se descartan a propósito.
    if (captured && captured.length > 0) { setVacia(false); onChange(captured, repeat); }
    else setVacia(true);
  }, [api, onChange, repeat]);

  const addStep = (type: MacroStepType) => {
    const defaults: Record<MacroStepType, Partial<MacroStep>> = {
      key:    { value: 'a', delayMs: 0 },
      hotkey: { value: 'Ctrl+C', delayMs: 0 },
      text:   { value: t('macro.textDefault'), delayMs: 0 },
      click:  { x: 0, y: 0, button: 0, delayMs: 0 },
      move:   { x: 0, y: 0, delayMs: 0 },
      delay:  { delayMs: 500 },
      scroll: { scrollY: 3, delayMs: 0 },
    };
    onChange([...steps, { type, ...defaults[type] }], repeat);
    setEditIdx(steps.length);
  };

  const updateStep = (idx: number, patch: Partial<MacroStep>) => {
    const next = steps.map((s, i) => i === idx ? { ...s, ...patch } : s);
    onChange(next, repeat);
  };

  const removeStep = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx);
    onChange(next, repeat);
    if (editIdx === idx) setEditIdx(null);
    else if (editIdx !== null && editIdx > idx) setEditIdx(editIdx - 1);
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    [next[idx], next[to]] = [next[to], next[idx]];
    onChange(next, repeat);
    setEditIdx(to);
  };

  const inputStyle: React.CSSProperties = {
    background: VD.elevated, border: `1px solid ${VD.border}`,
    color: VD.text, fontFamily: VD.mono, fontSize: 9,
    padding: '3px 6px', borderRadius: VD.radius.sm, outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Recorder controls */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {!recording ? (
          <button
            onClick={startRec}
            style={{
              padding: '5px 12px', background: `${VD.danger}26`, border: `1px solid ${VD.danger}`,
              color: VD.danger, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <DotGlyphIcon glyph="DOTS" size={8} color={VD.danger} />
            <span>{t('macro.rec.start')}</span>
          </button>
        ) : (
          <button
            onClick={stopRec}
            style={{
              padding: '5px 12px', background: `${VD.danger}4d`, border: `1px solid ${VD.danger}`,
              color: VD.danger, fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1, animation: 'vd-blink 0.8s step-end infinite',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <DotGlyphIcon glyph="PAUSE" size={8} color={VD.danger} />
            <span>{t('macro.rec.stop')}</span>
          </button>
        )}
        {recording && (
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.danger, letterSpacing: 1 }}>
            {t('macro.recording')}
          </span>
        )}
        {!recording && vacia && (
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.4, maxWidth: 300 }}>
            {t('macro.recEmpty')}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{t('ui.repeat')}</span>
        <input
          type="number"
          min={1}
          max={99}
          value={repeat}
          onChange={(e) => onChange(steps, parseInt(e.target.value, 10) || 1)}
          style={{ ...inputStyle, width: 44, textAlign: 'center' }}
        />
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>{t('ui.times')}</span>
      </div>

      {/* Step list */}
      {steps.length === 0 ? (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
          {t('macro.noSteps')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
          {steps.map((step, idx) => (
            <FilaPasoMacro
              key={idx}
              step={step}
              idx={idx}
              total={steps.length}
              abierto={editIdx === idx}
              accent={accent}
              onMove={moveStep}
              onToggleEdit={(i) => setEditIdx(editIdx === i ? null : i)}
              onRemove={removeStep}
              onUpdate={updateStep}
            />
          ))}
        </div>
      )}

      {/* Add-step buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(Object.keys(STEP_LABELS) as MacroStepType[]).map((tipo) => (
          <button
            key={tipo}
            onClick={() => addStep(tipo)}
            style={{
              padding: '3px 8px', background: VD.elevated, border: `1px solid ${VD.border}`,
              color: VD.textDim, fontFamily: VD.mono, fontSize: 7, letterSpacing: 0.5,
              cursor: 'pointer', borderRadius: VD.radius.sm,
            }}
          >+ {t(STEP_LABELS[tipo])}</button>
        ))}
      </div>
    </div>
  );
}
