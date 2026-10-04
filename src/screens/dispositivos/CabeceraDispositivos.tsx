import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';

interface CabeceraDispositivosProps {
  anchoVentana: number;
  listaAbierta: boolean;
  inspectorAbierto: boolean;
  onVolver: () => void;
  onToggleLista: () => void;
  onToggleInspector: () => void;
}

export function CabeceraDispositivos({
  anchoVentana,
  listaAbierta,
  inspectorAbierto,
  onVolver,
  onToggleLista,
  onToggleInspector,
}: CabeceraDispositivosProps) {
  const VD = useTheme();
  const t = useT();

  const estiloBotonToggle = (activo: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: activo ? `${VD.accent}22` : VD.elevated,
    border: `1px solid ${activo ? VD.accent : VD.border}`,
    color: activo ? VD.accent : VD.textDim,
    padding: '4px 8px',
    borderRadius: VD.radius.sm,
    fontFamily: VD.mono,
    fontSize: 9,
    letterSpacing: 1,
    cursor: 'pointer',
  });

  return (
    <header
      style={{
        height: 38,
        background: VD.surface,
        borderBottom: `1px solid ${VD.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${VD.space.md}px`,
        flexShrink: 0,
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.sm }}>
        <button
          type="button"
          onClick={onVolver}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: VD.space.xs,
            background: VD.elevated,
            border: `1px solid ${VD.border}`,
            color: VD.text,
            padding: '4px 8px',
            borderRadius: VD.radius.sm,
            fontFamily: VD.mono,
            fontSize: 10,
            letterSpacing: 1,
            cursor: 'pointer',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <DotGlyphIcon glyph="ARROW_LEFT" size={10} color={VD.text} />
          <span>{t('disp.volver')}</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: VD.space.xs,
            fontSize: 9.5,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            userSelect: 'none',
          }}
        >
          {anchoVentana > 480 && (
            <>
              <span style={{ color: VD.textMuted }}>{t('disp.breadcrumb.config')}</span>
              <span style={{ color: VD.textMuted, fontSize: 8 }}>/</span>
            </>
          )}
          <span style={{ color: VD.text, fontWeight: 600 }}>{t('disp.titulo')}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: VD.space.xs, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          type="button"
          onClick={onToggleLista}
          title={t('disp.panel.dispositivos')}
          style={estiloBotonToggle(listaAbierta)}
        >
          <DotGlyphIcon glyph="USB_PLUG" size={10} color={listaAbierta ? VD.accent : VD.textDim} />
          {anchoVentana > 520 && <span>{t('disp.panel.dispositivos')}</span>}
        </button>

        <button
          type="button"
          onClick={onToggleInspector}
          title={t('disp.panel.inspector')}
          style={estiloBotonToggle(inspectorAbierto)}
        >
          <DotGlyphIcon glyph="EDIT" size={10} color={inspectorAbierto ? VD.accent : VD.textDim} />
          {anchoVentana > 520 && <span>{t('disp.panel.inspector')}</span>}
        </button>
      </div>
    </header>
  );
}
