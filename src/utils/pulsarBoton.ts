import { executeAction, runActionSequence } from './actions';
import type { ButtonAction, ButtonConfig, DeckConfig, ElectronAPI } from '../types';

/**
 * Lo que pasa cuando se pulsa un botón. **Un solo sitio.**
 *
 * Estaba escrito tres veces —la pantalla principal, kiosko y el disparador
 * automático de `App`— y las tres copias habían divergido:
 *
 * | | principal | kiosko | automático |
 * |---|---|---|---|
 * | grupo radio | sí | **no** | **no** |
 * | tope de 60 s | sí | **no** | **no** |
 * | captura de salida del script | sí | sí | **no** |
 * | avisar del error | sí | sí | **no** |
 *
 * O sea: un botón de grupo radio activado por atajo global, por la bandeja, a
 * una hora o por un sensor **dejaba encendidos los demás del grupo**; en
 * kiosko tampoco funcionaba, que es justo el modo de dejar el deck solo. Y una
 * acción disparada sola que fallaba no lo decía en ninguna parte.
 *
 * Lo que sí se queda fuera, en cada llamador, es lo que de verdad es suyo: el
 * indicador de «ejecutando», el registro de ejecución y el sonido.
 */

/** Resultado de un script, tal y como lo espera `runActionSequence`. */
interface SalidaScript { ok: boolean; output?: string; error?: string }

export interface EntornoPulsacion {
  api: ElectronAPI;
  config: DeckConfig;
  /**
   * Los botones encendidos, **leidos en el momento de pulsar**.
   *
   * Es una funcion y no el `Set` a proposito. `ButtonCell` esta memoizado con
   * un comparador que ignora los manejadores, y solo se redibuja cuando cambia
   * algo suyo —incluido su propio `toggled`—. Asi que la celda que se pulsa
   * conserva el manejador de su primer render, y con el un `toggledIds` de
   * entonces: vacio.
   *
   * Eso no se notaba en la accion de apagar, porque para llegar a ella la
   * celda ya habia cambiado su propio `toggled` y tenia el manejador fresco.
   * Pero el grupo radio mira **otras** celdas, y esas no habian cambiado: al
   * encender uno del grupo, los demas se quedaban encendidos. Medido en
   * kiosko: tres botones del mismo grupo, los tres encendidos a la vez.
   */
  toggledIds: () => Set<string>;
  onToggle: (id: string) => void;
  onStateUpdate: (cambio: Record<string, string>) => void;
  /** Dónde se enseña un error o la salida de un script. */
  avisar: (texto: string) => void;
  t: (k: string, v?: Record<string, string | number>) => string;
  /**
   * Resuelve un paso `page-nav` en el contexto del llamador.
   *
   * Solo él sabe desde dónde se pulsa: un dock navega entre sus páginas con
   * `activarPagina`, el deck entre las suyas con `onPageChange`. Sin callback
   * (la barra flotante, que no tiene página que cambiar —igual que no tiene
   * overlay de carpetas—) el paso no hace nada y da OK, como `folder`.
   */
  navegar?: (accion: ButtonAction) => boolean;
}

/**
 * Techo duro para una acción colgada.
 *
 * Un webhook que no contesta o un script en bucle dejarían el botón marcado
 * como «ejecutando» para siempre. Las llamadas de PowerShell tienen sus
 * propios plazos, más cortos, en el proceso principal; esto es la red para lo
 * que se ejecuta del lado de la interfaz.
 */
const MS_COLGADA = 60000;

function conPlazo<T extends { ok: boolean; error?: string; stateUpdate?: Record<string, unknown> }>(
  p: Promise<T>, respaldo: T,
): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(respaldo), MS_COLGADA))]);
}

/**
 * El gancho de scripts.
 *
 * Sin él, `runActionSequence` ejecuta el script pero **descarta la salida**, y
 * con ella «guardar la salida en una variable» y «mostrar la salida». No es un
 * detalle: son dos casillas del editor que sencillamente no hacían nada por el
 * camino automático.
 */
