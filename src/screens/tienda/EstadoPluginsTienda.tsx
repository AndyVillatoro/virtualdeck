import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EstadoPlugin, PluginInfo } from '../../types';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { BotonIcono } from '../../components/ui/BotonIcono';
import { estiloBotonTexto } from '../../components/ui/estilos';

function colorEstadoPlugin(estado: EstadoPlugin, VD: ReturnType<typeof useTheme>): string {
  switch (estado) {
    case 'running': return VD.success;
    case 'starting': return VD.warning;
    case 'error': return VD.danger;
    default: return VD.textMuted;
  }
}

function textoEstadoPlugin(estado: EstadoPlugin, t: (k: string) => string): string {
  switch (estado) {
    case 'running': return t('plugins.statusRunning');
    case 'starting': return t('plugins.statusStarting');
    case 'error': return t('plugins.statusError');
    default: return t('plugins.statusStopped');
  }
}

function FilaPluginInstalado({
  plugin,
  onDesinstalar,
}: {
  plugin: PluginInfo;
  onDesinstalar?: (p: PluginInfo) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const colorEst = colorEstadoPlugin(plugin.estado, VD);
  const numAcc = plugin.acciones.length;
  const textoAcc = numAcc === 1 ? t('plugins.actionOne') : t('plugins.actionMany', { n: numAcc });

  return (
    <div
      style={{
        background: VD.elevated,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: VD.radius.sm,
            background: VD.surface,
            border: `1px solid ${VD.borderStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DotGlyphIcon glyph="USB_PLUG" size={18} color={VD.accent} showRecessed />
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: VD.tipo.md,
                fontWeight: 700,
                color: VD.text,
              }}
            >
              {plugin.nombre}
            </span>
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: VD.tipo.xs,
                color: VD.textDim,
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                padding: '1px 6px',
              }}
            >
              v{plugin.version}
            </span>
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: VD.tipo.xs,
                color: VD.textMuted,
                background: VD.surface,
                border: `1px solid ${VD.border}`,
                borderRadius: VD.radius.sm,
                padding: '1px 6px',
              }}
            >
              {plugin.tipo.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: colorEst, display: 'inline-block' }} />
              <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: colorEst }}>
                {textoEstadoPlugin(plugin.estado, t)}
              </span>
            </span>
            <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>·</span>
            <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textDim }}>{textoAcc}</span>
            <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>·</span>
            <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>{plugin.uuid}</span>
          </div>
        </div>
      </div>

      {onDesinstalar && (
        <BotonIcono
          glifo="TRASH"
          title={t('plugins.uninstallHint')}
          peligro
          conMarco
          tamano={28}
          tamanoGlifo={10}
          onClick={() => onDesinstalar(plugin)}
        />
      )}
    </div>
  );
}

export interface EstadoPluginsTiendaProps {
  sinRed?: boolean;
  pluginsInstalados?: PluginInfo[];
  onRecargar?: () => void;
  onDesinstalarPlugin?: (p: PluginInfo) => void;
  onVolver: () => void;
}

/**
 * Estado vacío útil de la sección PLUGINS cuando el manifiesto cargado no trae
 * entradas `kind: 'plugin'` o cuando falló la conexión. Además enseña los
 * plugins ya instalados en el equipo para que siempre sea accionable.
 */
export function EstadoPluginsTienda({
  sinRed = false,
  pluginsInstalados = [],
  onRecargar,
  onDesinstalarPlugin,
  onVolver,
}: EstadoPluginsTiendaProps) {
  const VD = useTheme();
  const t = useT();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          background: VD.surface,
          border: `1px solid ${sinRed ? VD.warning : VD.border}`,
          borderRadius: VD.radius.md,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: VD.radius.md,
            background: VD.elevated,
            backgroundImage: `radial-gradient(rgba(${VD.trama}, 0.08) 1px, transparent 0)`,
            backgroundSize: '4px 4px',
            border: `1px solid ${sinRed ? VD.warning : VD.borderStrong}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <DotGlyphIcon glyph={sinRed ? 'WARN' : 'USB_PLUG'} size={28} color={sinRed ? VD.warning : VD.accent} showRecessed />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, maxWidth: 480 }}>
          <div
            style={{
              fontFamily: VD.mono,
              fontSize: VD.tipo.md,
              fontWeight: 700,
              color: VD.text,
              letterSpacing: 1.5,
            }}
          >
            {sinRed ? t('tienda.pluginsOfflineTitle') : t('tienda.pluginsEmptyTitle')}
          </div>

          <p
            style={{
              margin: 0,
              fontFamily: VD.mono,
              fontSize: VD.tipo.sm,
              color: VD.textDim,
              lineHeight: 1.6,
            }}
          >
            {sinRed ? t('tienda.pluginsOfflineDesc') : t('tienda.pluginsEmptyDesc')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {onRecargar && (
            <button
              type="button"
              onClick={onRecargar}
              style={{
                ...estiloBotonTexto(VD, true),
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 28,
              }}
            >
              <DotGlyphIcon glyph="IMPORT" size={8} color={VD.onAccent} />
              <span>{t('tienda.pluginsReload')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onVolver}
            style={{
              ...estiloBotonTexto(VD, false),
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 28,
            }}
          >
            <DotGlyphIcon glyph="ARROW_LEFT" size={8} color={VD.textDim} />
            <span>{t('tienda.pluginsVolver')}</span>
          </button>
        </div>
      </div>

      {/* Inventario de plugins ya instalados en el equipo */}
      <div
        style={{
          background: VD.surface,
          border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.md,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DotGlyphIcon glyph="USB_PLUG" size={8} color={VD.accent} />
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: VD.tipo.xs,
                fontWeight: 700,
                color: VD.textDim,
                letterSpacing: 1.5,
              }}
            >
              {t('tienda.pluginsLocalHeader')}
            </span>
          </div>
          <span
            style={{
              fontFamily: VD.mono,
              fontSize: VD.tipo.xs,
              color: VD.textMuted,
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              padding: '1px 6px',
            }}
          >
            {pluginsInstalados.length}
          </span>
        </div>

        {pluginsInstalados.length === 0 ? (
          <div
            style={{
              fontFamily: VD.mono,
              fontSize: VD.tipo.sm,
              color: VD.textMuted,
              padding: '12px 8px',
              textAlign: 'center',
              background: VD.bg,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
            }}
          >
            {t('plugins.empty')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pluginsInstalados.map((p) => (
              <FilaPluginInstalado key={p.uuid} plugin={p} onDesinstalar={onDesinstalarPlugin} />
            ))}
          </div>
        )}

        <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('tienda.pluginsLocalSettingsHint')}
        </div>
      </div>
    </div>
  );
}
