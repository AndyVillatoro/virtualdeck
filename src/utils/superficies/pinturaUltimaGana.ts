/**
 * Pintar «lo último» sin encolar lo intermedio.
 *
 * El aviso de una perilla cuesta dibujar, codificar el JPEG y escribirlo por
 * HID, más que el intervalo entre dos pasos de un giro rápido. Si cada paso
 * lanzara su pintura, se amontonarían decenas y la tecla iría enseñando
 * valores viejos detrás del giro. Aquí hay **una pintura en vuelo por clave**
 * (el serial del aparato) y una sola pendiente: la última pedida sustituye a la
 * anterior que no llegó a empezar, y al terminar la que va en vuelo sale esa.
 *
 * Toda la contabilidad es síncrona dentro del mismo bucle (sin esperas entre
 * el último chequeo de pendientes y soltar la clave), así que ninguna pintura
 * pedida se queda sin hacer.
 */

export interface EstadoPinturas {
  enVuelo: Set<string>;
  siguientes: Map<string, () => Promise<void>>;
}

export function crearEstadoPinturas(): EstadoPinturas {
  return { enVuelo: new Set(), siguientes: new Map() };
}

/** Pide pintar; si ya hay una en vuelo para esa clave, queda como la siguiente. */
export function pedirPintura(estado: EstadoPinturas, clave: string, pintar: () => Promise<void>): void {
  estado.siguientes.set(clave, pintar);
  if (estado.enVuelo.has(clave)) return;
  estado.enVuelo.add(clave);
  void vaciar(estado, clave);
}

async function vaciar(estado: EstadoPinturas, clave: string): Promise<void> {
  try {
    for (;;) {
      const pintar = estado.siguientes.get(clave);
      if (!pintar) return;
      estado.siguientes.delete(clave);
      // Un fallo de una pintura no corta las siguientes del giro.
      try { await pintar(); } catch { /* la siguiente pedida se intenta igual */ }
    }
  } finally {
    estado.enVuelo.delete(clave);
  }
}
