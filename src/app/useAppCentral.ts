import { useCallback, useEffect, useMemo, useRef } from 'react';
import type React from 'react';
import type {
  ButtonConfig, DeckConfig, ElectronAPI, OrigenInstalacion, PageConfig, Profile,
} from '../types';
import type { TFunc } from '../utils/i18n';
import type { useSuperficies } from '../utils/superficies/useSuperficies';
import { migrateConfig, validateConfig, sanearPagina, CURRENT_CONFIG_VERSION } from '../utils/configMigration';
import { DEFAULT_CONFIG, conHuecosCompletos } from '../utils/configDefaults';
import { botonesResueltos } from '../utils/botonesFijos';
import { botonPorId } from '../utils/botonPorId';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from '../utils/pulsarBoton';
import { navegarDesdeApp } from '../utils/acciones/pageNav';
import { playGiro, playSound, sonidoActivo, perfilSonido } from '../utils/sound';
import { aplicarPedidoTienda } from '../utils/tiendaAplicar';

/**
 * El puente central de `App`: lo que ejecuta botones sin que nadie los pulse y
 * lo que trae/saca configuración y páginas hacia y desde el disco. Movido tal
 * cual desde `App.tsx` (líneas 189-441), mismo orden interno, mismas claves de
 * `return` — `App` solo consume el objeto devuelto.
 *
 * Lo que vive aquí:
 *
 * - La "entorno de pulsación" (`entorno`): config, interruptores y página se
 *   leen por referencia (`configRef`...) porque el hardware, el mando móvil y
 *   los disparadores llaman en cualquier momento y el cierre mentiría.
 * - `dispararBoton` / `dispararBotonLargo`: sonido + `pulsarBoton`, para el
 *   atajo global, la bandeja, el enlace `virtualdeck://`, el dock y una hora
 *   o sensor programados.
 * - El pedido de la tienda (`#tienda`) y la importación/exportación de config
 *   y de páginas sueltas.
 */
