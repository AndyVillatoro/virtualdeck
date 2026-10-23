import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria } from '../../types';
import type { EstadoPluginTienda } from '../../utils/plugins/estadoTienda';
import type { EstadoEntrada } from './tiendaUtils';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { BotonesAccionPlugin, estiloBotonFicha } from './FichaPluginTienda';

export function SeccionPortada({ portada, altura }: { portada?: string; altura: number }) {
  const VD = useTheme();
  const [rota, setRota] = useState(false);
  if (!portada || rota) return null;

  return (
    <div
      style={{
        height: altura,
        width: '100%',
        overflow: 'hidden',
        borderRadius: VD.radius.md,
        border: `1px solid ${VD.border}`,
        background: VD.surface,
      }}
    >
      <img
        src={portada}
        alt=""
        onError={() => setRota(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

export function BotonesAccionFicha({
  entrada,
  estadoPlugin = 'disponible',
  versionInstalada,
  instalandoPlugin = false,
  hayErrorPlugin = false,
  puedeAgregarPagina,
  onInstalarPagina,
  onInstalarPerfil,
  onInstalarPlugin,
  onDesinstalarPlugin,
}: {
  entrada: EntradaGaleria;
  estadoPlugin?: EstadoPluginTienda;
  versionInstalada?: string;
  instalandoPlugin?: boolean;
  hayErrorPlugin?: boolean;
  puedeAgregarPagina: boolean;
  onInstalarPagina: () => void;
  onInstalarPerfil: (agregarAlDeck: boolean) => void;
  onInstalarPlugin?: () => void;
  onDesinstalarPlugin?: () => void;
}) {
  const VD = useTheme();
  const t = useT();

  if (entrada.kind === 'plugin') {
    return (
      <BotonesAccionPlugin
        estadoPlugin={estadoPlugin}
        version={entrada.version}
        versionInstalada={versionInstalada}
        instalando={instalandoPlugin}
        hayError={hayErrorPlugin}
        onInstalarPlugin={onInstalarPlugin}
        onDesinstalarPlugin={onDesinstalarPlugin}
      />
    );
  }

  if (entrada.kind === 'page') {
    return (
      <button
        type="button"
        onClick={onInstalarPagina}
        disabled={!puedeAgregarPagina}
        style={estiloBotonFicha(VD, true, undefined, !puedeAgregarPagina)}
        title={t('gal.addPageHint')}
      >
        <DotGlyphIcon glyph="ADD" size={8} color={VD.onAccent} />
        <span>{t('gal.addPage')}</span>
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => onInstalarPerfil(true)}
        style={estiloBotonFicha(VD, true)}
        title={t('gal.importAndAppendHint')}
      >
        <DotGlyphIcon glyph="IMPORT" size={8} color={VD.onAccent} />
        <span>{t('gal.importAndAppend')}</span>
      </button>
      <button
        type="button"
        onClick={() => onInstalarPerfil(false)}
        style={estiloBotonFicha(VD, false)}
        title={t('gal.importOnlyHint')}
      >
        <span>{t('gal.importOnly')}</span>
      </button>
    </div>
  );
}

export function MetadatosFicha({
  entrada,
  estado,
  versionInstalada,
}: {
  entrada: EntradaGaleria;
  estado: EstadoEntrada;
  versionInstalada?: string;
}) {
  const VD = useTheme();
  const t = useT();
  const insignia: React.CSSProperties = {
    fontFamily: VD.mono,
    fontSize: VD.tipo.xs,
    color: VD.textMuted,
    background: VD.surface,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    padding: '2px 8px',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };

  const etiquetaTipo = entrada.kind === 'plugin'
    ? t('tienda.kindPlugin')
    : t(entrada.kind === 'page' ? 'gal.kind.page' : 'gal.kind.profile');
  const glifoTipo = entrada.kind === 'plugin' ? 'USB_PLUG' : entrada.kind === 'page' ? 'APP_WINDOW' : 'FOLDER';

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ ...insignia, color: VD.text, borderColor: VD.borderStrong }}>
        <DotGlyphIcon glyph={glifoTipo} size={8} color={VD.accent} />
        <span>{etiquetaTipo}</span>
      </span>
      {entrada.targetApp && <span style={insignia}>{entrada.targetApp}</span>}
      {entrada.license && <span style={insignia}>{entrada.license}</span>}
      {(entrada.tags ?? []).map((tag) => (
        <span key={tag} style={insignia}>#{tag}</span>
      ))}
      {estado === 'update' && (
        <span style={{ ...insignia, color: VD.warning, borderColor: VD.warning }}>
          <DotGlyphIcon glyph="ARROW_UP" size={8} color={VD.warning} />
          <span>
            {t('tienda.update', { version: entrada.version ?? '?' })}
            {versionInstalada ? ` (v${versionInstalada})` : ''}
          </span>
        </span>
      )}
      {estado === 'instalado' && (
        <span style={{ ...insignia, color: VD.success, borderColor: VD.success }}>
          <DotGlyphIcon glyph="CHECK" size={8} color={VD.success} />
          <span>
            {t('tienda.installed')}
            {versionInstalada ? ` v${versionInstalada}` : ''}
          </span>
        </span>
      )}
      {estado === 'nuevo' && (
        <span style={{ ...insignia, color: VD.accent, borderColor: VD.accent, background: VD.accentBg }}>
          <span>{t(entrada.kind === 'plugin' ? 'tienda.available' : 'tienda.new')}</span>
        </span>
      )}
    </div>
  );
}

export function SeccionReadme({
  readme,
}: {
  readme: { texto?: string; error?: string; cargando: boolean } | null;
}) {
  const VD = useTheme();
  const t = useT();
  if (!readme || (!readme.texto && !readme.error && !readme.cargando)) return null;

  return (
    <div
      style={{
        background: VD.elevated,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.xs, fontWeight: 700, color: VD.textDim, letterSpacing: 1 }}>
        {t('tienda.readmeBy')}
      </div>
      <div
        style={{
          fontFamily: VD.mono,
          fontSize: VD.tipo.sm,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: VD.text,
          lineHeight: 1.6,
        }}
      >
        {readme.cargando ? t('gal.loading') : readme.error
          ? t('tienda.readmeFailed', { error: readme.error })
          : readme.texto}
      </div>
    </div>
  );
}
