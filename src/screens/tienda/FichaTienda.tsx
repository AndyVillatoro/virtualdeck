import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import type { EntradaGaleria, ResumenRiesgo } from '../../types';
import type { EstadoPluginTienda } from '../../utils/plugins/estadoTienda';
import type { EstadoEntrada } from './tiendaUtils';
import { IconoTienda } from './IconoTienda';
import { TiraCapturas } from './TiraCapturas';
import { BloquesRiesgoTienda } from './BloquesRiesgoTienda';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { estiloBotonTexto } from '../../components/ui/estilos';
import { BotonesAccionPlugin, SeccionMetadatosPlugin, estiloBotonFicha } from './FichaPluginTienda';

function SeccionPortada({ portada, altura }: { portada?: string; altura: number }) {
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

function BotonesAccionFicha({
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

function MetadatosFicha({
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


function SeccionReadme({
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

export interface FichaTiendaProps {
  entrada: EntradaGaleria;
  riesgo: ResumenRiesgo;
  estado: EstadoEntrada;
  estadoPlugin?: EstadoPluginTienda;
  versionInstalada?: string;
  readme: { texto?: string; error?: string; cargando: boolean } | null;
  puedeAgregarPagina: boolean;
  instalandoPlugin?: boolean;
  errorPlugin?: string | null;
  onInstalarPerfil: (agregarAlDeck: boolean) => void;
  onInstalarPagina: () => void;
  onInstalarPlugin?: () => void;
  onDesinstalarPlugin?: () => void;
  onCerrar: () => void;
}

/**
 * Ficha detallada de la tienda para perfiles, páginas y plugins: portada,
 * cabecera con botón primario claro, verificación SHA-256 para plugins,
 * tira de capturas, descripción, README y desglose completo de riesgo.
 */
export function FichaTienda({
  entrada,
  riesgo,
  estado,
  estadoPlugin = 'disponible',
  versionInstalada,
  readme,
  puedeAgregarPagina,
  instalandoPlugin = false,
  errorPlugin = null,
  onInstalarPerfil,
  onInstalarPagina,
  onInstalarPlugin,
  onDesinstalarPlugin,
  onCerrar,
}: FichaTiendaProps) {
  const VD = useTheme();
  const t = useT();
  const { formato } = useFormatoPantalla();

  const alturaPortada = formato === 'barra' ? 120 : 180;
  const menudo: React.CSSProperties = {
    fontFamily: VD.mono,
    fontSize: VD.tipo.sm,
    color: VD.textMuted,
    lineHeight: 1.6,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Barra de navegación superior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            ...estiloBotonTexto(VD, false),
            minHeight: 28,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DotGlyphIcon glyph="ARROW_LEFT" size={8} color={VD.accent} />
          <span>{t('tienda.back')}</span>
        </button>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            ...estiloBotonTexto(VD, false),
            minHeight: 28,
          }}
        >
          {t('tienda.close')}
        </button>
      </div>

      {/* Portada ancha arriba si existe */}
      <SeccionPortada portada={entrada.portada} altura={alturaPortada} />

      {/* Cabecera de identidad y acciones de instalación */}
      <div
        style={{
          background: VD.elevated,
          border: `1px solid ${VD.borderStrong}`,
          borderRadius: VD.radius.md,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: VD.radius.md,
                background: VD.surface,
                backgroundImage: `radial-gradient(rgba(${VD.trama}, 0.08) 1px, transparent 0)`,
                backgroundSize: '4px 4px',
                border: `1px solid ${VD.borderStrong}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconoTienda icono={entrada.icono} kind={entrada.kind} size={36} color={VD.accent} showRecessed />
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div
                style={{
                  fontFamily: VD.mono,
                  fontSize: VD.tipo.xl,
                  fontWeight: 700,
                  color: VD.text,
                  letterSpacing: 0.5,
                }}
              >
                {entrada.label}
              </div>
              <div style={menudo}>
                {entrada.author ?? 'VirtualDeck'}
                {entrada.version ? ` · v${entrada.version}` : ''}
                {entrada.license ? ` · ${entrada.license}` : ''}
              </div>
            </div>
          </div>

          <BotonesAccionFicha
            entrada={entrada}
            estadoPlugin={estadoPlugin}
            versionInstalada={versionInstalada}
            instalandoPlugin={instalandoPlugin}
            hayErrorPlugin={Boolean(errorPlugin)}
            puedeAgregarPagina={puedeAgregarPagina}
            onInstalarPagina={onInstalarPagina}
            onInstalarPerfil={onInstalarPerfil}
            onInstalarPlugin={onInstalarPlugin}
            onDesinstalarPlugin={onDesinstalarPlugin}
          />
        </div>

        <MetadatosFicha
          entrada={entrada}
          estado={estado}
          versionInstalada={versionInstalada}
        />
      </div>

      {/* Error de instalación de plugin si ocurrió */}
      {errorPlugin && (
        <div
          style={{
            background: VD.elevated,
            border: `1px solid ${VD.danger}`,
            borderRadius: VD.radius.md,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DotGlyphIcon glyph="WARN" size={12} color={VD.danger} />
          <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.danger, lineHeight: 1.5, flex: 1 }}>
            {errorPlugin}
          </div>
        </div>
      )}

      {/* Aviso de plugin instalado con indicación de Ajustes -> Plugins */}
      {entrada.kind === 'plugin' && estadoPlugin === 'instalado' && (
        <div
          style={{
            background: VD.surface,
            border: `1px solid ${VD.success}`,
            borderRadius: VD.radius.md,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DotGlyphIcon glyph="CHECK" size={12} color={VD.success} />
          <div style={{ fontFamily: VD.mono, fontSize: VD.tipo.sm, color: VD.textDim, lineHeight: 1.5 }}>
            {t('tienda.pluginInstalledHint')}
          </div>
        </div>
      )}

      {/* Aviso de actualización si la hay */}
      {estado === 'update' && (
        <div
          style={{
            ...menudo,
            color: VD.warning,
            background: VD.surface,
            border: `1px solid ${VD.warning}`,
            borderRadius: VD.radius.md,
            padding: '8px 12px',
          }}
        >
          {t('tienda.update', { version: entrada.version ?? '?' })}
          {versionInstalada ? ` (${versionInstalada} → ${entrada.version})` : ''}
        </div>
      )}

      {/* Tira de capturas con modal zoom */}
      <TiraCapturas capturas={entrada.capturas} />

      {/* Descripción y README */}
      {entrada.description && (
        <div
          style={{
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.md,
            padding: 12,
          }}
        >
          <div style={{ ...menudo, color: VD.text }}>{entrada.description}</div>
        </div>
      )}

      <SeccionReadme readme={readme} />

      {/* Metadatos técnicos y SHA-256 para plugins */}
      <SeccionMetadatosPlugin entrada={entrada} />

      {/* Requisitos */}
      {entrada.requires && entrada.requires.length > 0 && (
        <div
          style={{
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.md,
            padding: 12,
          }}
        >
          <div style={menudo}>
            {t('gal.requires')} {entrada.requires.join(' · ')}
          </div>
        </div>
      )}

      {/* Aviso de riesgo completo: nunca se esconde */}
      <div
        style={{
          background: VD.elevated,
          border: `1px solid ${VD.warning}`,
          borderRadius: VD.radius.md,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DotGlyphIcon glyph="WARN" size={10} color={VD.warning} />
          <div style={{ ...menudo, color: VD.warning, fontWeight: 700 }}>{t('gal.warn')}</div>
        </div>
        <BloquesRiesgoTienda riesgo={riesgo} />
      </div>

      {/* Botones al pie de página */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16 }}>
        <BotonesAccionFicha
          entrada={entrada}
          estadoPlugin={estadoPlugin}
          versionInstalada={versionInstalada}
          instalandoPlugin={instalandoPlugin}
          hayErrorPlugin={Boolean(errorPlugin)}
          puedeAgregarPagina={puedeAgregarPagina}
          onInstalarPagina={onInstalarPagina}
          onInstalarPerfil={onInstalarPerfil}
          onInstalarPlugin={onInstalarPlugin}
          onDesinstalarPlugin={onDesinstalarPlugin}
        />
        <button type="button" onClick={onCerrar} style={estiloBotonFicha(VD, false)}>
          {t('ui.cancel')}
        </button>
      </div>
    </div>
  );
}
