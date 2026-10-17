import { useEffect, useRef } from 'react';
import { botonesResueltos } from '../botonesFijos';
import { contextoDe, esAccionPlugin, mismaRef, refDe } from './ref';
import { borrarVisual } from './visual';
import type { DeckConfig, ElectronAPI, PluginInfo } from '../../types';
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
  // La vista actual por referencia: la conciliación con la marcha (efecto de
  // abajo) la lee sin re-suscribirse en cada repintado.
  const vista = useRef({ config, pagina, visible });
  vista.current = { config, pagina, visible };

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

  // La marcha cambió (habilitar, deshabilitar, desinstalar, reinstalar): se
  // concilia sin esperar a que cambie la página (hallazgo #8).
  useEffect(() => {
    if (!api?.plugins) return undefined;
    return api.plugins.onChanged((lista) => conciliarConMarcha(api, lista, enviados.current, vista.current));
  }, [api]);
}

/**
 * Lo que la marcha obliga a corregir aunque la página no haya cambiado:
 *
 * - Un plugin parado deja su última imagen clavada en la celda (el botón sigue
 *   siendo de tipo `plugin` en la config): se olvida lo que pintó. La entrada
 *   de `enviados` se conserva para que al rehabilitar no haya que reenviar
 *   nada —el gestor reaparece solo los contextos que conserva—.
 * - Un plugin desinstalado ya no vuelve: su entrada sí se saca.
 * - Un plugin reinstalado que vuelve a `running` no recibiría `willAppear`
 *   (sus contextos se retiraron al desinstalar y la página no cambió): se le
 *   aparece lo visible que falte.
 */
function conciliarConMarcha(
  api: ElectronAPI,
  lista: PluginInfo[],
  enviados: Enviados,
  vista: { config: DeckConfig; pagina: number; visible: boolean },
): void {
  const presentes = new Set(lista.map((p) => p.uuid));
  const enMarcha = new Set(lista.filter((p) => p.estado === 'running' || p.estado === 'starting').map((p) => p.uuid));
  for (const [contexto, ref] of [...enviados]) {
    if (!presentes.has(ref.pluginUuid)) {
      enviados.delete(contexto);
      borrarVisual(contexto);
    } else if (!enMarcha.has(ref.pluginUuid)) {
      borrarVisual(contexto);
    }
  }
  if (!vista.visible) return;
  for (const [contexto, ref] of refsDeLaPagina(vista.config, vista.pagina)) {
    if (enviados.has(contexto) || !enMarcha.has(ref.pluginUuid)) continue;
    enviados.set(contexto, ref);
    enviar(api, ref, true);
  }
}
