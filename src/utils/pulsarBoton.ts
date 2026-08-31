import { executeAction, runActionSequence } from './actions';
import type { ButtonConfig, DeckConfig, ElectronAPI } from '../types';

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

export interface ResultadoPulsacion {
  ok: boolean;
  error?: string;
  /** El tipo que se registra en el log de ejecución. */
  tipo: string;
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
      const r = await conPlazo(
        executeAction(btn.actionToggleOff, e.api, e.config.state, e.config.rgb?.profiles, e.t),
        { ok: false, error: e.t('act.err.timeout') },
      );
      if (r.stateUpdate) e.onStateUpdate(r.stateUpdate as Record<string, string>);
      if (!r.ok && r.error) e.avisar(r.error);
      return { ok: r.ok, error: r.error, tipo: btn.actionToggleOff.type };
    }
  }

  const acciones = (btn.actions && btn.actions.length > 0) ? btn.actions : [btn.action];
  const base = e.config.state ?? {};
  const r = await conPlazo(
    runActionSequence(acciones, e.api, base, ganchoScripts(acciones, e), e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout'), stateUpdate: {} },
  );
  // Solo se persiste lo que cambió de verdad.
  const nuevas = Object.keys(r.stateUpdate ?? {}).filter((k) => r.stateUpdate![k] !== base[k]);
  if (nuevas.length > 0 && r.stateUpdate) {
    const cambio: Record<string, string> = {};
    for (const k of nuevas) cambio[k] = r.stateUpdate[k] as string;
    e.onStateUpdate(cambio);
  }
  if (!r.ok && r.error) e.avisar(r.error);
  return { ok: r.ok, error: r.error, tipo: btn.action.type };
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
  const base = e.config.state ?? {};
  const r = await conPlazo(
    runActionSequence([accion], e.api, base, ganchoScripts([accion], e), e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout'), stateUpdate: {} },
  );
  const nuevas = Object.keys(r.stateUpdate ?? {}).filter((k) => r.stateUpdate![k] !== base[k]);
  if (nuevas.length > 0 && r.stateUpdate) {
    const cambio: Record<string, string> = {};
    for (const k of nuevas) cambio[k] = r.stateUpdate[k] as string;
    e.onStateUpdate(cambio);
  }
  if (!r.ok && r.error) e.avisar(r.error);
  return { ok: r.ok, error: r.error, tipo: accion.type };
}

/** La acción alternativa de mantener pulsado. También compartida. */
export async function pulsacionLarga(
  btn: ButtonConfig, e: EntornoPulsacion,
): Promise<ResultadoPulsacion | null> {
  if (!btn.longPressAction || btn.longPressAction.type === 'none') return null;
  const r = await conPlazo(
    executeAction(btn.longPressAction, e.api, e.config.state, e.config.rgb?.profiles, e.t),
    { ok: false, error: e.t('act.err.timeout') },
  );
  if (r.stateUpdate) e.onStateUpdate(r.stateUpdate as Record<string, string>);
  if (!r.ok && r.error) e.avisar(r.error);
  return { ok: r.ok, error: r.error, tipo: btn.longPressAction.type };
}
