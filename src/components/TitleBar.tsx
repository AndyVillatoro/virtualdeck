import React, { useEffect, useRef, useState } from 'react';
import type { VDTokens } from '../design';
import { useTheme } from '../utils/theme';
import type { Profile, RGBSettings, RGBStatus, SensorsSettings, SensorsStatus, SoundProfileId } from '../types';
import { PanelAjustes } from './settings/PanelAjustes';
import { Hint } from './Hint';
import { useT } from '../utils/i18n';

interface TitleBarProps {
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
  onConfigImportFromUrl?: (url: string) => void;
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
  onConfigImportFromUrl,
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
}: TitleBarProps) {
  const VD = useTheme();
  const btnStyle = estilo_btnStyle(VD);
  const iconBtnStyle = estilo_iconBtnStyle(VD);
  const t = useT();
  const effectiveAccent = accent ?? VD.accent;
  const [showSettings, setShowSettings] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [galleryUrl, setGalleryUrl] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const ruedaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showSettings) return;
    const cerrar = (e: MouseEvent) => {
      const donde = e.target as Node;
      if (panelRef.current?.contains(donde)) return;
      // La propia rueda queda fuera: si no, este `mousedown` cerraba el panel
      // y el `onClick` del boton lo volvia a abrir un instante despues. El
      // resultado era que pulsar la rueda con el panel abierto no hacia nada.
      if (ruedaRef.current?.contains(donde)) return;
      setShowSettings(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [showSettings]);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          height: 36, display: 'flex', alignItems: 'center',
          padding: '0 14px', gap: 10,
          borderBottom: `1px solid ${VD.border}`,
          fontFamily: VD.mono, fontSize: 11, color: VD.textDim,
          background: VD.surface,
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: effectiveAccent }} />
          <span style={{ color: VD.text, letterSpacing: 2, fontSize: 10 }}>VIRTUALDECK</span>
        </div>
        {pageName && (
          <>
            <div style={{ width: 1, height: 14, background: VD.border }} />
            <span style={{ fontSize: 10, letterSpacing: 1, color: VD.textMuted }}>{pageName}</span>
          </>
        )}
        <div style={{ flex: 1 }} />

        {showControls && (
          <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {onConfigExport && (
              <button onClick={onConfigExport} style={btnStyle} title={t('tip.export')}>↗ EXP</button>
            )}
            {onConfigImport && (
              <button onClick={onConfigImport} style={btnStyle} title={t('tip.import')}>↙ IMP</button>
            )}
            {onFloatingBar && (
              <button onClick={onFloatingBar} title={t('tip.bar')} style={btnStyle}>{t('bar.short')}</button>
            )}
            {onWallpaper && (
              <button onClick={onWallpaper} style={btnStyle}>{t('ui.wallpaper')}</button>
            )}
            {/* Conectado se marca con el acento, no con el verde del tema: es
                el mismo criterio que la barra de activo de las celdas. */}
            {onRGB && (
              <button onClick={onRGB} title={t('tip.rgb')} style={{ ...btnStyle, borderColor: rgbStatus?.connected ? effectiveAccent : VD.border }}>
                <span style={{ marginRight: 4, color: rgbStatus?.connected ? effectiveAccent : VD.textMuted }}>●</span>RGB
              </button>
            )}
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                ref={ruedaRef}
                onClick={() => setShowSettings(v => !v)}
                title={t('tip.settings')}
                style={{ ...iconBtnStyle, color: showSettings ? effectiveAccent : VD.textDim }}
              >
                ⚙
              </button>
              {onDismissHint && !showSettings && (
                <Hint
                  id="settings"
                  textKey="hint.settings"
                  dismissed={hintsDismissed}
                  onDismiss={onDismissHint}
                  accent={effectiveAccent}
                  style={{ top: '100%', right: 0, marginTop: 8 }}
                />
              )}
            </span>
            {onFullscreen && (
              <button onClick={onFullscreen} title={t('tip.fullscreen')} style={iconBtnStyle}>⤢</button>
            )}
            <button onClick={() => window.electronAPI?.window.minimize()} title={t('tip.minimize')} style={iconBtnStyle}>—</button>
            <button onClick={() => window.electronAPI?.window.close()} title={t('tip.close')} style={{ ...iconBtnStyle, color: VD.danger }}>×</button>
          </div>
        )}
      </div>

      {/* Settings flyout */}
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
          onSensorsConfigChange={onSensorsConfigChange}
          sensorsStatus={sensorsStatus}
          onConfigImportFromUrl={onConfigImportFromUrl}
          profiles={profiles}
          onSaveProfile={onSaveProfile}
          onLoadProfile={onLoadProfile}
          onDeleteProfile={onDeleteProfile}
          onReplayOnboarding={onReplayOnboarding}
          newProfileName={newProfileName}
          setNewProfileName={setNewProfileName}
          galleryUrl={galleryUrl}
          setGalleryUrl={setGalleryUrl}
          panelRef={panelRef}
          onCerrar={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}


function estilo_btnStyle(VD: VDTokens): React.CSSProperties {
  return {
    height: 22, padding: '0 8px',
    display: 'flex', alignItems: 'center',
    fontSize: 9, letterSpacing: 1, color: VD.textDim,
    background: 'transparent', border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm, cursor: 'pointer',
  };
}

function estilo_iconBtnStyle(VD: VDTokens): React.CSSProperties {
  return {
    width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, color: VD.textDim,
    background: 'transparent', border: 'none', borderRadius: VD.radius.sm, cursor: 'pointer',
  };
}
