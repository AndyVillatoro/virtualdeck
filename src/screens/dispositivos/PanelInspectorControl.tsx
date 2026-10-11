import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import { SelectorPresetsControl } from './SelectorPresetsControl';
import { PanelPerfilesPagina } from './PanelPerfilesPagina';
import { PanelVacio } from './PanelInspectorVacio';
import { MiniPreview } from './PreviaInspector';
import { BotonEditar, FilaAccion, SeccionModos } from './PiezasInspector';
import { ListaHermanosPerilla } from './ListaHermanosPerilla';
import { obtenerNombreYTipoControl, textoAccionSeleccionada } from './textoPanelInspector';
import type { PanelInspectorControlProps } from './tiposPanelInspector';

export type { HermanoPerilla, PanelInspectorControlProps } from './tiposPanelInspector';

export function PanelInspectorControl({
  controlMeta,
  boton,
  disabled = false,
  onEditar,
  onAplicarPreset,
  ancho,
  onCerrar,
  hermanosPerilla,
  onSelectHueco,
  perilla,
  modoActivo,
  onFijarModos,
}: PanelInspectorControlProps) {
  const VD = useTheme();
  const t = useT();
  const w = ancho ?? 290;

  if (!controlMeta) {
    if (onAplicarPreset) {
      return <PanelPerfilesPagina ancho={w} disabled={disabled} onAplicar={onAplicarPreset} onCerrar={onCerrar} />;
    }
    return <PanelVacio vd={VD} texto={t('disp.inspector.ayuda')} ancho={w} onCerrar={onCerrar} t={t} />;
  }

  const { nombre, tipo } = obtenerNombreYTipoControl(controlMeta, t);
  const glifo = resolveDotGlyph(boton?.icon);
  const textoAccion = textoAccionSeleccionada(controlMeta, boton, t);

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
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t('disp.inspector.titulo')}
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
          gap: VD.space.md,
        }}
      >
        <MiniPreview
          boton={boton}
          glifo={glifo}
          nombreControl={nombre}
          controlTipo={controlMeta.control}
          vd={VD}
          vacioTexto={t('disp.vacio')}
        />

        {/* Tipo de control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('disp.inspector.tipo')}
          </label>
          <div
            style={{
              fontSize: 10,
              color: VD.text,
              fontFamily: VD.mono,
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              padding: `${VD.space.xs}px ${VD.space.sm}px`,
            }}
          >
            {tipo}
          </div>
        </div>

        {/* Acción configurada */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
            {t('disp.inspector.accion')}
          </label>
          <FilaAccion
            boton={boton}
            vd={VD}
            textoAccion={textoAccion}
          />
        </div>

        {/* Perilla multimodo (T-HW-19): sus modos y cuál está activo. */}
        <SeccionModos
          controlMeta={controlMeta}
          perilla={perilla}
          modoActivo={modoActivo}
          disabled={disabled}
          onFijarModos={onFijarModos}
        />

        {/* Si el control es una perilla: los otros dos gestos hermanos */}
        {controlMeta.control === 'knob' && hermanosPerilla && hermanosPerilla.length > 0 && (
          <ListaHermanosPerilla
            hermanos={hermanosPerilla}
            onSelectHueco={onSelectHueco}
            vd={VD}
            t={t}
          />
        )}

        {/* Botón para editar acción en EditorB */}
        <div style={{ marginTop: onAplicarPreset ? 0 : 'auto', paddingTop: VD.space.md, borderTop: `1px solid ${VD.border}` }}>
          <BotonEditar
            disabled={disabled}
            onEditar={onEditar}
            vd={VD}
            texto={t('disp.editar')}
          />
        </div>

        {/* Selector de presets si viene la prop */}
        {onAplicarPreset && (
          <div style={{ paddingTop: VD.space.md, borderTop: `1px solid ${VD.border}` }}>
            <SelectorPresetsControl
              control={controlMeta.control}
              onAplicar={onAplicarPreset}
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </aside>
  );
}