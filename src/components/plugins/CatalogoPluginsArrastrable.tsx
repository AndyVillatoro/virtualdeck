import React, { useMemo, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { useListaPlugins } from '../../utils/plugins/listaPlugins';
import {
  codificarArrastrePlugin,
  MIME_ARRASTRE_PLUGIN,
  type CargaArrastrePlugin,
} from '../../utils/plugins/arrastrePlugin';
import type { PluginAccionInfo, PluginInfo } from '../../types';

export interface CatalogoPluginsArrastrableProps {
  disabled?: boolean;
  /** Título opcional de la cabecera (por defecto `disp.plugin.titulo`). */
  titulo?: string;
  /** Si se pasa, hacer clic (o doble clic si es arrastrable) asigna/selecciona la acción. */
  onElegirAccion?: (carga: CargaArrastrePlugin) => void;
  /** En modo selector (editor modal), un clic elige directamente. En el panel lateral se arrastra. */
  clicDirecto?: boolean;
  /** Acción actualmente activa en el control/botón, para resaltarla en la lista. */
  seleccionActual?: { pluginUuid: string; accionUuid: string } | null;
  /** Oculta el bloque entero cuando no hay ningún plugin instalado/habilitado (útil en BarraLateral). */
  ocultarSiVacio?: boolean;
}

function colorEstadoPlugin(estado: PluginInfo['estado'], vd: ReturnType<typeof useTheme>): string {
  if (estado === 'running') return vd.success;
  if (estado === 'error') return vd.danger;
  if (estado === 'starting') return vd.warning;
  return vd.textMuted;
}

function FilaAccionArrastrable({
  plugin,
  accion,
  activa,
  disabled,
  clicDirecto,
  onElegir,
}: {
  plugin: PluginInfo;
  accion: PluginAccionInfo;
  activa: boolean;
  disabled: boolean;
  clicDirecto: boolean;
  onElegir?: (carga: CargaArrastrePlugin) => void;
}) {
  const VD = useTheme();
  const [hovered, setHovered] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const carga: CargaArrastrePlugin = {
    pluginUuid: plugin.uuid,
    accionUuid: accion.uuid,
    nombre: accion.nombre,
    esEncoder: accion.esEncoder,
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    setArrastrando(true);
    const payload = codificarArrastrePlugin(carga);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', payload);
    try {
      e.dataTransfer.setData(MIME_ARRASTRE_PLUGIN, payload);
    } catch {
      /* algunos entornos restringen MIME personalizados */
    }
  };

  const resaltado = activa || (hovered && !disabled);

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={() => setArrastrando(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (!disabled && clicDirecto) onElegir?.(carga);
      }}
      onDoubleClick={() => {
        if (!disabled && !clicDirecto) onElegir?.(carga);
      }}
      title={`${plugin.nombre} · ${accion.nombre}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: VD.space.sm,
        padding: '6px 8px',
        background: activa ? VD.accentBg : hovered && !disabled ? VD.elevatedHover : VD.elevated,
        border: `1px solid ${resaltado ? VD.accent : VD.border}`,
        borderRadius: VD.radius.sm,
        cursor: disabled ? 'default' : clicDirecto ? 'pointer' : 'grab',
        opacity: disabled ? 0.5 : arrastrando ? 0.65 : 1,
        userSelect: 'none',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: VD.radius.sm,
          background: VD.bg,
          border: `1px solid ${VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {accion.icono ? (
          <img
            src={accion.icono}
            alt=""
            draggable={false}
            style={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <DotGlyphIcon
            glyph={accion.esEncoder ? 'KNOB' : 'PLUG'}
            size={12}
            color={activa ? VD.accent : VD.text}
          />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: VD.mono,
            fontSize: 9,
            fontWeight: activa ? 700 : 600,
            color: activa ? VD.accent : VD.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {accion.nombre}
        </span>
        {accion.esEncoder && (
          <span
            style={{
              fontFamily: VD.mono,
              fontSize: 7.5,
              color: VD.textMuted,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            ENCODER / DIAL
          </span>
        )}
      </div>

      <DotGlyphIcon
        glyph="DOTS"
        size={10}
        color={resaltado ? VD.accent : VD.textMuted}
      />
    </div>
  );
}

function GrupoPlugin({
  plugin,
  abierto,
  onAlternar,
  disabled,
  clicDirecto,
  seleccionActual,
  onElegirAccion,
}: {
  plugin: PluginInfo;
  abierto: boolean;
  onAlternar: () => void;
  disabled: boolean;
  clicDirecto: boolean;
  seleccionActual?: { pluginUuid: string; accionUuid: string } | null;
  onElegirAccion?: (carga: CargaArrastrePlugin) => void;
}) {
  const VD = useTheme();
  const acciones = useMemo(() => plugin.acciones.filter((a) => a.esTecla), [plugin.acciones]);
  if (acciones.length === 0) return null;

  const tieneActiva = seleccionActual?.pluginUuid === plugin.uuid;

  return (
    <div
      style={{
        border: `1px solid ${tieneActiva ? VD.borderStrong : VD.border}`,
        borderRadius: VD.radius.sm,
        background: VD.surface,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onAlternar}
        style={{
          width: '100%',
          background: VD.elevated,
          border: 'none',
          borderBottom: abierto ? `1px solid ${VD.border}` : 'none',
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: VD.space.xs,
          cursor: 'pointer',
          fontFamily: VD.mono,
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <DotGlyphIcon
            glyph={abierto ? 'CHEVRON_DOWN' : 'CHEVRON_RIGHT'}
            size={8}
            color={VD.textMuted}
          />
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: colorEstadoPlugin(plugin.estado, VD),
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: VD.text,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {plugin.nombre}
          </span>
        </span>
        <span style={{ fontSize: 8, color: VD.textMuted, flexShrink: 0 }}>
          {acciones.length}
        </span>
      </button>

      {abierto && (
        <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {acciones.map((accion) => (
            <FilaAccionArrastrable
              key={accion.uuid}
              plugin={plugin}
              accion={accion}
              activa={
                seleccionActual?.pluginUuid === plugin.uuid &&
                seleccionActual?.accionUuid === accion.uuid
              }
              disabled={disabled}
              clicDirecto={clicDirecto}
              onElegir={onElegirAccion}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CatalogoPluginsArrastrable({
  disabled = false,
  titulo,
  onElegirAccion,
  clicDirecto = false,
  seleccionActual = null,
  ocultarSiVacio = false,
}: CatalogoPluginsArrastrableProps) {
  const VD = useTheme();
  const t = useT();
  const { lista, cargando } = useListaPlugins();
  const [cerrados, setCerrados] = useState<Set<string>>(() => new Set());

  const habilitados = useMemo(
    () => lista.filter((pl) => pl.habilitado && pl.acciones.some((a) => a.esTecla)),
    [lista],
  );

  if (ocultarSiVacio && habilitados.length === 0) return null;

  const alternarGrupo = (uuid: string) => {
    setCerrados((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.xs }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <label
          style={{
            fontSize: 8.5,
            color: VD.textMuted,
            fontFamily: VD.mono,
            textTransform: 'uppercase',
            letterSpacing: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph="PLUG" size={10} color={VD.accent} />
          <span>{titulo ?? t('disp.plugin.titulo')}</span>
        </label>
        {habilitados.length > 0 && (
          <span style={{ fontSize: 8, color: VD.textMuted, fontFamily: VD.mono }}>
            {habilitados.length}
          </span>
        )}
      </div>

      {habilitados.length === 0 ? (
        !cargando && (
          <div
            style={{
              padding: '8px 10px',
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderLeft: `2px solid ${VD.accent}`,
              borderRadius: VD.radius.sm,
              fontFamily: VD.mono,
              fontSize: 8,
              lineHeight: 1.6,
              color: VD.textMuted,
            }}
          >
            <div style={{ color: VD.text, marginBottom: 2 }}>
              {t(lista.length > 0 ? 'ed.plugin.ningunoHabilitado' : 'ed.plugin.noInstalados')}
            </div>
            <div>{t('ed.plugin.dondeInstalar')}</div>
          </div>
        )
      ) : (
        <>
          <div
            style={{
              fontFamily: VD.mono,
              fontSize: 8,
              color: VD.textMuted,
              lineHeight: 1.4,
              marginBottom: 2,
            }}
          >
            {t(clicDirecto ? 'ed.plugin.elegirAccion' : 'disp.plugin.arrastrarAyuda')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {habilitados.map((pl) => (
              <GrupoPlugin
                key={pl.uuid}
                plugin={pl}
                abierto={!cerrados.has(pl.uuid)}
                onAlternar={() => alternarGrupo(pl.uuid)}
                disabled={disabled}
                clicDirecto={clicDirecto}
                seleccionActual={seleccionActual}
                onElegirAccion={onElegirAccion}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
