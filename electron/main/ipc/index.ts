import { BrowserWindow } from 'electron';
import { registerWindowIpc } from './windowIpc';
import { registerConfigIpc } from './configIpc';
import { registerAudioIpc } from './audioIpc';
import { registerMediaIpc } from './mediaIpc';
import { registerLauncherIpc } from './launcherIpc';
import { registerDialogIpc } from './dialogIpc';
import { registerAppIpc } from './appIpc';
import { registerPageIpc } from './pageIpc';
import { registerRgbIpc } from './rgbIpc';
import { registerSensorsIpc } from './sensorsIpc';
import { registerMacroIpc } from './macroIpc';

export function registerAllIpc(win: BrowserWindow, onQuit: () => void) {
  registerWindowIpc(win);
  registerConfigIpc(win, onQuit);
  registerAudioIpc();
  registerMediaIpc();
  registerLauncherIpc(win);
  registerDialogIpc(win);
  registerAppIpc(win);
  registerPageIpc(win);
  registerRgbIpc(win);
  registerSensorsIpc();
  registerMacroIpc();
}
