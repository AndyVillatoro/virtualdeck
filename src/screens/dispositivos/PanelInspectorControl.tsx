import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { resolveDotGlyph } from '../../components/dot480/resolveDotGlyph';
import type { ButtonConfig, ModoPerilla } from '../../types';
import type { ControlSuperficie } from '../../types/superficies';
import type { PresetHueco } from '../../data/presetsDock';
import type { PerfilDock } from '../../data/perfilesDock';
import { SelectorPresetsControl } from './SelectorPresetsControl';
import { PanelPerfilesPagina } from './PanelPerfilesPagina';
import { ModosPerilla } from './ModosPerilla';
import { describirAccion, describirPulsar } from './describirAccion';

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
  /** Con un control elegido, sus huecos (preset de control). Sin control, un perfil de página (roadmap 62). */
  onAplicarPreset?: (entrada: PresetHueco[] | PerfilDock) => void;
  ancho?: number;
  onCerrar?: () => void;
  hermanosPerilla?: HermanoPerilla[];
  onSelectHueco?: (hueco: number) => void;
  /** Los tres botones de la perilla elegida (T-HW-19), si lo es. */
  perilla?: { izq?: ButtonConfig; pulsar?: ButtonConfig; der?: ButtonConfig } | null;
  /** Modo activo en memoria, para enseñarlo en el inspector. */
  modoActivo?: number | null;
  onFijarModos?: (modos: ModoPerilla[]) => void;
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
        ) : boton?.iconoPuntos ? (
          <IconoPuntos bits={boton.iconoPuntos.bits} size={18} color={fg} />
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

/** Lo guardado que el aparato no va a ejecutar, dicho en avisos cortos. */
function avisosDelBoton(
  controlMeta: NonNullable<PanelInspectorControlProps['controlMeta']>,
  boton: ButtonConfig | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  const avisos: string[] = [];
  if (boton?.subButtons?.length === 4) avisos.push(t('ed.inspector.cuadrantes'));
  const pasos = boton?.actions?.length ?? 0;
  if (pasos > 1) avisos.push(t('ed.inspector.secuencia', { n: pasos }));
  // Mantener pulsado solo corre en teclas y botones (despachoTecla).
  const esperaLarga = controlMeta.control === 'key' || controlMeta.control === 'button';
  if (esperaLarga && boton?.longPressAction && boton.longPressAction.type !== 'none') {
    avisos.push(t('ed.inspector.mantener', { desc: describirAccion(boton.longPressAction, t) }));
  }
  return avisos;
}

/**
 * Lo que hace el hueco elegido (T-HW-19).
 *
 * Con modos, pulsar cambia de modo en vez de ejecutar su acción: se dice eso
 * («PULSAR · CAMBIAR MODO (n)») y no la acción que no va a correr. Además se
 * avisa de lo que el aparato no ejecuta aunque esté guardado: cuadrantes 2×2,
 * una secuencia, mantener pulsado o la mitad de apagado de un interruptor.
 */
function textoAccionSeleccionada(
  controlMeta: NonNullable<PanelInspectorControlProps['controlMeta']>,
  boton: ButtonConfig | undefined,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const multimodo = controlMeta.control === 'knob'
    && controlMeta.gesto === 'pulsar'
    && (boton?.modosPerilla?.length ?? 0) > 0;
  const base = multimodo
    ? describirPulsar(boton, t)
    : describirAccion(boton?.action, t, boton?.isToggle ? boton.actionToggleOff : undefined);
  const avisos = avisosDelBoton(controlMeta, boton, t);
  return avisos.length > 0 ? `${base} · ${avisos.join(' · ')}` : base;
}

function SeccionModos({
  controlMeta,
  perilla,
  modoActivo,
  disabled,
  onFijarModos,
}: {
  controlMeta: NonNullable<PanelInspectorControlProps['controlMeta']>;
  perilla?: { izq?: ButtonConfig; pulsar?: ButtonConfig; der?: ButtonConfig } | null;
  modoActivo?: number | null;
  disabled: boolean;
  onFijarModos?: (modos: ModoPerilla[]) => void;
}) {
  if (controlMeta.control !== 'knob' || !perilla?.pulsar || !onFijarModos) return null;
  return (
    <ModosPerilla
      modos={perilla.pulsar.modosPerilla ?? []}
      modoActivo={modoActivo ?? null}
      botonIzq={perilla.izq}
      botonDer={perilla.der}
      disabled={disabled}
      onCambiar={onFijarModos}
    />
  );
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('disp.inspector.otrosGestos')}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: VD.space.xs }}>
              {hermanosPerilla.map((h) => {
                const desc = h.gesto === 'pulsar'
                  ? describirPulsar(h.boton, t)
                  : describirAccion(h.boton?.action, t);
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
