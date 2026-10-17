import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { estiloDesplegable } from '../../../components/ui/estilos';
import { Field } from '../comunes';
import { superficieDe } from '../../../utils/plugins/ref';
import { useListaPlugins } from '../../../utils/plugins/listaPlugins';
import type { PropsFormulario } from './base';
import type { PluginAccionInfo, PluginInfo, PluginRef } from '../../../types';

/**
 * El formulario de la acción `plugin`: qué plugin, qué acción suya y su
 * Property Inspector.
 *
 * Lo que trae el plugin (sus acciones, si cada una tiene inspector) **no** se
 * inventa: se pregunta a `plugins.list()`, que lo lee de los manifiestos
 * instalados. Con el gestor todavía en esqueleto la lista viene vacía, y el
 * formulario enseña el estado vacío con dónde instalarlos — sin plugins, la
 * acción existe y el paso 2 del editor no puede salir en blanco.
 *
 * El `contexto` sale de la página del botón (el serial si es de un dock) y de
 * su id, que es lo que luego usan `press` y `openPI`: con otro, el plugin
 * configuraría una tecla que no existe.
 */

/** El plugin que hay elegido en el desplegable, o `null` si no hay ninguno. */
function elegirPlugin(lista: PluginInfo[], uuid: string | undefined): PluginInfo | null {
  return lista.find((p) => p.uuid === uuid) ?? null;
}

/** Solo las `esTecla`: las demás no caben en un botón (`PluginAccionInfo`). */
function accionesDeTecla(info: PluginInfo | null): PluginAccionInfo[] {
  return info ? info.acciones.filter((a) => a.esTecla) : [];
}

/** Las dos mitades del formulario son el mismo desplegable con otros datos. */
interface SelectorPluginProps {
  etiqueta: string;
  vacio: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onElegir: (uuid: string) => void;
  deshabilitado?: boolean;
}

