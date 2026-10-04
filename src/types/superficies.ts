/**
 * Controladores físicos ("superficies"): Stream Dock N3 y familia Mirabox/Ajazz.
 *
 * Contrato compartido entre el proceso principal (driver HID), el puente del
 * preload y el renderer. Cada dispositivo tiene **su propia página** del deck
 * (`PageConfig.superficie`), y cada control físico es un **hueco** de esa
 * página: el emparejamiento es por posición, nunca por id (ver `CLAUDE.md`,
 * `conHuecosCompletos`). La tabla de huecos de cada modelo vive en
 * `src/utils/superficies/disposicion.ts`.
 */

/** Modelos soportados. Añadir uno es añadir su entrada en `disposicion.ts` y en el driver. */
export type ModeloSuperficie = 'n3';

/** Qué control físico produjo una entrada. */
export type ControlSuperficie = 'key' | 'button' | 'knob';

/**
 * Qué se hizo con el control. Las teclas y los botones, y la pulsación de una
 * perilla, dan `down`/`up`; el giro de una perilla da un evento suelto por
 * cada clic (`izq`/`der`), sin `up`. Medido con el N3 real (0x5548:0x1001).
 */
export type GestoSuperficie = 'down' | 'up' | 'izq' | 'der';

/** Una pulsación o giro que llega del hardware. `indice` empieza en 0 dentro de su tipo de control. */
export interface EntradaSuperficie {
  serial: string;
  control: ControlSuperficie;
  indice: number;
  gesto: GestoSuperficie;
}

/** Un dispositivo visto por el proceso principal. */
export interface InfoSuperficie {
  /** Número de serie USB: es lo que identifica al dispositivo entre arranques. */
  serial: string;
  modelo: ModeloSuperficie;
  /** Nombre comercial, p. ej. "Stream Dock N3". */
  nombre: string;
  conectado: boolean;
}

/** Marca que convierte una página del deck en el perfil de un dispositivo. */
export interface PaginaSuperficie {
  serial: string;
  modelo: ModeloSuperficie;
  /** Brillo de las teclas LCD, 0–100. */
  brillo?: number;
}

/** El trozo de `ElectronAPI` que expone el preload. */
export interface ApiSuperficies {
  listar: () => Promise<InfoSuperficie[]>;
  /** Pinta una tecla LCD. `jpegBase64` ya viene al tamaño y con la rotación del modelo. */
  imagen: (serial: string, tecla: number, jpegBase64: string) => Promise<boolean>;
  brillo: (serial: string, valor: number) => Promise<boolean>;
  limpiar: (serial: string) => Promise<boolean>;
  onEntrada: (handler: (e: EntradaSuperficie) => void) => () => void;
  onCambio: (handler: (lista: InfoSuperficie[]) => void) => () => void;
}
