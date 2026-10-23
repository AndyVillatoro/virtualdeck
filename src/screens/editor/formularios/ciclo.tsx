import React, { useState, lazy, Suspense } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText } from '../../../utils/i18n';
import { Field, BranchActionRow, estiloEntrada } from '../campos/comunes';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../../components/dot480/IconoPuntos';
import { BotonIcono } from '../../../components/ui/BotonIcono';
import { SelectorColor } from '../../../components/ui/SelectorColor';
import type { IconoElegido } from '../datos/constantesCatalogo';
import type { CycleStep, ButtonAction } from '../../../types';
import type { PropsFormulario } from './base';

const SelectorIconosDot = lazy(() =>
  import('../campos/SelectorIconosDot').then((m) => ({ default: m.SelectorIconosDot }))
);

/**
 * Editor del ciclo genérico de presets (T-CYC-01, pulido en T-CYC-02).
 *
 * Cada paso lleva label, sublabel, icono/colores propios y una sub-acción
 * elegida con el mismo componente compacto que usan las ramas (`BranchActionRow`).
 */

const PASO_VACIO = (): CycleStep => ({
  id: crypto.randomUUID(),
  label: '',
  sublabel: '',
  icon: 'SPARKLE',
  action: { type: 'none' },
});

function estiloFila(VD: ReturnType<typeof useTheme>) {
  return {
    background: VD.elevated,
    border: `1px solid ${VD.border}`,
    borderRadius: VD.radius.md,
    padding: 10,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  };
}

function estiloAyuda(VD: ReturnType<typeof useTheme>) {
  return {
    fontFamily: VD.mono,
    fontSize: 9,
    color: VD.textMuted,
    marginTop: 4,
    lineHeight: 1.4,
  } as const;
}

function obtenerEtiquetaIcono(paso: CycleStep, fallback: string): string {
  if (paso.iconoPuntos) {
    const segmentos = paso.iconoPuntos.origen.split(':');
    return segmentos[segmentos.length - 1].toUpperCase();
  }
  if (paso.icon) {
    return paso.icon.toUpperCase();
  }
  return fallback;
}

function IconoVisualPaso({ paso, colorFg }: { paso: CycleStep; colorFg: string }) {
  const VD = useTheme();
  if (paso.iconoPuntos) {
    return <IconoPuntos bits={paso.iconoPuntos.bits} size={14} color={colorFg} />;
  }
  if (paso.icon) {
    return <DotGlyphIcon glyph={paso.icon} size={14} color={colorFg} />;
  }
  return <DotGlyphIcon glyph="GRID" size={10} color={VD.textDim} />;
}

function CabeceraPaso({
  index: i,
  total,
  onSubir,
  onBajar,
  onEliminar,
}: {
  index: number;
  total: number;
  onSubir: (i: number) => void;
  onBajar: (i: number) => void;
  onEliminar: (i: number) => void;
}) {
  const VD = useTheme();
  const t = useT();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
      <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim }}>
        {t('ed.cycle.pasoN', { n: i + 1 })}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <BotonIcono
          glifo="ARROW_UP"
          title={t('ed.cycle.subir')}
          onClick={() => onSubir(i)}
          disabled={i === 0}
          conMarco
          tamano={24}
          tamanoGlifo={8}
        />
        <BotonIcono
          glifo="ARROW_DOWN"
          title={t('ed.cycle.bajar')}
          onClick={() => onBajar(i)}
          disabled={i >= total - 1}
          conMarco
          tamano={24}
          tamanoGlifo={8}
        />
        <BotonIcono
          glifo="TRASH"
          title={t('ed.cycle.eliminar')}
          onClick={() => onEliminar(i)}
          peligro
          conMarco
          tamano={24}
          tamanoGlifo={8}
        />
      </div>
    </div>
  );
}

function BotonMuestraColor({
  tipo,
  color,
  activo,
  accent,
  onClick,
}: {
  tipo: 'bgColor' | 'fgColor';
  color: string;
  activo: boolean;
  accent: string;
  onClick: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const titulo = tipo === 'bgColor' ? t('ed.cycle.colorFondo') : t('ed.cycle.colorTexto');
  const etiqueta = tipo === 'bgColor' ? 'BG' : 'FG';

  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        background: activo ? VD.accentBg : VD.surface,
        border: `1px solid ${activo ? accent : VD.border}`,
        borderRadius: VD.radius.sm,
        cursor: 'pointer',
        color: VD.text,
        height: 28,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: VD.radius.sm,
          background: color,
          border: `1px solid ${VD.borderStrong}`,
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim }}>{etiqueta}</span>
      <span style={{ fontFamily: VD.mono, fontSize: 9 }}>{color.toUpperCase()}</span>
    </button>
  );
}

