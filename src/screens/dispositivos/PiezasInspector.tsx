import React from 'react';
import type { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { ModosPerilla } from './ModosPerilla';
import type { ButtonConfig, ModoPerilla } from '../../types';
import type { ControlMeta } from './tiposPanelInspector';

/** La acción configurada, con su glifo de «hecho» o de «vacío». */
export function FilaAccion({
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

/** El botón de pie que abre el editor en el hueco elegido. */
export function BotonEditar({
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

/** Los modos de una perilla multimodo (T-HW-19): solo si la hay y se pueden fijar. */
export function SeccionModos({
  controlMeta,
  perilla,
  modoActivo,
  disabled,
  onFijarModos,
}: {
  controlMeta: ControlMeta;
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