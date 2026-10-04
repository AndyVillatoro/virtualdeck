import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import type { ButtonConfig } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';
import type { PresetHueco } from '../../data/presetsDock';
import { SelectorPresetsControl } from './SelectorPresetsControl';
import { describirAccion } from './describirAccion';

export interface HermanoPerilla {
  gesto: 'izq' | 'pulsar' | 'der';
  hueco: number;
  boton?: ButtonConfig;
}

export interface PanelInspectorControlProps {
  controlMeta: {
    control: ControlSuperficie;
    indice: number;
    gesto?: 'izq' | 'pulsar' | 'der';
  } | null;
  boton?: ButtonConfig;
  disabled?: boolean;
  onEditar: () => void;
  onAplicarPreset?: (huecos: PresetHueco[]) => void;
  ancho?: number;
  onCerrar?: () => void;
  hermanosPerilla?: HermanoPerilla[];
  onSelectHueco?: (hueco: number) => void;
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
  if (meta.control === 'swipe') {
    const gestoStr = meta.gesto === 'der' ? t('disp.der') : t('disp.izq');
    return {
      nombre: `${t('disp.tira', { n: meta.indice + 1 })} · ${gestoStr}`,
      tipo: t('disp.tipo.tira'),
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
  ancho,
  onCerrar,
  t,
}: {
  vd: ReturnType<typeof useTheme>;
  texto: string;
  ancho?: number;
  onCerrar?: () => void;
  t: (key: string) => string;
}) {
  const w = ancho ?? 290;
  return (
    <aside
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          title={t('disp.cerrar')}
          style={{
            position: 'absolute',
            top: vd.space.md,
            right: vd.space.md,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            color: vd.textMuted,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <DotGlyphIcon glyph="CLOSE" size={10} color={vd.textMuted} />
        </button>
      )}
      <DotGlyphIcon glyph="DOTS" size={24} color={vd.textMuted} />
      <p style={{ marginTop: vd.space.sm, maxWidth: '100%', wordBreak: 'break-word' }}>{texto}</p>
    </aside>
  );
}

function iconoFallback(tipo?: ControlSuperficie): string {
  if (tipo === 'knob') return 'KNOB';
  if (tipo === 'swipe') return 'SWIPE';
  if (tipo === 'button') return 'DOTS';
  return 'ADD';
}

function MiniPreview({
  boton,
  glifo,
  nombreControl,
  controlTipo,
  vd,
  vacioTexto,
}: {
  boton?: ButtonConfig;
  glifo: string | null;
  nombreControl: string;
  controlTipo?: ControlSuperficie;
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
          <DotGlyphIcon glyph={iconoFallback(controlTipo)} size={18} color={vd.accent} />
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

function etiquetaGestoPerilla(gesto: 'izq' | 'pulsar' | 'der', t: (k: string) => string): string {
  if (gesto === 'izq') return t('disp.gesto.giroIzq');
  if (gesto === 'der') return t('disp.gesto.giroDer');
  return t('disp.gesto.pulsar');
}

function FilaAccion({
  boton,
  vd,
  textoAccion,
}: {
  boton?: ButtonConfig;
  vd: ReturnType<typeof useTheme>;
  textoAccion: string;
}) {
  const tieneAccion = Boolean(boton?.action && boton.action.type !== 'none');

  return (
    <div
      style={{
        fontSize: 10,
        color: tieneAccion ? vd.text : vd.textMuted,
        fontFamily: vd.mono,
        textTransform: 'uppercase',
        background: vd.elevated,
        border: `1px solid ${vd.border}`,
        borderRadius: vd.radius.sm,
        padding: `${vd.space.xs}px ${vd.space.sm}px`,
        display: 'flex',
        alignItems: 'center',
        gap: vd.space.xs,
        wordBreak: 'break-word',
      }}
    >
      <DotGlyphIcon
        glyph={tieneAccion ? 'CHECK' : 'DOTS'}
        size={10}
        color={tieneAccion ? vd.success : vd.textMuted}
      />
      <span>{textoAccion}</span>
    </div>
  );
}

function BotonEditar({
  disabled,
  onEditar,
  vd,
  texto,
}: {
  disabled: boolean;
  onEditar: () => void;
  vd: ReturnType<typeof useTheme>;
  texto: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onEditar}
      style={{
        width: '100%',
        background: vd.accent,
        border: `1px solid ${vd.accent}`,
        borderRadius: vd.radius.md,
        color: vd.bg,
        padding: `${vd.space.sm}px ${vd.space.md}px`,
        fontFamily: vd.mono,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vd.space.xs,
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <DotGlyphIcon glyph="EDIT" size={12} color={vd.bg} />
      <span>{texto}</span>
    </button>
  );
}

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
}: PanelInspectorControlProps) {
  const VD = useTheme();
  const t = useT();
  const w = ancho ?? 290;

  if (!controlMeta) {
    return <PanelVacio vd={VD} texto={t('disp.inspector.ayuda')} ancho={w} onCerrar={onCerrar} t={t} />;
  }

  const { nombre, tipo } = obtenerNombreYTipoControl(controlMeta, t);
  const glifo = resolveDotGlyph(boton?.icon);

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
            textoAccion={describirAccion(boton?.action, t)}
          />
        </div>

        {/* Si el control es una perilla: los otros dos gestos hermanos */}
        {controlMeta.control === 'knob' && hermanosPerilla && hermanosPerilla.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('disp.inspector.otrosGestos')}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.xs }}>
              {hermanosPerilla.map((h) => {
                const desc = describirAccion(h.boton?.action, t);
                const etiqueta = etiquetaGestoPerilla(h.gesto, t);
                const tieneAccion = Boolean(h.boton?.action && h.boton.action.type !== 'none');
                return (
                  <button
                    key={h.gesto}
                    type="button"
                    onClick={() => onSelectHueco?.(h.hueco)}
                    title={desc}
                    style={{
                      width: '100%',
                      background: VD.elevated,
                      border: `1px solid ${VD.border}`,
                      borderRadius: VD.radius.sm,
                      padding: `${VD.space.xs}px ${VD.space.sm}px`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: VD.space.xs,
                      textAlign: 'left',
                      cursor: onSelectHueco ? 'pointer' : 'default',
                      fontFamily: VD.mono,
                      fontSize: 9,
                      outline: 'none',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}
                  >
                    <DotGlyphIcon
                      glyph={tieneAccion ? 'CHECK' : 'DOTS'}
                      size={10}
                      color={tieneAccion ? VD.success : VD.textMuted}
                    />
                    <span style={{ color: VD.textMuted, flexShrink: 0, fontWeight: 600 }}>
                      {etiqueta} ·
                    </span>
                    <span
                      style={{
                        color: tieneAccion ? VD.text : VD.textMuted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
