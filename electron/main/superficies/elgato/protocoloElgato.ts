/**
 * Protocolo HID de Elgato Stream Deck de segunda generación (Plus y Neo).
 *
 * Conforme a las secciones 4.2 y 4.3 de docs/investigacion/plan-docks-v015.md.
 * Funciones puras: sin dependencias nativas ni E/S. Todos los offsets están
 * marcados [V] en el plan y deben confirmarse con hardware real.
 */

const LONGITUD_INFORME_FEATURE = 32;
const ANCHO_ZONA_TIRA = 200;
const ZONAS_TIRA = 4;
const TECLAS_FISICAS = 8;
const OFFSET_TECLAS = 4;
const OFFSET_RUEDAS = 5;
const RUEDAS_PLUS = 4;

/** Evento de entrada ya decodificado, independiente del protocolo HID. */
export type EventoSuperficie =
  | { tipo: 'tecla:abajo' | 'tecla:arriba'; indice: number }
  | { tipo: 'rueda:abajo' | 'rueda:arriba'; indice: number }
  | { tipo: 'rueda:giro'; indice: number; pasos: number }
  | { tipo: 'tira:toque'; zona: number; x: number; y: number; largo: boolean }
  | { tipo: 'tira:arrastre'; zona: number; x0: number; y0: number; x1: number; y1: number };

/**
 * Trocea `jpeg` en informes de `tamanoInforme` bytes. `cabecera` recibe los datos
 * de la página y devuelve los bytes de cabecera. Siempre hay al menos una página.
 */
function paginar(
  jpeg: Buffer,
  tamanoInforme: number,
  longitudCabecera: number,
  cabecera: (esUltima: number, pagina: number, longitud: number) => number[],
): Buffer[] {
  const capacidad = tamanoInforme - longitudCabecera;
  const total = Math.max(1, Math.ceil(jpeg.length / capacidad));
  const paginas: Buffer[] = [];
  for (let pagina = 0; pagina < total; pagina++) {
    const trozo = jpeg.subarray(pagina * capacidad, (pagina + 1) * capacidad);
    const informe = Buffer.alloc(tamanoInforme);
    Buffer.from(cabecera(pagina === total - 1 ? 1 : 0, pagina, trozo.length)).copy(informe, 0);
    trozo.copy(informe, longitudCabecera);
    paginas.push(informe);
  }
  return paginas;
}

const lo = (v: number): number => v & 0xff;
const hi = (v: number): number => (v >> 8) & 0xff;

/** Informes de salida para pintar la imagen JPEG de una tecla. */
export function construirPaginasTeclaElgato(indiceTecla: number, jpeg: Buffer, tamanoInforme = 1024): Buffer[] {
  return paginar(jpeg, tamanoInforme, 8, (ultima, pag, len) => [
    0x02, 0x07, indiceTecla & 0xff, ultima, lo(len), hi(len), lo(pag), hi(pag),
  ]);
}

/** Informes de salida para pintar una ventana de la tira LCD del Plus. */
export function construirPaginasTiraElgato(
  x: number, y: number, ancho: number, alto: number, jpeg: Buffer, tamanoInforme = 1024,
): Buffer[] {
  return paginar(jpeg, tamanoInforme, 16, (ultima, pag, len) => [
    0x02, 0x0c, lo(x), hi(x), lo(y), hi(y), lo(ancho), hi(ancho), lo(alto), hi(alto),
    ultima, lo(pag), hi(pag), lo(len), hi(len), 0x00,
  ]);
}

/** Informes de salida para pintar la infobar del Neo. */
export function construirPaginasInfoBarNeo(jpeg: Buffer, tamanoInforme = 1024): Buffer[] {
  return paginar(jpeg, tamanoInforme, 8, (ultima, pag, len) => [
    0x02, 0x0b, 0x00, ultima, lo(len), hi(len), lo(pag), hi(pag),
  ]);
}

/** Feature report de brillo (porcentaje recortado a 0..100). */
export function informeBrilloElgato(porcentaje: number): Buffer {
  const nivel = Number.isFinite(porcentaje) ? Math.round(Math.min(100, Math.max(0, porcentaje))) : 0;
  const informe = Buffer.alloc(LONGITUD_INFORME_FEATURE);
  informe[0] = 0x03;
  informe[1] = 0x08;
  informe[2] = nivel;
  return informe;
}

/** Feature report de reset al logo. */
export function informeResetElgato(): Buffer {
  const informe = Buffer.alloc(LONGITUD_INFORME_FEATURE);
  informe[0] = 0x03;
  informe[1] = 0x02;
  return informe;
}