function SelectorPlugin({ etiqueta, vacio, valor, opciones, onElegir, deshabilitado }: SelectorPluginProps) {
  const VD = useTheme();
  return (
    <Field label={etiqueta}>
      <select
        value={valor}
        onChange={(e) => onElegir(e.target.value)}
        disabled={deshabilitado}
        style={estiloDesplegable(VD)}
      >
        <option value="">{vacio}</option>
        {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
      </select>
    </Field>
  );
}

/** Una línea de ayuda, con la veta a la izquierda que usan los formularios. */
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

/** El estado vacío: no hay nada que elegir y hay que decir por qué. */
function SinPlugins({ hayInstalados, cargando }: { hayInstalados: boolean; cargando: boolean }) {
  const VD = useTheme();
  const t = useT();
  if (cargando) return null;
  return (
    <div style={{
      padding: '8px 10px',
      background: VD.surface,
      border: `1px solid ${VD.border}`,
      borderLeft: `2px solid ${VD.accent}`,
      borderRadius: 2,
      fontFamily: VD.mono,
      fontSize: 8,
      lineHeight: 1.6,
      color: VD.textMuted,
    }}>
      <div style={{ color: VD.text, marginBottom: 4 }}>
        {t(hayInstalados ? 'ed.plugin.ningunoHabilitado' : 'ed.plugin.noInstalados')}
      </div>
      <div>{t('ed.plugin.dondeInstalar')}</div>
    </div>
  );
}

/** La línea de estado del plugin elegido: corriendo, parado o en error. */
function EstadoPlugin({ info }: { info: PluginInfo }) {
  const VD = useTheme();
  const t = useT();
  if (info.estado !== 'error') return null;
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

/** Al lado del botón: por qué está apagado (esta acción no trae inspector). */
function SinInspector() {
  const VD = useTheme();
  const t = useT();
  return (
    <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
      {t('ed.plugin.sinInspector')}
    </span>
  );
}

/** El botón de abrir el Property Inspector, que solo hay si la acción lo trae. */
function BotonConfigurar({ ref, puede }: { ref: PluginRef | null; puede: boolean }) {
  const VD = useTheme();
  const t = useT();
  return (
    <button
      type="button"
      disabled={!puede || !ref}
      onClick={() => { if (ref) window.electronAPI.plugins.openPI(ref); }}
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

/**
 * El cuerpo del formulario: los dos desplegables y el botón del inspector.
 *
 * Lo comparten el editor de botones virtuales (`FormPlugin`) y el inspector
 * del dock (`SelectorPluginControl`): la misma lista, los mismos avisos y el
 * mismo botón de configurar. Solo cambian quién guarda lo elegido (el editor
 * escribe la acción en curso; el dock lo aplica a sus huecos).
 */
export interface CuerpoPluginProps {
  pluginUuid: string;
  accionUuid: string;
  settings?: Record<string, unknown>;
  /** `null` antes de aplicar (un dock aún no tiene botón que configurar). */
  contexto: string | null;
  /** Con el uuid elegido viaja su primera acción de tecla, para preseleccionarla. */
  onCambiarPlugin: (uuid: string, primeraAccionUuid: string) => void;
  onCambiarAccion: (uuid: string) => void;
}

export function CuerpoPlugin({
  pluginUuid, accionUuid, settings, contexto, onCambiarPlugin, onCambiarAccion,
}: CuerpoPluginProps) {
  const t = useT();
  const { lista, cargando } = useListaPlugins();

  // Un plugin deshabilitado no se ofrece: se puede tener instalado y apagado,
  // y una acción suya no haría nada al pulsar.
  const habilitados = lista.filter((pl) => pl.habilitado);
  const info = elegirPlugin(habilitados, pluginUuid);
  const acciones = accionesDeTecla(info);
  const elegida: PluginAccionInfo | null =
    acciones.find((a) => a.uuid === accionUuid) ?? null;

  const ref = refDeEditor(info, elegida, contexto, settings);

  const elegir = (uuid: string) => {
    const nuevo = elegirPlugin(habilitados, uuid);
    onCambiarPlugin(uuid, accionesDeTecla(nuevo)[0]?.uuid ?? '');
  };

  if (habilitados.length === 0) {
    return <SinPlugins hayInstalados={lista.length > 0} cargando={cargando} />;
  }

  return (
    <>
      <EstadoPlugin info={info ?? habilitados[0]} />

      <SelectorPlugin
        etiqueta={t('ed.plugin.plugin')}
        vacio={t('ed.plugin.elegirPlugin')}
        valor={pluginUuid}
        opciones={habilitados.map((pl) => ({ valor: pl.uuid, texto: `${pl.nombre} ${pl.version}` }))}
        onElegir={elegir}
      />

      <SelectorPlugin
        etiqueta={t('ed.plugin.accion')}
        vacio={t('ed.plugin.elegirAccion')}
        valor={accionUuid}
        opciones={acciones.map((a) => ({ valor: a.uuid, texto: a.nombre }))}
        onElegir={onCambiarAccion}
        deshabilitado={!info}
      />

      {info && acciones.length === 0 && <Nota>{t('ed.plugin.sinAcciones')}</Nota>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <BotonConfigurar ref={ref} puede={!!elegida?.tienePI} />
        {elegida && !elegida.tienePI && <SinInspector />}
      </div>

      <Nota>{t('ed.plugin.help')}</Nota>
    </>
  );
}

export function FormPlugin(p: PropsFormulario) {
  const { action, setAction, botonId, pages, indicePaginaBoton } = p;

  const contexto = botonId ? `${superficieDe(pages, indicePaginaBoton)}:${botonId}` : null;

  const cambiarPlugin = (uuid: string, primeraAccionUuid: string) => {
    setAction((a) => ({
      ...a,
      // Los ajustes son de la acción anterior: no sobreviven al cambio.
      plugin: { pluginUuid: uuid, accionUuid: primeraAccionUuid },
    }));
  };

  const cambiarAccion = (uuid: string) => {
    setAction((a) => ({
      ...a,
      plugin: { pluginUuid: a.plugin?.pluginUuid ?? '', accionUuid: uuid },
    }));
  };

  return (
    <CuerpoPlugin
      pluginUuid={action.plugin?.pluginUuid ?? ''}
      accionUuid={action.plugin?.accionUuid ?? ''}
      settings={action.plugin?.settings}
      contexto={contexto}
      onCambiarPlugin={cambiarPlugin}
      onCambiarAccion={cambiarAccion}
    />
  );
}

/** La referencia que se manda a `openPI`, o `null` si aún no se puede. */
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
