import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import { PERFILES_DOCK, type PerfilDock } from '../../data/perfilesDock';

export interface PanelPerfilesPaginaProps {
  ancho?: number;
  disabled?: boolean;
  /** Aplica el perfil a todos los botones de la página (un solo deshacer). */
  onAplicar: (perfil: PerfilDock) => void;
  onCerrar?: () => void;
}

/**
 * Vista de la página en el inspector (sin control elegido): los perfiles
 * completos del dock (roadmap 62). Elegir uno pide confirmación, porque
 * sustituye todos los botones de la página.
 */
export function PanelPerfilesPagina({ ancho, disabled = false, onAplicar, onCerrar }: PanelPerfilesPaginaProps) {
  const VD = useTheme();
  const t = useT();
  const [pendiente, setPendiente] = useState<PerfilDock | null>(null);
  const w = ancho ?? 290;

  const confirmar = () => {
    if (pendiente) onAplicar(pendiente);
    setPendiente(null);
  };

  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        background: VD.surface,
        borderLeft: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: VD.space.md,
          borderBottom: `1px solid ${VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: VD.space.xs,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: VD.textMuted,
            letterSpacing: 1.5,
            fontFamily: VD.mono,
            textTransform: 'uppercase',
          }}
        >
          {t('disp.perfiles.titulo')}
        </span>
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            title={t('disp.cerrar')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              color: VD.textMuted,
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={10} color={VD.textMuted} />
          </button>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: VD.space.lg,
          display: 'flex',
          flexDirection: 'column',
          gap: VD.space.sm,
        }}
      >
        <p style={{ fontSize: 9.5, color: VD.textMuted, fontFamily: VD.mono, lineHeight: 1.5 }}>
          {t('disp.perfiles.desc')}
        </p>

        {PERFILES_DOCK.map((perfil) => {
          const activo = pendiente?.id === perfil.id;
          return (
            <button
              key={perfil.id}
              type="button"
              disabled={disabled}
              onClick={() => setPendiente(perfil)}
              style={{
                width: '100%',
                background: activo ? VD.elevatedHover : VD.elevated,
                border: `1px solid ${activo ? VD.accent : VD.border}`,
                borderRadius: VD.radius.sm,
                padding: `${VD.space.sm}px`,
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: VD.space.xs,
                textAlign: 'left',
                opacity: disabled ? 0.5 : 1,
                outline: 'none',
                fontFamily: VD.mono,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: VD.space.xs }}>
                <DotGlyphIcon glyph={resolveDotGlyph(perfil.icon) || 'DOTS'} size={12} color={VD.accent} />
                <span style={{ fontSize: 9.5, color: VD.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t(perfil.nombre)}
                </span>
              </span>
              <span style={{ fontSize: 8, color: VD.textMuted, lineHeight: 1.4 }}>
                {t(perfil.descripcion)}
              </span>
            </button>
          );
        })}

        {pendiente && (
          <div
            style={{
              marginTop: VD.space.sm,
              paddingTop: VD.space.md,
              borderTop: `1px solid ${VD.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: VD.space.sm,
              fontFamily: VD.mono,
            }}
          >
            <span style={{ fontSize: 9, color: VD.text, lineHeight: 1.5 }}>
              {t('disp.perfiles.aviso', { nombre: t(pendiente.nombre) })}
            </span>
            <div style={{ display: 'flex', gap: VD.space.xs }}>
              <button
                type="button"
                onClick={() => setPendiente(null)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: `1px solid ${VD.border}`,
                  borderRadius: VD.radius.md,
                  color: VD.textMuted,
                  padding: `${VD.space.sm}px`,
                  fontFamily: VD.mono,
                  fontSize: 9.5,
                  cursor: 'pointer',
                }}
              >
                {t('disp.perfiles.cancelar')}
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={disabled}
                style={{
                  flex: 1,
                  background: VD.accent,
                  border: `1px solid ${VD.accent}`,
                  borderRadius: VD.radius.md,
                  color: VD.bg,
                  padding: `${VD.space.sm}px`,
                  fontFamily: VD.mono,
                  fontSize: 9.5,
                  fontWeight: 600,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {t('disp.perfiles.confirmar')}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