/** Copia `previo` en un arreglo de al menos `minimo` posiciones (las nuevas en 0). */
function copiarEstado(previo: Uint8Array, minimo: number): Uint8Array {
  const nuevo = new Uint8Array(Math.max(previo.length, minimo));
  nuevo.set(previo);
  return nuevo;
}

/** Compara `[inicio, inicio+cantidad)` del informe con el estado y emite cambios. */
function diferenciarEstados(
  buf: Buffer, inicioBuf: number, cantidad: number, estado: Uint8Array, inicioEstado: number,
  abajo: EventoSuperficie['tipo'], arriba: EventoSuperficie['tipo'],
): EventoSuperficie[] {
  const eventos: EventoSuperficie[] = [];
  for (let i = 0; i < cantidad; i++) {
    const actual = buf[inicioBuf + i] ? 1 : 0;
    if (actual === estado[inicioEstado + i]) continue;
    estado[inicioEstado + i] = actual;
    eventos.push({ tipo: actual ? abajo : arriba, indice: i } as EventoSuperficie);
  }
  return eventos;
}

function interpretarTeclas(buf: Buffer, estado: Uint8Array, modelo: 'plus' | 'neo'): EventoSuperficie[] {
  // Neo: 8 teclas + 2 touch points (bytes 12 y 13) = 10 posiciones contiguas.
  const cantidad = modelo === 'neo' ? TECLAS_FISICAS + 2 : TECLAS_FISICAS;
  if (buf.length < OFFSET_TECLAS + cantidad) return [];
  return diferenciarEstados(buf, OFFSET_TECLAS, cantidad, estado, 0, 'tecla:abajo', 'tecla:arriba');
}

function interpretarTira(buf: Buffer): EventoSuperficie[] {
  if (buf.length < 14) return [];
  const tipo = buf[4];
  const x0 = buf.readUInt16LE(6);
  const y0 = buf.readUInt16LE(8);
  const zona = Math.min(ZONAS_TIRA - 1, Math.max(0, Math.floor(x0 / ANCHO_ZONA_TIRA)));
  if (tipo === 1 || tipo === 2) return [{ tipo: 'tira:toque', zona, x: x0, y: y0, largo: tipo === 2 }];
  if (tipo === 3) {
    return [{ tipo: 'tira:arrastre', zona, x0, y0, x1: buf.readUInt16LE(10), y1: buf.readUInt16LE(12) }];
  }
  return [];
}

function interpretarRuedas(buf: Buffer, estado: Uint8Array): EventoSuperficie[] {
  if (buf.length < OFFSET_RUEDAS + RUEDAS_PLUS) return [];
  if (buf[4] === 0x00) {
    // Estado de pulsación de ruedas: se guarda tras las teclas (posiciones 8..11).
    const eventos = diferenciarEstados(
      buf, OFFSET_RUEDAS, RUEDAS_PLUS, estado, TECLAS_FISICAS, 'rueda:abajo', 'rueda:arriba',
    );
    return eventos;
  }
  if (buf[4] !== 0x01) return [];
  const eventos: EventoSuperficie[] = [];
  for (let i = 0; i < RUEDAS_PLUS; i++) {
    const pasos = buf.readInt8(OFFSET_RUEDAS + i);
    if (pasos !== 0) eventos.push({ tipo: 'rueda:giro', indice: i, pasos });
  }
  return eventos;
}

/**
 * Decodifica un informe de entrada (byte 0 = 0x01).
 *
 * `estadoPrevioTeclas` guarda las teclas en las posiciones 0..7 (0..9 en Neo, con
 * los touch points en 8 y 9) y, en el Plus, la pulsación de las ruedas en 8..11.
 * Nunca lanza: informes cortos o de tipo desconocido devuelven cero eventos.
 */
export function interpretarEntradaElgato(
  buf: Buffer, estadoPrevioTeclas: Uint8Array, modelo: 'plus' | 'neo' = 'plus',
): { eventos: EventoSuperficie[]; nuevoEstadoTeclas: Uint8Array } {
  const minimo = modelo === 'neo' ? TECLAS_FISICAS + 2 : TECLAS_FISICAS + RUEDAS_PLUS;
  const estado = copiarEstado(estadoPrevioTeclas, minimo);
  if (buf.length < 5 || buf[0] !== 0x01) return { eventos: [], nuevoEstadoTeclas: estado };
  let eventos: EventoSuperficie[] = [];
  switch (buf[1]) {
    case 0x00: eventos = interpretarTeclas(buf, estado, modelo); break;
    case 0x02: eventos = modelo === 'plus' ? interpretarTira(buf) : []; break;
    case 0x03: eventos = modelo === 'plus' ? interpretarRuedas(buf, estado) : []; break;
    default: break;
  }
  return { eventos, nuevoEstadoTeclas: estado };
}
