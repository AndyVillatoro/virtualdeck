import React, { useState } from 'react';
import type { VDTokens } from '../../design';
import { useTheme } from '../../utils/theme';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { IconNone } from '../../components/VDIcon';
import { ACTION_TYPES } from './actionData';
import type { ActionType, ButtonAction, FolderButton, Sensor } from '../../types';

/**
 * Piezas que comparten los tres pasos del editor: los estilos de los campos,
 * las envolturas `Field` y `Btn`, y los sub-selectores de acción.
 *
 * Los estilos son funciones de la paleta y no constantes porque el modo claro
 * depende del contexto — ver la nota de tema en CLAUDE.md.
 */

export function FolderButtonSlot({ button, accent, onChange }: {
  button?: FolderButton;
  accent: string;
  onChange: (b: FolderButton | null) => void;
}) {
  const VD = useTheme();
  const tf = useFieldText();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(button?.label ?? '');
  const [icon, setIcon] = useState(button?.icon ?? '');
  const [hotkey, setHotkey] = useState(button?.action?.hotkey ?? '');

  if (!button && !editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{
          height: 60, borderRadius: VD.radius.md, background: VD.elevated, border: `1px dashed ${VD.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: VD.textMuted, fontSize: 18,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
      >
        +
      </div>
    );
  }

  if (editing) {
    return (
      <div style={{ background: VD.bg, border: `1px solid ${accent}`, borderRadius: VD.radius.md, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder={"⌘"} maxLength={2}
            style={{ width: 28, background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 4px', color: VD.text, fontFamily: VD.mono, fontSize: 13, outline: 'none', borderRadius: VD.radius.sm, textAlign: 'center' }} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={tf("Nombre")} maxLength={12}
            style={{ flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 6px', color: VD.text, fontFamily: VD.mono, fontSize: 9, outline: 'none', borderRadius: VD.radius.sm }} />
        </div>
        <input value={hotkey} onChange={e => setHotkey(e.target.value)} placeholder={"Ctrl+Z"}
          style={{ width: '100%', background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 6px', color: VD.text, fontFamily: VD.mono, fontSize: 9, outline: 'none', borderRadius: VD.radius.sm, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => {
            if (label.trim() || hotkey.trim()) {
              onChange({ label: label.trim() || hotkey, icon: icon || undefined, action: { type: 'hotkey', hotkey: hotkey.trim() } });
            }
            setEditing(false);
          }} style={{ flex: 1, padding: '3px 0', background: VD.accentBg, border: `1px solid ${accent}`, fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer', borderRadius: VD.radius.sm }}>OK</button>
          <button onClick={() => { onChange(null); setEditing(false); }}
            style={{ padding: '3px 6px', background: 'transparent', border: `1px solid ${VD.border}`, fontFamily: VD.mono, fontSize: 8, color: VD.danger, cursor: 'pointer', borderRadius: VD.radius.sm }}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setLabel(button!.label); setIcon(button!.icon ?? ''); setHotkey(button!.action.hotkey ?? ''); setEditing(true); }}
      style={{
        height: 60, borderRadius: VD.radius.md, background: button?.bgColor || VD.elevated,
        border: `1px solid ${VD.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', gap: 2, position: 'relative',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
    >
      {button?.icon && <div style={{ fontSize: 14, color: button.fgColor || VD.text, lineHeight: 1 }}>{button.icon}</div>}
      <div style={{ fontFamily: VD.mono, fontSize: 7, color: button?.fgColor || VD.textDim, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
        {button?.label}
      </div>
      {button?.action.hotkey && (
        <div style={{ fontFamily: VD.mono, fontSize: 6, color: VD.textMuted, opacity: 0.7 }}>{button.action.hotkey}</div>
      )}
    </div>
  );
}

// Compact toggle-off action picker
export function ToggleOffActionPicker({ action, onChange, accent }: { action: ButtonAction; onChange: (a: ButtonAction) => void; accent: string }) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const selectStyle = estiloSelector(VD);
  const tr = useT();
  const tf = useFieldText();
  const simpleTypes: ActionType[] = ['hotkey', 'script', 'app', 'media-play-pause', 'mute', 'kill-process', 'volume-set', 'brightness', 'none'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        value={action.type}
        onChange={(e) => onChange({ type: e.target.value as ActionType })}
        style={{ ...selectStyle }}
      >
        {simpleTypes.map(ty => (
          <option key={ty} value={ty}>{tr(ACTION_TYPES.find(at => at.type === ty)?.label ?? '') || ty}</option>
        ))}
      </select>
      {action.type === 'hotkey' && (
        <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })}
          placeholder={"Ctrl+Shift+F9"} style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'script' && (
        <textarea value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })}
          placeholder={tf("Script de desactivación...")} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      )}
      {action.type === 'app' && (
        <input value={action.appPath || ''} onChange={e => onChange({ ...action, appPath: e.target.value })}
          placeholder={tf("ruta o comando")} style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'kill-process' && (
        <input value={action.processName || ''} onChange={e => onChange({ ...action, processName: e.target.value })}
          placeholder={tf("proceso.exe")} style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'volume-set' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50}
            onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })}
            style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.volumePercent ?? 50}%</span>
        </div>
      )}
      {action.type === 'brightness' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70}
            onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })}
            style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.brightnessLevel ?? 70}%</span>
        </div>
      )}
    </div>
  );
}

