import React, { useCallback, useEffect, useRef, useState } from 'react';
import { VD } from '../../design';
import { useTheme } from '../../utils/theme';
import type { MacroStep, MacroStepType } from '../../types';

const STEP_LABELS: Record<MacroStepType, string> = {
  key: 'Tecla',
  hotkey: 'Combinación',
  text: 'Texto',
  click: 'Clic ratón',
  move: 'Mover ratón',
  delay: 'Pausa (ms)',
  scroll: 'Scroll',
};

interface MacroEditorProps {
  steps: MacroStep[];
  repeat: number;
  accent: string;
  onChange: (steps: MacroStep[], repeat: number) => void;
}

export function MacroEditor({ steps, repeat, accent, onChange }: MacroEditorProps) {
  const VD = useTheme();
  const api = window.electronAPI;
  const [recording, setRecording] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const recTimer = useRef<number | null>(null);

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
    await api.macro.startRecord();
    setRecording(true);
  }, [api]);

  const stopRec = useCallback(async () => {
    if (!api?.macro) return;
    const captured = await api.macro.stopRecord() as MacroStep[];
    setRecording(false);
    if (captured && captured.length > 0) onChange(captured, repeat);
  }, [api, onChange, repeat]);

  const addStep = (type: MacroStepType) => {
    const defaults: Record<MacroStepType, Partial<MacroStep>> = {
      key:    { value: 'a', delayMs: 0 },
      hotkey: { value: 'Ctrl+C', delayMs: 0 },
      text:   { value: 'Hola mundo', delayMs: 0 },
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
              padding: '5px 12px', background: 'rgba(217,95,95,0.15)', border: `1px solid #d95f5f`,
              color: '#d95f5f', fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >⏺ GRABAR</button>
        ) : (
          <button
            onClick={stopRec}
            style={{
              padding: '5px 12px', background: 'rgba(217,95,95,0.3)', border: `1px solid #d95f5f`,
              color: '#ff8080', fontFamily: VD.mono, fontSize: 8, cursor: 'pointer',
              borderRadius: VD.radius.sm, letterSpacing: 1, animation: 'vd-blink 0.8s step-end infinite',
            }}
          >⏹ DETENER</button>
        )}
        {recording && (
          <span style={{ fontFamily: VD.mono, fontSize: 8, color: '#d95f5f', letterSpacing: 1 }}>
            REC • presioná teclas y hacé clics...
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>REPETIR</span>
        <input
          type="number"
          min={1}
          max={99}
          value={repeat}
          onChange={(e) => onChange(steps, parseInt(e.target.value, 10) || 1)}
          style={{ ...inputStyle, width: 44, textAlign: 'center' }}
        />
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>VECES</span>
      </div>

      {/* Step list */}
      {steps.length === 0 ? (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
          Sin pasos. Grabá una macro o añadí pasos manualmente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{
              background: editIdx === idx ? VD.overlay : VD.elevated,
              border: `1px solid ${editIdx === idx ? accent : VD.border}`,
              borderRadius: VD.radius.sm, padding: '6px 8px',
            }}>
              {/* Step header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, width: 18, textAlign: 'right', flexShrink: 0 }}>
                  {idx + 1}
                </span>
                <span style={{ fontFamily: VD.mono, fontSize: 8, color: accent, letterSpacing: 1, flex: 1 }}>
                  {STEP_LABELS[step.type]}
                  {step.value ? ` — ${step.value}` : ''}
                  {(step.x !== undefined && step.type !== 'scroll') ? ` (${step.x}, ${step.y})` : ''}
                  {step.delayMs ? ` +${step.delayMs}ms` : ''}
                </span>
                <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} style={{ ...iconBtnSm(VD) }}>↑</button>
                <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} style={{ ...iconBtnSm(VD) }}>↓</button>
                <button onClick={() => setEditIdx(editIdx === idx ? null : idx)} style={{ ...iconBtnSm(VD), color: editIdx === idx ? accent : VD.textMuted }}>✎</button>
                <button onClick={() => removeStep(idx)} style={{ ...iconBtnSm(VD), color: VD.danger }}>✕</button>
              </div>

              {/* Step editor */}
              {editIdx === idx && (
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {(step.type === 'key' || step.type === 'hotkey' || step.type === 'text') && (
                    <>
                      <span style={labelSm(VD)}>{step.type === 'text' ? 'TEXTO' : 'TECLA'}</span>
                      <input
                        value={step.value ?? ''}
                        onChange={(e) => updateStep(idx, { value: e.target.value })}
                        placeholder={step.type === 'text' ? 'Texto a escribir' : step.type === 'hotkey' ? 'Ctrl+C' : 'Enter'}
                        style={{ ...inputStyle, flex: 1, minWidth: 80 }}
                      />
                    </>
                  )}
                  {(step.type === 'click' || step.type === 'move') && (
                    <>
                      <span style={labelSm(VD)}>X</span>
                      <input type="number" value={step.x ?? 0} onChange={(e) => updateStep(idx, { x: parseInt(e.target.value, 10) || 0 })} style={{ ...inputStyle, width: 60 }} />
                      <span style={labelSm(VD)}>Y</span>
                      <input type="number" value={step.y ?? 0} onChange={(e) => updateStep(idx, { y: parseInt(e.target.value, 10) || 0 })} style={{ ...inputStyle, width: 60 }} />
                      {step.type === 'click' && (
                        <>
                          <span style={labelSm(VD)}>BTN</span>
                          <select value={step.button ?? 0} onChange={(e) => updateStep(idx, { button: parseInt(e.target.value, 10) as 0|1|2 })} style={inputStyle}>
                            <option value={0}>Izq</option>
                            <option value={1}>Der</option>
                            <option value={2}>Med</option>
                          </select>
                        </>
                      )}
                    </>
                  )}
                  {step.type === 'scroll' && (
                    <>
                      <span style={labelSm(VD)}>UNIDADES</span>
                      <input type="number" value={step.scrollY ?? 3} onChange={(e) => updateStep(idx, { scrollY: parseInt(e.target.value, 10) || 1 })} style={{ ...inputStyle, width: 60 }} />
                      <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>(+ arriba, − abajo)</span>
                    </>
                  )}
                  <span style={labelSm(VD)}>PAUSA</span>
                  <input
                    type="number" min={0} value={step.delayMs ?? 0}
                    onChange={(e) => updateStep(idx, { delayMs: parseInt(e.target.value, 10) || 0 })}
                    style={{ ...inputStyle, width: 60 }}
                  />
                  <span style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted }}>ms antes</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add-step buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(Object.keys(STEP_LABELS) as MacroStepType[]).map((t) => (
          <button
            key={t}
            onClick={() => addStep(t)}
            style={{
              padding: '3px 8px', background: VD.elevated, border: `1px solid ${VD.border}`,
              color: VD.textDim, fontFamily: VD.mono, fontSize: 7, letterSpacing: 0.5,
              cursor: 'pointer', borderRadius: VD.radius.sm,
            }}
          >+ {STEP_LABELS[t]}</button>
        ))}
      </div>
    </div>
  );
}

function iconBtnSm(VD: any): React.CSSProperties {
  return {
    width: 20, height: 20, background: 'none', border: 'none',
    color: VD.textMuted, cursor: 'pointer', fontFamily: VD.mono,
    fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, borderRadius: VD.radius.sm,
  };
}

function labelSm(VD: any): React.CSSProperties {
  return { fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, letterSpacing: 1, flexShrink: 0 };
}
