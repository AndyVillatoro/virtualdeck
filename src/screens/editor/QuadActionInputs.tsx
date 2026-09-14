import React from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { RGB_PRESET_IDS } from '../../data/rgbPresets';
import type { ButtonAction } from '../../types';

export function inputEstilo(VD: ReturnType<typeof useTheme>) {
  return {
    width: '100%',
    marginTop: 6,
    padding: '6px 10px',
    background: VD.surface,
    border: `1px solid ${VD.border}`,
    color: VD.text,
    fontFamily: VD.mono,
    fontSize: 11,
    borderRadius: VD.radius.sm,
    boxSizing: 'border-box' as const,
  };
}

interface ActionInputsProps {
  action: ButtonAction;
  onChange: (patch: Partial<ButtonAction>) => void;
  VD: ReturnType<typeof useTheme>;
  tf: (s: string) => string;
}

function renderMediaInputs({ action, onChange, VD, tf }: ActionInputsProps) {
  const iStyle = inputEstilo(VD);
  if (action.type === 'volume-set') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('VOLUMEN')}</DotLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={action.volumePercent ?? 50}
            onChange={(e) => onChange({ volumePercent: parseInt(e.target.value, 10) })}
            style={{ flex: 1 }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 35 }}>
            {action.volumePercent ?? 50}%
          </span>
        </div>
      </div>
    );
  }
  if (action.type === 'brightness') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('BRILLO')}</DotLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={action.brightnessLevel ?? 50}
            onChange={(e) => onChange({ brightnessLevel: parseInt(e.target.value, 10) })}
            style={{ flex: 1 }}
          />
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, minWidth: 35 }}>
            {action.brightnessLevel ?? 50}%
          </span>
        </div>
      </div>
    );
  }
  if (action.type === 'adjust') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('DESTINO')}</DotLabel>
          <select
            value={action.adjustTarget || 'volume'}
            onChange={(e) => onChange({ adjustTarget: e.target.value as 'volume' | 'brightness' })}
            style={iStyle}
          >
            <option value="volume">{tf('Volumen')}</option>
            <option value="brightness">{tf('Brillo')}</option>
          </select>
        </div>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('DELTA (+/-)')}</DotLabel>
          <input
            type="number"
            placeholder="+5, -5, +10"
            value={action.adjustDelta ?? 5}
            onChange={(e) => onChange({ adjustDelta: parseInt(e.target.value, 10) || 0 })}
            style={iStyle}
          />
        </div>
      </div>
    );
  }
  return null;
}

function renderTextInputs({ action, onChange, VD, tf }: ActionInputsProps) {
  const iStyle = inputEstilo(VD);
  if (action.type === 'hotkey') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>HOTKEY</DotLabel>
        <input
          type="text"
          placeholder="Ctrl+Shift+P, Up, F5"
          value={action.hotkey || ''}
          onChange={(e) => onChange({ hotkey: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  if (action.type === 'web') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>URL</DotLabel>
        <input
          type="text"
          placeholder="https://..."
          value={action.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  if (action.type === 'app') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('RUTA APP')}</DotLabel>
        <input
          type="text"
          placeholder="notepad.exe, code"
          value={action.appPath || ''}
          onChange={(e) => onChange({ appPath: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  if (action.type === 'script') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('COMANDO SCRIPT')}</DotLabel>
        <input
          type="text"
          placeholder="wt, powershell -c ..."
          value={action.script || ''}
          onChange={(e) => onChange({ script: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  if (action.type === 'type-text') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('ESCRIBIR TEXTO')}</DotLabel>
        <input
          type="text"
          placeholder={tf('Texto a escribir automáticamente...')}
          value={action.typeText || ''}
          onChange={(e) => onChange({ typeText: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  if (action.type === 'clipboard') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('PORTAPAPELES')}</DotLabel>
        <input
          type="text"
          placeholder={tf('Texto a copiar al portapapeles...')}
          value={action.clipboardText || ''}
          onChange={(e) => onChange({ clipboardText: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  return null;
}

function renderStateAndDeviceInputs({ action, onChange, VD, tf }: ActionInputsProps) {
  const iStyle = inputEstilo(VD);
  if (action.type === 'audio-device') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('DISPOSITIVO AUDIO')}</DotLabel>
        <input
          type="text"
          placeholder="Speakers, Headphones..."
          value={action.deviceName || ''}
          onChange={(e) => onChange({ deviceName: e.target.value })}
          style={iStyle}
        />
      </div>
    );
  }
  if (action.type === 'set-var') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('VARIABLE')}</DotLabel>
          <input
            type="text"
            placeholder="nombre"
            value={action.varName || ''}
            onChange={(e) => onChange({ varName: e.target.value })}
            style={iStyle}
          />
        </div>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('VALOR')}</DotLabel>
          <input
            type="text"
            placeholder="valor"
            value={action.varValue || ''}
            onChange={(e) => onChange({ varValue: e.target.value })}
            style={iStyle}
          />
        </div>
      </div>
    );
  }
  if (action.type === 'incr-var') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('VARIABLE')}</DotLabel>
          <input
            type="text"
            placeholder="nombre"
            value={action.varName || ''}
            onChange={(e) => onChange({ varName: e.target.value })}
            style={iStyle}
          />
        </div>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('INCREMENTO')}</DotLabel>
          <input
            type="number"
            placeholder="1, -1"
            value={action.varDelta ?? 1}
            onChange={(e) => onChange({ varDelta: parseInt(e.target.value, 10) || 1 })}
            style={iStyle}
          />
        </div>
      </div>
    );
  }
  if (action.type === 'rgb-preset') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('PRESET RGB')}</DotLabel>
        <select
          value={action.rgbPresetId || 'gaming'}
          onChange={(e) => onChange({ rgbPresetId: e.target.value })}
          style={iStyle}
        >
          {RGB_PRESET_IDS.map((p) => (
            <option key={p} value={p}>{p.toUpperCase()}</option>
          ))}
        </select>
      </div>
    );
  }
  if (action.type === 'mobile-remote') {
    return (
      <div>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>{tf('MANDO MÓVIL')}</DotLabel>
        <select
          value={action.mobileRemoteAction || 'pair-code'}
          onChange={(e) => onChange({ mobileRemoteAction: e.target.value as 'pair-code' | 'toggle-server' | 'open-web' })}
          style={iStyle}
        >
          <option value="pair-code">{tf('Código de vinculación')}</option>
          <option value="toggle-server">{tf('Alternar servidor')}</option>
          <option value="open-web">{tf('Abrir en navegador')}</option>
        </select>
      </div>
    );
  }
  return null;
}

export function QuadActionInputs({
  action,
  onChange,
  VD,
}: {
  action: ButtonAction;
  onChange: (patch: Partial<ButtonAction>) => void;
  VD: ReturnType<typeof useTheme>;
}) {
  const tf = useFieldText();
  const p: ActionInputsProps = { action, onChange, VD, tf };

  const mediaEl = renderMediaInputs(p);
  if (mediaEl) return mediaEl;

  const textEl = renderTextInputs(p);
  if (textEl) return textEl;

  const stateEl = renderStateAndDeviceInputs(p);
  if (stateEl) return stateEl;

  return null;
}
