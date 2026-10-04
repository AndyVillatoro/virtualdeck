import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import type { ButtonConfig } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';

interface PanelInspectorControlProps {
  controlMeta: {
    control: ControlSuperficie;
    indice: number;
    gesto?: 'izq' | 'pulsar' | 'der';
  } | null;
  boton?: ButtonConfig;
  disabled?: boolean;
  onEditar: () => void;
}

function obtenerNombreYTipoControl(
  meta: NonNullable<PanelInspectorControlProps['controlMeta']>,
  t: (key: string, params?: Record<string, string | number>) => string,
): { nombre: string; tipo: string } {
  if (meta.control === 'key') {
    return {
      nombre: t('disp.tecla', { n: meta.indice + 1 }),
      tipo: t('disp.tipo.tecla'),
    };
  }
  if (meta.control === 'button') {
    return {
      nombre: t('disp.boton', { n: meta.indice + 1 }),
      tipo: t('disp.tipo.boton'),
    };
  }
  let gestoStr = t('disp.pulsar');
  if (meta.gesto === 'izq') {
    gestoStr = t('disp.izq');
  } else if (meta.gesto === 'der') {
    gestoStr = t('disp.der');
  }
  return {
    nombre: `${t('disp.perilla', { n: meta.indice + 1 })} · ${gestoStr}`,
    tipo: t('disp.tipo.perilla'),
  };
}

function PanelVacio({
  vd,
  texto,
}: {
  vd: ReturnType<typeof useTheme>;
  texto: string;
}) {
  return (
    <aside
      style={{
        width: 290,
        background: vd.surface,
        borderLeft: `1px solid ${vd.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: vd.space.lg,
        textAlign: 'center',
        color: vd.textMuted,
        fontFamily: vd.mono,
        fontSize: 9.5,
        lineHeight: 1.6,
        flexShrink: 0,
      }}
    >
      <DotGlyphIcon glyph="DOTS" size={24} color={vd.textMuted} />
      <p style={{ marginTop: vd.space.sm }}>{texto}</p>
    </aside>
  );
}

function MiniPreview({
  boton,
  glifo,
  nombreControl,
  vd,
  vacioTexto,
}: {
  boton?: ButtonConfig;
  glifo: string | null;
  nombreControl: string;
  vd: ReturnType<typeof useTheme>;
  vacioTexto: string;
}) {
  const bg = boton?.bgColor || vd.bg;
  const fg = boton?.fgColor || vd.text;
  const label = boton?.label || vacioTexto;

  return (
    <div
      style={{
        background: vd.elevated,
        border: `1px solid ${vd.border}`,
        borderRadius: vd.radius.md,
        padding: vd.space.md,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: vd.space.sm,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          background: bg,
          border: `1.5px solid ${vd.accent}`,
          borderRadius: vd.radius.md,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          boxShadow: `0 0 10px ${vd.accentBg}`,
        }}
      >
        {glifo ? (
          <DotGlyphIcon glyph={glifo} size={18} color={fg} />
        ) : (
          <DotGlyphIcon glyph="KNOB" size={18} color={vd.accent} />
        )}
        <span
          style={{
            fontSize: 7.5,
            color: fg,
            fontFamily: vd.mono,
            maxWidth: 48,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
      <span style={{ fontSize: 8, color: vd.textMuted, fontFamily: vd.mono }}>
        {nombreControl}
      </span>
    </div>
  );
}

export function PanelInspectorControl({
  controlMeta,
  boton,
  disabled = false,
  onEditar,
}: PanelInspectorControlProps) {
  const VD = useTheme();
  const t = useT();

  if (!controlMeta) {
    return <PanelVacio vd={VD} texto={t('disp.inspector.ayuda')} />;
  }

  const { nombre, tipo } = obtenerNombreYTipoControl(controlMeta, t);
  const accionTexto = boton?.action?.type || boton?.label || t('disp.inspector.sinAccion');
  const glifo = resolveDotGlyph(boton?.icon);

  return (
    <aside
      style={{
        width: 290,
        background: VD.surface,
        borderLeft: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
      }}
    >
      <div
        style={{
          padding: VD.space.md,
          borderBottom: `1px solid ${VD.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          {t('disp.inspector.titulo')}
        </span>
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
          <div
            style={{
              fontSize: 10,
              color: boton?.action ? VD.text : VD.textMuted,
              fontFamily: VD.mono,
              background: VD.elevated,
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              padding: `${VD.space.xs}px ${VD.space.sm}px`,
              display: 'flex',
              alignItems: 'center',
              gap: VD.space.xs,
              wordBreak: 'break-word',
            }}
          >
            <DotGlyphIcon glyph={boton?.action ? 'CHECK' : 'DOTS'} size={10} color={boton?.action ? VD.success : VD.textMuted} />
            <span>{accionTexto}</span>
          </div>
        </div>

        {/* Botón para editar acción en EditorB */}
        <div style={{ marginTop: 'auto', paddingTop: VD.space.md, borderTop: `1px solid ${VD.border}` }}>
          <button
            type="button"
            disabled={disabled}
            onClick={onEditar}
            style={{
              width: '100%',
              background: VD.accent,
              border: `1px solid ${VD.accent}`,
              borderRadius: VD.radius.md,
              color: VD.bg,
              padding: `${VD.space.sm}px ${VD.space.md}px`,
              fontFamily: VD.mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1,
              cursor: disabled ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: VD.space.xs,
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <DotGlyphIcon glyph="EDIT" size={12} color={VD.bg} />
            <span>{t('disp.editar')}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
