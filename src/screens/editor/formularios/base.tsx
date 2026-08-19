import type React from 'react';
import type { AudioDevice, ButtonAction, FolderButton, RGBDeviceInfo, RGBProfile } from '../../../types';

/**
 * El bag que reciben todos los formularios.
 *
 * Todos reciben lo mismo aunque cada uno use cuatro o cinco cosas. Es a
 * proposito: quien los dibuja no tiene que saber que necesita cada uno, y
 * añadir un tipo nuevo no obliga a tocar el paso de configuracion.
 */
export interface PropsFormulario {
  accent: string;
  action: ButtonAction;
  setAction: React.Dispatch<React.SetStateAction<ButtonAction>>;
  actionToggleOff: ButtonAction;
  setActionToggleOff: React.Dispatch<React.SetStateAction<ButtonAction>>;
  applyFolderPreset: (key: string) => void;
  audioDevices: AudioDevice[];
  audioError: string | null;
  capturing: boolean;
  setCapturing: React.Dispatch<React.SetStateAction<boolean>>;
  folderButtons: FolderButton[];
  setFolderButtons: React.Dispatch<React.SetStateAction<FolderButton[]>>;
  globalHotkey: string;
  setGlobalHotkey: (s: string) => void;
  inTrayMenu: boolean;
  setInTrayMenu: (v: boolean) => void;
  isToggle: boolean;
  setIsToggle: (v: boolean) => void;
  label: string;
  setLabel: (s: string) => void;
  loadAudioDevices: () => void;
  loadingDevices: boolean;
  longPressAction: ButtonAction;
  setLongPressAction: React.Dispatch<React.SetStateAction<ButtonAction>>;
  pickFile: () => void;
  pickShortcut: () => void;
  radioGroup: string;
  setRadioGroup: (s: string) => void;
  rgbConnected: boolean;
  rgbDevices: RGBDeviceInfo[];
  rgbProfiles: RGBProfile[];
  deckState: Record<string, string>;
}
