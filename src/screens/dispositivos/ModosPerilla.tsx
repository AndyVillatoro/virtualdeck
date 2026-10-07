import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { ButtonConfig, ModoPerilla } from '../../types';
import { PRESETS_PERILLA, type PresetDock } from '../../data/presetsDock';
import { describirAccion } from './describirAccion';

export interface ModosPerillaProps {
  /** Modos 1..n del botón «pulsar» (el modo 0 son sus huecos izq/der). */
  modos: ModoPerilla[];
  /** Modo activo en memoria, o `null` si no es una perilla multimodo. */
  modoActivo: number | null;
  botonIzq?: ButtonConfig;
  botonDer?: ButtonConfig;
  disabled?: boolean;
  /** La lista entera tras añadir/quitar/reordenar (un paso de deshacer). */
  onCambiar: (modos: ModoPerilla[]) => void;
}

/** Un modo desde un preset de perilla: huecos[0] = izq, huecos[2] = der. */
function modoDePreset(preset: PresetDock, etiqueta: string): ModoPerilla | null {
  const izq = preset.huecos[0];
  const der = preset.huecos[2];
  if (!izq || !der) return null;
  return { label: etiqueta, icon: preset.icon, izq: izq.action, der: der.action };
}

function FilaModo({
  titulo,
  detalle,
  activo,
  vd,
  t,
  puedeSubir,
  puedeBajar,
  disabled,
  onSubir,
  onBajar,
  onQuitar,
}: {
  titulo: string;
  detalle: string;
  activo: boolean;
  vd: ReturnType<typeof useTheme>;
  t: (k: string) => string;
  puedeSubir: boolean;
  puedeBajar: boolean;
  disabled: boolean;
  onSubir?: () => void;
  onBajar?: () => void;
  onQuitar?: () => void;
}) {
  const botones: Array<{ glyph: string; titulo: string; fn?: () => void; puede: boolean }> = [];
  if (onSubir) botones.push({ glyph: 'ARROW_UP', titulo: t('disp.modos.subir'), fn: onSubir, puede: puedeSubir });
  if (onBajar) botones.push({ glyph: 'ARROW_DOWN', titulo: t('disp.modos.bajar'), fn: onBajar, puede: puedeBajar });
  if (onQuitar) botones.push({ glyph: 'CLOSE', titulo: t('disp.modos.quitar'), fn: onQuitar, puede: true });
  return (
    <div
      style={{
        background: activo ? vd.accentBg : vd.elevated,
        border: `1px solid ${activo ? vd.accent : vd.border}`,
        borderRadius: vd.radius.sm,
        padding: `${vd.space.xs}px ${vd.space.sm}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: vd.space.xs, minWidth: 0 }}>
        <span
          title={titulo}
          style={{
            fontSize: 9,
            color: activo ? vd.accent : vd.text,
            fontFamily: vd.mono,
            fontWeight: 600,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {titulo}
        </span>
        {activo && (
          <span
            style={{
              fontSize: 7.5,
              color: vd.accent,
              fontFamily: vd.mono,
              letterSpacing: 1,
              flexShrink: 0,
            }}
          >
            {t('disp.modos.activo')}
          </span>
        )}
        {botones.map((b) => (
          <button
            key={b.glyph}
            type="button"
            disabled={disabled || !b.puede}
            onClick={b.fn}
            title={b.titulo}
            style={{
              background: 'none',
              border: 'none',
              cursor: disabled || !b.puede ? 'default' : 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              opacity: disabled || !b.puede ? 0.3 : 1,
            }}
          >
            <DotGlyphIcon glyph={b.glyph} size={9} color={vd.textMuted} />
          </button>
        ))}
      </div>
      <span
        title={detalle}
        style={{
          fontSize: 8,
          color: vd.textMuted,
          fontFamily: vd.mono,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {detalle}
      </span>
    </div>
  );
}

export function ModosPerilla({
  modos,
  modoActivo,
  botonIzq,
  botonDer,
  disabled = false,
  onCambiar,
}: ModosPerillaProps) {
  const VD = useTheme();
  const t = useT();
  const [presetElegido, setPresetElegido] = useState<string>(PRESETS_PERILLA[0]?.id ?? '');

  const quitar = (i: number) => onCambiar(modos.filter((_, k) => k !== i));
  const mover = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= modos.length) return;
    const copia = [...modos];
    const tmp = copia[i];
    const otro = copia[j];
    if (tmp === undefined || otro === undefined) return;
    copia[i] = otro;
    copia[j] = tmp;
    onCambiar(copia);
  };
  const anadir = () => {
    const preset = PRESETS_PERILLA.find((p) => p.id === presetElegido) ?? PRESETS_PERILLA[0];
    if (!preset) return;
    const modo = modoDePreset(preset, t(preset.nombre));
    if (!modo) return;
    onCambiar([...modos, modo]);
  };

  const detalleCero = `${describirAccion(botonIzq?.action, t)} / ${describirAccion(botonDer?.action, t)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, textTransform: 'uppercase', letterSpacing: 1 }}>
        {t('disp.modos.titulo')}
      </label>
      <FilaModo
        titulo={t('disp.modos.modo', { i: 0 })}
        detalle={detalleCero}
        activo={modoActivo === 0}
        vd={VD}
        t={t}
        puedeSubir={false}
        puedeBajar={false}
        disabled={disabled}
      />
      {modos.length === 0 && (
        <div style={{ fontSize: 8.5, color: VD.textMuted, fontFamily: VD.mono, lineHeight: 1.5 }}>
          {t('disp.modos.vacio')}
        </div>
      )}
      {modos.map((m, i) => (
        <FilaModo
          key={`${m.label}-${i}`}
          titulo={`${t('disp.modos.modo', { i: i + 1 })} · ${m.label}`}
          detalle={`${describirAccion(m.izq, t)} / ${describirAccion(m.der, t)}`}
          activo={modoActivo === i + 1}
          vd={VD}
          t={t}
          puedeSubir={i > 0}
          puedeBajar={i < modos.length - 1}
          disabled={disabled}
          onSubir={() => mover(i, -1)}
          onBajar={() => mover(i, 1)}
          onQuitar={() => quitar(i)}
        />
      ))}
      <div style={{ display: 'flex', gap: VD.space.xs }}>
        <select
          value={presetElegido}
          disabled={disabled}
          onChange={(e) => setPresetElegido(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            background: VD.elevated,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            color: VD.text,
            fontFamily: VD.mono,
            fontSize: 9,
            padding: `${VD.space.xs}px ${VD.space.sm}px`,
            outline: 'none',
          }}
        >
          {PRESETS_PERILLA.map((p) => (
            <option key={p.id} value={p.id}>
              {t(p.nombre)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled}
          onClick={anadir}
          style={{
            background: VD.elevated,
            border: `1px solid ${VD.accent}`,
            borderRadius: VD.radius.sm,
            color: VD.accent,
            padding: `${VD.space.xs}px ${VD.space.sm}px`,
            fontFamily: VD.mono,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.5,
            cursor: disabled ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <DotGlyphIcon glyph="ADD" size={9} color={VD.accent} />
          <span>{t('disp.modos.anadir')}</span>
        </button>
      </div>
    </div>
  );
}
