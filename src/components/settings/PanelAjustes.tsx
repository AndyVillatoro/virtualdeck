import React, { useState } from 'react';
import { ACCENT_PRESETS } from '../../design';
import { useTheme } from '../../utils/theme';
import { Chip, Segmentado } from '../ui/Chip';
import { BotonIcono } from '../ui/BotonIcono';
import { useT } from '../../utils/i18n';
import { SOUND_PROFILES, playSound } from '../../utils/sound';
import { SeccionAjustes } from './SeccionAjustes';
import { SeccionPerfiles } from './SeccionPerfiles';
import { RGBSection } from './RGBSection';
import { SensorsSection } from './SensorsSection';
import { RemoteSection } from './RemoteSection';
import { GallerySection } from './GallerySection';
import { DisplaysSection } from './DisplaysSection';
import { ToggleRow, SettingLabel } from './settingHelpers';
import { HelpAboutPanel } from '../help/HelpAboutPanel';
import { SoporteSection } from './SoporteSection';
import { SeccionIntegraciones } from './SeccionIntegraciones';
import type { Profile, PageConfig, ButtonConfig, OrigenInstalacion, RGBSettings, RGBStatus, SensorsSettings, RemoteSettings, SensorsStatus, SoundProfileId, ThemeMode } from '../../types';

interface Props {
  accent: string;
  onAccentChange?: (color: string) => void;
  uiScale: number;
  onUiScaleChange?: (scale: number) => void;
  tileMode: 'square' | 'fill';
  onTileModeChange?: (m: 'square' | 'fill') => void;
  theme: ThemeMode;
  onThemeChange?: (t: ThemeMode) => void;
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
  onImportarDeGaleria?: (p: Profile, agregarAlDeck?: boolean) => void;
  /** Tienda (T-P4): agrega una página suelta; devuelve atajos limpiados por choque. */
  onAppendPageFromGallery?: (page: PageConfig, buttons: ButtonConfig[], origen?: OrigenInstalacion) => number;
  musicPanel?: { enabled: boolean; side: 'left' | 'right' };
  onMusicPanelChange?: (next: { enabled: boolean; side: 'left' | 'right' }) => void;
  sensorsStatus?: SensorsStatus | null;
  profiles: Profile[];
  onSaveProfile?: (name: string) => void;
  onLoadProfile?: (id: string) => void;
  onAppendProfilePages?: (id: string) => void;
  onDeleteProfile?: (id: string) => void;
  onUpdateProfileTargetApp?: (id: string, targetApp: string) => void;
  autoProfileSwitch?: boolean;
  onAutoProfileSwitchToggle?: () => void;
  autoProfileRestoreDefault?: boolean;
  onAutoProfileRestoreDefaultToggle?: () => void;
  targetDisplayId?: number;
  onTargetDisplayChange?: (displayId: number | undefined) => void;
  onReplayOnboarding?: () => void;
  newProfileName: string;
  setNewProfileName: (s: string) => void;
  panelRef: React.RefObject<HTMLDivElement>;
  /** Cerrar el panel. Al cargar un perfil se cierra solo: lo que se ve detras cambia entero. */
  onCerrar: () => void;
}

