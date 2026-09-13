import type { ButtonConfig, DeckConfig, ThemeMode, SoundProfileId, Profile } from '../../types';

export interface MainBProps {
  config: DeckConfig;
  activePage: number;
  autostart: boolean;
  toggledIds: Set<string>;
  soundOnPress: boolean;
  soundProfile: SoundProfileId;
  onPageChange: (page: number) => void;
  onToggle: (id: string) => void;
  onFullscreen: () => void;
  onEditButton: (id: string) => void;
  onWallpaper: () => void;
  onRGB: () => void;
  onConfigChange: (c: DeckConfig) => void;
  onUpdateButton?: (btn: ButtonConfig) => void;
  onDuplicateButton: (id: string) => void;
  onClearButton: (id: string) => void;
  onConfigExport: () => void;
  onConfigImport: () => void;
  onSwapButtons: (idA: string, idB: string) => void;
  onPageRename: (id: string, name: string) => void;
  onPageAdd: () => void;
  onPageDelete: (id: string) => void;
  onPageReorder: (fromIdx: number, toIdx: number) => void;
  onPageSetGrid: (pageId: string, gs: 3 | 4 | 5 | 6, gridRows?: number) => void;
  onMoveButtonToPage: (buttonId: string, targetPage: number, copy: boolean) => boolean;
  onMoveButtonsToPage: (ids: string[], targetPage: number, copy: boolean) => number;
  onClearButtons: (ids: string[]) => void;
  onSaveProfile: (name: string) => void;
  onLoadProfile: (id: string) => void;
  onAppendProfilePages: (id: string) => void;
  onAppendPagesFromProfile: (p: Profile) => void;
  onDeleteProfile: (id: string) => void;
  onAutostartToggle: () => void;
  onSoundToggle: () => void;
  onSoundProfileChange: (id: SoundProfileId) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  alwaysOnTop?: boolean;
  onAlwaysOnTopToggle?: () => void;
  onFloatingBar?: () => void;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  language?: 'system' | 'es' | 'en';
  onLanguageChange?: (language: 'system' | 'es' | 'en') => void;
  hintsDismissed?: string[];
  onDismissHint?: (id: string) => void;
  onPageExport?: (pageIdx: number) => Promise<void>;
  onPageImport?: () => Promise<void>;
  onReplayOnboarding?: () => void;
}

export function getSourceName(src: string): string {
  if (!src) return '';
  if (/youtube\s*music/i.test(src)) return 'YouTube Music';
  if (/youtube/i.test(src))         return 'YouTube';
  if (/spotify/i.test(src))         return 'Spotify';
  if (/soundcloud/i.test(src))      return 'SoundCloud';
  if (/chrome/i.test(src))          return 'Chrome';
  if (/msedge|edge/i.test(src))     return 'Edge';
  if (/firefox/i.test(src))         return 'Firefox';
  if (/vlc/i.test(src))             return 'VLC';
  if (/foobar/i.test(src))          return 'foobar2000';
  const parts = src.split(/[\\./]/);
  return parts[parts.length - 1]?.replace(/\.exe$/i, '') || '';
}

