/**
 * Tabla de modelos Elgato Stream Deck (segunda generación) de protocolo HID puro.
 *
 * Conforme a las secciones 3.4 y 4.1 de docs/investigacion/plan-docks-v015.md.
 * Módulo puro: sin dependencias nativas. Los modelos quedan `verificado: false`
 * hasta probarse con hardware real.
 */

export const ELGATO_VENDOR_ID = 0x0fd9;

/** Tecla con pantalla LCD. */
interface TeclasElgato {
  cantidad: number;
  ancho: number;
  alto: number;
}

/** Tira LCD táctil del Plus, dividida en zonas alineadas con las ruedas. */
interface TiraLcdElgato {
  ancho: number;
  alto: number;
  zonas: number;
}

/** Barra de información del Neo (solo salida de imagen). */
interface InfoBarElgato {
  ancho: number;
  alto: number;
}

export interface ModeloElgato {
  id: 'plus' | 'neo';
  nombre: string;
  vendorId: number;
  productId: number;
  teclas: TeclasElgato;
  /** Ruedas (encoders) del dispositivo; 0 si no tiene. */
  ruedas: number;
  /** Puntos táctiles sin pantalla (Neo); 0 si no tiene. */
  touchPoints: number;
  tiraLcd?: TiraLcdElgato;
  infoBar?: InfoBarElgato;
  /** Longitud en bytes de cada informe de salida. */
  longitudInformeSalida: number;
  /** `true` solo si se probó con hardware real. */
  verificado: boolean;
}

const TECLAS_PLUS: TeclasElgato = { cantidad: 8, ancho: 120, alto: 120 };
const TECLAS_NEO: TeclasElgato = { cantidad: 8, ancho: 96, alto: 96 };

export const STREAM_DECK_PLUS: ModeloElgato = {
  id: 'plus',
  nombre: 'Elgato Stream Deck +',
  vendorId: ELGATO_VENDOR_ID,
  productId: 0x0084,
  teclas: TECLAS_PLUS,
  ruedas: 4,
  touchPoints: 0,
  tiraLcd: { ancho: 800, alto: 100, zonas: 4 },
  longitudInformeSalida: 1024,
  verificado: false,
};

export const STREAM_DECK_NEO: ModeloElgato = {
  id: 'neo',
  nombre: 'Elgato Stream Deck Neo',
  vendorId: ELGATO_VENDOR_ID,
  productId: 0x009a,
  teclas: TECLAS_NEO,
  ruedas: 0,
  touchPoints: 2,
  infoBar: { ancho: 248, alto: 58 },
  longitudInformeSalida: 1024,
  verificado: false,
};

const MODELOS_ELGATO: readonly ModeloElgato[] = [STREAM_DECK_PLUS, STREAM_DECK_NEO];

/** Lista todos los modelos Elgato conocidos. */
export function listarModelosElgato(): ModeloElgato[] {
  return [...MODELOS_ELGATO];
}

/** Busca un modelo por VID/PID; `undefined` si no se conoce. */
export function buscarModeloElgato(vendorId: number, productId: number): ModeloElgato | undefined {
  return MODELOS_ELGATO.find((m) => m.vendorId === vendorId && m.productId === productId);
}
