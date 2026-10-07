import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria } from '../../types';
import type { EstadoEntrada } from './tiendaUtils';
import { IconoTienda } from './IconoTienda';

export interface TarjetaTiendaProps {
  entrada: EntradaGaleria;
  estado: EstadoEntrada;
  versionInstalada?: string;
  onMirar: (e: EntradaGaleria) => void;
}

/**
 * Tarjeta compacta para la rejilla de la tienda (estilo Raycast / VS Code).
 * Muestra el icono DOT, portada recortada si existe, nombre, autor, descripción corta,
 * tipo y estado.
 */
export function TarjetaTienda({
  entrada,
  estado,
  versionInstalada,
  onMirar,
}: TarjetaTiendaProps) {
  const VD = useTheme();
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [portadaRota, setPortadaRota] = useState(false);

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

  const tienePortada = Boolean(entrada.portada && !portadaRota);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMirar(entrada)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onMirar(entrada);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: VD.elevated,
        border: `1px solid ${hovered ? VD.accent : VD.border}`,
        borderRadius: VD.radius.md,
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        outline: 'none',
        transition: 'border-color 0.12s, transform 0.12s',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
    >
      {tienePortada && (
        <div style={{ height: 68, width: '100%', overflow: 'hidden', borderBottom: `1px solid ${VD.border}` }}>
          <img
            src={entrada.portada}
            alt=""
            onError={() => setPortadaRota(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', flex: 1, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: VD.radius.sm,
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <IconoTienda icono={entrada.icono} kind={entrada.kind} size={20} color={VD.accent} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: VD.mono,
              fontSize: 10,
              fontWeight: 600,
              color: VD.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {entrada.label}
            </div>
            {entrada.author && (
              <div style={{
                fontFamily: VD.mono,
                fontSize: 8,
                color: VD.textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {entrada.author}
              </div>
            )}
          </div>
        </div>

        {entrada.description && (
          <div style={{
            fontFamily: VD.mono,
            fontSize: 8,
            color: VD.textDim,
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {entrada.description}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
          <span style={insignia}>
            {t(entrada.kind === 'page' ? 'gal.kind.page' : 'gal.kind.profile')}
          </span>
          {entrada.targetApp && <span style={insignia}>{entrada.targetApp}</span>}
          {estado === 'update' && (
            <span style={{ ...insignia, color: VD.warning, borderColor: VD.warning }}>
              {t('tienda.update', { version: entrada.version ?? '?' })}
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
      </div>
    </div>
  );
}
