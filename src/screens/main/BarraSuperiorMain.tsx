import React from 'react';
import { TitleBar } from '../../components/TitleBar';
import { REMOTO_POR_DEFECTO, SENSORES_POR_DEFECTO, type DeckConfig } from '../../types';
import { normalizarApp } from '../../utils/apps';

type PropsTitleBar = React.ComponentProps<typeof TitleBar>;

interface BarraSuperiorMainProps extends Pick<PropsTitleBar,
  'autostart' | 'soundOnPress' | 'soundProfile' | 'rgbStatus' | 'sensorsStatus'
  | 'onFullscreen' | 'onWallpaper' | 'onRGB' | 'onDispositivos'
  | 'onConfigExport' | 'onConfigImport'
  | 'onAutostartToggle' | 'onSoundToggle' | 'onSoundProfileChange'
  | 'onSaveProfile' | 'onLoadProfile' | 'onAppendProfilePages' | 'onDeleteProfile'
  | 'uiScale' | 'onUiScaleChange' | 'alwaysOnTop' | 'onAlwaysOnTopToggle'
  | 'onFloatingBar' | 'theme' | 'onThemeChange' | 'language' | 'onLanguageChange'
  | 'hintsDismissed' | 'onDismissHint' | 'onReplayOnboarding'
> {
  config: DeckConfig;
  panelMusica: { enabled: boolean; side: 'left' | 'right' };
  compact: boolean;
  onConfigChange: (c: DeckConfig) => void;
}

/**
 * Barra superior de la pantalla principal: `TitleBar` con todo su cableado
 * de configuración. Era el bloque JSX más largo de `MainB` (~10 ramas entre
 * `??` y callbacks).
 */
export function BarraSuperiorMain(props: BarraSuperiorMainProps) {
  const { config, panelMusica, compact, onConfigChange, ...resto } = props;
  return (
    <TitleBar
      pageName=""
      accent={config.accent}
      profiles={config.profiles ?? []}
      rgbConfig={config.rgb}
      onRGBConfigChange={(rgb) => onConfigChange({ ...config, rgb })}
      sensorsConfig={config.sensors ?? { enabled: false, ...SENSORES_POR_DEFECTO }}
      onSensorsConfigChange={(sensors) => onConfigChange({ ...config, sensors })}
      remoteConfig={config.remote ?? REMOTO_POR_DEFECTO}
      onRemoteConfigChange={(remote) => onConfigChange({ ...config, remote })}
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
        const cleaned = normalizarApp(targetApp);
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
