import { ipcMain } from 'electron';
import { playUri, getDevices, transferPlayback, getPlaybackState } from '../spotify';

export function registerSpotifyIpc() {
  ipcMain.handle('spotify:playUri', async (_e, uriOrUrl: string, token?: string, deviceId?: string) => {
    return playUri(uriOrUrl, token, deviceId);
  });

  ipcMain.handle('spotify:getDevices', async (_e, token?: string) => {
    return getDevices(token);
  });

  ipcMain.handle(
    'spotify:transferPlayback',
    async (_e, deviceId: string, token?: string, play?: boolean) => {
      return transferPlayback(deviceId, token, play ?? true);
    },
  );

  ipcMain.handle('spotify:getPlaybackState', async (_e, token?: string) => {
    return getPlaybackState(token);
  });
}
