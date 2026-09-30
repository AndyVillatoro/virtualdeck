import type React from 'react';
import { useCallback, useRef } from 'react';
import type { DeckConfig, SoundProfileId, ThemeMode } from '../../types';
import type { ContextoDeck } from './contexto';

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
export function useDeckPreferencias({ api, config, setConfig, saveConfig }: ContextoDeck) {
  /** Guarda el estado de las variables con un respiro, para no escribir en disco en cada tecla. */
  const stateSaveTimer = useRef<number>();
  const toggleSaveTimer = useRef<number>();

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
    setConfig((prev) => {
      if (prev.hintsDismissed?.includes(id)) return prev;
      const next = { ...prev, hintsDismissed: [...(prev.hintsDismissed ?? []), id] };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, setConfig]);

  // Sound on press toggle
  const toggleSoundOnPress = useCallback(() => {
    setConfig((prev) => {
      const next = { ...prev, soundOnPress: !(prev.soundOnPress ?? true) };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, setConfig]);

  const setSoundProfile = useCallback((id: SoundProfileId) => {
    setConfig((prev) => {
      const next = { ...prev, soundProfile: id };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, setConfig]);

  const setKioskPin = useCallback((pin: string) => {
    setConfig((prev) => {
      const next = { ...prev, kiosk: { enabled: true, pin } };
      api?.config.save(next).catch(() => {});
      return next;
    });
  }, [api, setConfig]);

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
    next: DeckConfig,
  ) => {
    if (reloj.current === undefined) api?.config.save(next).catch(() => {});
    clearTimeout(reloj.current);
    reloj.current = window.setTimeout(() => {
      reloj.current = undefined;
      api?.config.save(next).catch(() => {});
    }, 400);
  }, [api]);

  const toggleButton = useCallback((id: string) => {
    setConfig((prev) => {
      const encendidos = new Set(prev.toggledIds ?? []);
      if (encendidos.has(id)) encendidos.delete(id); else encendidos.add(id);
      const next = { ...prev, toggledIds: [...encendidos] };
      guardarConRespiro(toggleSaveTimer, next);
      return next;
    });
  }, [guardarConRespiro, setConfig]);

  const updateState = useCallback((update: Record<string, string>) => {
    setConfig((prev) => {
      const next = { ...prev, state: { ...(prev.state ?? {}), ...update } };
      guardarConRespiro(stateSaveTimer, next);
      return next;
    });
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
