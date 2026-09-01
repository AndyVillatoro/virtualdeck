import { contextBridge, ipcRenderer } from 'electron';
import type { TasasDivisa } from '../../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    fullscreen: () => ipcRenderer.send('window:fullscreen'),
    setAlwaysOnTop: (encima: boolean) => ipcRenderer.send('window:setAlwaysOnTop', encima),
  },
  bar: {
    open: (g: BarGeometry): Promise<boolean> => ipcRenderer.invoke('bar:open', g),
    close: (): Promise<boolean> => ipcRenderer.invoke('bar:close'),
    isOpen: (): Promise<boolean> => ipcRenderer.invoke('bar:isOpen'),
    apply: (g: BarGeometry): Promise<boolean> => ipcRenderer.invoke('bar:apply', g),
    position: (): Promise<{ y: number } | null> => ipcRenderer.invoke('bar:position'),
    fit: (ancho: number, alto: number): Promise<boolean> =>
      ipcRenderer.invoke('bar:fit', ancho, alto),
    maxSlots: (tile: number): Promise<number> => ipcRenderer.invoke('bar:maxSlots', tile),
    /** La ventana se movio: llega la Y nueva para guardarla. */
    onMoved: (cb: (y: number) => void) => {
      const h = (_e: unknown, y: number) => cb(y);
      ipcRenderer.on('bar:moved', h);
      return () => ipcRenderer.removeListener('bar:moved', h);
    },
    /** Aviso de que la configuracion cambio. Devuelve la funcion para desuscribirse. */
    /** Estado del sistema (audio por defecto, procesos, RGB), cada 5 s. */
    onEstadoSistema: (cb: (data: unknown) => void) => {
      const h = (_e: unknown, data: unknown) => cb(data);
      ipcRenderer.on('estado:changed', h);
      return () => ipcRenderer.removeListener('estado:changed', h);
    },
    onConfigChanged: (cb: (data: unknown) => void) => {
      const h = (_e: unknown, data: unknown) => cb(data);
      ipcRenderer.on('config:changed', h);
      return () => ipcRenderer.removeListener('config:changed', h);
    },
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
    list: (force?: boolean): Promise<AudioDevice[]> => ipcRenderer.invoke('audio:list', force ?? false),
    setDefault: (deviceId: string): Promise<boolean> => ipcRenderer.invoke('audio:setDefault', deviceId),
  },
  media: {
    nowPlaying: (): Promise<NowPlayingResult | null> => ipcRenderer.invoke('media:nowPlaying'),
    control: (cmd: 'play-pause' | 'next' | 'prev' | 'stop'): Promise<boolean> => ipcRenderer.invoke('media:control', cmd),
    shuffle: (): Promise<boolean> => ipcRenderer.invoke('media:shuffle'),
    repeat: (): Promise<boolean> => ipcRenderer.invoke('media:repeat'),
    diagnose: (): Promise<MediaDiagnosticResult> => ipcRenderer.invoke('media:diagnose'),
  },
  currency: {
    rates: (base: string, force?: boolean): Promise<{ ok: boolean; datos?: TasasDivisa; error?: string }> =>
      ipcRenderer.invoke('currency:rates', base, force),
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
    getBrightness: (): Promise<number | null> => ipcRenderer.invoke('launch:getBrightness'),
    getVolume: (): Promise<number | null> => ipcRenderer.invoke('launch:getVolume'),
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
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
    tabletSettings: (): Promise<boolean> => ipcRenderer.invoke('app:tabletSettings'),
    platformInfo: (): Promise<unknown> => ipcRenderer.invoke('app:platformInfo'),
  },
  log: {
    write: (entry: object): Promise<void> => ipcRenderer.invoke('log:write', entry),
    readRecent: (maxBytes?: number): Promise<string> => ipcRenderer.invoke('log:readRecent', maxBytes),
    open: (): Promise<void> => ipcRenderer.invoke('log:open'),
    export: (): Promise<boolean> => ipcRenderer.invoke('log:export'),
  },
  update: {
    check: (): Promise<unknown> => ipcRenderer.invoke('update:check'),
    quitAndInstall: (): Promise<void> => ipcRenderer.invoke('update:quitAndInstall'),
    onStatus: (handler: (s: unknown) => void): (() => void) => {
      const listener = (_e: unknown, s: unknown) => handler(s);
      ipcRenderer.on('update:status', listener);
      return () => ipcRenderer.removeListener('update:status', listener);
    },
  },
  page: {
    export: (pageData: object): Promise<boolean> => ipcRenderer.invoke('page:export', pageData),
    import: (): Promise<{ page: object; buttons: object[] } | null> => ipcRenderer.invoke('page:import'),
  },
  state: {
    activeApps: (): Promise<string[]> => ipcRenderer.invoke('state:activeApps'),
    snapshot: (): Promise<unknown> => ipcRenderer.invoke('state:snapshot'),
  },
  rgb: {
    status: () => ipcRenderer.invoke('rgb:status'),
    connect: (host?: string, port?: number) => ipcRenderer.invoke('rgb:connect', host, port),
    disconnect: () => ipcRenderer.invoke('rgb:disconnect'),
    spawnServer: (exePath?: string) => ipcRenderer.invoke('rgb:spawnServer', exePath),
    killServer: () => ipcRenderer.invoke('rgb:killServer'),
    listDevices: () => ipcRenderer.invoke('rgb:listDevices'),
    setDeviceColor: (deviceId: number, color: string, duradero?: boolean) =>
      ipcRenderer.invoke('rgb:setDeviceColor', deviceId, color, duradero),
    setZoneColors: (deviceId: number, zoneId: number, colors: string[]) =>
      ipcRenderer.invoke('rgb:setZoneColors', deviceId, zoneId, colors),
    setSingleLed: (deviceId: number, ledId: number, color: string) =>
      ipcRenderer.invoke('rgb:setSingleLed', deviceId, ledId, color),
    setMode: (deviceId: number, mode: string, color?: string, brightness?: number, speed?: number) =>
      ipcRenderer.invoke('rgb:setMode', deviceId, mode, color, brightness, speed),
    resizeZone: (deviceId: number, zoneId: number, size: number) =>
      ipcRenderer.invoke('rgb:resizeZone', deviceId, zoneId, size),
    applyProfile: (profile: unknown) => ipcRenderer.invoke('rgb:applyProfile', profile),
    smartPreset: (presetId: string) => ipcRenderer.invoke('rgb:smartPreset', presetId),
    presetList: (): Promise<Array<{ id: string; color: string }>> => ipcRenderer.invoke('rgb:presetList'),
    pickFile: () => ipcRenderer.invoke('rgb:pickFile'),
  },
  sensors: {
    list: (force?: boolean): Promise<unknown[]> => ipcRenderer.invoke('sensors:list', force),
    get: (id: string): Promise<unknown | null> => ipcRenderer.invoke('sensors:get', id),
    status: (): Promise<unknown> => ipcRenderer.invoke('sensors:status'),
    configure: (opts: { host?: string; port?: number; enabled?: boolean; categories?: string[] }): Promise<unknown> =>
      ipcRenderer.invoke('sensors:configure', opts),
    probe: (): Promise<{ ok: boolean; count: number; error?: string }> => ipcRenderer.invoke('sensors:probe'),
    spawnLHM: (customPath?: string, elevated?: boolean): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('sensors:spawnLHM', customPath, elevated),
    killLHM: (): Promise<void> => ipcRenderer.invoke('sensors:killLHM'),
    knownPath: (): Promise<string | null> => ipcRenderer.invoke('sensors:knownPath'),
    registerUrlAcl: (port?: number): Promise<{ ok: boolean; error?: string; url: string }> => ipcRenderer.invoke('sensors:registerUrlAcl', port),
  },
  macro: {
    play: (steps: unknown[], repeat?: number) => ipcRenderer.invoke('macro:play', steps, repeat ?? 1),
    startRecord: () => ipcRenderer.invoke('macro:startRecord'),
    stopRecord: () => ipcRenderer.invoke('macro:stopRecord'),
    isRecording: () => ipcRenderer.invoke('macro:isRecording'),
  },
  events: {
    // 1.4 — disparadores externos: globalShortcut + tray click. Devuelve unsub.
    onButtonTrigger: (handler: (buttonId: string) => void): (() => void) => {
      const listener = (_e: unknown, id: string) => handler(id);
      ipcRenderer.on('button:trigger', listener);
      return () => ipcRenderer.removeListener('button:trigger', listener);
    },
    // 1.4 — `virtualdeck://page/<n>`: cambiar de pagina desde fuera.
    onNavPage: (handler: (indice: number) => void): (() => void) => {
      const listener = (_e: unknown, i: number) => handler(i);
      ipcRenderer.on('nav:page', listener);
      return () => ipcRenderer.removeListener('nav:page', listener);
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
interface BarGeometry { huecos: number; lado: 'left' | 'right'; tile: number; y: number | null; }
interface MediaDiagnosticResult { ok: boolean; stage: string; stdout: string; stderr: string; }
