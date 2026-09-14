import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { SettingLabel, ToggleRow } from './settingHelpers';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import type { Profile } from '../../types';

interface SeccionPerfilesProps {
  effectiveAccent: string;
  profiles: Profile[];
  newProfileName: string;
  setNewProfileName: (s: string) => void;
  onSaveProfile?: (name: string) => void;
  onLoadProfile?: (id: string) => void;
  onAppendProfilePages?: (id: string) => void;
  onDeleteProfile?: (id: string) => void;
  onUpdateProfileTargetApp?: (id: string, targetApp: string) => void;
  autoProfileSwitch?: boolean;
  onAutoProfileSwitchToggle?: () => void;
  autoProfileRestoreDefault?: boolean;
  onAutoProfileRestoreDefaultToggle?: () => void;
  onCerrar: () => void;
}

export function SeccionPerfiles({
  effectiveAccent,
  profiles,
  newProfileName,
  setNewProfileName,
  onSaveProfile,
  onLoadProfile,
  onAppendProfilePages,
  onDeleteProfile,
  onUpdateProfileTargetApp,
  autoProfileSwitch,
  onAutoProfileSwitchToggle,
  autoProfileRestoreDefault,
  onAutoProfileRestoreDefaultToggle,
  onCerrar,
}: SeccionPerfilesProps) {
  const VD = useTheme();
  const t = useT();

  const handleSave = () => {
    const trimmed = newProfileName.trim();
    if (!trimmed) return;
    onSaveProfile?.(trimmed);
    setNewProfileName('');
  };

  return (
    <>
      <div>
        <SettingLabel>{t('set.profiles')}</SettingLabel>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
            placeholder={t('set.profileName')}
            style={{
              flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
              padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 8,
              outline: 'none', borderRadius: VD.radius.sm,
            }}
          />
          <button
            onClick={handleSave}
            style={{
              padding: '5px 8px', background: VD.accentBg, border: `1px solid ${effectiveAccent}`,
              fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
            }}
          >
            {t('ui.saveShort')}
          </button>
        </div>

        {profiles.length > 0 ? (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
            {profiles.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '5px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <button onClick={() => { onLoadProfile?.(p.id); onCerrar(); }} style={{ background: 'none', border: 'none', fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>{t('ui.load')}</button>
                  <button onClick={() => { onAppendProfilePages?.(p.id); onCerrar(); }} title={t('ui.appendPagesHint')} style={{ background: VD.accentBg, border: `1px solid ${effectiveAccent}`, fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', padding: '2px 5px', borderRadius: VD.radius.sm, letterSpacing: 0.5 }}>{t('ui.appendPages')}</button>
                  <button onClick={() => onDeleteProfile?.(p.id)} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                    <DotGlyphIcon glyph="CLOSE" size={7} color={VD.danger} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DotGlyphIcon glyph="APP_WINDOW" size={7} color={p.targetApp ? effectiveAccent : VD.textMuted} />
                  <input
                    value={p.targetApp ?? ''}
                    onChange={(e) => onUpdateProfileTargetApp?.(p.id, e.target.value)}
                    placeholder={t('set.profileTargetApp')}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      borderBottom: `1px solid ${p.targetApp ? effectiveAccent : VD.border}`,
                      fontFamily: VD.mono, fontSize: 8, color: p.targetApp ? effectiveAccent : VD.textDim,
                      outline: 'none', padding: '1px 2px',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 6 }}>
            {t('set.noProfiles')}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, borderTop: `1px solid ${VD.border}`, paddingTop: 8 }}>
        <SettingLabel>{t('set.autoProfiles')}</SettingLabel>
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ToggleRow
            label={t('set.autoProfileSwitch')}
            value={autoProfileSwitch ?? true}
            accent={effectiveAccent}
            onClick={onAutoProfileSwitchToggle}
          />
          <ToggleRow
            label={t('set.autoProfileRestoreDefault')}
            value={autoProfileRestoreDefault ?? false}
            accent={effectiveAccent}
            onClick={onAutoProfileRestoreDefaultToggle}
          />
        </div>
      </div>
    </>
  );
}

