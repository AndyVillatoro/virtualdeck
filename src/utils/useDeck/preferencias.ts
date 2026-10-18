import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { DeckConfig, SoundProfileId, ThemeMode } from '../../types';
import { sonidoActivo } from '../sound';
import type { ContextoDeck } from './contexto';
import { guardarConfig } from './estado';

/**
 * Lo que no es un botón ni una página: escala, tema, idioma, sonido, PIN del
 * kiosco, los interruptores encendidos/apagados y las variables del deck.
 *
 * Es el único grupo con **escrituras con respiro** (los dos relojes), y el
 * único que escribe **sin pasar por el historial**: encender un interruptor o
 * tocar una variable no es un cambio del deck que deba ocupar un paso de
 * deshacer. Por eso necesita `setConfig` directo, y por eso vive en el contexto
 * junto a lo demás: el historial es para lo que se puede deshacer.
 */
export function useDeckPreferencias({ api, config, setConfig, saveConfig, t }: ContextoDeck) {
  /** Guarda el estado de las variables con un respiro, para no escribir en disco en cada tecla. */
  const stateSaveTimer = useRef<number>();
  const toggleSaveTimer = useRef<number>();
  /**
   * D-073 — lo último pendiente de escribir por cada reloj. `guardarConRespiro`
   * lo actualiza en cada llamada y el temporizador lo limpia al disparar; si la
   * app se cierra antes, `vaciarRespiros` lo escribe.
   */
  const pendienteToggle = useRef<DeckConfig | null>(null);
  const pendienteState = useRef<DeckConfig | null>(null);

  /**
   * D-064 — espejo de la config para calcular `next` fuera del updater de
   * `setConfig` (ver `estado.ts`): el guardado y los temporizadores no pueden
   * vivir dentro del updater porque React puede invocarlo dos veces. Se
   * actualiza en cada escritura para que el grupo radio —que llama a
   * `toggleButton` varias veces seguidas en el mismo tick— no pise.
   */
  const configRef = useRef(config);
  configRef.current = config;

  // UI scale handler
  const setUiScale = useCallback((scale: number) => {
    const clamped = Math.max(0.75, Math.min(1.75, scale));
    saveConfig({ ...config, uiScale: clamped });
    api?.app.setZoom(clamped).catch(() => {});
  }, [config, saveConfig, api]);

  // Theme handler
  const setTheme = useCallback((theme: ThemeMode) => {
    saveConfig({ ...config, theme });
  }, [config, saveConfig]);

  // Language handler
  const setLanguage = useCallback((language: 'system' | 'es' | 'en') => {
    saveConfig({ ...config, language });
  }, [config, saveConfig]);

  // Hints contextuales: marcar uno como descartado (persistente, sin historial).
  const dismissHint = useCallback((id: string) => {
    const prev = configRef.current;
    if (prev.hintsDismissed?.includes(id)) return;
    const next = { ...prev, hintsDismissed: [...(prev.hintsDismissed ?? []), id] };
    configRef.current = next;
    setConfig(next);
    guardarConfig(api, t, next);
  }, [api, setConfig, t]);

  // Sound on press toggle
  const toggleSoundOnPress = useCallback(() => {
    const prev = configRef.current;
    const next = { ...prev, soundOnPress: !sonidoActivo(prev) };
    configRef.current = next;
    setConfig(next);
    guardarConfig(api, t, next);
  }, [api, setConfig, t]);

  const setSoundProfile = useCallback((id: SoundProfileId) => {
    const prev = configRef.current;
    const next = { ...prev, soundProfile: id };
    configRef.current = next;
    setConfig(next);
    guardarConfig(api, t, next);
  }, [api, setConfig, t]);

  const setKioskPin = useCallback((pin: string) => {
    const prev = configRef.current;
    const next = { ...prev, kiosk: { pin } };
    configRef.current = next;
    setConfig(next);
    guardarConfig(api, t, next);
  }, [api, setConfig, t]);

  /**
   * Enciende o apaga un interruptor, en la configuración.
   *
   * Con el actualizador funcional a propósito: el grupo radio llama a esto
   * varias veces seguidas —uno para encender, uno por cada compañero que hay
   * que apagar— y leyendo `config` del cierre cada llamada pisaría a la
   * anterior.
   *
   * Se escribe en disco con el mismo respiro que las variables: encender tres
   * botones de un grupo radio son tres llamadas en el mismo instante y no hace
   * falta escribir tres veces.
   */
  /**
   * Guardado con respiro, pero **escribiendo ya la primera vez**.
   *
   * El respiro existe para que pulsar diez veces un contador no escriba diez
   * archivos. Con solo respiro, sin embargo, un cambio suelto se quedaba 400 ms
   * en el aire: pulsar un contador y cerrar la aplicación en ese rato **perdía
   * el incremento**. Medido — el archivo seguía con `n = 0`.
   *
   * Escribir al principio del respiro y no solo al final quita ese hueco en el
   * caso normal (un cambio, una escritura inmediata) y conserva el ahorro en el
   * caso que lo motivó: diez pulsaciones seguidas siguen siendo dos escrituras,
   * no diez.
   */
  const guardarConRespiro = useCallback((
    reloj: React.MutableRefObject<number | undefined>,
    pendiente: React.MutableRefObject<DeckConfig | null>,
    next: DeckConfig,
  ) => {
    pendiente.current = next;
    if (reloj.current === undefined) guardarConfig(api, t, next);
    clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => {
      reloj.current = undefined;
      pendiente.current = null;
      guardarConfig(api, t, next);
    }, 400);
  }, [api, t]);

  /**
   * D-073 — vacía los guardados pendientes. Se llama al desmontar y con
   * `beforeunload`/`pagehide`: sin esto, el último cambio de un interruptor o
   * una variable se perdía si la app se cerraba dentro de los 400 ms del
   * respiro. El temporizador ya cumplido no deja nada pendiente (`null`).
   */
  const vaciarRespiros = useCallback(() => {
    const pares = [
      [toggleSaveTimer, pendienteToggle],
      [stateSaveTimer, pendienteState],
    ] as const;
    for (const [reloj, pendiente] of pares) {
      if (reloj.current === undefined) continue;
      clearTimeout(reloj.current);
      reloj.current = undefined;
      const next = pendiente.current;
      pendiente.current = null;
      if (next) guardarConfig(api, t, next);
    }
  }, [api, t]);

  // Como los disparadores en `App`: este hook vive ahí, montado siempre, así
  // que el desmontaje y los eventos de cierre cubren el único camino de
  // salida. La ref evita re-suscribirse cuando cambia `api`.
  const vaciarRef = useRef(vaciarRespiros);
  vaciarRef.current = vaciarRespiros;
  useEffect(() => {
    const alSalir = (): void => { vaciarRef.current(); };
    window.addEventListener('beforeunload', alSalir);
    window.addEventListener('pagehide', alSalir);
    return () => {
      window.removeEventListener('beforeunload', alSalir);
      window.removeEventListener('pagehide', alSalir);
      vaciarRef.current();
    };
  }, []);

  const toggleButton = useCallback((id: string) => {
    const prev = configRef.current;
    const encendidos = new Set(prev.toggledIds ?? []);
    if (encendidos.has(id)) encendidos.delete(id); else encendidos.add(id);
    const next = { ...prev, toggledIds: [...encendidos] };
    configRef.current = next;
    setConfig(next);
    guardarConRespiro(toggleSaveTimer, pendienteToggle, next);
  }, [guardarConRespiro, setConfig]);

  const updateState = useCallback((update: Record<string, string>) => {
    const prev = configRef.current;
    const next = { ...prev, state: { ...(prev.state ?? {}), ...update } };
    configRef.current = next;
    setConfig(next);
    guardarConRespiro(stateSaveTimer, pendienteState, next);
  }, [guardarConRespiro, setConfig]);

  const toggleAlwaysOnTop = useCallback(() => {
    saveConfig({ ...config, alwaysOnTop: !config.alwaysOnTop });
  }, [config, saveConfig]);

  return {
    setUiScale, setTheme, setLanguage, dismissHint,
    toggleSoundOnPress, setSoundProfile, setKioskPin, updateState, toggleButton,
    toggleAlwaysOnTop,
  };
}