function ganchoScripts(acciones: DeckConfig['buttons'][number]['action'][], e: EntornoPulsacion) {
  return {
    runScript: async (script: string, shell?: string): Promise<SalidaScript> => {
      const def = acciones.find((a) => a.type === 'script' && a.script === script);
      const necesitaSalida = def?.showOutput || def?.captureToVar;
      try {
        if (necesitaSalida) {
          const out = await e.api.launch.scriptCapture(script, shell);
          if (def?.showOutput && out.output) e.avisar(out.output);
          return { ok: out.success, output: out.output, error: out.success ? undefined : e.t('act.err.script') };
        }
        const ok = await e.api.launch.script(script, shell);
        return { ok, error: ok ? undefined : e.t('act.err.script') };
      } catch (err) {
        return { ok: false, error: e.t('act.err.unexpected', { que: 'script', msg: (err as Error).message }) };
      }
    },
  };
}

/**
 * Traslada al estado global **solo lo que cambió de verdad**, y avisa del error.
 *
 * El bloque estaba en **cuatro** puntos de este fichero, y no era el mismo los
 * cuatro: en `pulsarBoton` (la secuencia) y en `ejecutarUna` filtraba las
 * variables que no habían cambiado; en `pulsarBoton` (la rama de *toggle-off*) y
 * en `pulsacionLarga` se pasaba el `stateUpdate` entero, sin filtrar. Esa
 * diferencia no era intencionada: el bloque se copió a mano y dos de las copias
 * se quedaron a medias.
 *
 * Ahora es una función y la llaman los cuatro, así que no puede volver a
 * separarse. Lo único que cambia de verdad es que un `stateUpdate` cuyos valores
 * ya son los que había deja de avisar a la app con una escritura que no cambia
 * nada: el estado resultante es el mismo, solo se ahorra el re-render y el
 * guardado en disco.
 */

function persistirYCrujir(
  r: { ok: boolean; error?: string; stateUpdate?: Record<string, unknown> },
  base: Record<string, string>, e: EntornoPulsacion,
): void {
  const update = r.stateUpdate ?? {};
  const cambio: Record<string, string> = {};
  for (const [k, v] of Object.entries(update)) {
    if (v !== base[k]) cambio[k] = v as string;
  }
  if (Object.keys(cambio).length > 0) e.onStateUpdate(cambio);
  if (!r.ok && r.error) e.avisar(r.error);
}

export interface ResultadoPulsacion {
  ok: boolean;
  error?: string;
  /** El tipo que se registra en el log de ejecución. */
  tipo: string;
}

/**
 * Aparta los pasos `page-nav` de una secuencia y los resuelve con el llamador.
 *
 * Van fuera del `runActionSequence` a propósito: la navegación no es una
 * acción del sistema, es cambiar de página en la interfaz, y solo quien llama
 * sabe entre qué páginas (ver `pageNav.ts`). Lo que queda se ejecuta normal;
 * si no queda nada, es OK —igual que `folder` cuando abre su overlay—.
 */
function apartarNavegacion(acciones: ButtonAction[], e: EntornoPulsacion): ButtonAction[] {
  if (!e.navegar) return acciones;
  const resto: ButtonAction[] = [];
  for (const a of acciones) {
    if (a.type === 'page-nav') e.navegar(a);
    else resto.push(a);
  }
  return resto;
}

