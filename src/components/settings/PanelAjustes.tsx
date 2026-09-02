import React, { useState } from 'react';
import { ACCENT_PRESETS } from '../../design';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { SOUND_PROFILES, playSound } from '../../utils/sound';
import { RGBSection } from './RGBSection';
import { SensorsSection } from './SensorsSection';
import { RemoteSection } from './RemoteSection';
import { GallerySection } from './GallerySection';
import { ToggleRow, SettingLabel } from './settingHelpers';
import { HelpAboutPanel } from '../help/HelpAboutPanel';
import type { Profile, RGBSettings, RGBStatus, SensorsSettings, RemoteSettings, SensorsStatus, SoundProfileId } from '../../types';

/**
 * El desplegable de la rueda dentada.
 *
 * Vivia dentro de `TitleBar` y era casi todo su tamaño: la barra tenia
 * complejidad 45 y de eso, la mayor parte era este panel. La barra en si son
 * seis botones; esto son doce apartados de configuracion que no tienen nada
 * que ver entre ellos.
 */

interface Props {
  accent: string;
  onAccentChange?: (color: string) => void;
  uiScale: number;
  onUiScaleChange?: (scale: number) => void;
  tileMode: 'square' | 'fill';
  onTileModeChange?: (m: 'square' | 'fill') => void;
  theme: 'dark' | 'light' | 'system';
  onThemeChange?: (t: 'dark' | 'light' | 'system') => void;
  language: 'es' | 'en' | 'system';
  onLanguageChange?: (l: 'es' | 'en' | 'system') => void;
  autostart: boolean;
  onAutostartToggle?: () => void;
  alwaysOnTop: boolean;
  onAlwaysOnTopToggle?: () => void;
  soundOnPress: boolean;
  onSoundToggle?: () => void;
  soundProfile: SoundProfileId;
  onSoundProfileChange?: (id: SoundProfileId) => void;
  rgbConfig?: RGBSettings;
  onRGBConfigChange?: (next: RGBSettings) => void;
  rgbStatus?: RGBStatus | null;
  sensorsConfig?: SensorsSettings;
  onSensorsConfigChange?: (next: SensorsSettings) => void;
  remoteConfig?: RemoteSettings;
  onRemoteConfigChange?: (next: RemoteSettings) => void;
  onImportarDeGaleria?: (p: Profile) => void;
  sensorsStatus?: SensorsStatus | null;
  profiles: Profile[];
  onSaveProfile?: (name: string) => void;
  onLoadProfile?: (id: string) => void;
  onDeleteProfile?: (id: string) => void;
  onReplayOnboarding?: () => void;
  newProfileName: string;
  setNewProfileName: (s: string) => void;
  panelRef: React.RefObject<HTMLDivElement>;
  /** Cerrar el panel. Al cargar un perfil se cierra solo: lo que se ve detras cambia entero. */
  onCerrar: () => void;
}

