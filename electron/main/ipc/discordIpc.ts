import { ipcMain } from 'electron';
import { getStatus, getVoiceSettings, setVoiceSettings, toggleMute, toggleDeaf } from '../discord';

export function registerDiscordIpc() {
  ipcMain.handle('discord:status', async () => {
    return getStatus();
  });

  ipcMain.handle('discord:voiceSettings', async () => {
    return getVoiceSettings();
  });

  ipcMain.handle('discord:setVoiceSettings', async (_e, settings: { mute?: boolean; deaf?: boolean }) => {
    return setVoiceSettings(settings);
  });

  ipcMain.handle('discord:toggleMute', async () => {
    return toggleMute();
  });

  ipcMain.handle('discord:toggleDeaf', async () => {
    return toggleDeaf();
  });
}