function PanelColorPaso({
  paso,
  campo,
  onCerrar,
  onCambiar,
}: {
  paso: CycleStep;
  campo: 'bgColor' | 'fgColor';
  onCerrar: () => void;
  onCambiar: (hex: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const valorActual = campo === 'bgColor' ? (paso.bgColor ?? VD.surface) : (paso.fgColor ?? VD.text);

  return (
    <div
      style={{
        background: VD.surface,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.sm,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, letterSpacing: 0.8 }}>
          {campo === 'bgColor' ? t('ed.cycle.colorFondo') : t('ed.cycle.colorTexto')}
        </span>
        <BotonIcono
          glifo="CLOSE"
          title={t('ed.cycle.cerrar')}
          onClick={onCerrar}
          tamano={20}
          tamanoGlifo={8}
        />
      </div>
      <SelectorColor
        value={valorActual}
        onChange={onCambiar}
        compacto
        height={80}
      />
    </div>
  );
}

interface FilaPasoCicloProps {
  paso: CycleStep;
  index: number;
  totalPasos: number;
  accent: string;
  colorActivo: { pasoIndex: number; campo: 'bgColor' | 'fgColor' } | null;
  onSubir: (i: number) => void;
  onBajar: (i: number) => void;
  onEliminar: (i: number) => void;
  onCambiarPaso: (i: number, paso: CycleStep) => void;
  onAbrirCatalogo: (i: number) => void;
  onToggleColor: (i: number, campo: 'bgColor' | 'fgColor') => void;
  onCerrarColor: () => void;
}

function FilaPasoCiclo({
  paso,
  index: i,
  totalPasos,
  accent,
  colorActivo,
  onSubir,
  onBajar,
  onEliminar,
  onCambiarPaso,
  onAbrirCatalogo,
  onToggleColor,
  onCerrarColor,
}: FilaPasoCicloProps) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const inputStyle = estiloEntrada(VD);

  const etiquetaIcono = obtenerEtiquetaIcono(paso, t('ed.cycle.sinIcono'));
  const tieneIcono = Boolean(paso.icon || paso.iconoPuntos);
  const colorBg = paso.bgColor ?? VD.surface;
  const colorFg = paso.fgColor ?? VD.text;
  const editandoEsteColor = colorActivo?.pasoIndex === i;

  return (
    <div style={estiloFila(VD)}>
      <CabeceraPaso
        index={i}
        total={totalPasos}
        onSubir={onSubir}
        onBajar={onBajar}
        onEliminar={onEliminar}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          value={paso.label ?? ''}
          onChange={(e) => onCambiarPaso(i, { ...paso, label: e.target.value })}
          placeholder={tf('ETIQUETA')}
          style={{ ...inputStyle, fontSize: 11 }}
        />
        <input
          value={paso.sublabel ?? ''}
          onChange={(e) => onCambiarPaso(i, { ...paso, sublabel: e.target.value })}
          placeholder={tf('SUB-ETIQUETA')}
          style={{ ...inputStyle, fontSize: 11 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onAbrirCatalogo(i)}
          title={t('ed.cycle.elegirIcono')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            background: VD.surface,
            border: `1px solid ${VD.border}`,
            borderRadius: VD.radius.sm,
            cursor: 'pointer',
            color: VD.text,
            height: 28,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: colorBg,
              borderRadius: VD.radius.sm,
              flexShrink: 0,
            }}
          >
            <IconoVisualPaso paso={paso} colorFg={colorFg} />
          </div>
          <span
            style={{
              fontFamily: VD.mono,
              fontSize: 10,
              maxWidth: 110,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {etiquetaIcono}
          </span>
        </button>

        {tieneIcono && (
          <BotonIcono
            glifo="CLOSE"
            title={t('ed.cycle.quitarIcono')}
            onClick={() => onCambiarPaso(i, { ...paso, icon: undefined, iconoPuntos: undefined })}
            tamano={24}
            tamanoGlifo={8}
          />
        )}

        <BotonMuestraColor
          tipo="bgColor"
          color={colorBg}
          activo={editandoEsteColor && colorActivo?.campo === 'bgColor'}
          accent={accent}
          onClick={() => onToggleColor(i, 'bgColor')}
        />

        <BotonMuestraColor
          tipo="fgColor"
          color={colorFg}
          activo={editandoEsteColor && colorActivo?.campo === 'fgColor'}
          accent={accent}
          onClick={() => onToggleColor(i, 'fgColor')}
        />
      </div>

      {editandoEsteColor && colorActivo && (
        <PanelColorPaso
          paso={paso}
          campo={colorActivo.campo}
          onCerrar={onCerrarColor}
          onCambiar={(hex) => onCambiarPaso(i, { ...paso, [colorActivo.campo]: hex })}
        />
      )}

      <Field label={tf('ACCIÓN DEL PASO')}>
        <BranchActionRow
          action={paso.action}
          onChange={(a: ButtonAction) => onCambiarPaso(i, { ...paso, action: a })}
          accent={accent}
          excluir={['cycle']}
        />
      </Field>
    </div>
  );
}

export function FormCycle(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const { accent, action, setAction } = p;
  const pasos = action.cycleSteps ?? [];

  const [catalogoPasoIndex, setCatalogoPasoIndex] = useState<number | null>(null);
  const [colorActivo, setColorActivo] = useState<{ pasoIndex: number; campo: 'bgColor' | 'fgColor' } | null>(null);

  const actualizar = (next: CycleStep[]) => {
    setAction((a) => ({ ...a, cycleSteps: next }));
  };

  const cambiarPaso = (i: number, paso: CycleStep) => {
    const next = [...pasos];
    next[i] = paso;
    actualizar(next);
  };

  const subir = (i: number) => {
    if (i === 0) return;
    const next = [...pasos];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    if (colorActivo?.pasoIndex === i) {
      setColorActivo({ ...colorActivo, pasoIndex: i - 1 });
    } else if (colorActivo?.pasoIndex === i - 1) {
      setColorActivo({ ...colorActivo, pasoIndex: i });
    }
    actualizar(next);
  };

  const bajar = (i: number) => {
    if (i >= pasos.length - 1) return;
    const next = [...pasos];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    if (colorActivo?.pasoIndex === i) {
      setColorActivo({ ...colorActivo, pasoIndex: i + 1 });
    } else if (colorActivo?.pasoIndex === i + 1) {
      setColorActivo({ ...colorActivo, pasoIndex: i });
    }
    actualizar(next);
  };

  const eliminar = (i: number) => {
    const next = [...pasos];
    next.splice(i, 1);
    if (colorActivo?.pasoIndex === i) {
      setColorActivo(null);
    } else if (colorActivo && colorActivo.pasoIndex > i) {
      setColorActivo({ ...colorActivo, pasoIndex: colorActivo.pasoIndex - 1 });
    }
    if (catalogoPasoIndex === i) {
      setCatalogoPasoIndex(null);
    } else if (catalogoPasoIndex !== null && catalogoPasoIndex > i) {
      setCatalogoPasoIndex(catalogoPasoIndex - 1);
    }
    actualizar(next);
  };

  const toggleColor = (pasoIndex: number, campo: 'bgColor' | 'fgColor') => {
    setColorActivo((prev) => {
      if (prev?.pasoIndex === pasoIndex && prev.campo === campo) {
        return null;
      }
      return { pasoIndex, campo };
    });
  };

  const alElegirIcono = (icono: IconoElegido) => {
    if (catalogoPasoIndex === null) return;
    const pasoActual = pasos[catalogoPasoIndex];
    if (!pasoActual) return;
    if (icono.tipo === 'glifo') {
      cambiarPaso(catalogoPasoIndex, {
        ...pasoActual,
        icon: icono.icon,
        iconoPuntos: undefined,
      });
    } else {
      cambiarPaso(catalogoPasoIndex, {
        ...pasoActual,
        icon: undefined,
        iconoPuntos: { bits: icono.bits, origen: icono.origen },
      });
    }
    setCatalogoPasoIndex(null);
  };

  const origenPasoActual = catalogoPasoIndex !== null
    ? (pasos[catalogoPasoIndex]?.iconoPuntos?.origen ?? pasos[catalogoPasoIndex]?.icon)
    : undefined;

  return (
    <>
      <Field label={t('ed.cycle.pasos')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pasos.length === 0 && (
            <div style={estiloAyuda(VD)}>{t('ed.cycle.sinPasos')}</div>
          )}
          {pasos.map((paso, i) => (
            <FilaPasoCiclo
              key={paso.id}
              paso={paso}
              index={i}
              totalPasos={pasos.length}
              accent={accent}
              colorActivo={colorActivo}
              onSubir={subir}
              onBajar={bajar}
              onEliminar={eliminar}
              onCambiarPaso={cambiarPaso}
              onAbrirCatalogo={setCatalogoPasoIndex}
              onToggleColor={toggleColor}
              onCerrarColor={() => setColorActivo(null)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => actualizar([...pasos, PASO_VACIO()])}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '6px 8px',
            cursor: 'pointer',
            borderRadius: VD.radius.sm,
            background: VD.accentBg,
            border: `1px solid ${accent}`,
            color: accent,
            fontFamily: VD.mono,
            fontSize: 9,
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <DotGlyphIcon glyph="ADD" size={6} color={accent} />
          <span>{t('ed.cycle.anadirPaso')}</span>
        </button>
        <div style={estiloAyuda(VD)}>{t('ed.cycle.ayuda')}</div>
      </Field>

      {catalogoPasoIndex !== null && (
        <Suspense fallback={null}>
          <SelectorIconosDot
            accent={accent}
            currentOrigen={origenPasoActual}
            onSelect={alElegirIcono}
            onClose={() => setCatalogoPasoIndex(null)}
          />
        </Suspense>
      )}
    </>
  );
}