export function PanelAjustes({ accent: effectiveAccent, onAccentChange, uiScale, onUiScaleChange, tileMode, onTileModeChange, theme, onThemeChange, language, onLanguageChange, autostart, onAutostartToggle, alwaysOnTop, onAlwaysOnTopToggle, soundOnPress, onSoundToggle, soundProfile, onSoundProfileChange, rgbConfig, onRGBConfigChange, rgbStatus, sensorsConfig, onSensorsConfigChange, sensorsStatus, remoteConfig, onRemoteConfigChange, onImportarDeGaleria, profiles, onSaveProfile, onLoadProfile, onDeleteProfile, onReplayOnboarding, newProfileName, setNewProfileName, panelRef, onCerrar }: Props) {
  const VD = useTheme();
  const t = useT();

  return (
  <div
    ref={panelRef}
    style={{
      position: 'absolute', top: '100%', right: 0, zIndex: 200,
      background: VD.surface, border: `1px solid ${VD.borderStrong}`,
      borderRadius: `0 0 ${VD.radius.lg}px ${VD.radius.lg}px`, padding: 16, width: 260,
      boxShadow: VD.shadow.menu,
      display: 'flex', flexDirection: 'column', gap: 14,
      // Cap height so the panel never spills past the viewport bottom and
      // scroll for the rest. Required since RGB + Sensors + Profiles can
      // exceed window height on small screens.
      maxHeight: 'calc(100vh - 50px)',
      overflowY: 'auto',
    }}
  >
    {/* Accent color */}
    <div>
      <SettingLabel>{t('set.accent')}</SettingLabel>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <input
          type="color"
          value={effectiveAccent}
          onChange={(e) => onAccentChange?.(e.target.value)}
          style={{ width: 36, height: 28, border: `1px solid ${VD.border}`, cursor: 'pointer', padding: 2, background: 'none', borderRadius: VD.radius.sm }}
        />
        <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>{effectiveAccent}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {ACCENT_PRESETS.map(c => (
            <div key={c} onClick={() => onAccentChange?.(c)} style={{ width: 14, height: 14, borderRadius: '50%', background: c, cursor: 'pointer', border: c === effectiveAccent ? `2px solid ${VD.text}` : '2px solid transparent' }} />
          ))}
        </div>
      </div>
    </div>

    {/* UI Scale */}
    {onUiScaleChange && (
      <div>
        <SettingLabel>{t('set.scale')}</SettingLabel>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
          <button
            onClick={() => onUiScaleChange(Math.max(0.75, uiScale - 0.25))}
            style={{ width: 28, height: 28, background: VD.elevated, border: `1px solid ${VD.border}`, color: VD.text, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >−</button>
          <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text, flex: 1, textAlign: 'center', letterSpacing: 1 }}>
            {Math.round(uiScale * 100)}%
          </span>
          <button
            onClick={() => onUiScaleChange(Math.min(1.75, uiScale + 0.25))}
            style={{ width: 28, height: 28, background: VD.elevated, border: `1px solid ${VD.border}`, color: VD.text, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >+</button>
          {uiScale !== 1 && (
            <button
              onClick={() => onUiScaleChange(1)}
              style={{ padding: '0 8px', height: 28, background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 8, letterSpacing: 1 }}
            >RESET</button>
          )}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>{t('settings.scaleRange')}</div>
      </div>
    )}

    {/* Tile mode — square keeps StreamDeck aesthetic, fill maximizes cell size */}
    {onTileModeChange && (
      <div>
        <SettingLabel>{t('set.tiles')}</SettingLabel>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['square', 'fill'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onTileModeChange(m)}
              style={{
                flex: 1, padding: '6px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                background: tileMode === m ? VD.accentBg : VD.elevated,
                border: `1px solid ${tileMode === m ? effectiveAccent : VD.border}`,
                color: tileMode === m ? effectiveAccent : VD.textDim,
                fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
              }}
            >{t(m === 'square' ? 'settings.tile.square' : 'settings.tile.fill')}</button>
          ))}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4, lineHeight: 1.4 }}>
          {tileMode === 'square'
            ? t('settings.tile.squareHelp')
            : t('settings.tile.fillHelp')}
        </div>
      </div>
    )}

    {/* Theme */}
    {onThemeChange && (
      <div>
        <SettingLabel>{t('settings.theme')}</SettingLabel>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['dark', 'light', 'system'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onThemeChange(opt)}
              style={{
                flex: 1, padding: '5px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                background: theme === opt ? VD.accentBg : VD.elevated,
                border: `1px solid ${theme === opt ? effectiveAccent : VD.border}`,
                fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                color: theme === opt ? effectiveAccent : VD.textDim,
              }}
            >
              {opt === 'dark' ? t('settings.theme.dark') : opt === 'light' ? t('settings.theme.light') : t('settings.theme.system')}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Language */}
    {onLanguageChange && (
      <div>
        <SettingLabel>{t('settings.language')}</SettingLabel>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['system', 'es', 'en'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onLanguageChange(opt)}
              style={{
                flex: 1, padding: '5px 0', cursor: 'pointer', borderRadius: VD.radius.sm,
                background: language === opt ? VD.accentBg : VD.elevated,
                border: `1px solid ${language === opt ? effectiveAccent : VD.border}`,
                fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
                color: language === opt ? effectiveAccent : VD.textDim,
              }}
            >
              {t(`settings.language.${opt}`)}
            </button>
          ))}
        </div>
      </div>
    )}

    <div style={{ height: 1, background: VD.border }} />

    <ToggleRow label={t('settings.autostart')} value={autostart} accent={effectiveAccent} onClick={onAutostartToggle} />
    <ToggleRow label={t('settings.alwaysOnTop')} value={alwaysOnTop} accent={effectiveAccent} onClick={onAlwaysOnTopToggle} />
    <ToggleRow label={t('set.sound')} value={soundOnPress} accent={effectiveAccent} onClick={onSoundToggle} />

    {soundOnPress && (
      <div>
        <SettingLabel>{t('set.chime')}</SettingLabel>
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
          {SOUND_PROFILES.map((p) => {
            const isActive = p.id === soundProfile;
            return (
              <button
                key={p.id}
                onClick={() => { onSoundProfileChange?.(p.id); playSound(p.id); }}
                style={{
                  flex: '1 1 calc(50% - 2px)', padding: '5px 6px',
                  fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                  background: isActive ? VD.accentBg : VD.elevated,
                  border: `1px solid ${isActive ? effectiveAccent : VD.border}`,
                  color: isActive ? effectiveAccent : VD.textDim,
                  cursor: 'pointer', borderRadius: VD.radius.sm,
                }}
              >
                {t(p.label).toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
    )}

    <div style={{ height: 1, background: VD.border }} />

    {onRGBConfigChange && rgbConfig && (
      <>
        <div style={{ height: 1, background: VD.border }} />
        <RGBSection
          accent={effectiveAccent}
          config={rgbConfig}
          status={rgbStatus ?? null}
          onChange={onRGBConfigChange}
        />
      </>
    )}

    {onSensorsConfigChange && sensorsConfig && (
      <>
        <div style={{ height: 1, background: VD.border }} />
        <SensorsSection
          accent={effectiveAccent}
          config={sensorsConfig}
          status={sensorsStatus ?? null}
          onChange={onSensorsConfigChange}
        />
      </>
    )}

    {onRemoteConfigChange && remoteConfig && (
      <>
        <div style={{ height: 1, background: VD.border }} />
        <RemoteSection accent={effectiveAccent} config={remoteConfig} onChange={onRemoteConfigChange} />
      </>
    )}

    {onImportarDeGaleria && (
      <>
        <div style={{ height: 1, background: VD.border }} />
        <GallerySection accent={effectiveAccent} onImportar={onImportarDeGaleria} />
      </>
    )}

    <div style={{ height: 1, background: VD.border }} />

    <AjusteTactil accent={effectiveAccent} />

    <div style={{ height: 1, background: VD.border }} />

    {/* Profiles */}
    <div>
      <SettingLabel>{t('set.profiles')}</SettingLabel>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newProfileName.trim()) {
              onSaveProfile?.(newProfileName.trim());
              setNewProfileName('');
            }
          }}
          placeholder={t('set.profileName')}
          style={{
            flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
            padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
            outline: 'none', borderRadius: VD.radius.sm,
          }}
        />
        <button
          onClick={() => { if (newProfileName.trim()) { onSaveProfile?.(newProfileName.trim()); setNewProfileName(''); } }}
          style={{
            padding: '5px 10px', background: VD.accentBg, border: `1px solid ${effectiveAccent}`,
            fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', borderRadius: VD.radius.sm, letterSpacing: 1,
          }}
        >
          {t('ui.saveShort')}
        </button>
      </div>
      {profiles.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 130, overflowY: 'auto' }}>
          {profiles.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md, padding: '5px 8px' }}>
              <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <button onClick={() => { onLoadProfile?.(p.id); onCerrar(); }} style={{ background: 'none', border: 'none', fontFamily: VD.mono, fontSize: 8, color: effectiveAccent, cursor: 'pointer', padding: '2px 4px', letterSpacing: 0.5 }}>{t('ui.load')}</button>
              <button onClick={() => onDeleteProfile?.(p.id)} style={{ background: 'none', border: 'none', color: VD.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>
      )}
      {profiles.length === 0 && (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
          {t('set.noProfiles')}
        </div>
      )}
    </div>

    <div style={{ height: 1, background: VD.border }} />

    <HelpAboutPanel accent={effectiveAccent} onReplayOnboarding={onReplayOnboarding} />
  </div>
  );
}

