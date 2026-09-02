import { contextBridge, ipcRenderer } from 'electron';
import type {
  ElectronAPI, TasasDivisa, NowPlaying, PlatformInfo, Sensor, SensorsStatus, SensorCategory,
} from '../../src/types';

/**
 * El puente, comprobado contra el tipo que ve la pantalla.
 *
 * Antes esto era un objeto suelto: `ElectronAPI` describia lo que la interfaz
 * cree que existe y el preload construia otra cosa, **sin que nada cruzara las
 * dos**. `check-ipc.mjs` compara los nombres de canal, no las firmas, asi que
 * un tipo de retorno mal puesto pasaba entero — le paso a `log.export`, que se
 * cambio de `boolean` a tres estados en un sitio y no en el otro, y solo se
 * vio en pantalla.
 *
 * Con `satisfies` el compilador exige que cada metodo exista, devuelva lo que
 * dice y que no sobre ninguno.
 */
const api = {
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
  // 1.4 — servidor local. `status` dice si esta escuchando de verdad; los
  // ajustes en disco dicen solo lo que se pidio.
  remote: {
    status: (): Promise<RemoteStatus> => ipcRenderer.invoke('remote:status'),
    newToken: (): Promise<string> => ipcRenderer.invoke('remote:newToken'),
    pairCode: (): Promise<string> => ipcRenderer.invoke('remote:pairCode'),
  },
  gallery: {
    manifest: (url: string): Promise<GalleryManifest> => ipcRenderer.invoke('gallery:manifest', url),
    profile: (url: string): Promise<GalleryProfile> => ipcRenderer.invoke('gallery:profile', url),
  },
  audio: {
    list: (force?: boolean): Promise<AudioDevice[]> => ipcRenderer.invoke('audio:list', force ?? false),
    setDefault: (deviceId: string): Promise<boolean> => ipcRenderer.invoke('audio:setDefault', deviceId),
  },
  media: {
    nowPlaying: (): Promise<NowPlaying | null> => ipcRenderer.invoke('media:nowPlaying'),
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
    platformInfo: (): Promise<PlatformInfo> => ipcRenderer.invoke('app:platformInfo'),
  },
  log: {
    write: (entry: object): Promise<void> => ipcRenderer.invoke('log:write', entry),
    readRecent: (maxBytes?: number): Promise<string> => ipcRenderer.invoke('log:readRecent', maxBytes),
    open: (): Promise<void> => ipcRenderer.invoke('log:open'),
    // Tres desenlaces, no un `boolean`: cancelar y «no hay registro» no son lo
    // mismo, y el aviso de la pantalla depende de distinguirlos.
    export: (): Promise<'ok' | 'cancelado' | 'sin-registro'> => ipcRenderer.invoke('log:export'),
  },
  update: {
    check: (): Promise<EstadoActualizacion> => ipcRenderer.invoke('update:check'),
    quitAndInstall: (): Promise<void> => ipcRenderer.invoke('update:quitAndInstall'),
    onStatus: (handler: (s: AvisoActualizacion) => void): (() => void) => {
      const listener = (_e: unknown, s: AvisoActualizacion) => handler(s);
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
    list: (force?: boolean): Promise<Sensor[]> => ipcRenderer.invoke('sensors:list', force),
    get: (id: string): Promise<Sensor> => ipcRenderer.invoke('sensors:get', id),
    status: (): Promise<SensorsStatus> => ipcRenderer.invoke('sensors:status'),
    configure: (opts: { host?: string; port?: number; enabled?: boolean; categories?: SensorCategory[] }): Promise<SensorsStatus> =>
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
    /**
     * Estado del sistema (salida de audio, procesos, RGB), cada 5 s.
     *
     * Estaba colgado de `bar`, no de `events`, que es donde lo busca
     * `estadoSistema.ts`. Como la llamada va con `?.`, no fallaba: **no se
     * suscribia nadie**, y el estado se quedaba congelado en el primer
     * `snapshot()`.
     */
    onEstadoSistema: (handler: (data: unknown) => void): (() => void) => {
      const listener = (_e: unknown, data: unknown) => handler(data);
      ipcRenderer.on('estado:changed', listener);
      return () => ipcRenderer.removeListener('estado:changed', listener);
    },
    onRGBDevicesChanged: (handler: () => void): (() => void) => {
      const listener = () => handler();
      ipcRenderer.on('rgb:devicesChanged', listener);
      return () => ipcRenderer.removeListener('rgb:devicesChanged', listener);
    },
  },
} satisfies ElectronAPI;

contextBridge.exposeInMainWorld('electronAPI', api);

interface AudioDevice { id: string; name: string; isDefault: boolean; }
interface BackupInfo { filename: string; timestamp: number; sizeBytes: number; }
interface WeatherResult { temp: number; code: number; city: string; country: string; }
interface GalleryEntry { id: string; label: string; author?: string; description?: string; url: string; tags?: string[] }
interface RiskSummary { botones: number; scripts: string[]; programas: string[]; atajosGlobales: string[] }
type GalleryManifest = { ok: true; profiles: GalleryEntry[] } | { ok: false; error: string };
type GalleryProfile = { ok: true; perfil: unknown; riesgo: RiskSummary } | { ok: false; error: string };
type EstadoActualizacion = { status: 'disabled' | 'error' | 'checking' | 'available' | 'not-available'; version?: string; error?: string };
type AvisoActualizacion = { status: 'error' | 'available' | 'downloaded'; version?: string; error?: string };
interface RemoteStatus { corriendo: boolean; port: number; lan: string[] }
interface RemoteStatus { corriendo: boolean; port: number; lan: string[] }
interface BarGeometry { huecos: number; lado: 'left' | 'right'; tile: number; y: number | null; }
interface MediaDiagnosticResult { ok: boolean; stage: string; stdout: string; stderr: string; }
