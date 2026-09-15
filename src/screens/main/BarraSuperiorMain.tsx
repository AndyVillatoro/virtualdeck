import React from 'react';
import { TitleBar } from '../../components/TitleBar';
import type { DeckConfig, Profile } from '../../types';

type PropsTitleBar = React.ComponentProps<typeof TitleBar>;

interface BarraSuperiorMainProps extends Pick<PropsTitleBar,
  'autostart' | 'soundOnPress' | 'soundProfile' | 'rgbStatus' | 'sensorsStatus'
  | 'onFullscreen' | 'onWallpaper' | 'onRGB'
  | 'onConfigExport' | 'onConfigImport'
  | 'onAutostartToggle' | 'onSoundToggle' | 'onSoundProfileChange'
  | 'onSaveProfile' | 'onLoadProfile' | 'onAppendProfilePages' | 'onDeleteProfile'
  | 'uiScale' | 'onUiScaleChange' | 'alwaysOnTop' | 'onAlwaysOnTopToggle'
  | 'onFloatingBar' | 'theme' | 'onThemeChange' | 'language' | 'onLanguageChange'
  | 'hintsDismissed' | 'onDismissHint' | 'onReplayOnboarding' | 'onAppendPageFromGallery'
> {
  config: DeckConfig;
  panelMusica: { enabled: boolean; side: 'left' | 'right' };
  compact: boolean;
  onConfigChange: (c: DeckConfig) => void;
  onAppendPagesFromProfile: (p: Profile) => void;
}

/**
 * Barra superior de la pantalla principal: `TitleBar` con todo su cableado
 * de configuración. Era el bloque JSX más largo de `MainB` (~10 ramas entre
 * `??` y callbacks).
 */
export function BarraSuperiorMain(props: BarraSuperiorMainProps) {
  const { config, panelMusica, compact, onConfigChange, onAppendPagesFromProfile, ...resto } = props;
  return (
    <TitleBar
      pageName=""
      accent={config.accent}
      profiles={config.profiles ?? []}
      rgbConfig={config.rgb}
      onRGBConfigChange={(rgb) => onConfigChange({ ...config, rgb })}
      sensorsConfig={config.sensors ?? { enabled: false, host: '127.0.0.1', port: 8085 }}
      onSensorsConfigChange={(sensors) => onConfigChange({ ...config, sensors })}
      remoteConfig={config.remote ?? { enabled: false, port: 8787, token: '', allowLan: false }}
      onRemoteConfigChange={(remote) => onConfigChange({ ...config, remote })}
      onImportarDeGaleria={(p, agregarAlDeck) => {
        onConfigChange({ ...config, profiles: [...(config.profiles ?? []), p] });
        if (agregarAlDeck) onAppendPagesFromProfile(p);
      }}
      musicPanel={panelMusica}
      onMusicPanelChange={(musicPanel) => onConfigChange({ ...config, musicPanel })}
      onAccentChange={(color) => onConfigChange({ ...config, accent: color })}
      tileMode={config.tileMode ?? 'square'}
      onTileModeChange={(m) => onConfigChange({ ...config, tileMode: m })}
      autoProfileSwitch={config.autoProfileSwitch ?? true}
      onAutoProfileSwitchToggle={() => onConfigChange({ ...config, autoProfileSwitch: !(config.autoProfileSwitch ?? true) })}
      autoProfileRestoreDefault={config.autoProfileRestoreDefault ?? false}
      onAutoProfileRestoreDefaultToggle={() => onConfigChange({ ...config, autoProfileRestoreDefault: !(config.autoProfileRestoreDefault ?? false) })}
      targetDisplayId={config.targetDisplayId}
      onTargetDisplayChange={(targetDisplayId) => onConfigChange({ ...config, targetDisplayId })}
      onUpdateProfileTargetApp={(profId, targetApp) => {
        const cleaned = targetApp.trim().replace(/\.exe$/i, '').toLowerCase();
        const nextProfiles = (config.profiles ?? []).map((p) =>
          p.id === profId ? { ...p, targetApp: cleaned || undefined } : p,
        );
        onConfigChange({ ...config, profiles: nextProfiles });
      }}
      compact={compact}
      {...resto}
    />
  );
}