/**
 * Botón que abre la herramienta de Windows para decir qué monitor es táctil.
 *
 * Sin ese mapeo, en un equipo con varias pantallas el tacto de la tableta mueve
 * el cursor en el monitor equivocado y el deck no responde donde se toca. No es
 * algo que VirtualDeck pueda resolver por su cuenta: el mapeo lo guarda Windows.
 *
 * Va en los ajustes y no como acción de un botón a propósito: es una
 * configuración de una sola vez, y hace falta **antes** de poder pulsar nada en
 * la pantalla que se va a usar.
 */
function AjusteTactil({ accent }: { accent: string }) {
  const VD = useTheme();
  const t = useT();
  const [fallo, setFallo] = useState(false);
  return (
    <div>
      <SettingLabel>{t('set.tablet')}</SettingLabel>
      <button
        onClick={async () => {
          const ok = await window.electronAPI?.app.tabletSettings();
          setFallo(ok === false);
        }}
        style={{
          width: '100%', marginTop: 6, padding: '6px 10px',
          background: VD.accentBg, border: `1px solid ${accent}`, color: accent,
          fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
          cursor: 'pointer', borderRadius: VD.radius.sm,
        }}
      >{t('set.tabletOpen')}</button>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: fallo ? VD.danger : VD.textMuted, lineHeight: 1.5, marginTop: 5 }}>
        {fallo ? t('set.tabletFailed') : t('set.tabletHelp')}
      </div>
    </div>
  );
}
