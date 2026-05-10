import React from 'react';
import { VD } from '../../design';

export function ToggleRow({ label, value, accent, onClick }: { label: string; value: boolean; accent: string; onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SettingLabel>{label}</SettingLabel>
      <div
        onClick={onClick}
        style={{
          width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
          background: value ? accent : VD.elevated,
          border: `1px solid ${value ? accent : VD.border}`,
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: value ? 17 : 2,
          width: 14, height: 14, borderRadius: '50%', background: VD.text,
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

export function SettingLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: VD.mono, fontSize: 8, letterSpacing: 2, color: VD.textMuted }}>{children}</div>
  );
}

export const inputStyleSettings: React.CSSProperties = {
  flex: 1, width: '100%', boxSizing: 'border-box',
  background: VD.elevated, border: `1px solid ${VD.border}`,
  padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
  outline: 'none', borderRadius: VD.radius.sm,
};

export const miniBtnSettings = (accent: string): React.CSSProperties => ({
  padding: '5px 10px', background: VD.accentBg, border: `1px solid ${accent}`,
  fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer',
  borderRadius: VD.radius.sm, letterSpacing: 1,
});
