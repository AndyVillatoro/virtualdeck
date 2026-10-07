import { useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon, resolveDotGlyph } from '../../../components/dot480/DotGlyphIcon';
import { BotonIcono } from '../../../components/ui/BotonIcono';
import type { FolderButton } from '../../../types';

export interface PropsHuecoCarpeta {
  button?: FolderButton;
  accent: string;
  onChange: (b: FolderButton | null) => void;
}

export function FolderButtonSlot({ button, accent, onChange }: PropsHuecoCarpeta) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(button?.label ?? '');
  const [icon, setIcon] = useState(button?.icon ?? '');
  const [hotkey, setHotkey] = useState(button?.action?.hotkey ?? '');

  if (!button && !editing) {
    return <HuecoVacio accent={accent} onCrear={() => setEditing(true)} />;
  }

  if (editing) {
    return (
      <EditorHuecoCarpeta
        label={label}
        icon={icon}
        hotkey={hotkey}
        accent={accent}
        onLabel={setLabel}
        onIcon={setIcon}
        onHotkey={setHotkey}
        onCerrar={(b) => { if (b) onChange(b); setEditing(false); }}
        onEliminar={() => { onChange(null); setEditing(false); }}
      />
    );
  }

  return (
    <VistaHuecoCarpeta
      button={button}
      accent={accent}
      onEditar={() => {
        setLabel(button!.label);
        setIcon(button!.icon ?? '');
        setHotkey(button!.action.hotkey ?? '');
        setEditing(true);
      }}
    />
  );
}

function HuecoVacio({ accent, onCrear }: { accent: string; onCrear: () => void }) {
  const VD = useTheme();
  return (
    <div
      onClick={onCrear}
      style={{
        height: 60, borderRadius: VD.radius.md, background: VD.elevated, border: `1px dashed ${VD.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        color: VD.textMuted, fontSize: 18,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
    >
      <DotGlyphIcon glyph="ADD" size={12} color={VD.textMuted} />
    </div>
  );
}

interface PropsEditorHueco {
  label: string;
  icon: string;
  hotkey: string;
  accent: string;
  onLabel: (v: string) => void;
  onIcon: (v: string) => void;
  onHotkey: (v: string) => void;
  onCerrar: (b: FolderButton | null) => void;
  onEliminar: () => void;
}

function EditorHuecoCarpeta({ label, icon, hotkey, accent, onLabel, onIcon, onHotkey, onCerrar, onEliminar }: PropsEditorHueco) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  return (
    <div style={{ background: VD.bg, border: `1px solid ${accent}`, borderRadius: VD.radius.md, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <input value={icon} onChange={e => onIcon(e.target.value)} placeholder={"Ctrl"} maxLength={4}
          style={{ width: 28, background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 4px', color: VD.text, fontFamily: VD.mono, fontSize: 13, outline: 'none', borderRadius: VD.radius.sm, textAlign: 'center' }} />
        <input value={label} onChange={e => onLabel(e.target.value)} placeholder={tf("Nombre")} maxLength={12}
          style={{ flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 6px', color: VD.text, fontFamily: VD.mono, fontSize: 9, outline: 'none', borderRadius: VD.radius.sm }} />
      </div>
      <input value={hotkey} onChange={e => onHotkey(e.target.value)} placeholder={"Ctrl+Z"}
        style={{ width: '100%', background: VD.elevated, border: `1px solid ${VD.border}`, padding: '2px 6px', color: VD.text, fontFamily: VD.mono, fontSize: 9, outline: 'none', borderRadius: VD.radius.sm, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={() => {
          if (label.trim() || hotkey.trim()) {
            onCerrar({ label: label.trim() || hotkey, icon: icon || undefined, action: { type: 'hotkey', hotkey: hotkey.trim() } });
          } else {
            onCerrar(null);
          }
        }} style={{ flex: 1, padding: '3px 0', background: VD.accentBg, border: `1px solid ${accent}`, fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer', borderRadius: VD.radius.sm }}>OK</button>
        <BotonIcono
          glifo="CLOSE"
          title={t('comun.eliminar')}
          onClick={onEliminar}
          peligro
          tamano={20}
          tamanoGlifo={8}
        />
      </div>
    </div>
  );
}

function VistaHuecoCarpeta({ button, accent, onEditar }: { button?: FolderButton; accent: string; onEditar: () => void }) {
  const VD = useTheme();
  return (
    <div
      onClick={onEditar}
      style={{
        height: 60, borderRadius: VD.radius.md, background: button?.bgColor || VD.elevated,
        border: `1px solid ${VD.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', gap: 2, position: 'relative',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = VD.border)}
    >
      {button?.icon && (
        <div style={{ lineHeight: 1 }}>
          {resolveDotGlyph(button.icon) ? (
            <DotGlyphIcon glyph={button.icon} size={16} color={button.fgColor || VD.text} showRecessed />
          ) : (
            <span style={{ fontSize: 14, color: button.fgColor || VD.text }}>{button.icon}</span>
          )}
        </div>
      )}
      <div style={{ fontFamily: VD.mono, fontSize: 7, color: button?.fgColor || VD.textDim, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
        {button?.label}
      </div>
      {button?.action.hotkey && (
        <div style={{ fontFamily: VD.mono, fontSize: 6, color: VD.textMuted, opacity: 0.7 }}>{button.action.hotkey}</div>
      )}
    </div>
  );
}
