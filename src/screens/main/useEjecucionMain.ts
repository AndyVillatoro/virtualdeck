import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ButtonConfig, DeckConfig, ElectronAPI } from '../../types';
import type { TFunc } from '../../utils/i18n';
import { pulsarBoton, pulsacionLarga, type EntornoPulsacion } from '../../utils/pulsarBoton';
import { navegarDeck } from '../../utils/acciones/pageNav';
import { logError } from '../../utils/logger';

/**
 * La ejecución de botones de la pantalla principal: la "entorno de pulsación"
 * (config, interruptores y página se leen por referencia — la celda conserva
 * el manejador de su primer render—, el registro lateral de lo ejecutado y
 * `executeButton` / `executeLongPressButton`. Movido tal cual desde
 * `MainB.tsx`, mismo orden interno y mismas dependencias.
 */
export function useEjecucionMain({
  api,
  config,
  toggledIds,
  activePage,
  onToggle,
  onStateUpdate,
  showToast,
  t,
  onPageChange,
  setOpenFolderBtn,
}: {
  api: ElectronAPI | undefined;
  config: DeckConfig;
  toggledIds: Set<string>;
  activePage: number;
  onToggle: (id: string) => void;
  onStateUpdate: (update: Record<string, string>) => void;
  showToast: (texto: string) => void;
  t: TFunc;
  onPageChange: (page: number) => void;
  /** Una carpeta abre su overlay aquí; sin pantalla no se puede ejecutar. */
  setOpenFolderBtn: Dispatch<SetStateAction<ButtonConfig | null>>;
}) {
  const [execLog, setExecLog] = useState<{ id: number; ts: number; label: string; actionType: string; ok: boolean; error?: string }[]>([]);
  const execLogIdRef = useRef(0);
  const [runningButtons, setRunningButtons] = useState<Set<string>>(new Set());

  // Se asigna en cada render, no en un efecto: solo la leen los manejadores
  // de pulsacion, y ahi hace falta el valor de ahora, no el del render en el
  // que se creo la celda.
  // Igual que `toggledIds`: la celda conserva el manejador de su primer render,
  // asi que leer `config` del cierre daba el de entonces. Se notaba en las
  // acciones que interpolan `{variable}`: una accion `n = vi-{m}` escribia el
  // valor de `m` de cuando se dibujo la celda, no el de ahora. Solo se salvaban
  // los botones cuya **etiqueta** lleva `{}`, porque eso si fuerza el redibujo.
  const configRef = useRef(config);
  configRef.current = config;

  const toggledRef = useRef(toggledIds);
  toggledRef.current = toggledIds;

  // La página actual también por referencia: la celda conserva el manejador de
  // su primer render y `activePage` del cierre sería el de entonces.
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;

  const entorno = useCallback((): EntornoPulsacion => ({
    api: api!,
    config: configRef.current, toggledIds: () => toggledRef.current, onToggle, onStateUpdate,
    avisar: showToast, t,
    // Navega entre las páginas del deck (sin las de docks) con el mismo
    // `onPageChange` de siempre: así `useAutoProfile` lo toma como elección
    // manual y la guarda como base.
    navegar: (a) => navegarDeck(a, configRef.current.pages, configRef.current.pages[activePageRef.current]?.id, onPageChange),
  // `toggledIds` no va aqui: se lee por referencia. Dejarlo ademas recreaba
  // el entorno en cada encendido, sin ninguna falta.
  }), [api, onToggle, onStateUpdate, showToast, t, onPageChange]);

  /** Anota lo ejecutado en el registro lateral. Es lo unico propio de esta pantalla. */
  const anotar = useCallback((etiqueta: string, tipo: string, ok: boolean, error?: string) => {
    setExecLog((prev) => [
      { id: ++execLogIdRef.current, ts: Date.now(), label: etiqueta, actionType: tipo, ok, error },
      ...prev.slice(0, 99),
    ]);
  }, []);

  const executeButton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    // Una carpeta abre un overlay; no hay accion que ejecutar.
    if (btn.action.type === 'folder') { setOpenFolderBtn(btn); return; }

    setRunningButtons((prev) => { const s = new Set(prev); s.add(btn.id); return s; });
    try {
      const r = await pulsarBoton(btn, entorno());
      anotar(btn.label || btn.action.type, r.tipo, r.ok, r.error);
      if (!r.ok && r.error) logError(`action:${btn.action.type}`, r.error, { label: btn.label });
    } finally {
      setRunningButtons((prev) => { const s = new Set(prev); s.delete(btn.id); return s; });
    }
  }, [api, entorno, anotar, setOpenFolderBtn]);

  const executeLongPressButton = useCallback(async (btn: ButtonConfig) => {
    if (!api) return;
    const r = await pulsacionLarga(btn, entorno());
    if (r) anotar(t('main.log.largo', { boton: btn.label || r.tipo }), r.tipo, r.ok, r.error);
  }, [api, entorno, anotar, t]);

  return { execLog, setExecLog, runningButtons, entorno, executeButton, executeLongPressButton };
}
