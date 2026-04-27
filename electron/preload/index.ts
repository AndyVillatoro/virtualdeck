import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    fullscreen: () => ipcRenderer.send('window:fullscreen'),
  },
  config: {
    load: (): Promise<object> => ipcRenderer.invoke('config:load'),
    save: (data: object): Promise<boolean> => ipcRenderer.invoke('config:save', data),
    export: (): Promise<boolean> => ipcRenderer.invoke('config:export'),
    import: (): Promise<object | null> => ipcRenderer.invoke('config:import'),
    listBackups: (): Promise<BackupInfo[]> => ipcRenderer.invoke('config:listBackups'),
    restoreBackup: (filename: string): Promise<object | null> => ipcRenderer.invoke('config:restoreBackup', filename),
  },
  audio: {
    list: (): Promise<AudioDevice[]> => ipcRenderer.invoke('audio:list'),
    setDefault: (deviceId: string): Promise<boolean> => ipcRenderer.invoke('audio:setDefault', deviceId),
  },
  media: {
    nowPlaying: (): Promise<NowPlayingResult | null> => ipcRenderer.invoke('media:nowPlaying'),
    control: (cmd: 'play-pause' | 'next' | 'prev' | 'stop'): Promise<boolean> => ipcRenderer.invoke('media:control', cmd),
    diagnose: (): Promise<MediaDiagnosticResult> => ipcRenderer.invoke('media:diagnose'),
  },
  weather: {
    get: (force?: boolean): Promise<WeatherResult | null> => ipcRenderer.invoke('weather:get', force),
  },
  launch: {
    app: (path: string, args?: string[]): Promise<boolean> => ipcRenderer.invoke('launch:app', path, args ?? []),
    url: (url: string): Promise<boolean> => ipcRenderer.invoke('launch:url', url),
    script: (script: string, shell?: string): Promise<boolean> => ipcRenderer.invoke('launch:script', script, shell),
    scriptCapture: (script: string, shell?: string): Promise<{ success: boolean; output: string }> =>
      ipcRenderer.invoke('launch:script:capture', script, shell),
    shortcut: (path: string): Promise<boolean> => ipcRenderer.invoke('launch:shortcut', path),
    mediaKey: (key: string): Promise<boolean> => ipcRenderer.invoke('launch:mediaKey', key),
    brightness: (level: number): Promise<boolean> => ipcRenderer.invoke('launch:brightness', level),
    hotkey: (combo: string): Promise<boolean> => ipcRenderer.invoke('launch:hotkey', combo),
    clipboard: (text: string): Promise<boolean> => ipcRenderer.invoke('launch:clipboard', text),
    typeText: (text: string): Promise<boolean> => ipcRenderer.invoke('launch:typeText', text),
    killProcess: (name: string): Promise<boolean> => ipcRenderer.invoke('launch:killProcess', name),
    setVolume: (percent: number): Promise<boolean> => ipcRenderer.invoke('launch:setVolume', percent),
    snapWindow: (position: string, processName?: string): Promise<boolean> => ipcRenderer.invoke('launch:snapWindow', position, processName),
  },
  dialog: {
    openFile: (opts?: object): Promise<string | null> => ipcRenderer.invoke('dialog:openFile', opts),
    openImage: (): Promise<string | null> => ipcRenderer.invoke('dialog:openImage'),
    saveClipboardImage: (dataUrl: string): Promise<string | null> => ipcRenderer.invoke('dialog:saveClipboardImage', dataUrl),
  },
  notify: {
    show: (title: string, body: string): Promise<boolean> => ipcRenderer.invoke('notify:show', title, body),
  },
  app: {
    getAutostart: (): Promise<boolean> => ipcRenderer.invoke('app:autostart:get'),
    setAutostart: (enabled: boolean): Promise<void> => ipcRenderer.invoke('app:autostart:set', enabled),
    setZoom: (factor: number): Promise<void> => ipcRenderer.invoke('app:setZoom', factor),
    getZoom: (): Promise<number> => ipcRenderer.invoke('app:getZoom'),
  },
  page: {
    export: (pageData: object): Promise<boolean> => ipcRenderer.invoke('page:export', pageData),
    import: (): Promise<{ page: object; buttons: object[] } | null> => ipcRenderer.invoke('page:import'),
  },
  state: {
    activeApps: (): Promise<string[]> => ipcRenderer.invoke('state:activeApps'),
  },
  rgb: {
    status: () => ipcRenderer.invoke('rgb:status'),
    connect: (host?: string, port?: number) => ipcRenderer.invoke('rgb:connect', host, port),
    disconnect: () => ipcRenderer.invoke('rgb:disconnect'),
    spawnServer: (exePath?: string) => ipcRenderer.invoke('rgb:spawnServer', exePath),
    killServer: () => ipcRenderer.invoke('rgb:killServer'),
    listDevices: () => ipcRenderer.invoke('rgb:listDevices'),
    setDeviceColor: (deviceId: number, color: string) =>
      ipcRenderer.invoke('rgb:setDeviceColor', deviceId, color),
    setZoneColors: (deviceId: number, zoneId: number, colors: string[]) =>
      ipcRenderer.invoke('rgb:setZoneColors', deviceId, zoneId, colors),
    setSingleLed: (deviceId: number, ledId: number, color: string) =>
      ipcRenderer.invoke('rgb:setSingleLed', deviceId, ledId, color),
    setMode: (deviceId: number, mode: string, color?: string, brightness?: number) =>
      ipcRenderer.invoke('rgb:setMode', deviceId, mode, color, brightness),
    resizeZone: (deviceId: number, zoneId: number, size: number) =>
      ipcRenderer.invoke('rgb:resizeZone', deviceId, zoneId, size),
    applyProfile: (profile: unknown) => ipcRenderer.invoke('rgb:applyProfile', profile),
    smartPreset: (presetId: string) => ipcRenderer.invoke('rgb:smartPreset', presetId),
    pickFile: () => ipcRenderer.invoke('rgb:pickFile'),
  },
  events: {
    // 1.4 — disparadores externos: globalShortcut + tray click. Devuelve unsub.
    onButtonTrigger: (handler: (buttonId: string) => void): (() => void) => {
      const listener = (_e: unknown, id: string) => handler(id);
      ipcRenderer.on('button:trigger', listener);
      return () => ipcRenderer.removeListener('button:trigger', listener);
    },
    onRGBDevicesChanged: (handler: () => void): (() => void) => {
      const listener = () => handler();
      ipcRenderer.on('rgb:devicesChanged', listener);
      return () => ipcRenderer.removeListener('rgb:devicesChanged', listener);
    },
  },
});

interface NowPlayingResult { title: string; artist: string; status: string; source: string; thumbnail?: string; }
interface AudioDevice { id: string; name: string; isDefault: boolean; }
interface BackupInfo { filename: string; timestamp: number; sizeBytes: number; }
interface WeatherResult { temp: number; code: number; city: string; country: string; }
interface MediaDiagnosticResult { ok: boolean; stage: string; stdout: string; stderr: string; }
