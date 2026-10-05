import { useEffect, useState } from 'react';
import type { ButtonConfig, DeckConfig } from '../../../types';

export interface InfoConfigExistente {
  gruposRadio: string[];
  hotkeysOcupadas: Map<string, { id: string; label: string; page?: number }>;
}

const MOD_ORDER: Record<string, number> = {
  ctrl: 0,
  control: 0,
  alt: 1,
  shift: 2,
  win: 3,
  meta: 3,
  super: 3,
};

export function normalizarHotkey(combo: string): string {
  if (!combo) return '';
  const partes = combo.split('+').map((p) => p.trim()).filter(Boolean);
  const mods: string[] = [];
  let tecla = '';

  for (const p of partes) {
    const pl = p.toLowerCase();
    if (pl in MOD_ORDER) {
      const canonical = pl === 'ctrl' || pl === 'control' ? 'Ctrl' : (pl === 'alt' ? 'Alt' : (pl === 'shift' ? 'Shift' : 'Win'));
      if (!mods.includes(canonical)) mods.push(canonical);
    } else {
      tecla = p.toUpperCase();
    }
  }

  const orden = ['Ctrl', 'Alt', 'Shift', 'Win'];
  mods.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  return [...mods, tecla].filter(Boolean).join('+');
}

export function useConfiguracionExistente(currentButtonId?: string): InfoConfigExistente {
  const [info, setInfo] = useState<InfoConfigExistente>({
    gruposRadio: [],
    hotkeysOcupadas: new Map(),
  });

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.config?.load) return;

    api.config
      .load()
      .then((data) => {
        const cfg = data as DeckConfig;
        const buttons: ButtonConfig[] = cfg?.buttons ?? [];

        const grupos = Array.from(
          new Set(
            buttons
              .map((b) => b.radioGroup?.trim())
              .filter((g): g is string => Boolean(g)),
          ),
        ).sort();

        const hotkeys = new Map<string, { id: string; label: string; page?: number }>();
        for (const b of buttons) {
          if (b.id !== currentButtonId && b.globalHotkey?.trim()) {
            const norm = normalizarHotkey(b.globalHotkey);
            if (norm) {
              hotkeys.set(norm, {
                id: b.id,
                label: b.label?.trim() || b.id,
                page: b.page,
              });
            }
          }
        }

        setInfo({ gruposRadio: grupos, hotkeysOcupadas: hotkeys });
      })
      .catch(() => {});
  }, [currentButtonId]);

  return info;
}
