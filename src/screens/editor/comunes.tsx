import React from 'react';
import type { VDTokens } from '../../design';
import { useTheme } from '../../utils/theme';
import { estiloCampo, estiloDesplegable } from '../../components/ui/estilos';
import { useT, useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { ACTION_TYPES } from './actionData';
import type { ActionType, ButtonAction, Sensor } from '../../types';

export { FolderButtonSlot } from './filas/HuecoCarpeta';
export type { PropsHuecoCarpeta } from './filas/HuecoCarpeta';
export { BranchActionRow } from './filas/FilaRama';
export type { PropsFilaRama } from './filas/FilaRama';
export { ExtraActionRow } from './filas/FilaAccionExtra';
export type { PropsFilaAccionExtra } from './filas/FilaAccionExtra';

/**
 * Piezas que comparten los tres pasos del editor: los estilos de los campos,
 * las envolturas `Field` y `Btn`, y los sub-selectores de acción.
 *
 * Las filas con lógica propia (carpeta, rama y acción extra) viven en
 * `filas/` y aquí solo se reexportan, para no tocar a los llamadores.
 *
 * Los estilos son funciones de la paleta y no constantes porque el modo claro
 * depende del contexto — ver la nota de tema en CLAUDE.md.
 */

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

export function estiloEntrada(VD: VDTokens): React.CSSProperties {
  return estiloCampo(VD);
}

function estiloSelector(VD: VDTokens): React.CSSProperties {
  return estiloDesplegable(VD);
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
  sensors: Sensor[];
  value: string;
  onChange: (id: string) => void;
  accent: string;
  allowEmpty?: boolean;
}) {
  const t = useT();
  const VD = useTheme();
  const selectStyle = estiloSelector(VD);
  const groups: Record<string, Sensor[]> = {};
  for (const s of sensors) {
    const key = s.hardware || '—';
    (groups[key] ||= []).push(s);
  }
  const KIND_ORDER: Record<string, number> = {
    Temperature: 0,
    Load: 1,
    Power: 2,
    Fan: 3,
    Clock: 4,
    Voltage: 5,
    Data: 6,
    Throughput: 7,
  };

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
      {Object.entries(groups).map(([hw, list]) => {
        const sorted = [...list].sort((a, b) => {
          const oa = KIND_ORDER[a.kind] ?? 9;
          const ob = KIND_ORDER[b.kind] ?? 9;
          if (oa !== ob) return oa - ob;
          return a.name.localeCompare(b.name);
        });
        return (
          <optgroup key={hw} label={hw}>
            {sorted.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.kind.slice(0, 4)}] {s.name} — {Number.isFinite(s.value) ? s.value.toFixed(s.kind === 'Voltage' ? 2 : 0) : '—'} {s.unit}
              </option>
            ))}
          </optgroup>
        );
      })}
      {/* Fallback: keep a saved id selectable even if LHM hasn't returned data yet */}
      {value && !sensors.some((s) => s.id === value) && (
        <option value={value}>(saved) {value}</option>
      )}
    </select>
  );
}
