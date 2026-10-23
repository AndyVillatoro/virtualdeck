import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EstadoPlugin, PluginInfo } from '../../types';
import { BotonIcono } from '../ui/BotonIcono';

function colorDeEstado(estado: EstadoPlugin, VD: ReturnType<typeof useTheme>): string {
  switch (estado) {
    case 'running': return VD.success;
    case 'starting': return VD.warning;
    case 'error': return VD.danger;
    case 'stopped':
    default: return VD.textMuted;
  }
}

function textoDeEstado(estado: EstadoPlugin, t: (k: string) => string): string {
  switch (estado) {
    case 'running': return t('plugins.statusRunning');
    case 'starting': return t('plugins.statusStarting');
    case 'error': return t('plugins.statusError');
    case 'stopped':
    default: return t('plugins.statusStopped');
  }
}

function ConmutadorMini({ valor, accent, title, onClick }: { valor: boolean; accent: string; title: string; onClick: () => void }) {
  const VD = useTheme();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      title={title}
      onClick={onClick}
      style={{
        width: 28, height: 16, borderRadius: 8, cursor: 'pointer',
        background: valor ? accent : VD.elevated, border: `1px solid ${valor ? accent : VD.border}`,
        position: 'relative', transition: 'background 0.2s, border-color 0.2s', flexShrink: 0, padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 1, left: valor ? 13 : 1, width: 12, height: 12,
        borderRadius: '50%', background: valor ? VD.onAccent : VD.textDim,
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );
}

function FilaEstadoPlugin({ plugin }: { plugin: PluginInfo }) {
  const VD = useTheme();
  const t = useT();
  const color = colorDeEstado(plugin.estado, VD);
  const texto = textoDeEstado(plugin.estado, t);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: VD.mono, fontSize: 8, color, letterSpacing: 0.5 }}>{texto}</span>
      {plugin.error && (
        <span
          title={plugin.error}
          style={{
            fontFamily: VD.mono, fontSize: 8, color: VD.danger,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140,
          }}
        >
          ({plugin.error})
        </span>
      )}
    </div>
  );
}

export function TarjetaPlugin({
  plugin, accent, onAlternar, onPedirDesinstalar,
}: {
  plugin: PluginInfo; accent: string;
  onAlternar: (p: PluginInfo) => void;
  onPedirDesinstalar: (p: PluginInfo) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const numAcciones = plugin.acciones.length;
  const textoAcciones = numAcciones === 1 ? t('plugins.actionOne') : t('plugins.actionMany', { n: numAcciones });

  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md, padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div
          title={plugin.nombre}
          style={{
            fontFamily: VD.mono, fontSize: 9, fontWeight: 700, color: VD.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}
        >
          {plugin.nombre}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <ConmutadorMini
            valor={plugin.habilitado}
            accent={accent}
            title={plugin.habilitado ? t('plugins.disable') : t('plugins.enable')}
            onClick={() => onAlternar(plugin)}
          />
          <BotonIcono
            glifo="TRASH"
            title={t('plugins.uninstallHint')}
            peligro
            tamano={20}
            tamanoGlifo={10}
            onClick={() => onPedirDesinstalar(plugin)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>v{plugin.version}</span>
        <span style={{
          padding: '1px 4px', borderRadius: VD.radius.sm, background: VD.overlay,
          border: `1px solid ${VD.borderStrong}`, color: VD.textDim, fontFamily: VD.mono, fontSize: 7, letterSpacing: 0.5,
        }}>
          {plugin.tipo.toUpperCase()}
        </span>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>·</span>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>{textoAcciones}</span>
      </div>

      <FilaEstadoPlugin plugin={plugin} />
    </div>
  );
}
