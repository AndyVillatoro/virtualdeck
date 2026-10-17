/**
 * Contrato de los plugins del SDK de Stream Deck (roadmap 83, MVP).
 *
 * Lo comparten el proceso principal (`electron/main/plugins/gestor.ts`) y el
 * renderer. Un plugin es una carpeta `<uuid>.sdPlugin` instalada en
 * `userData/plugins`; sus acciones se usan en un botón con el tipo `plugin`.
 */

export type EstadoPlugin = 'stopped' | 'starting' | 'running' | 'error';

export interface PluginAccionInfo {
  uuid: string;
  nombre: string;
  /** Solo se pueden usar en teclas las que declaran `Keypad`. */
  esTecla: boolean;
  tienePI: boolean;
  /** `UserTitleEnabled` del manifiesto (defecto `true`): con `false` el título lo pinta el plugin. */
  userTitleEnabled: boolean;
  /** La acción trae `Icon` o `States[0].Image`: el plugin controla la imagen. */
  tieneImagenPropia: boolean;
}

export interface PluginInfo {
  uuid: string;
  nombre: string;
  version: string;
  tipo: 'node' | 'html';
  acciones: PluginAccionInfo[];
  habilitado: boolean;
  estado: EstadoPlugin;
  /** Código del último fallo (`estado === 'error'`), no una frase. */
  error?: string;
}

export type CodigoInstalacion =
  | 'cancelado'
  | 'zip'
  | 'tamano'
  | 'cifrado'
  | 'invalido'
  | 'os'
  | 'exe'
  | 'duplicado'
  | 'descarga'
  | 'hash';

export type ResultadoInstalacion =
  | { ok: true; plugin: PluginInfo }
  | { ok: false; codigo: CodigoInstalacion; detalle?: string };

/** Pedido de instalar un plugin desde la tienda: ZIP por HTTPS verificado. */
export interface EntradaInstalacionUrl {
  url: string;
  sha256: string;
  uuid: string;
}

/** Lo que un plugin pinta en un botón (`setImage`, `setTitle`, `setState`). */
export interface PluginVisual {
  /** El mismo `contexto` con el que el renderer pulsó o aparició. */
  contexto: string;
  imagen?: string;
  titulo?: string;
  estado?: number;
}

/** Identifica una acción de plugin puesta en un botón. */
export interface PluginRef {
  pluginUuid: string;
  accionUuid: string;
  /** Único por botón y superficie: lo elige quien llama. */
  contexto: string;
  settings?: Record<string, unknown>;
}

export interface ApiPlugins {
  list: () => Promise<PluginInfo[]>;
  /** Sin ruta abre el selector de archivos `.streamDeckPlugin`. */
  install: (ruta?: string) => Promise<ResultadoInstalacion>;
  /** Baja el ZIP por HTTPS, verifica el SHA-256 y lo instala. */
  installFromUrl: (entrada: EntradaInstalacionUrl) => Promise<ResultadoInstalacion>;
  uninstall: (uuid: string) => Promise<boolean>;
  setEnabled: (uuid: string, habilitado: boolean) => Promise<PluginInfo | null>;
  /** El botón apareció en pantalla (`willAppear`) o dejó de estarlo (`willDisappear`). */
  appear: (ref: PluginRef, visible: boolean) => Promise<boolean>;
  press: (ref: PluginRef, abajo: boolean) => Promise<boolean>;
  /** Abre el Property Inspector de la acción en una ventana propia. */
  openPI: (ref: PluginRef) => Promise<boolean>;
  onChanged: (handler: (lista: PluginInfo[]) => void) => () => void;
  onVisual: (handler: (visual: PluginVisual) => void) => () => void;
  /** El plugin guardó ajustes de un botón (`setSettings`): hay que persistirlos en la config. */
  onSettings: (handler: (contexto: string, settings: Record<string, unknown>) => void) => () => void;
}
