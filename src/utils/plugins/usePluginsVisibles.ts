import { useEffect, useRef } from 'react';
import { botonesResueltos } from '../botonesFijos';
import { contextoDe, esAccionPlugin, mismaRef, refDe } from './ref';
import { borrarVisual } from './visual';
import type { DeckConfig, ElectronAPI } from '../../types';
import type { PluginRef } from '../../types/plugins';

/**
 * `willAppear` / `willDisappear`: avisar a los plugins de qué botones hay en
 * pantalla.
 *
 * Es lo que hace que un plugin pueda pintar su icono y su estado antes de que
 * nadie pulse nada, y lo que le dice cuándo dejar de hacerlo. Sin el aviso de
 * desaparición, un plugin de «página 2 de 3» se queda en la 2 para siempre al
 * cambiar de página.
 *
 * Lo que hay en pantalla son los botones **de la página activa** más los fijos
 * que se ven desde ella (`botonesResueltos`, el mismo reparto que la rejilla):
 * los plugins del deck y del kiosco. Los de un dock y los del mando móvil se
 * avisan desde su propio sitio cuando se implementen (ver `docs/NOTAS-TECNICAS`).
 */

interface Opciones {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  /** Índice de la página que se está viendo. */
  pagina: number;
  /** False cuando no hay pantalla de deck delante (kiosko cerrado, otra vista). */
  visible: boolean;
}

type Enviados = Map<string, PluginRef>;

function refsDeLaPagina(config: DeckConfig, pagina: number): Enviados {
  const mapa: Enviados = new Map();
  for (const b of botonesResueltos(config, pagina)) {
    if (!esAccionPlugin(b.action)) continue;
    const contexto = contextoDe(b, config);
    const ref = refDe(b.action, contexto);
    if (ref) mapa.set(contexto, ref);
  }
  return mapa;
}

function enviar(api: ElectronAPI, ref: PluginRef, visible: boolean): void {
  api.plugins.appear(ref, visible).catch(() => {});
}

export function usePluginsVisibles({ api, config, pagina, visible }: Opciones) {
  // Lo último que se le mandó a cada contexto, para no repetir el aviso en cada
  // repintado: solo se vuelve a mandar si el botón **cambió** (otro plugin,
  // otra acción u otros ajustes).
  const enviados = useRef<Enviados>(new Map());

  useEffect(() => {
    if (!api?.plugins) return;
    const previos = enviados.current;
    const ahora: Enviados = visible ? refsDeLaPagina(config, pagina) : new Map();

    for (const [contexto, ref] of ahora) {
      const antes = previos.get(contexto);
      if (antes && mismaRef(antes, ref)) continue;
      // Lo que cambió de plugin, de acción o de ajustes se desaparece antes de
      // aparecer de nuevo: hay que soltar el estado de la tecla anterior.
      if (antes) enviar(api, antes, false);
      enviar(api, ref, true);
    }
    // Los que se fueron de la página (o de la pantalla) desaparecen, y se
    // olvida lo que pintaron para que la celda no se quede con su última foto.
    for (const [contexto, ref] of previos) {
      if (ahora.has(contexto)) continue;
      enviar(api, ref, false);
      borrarVisual(contexto);
    }
    enviados.current = ahora;
  }, [api, config, pagina, visible]);
}