export async function pulsarBoton(
  btn: ButtonConfig, e: EntornoPulsacion,
): Promise<ResultadoPulsacion> {
  if (btn.isToggle) {
    const encendidos = e.toggledIds();
    const estaba = encendidos.has(btn.id);
    e.onToggle(btn.id);
    // Grupo radio: al encender este, se apagan los demás del grupo.
    if (!estaba && btn.radioGroup) {
      for (const otro of e.config.buttons) {
        if (otro.radioGroup === btn.radioGroup && otro.id !== btn.id && encendidos.has(otro.id)) {
          e.onToggle(otro.id);
        }
      }
    }
    if (estaba && btn.actionToggleOff && btn.actionToggleOff.type !== 'none') {
      return ejecutarApagado(btn, e);
    }
  }

  const acciones = (btn.actions && btn.actions.length > 0) ? btn.actions : [btn.action];
  // Los pasos `page-nav` los resuelve el llamador; lo que queda —si queda—
  // se ejecuta normal. Con la lista vacía la secuencia es OK sin hacer nada,
  // igual que `folder` cuando abre su overlay.
  const resto = apartarNavegacion(acciones, e);
  const base = e.config.state ?? {};
  const r = await conPlazo(
    runActionSequence(resto, e.api, base, ganchoScripts(resto, e), e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout'), stateUpdate: {} },
  );
  persistirYCrujir(r, base, e);
  return { ok: r.ok, error: r.error, tipo: btn.action.type };
}

/**
 * La acción de apagado de un toggle.
 *
 * Se extrajo de `pulsarBoton` para que la navegación no le sume ramas: con el
 * `page-nav` del apagado llegaba a 20 sobre un límite de 18.
 */
async function ejecutarApagado(btn: ButtonConfig, e: EntornoPulsacion): Promise<ResultadoPulsacion> {
  const off = btn.actionToggleOff!;
  // El apagado también puede ser navegar: no hay nada que ejecutar.
  if (off.type === 'page-nav') {
    e.navegar?.(off);
    return { ok: true, tipo: 'page-nav' };
  }
  const r = await conPlazo(
    executeAction(off, e.api, e.config.state, e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout') },
  );
  persistirYCrujir(r, e.config.state ?? {}, e);
  return { ok: r.ok, error: r.error, tipo: off.type };
}

/**
 * Ejecuta **una** acción suelta con el contexto completo.
 *
 * La usan los botones de dentro de una carpeta, que no son botones del deck
 * —no tienen id, ni interruptor, ni secuencia— pero sí necesitan lo demás.
 *
 * Antes llamaban a `executeAction` a secas, y ahí está la trampa: `script` es
 * uno de los tipos que **resuelve el llamador**, así que `executeAction` lo
 * daba por bueno y devolvía OK sin ejecutar nada. El sub-botón destellaba,
 * sonaba, la carpeta se cerraba y el script no corría. Medido con el mismo
 * script en un botón normal y en un sub-botón: el normal escribía su archivo y
 * el sub-botón no.
 */
export async function ejecutarUna(
  accion: ButtonConfig['action'], e: EntornoPulsacion,
): Promise<ResultadoPulsacion> {
  // Los sub-botones de una carpeta también pueden navegar: mismo callback que
  // una celda del deck, con el mismo contexto (el overlay recibe `entorno`).
  if (accion.type === 'page-nav') {
    e.navegar?.(accion);
    return { ok: true, tipo: 'page-nav' };
  }
  const base = e.config.state ?? {};
  const r = await conPlazo(
    runActionSequence([accion], e.api, base, ganchoScripts([accion], e), e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout'), stateUpdate: {} },
  );
  persistirYCrujir(r, base, e);
  return { ok: r.ok, error: r.error, tipo: accion.type };
}

/** La acción alternativa de mantener pulsado. También compartida. */
export async function pulsacionLarga(
  btn: ButtonConfig, e: EntornoPulsacion,
): Promise<ResultadoPulsacion | null> {
  if (!btn.longPressAction || btn.longPressAction.type === 'none') return null;
  if (btn.longPressAction.type === 'page-nav') {
    e.navegar?.(btn.longPressAction);
    return { ok: true, tipo: 'page-nav' };
  }
  const r = await conPlazo(
    executeAction(btn.longPressAction, e.api, e.config.state, e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout') },
  );
  persistirYCrujir(r, e.config.state ?? {}, e);
  return { ok: r.ok, error: r.error, tipo: btn.longPressAction.type };
}