export function useAppCentral({
  api,
  config,
  activePage,
  setActivePage,
  setConfig,
  t,
  updateState,
  toggleButton,
  saveConfig,
  withHistory,
  appendPagesFromProfile,
  appendPageFromGallery,
  setImportError,
}: {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  activePage: number;
  setActivePage: React.Dispatch<React.SetStateAction<number>>;
  setConfig: React.Dispatch<React.SetStateAction<DeckConfig>>;
  t: TFunc;
  updateState: (update: Record<string, string>) => void;
  toggleButton: (id: string) => void;
  saveConfig: (next: DeckConfig) => void;
  withHistory: (
    label: string,
    updater: (prev: DeckConfig) => DeckConfig,
    rotulo?: (prev: DeckConfig) => string,
  ) => void;
  appendPagesFromProfile: (profile: Profile) => void;
  appendPageFromGallery: (page: PageConfig, buttons: ButtonConfig[], origen?: OrigenInstalacion) => number;
  setImportError: (v: string | null) => void;
}) {
  // Toggle state for toggle-mode buttons (runtime only, not persisted)
  // Los interruptores encendidos salen de la configuración, no de un estado
  // propio: es lo único que la barra flotante —otra ventana, otro React— puede
  // ver. `toggleButton` los escribe.
  const toggledIds = useMemo(() => new Set(config.toggledIds ?? []), [config.toggledIds]);
  // Igual que en las pantallas: lo leen manejadores creados en otro render.
  const configRef = useRef(config);
  configRef.current = config;
  const toggledRef = useRef(toggledIds);
  toggledRef.current = toggledIds;
  // Lo mismo que `configRef`: el hardware y los disparadores llaman en
  // cualquier momento y el cierre mentiría.
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;
  const superficiesRef = useRef<ReturnType<typeof useSuperficies> | null>(null);

  const handleToggle = toggleButton;

  /**
   * Pedidos de la tienda (`#tienda`): validar y aplicar aquí.
   *
   * La tienda no escribe configuración —esta ventana es la única con el
   * estado al día— así que el pedido cruza por IPC y se aplica con las mismas
   * funciones de la galería empotrada. Se lee `configRef` y no `config`: el
   * pedido puede llegar en cualquier momento y el cierre mentiría.
   */
  useEffect(() => {
    if (!api?.tienda) return;
    return api.tienda.onAplicar((pedido) => {
      const r = aplicarPedidoTienda(pedido, {
        config: configRef.current,
        guardar: (siguiente) => saveConfig(siguiente),
        agregarPaginasDePerfil: appendPagesFromProfile,
        agregarPagina: appendPageFromGallery,
        t,
      });
      api.tienda.resultado(r).catch(() => {});
    });
  }, [api, saveConfig, appendPagesFromProfile, appendPageFromGallery, t]);

  // Page export
  const handlePageExport = useCallback(async (pageIdx: number) => {
    if (!api) return;
    const page = config.pages[pageIdx];
    // Lo que se ve, pero la copia de un fijo de otra página sale como botón normal.
    const buttons = botonesResueltos(config, pageIdx).map((b) => (b.page === pageIdx ? b : { ...b, fijo: undefined }));
    await api.page.export({ page, buttons }).catch(() => {});
  }, [api, config]);

  // Page import
  const handlePageImport = useCallback(async () => {
    if (!api) return;
    const raw = await api.page.import().catch(() => null);
    // `null` es «el usuario cancelo el dialogo»: ahi no hay nada que decir.
    if (raw === null || raw === undefined) return;
    const imported = raw as { page?: PageConfig; buttons?: ButtonConfig[] };
    if (typeof raw !== 'object' || !imported.page || !Array.isArray(imported.buttons)) {
      // Antes esto era un `return` mudo: elegias un archivo que no era una
      // pagina y no pasaba nada, sin decir por que.
      setImportError(t('page.importRejected'));
      return;
    }
    withHistory(t('undo.importPage'), (prev) => {
      const newIdx = prev.pages.length;
      // La rejilla viene del archivo y hay que acotarla: un `gridSize: 99` en
      // el JSON pasaba tal cual y creaba una pagina de 99 columnas que no se
      // puede usar ni deshacer desde la interfaz. `sanearPagina` es la misma
      // que usan la carga del disco y la importacion de la configuracion
      // entera, que es donde faltaba.
      const { pagina: acotada } = sanearPagina(imported.page!);
      const cols = acotada.gridSize ?? 4;
      const newPage: PageConfig = {
        ...acotada, gridSize: cols, gridRows: acotada.gridRows ?? cols,
        id: `page_${Date.now()}`,
        name: (imported.page!.name || t('page.importedName')).toUpperCase(),
      };
      // Se rellena hasta cubrir la rejilla. Un archivo con menos botones que
      // huecos dejaba celdas que **no existian**: no se podian pulsar para
      // crear un boton, porque no habia objeto detras. La configuracion
      // completa ya se rellenaba al importarse; una pagina suelta no.
      const soloDeEstaPagina = (imported.buttons ?? []).map((b) => ({ ...b, page: 0 }));
      const rellenados = conHuecosCompletos([newPage], soloDeEstaPagina)
        .map((b, i) => ({ ...b, id: `p${Date.now()}_${i}`, page: newIdx }));
      return { ...prev, pages: [...prev.pages, newPage], buttons: [...prev.buttons, ...rellenados] };
    });
  }, [api, withHistory, t, setImportError]);

  /**
   * Disparar un boton sin que nadie lo pulse: atajo global, menu de la
   * bandeja, hora programada o umbral de un sensor.
   *
   * Vive en `App` porque `App` esta montada siempre. Los disparadores por hora
   * y por sensor estaban dentro de `MainB`, asi que **dejaban de sonar en
   * kiosko** — justo el modo de dejar el deck solo, que es donde una accion
   * programada tiene mas sentido.
   */
  // El entorno de una pulsación disparada desde fuera de las pantallas, el
  // mismo para la corta y la larga (mando móvil, enlaces, dock, atajos).
  const entorno = useCallback((opts?: { serial?: string }): EntornoPulsacion | null => {
    if (!api) return null;
    return {
      api, config: configRef.current, toggledIds: () => toggledRef.current,
      onToggle: handleToggle, onStateUpdate: updateState,
      // Un fallo de una accion disparada sola no se veia en ninguna parte.
      avisar: setImportError, t,
      // `page-nav`: desde un dock entre sus páginas, desde lo demás entre las
      // del deck (así `useAutoProfile` lo toma como elección manual).
      navegar: (a) => navegarDesdeApp(a, configRef.current.pages, activePageRef.current, opts?.serial, setActivePage, superficiesRef.current),
    };
    // `toggledIds` no va aqui: se lee por referencia. Dejarlo ademas recreaba
    // el entorno en cada encendido, sin ninguna falta. Los `set*` son setters
    // de `useState` de `App` (estables): entran aqui para el analisis de
    // dependencias, que no puede verlos estables por ser parametros.
  }, [api, handleToggle, updateState, t, setActivePage, setImportError]);

  const dispararBoton = useCallback(async (btn: ButtonConfig, opts?: { sonido?: 'giro'; serial?: string }) => {
    if (!api) return;
    // Una carpeta necesita pantalla para su overlay: `pulsarBoton` lo avisa
    // como error en vez de no hacer nada.
    // Suena igual que si lo hubieras pulsado. Un boton que se dispara solo —a
    // una hora, por un sensor, por un atajo global— no da ninguna otra señal
    // de que ha pasado algo, que es justo cuando mas falta hace. Los giros de
    // perilla o tira suenan con el tic de giro. Se lee `configRef` y no
    // `config`: el cierre no tiene `config` en las dependencias y si no el
    // hardware se quedaría con el sonido del primer render.
    const cfg = configRef.current;
    if (sonidoActivo(cfg)) {
      if (opts?.sonido === 'giro') playGiro(perfilSonido(cfg));
      else playSound(perfilSonido(cfg));
    }
    const env = entorno(opts);
    if (env) return await pulsarBoton(btn, env);
  }, [api, entorno]);

  // Mantener pulsado desde el mando móvil, `virtualdeck://press/<id>?largo=1`
  // o una tecla del dock (con su serial, para `page-nav`).
  const dispararBotonLargo = useCallback(async (btn: ButtonConfig, opts?: { serial?: string }) => {
    if (!api || !btn.longPressAction || btn.longPressAction.type === 'none') return;
    const cfg = configRef.current;
    if (sonidoActivo(cfg)) playSound(perfilSonido(cfg));
    const env = entorno(opts);
    if (env) return await pulsacionLarga(btn, env);
  }, [api, entorno]);

  // Atajo global del sistema y menu de la bandeja: el proceso principal emite
  // button:trigger y aqui se ejecuta la cadena del boton.
  useEffect(() => {
    if (!api?.events) return;
    return api.events.onButtonTrigger((id, opciones) => {
      const btn = botonPorId(config.buttons, id);
      if (!btn) return;
      if (opciones?.largo) void dispararBotonLargo(btn);
      else void dispararBoton(btn);
    });
  }, [api, config.buttons, dispararBoton, dispararBotonLargo]);

  // `virtualdeck://page/<n>`. El indice llega ya en base 0 y se acota aqui:
  // el enlace lo escribe una persona y puede pedir una pagina que no existe.
  useEffect(() => {
    if (!api?.events) return;
    return api.events.onNavPage((i) => {
      if (i >= 0 && i < config.pages.length) setActivePage(i);
    });
  }, [api, config.pages.length, setActivePage]);

  // Se manda `config`, lo que hay en pantalla, y no se deja que el proceso
  // principal lo relea del disco: si el archivo estuviera ilegible saldria un
  // export con `{}` diciendo que fue bien.
  const handleConfigExport = useCallback(async () => { await api?.config.export(config); }, [api, config]);

  const applyImportedConfig = useCallback((raw: unknown) => {
    const migrated = migrateConfig(raw);
    const v = validateConfig(migrated, t);
    if (!v.ok || !v.config) {
      setImportError(t('import.rejected', { motivo: v.error ?? t('import.badShape') }));
      return false;
    }
    // `validateConfig` mira los tipos, no los rangos: un `gridSize: 99` pasaba
    // entero y `conHuecosCompletos` creaba 9801 botones en esa pagina. El
    // acotado existia **solo** en la importacion de una pagina suelta.
    const s = { ...v.config, pages: v.config.pages.map((p) => sanearPagina(p).pagina) };
    const merged = conHuecosCompletos(s.pages, s.buttons);
    const final = { ...DEFAULT_CONFIG, ...s, buttons: merged, configVersion: CURRENT_CONFIG_VERSION };
    setConfig(final);
    // Guardar aqui y no en el proceso principal, por dos motivos: solo se
    // escribe lo que ha pasado la validacion, y se escribe **esto** —migrado y
    // fusionado— y no el JSON crudo del archivo. Ademas hace que la
    // importacion desde una URL persista: antes solo cambiaba el estado de
    // React y al reiniciar el perfil descargado ya no estaba.
    api?.config.save(final).catch(() => {});
    setImportError(null);
    return true;
  }, [api, setConfig, t, setImportError]);

  const handleConfigImport = useCallback(async () => {
    const data = await api?.config.import();
    if (!data) return;
    applyImportedConfig(data);
  }, [api, applyImportedConfig]);

  return {
    /** Los interruptores encendidos, tal como los ven las pantallas. */
    toggledIds,
    /** Encender/apagar un interruptor (entra en `pulsarBoton` como función). */
    handleToggle,
    /** Ref para que `entorno` vea las superficies vivas del último render. */
    superficiesRef,
    dispararBoton,
    dispararBotonLargo,
    handlePageExport,
    handlePageImport,
    handleConfigExport,
    handleConfigImport,
  };
}
