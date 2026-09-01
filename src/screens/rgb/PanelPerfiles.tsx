import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { SaveProfileBar, PresetsRapidos } from './piezas';
import type { RGBProfile } from '../../types';

/**
 * La columna derecha del gestor RGB: los presets rápidos y los perfiles
 * guardados, con el que se aplica al arrancar.
 *
 * Guardar con un nombre que ya existe **sobrescribe**; esa decisión vive en
 * `RGBManagerB.saveProfile`, no aquí: este panel solo pide el nombre.
 */
export function PanelPerfiles({
  accent, conectado, profiles, startupProfileId,
  onAplicarPreset, onGuardar, onAplicar, onBorrar, onAlternarArranque,
}: {
  accent: string;
  conectado: boolean;
  profiles: RGBProfile[];
  startupProfileId?: string;
  onAplicarPreset: (id: string) => void;
  onGuardar: (nombre: string) => void;
  onAplicar: (id: string) => void;
  onBorrar: (id: string) => void;
  onAlternarArranque: (id: string) => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <div style={{ width: 240, borderLeft: `1px solid ${VD.border}`, background: VD.surface, padding: 10, overflowY: 'auto', flexShrink: 0 }}>
      <PresetsRapidos accent={accent} activo={conectado} onAplicar={onAplicarPreset} />

      <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 8 }}>{t('rgb.profiles')}</DotLabel>
      <SaveProfileBar onSave={onGuardar} accent={accent} disabled={!conectado} />
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {profiles.length > 0 && (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5, marginBottom: 4 }}>
            {t('rgb.startupHint')}
          </div>
        )}
        {profiles.length === 0 && (
          <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '4px 0' }}>
            {t('rgb.noProfiles')}
          </div>
        )}
        {profiles.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '5px 8px' }}>
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <button
              onClick={() => onAlternarArranque(p.id)}
              title={t(startupProfileId === p.id ? 'rgb.startupOn' : 'rgb.startupOff')}
              style={{ background: 'none', border: 'none', fontSize: 11, lineHeight: 1, cursor: 'pointer', padding: '0 2px', color: startupProfileId === p.id ? accent : VD.textMuted }}
            >{startupProfileId === p.id ? '◉' : '○'}</button>
            <button onClick={() => onAplicar(p.id)} disabled={!conectado} style={{ background: 'none', border: 'none', fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>{t('rgb.apply')}</button>
            <button onClick={() => onBorrar(p.id)} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
