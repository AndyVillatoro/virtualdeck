/**
 * Contrato común para controladores físicos ("superficies"): Stream Deck,
 * Ajazz, Elgato Stream Deck (Plus, Neo) y futuras familias.
 *
 * Conforme a la sección 3.1 de docs/investigacion/plan-docks-v015.md (Fase 0).
 * Separa qué hace un dispositivo conectado (DriverSuperficie) de cómo habla su
 * protocolo e identifica sus modelos.
 */

import type { ControlSuperficie } from '../../../src/types';

/**
 * Referencia a un control concreto dentro de la superficie física.
 * Admite tanto el índice numérico simple de tecla (compatibilidad directa)
 * como la referencia tipada para teclas, tiras, infobars o diales.
 */
interface ControlRef {
  tipo: ControlSuperficie;
  indice: number;
}

/**
 * Identificador de control aceptado por los drivers de superficie.
 * Un número simple se interpreta como `{ tipo: 'key', indice: tecla }`
 * para preservar total compatibilidad con el pipeline existente.
 */
export type ControlId = number | ControlRef;

/**
 * Callbacks de ciclo de vida y eventos crudos de un dispositivo abierto.
 */
export interface CallbacksDispositivo {
  /** Un reporte de entrada crudo (lo interpreta la familia o el gestor). */
  alEntrada: (buf: Buffer) => void;
  /** El dispositivo dejó de responder o se desenchufó. */
  alDesconectar: (error: Error) => void;
}

/**
 * Interfaz que implementa el envoltorio de cualquier hardware de dock conectado.
 */
export interface DriverSuperficie {
  /** Indica si la conexión HID está activa y no en proceso de cierre o desconexión. */
  readonly estaVivo: boolean;

  /**
   * Pinta una imagen JPEG en un control visual (tecla LCD, tira LCD, infobar).
   * @param control Índice numérico de tecla o referencia estructurada `ControlRef`.
   * @param jpeg Buffer de imagen JPEG ya enmarcado o en resolución natural.
   */
  imagen(control: ControlId, jpeg: Buffer): Promise<void>;

  /**
   * Ajusta el nivel de brillo de la pantalla (0-100).
   */
  brillo(valor: number): Promise<void>;

  /**
   * Limpia y apaga temporalmente todas las teclas/pantallas.
   */
  limpiar(): Promise<void>;

  /**
   * Ajusta el color del LED RGB de un touchpoint (opcional, p. ej. Stream Deck Neo).
   */
  ledTouchpoint?(indice: number, rgb: [number, number, number]): Promise<void>;

  /**
   * Cierra ordenadamente la conexión HID y cancela latidos/timers.
   */
  cerrar(): Promise<void>;
}