export function PanelAjustes({
  accent: effectiveAccent, onAccentChange, uiScale, onUiScaleChange, tileMode, onTileModeChange,
  theme, onThemeChange, language, onLanguageChange, autostart, onAutostartToggle,
  alwaysOnTop, onAlwaysOnTopToggle, soundOnPress, onSoundToggle, soundProfile, onSoundProfileChange,
  rgbConfig, onRGBConfigChange, rgbStatus, sensorsConfig, onSensorsConfigChange, sensorsStatus,
  remoteConfig, onRemoteConfigChange, onImportarDeGaleria, onAppendPageFromGallery, onAppendProfilePages, musicPanel, onMusicPanelChange,
  profiles, onSaveProfile, onLoadProfile, onDeleteProfile, onUpdateProfileTargetApp,
  autoProfileSwitch, onAutoProfileSwitchToggle, autoProfileRestoreDefault, onAutoProfileRestoreDefaultToggle,
  targetDisplayId, onTargetDisplayChange, onReplayOnboarding, newProfileName, setNewProfileName,
  panelRef, onCerrar,
}: Props) {
  const VD = useTheme();
  const t = useT();
  const [spotifyToken, setSpotifyToken] = useState<string>(() => {
    return (typeof localStorage !== 'undefined' ? localStorage.getItem('vd-spotify-token') : '') || '';
  });

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', top: '100%', right: 0, zIndex: 200,
        background: VD.surface, border: `1px solid ${VD.borderStrong}`,
        borderRadius: `0 0 ${VD.radius.lg}px ${VD.radius.lg}px`, padding: 12,
        // Ancho tope con margen de seguridad: en ventanas angostas el panel
        // fijo de 280px se salía del viewport y cortaba el contenido.
        width: 'min(280px, calc(100vw - 16px))',
        boxShadow: VD.shadow.menu,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 'calc(100vh - 50px)',
        overflowY: 'auto',
      }}
    >
      {/* 1. Aspecto y Tema */}
      <SeccionAjustes titulo={t('set.appearance')} glyph="SLIDERS" accent={effectiveAccent} defaultAbierto={true}>
        <div>
          <SettingLabel>{t('set.accent')}</SettingLabel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <input
              type="color"
              value={effectiveAccent}
              onChange={(e) => onAccentChange?.(e.target.value)}
              style={{ width: 34, height: 26, border: `1px solid ${VD.border}`, cursor: 'pointer', padding: 2, background: 'none', borderRadius: VD.radius.sm }}
            />
            <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim }}>{effectiveAccent}</span>
            <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', flexWrap: 'wrap', maxWidth: 140, justifyContent: 'flex-end' }}>
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onAccentChange?.(c)}
                  title={c}
                  aria-pressed={c === effectiveAccent}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    cursor: 'pointer',
                    border: c === effectiveAccent ? `2px solid ${VD.text}` : '1px solid transparent',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {onUiScaleChange && (
          <div>
            <SettingLabel>{t('set.scale')}</SettingLabel>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
              <BotonIcono
                glifo="SUBTRACT"
                title={t('set.scaleDown')}
                onClick={() => onUiScaleChange(Math.max(0.75, uiScale - 0.25))}
                tamano={26}
                tamanoGlifo={7}
                conMarco
              />
              <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text, flex: 1, textAlign: 'center', letterSpacing: 1 }}>
                {Math.round(uiScale * 100)}%
              </span>
              <BotonIcono
                glifo="ADD"
                title={t('set.scaleUp')}
                onClick={() => onUiScaleChange(Math.min(1.75, uiScale + 0.25))}
                tamano={26}
                tamanoGlifo={7}
                conMarco
              />
              {uiScale !== 1 && (
                <button
                  type="button"
                  onClick={() => onUiScaleChange(1)}
                  style={{ padding: '0 6px', height: 26, background: 'none', border: `1px solid ${VD.border}`, color: VD.textMuted, cursor: 'pointer', borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 7, letterSpacing: 1 }}
                >{t('set.scaleReset')}</button>
              )}
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4 }}>{t('settings.scaleRange')}</div>
          </div>
        )}

        {onTileModeChange && (
          <div>
            <SettingLabel>{t('set.tiles')}</SettingLabel>
            <div style={{ marginTop: 6 }}>
              <Segmentado
                repartir
                accent={effectiveAccent}
                etiquetaGrupo={t('set.tiles')}
                valor={tileMode}
                onChange={onTileModeChange}
                opciones={[
                  { valor: 'square', etiqueta: t('settings.tile.square') },
                  { valor: 'fill', etiqueta: t('settings.tile.fill') },
                ]}
              />
            </div>
          </div>
        )}

        {onThemeChange && (
          <div>
            <SettingLabel>{t('settings.theme')}</SettingLabel>
            <div style={{ marginTop: 8 }}>
              <Segmentado
                repartir
                accent={effectiveAccent}
                etiquetaGrupo={t('settings.theme')}
                valor={theme}
                onChange={onThemeChange}
                opciones={(['dark', 'light', 'system'] as const).map((opt) => ({ valor: opt, etiqueta: t(`settings.theme.${opt}`) }))}
              />
            </div>
          </div>
        )}

        {onLanguageChange && (
          <div>
            <SettingLabel>{t('settings.language')}</SettingLabel>
            <div style={{ marginTop: 8 }}>
              <Segmentado
                repartir
                accent={effectiveAccent}
                etiquetaGrupo={t('settings.language')}
                valor={language}
                onChange={onLanguageChange}
                opciones={(['system', 'es', 'en'] as const).map((opt) => ({ valor: opt, etiqueta: t(`settings.language.${opt}`) }))}
              />
            </div>
          </div>
        )}
      </SeccionAjustes>

      {/* 2. Sistema y Ventana */}
      <SeccionAjustes titulo={t('set.system')} glyph="APP_WINDOW" accent={effectiveAccent}>
        <ToggleRow label={t('settings.autostart')} value={autostart} accent={effectiveAccent} onClick={onAutostartToggle} />
        <ToggleRow label={t('settings.alwaysOnTop')} value={alwaysOnTop} accent={effectiveAccent} onClick={onAlwaysOnTopToggle} />
        <AjusteTactil accent={effectiveAccent} />
      </SeccionAjustes>

      {/* 3. Audio y Timbre */}
      <SeccionAjustes titulo={t('set.sound')} glyph="SPEAKER" accent={effectiveAccent}>
        <ToggleRow label={t('set.sound')} value={soundOnPress} accent={effectiveAccent} onClick={onSoundToggle} />

        {soundOnPress && (
          <div>
            <SettingLabel>{t('set.chime')}</SettingLabel>
            <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
              {SOUND_PROFILES.map((p) => {
                const isActive = p.id === soundProfile;
                return (
                  <Chip
                    key={p.id}
                    activo={isActive}
                    onClick={() => { onSoundProfileChange?.(p.id); playSound(p.id); }}
                    accent={effectiveAccent}
                    ancho
                    style={{ flex: '1 1 calc(50% - 2px)' }}
                  >
                    {t(p.label).toUpperCase()}
                  </Chip>
                );
              })}
            </div>
          </div>
        )}

        {onMusicPanelChange && musicPanel && (
          <div style={{ marginTop: 6, borderTop: `1px solid ${VD.border}`, paddingTop: 8 }}>
            <SettingLabel>{t('set.musicPanel')}</SettingLabel>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ToggleRow
                label={t('set.enabled')}
                value={musicPanel.enabled}
                accent={effectiveAccent}
                onClick={() => onMusicPanelChange({ ...musicPanel, enabled: !musicPanel.enabled })}
              />
              <Segmentado
                repartir
                accent={effectiveAccent}
                valor={musicPanel.side}
                onChange={(s) => onMusicPanelChange({ ...musicPanel, side: s })}
                opciones={[
                  { valor: 'left', etiqueta: t('ui.left') },
                  { valor: 'right', etiqueta: t('ui.right') },
                ]}
              />
            </div>
          </div>
        )}
      </SeccionAjustes>

      {/* 4. Pantallas y Monitores */}
      <SeccionAjustes titulo={t('set.monitors')} glyph="MONITOR" accent={effectiveAccent}>
        <DisplaysSection
          accent={effectiveAccent}
          targetDisplayId={targetDisplayId}
          onTargetDisplayChange={onTargetDisplayChange}
        />
      </SeccionAjustes>

      {/* 5. Perfiles y Automatización */}
      <SeccionAjustes titulo={t('set.profiles')} glyph="FOLDER" accent={effectiveAccent}>
        <SeccionPerfiles
          effectiveAccent={effectiveAccent}
          profiles={profiles}
          newProfileName={newProfileName}
          setNewProfileName={setNewProfileName}
          onSaveProfile={onSaveProfile}
          onLoadProfile={onLoadProfile}
          onAppendProfilePages={onAppendProfilePages}
          onDeleteProfile={onDeleteProfile}
          onUpdateProfileTargetApp={onUpdateProfileTargetApp}
          autoProfileSwitch={autoProfileSwitch}
          onAutoProfileSwitchToggle={onAutoProfileSwitchToggle}
          autoProfileRestoreDefault={autoProfileRestoreDefault}
          onAutoProfileRestoreDefaultToggle={onAutoProfileRestoreDefaultToggle}
          onCerrar={onCerrar}
        />
      </SeccionAjustes>

      {/* 6. Iluminación RGB (opcional) */}
      {onRGBConfigChange && rgbConfig && (
        <SeccionAjustes titulo={t('set.rgb')} glyph="DOTS" accent={effectiveAccent}>
          <RGBSection
            accent={effectiveAccent}
            config={rgbConfig}
            status={rgbStatus ?? null}
            onChange={onRGBConfigChange}
          />
        </SeccionAjustes>
      )}

      {/* 7. Sensores de Hardware (opcional) */}
      {onSensorsConfigChange && sensorsConfig && (
        <SeccionAjustes titulo={t('set.sensors')} glyph="CPU" accent={effectiveAccent}>
          <SensorsSection
            accent={effectiveAccent}
            config={sensorsConfig}
            status={sensorsStatus ?? null}
            onChange={onSensorsConfigChange}
          />
        </SeccionAjustes>
      )}

      {/* 8. Mando Móvil y Servidor Web (opcional) */}
      {onRemoteConfigChange && remoteConfig && (
        <SeccionAjustes titulo={t('set.remote')} glyph="WEB" accent={effectiveAccent}>
          <RemoteSection accent={effectiveAccent} config={remoteConfig} onChange={onRemoteConfigChange} />
        </SeccionAjustes>
      )}

      {/* 9. Galería de Perfiles (opcional) */}
      {onImportarDeGaleria && (
        <SeccionAjustes titulo={t('set.gallery')} glyph="DOWNLOAD" accent={effectiveAccent}>
          <GallerySection accent={effectiveAccent} onImportar={onImportarDeGaleria} onAppendPage={onAppendPageFromGallery} />
        </SeccionAjustes>
      )}

      {/* 10. Integraciones de Terceros (Discord & Spotify) */}
      <SeccionAjustes titulo={t('settings.integrations')} glyph="AUDIO_WAVE" accent={effectiveAccent}>
        <SeccionIntegraciones
          spotifyToken={spotifyToken}
          onSpotifyTokenChange={(tok) => {
            setSpotifyToken(tok);
            if (typeof localStorage !== 'undefined') {
              if (tok) localStorage.setItem('vd-spotify-token', tok);
              else localStorage.removeItem('vd-spotify-token');
            }
          }}
        />
      </SeccionAjustes>

      {/* 11. Soporte y Donaciones */}
      <SeccionAjustes titulo={t('set.support')} glyph="HEART" accent={effectiveAccent}>
        <SoporteSection accent={effectiveAccent} />
      </SeccionAjustes>

      {/* 12. Ayuda y Acerca de */}
      <SeccionAjustes titulo={t('help.title')} glyph="INFO" accent={effectiveAccent}>
        <HelpAboutPanel accent={effectiveAccent} onReplayOnboarding={onReplayOnboarding} />
      </SeccionAjustes>
    </div>
  );
}

function AjusteTactil({ accent }: { accent: string }) {
  const VD = useTheme();
  const t = useT();
  const [fallo, setFallo] = useState(false);
  return (
    <div style={{ marginTop: 4 }}>
      <SettingLabel>{t('set.tablet')}</SettingLabel>
      <button
        onClick={async () => {
          const ok = await window.electronAPI?.app.tabletSettings();
          setFallo(ok === false);
        }}
        style={{
          width: '100%', marginTop: 6, padding: '5px 8px',
          background: VD.accentBg, border: `1px solid ${accent}`, color: accent,
          fontFamily: VD.mono, fontSize: 8, letterSpacing: 1,
          cursor: 'pointer', borderRadius: VD.radius.sm,
        }}
      >{t('set.tabletOpen')}</button>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: fallo ? VD.danger : VD.textMuted, lineHeight: 1.4, marginTop: 4 }}>
        {fallo ? t('set.tabletFailed') : t('set.tabletHelp')}
      </div>
    </div>
  );
}
