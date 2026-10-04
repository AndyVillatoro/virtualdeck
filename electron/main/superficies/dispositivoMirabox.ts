/**
 * Envoltorio de un Stream Dock conectado: cola de escritura serializada,
 * latido y ciclo de vida.
 *
 * La secuencia de comandos (BAT + trozos + STP, LIG, CONNECT, CLE DC) está
 * adaptada del módulo MIT `companion-surface-mirabox-stream-dock` de Bitfocus
 * (`src/streamdock.ts`). Ver THIRD_PARTY_NOTICES.md. No se usa código de
 * OpenDeck ni de opendeck-akp03 (GPL).
 *
 * Reglas del driver:
 * - **Un error de HID es una desconexión, nunca una excepción que tumbe el
 *   proceso.**
 * - Cada modelo tiene su `packetSize` (512 en los viejos, 1024 en el resto) y
 *   su id de salida LCD por tecla (no siempre `indice + 1`).
 * - El **brillo se fusiona**: si el deslizador manda cincuenta valores mientras
 *   la cola está ocupada, solo se escribe el último.
 */

import { HIDAsync } from 'node-hid';
import type { ModeloMirabox } from './modelos';
import * as proto from './protocoloMirabox';

export interface CallbacksDispositivo {
  /** Un reporte de entrada crudo (lo interpreta el gestor). */
  alEntrada: (buf: Buffer) => void;
  /** El dispositivo dejó de responder o se desenchufó. */
  alDesconectar: (error: Error) => void;
}

const MS_LATIDO = 8000;
const MS_DESPERTAR = 300;

const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class DispositivoMirabox {
  private cola: Promise<void> = Promise.resolve();
  private latido: NodeJS.Timeout | null = null;
  private cerrando = false;
  private cerrado = false;
  private desconectado = false;
  private brilloPendiente: number | null = null;
  private brilloEnCola = false;

  private constructor(
    readonly serial: string,
    readonly modelo: ModeloMirabox,
    private readonly hid: HIDAsync,
    private readonly callbacks: CallbacksDispositivo,
  ) {
    this.hid.on('data', (data: Buffer) => {
      if (!this.cerrando && !this.desconectado) this.callbacks.alEntrada(Buffer.from(data));
    });
    this.hid.on('error', (error: Error) => this.desconectar(error));
  }

  static async abrir(
    serial: string,
    modelo: ModeloMirabox,
    path: string,
    brillo: number,
    callbacks: CallbacksDispositivo,
  ): Promise<DispositivoMirabox> {
    const hid = await HIDAsync.open(path);
    const dispositivo = new DispositivoMirabox(serial, modelo, hid, callbacks);
    await dispositivo.iniciar(brillo);
    return dispositivo;
  }

  /** Despierta la pantalla (`DIS`) y arranca el latido cada 8 s. */
  private async iniciar(brillo: number): Promise<void> {
    await this.enCola(() => this.escribir(proto.paqueteComando(proto.DESPERTAR, this.modelo.packetSize)));
    await esperar(MS_DESPERTAR);
    await this.brillo(brillo);
    this.latido = setInterval(() => {
      void this.enCola(() => this.escribir(proto.paqueteComando(proto.LATIDO, this.modelo.packetSize)));
    }, MS_LATIDO);
  }

  get estaVivo(): boolean {
    return !this.cerrando && !this.cerrado && !this.desconectado;
  }

  /** Pinta una tecla LCD. `tecla0` es el índice de la tecla (0-based). */
  async imagen(tecla0: number, jpeg: Buffer): Promise<void> {
    if (!this.estaVivo) return;
    const control = this.modelo.controles.find((c) => c.tipo === 'key' && c.indice === tecla0);
    const lcdId = control?.lcdId;
    if (lcdId === undefined) return;
    await this.enCola(async () => {
      await this.escribir(proto.paqueteComando(proto.cabeceraImagen(jpeg.byteLength, lcdId), this.modelo.packetSize));
      for (const trozo of proto.trozosDeImagen(jpeg, this.modelo.packetSize)) {
        await this.escribir(proto.paqueteTrozo(trozo, this.modelo.packetSize));
      }
      await this.escribir(proto.paqueteComando(proto.REFRESCO, this.modelo.packetSize));
    });
  }

  /**
   * Brillo en vivo, fusionado: cada llamada guarda el último valor y la cola
   * tiene **una sola** tarea que va escribiendo el más reciente. Un deslizador
   * a 60 Hz no encola 60 escrituras: la cola nunca crece y el aparato recibe
   * siempre el último valor, no una cola de valores viejos.
   */
  brillo(valor: number): Promise<void> {
    if (!this.estaVivo) return Promise.resolve();
    this.brilloPendiente = valor;
    if (this.brilloEnCola) return Promise.resolve();
    this.brilloEnCola = true;
    return this.enCola(() => this.escribirBrilloPendiente());
  }

  private async escribirBrilloPendiente(): Promise<void> {
    while (this.brilloPendiente !== null) {
      const valor = this.brilloPendiente;
      this.brilloPendiente = null;
      await this.escribir(proto.paqueteComando(proto.comandoBrillo(valor), this.modelo.packetSize));
    }
    this.brilloEnCola = false;
    // Una llamada que llegó justo entre el último chequeo y este punto.
    if (this.brilloPendiente !== null) void this.brillo(this.brilloPendiente);
  }

  /** Borra todas las teclas y refresca. */
  async limpiar(): Promise<void> {
    if (!this.estaVivo) return;
    await this.enCola(async () => {
      await this.escribir(proto.paqueteComando(proto.LIMPIAR_TODO, this.modelo.packetSize));
      await this.escribir(proto.paqueteComando(proto.REFRESCO, this.modelo.packetSize));
    });
  }

  /** Borra todo, apaga la pantalla de forma limpia (`CLE DC`) y cierra el HID. */
  async cerrar(): Promise<void> {
    if (this.cerrando || this.cerrado) return;
    this.cerrando = true;
    if (this.latido) { clearInterval(this.latido); this.latido = null; }
    await this.enCola(async () => {
      await this.escribir(proto.paqueteComando(proto.LIMPIAR_TODO, this.modelo.packetSize));
      await this.escribir(proto.paqueteComando(proto.REFRESCO, this.modelo.packetSize));
      await esperar(150);
      await this.escribir(proto.paqueteComando(proto.APAGAR, this.modelo.packetSize));
    });
    this.cerrado = true;
    try { await this.hid.close(); } catch { /* ya no está */ }
  }

  /** Escribe un paquete; un fallo no se propaga: desconecta. */
  private async escribir(buffer: Buffer): Promise<void> {
    await this.hid.write(buffer);
  }

  /**
   * Encola una tarea tras la anterior. Dos imágenes a la vez no pueden
   * intercalar trozos: cada llamada ve la cola completa de la anterior.
   */
  private enCola(tarea: () => Promise<void>): Promise<void> {
    const siguiente = this.cola.then(tarea).catch((error: Error) => {
      this.desconectar(error);
    });
    this.cola = siguiente;
    return siguiente;
  }

  private desconectar(error: Error): void {
    if (this.desconectado || this.cerrando) return;
    this.desconectado = true;
    if (this.latido) { clearInterval(this.latido); this.latido = null; }
    void this.hid.close().catch(() => {});
    this.callbacks.alDesconectar(error);
  }
}