// Compact action picker for branch then/else — reuses ToggleOffActionPicker with an extended type list
export function BranchActionRow({ action, onChange, accent }: { action: ButtonAction; onChange: (a: ButtonAction) => void; accent: string }) {
  const VD = useTheme();
  const inputStyle = estiloEntrada(VD);
  const selectStyle = estiloSelector(VD);
  const tr = useT();
  const tf = useFieldText();
  const simpleTypes: ActionType[] = ['none', 'set-var', 'incr-var', 'hotkey', 'script', 'notify', 'webhook', 'clipboard', 'type-text', 'volume-set', 'brightness', 'rgb-preset', 'window-snap'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select value={action.type} onChange={(e) => onChange({ type: e.target.value as ActionType })} style={{ ...selectStyle }}>
        {simpleTypes.map(ty => (
          <option key={ty} value={ty}>{tr(ACTION_TYPES.find(at => at.type === ty)?.label ?? '') || ty}</option>
        ))}
      </select>
      {action.type === 'set-var' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={action.varName ?? ''} onChange={e => onChange({ ...action, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder={tf("variable")} style={{ ...inputStyle, flex: 1 }} />
          <input value={action.varValue ?? ''} onChange={e => onChange({ ...action, varValue: e.target.value })}
            placeholder={tf("valor")} style={{ ...inputStyle, flex: 1 }} />
        </div>
      )}
      {action.type === 'incr-var' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={action.varName ?? ''} onChange={e => onChange({ ...action, varName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder={tf("variable")} style={{ ...inputStyle, flex: 1 }} />
          <input type="number" value={action.varDelta ?? 1} onChange={e => onChange({ ...action, varDelta: parseInt(e.target.value) || 0 })}
            style={{ ...inputStyle, width: 80 }} />
        </div>
      )}
      {action.type === 'hotkey' && (
        <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })}
          placeholder={"Ctrl+Shift+F9"} style={{ ...inputStyle, fontSize: 11 }} />
      )}
      {action.type === 'script' && (
        <textarea value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })}
          placeholder={tf("Script...")} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      )}
      {action.type === 'notify' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={action.notifyTitle ?? ''} onChange={e => onChange({ ...action, notifyTitle: e.target.value })}
            placeholder={tf("Título")} style={{ ...inputStyle, flex: 1 }} />
          <input value={action.notifyBody ?? ''} onChange={e => onChange({ ...action, notifyBody: e.target.value })}
            placeholder={tf("Mensaje")} style={{ ...inputStyle, flex: 2 }} />
        </div>
      )}
      {action.type === 'webhook' && (
        <input value={action.webhookUrl ?? ''} onChange={e => onChange({ ...action, webhookUrl: e.target.value, webhookMethod: action.webhookMethod ?? 'POST' })}
          placeholder={"https://..."} style={inputStyle} />
      )}
      {action.type === 'clipboard' && (
        <input value={action.clipboardText || ''} onChange={e => onChange({ ...action, clipboardText: e.target.value })}
          placeholder={tf("Texto al portapapeles")} style={inputStyle} />
      )}
      {action.type === 'type-text' && (
        <input value={action.typeText || ''} onChange={e => onChange({ ...action, typeText: e.target.value })}
          placeholder={tf("Texto a escribir")} style={inputStyle} />
      )}
      {action.type === 'volume-set' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50}
            onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.volumePercent ?? 50}%</span>
        </div>
      )}
      {action.type === 'brightness' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70}
            onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 36 }}>{action.brightnessLevel ?? 70}%</span>
        </div>
      )}
      {action.type === 'rgb-preset' && (
        <select value={action.rgbPresetId ?? ''} onChange={e => onChange({ ...action, rgbPresetId: e.target.value })} style={{ ...selectStyle }}>
          {['off','gaming','cinema','work','rainbow','night-blue','alert-red'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
      {action.type === 'window-snap' && (
        <select value={action.snapPosition ?? 'left-half'} onChange={e => onChange({ ...action, snapPosition: e.target.value as any })} style={{ ...selectStyle }}>
          {['left-half','right-half','top-half','bottom-half','top-left','top-right','bottom-left','bottom-right','maximize','center','restore'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export function ExtraActionRow({ action, onChange, onRemove }: { action: ButtonAction; onChange: (a: ButtonAction) => void; onRemove: () => void }) {
  const VD = useTheme();
  const miniInputStyle = estiloEntradaMini(VD);
  const tr = useT();
  const tf = useFieldText();
  const meta = ACTION_TYPES.find(a => a.type === action.type);
  const Icon = meta?.Icon ?? IconNone;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '6px 10px' }}>
      <Icon size={14} color={VD.textDim} strokeWidth={1.5} />
      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, minWidth: 64 }}>{meta ? tr(meta.label) : ''}</span>
      {action.type === 'app' && (
        <input value={action.appPath || ''} onChange={e => onChange({ ...action, appPath: e.target.value })} placeholder={tf("ruta o comando")} style={miniInputStyle} />
      )}
      {action.type === 'web' && (
        <input value={action.url || ''} onChange={e => onChange({ ...action, url: e.target.value })} placeholder={"https://..."} style={miniInputStyle} />
      )}
      {action.type === 'script' && (
        <input value={action.script || ''} onChange={e => onChange({ ...action, script: e.target.value })} placeholder={"script"} style={miniInputStyle} />
      )}
      {action.type === 'hotkey' && (
        <input value={action.hotkey || ''} onChange={e => onChange({ ...action, hotkey: e.target.value })} placeholder={"Ctrl+Shift+F9"} style={miniInputStyle} />
      )}
      {action.type === 'shortcut' && (
        <input value={action.shortcutPath || ''} onChange={e => onChange({ ...action, shortcutPath: e.target.value })} placeholder={tf("ruta")} style={miniInputStyle} />
      )}
      {action.type === 'clipboard' && (
        <input value={action.clipboardText || ''} onChange={e => onChange({ ...action, clipboardText: e.target.value })} placeholder={tf("texto al portapapeles")} style={miniInputStyle} />
      )}
      {action.type === 'type-text' && (
        <input value={action.typeText || ''} onChange={e => onChange({ ...action, typeText: e.target.value })} placeholder={tf("texto a escribir")} style={miniInputStyle} />
      )}
      {action.type === 'kill-process' && (
        <input value={action.processName || ''} onChange={e => onChange({ ...action, processName: e.target.value })} placeholder={tf("proceso.exe")} style={miniInputStyle} />
      )}
      {action.type === 'brightness' && (
        <>
          <input type="range" min={0} max={100} step={5} value={action.brightnessLevel ?? 70} onChange={e => onChange({ ...action, brightnessLevel: parseInt(e.target.value) })} style={{ flex: 1, accentColor: VD.accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, minWidth: 28 }}>{action.brightnessLevel ?? 70}%</span>
        </>
      )}
      {action.type === 'volume-set' && (
        <>
          <input type="range" min={0} max={100} step={5} value={action.volumePercent ?? 50} onChange={e => onChange({ ...action, volumePercent: parseInt(e.target.value) })} style={{ flex: 1, accentColor: VD.accent }} />
          <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, minWidth: 28 }}>{action.volumePercent ?? 50}%</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>×</button>
    </div>
  );
}

export function estiloEntrada(VD: VDTokens): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: VD.bg, border: `1px solid ${VD.border}`,
    padding: '9px 12px', color: VD.text,
    fontFamily: VD.mono, fontSize: 11, outline: 'none', borderRadius: VD.radius.sm,
  };
}

export function estiloEntradaMini(VD: VDTokens): React.CSSProperties {
  return {
    flex: 1, background: VD.bg, border: `1px solid ${VD.border}`,
    padding: '4px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 10,
    outline: 'none', borderRadius: VD.radius.sm,
  };
}

export function estiloSelector(VD: VDTokens): React.CSSProperties {
  return {
    width: '100%', boxSizing: 'border-box',
    background: VD.bg, border: `1px solid ${VD.border}`,
    padding: '8px 12px', color: VD.text,
    fontFamily: VD.mono, fontSize: 11, outline: 'none', borderRadius: VD.radius.sm, cursor: 'pointer',
  };
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const VD = useTheme();
  return (
    <div>
      <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{label}</DotLabel>
      {children}
    </div>
  );
}

export function Btn({ onClick, children, style }: { onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  const VD = useTheme();
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', border: `1px solid ${VD.border}`, background: VD.elevated, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm, whiteSpace: 'nowrap', letterSpacing: 0.5, ...style }}>
      {children}
    </button>
  );
}

// Compact select for picking an LHM sensor by id. Groups by hardware so the
// dropdown stays scannable with 100+ sensors. Shows current value next to the
// name so the user can pick by what's actively reading.
export function SensorPicker({
  sensors, value, onChange, accent: _accent, allowEmpty,
}: {
  sensors: import('../../types').Sensor[];
  value: string;
  onChange: (id: string) => void;
  accent: string;
  allowEmpty?: boolean;
}) {
  const t = useT();
  const VD = useTheme();
  const selectStyle = estiloSelector(VD);
  const groups: Record<string, import('../../types').Sensor[]> = {};
  for (const s of sensors) {
    const key = s.hardware || '—';
    (groups[key] ||= []).push(s);
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={selectStyle}
    >
      {allowEmpty !== false && <option value="">{t('ed.pickSensor')}</option>}
      {sensors.length === 0 && (
        <option value="" disabled>{t('ed.noSensors')}</option>
      )}
      {Object.entries(groups).map(([hw, list]) => (
        <optgroup key={hw} label={hw}>
          {list.map((s) => (
            <option key={s.id} value={s.id}>
              [{s.kind.slice(0, 4)}] {s.name} — {Number.isFinite(s.value) ? s.value.toFixed(s.kind === 'Voltage' ? 2 : 0) : '—'} {s.unit}
            </option>
          ))}
        </optgroup>
      ))}
      {/* Fallback: keep a saved id selectable even if LHM hasn't returned data yet */}
      {value && !sensors.some((s) => s.id === value) && (
        <option value={value}>(saved) {value}</option>
      )}
    </select>
  );
}
