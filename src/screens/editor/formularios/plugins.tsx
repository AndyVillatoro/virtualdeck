import React, { useEffect, useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { estiloDesplegable } from '../../../components/ui/estilos';
import { Field } from '../comunes';
import { superficieDe } from '../../../utils/plugins/ref';
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
 * Los plugins instalados, y aviso de que la lista sigue cargando.
 *
 * Se recarga sola cuando cambia algo (instalar, desinstalar, habilitar): sin
 * `onChanged`, el desplegable seguiría con lo que había al abrir el editor.
 */
function useListaPlugins(): { lista: PluginInfo[]; cargando: boolean } {
  const [lista, setLista] = useState<PluginInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const plugins = window.electronAPI?.plugins;
    if (!plugins) { setCargando(false); return; }
    let vivo = true;
    const cargar = () => {
      const poner = (l: PluginInfo[]) => { if (vivo) { setLista(l); setCargando(false); } };
      plugins.list().then(poner).catch(() => poner([]));
    };
    cargar();
    const fuera = plugins.onChanged(cargar);
    return () => { vivo = false; fuera(); };
  }, []);
  return { lista, cargando };
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

export function FormPlugin(p: PropsFormulario) {
  const t = useT();
  const { action, setAction, botonId, pages, indicePaginaBoton } = p;
  const { lista, cargando } = useListaPlugins();

  // Un plugin deshabilitado no se ofrece: se puede tener instalado y apagado,
  // y una acción suya no haría nada al pulsar.
  const habilitados = lista.filter((pl) => pl.habilitado);
  const info = elegirPlugin(habilitados, action.plugin?.pluginUuid);
  const acciones = accionesDeTecla(info);
  const elegida: PluginAccionInfo | null =
    acciones.find((a) => a.uuid === action.plugin?.accionUuid) ?? null;

  const contexto = botonId ? `${superficieDe(pages, indicePaginaBoton)}:${botonId}` : null;
  const ref = refDeEditor(info, elegida, contexto, action.plugin?.settings);

  const cambiarPlugin = (uuid: string) => {
    const nuevo = elegirPlugin(habilitados, uuid);
    const primera = accionesDeTecla(nuevo)[0];
    setAction((a) => ({
      ...a,
      // Los ajustes son de la acción anterior: no sobreviven al cambio.
      plugin: { pluginUuid: uuid, accionUuid: primera?.uuid ?? '' },
    }));
  };

  const cambiarAccion = (uuid: string) => {
    setAction((a) => ({
      ...a,
      plugin: { pluginUuid: a.plugin?.pluginUuid ?? '', accionUuid: uuid },
    }));
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
        valor={action.plugin?.pluginUuid ?? ''}
        opciones={habilitados.map((pl) => ({ valor: pl.uuid, texto: `${pl.nombre} ${pl.version}` }))}
        onElegir={cambiarPlugin}
      />

      <SelectorPlugin
        etiqueta={t('ed.plugin.accion')}
        vacio={t('ed.plugin.elegirAccion')}
        valor={action.plugin?.accionUuid ?? ''}
        opciones={acciones.map((a) => ({ valor: a.uuid, texto: a.nombre }))}
        onElegir={cambiarAccion}
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
