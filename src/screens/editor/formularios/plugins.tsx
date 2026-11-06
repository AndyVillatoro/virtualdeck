import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { CatalogoPluginsArrastrable } from '../../../components/plugins/CatalogoPluginsArrastrable';
import { superficieDe } from '../../../utils/plugins/ref';
import { useListaPlugins } from '../../../utils/plugins/listaPlugins';
import type { PropsFormulario } from './base';
import type { PluginAccionInfo, PluginInfo, PluginRef } from '../../../types';

/**
 * El formulario de la acción `plugin`: lista visual estilo Stream Deck de los
 * plugins instalados y sus acciones + botón de su Property Inspector.
 */

function elegirPlugin(lista: PluginInfo[], uuid: string | undefined): PluginInfo | null {
  return lista.find((p) => p.uuid === uuid) ?? null;
}

function accionesDeTecla(info: PluginInfo | null): PluginAccionInfo[] {
  return info ? info.acciones.filter((a) => a.esTecla) : [];
}

function Nota({ children }: { children: React.ReactNode }) {
  const VD = useTheme();
  return (
    <div style={{
      fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6,
      borderLeft: `2px solid ${VD.border}`, paddingLeft: 8, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

function EstadoPlugin({ info }: { info: PluginInfo | null }) {
  const VD = useTheme();
  const t = useT();
  if (!info || info.estado !== 'error') return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 8px', marginBottom: 8,
      background: VD.surface, border: `1px solid ${VD.border}`, borderRadius: 2,
      fontFamily: VD.mono, fontSize: 8, color: VD.danger,
    }}>
      <span>{t('ed.plugin.enError')}</span>
      <span style={{ color: VD.textMuted }}>{info.error ?? '?'}</span>
    </div>
  );
}

function SinInspector() {
  const VD = useTheme();
  const t = useT();
  return (
    <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
      {t('ed.plugin.sinInspector')}
    </span>
  );
}

export function BotonConfigurarPlugin({ pluginRef, puede }: { pluginRef: PluginRef | null; puede: boolean }) {
  const VD = useTheme();
  const t = useT();
  return (
    <button
      type="button"
      disabled={!puede || !pluginRef}
      onClick={() => { if (pluginRef) void window.electronAPI.plugins.openPI(pluginRef); }}
      style={{
        padding: '6px 12px',
        background: puede ? VD.surface : VD.elevated,
        border: `1px solid ${puede ? VD.accent : VD.border}`,
        color: puede ? VD.accent : VD.textMuted,
        fontFamily: VD.mono,
        fontSize: 9,
        letterSpacing: 1,
        borderRadius: VD.radius.sm,
        cursor: puede ? 'pointer' : 'default',
      }}
    >
      {t('ed.plugin.configurar')}
    </button>
  );
}

interface CuerpoPluginProps {
  pluginUuid: string;
  accionUuid: string;
  settings?: Record<string, unknown>;
  contexto: string | null;
  onElegirAccionPlugin: (pluginUuid: string, accionUuid: string, nombreAccion: string) => void;
}

function CuerpoPlugin({
  pluginUuid, accionUuid, settings, contexto, onElegirAccionPlugin,
}: CuerpoPluginProps) {
  const t = useT();
  const { lista } = useListaPlugins();

  const habilitados = lista.filter((pl) => pl.habilitado);
  const info = elegirPlugin(habilitados, pluginUuid);
  const acciones = accionesDeTecla(info);
  const elegida: PluginAccionInfo | null =
    acciones.find((a) => a.uuid === accionUuid) ?? null;

  const ref = refDeEditor(info, elegida, contexto, settings);

  return (
    <>
      <EstadoPlugin info={info} />

      <CatalogoPluginsArrastrable
        clicDirecto
        seleccionActual={pluginUuid && accionUuid ? { pluginUuid, accionUuid } : null}
        onElegirAccion={(carga) => onElegirAccionPlugin(carga.pluginUuid, carga.accionUuid, carga.nombre)}
      />

      {elegida && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <BotonConfigurarPlugin pluginRef={ref} puede={!!elegida.tienePI} />
          {!elegida.tienePI && <SinInspector />}
        </div>
      )}

      <Nota>{t('ed.plugin.help')}</Nota>
    </>
  );
}

export function FormPlugin(p: PropsFormulario) {
  const { action, setAction, botonId, pages, indicePaginaBoton, sobrescribirConPlugin } = p;
  const { lista } = useListaPlugins();

  const contexto = botonId ? `${superficieDe(pages, indicePaginaBoton)}:${botonId}` : null;

  React.useEffect(() => {
    if (!action.plugin?.pluginUuid && lista.length > 0) {
      const habilitados = lista.filter((pl) => pl.habilitado);
      if (habilitados.length > 0) {
        const primero = habilitados[0];
        const teclas = accionesDeTecla(primero);
        if (teclas.length > 0) {
          sobrescribirConPlugin?.(teclas[0].nombre);
          setAction((a) => ({
            ...a,
            plugin: { pluginUuid: primero.uuid, accionUuid: teclas[0].uuid },
          }));
        }
      }
    }
  }, [action.plugin?.pluginUuid, lista, setAction, sobrescribirConPlugin]);

  const elegirAccionPlugin = (pluginUuid: string, accionUuid: string, nombreAccion: string) => {
    sobrescribirConPlugin?.(nombreAccion);
    setAction((a) => ({
      ...a,
      plugin: { pluginUuid, accionUuid },
    }));
  };

  return (
    <CuerpoPlugin
      pluginUuid={action.plugin?.pluginUuid ?? ''}
      accionUuid={action.plugin?.accionUuid ?? ''}
      settings={action.plugin?.settings}
      contexto={contexto}
      onElegirAccionPlugin={elegirAccionPlugin}
    />
  );
}

function refDeEditor(
  info: PluginInfo | null, elegida: PluginAccionInfo | null, contexto: string | null,
  settings: Record<string, unknown> | undefined,
): PluginRef | null {
  if (!info || !elegida || !contexto) return null;
  return {
    pluginUuid: info.uuid,
    accionUuid: elegida.uuid,
    contexto,
    ...(settings ? { settings } : {}),
  };
}
