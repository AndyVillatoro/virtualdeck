import type { PluginRef } from '../../../src/types';
import { ESPERA_REGISTRO_MS, estado, type Marcha, type MarchaLista } from './estado';
import { existeInstalado } from './inventario';
import { arrancar } from './cicloVida';
import { validarUuid } from './instalacion';
import { abrirVentanaPI } from './ventanaPI';

/**
 * Interacción con los plugins en marcha (roadmap 83, MVP).
 *
 * Lo que pasa cuando un botón aparece, se pulsa o abre su PI: resuelve la
 * marcha lista para hablar (`marchaLista`, arrancando el plugin y esperando su
 * registro hasta 3 s si hace falta) y le manda el evento por su anfitrión. El
 * ciclo de vida (arrancar, reintentar, detener) es de `cicloVida.ts`.
 */

/** El botón apareció (`willAppear`) o dejó de estarlo (`willDisappear`). */
export async function aparecerPlugin(ref: PluginRef, visible: boolean): Promise<boolean> {
  const lista = await marchaLista(ref);
  if (!lista) return false;
  const accion = lista.marcha.manifiesto.acciones.find((a) => a.uuid === ref.accionUuid);
  if (!accion) return false;
  if (visible) {
    const settings = settingsDe(ref);
    lista.anfitrion.aparecer(ref.contexto, { accion: ref.accionUuid, settings });
    estado.contextos.registrar(ref.contexto, {
      pluginUuid: ref.pluginUuid,
      accionUuid: ref.accionUuid,
      settings,
      columna: 0,
      fila: 0,
    });
  } else {
    lista.anfitrion.desaparecer(ref.contexto);
    estado.contextos.retirar(ref.contexto);
  }
  return true;
}

export async function pulsarPlugin(ref: PluginRef, abajo: boolean): Promise<boolean> {
  const lista = await marchaLista(ref);
  if (!lista || !estado.contextos.tiene(ref.contexto)) return false;
  lista.anfitrion.tecla(ref.contexto, abajo);
  return true;
}

/** Los ajustes que trae el botón, o un objeto vacío si trae otra cosa. */
function settingsDe(ref: PluginRef): Record<string, unknown> {
  if (ref.settings !== null && typeof ref.settings === 'object' && !Array.isArray(ref.settings)) {
    return ref.settings as Record<string, unknown>;
  }
  return {};
}

/**
 * La marcha lista para hablar con el plugin, o `null`. Si está habilitado
 * pero parado, se arranca; si aún no se registró, se espera hasta 3 s. El
 * anfitrión va en un local ya estrechado, sin `as`.
 */
async function marchaLista(ref: PluginRef | undefined): Promise<MarchaLista | null> {
  if (!ref || !validarUuid(ref.pluginUuid)) return null;
  if (typeof ref.contexto !== 'string' || ref.contexto === '') return null;
  if (typeof ref.accionUuid !== 'string' || ref.accionUuid === '') return null;
  if (!estado.enMarcha.has(ref.pluginUuid)) {
    if (estado.deshabilitados.has(ref.pluginUuid) || !existeInstalado(ref.pluginUuid)) return null;
    await arrancar(ref.pluginUuid);
  }
  const marcha = estado.enMarcha.get(ref.pluginUuid);
  // En levantamiento o reintentando: se espera al registro en vez de fallar.
  // Los `appear` de varios botones llegan en paralelo al arrancar (hallazgo
  // #5): el primero levanta y los demás esperan a esta misma marcha.
  if (marcha && !marcha.registrado) {
    if (!(await esperarRegistro(ref.pluginUuid, marcha))) return null;
  }
  const actual = estado.enMarcha.get(ref.pluginUuid);
  const actualAnfitrion = actual?.anfitrion;
  if (!actual || actual !== marcha || !actualAnfitrion) return null;
  return { marcha: actual, anfitrion: actualAnfitrion };
}

function esperarRegistro(uuid: string, marcha: Marcha): Promise<boolean> {
  if (marcha.registrado) return Promise.resolve(true);
  return new Promise((listo) => {
    const temporizador = setTimeout(() => {
      const indice = marcha.enEspera.indexOf(despertar);
      if (indice >= 0) marcha.enEspera.splice(indice, 1);
      listo(estado.enMarcha.get(uuid) === marcha && marcha.registrado);
    }, ESPERA_REGISTRO_MS);
    const despertar = (ok: boolean) => {
      clearTimeout(temporizador);
      listo(ok);
    };
    // Sin guardar el temporizador en la marcha: si se desinstala, la espera se
    // resuelve con `false` por el vaciado de `detenerMarcha` y este `listo`
    // tardío ya no hace nada.
    marcha.enEspera.push(despertar);
  });
}

export async function abrirPIPlugin(ref: PluginRef): Promise<boolean> {
  const lista = await marchaLista(ref);
  if (!lista) return false;
  const accion = lista.marcha.manifiesto.acciones.find((a) => a.uuid === ref.accionUuid);
  const piPath = accion?.piPath ?? lista.marcha.manifiesto.piPath;
  if (!accion || !piPath) return false;
  const abierto = lista.marcha.pis.get(ref.contexto);
  if (abierto && !abierto.isDestroyed()) {
    abierto.focus();
    return true;
  }
  const guardado = estado.contextos.obtener(ref.contexto);
  const win = abrirVentanaPI({
    uuid: lista.marcha.manifiesto.uuid,
    carpeta: lista.marcha.manifiesto.carpeta,
    piPath,
    puerto: lista.anfitrion.puerto,
    puertoArchivos: lista.marcha.puertoArchivos,
    contexto: ref.contexto,
    accion: ref.accionUuid,
    infoJSON: lista.anfitrion.infoJSON,
    tamano: lista.marcha.manifiesto.tamanoPI,
    settings: guardado?.settings ?? settingsDe(ref),
    coordinates: { column: guardado?.columna ?? 0, row: guardado?.fila ?? 0 },
  });
  lista.marcha.pis.set(ref.contexto, win);
  win.on('closed', () => {
    if (lista.marcha.pis.get(ref.contexto) === win) lista.marcha.pis.delete(ref.contexto);
  });
  return true;
}
