/**
 * Las imágenes de las teclas que esperan turno para escribirse en el aparato.
 *
 * Escribir una imagen son varios paquetes HID (cabecera, trozos y refresco) y
 * van por la misma cola serializada que todo lo demás. Un giro rápido de
 * perilla pinta el aviso de la tecla en cada paso: sin esto cada paso encolaba
 * su imagen entera y el aparato pintaba valores viejos uno tras otro mientras
 * la cola crecía (con el aviso final y la restauración esperando al fondo).
 *
 * Aquí **la última imagen de cada tecla gana**: mientras una tanda espera su
 * turno o se está escribiendo, una imagen nueva para la misma tecla sustituye a
 * la que aún no salió. Las teclas distintas no se pisan entre sí.
 *
 * Una orden que no es imagen (borrar, cerrar) cierra la tanda con
 * `cerrarTanda()`: lo que se pida después va en una tanda nueva, detrás de ella.
 * Así el orden entre imágenes y órdenes se conserva, que es lo único que no
 * puede cambiar.
 *
 * Independiente del HID: recibe cómo encolar y cómo escribir, para poder
 * probarlo con una escritura simulada.
 */

export type EncolarTarea = (tarea: () => Promise<void>) => Promise<void>;
export type EscribirImagen = (lcdId: number, jpeg: Buffer) => Promise<void>;

interface Tanda {
  /** Por id de salida LCD; `Map` conserva el orden en que se pidió cada tecla. */
  pendientes: Map<number, Buffer>;
  hecha: Promise<void>;
}

export class ColaImagenes {
  private tanda: Tanda | null = null;
  /** Cuántas imágenes se escribieron de verdad (para medir lo que se ahorra). */
  escritas = 0;
  /** Cuántas se sustituyeron antes de salir. */
  sustituidas = 0;

  constructor(
    private readonly encolar: EncolarTarea,
    private readonly escribir: EscribirImagen,
  ) {}

  /** Pide pintar una tecla. Resuelve cuando termina la tanda que la lleva. */
  poner(lcdId: number, jpeg: Buffer): Promise<void> {
    if (this.tanda) {
      if (this.tanda.pendientes.has(lcdId)) this.sustituidas += 1;
      this.tanda.pendientes.set(lcdId, jpeg);
      return this.tanda.hecha;
    }
    const tanda: Tanda = { pendientes: new Map([[lcdId, jpeg]]), hecha: Promise.resolve() };
    this.tanda = tanda;
    tanda.hecha = this.encolar(() => this.vaciar(tanda));
    return tanda.hecha;
  }

  /** Lo que se pida desde ahora va detrás de lo que ya esté en la cola. */
  cerrarTanda(): void {
    this.tanda = null;
  }

  private async vaciar(tanda: Tanda): Promise<void> {
    try {
      for (;;) {
        const siguiente = tanda.pendientes.entries().next();
        if (siguiente.done) break;
        const [lcdId, jpeg] = siguiente.value;
        // Se saca antes de escribir: una imagen nueva de esta misma tecla
        // durante la escritura vuelve a quedar pendiente y sale después.
        tanda.pendientes.delete(lcdId);
        await this.escribir(lcdId, jpeg);
        this.escritas += 1;
      }
    } finally {
      // Sin esperas entre el último chequeo y esto: nada se cuela sin escribir.
      if (this.tanda === tanda) this.tanda = null;
    }
  }
}
