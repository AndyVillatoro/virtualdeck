/**
 * Envoltorio de un Stream Dock N3 conectado: cola de escritura serializada,
 * latido y ciclo de vida.
 *
 * La secuencia de comandos (BAT + trozos + STP, LIG, CONNECT, CLE DC) está
 * adaptada del módulo MIT `companion-surface-mirabox-stream-dock` de Bitfocus
 * (`src/streamdock.ts`). Ver THIRD_PARTY_NOTICES.md. No se usa código de
 * OpenDeck ni de opendeck-akp03 (GPL).
 *
 * Regla de oro: **un error de HID es una desconexión, nunca una excepción que
 * tumbe el proceso**. Todas las escrituras pasan por la cola y los fallos
 * terminan en el callback de desconexión.
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
    await this.enCola(() => this.escribir(proto.paqueteComando(proto.DESPERTAR)));
    await esperar(MS_DESPERTAR);
    await this.brillo(brillo);
    this.latido = setInterval(() => {
      void this.enCola(() => this.escribir(proto.paqueteComando(proto.LATIDO)));
    }, MS_LATIDO);
  }

  get estaVivo(): boolean {
    return !this.cerrando && !this.cerrado && !this.desconectado;
  }

  /** Pinta una tecla LCD. `tecla0` es 0-based; el hardware usa keyId 1–6. */
  async imagen(tecla0: number, jpeg: Buffer): Promise<void> {
    if (!this.estaVivo) return;
    // Llega por IPC: una tecla que no existe no puede convertirse en un keyId que el firmware interprete.
    if (!Number.isInteger(tecla0) || tecla0 < 0 || tecla0 >= this.modelo.teclas) return;
    const keyId = tecla0 + 1;
    await this.enCola(async () => {
      await this.escribir(proto.paqueteComando(proto.cabeceraImagen(jpeg.byteLength, keyId)));
      for (const trozo of proto.trozosDeImagen(jpeg)) {
        await this.escribir(proto.paqueteTrozo(trozo));
      }
      await this.escribir(proto.paqueteComando(proto.REFRESCO));
    });
  }

  async brillo(valor: number): Promise<void> {
    if (!this.estaVivo) return;
    await this.enCola(() => this.escribir(proto.paqueteComando(proto.comandoBrillo(valor))));
  }

  /** Borra todas las teclas y refresca. */
  async limpiar(): Promise<void> {
    if (!this.estaVivo) return;
    await this.enCola(async () => {
      await this.escribir(proto.paqueteComando(proto.LIMPIAR_TODO));
      await this.escribir(proto.paqueteComando(proto.REFRESCO));
    });
  }

  /** Borra todo, apaga la pantalla de forma limpia (`CLE DC`) y cierra el HID. */
  async cerrar(): Promise<void> {
    if (this.cerrando || this.cerrado) return;
    this.cerrando = true;
    if (this.latido) { clearInterval(this.latido); this.latido = null; }
    await this.enCola(async () => {
      await this.escribir(proto.paqueteComando(proto.LIMPIAR_TODO));
      await this.escribir(proto.paqueteComando(proto.REFRESCO));
      await esperar(150);
      await this.escribir(proto.paqueteComando(proto.APAGAR));
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
