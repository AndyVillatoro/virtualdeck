import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import type { EntradaGaleria, ResumenRiesgo } from '../../types';
import type { EstadoEntrada } from './tiendaUtils';
import { IconoTienda } from './IconoTienda';
import { TiraCapturas } from './TiraCapturas';
import { BloquesRiesgoTienda } from './BloquesRiesgoTienda';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

function estiloBoton(VD: ReturnType<typeof useTheme>, primario: boolean, color?: string): React.CSSProperties {
  const ac = color ?? VD.accent;
  return {
    padding: '4px 12px',
    minHeight: 24,
    background: primario ? ac : VD.elevated,
    border: `1px solid ${primario ? ac : VD.border}`,
    borderRadius: VD.radius.sm,
    color: primario ? VD.onAccent : VD.textDim,
    fontFamily: VD.mono,
    fontSize: 8,
    letterSpacing: 1,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };
}

function SeccionPortada({ portada, altura }: { portada?: string; altura: number }) {
  const VD = useTheme();
  const [rota, setRota] = useState(false);
  if (!portada || rota) return null;

  return (
    <div style={{
      height: altura,
      width: '100%',
      overflow: 'hidden',
      borderRadius: VD.radius.md,
      border: `1px solid ${VD.border}`,
      background: VD.surface,
    }}>
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
  esPagina,
  puedeAgregarPagina,
  onInstalarPagina,
  onInstalarPerfil,
}: {
  esPagina: boolean;
  puedeAgregarPagina: boolean;
  onInstalarPagina: () => void;
  onInstalarPerfil: (agregarAlDeck: boolean) => void;
}) {
  const VD = useTheme();
  const t = useT();

  if (esPagina) {
    return (
      <button
        type="button"
        onClick={onInstalarPagina}
        disabled={!puedeAgregarPagina}
        style={estiloBoton(VD, true)}
        title={t('gal.addPageHint')}
      >
        {t('gal.addPage')}
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => onInstalarPerfil(true)}
        style={estiloBoton(VD, true)}
        title={t('gal.importAndAppendHint')}
      >
        {t('gal.importAndAppend')}
      </button>
      <button
        type="button"
        onClick={() => onInstalarPerfil(false)}
        style={estiloBoton(VD, false)}
        title={t('gal.importOnlyHint')}
      >
        {t('gal.importOnly')}
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
    fontSize: 8,
    color: VD.textMuted,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.sm,
    padding: '1px 6px',
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={insignia}>{t(entrada.kind === 'page' ? 'gal.kind.page' : 'gal.kind.profile')}</span>
      {entrada.targetApp && <span style={insignia}>{entrada.targetApp}</span>}
      {(entrada.tags ?? []).map((tag) => (
        <span key={tag} style={insignia}>#{tag}</span>
      ))}
      {estado === 'update' && (
        <span style={{ ...insignia, color: VD.warning, borderColor: VD.warning }}>
          {t('tienda.update', { version: entrada.version ?? '?' })}
          {versionInstalada ? ` (v${versionInstalada})` : ''}
        </span>
      )}
      {estado === 'instalado' && (
        <span style={{ ...insignia, color: VD.textMuted }}>
          {t('tienda.installed')}
          {versionInstalada ? ` v${versionInstalada}` : ''}
        </span>
      )}
      {estado === 'nuevo' && (
        <span style={{ ...insignia, color: VD.accent, borderColor: VD.accent }}>
          {t('tienda.new')}
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
    <div style={{
      background: VD.elevated,
      border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md,
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim }}>{t('tienda.readmeBy')}</div>
      <div style={{
        fontFamily: VD.mono,
        fontSize: 8,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: VD.text,
        lineHeight: 1.6,
      }}>
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
  versionInstalada?: string;
  readme: { texto?: string; error?: string; cargando: boolean } | null;
  puedeAgregarPagina: boolean;
  onInstalarPerfil: (agregarAlDeck: boolean) => void;
  onInstalarPagina: () => void;
  onCerrar: () => void;
}

/**
 * Ficha detallada de la tienda: portada arriba, tira de capturas con ampliación,
 * descripción, README del autor, requisitos, aviso de riesgo completo y botones de acción.
 */
export function FichaTienda({
  entrada,
  riesgo,
  estado,
  versionInstalada,
  readme,
  puedeAgregarPagina,
  onInstalarPerfil,
  onInstalarPagina,
  onCerrar,
}: FichaTiendaProps) {
  const VD = useTheme();
  const t = useT();
  const { formato } = useFormatoPantalla();

  const esPagina = entrada.kind === 'page';
  const alturaPortada = formato === 'barra' ? 120 : 180;

  const menudo: React.CSSProperties = {
    fontFamily: VD.mono,
    fontSize: 8,
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
            ...estiloBoton(VD, false),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph="ARROW_LEFT" size={8} color={VD.accent} />
          <span>{t('tienda.back')}</span>
        </button>
        <button type="button" onClick={onCerrar} style={estiloBoton(VD, false)}>
          {t('tienda.close')}
        </button>
      </div>

      {/* Portada ancha arriba si existe */}
      <SeccionPortada portada={entrada.portada} altura={alturaPortada} />

      {/* Cabecera de identidad y acciones de instalación */}
      <div style={{
        background: VD.elevated,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: VD.radius.md,
              background: VD.surface,
              border: `1px solid ${VD.borderStrong}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IconoTienda icono={entrada.icono} kind={entrada.kind} size={28} color={VD.accent} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: VD.mono,
                fontSize: 13,
                fontWeight: 600,
                color: VD.text,
                letterSpacing: 0.5,
              }}>
                {entrada.label}
              </div>
              <div style={menudo}>
                {entrada.author ? `${entrada.author} · ` : ''}
                {entrada.version ? `v${entrada.version}` : ''}
              </div>
            </div>
          </div>

          <BotonesAccionFicha
            esPagina={esPagina}
            puedeAgregarPagina={puedeAgregarPagina}
            onInstalarPagina={onInstalarPagina}
            onInstalarPerfil={onInstalarPerfil}
          />
        </div>

        <MetadatosFicha
          entrada={entrada}
          estado={estado}
          versionInstalada={versionInstalada}
        />
      </div>

      {/* Aviso de actualización si la hay */}
      {estado === 'update' && (
        <div style={{
          ...menudo,
          color: VD.warning,
          border: `1px solid ${VD.warning}`,
          borderRadius: VD.radius.md,
          padding: '6px 10px',
        }}>
          {t('tienda.update', { version: entrada.version ?? '?' })}
          {versionInstalada ? ` (${versionInstalada} → ${entrada.version})` : ''}
        </div>
      )}

      {/* Tira de capturas con modal zoom */}
      <TiraCapturas capturas={entrada.capturas} />

      {/* Descripción y README */}
      {entrada.description && (
        <div style={{
          background: VD.surface,
          border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.md,
          padding: '8px 12px',
        }}>
          <div style={{ ...menudo, color: VD.textDim }}>{entrada.description}</div>
        </div>
      )}

      <SeccionReadme readme={readme} />

      {/* Requisitos */}
      {entrada.requires && entrada.requires.length > 0 && (
        <div style={{
          background: VD.surface,
          border: `1px solid ${VD.border}`,
          borderRadius: VD.radius.md,
          padding: '8px 12px',
        }}>
          <div style={menudo}>
            {t('gal.requires')} {entrada.requires.join(' · ')}
          </div>
        </div>
      )}

      {/* Aviso de riesgo completo: nunca se esconde */}
      <div style={{
        background: VD.elevated,
        border: `1px solid ${VD.warning}`,
        borderRadius: VD.radius.md,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DotGlyphIcon glyph="WARN" size={9} color={VD.warning} />
          <div style={{ ...menudo, color: VD.warning, fontWeight: 600 }}>{t('gal.warn')}</div>
        </div>
        <BloquesRiesgoTienda riesgo={riesgo} />
      </div>

      {/* Botones al pie de página */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 16 }}>
        <BotonesAccionFicha
          esPagina={esPagina}
          puedeAgregarPagina={puedeAgregarPagina}
          onInstalarPagina={onInstalarPagina}
          onInstalarPerfil={onInstalarPerfil}
        />
        <button type="button" onClick={onCerrar} style={estiloBoton(VD, false)}>
          {t('ui.cancel')}
        </button>
      </div>
    </div>
  );
}
