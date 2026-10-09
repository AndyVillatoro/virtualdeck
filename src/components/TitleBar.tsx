import React, { useRef, useState } from 'react';
import { useTheme } from '../utils/theme';
import type { Profile, RGBSettings, RGBStatus, SensorsSettings, RemoteSettings, SensorsStatus, SoundProfileId, ThemeMode } from '../types';
import { PanelAjustes } from './settings/PanelAjustes';
import { FranjaSuperior } from './titlebar/FranjaSuperior';
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
  onDispositivos?: () => void;
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
  onAppendProfilePages?: (id: string) => void;
  onDeleteProfile?: (id: string) => void;
  // RGB integration
  rgbStatus?: RGBStatus | null;
  rgbConfig?: RGBSettings;
  onRGBConfigChange?: (next: RGBSettings) => void;
  // Sensors integration (LibreHardwareMonitor)
  sensorsConfig?: SensorsSettings;
  remoteConfig?: RemoteSettings;
  onRemoteConfigChange?: (next: RemoteSettings) => void;
  musicPanel?: { enabled: boolean; side: 'left' | 'right' };
  onMusicPanelChange?: (next: { enabled: boolean; side: 'left' | 'right' }) => void;
  sensorsStatus?: SensorsStatus | null;
  onSensorsConfigChange?: (next: SensorsSettings) => void;
  // 4.x — UI scale + theme
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  language?: 'system' | 'es' | 'en';
  onLanguageChange?: (language: 'system' | 'es' | 'en') => void;
  tileMode?: 'square' | 'fill';
  onTileModeChange?: (mode: 'square' | 'fill') => void;
  onReplayOnboarding?: () => void;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  compact?: boolean;
  autoProfileSwitch?: boolean;
  onAutoProfileSwitchToggle?: () => void;
  autoProfileRestoreDefault?: boolean;
  onAutoProfileRestoreDefaultToggle?: () => void;
  targetDisplayId?: number;
  onTargetDisplayChange?: (displayId: number | undefined) => void;
  onUpdateProfileTargetApp?: (id: string, targetApp: string) => void;
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
  onDispositivos,
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
  onAppendProfilePages,
  onDeleteProfile,
  rgbStatus,
  rgbConfig,
  onRGBConfigChange,
  sensorsConfig,
  remoteConfig,
  onRemoteConfigChange,
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
  autoProfileSwitch,
  onAutoProfileSwitchToggle,
  autoProfileRestoreDefault,
  onAutoProfileRestoreDefaultToggle,
  targetDisplayId,
  onTargetDisplayChange,
  onUpdateProfileTargetApp,
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
      <FranjaSuperior
        compact={compact}
        effectiveAccent={effectiveAccent}
        pageName={pageName}
        showControls={showControls}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        ruedaRef={ruedaRef}
        onFloatingBar={onFloatingBar}
        onWallpaper={onWallpaper}
        onRGB={onRGB}
        onDispositivos={onDispositivos}
        rgbStatus={rgbStatus}
        hintsDismissed={hintsDismissed}
        onDismissHint={onDismissHint}
        onFullscreen={onFullscreen}
      />

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
          musicPanel={musicPanel}
          onMusicPanelChange={onMusicPanelChange}
          onSensorsConfigChange={onSensorsConfigChange}
          sensorsStatus={sensorsStatus}
          profiles={profiles}
          onSaveProfile={onSaveProfile}
          onLoadProfile={onLoadProfile}
          onAppendProfilePages={onAppendProfilePages}
          onDeleteProfile={onDeleteProfile}
          onConfigExport={onConfigExport}
          onConfigImport={onConfigImport}
          onUpdateProfileTargetApp={onUpdateProfileTargetApp}
          autoProfileSwitch={autoProfileSwitch}
          onAutoProfileSwitchToggle={onAutoProfileSwitchToggle}
          autoProfileRestoreDefault={autoProfileRestoreDefault}
          onAutoProfileRestoreDefaultToggle={onAutoProfileRestoreDefaultToggle}
          targetDisplayId={targetDisplayId}
          onTargetDisplayChange={onTargetDisplayChange}
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
