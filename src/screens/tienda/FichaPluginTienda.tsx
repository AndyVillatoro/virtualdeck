import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria } from '../../types';
import type { EstadoPluginTienda } from '../../utils/plugins/estadoTienda';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { estiloBotonTexto } from '../../components/ui/estilos';
import { textoSobre } from '../../comun/contraste';

export function estiloBotonFicha(
  VD: ReturnType<typeof useTheme>,
  primario: boolean,
  color?: string,
  disabled?: boolean,
): React.CSSProperties {
  const ac = color ?? VD.accent;
  return {
    ...estiloBotonTexto(VD, primario, ac),
    padding: '8px 16px',
    minHeight: 32,
    fontWeight: primario ? 700 : 500,
    color: primario ? textoSobre(ac) : VD.text,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'border-color 0.12s, background 0.12s, opacity 0.12s',
  };
}

export function BotonesAccionPlugin({
  estadoPlugin,
  version,
  versionInstalada,
  instalando,
  hayError,
  onInstalarPlugin,
  onDesinstalarPlugin,
}: {
  estadoPlugin: EstadoPluginTienda;
  version?: string;
  versionInstalada?: string;
  instalando: boolean;
  hayError: boolean;
  onInstalarPlugin?: () => void;
  onDesinstalarPlugin?: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  if (instalando) {
    return (
      <button type="button" disabled style={estiloBotonFicha(VD, true, VD.accent, true)}>
        <DotGlyphIcon glyph="CLOCK" size={8} color={VD.onAccent} />
        <span>{t('tienda.pluginInstalling')}</span>
      </button>
    );
  }

  if (estadoPlugin === 'actualizable') {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onInstalarPlugin}
          style={estiloBotonFicha(VD, true, VD.warning)}
        >
          <DotGlyphIcon glyph="IMPORT" size={8} color={textoSobre(VD.warning)} />
          <span>{t('tienda.pluginUpdateBtn', { version: version ?? '?' })}</span>
        </button>
        {onDesinstalarPlugin && (
          <button
            type="button"
            onClick={onDesinstalarPlugin}
            style={{
              ...estiloBotonFicha(VD, false),
              borderColor: VD.danger,
              color: VD.danger,
            }}
          >
            <DotGlyphIcon glyph="TRASH" size={8} color={VD.danger} />
            <span>{t('plugins.uninstall')}</span>
          </button>
        )}
      </div>
    );
  }

  if (estadoPlugin === 'instalado') {
    return (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span
          style={{
            padding: '8px 12px',
            minHeight: 32,
            boxSizing: 'border-box',
            background: VD.surface,
            border: `1px solid ${VD.success}`,
            borderRadius: VD.radius.sm,
            color: VD.success,
            fontFamily: VD.mono,
            fontSize: VD.tipo.xs,
            fontWeight: 700,
            letterSpacing: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph="CHECK" size={8} color={VD.success} />
          <span>
            {t('tienda.installed')}
            {versionInstalada ? ` · v${versionInstalada}` : ''}
          </span>
        </span>
        {onDesinstalarPlugin && (
          <button
            type="button"
            onClick={onDesinstalarPlugin}
            style={{
              ...estiloBotonFicha(VD, false),
              borderColor: VD.danger,
              color: VD.danger,
            }}
          >
            <DotGlyphIcon glyph="TRASH" size={8} color={VD.danger} />
            <span>{t('plugins.uninstall')}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onInstalarPlugin}
      style={estiloBotonFicha(VD, true)}
    >
      <DotGlyphIcon glyph="IMPORT" size={8} color={VD.onAccent} />
      <span>{t(hayError ? 'tienda.pluginRetry' : 'tienda.pluginInstall')}</span>
    </button>
  );
}

export function SeccionMetadatosPlugin({ entrada }: { entrada: EntradaGaleria }) {
  const VD = useTheme();
  const t = useT();
  if (entrada.kind !== 'plugin') return null;

  const celda: React.CSSProperties = {
    background: VD.bg,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  };

  return (
    <div
      style={{
        background: VD.surface,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DotGlyphIcon glyph="LOCK" size={8} color={VD.accent} />
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, fontWeight: 700, color: VD.textDim, letterSpacing: 1 }}>
            {t('tienda.pluginMetaTitle')}
          </span>
        </div>
        <span
          style={{
            fontFamily: VD.mono,
            fontSize: VD.tipo.xs,
            color: VD.success,
            border: `1px solid ${VD.success}`,
            borderRadius: VD.radius.sm,
            padding: '1px 6px',
            letterSpacing: 0.5,
          }}
        >
          {t('tienda.pluginShaBadge')}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8,
        }}
      >
        <div style={celda}>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>
            {t('tienda.pluginUuid')}
          </span>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.text, wordBreak: 'break-all' }}>
            {entrada.uuid ?? entrada.id}
          </span>
        </div>
        <div style={celda}>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>
            {t('tienda.pluginLicense')}
          </span>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.text }}>
            {entrada.license ?? '—'}
          </span>
        </div>
        <div style={celda}>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>
            {t('tienda.pluginMinVersion')}
          </span>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.text }}>
            {entrada.minAppVersion ? `v${entrada.minAppVersion}` : '—'}
          </span>
        </div>
      </div>

      {entrada.sha256 && (
        <div style={celda}>
          <span style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, color: VD.textMuted }}>
            {t('tienda.pluginSha256')}
          </span>
          <span
            style={{
              fontFamily: VD.mono,
              fontSize: VD.tipo.xs,
              color: VD.textDim,
              wordBreak: 'break-all',
              letterSpacing: 0.5,
            }}
          >
            {entrada.sha256}
          </span>
        </div>
      )}
    </div>
  );
}
