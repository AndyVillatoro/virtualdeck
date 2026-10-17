import React, { useState, useEffect } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { CuerpoPlugin } from '../editor/formularios/plugins';
import { useListaPlugins } from '../../utils/plugins/listaPlugins';
import { BotonEditar } from './PiezasInspector';
import type { ButtonAction, ButtonConfig, PluginInfo } from '../../types';
import type { PresetHueco } from '../../data/presetsDock';

export interface SelectorPluginControlProps {
  /** Los botones del control en orden de hueco; el seleccionado lleva el plugin. */
  botones: (ButtonConfig | undefined)[];
  /** Índice en `botones` del hueco elegido. */
  seleccionado: number;
  /** Como un preset: los huecos enteros del control, en orden. */
  onAplicar: (huecos: PresetHueco[]) => void;
  disabled?: boolean;
  onCambiarPrevia?: (pluginUuid: string, accionUuid: string) => void;
}

/**
 * Los plugins instalados, para poner uno en una tecla o perilla del dock.
 *
 * Es el mismo formulario del editor (`CuerpoPlugin`: mismos desplegables,
 * mismos avisos, misma lista viva) con un botón de aplicar debajo: el
 * inspector no edita una acción en curso, rellena los huecos del control de
 * golpe —como un preset— conservando los gestos hermanos. Sin `contexto`
 * todavía (el botón existe tras aplicar), así que el inspector propio del
 * plugin se abre después, desde el editor.
 */

function pluginActual(boton: ButtonConfig | undefined): { pluginUuid: string; accionUuid: string } {
  const plugin = boton?.action.type === 'plugin' ? boton.action.plugin : undefined;
  return { pluginUuid: plugin?.pluginUuid ?? '', accionUuid: plugin?.accionUuid ?? '' };
}

function accionElegida(
  lista: PluginInfo[], pluginUuid: string, accionUuid: string,
): { nombre: string; tienePI: boolean } | null {
  const info = lista.find((p) => p.uuid === pluginUuid);
  const accion = info?.acciones.find((a) => a.uuid === accionUuid);
  if (!accion) return null;
  return { nombre: accion.nombre, tienePI: accion.tienePI };
}

/** Un botón tal cual está, con la acción (y el rótulo) que le toque. */
function huecoDe(boton: ButtonConfig | undefined, action: ButtonAction, label: string): PresetHueco {
  return {
    label,
    icon: boton?.icon ?? '',
    bgColor: boton?.bgColor,
    fgColor: boton?.fgColor,
    action,
    ...(boton?.isToggle ? { isToggle: true } : {}),
    ...(boton?.actionToggleOff ? { actionToggleOff: boton.actionToggleOff } : {}),
    ...(boton?.fijo ? { fijo: true } : {}),
    ...(boton?.modosPerilla ? { modosPerilla: boton.modosPerilla } : {}),
    ...(boton?.iconoPuntos ? { iconoCatalogo: boton.iconoPuntos.origen } : {}),
  };
}

/** El hueco sobrescrito por un plugin: limpia la apariencia previa y asigna el título del manifiesto. */
function huecoPlugin(boton: ButtonConfig | undefined, action: ButtonAction, label: string): PresetHueco {
  return {
    label,
    icon: '',
    bgColor: undefined,
    fgColor: undefined,
    action,
    ...(boton?.isToggle ? { isToggle: true } : {}),
    ...(boton?.actionToggleOff ? { actionToggleOff: boton.actionToggleOff } : {}),
    ...(boton?.fijo ? { fijo: true } : {}),
    ...(boton?.modosPerilla ? { modosPerilla: boton.modosPerilla } : {}),
  };
}

function accionVacia(): ButtonAction {
  return { type: 'none' };
}

export function SelectorPluginControl({
  botones,
  seleccionado,
  onAplicar,
  disabled = false,
  onCambiarPrevia,
}: SelectorPluginControlProps) {
  const VD = useTheme();
  const t = useT();
  const { lista } = useListaPlugins();

  const actual = pluginActual(botones[seleccionado]);
  const [pluginUuid, setPluginUuid] = useState(actual.pluginUuid);
  const [accionUuid, setAccionUuid] = useState(actual.accionUuid);

  useEffect(() => {
    if (!pluginUuid && lista.length > 0) {
      const primero = lista.find((p) => p.habilitado && p.acciones.some((a) => a.esTecla));
      if (primero) {
        const accion = primero.acciones.find((a) => a.esTecla);
        if (accion) {
          setPluginUuid(primero.uuid);
          setAccionUuid(accion.uuid);
          onCambiarPrevia?.(primero.uuid, accion.uuid);
          return;
        }
      }
    }
    if (pluginUuid && accionUuid) {
      onCambiarPrevia?.(pluginUuid, accionUuid);
    }
  }, [pluginUuid, accionUuid, lista, onCambiarPrevia]);

  const elegida = accionElegida(lista, pluginUuid, accionUuid);
  const puedeAplicar = !disabled && pluginUuid !== '' && accionUuid !== '';

  const aplicar = () => {
    if (!puedeAplicar) return;
    const accion: ButtonAction = { type: 'plugin', plugin: { pluginUuid, accionUuid } };
    onAplicar(botones.map((b, i) => {
      if (i !== seleccionado) return huecoDe(b, b?.action ?? accionVacia(), b?.label ?? '');
      return huecoPlugin(b, accion, elegida?.nombre || '');
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.xs }}>
      <label
        style={{
          fontSize: 8.5,
          color: VD.textMuted,
          fontFamily: VD.mono,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {t('disp.plugin.titulo')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <CuerpoPlugin
          pluginUuid={pluginUuid}
          accionUuid={accionUuid}
          contexto={null}
          onCambiarPlugin={(uuid, primera) => {
            setPluginUuid(uuid);
            setAccionUuid(primera);
            onCambiarPrevia?.(uuid, primera);
          }}
          onCambiarAccion={(uuid) => {
            setAccionUuid(uuid);
            onCambiarPrevia?.(pluginUuid, uuid);
          }}
        />
      </div>
      {elegida?.tienePI && (
        <div style={{
          fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6,
          borderLeft: `2px solid ${VD.border}`, paddingLeft: 8,
        }}>
          {t('disp.plugin.aplicaPrimero')}
        </div>
      )}
      <BotonEditar
        disabled={!puedeAplicar}
        onEditar={aplicar}
        vd={VD}
        texto={t('disp.plugin.aplicar')}
      />
    </div>
  );
}
