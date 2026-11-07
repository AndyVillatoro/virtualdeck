/**
 * Adaptador `DriverSuperficie` para Elgato Stream Deck Plus y Neo.
 *
 * Usa el protocolo puro de `protocoloElgato.ts` sobre un transporte HID mínimo
 * (`TransporteHidElgato`), de modo que no se acopla a node-hid y se prueba sin
 * hardware. Las escrituras se serializan en una cola de promesas para que las
 * páginas de dos imágenes nunca se mezclen.
 */

import type { ControlId, DriverSuperficie } from '../driver';
import type { ModeloElgato } from './modelos';
import {
  construirPaginasInfoBarNeo, construirPaginasTeclaElgato, construirPaginasTiraElgato,
  informeBrilloElgato, informeResetElgato, interpretarEntradaElgato,
  type EventoSuperficie,
} from './protocoloElgato';

export type DescriptorModeloElgato = ModeloElgato;

/** Transporte HID mínimo (compatible con `HID.HID` de node-hid). */
export interface TransporteHidElgato {
  write(datos: number[] | Buffer): void;
  sendFeatureReport(datos: number[] | Buffer): void;
  close(): void;
  on?(evento: 'data' | 'error', cb: (...args: any[]) => void): void;
}

export interface CallbacksDriverElgato {
  alEvento?: (ev: EventoSuperficie) => void;
  alDesconectar?: (err: Error) => void;
}

export type DriverElgato = DriverSuperficie & { procesarEntradaCruda(buf: Buffer): EventoSuperficie[] };

/** Páginas a escribir para un control, o `undefined` si el modelo no lo admite. */
function paginasDeControl(modelo: ModeloElgato, control: ControlId, jpeg: Buffer): Buffer[] | undefined {
  const tamano = modelo.longitudInformeSalida;
  const tipo: string = typeof control === 'number' ? 'key' : control.tipo;
  const indice = typeof control === 'number' ? control : control.indice;
  if (tipo === 'key') {
    if (!Number.isInteger(indice) || indice < 0 || indice >= modelo.teclas.cantidad) return undefined;
    return construirPaginasTeclaElgato(indice, jpeg, tamano);
  }
  if (tipo === 'strip' && modelo.tiraLcd) {
    const { ancho, alto, zonas } = modelo.tiraLcd;
    if (indice < 0) return construirPaginasTiraElgato(0, 0, ancho, alto, jpeg, tamano);
    if (indice >= zonas) return undefined;
    const anchoZona = ancho / zonas;
    return construirPaginasTiraElgato(indice * anchoZona, 0, anchoZona, alto, jpeg, tamano);
  }
  if (tipo === 'infobar' && modelo.infoBar) return construirPaginasInfoBarNeo(jpeg, tamano);
  return undefined;
}

export function crearDriverElgato(
  transporte: TransporteHidElgato,
  modelo: DescriptorModeloElgato,
  callbacks: CallbacksDriverElgato = {},
): DriverElgato {
  let vivo = true;
  let cola: Promise<void> = Promise.resolve();
  let estadoTeclas: Uint8Array = new Uint8Array(modelo.teclas.cantidad + Math.max(modelo.touchPoints, modelo.ruedas));

  /** Encola una operación; un fallo rechaza a su llamador pero no bloquea la cola. */
  const encolar = (op: () => void): Promise<void> => {
    const tarea = cola.then(op);
    cola = tarea.catch(() => undefined);
    return tarea;
  };

  const cerrado = (): Promise<never> => Promise.reject(new Error('elgato:closed'));

  const procesarEntradaCruda = (buf: Buffer): EventoSuperficie[] => {
    const r = interpretarEntradaElgato(buf, estadoTeclas, modelo.id);
    estadoTeclas = r.nuevoEstadoTeclas;
    for (const ev of r.eventos) callbacks.alEvento?.(ev);
    return r.eventos;
  };

  transporte.on?.('data', (buf: Buffer) => { if (vivo) procesarEntradaCruda(buf); });
  transporte.on?.('error', (err: Error) => {
    if (!vivo) return;
    vivo = false;
    callbacks.alDesconectar?.(err instanceof Error ? err : new Error(String(err)));
  });

  return {
    get estaVivo(): boolean { return vivo; },
    imagen(control, jpeg) {
      if (!vivo) return cerrado();
      const paginas = paginasDeControl(modelo, control, jpeg);
      if (!paginas) return Promise.reject(new Error('elgato:unsupported-control'));
      return encolar(() => { for (const p of paginas) transporte.write(p); });
    },
    brillo(valor) {
      if (!vivo) return cerrado();
      return encolar(() => transporte.sendFeatureReport(informeBrilloElgato(valor)));
    },
    limpiar() {
      if (!vivo) return cerrado();
      return encolar(() => transporte.sendFeatureReport(informeResetElgato()));
    },
    async cerrar() {
      if (!vivo) return;
      vivo = false;
      await cola;
      transporte.close();
    },
    procesarEntradaCruda,
  };
}

