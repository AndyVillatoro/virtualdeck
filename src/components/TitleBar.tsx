import React, { useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import type { Profile, RGBSettings, RGBStatus, SensorsSettings, RemoteSettings, SensorsStatus, SoundProfileId } from '../types';
import { PanelAjustes } from './settings/PanelAjustes';
import { BotonesNavegacion } from './titlebar/BotonesNavegacion';
import { BotonAjustesConHint } from './titlebar/BotonAjustesConHint';
import { ControlesVentana } from './titlebar/ControlesVentana';
import { useClickOutsideSettings } from './titlebar/useClickOutsideSettings';

export interface TitleBarProps {
  showControls?: boolean;
  pageName?: string;
  accent?: string;
  autostart?: boolean;
  alwaysOnTop?: boolean;
  soundOnPress?: boolean;
  soundProfile?: SoundProfileId;
  profiles?: Profile[];
  onFullscreen?: () => void;
  onWallpaper?: () => void;
  onRGB?: () => void;
  onFloatingBar?: () => void;
  onConfigExport?: () => void;
  onConfigImport?: () => void;
  onAccentChange?: (color: string) => void;
  onAutostartToggle?: () => void;
  onAlwaysOnTopToggle?: () => void;
  onSoundToggle?: () => void;
  onSoundProfileChange?: (id: SoundProfileId) => void;
  onSaveProfile?: (name: string) => void;
  onLoadProfile?: (id: string) => void;
  onDeleteProfile?: (id: string) => void;
  // RGB integration
  rgbStatus?: RGBStatus | null;
  rgbConfig?: RGBSettings;
  onRGBConfigChange?: (next: RGBSettings) => void;
  // Sensors integration (LibreHardwareMonitor)
  sensorsConfig?: SensorsSettings;
  remoteConfig?: RemoteSettings;
  onRemoteConfigChange?: (next: RemoteSettings) => void;
  onImportarDeGaleria?: (p: Profile) => void;
  musicPanel?: { enabled: boolean; side: 'left' | 'right' };
  onMusicPanelChange?: (next: { enabled: boolean; side: 'left' | 'right' }) => void;
  sensorsStatus?: SensorsStatus | null;
  onSensorsConfigChange?: (next: SensorsSettings) => void;
  // 4.x — UI scale + theme
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  theme?: 'dark' | 'light' | 'system';
  onThemeChange?: (theme: 'dark' | 'light' | 'system') => void;
  language?: 'system' | 'es' | 'en';
  onLanguageChange?: (language: 'system' | 'es' | 'en') => void;
  tileMode?: 'square' | 'fill';
  onTileModeChange?: (mode: 'square' | 'fill') => void;
  onReplayOnboarding?: () => void;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  compact?: boolean;
}

export function TitleBar({
  showControls = true,
  pageName = '',
  accent,
  autostart = false,
  alwaysOnTop = false,
  soundOnPress = true,
  soundProfile = 'click',
  profiles = [],
  onFullscreen,
  onWallpaper,
  onRGB,
  onFloatingBar,
  onConfigExport,
  onConfigImport,
  onAccentChange,
  onAutostartToggle,
  onAlwaysOnTopToggle,
  onSoundToggle,
  onSoundProfileChange,
  onSaveProfile,
  onLoadProfile,
  onDeleteProfile,
  rgbStatus,
  rgbConfig,
  onRGBConfigChange,
  sensorsConfig,
  remoteConfig,
  onRemoteConfigChange,
  onImportarDeGaleria,
  musicPanel,
  onMusicPanelChange,
  sensorsStatus,
  onSensorsConfigChange,
  uiScale = 1,
  onUiScaleChange,
  theme = 'dark',
  onThemeChange,
  language = 'system',
  onLanguageChange,
  tileMode = 'square',
  onTileModeChange,
  onReplayOnboarding,
  hintsDismissed,
  onDismissHint,
  compact = false,
}: TitleBarProps) {
  const VD = useTheme();
  const effectiveAccent = accent ?? VD.accent;
  const [showSettings, setShowSettings] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const ruedaRef = useRef<HTMLButtonElement>(null);

  useClickOutsideSettings(showSettings, () => setShowSettings(false), panelRef, ruedaRef);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          height: compact ? 26 : 36, display: 'flex', alignItems: 'center',
          padding: compact ? '0 8px' : '0 14px', gap: compact ? 6 : 10,
          borderBottom: `1px solid ${VD.border}`,
          fontFamily: VD.mono, fontSize: compact ? 10 : 11, color: VD.textDim,
          background: VD.surface,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div style={{ width: compact ? 5 : 6, height: compact ? 5 : 6, borderRadius: '50%', background: effectiveAccent }} />
          <span style={{ color: VD.text, letterSpacing: compact ? 1 : 2, fontSize: compact ? 9 : 10 }}>VIRTUALDECK</span>
        </div>
        {pageName && (
          <>
            <div style={{ width: 1, height: compact ? 10 : 14, background: VD.border }} />
            <span style={{ fontSize: compact ? 9 : 10, letterSpacing: 1, color: VD.textMuted }}>{pageName}</span>
          </>
        )}
        <div style={{ flex: 1 }} />

        {showControls && (
          <div style={{ display: 'flex', gap: compact ? 2 : 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <BotonesNavegacion
              effectiveAccent={effectiveAccent}
              onConfigExport={onConfigExport}
              onConfigImport={onConfigImport}
              onFloatingBar={onFloatingBar}
              onWallpaper={onWallpaper}
              onRGB={onRGB}
              rgbStatus={rgbStatus}
              compact={compact}
            />
            <BotonAjustesConHint
              ruedaRef={ruedaRef}
              showSettings={showSettings}
              onToggle={() => setShowSettings((v) => !v)}
              effectiveAccent={effectiveAccent}
              hintsDismissed={hintsDismissed}
              onDismissHint={onDismissHint}
              compact={compact}
            />
            <ControlesVentana onFullscreen={onFullscreen} compact={compact} />
          </div>
        )}
      </div>

      {showSettings && (
        <PanelAjustes
          accent={effectiveAccent}
          onAccentChange={onAccentChange}
          uiScale={uiScale}
          onUiScaleChange={onUiScaleChange}
          tileMode={tileMode}
          onTileModeChange={onTileModeChange}
          theme={theme}
          onThemeChange={onThemeChange}
          language={language}
          onLanguageChange={onLanguageChange}
          autostart={autostart}
          onAutostartToggle={onAutostartToggle}
          alwaysOnTop={alwaysOnTop}
          onAlwaysOnTopToggle={onAlwaysOnTopToggle}
          soundOnPress={soundOnPress}
          onSoundToggle={onSoundToggle}
          soundProfile={soundProfile}
          onSoundProfileChange={onSoundProfileChange}
          rgbConfig={rgbConfig}
          onRGBConfigChange={onRGBConfigChange}
          rgbStatus={rgbStatus}
          sensorsConfig={sensorsConfig}
          remoteConfig={remoteConfig}
          onRemoteConfigChange={onRemoteConfigChange}
          onImportarDeGaleria={onImportarDeGaleria}
          musicPanel={musicPanel}
          onMusicPanelChange={onMusicPanelChange}
          onSensorsConfigChange={onSensorsConfigChange}
          sensorsStatus={sensorsStatus}
          profiles={profiles}
          onSaveProfile={onSaveProfile}
          onLoadProfile={onLoadProfile}
          onDeleteProfile={onDeleteProfile}
          onReplayOnboarding={onReplayOnboarding}
          newProfileName={newProfileName}
          setNewProfileName={setNewProfileName}
          panelRef={panelRef}
          onCerrar={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
