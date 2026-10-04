/**
 * Controladores físicos ("superficies"): Stream Dock, Ajazz y familia Mirabox.
 *
 * Contrato compartido entre el proceso principal (drivers HID y **tabla de
 * modelos**), el puente del preload y el renderer. La tabla vive en el proceso
 * principal porque es donde están los drivers, y la regla de capas no deja que
 * importe datos de `src/`; el renderer recibe la distribución de cada modelo
 * por IPC (`InfoSuperficie.disposicion` y `ApiSuperficies.modelos`).
 *
 * Cada dispositivo tiene **su propia página** del deck (`PageConfig.superficie`)
 * y cada acción de un control es un **hueco** de esa página, por posición,
 * nunca por id (ver `CLAUDE.md`, `conHuecosCompletos`). Los huecos salen de
 * `DisposicionSuperficie.controles`, en su orden: una tecla o un botón ocupan
 * 1, una perilla 3 (izq, pulsar, der) y una tira táctil 2 (izq, der). Las
 * funciones que lo calculan están en `src/utils/superficies/disposicion.ts`.
 */

/** Id del descriptor del modelo en la tabla del proceso principal (p. ej. `'n3'`). */
export type ModeloSuperficie = string;

/**
 * Tipo de control físico.
 * - `key`: botón con pantalla LCD propia.
 * - `button`: botón sin pantalla.
 * - `knob`: perilla que se gira y se pulsa.
 * - `swipe`: tira táctil que se desliza a un lado u otro.
 */
export type ControlSuperficie = 'key' | 'button' | 'knob' | 'swipe';

/**
 * Qué se hizo con el control. Teclas, botones y la pulsación de una perilla
 * dan `down`/`up`; el giro de una perilla y el deslizamiento de una tira dan
 * un evento suelto por clic (`izq`/`der`), sin `up`. Medido con el N3 real.
 */
export type GestoSuperficie = 'down' | 'up' | 'izq' | 'der';

/** Una pulsación o giro que llega del hardware. `indice` empieza en 0 dentro de su tipo de control. */
export interface EntradaSuperficie {
  serial: string;
  control: ControlSuperficie;
  indice: number;
  gesto: GestoSuperficie;
}

/** Pantalla de una tecla: tamaño de la imagen y giro (grados, sentido horario) antes de mandarla. */
export interface LcdControl {
  ancho: number;
  alto: number;
  rotacion: number;
}

/** Un control físico del modelo, con su posición real para el dibujo. */
export interface ControlFisico {
  tipo: ControlSuperficie;
  /** Índice dentro de su tipo (la tecla 0, la perilla 2...). */
  indice: number;
  /** Posición física en la carcasa (fila y columna del fabricante, para dibujarlo). */
  fila: number;
  columna: number;
  /** Solo en `key`. */
  lcd?: LcdControl;
}

/** La distribución de un modelo, tal como la necesita el renderer. */
export interface DisposicionSuperficie {
  nombre: string;
  /**
   * `true` solo si se ha comprobado con el hardware real. Los modelos
   * importados de Bitfocus sin probar van en `false` y la pantalla lo dice.
   */
  verificado: boolean;
  /** En el orden de los huecos de la página. */
  controles: ControlFisico[];
}

/** Un dispositivo visto por el proceso principal. */
export interface InfoSuperficie {
  /** Número de serie USB: es lo que identifica al dispositivo entre arranques. */
  serial: string;
  modelo: ModeloSuperficie;
  /** Nombre comercial, p. ej. "Stream Dock N3". */
  nombre: string;
  conectado: boolean;
  disposicion: DisposicionSuperficie;
}

/** Marca que convierte una página del deck en el perfil de un dispositivo. */
export interface PaginaSuperficie {
  serial: string;
  modelo: ModeloSuperficie;
  /** Brillo de las teclas LCD, 0–100. */
  brillo?: number;
  /**
   * Giro de la imagen elegido por el usuario (0/90/180/270). Si existe, manda
   * sobre el del modelo: es la válvula de seguridad para modelos sin verificar
   * (Bitfocus tenía mal el del N3).
   */
  rotacion?: number;
}

/** El trozo de `ElectronAPI` que expone el preload. */
export interface ApiSuperficies {
  listar: () => Promise<InfoSuperficie[]>;
  /** Todos los modelos conocidos, por id: la pantalla los necesita también para dispositivos desconectados. */
  modelos: () => Promise<Record<ModeloSuperficie, DisposicionSuperficie>>;
  /** Pinta una tecla LCD. `jpegBase64` ya viene al tamaño y con la rotación que toca. */
  imagen: (serial: string, tecla: number, jpegBase64: string) => Promise<boolean>;
  /** Solo hardware: no toca la configuración. Para el deslizador en vivo. */
  brillo: (serial: string, valor: number) => Promise<boolean>;
  limpiar: (serial: string) => Promise<boolean>;
  onEntrada: (handler: (e: EntradaSuperficie) => void) => () => void;
  onCambio: (handler: (lista: InfoSuperficie[]) => void) => () => void;
}
