import React, { useEffect, useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useFieldText } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { IconoPuntos } from '../../components/dot480/IconoPuntos';
import { BrandIconDisplay } from '../../components/BrandIconDisplay';
import { Glyph57View } from '../../components/Glyph57View';
import { GLIFO_POR_TIPO_ACCION } from '../../components/dot480/glifosPorTipoAccion';
import { Field } from './comunes';
import type { TipoIcono } from './tiposIcono';
import type { ButtonAction, EfectoPuntos, EfectoPulsar } from '../../types';

interface IconoActualData {
  tipoIcono: TipoIcono;
  icon?: string;
  iconoPuntos?: { bits: string; origen: string };
  brandIcon?: string;
  customGlyph57?: number[];
  imageData?: string;
  actionType: ButtonAction['type'];
  fgColor?: string;
}

export interface SubseccionAnimacionProps {
  accent: string;
  isToggle: boolean;
  animacionEfecto: EfectoPuntos | undefined;
  setAnimacionEfecto: (efecto: EfectoPuntos | undefined) => void;
  animacionCuando: 'siempre' | 'al-pulsar' | 'encendido';
  setAnimacionCuando: (cuando: 'siempre' | 'al-pulsar' | 'encendido') => void;
  efectoPulsar: EfectoPulsar;
  setEfectoPulsar: (efecto: EfectoPulsar) => void;
  iconoActual: IconoActualData;
}


function MiniIconoBase({ icono, accent }: { icono: IconoActualData; accent: string }) {
  const color = icono.fgColor || accent;

  if (icono.iconoPuntos) {
    return <IconoPuntos bits={icono.iconoPuntos.bits} size={14} color={color} />;
  }
  if (icono.tipoIcono === 'glifo' && icono.icon) {
    return <DotGlyphIcon glyph={icono.icon} size={14} color={color} />;
  }
  if (icono.tipoIcono === 'marca' && icono.brandIcon) {
    return <BrandIconDisplay iconKey={icono.brandIcon} size={14} style={{ color }} />;
  }
  if (icono.tipoIcono === 'dibujo' && icono.customGlyph57) {
    return <Glyph57View rows={icono.customGlyph57} color={color} dotSize={2} gap={1} />;
  }
  if (icono.tipoIcono === 'imagen' && icono.imageData) {
    return <img src={icono.imageData} alt="" style={{ width: 14, height: 14, objectFit: 'contain' }} />;
  }
  const defaultGlyph = GLIFO_POR_TIPO_ACCION[icono.actionType] ?? 'DOTS';
  return <DotGlyphIcon glyph={defaultGlyph} size={14} color={color} />;
}

function MiniVistaAnimada({
  efecto,
  icono,
  accent,
}: {
  efecto: EfectoPuntos | undefined;
  icono: IconoActualData;
  accent: string;
}) {
  const animClass = efecto ? `vd-anim-${efecto}` : '';

  return (
    <div
      className={`vd-anim-live ${animClass}`}
      style={{
        width: 16,
        height: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <MiniIconoBase icono={icono} accent={accent} />
      {efecto === 'escaneo' && (
        <span
          className="vd-scanline-bar"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: accent,
            boxShadow: `0 0 4px ${accent}`,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

function FichaEfectoBoton({
  efectoId,
  etiqueta,
  activo,
  onClick,
  iconoActual,
  accent,
  vdElevated,
  vdBorder,
  vdSurface,
  vdText,
  vdTextDim,
  vdRadiusSm,
  vdMono,
}: {
  efectoId: EfectoPuntos | undefined;
  etiqueta: string;
  activo: boolean;
  onClick: () => void;
  iconoActual: IconoActualData;
  accent: string;
  vdElevated: string;
  vdBorder: string;
  vdSurface: string;
  vdText: string;
  vdTextDim: string;
  vdRadiusSm: number | string;
  vdMono: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: '0 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: activo ? `${accent}24` : vdElevated,
        border: `1px solid ${activo ? accent : vdBorder}`,
        borderRadius: vdRadiusSm,
        color: activo ? accent : vdTextDim,
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: vdSurface,
          borderRadius: vdRadiusSm,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <MiniVistaAnimada efecto={efectoId} icono={iconoActual} accent={accent} />
      </div>
      <span
        style={{
          fontFamily: vdMono,
          fontSize: 8.5,
          fontWeight: activo ? 600 : 400,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: activo ? accent : vdText,
        }}
      >
        {etiqueta}
      </span>
    </button>
  );
}

function FichasEfectos({
  animacionEfecto,
  setAnimacionEfecto,
  iconoActual,
  accent,
}: {
  animacionEfecto: EfectoPuntos | undefined;
  setAnimacionEfecto: (efecto: EfectoPuntos | undefined) => void;
  iconoActual: IconoActualData;
  accent: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();

  const listaEfectos: Array<{ id: EfectoPuntos | undefined; label: string }> = [
    { id: undefined, label: tf('NINGUNA') },
    { id: 'encender', label: tf('ENCENDER') },
    { id: 'barrido', label: tf('BARRIDO') },
    { id: 'pulso', label: tf('PULSO') },
    { id: 'parpadeo', label: tf('PARPADEO') },
    { id: 'escaneo', label: tf('ESCANEO') },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))',
        gap: 6,
      }}
    >
      {listaEfectos.map((item, idx) => (
        <FichaEfectoBoton
          key={item.id ?? `efecto-${idx}`}
          efectoId={item.id}
          etiqueta={item.label}
          activo={animacionEfecto === item.id}
          onClick={() => setAnimacionEfecto(item.id)}
          iconoActual={iconoActual}
          accent={accent}
          vdElevated={VD.elevated}
          vdBorder={VD.border}
          vdSurface={VD.surface}
          vdText={VD.text}
          vdTextDim={VD.textDim}
          vdRadiusSm={VD.radius.sm}
          vdMono={VD.mono}
        />
      ))}
    </div>
  );
}

function FichasCuando({
  animacionCuando,
  setAnimacionCuando,
  isToggle,
  accent,
}: {
  animacionCuando: 'siempre' | 'al-pulsar' | 'encendido';
  setAnimacionCuando: (cuando: 'siempre' | 'al-pulsar' | 'encendido') => void;
  isToggle: boolean;
  accent: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();

  const opciones: Array<{ id: 'siempre' | 'al-pulsar' | 'encendido'; label: string }> = [
    { id: 'siempre', label: tf('SIEMPRE') },
    { id: 'al-pulsar', label: tf('AL PULSAR') },
    ...(isToggle ? [{ id: 'encendido' as const, label: tf('MIENTRAS ESTÁ ENCENDIDO') }] : []),
  ];

  return (
    <Field label={tf('CUÁNDO')}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opciones.map((op) => {
          const activo = animacionCuando === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setAnimacionCuando(op.id)}
              style={{
                height: 32,
                padding: '0 10px',
                background: activo ? `${accent}24` : VD.elevated,
                border: `1px solid ${activo ? accent : VD.border}`,
                borderRadius: VD.radius.sm,
                color: activo ? accent : VD.textDim,
                fontFamily: VD.mono,
                fontSize: 8.5,
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function FichasEfectoPulsar({
  efectoPulsar,
  setEfectoPulsar,
  accent,
}: {
  efectoPulsar: EfectoPulsar;
  setEfectoPulsar: (efecto: EfectoPulsar) => void;
  accent: string;
}) {
  const VD = useTheme();
  const tf = useFieldText();

  const opciones: Array<{ id: EfectoPulsar; label: string }> = [
    { id: 'destello', label: tf('DESTELLO (PREDETERMINADO)') },
    { id: 'onda', label: tf('ONDA') },
    { id: 'none', label: tf('NINGUNO') },
  ];

  return (
    <Field label={tf('AL PULSAR')}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {opciones.map((op) => {
          const activo = (!efectoPulsar && op.id === 'destello') || efectoPulsar === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => setEfectoPulsar(op.id)}
              style={{
                height: 32,
                padding: '0 10px',
                background: activo ? `${accent}24` : VD.elevated,
                border: `1px solid ${activo ? accent : VD.border}`,
                borderRadius: VD.radius.sm,
                color: activo ? accent : VD.textDim,
                fontFamily: VD.mono,
                fontSize: 8.5,
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function SubseccionAnimacion({
  accent,
  isToggle,
  animacionEfecto,
  setAnimacionEfecto,
  animacionCuando,
  setAnimacionCuando,
  efectoPulsar,
  setEfectoPulsar,
  iconoActual,
}: SubseccionAnimacionProps) {
  const VD = useTheme();
  const tf = useFieldText();

  const [reducirMovimiento, setReducirMovimiento] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (ev: MediaQueryListEvent) => setReducirMovimiento(ev.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`
        @keyframes vd-anim-encender-kf {
          0% { opacity: 0.15; filter: brightness(0.4); }
          40% { opacity: 1; filter: brightness(1.3); }
          70% { opacity: 1; filter: brightness(1); }
          90% { opacity: 1; }
          100% { opacity: 0.15; filter: brightness(0.4); }
        }
        @keyframes vd-anim-barrido-kf {
          0% { clip-path: inset(0 100% 0 0); opacity: 0.3; }
          45% { clip-path: inset(0 0 0 0); opacity: 1; }
          75% { clip-path: inset(0 0 0 0); opacity: 1; }
          100% { clip-path: inset(0 0 0 100%); opacity: 0.3; }
        }
        @keyframes vd-anim-pulso-kf {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes vd-anim-parpadeo-kf {
          0%, 45% { opacity: 1; }
          46%, 95% { opacity: 0.1; }
          100% { opacity: 1; }
        }
        @keyframes vd-anim-escaneo-kf {
          0% { top: 0%; opacity: 0.9; }
          50% { top: 85%; opacity: 1; }
          100% { top: 0%; opacity: 0.9; }
        }
        .vd-anim-encender { animation: vd-anim-encender-kf 2s ease-in-out infinite; }
        .vd-anim-barrido { animation: vd-anim-barrido-kf 1.8s ease-in-out infinite; }
        .vd-anim-pulso { animation: vd-anim-pulso-kf 1.4s ease-in-out infinite; }
        .vd-anim-parpadeo { animation: vd-anim-parpadeo-kf 1.1s steps(1) infinite; }
        .vd-anim-escaneo .vd-scanline-bar { animation: vd-anim-escaneo-kf 1.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .vd-anim-live, .vd-scanline-bar { animation: none !important; }
        }
      `}</style>

      {/* Cabecera ANIMACIÓN */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
        <DotLabel size={9} color={VD.textMuted} spacing={2}>
          {tf('ANIMACIÓN')}
        </DotLabel>
        {reducirMovimiento && (
          <span style={{ fontFamily: VD.mono, fontSize: 8.5, color: VD.warning, letterSpacing: 0.5 }}>
            {tf('Reducción de movimiento activada en el sistema')}
          </span>
        )}
      </div>

      {/* Fichas con los efectos y «NINGUNA» */}
      <FichasEfectos
        animacionEfecto={animacionEfecto}
        setAnimacionEfecto={setAnimacionEfecto}
        iconoActual={iconoActual}
        accent={accent}
      />

      {/* CUÁNDO (solo si hay efecto seleccionado) */}
      {Boolean(animacionEfecto) && (
        <FichasCuando
          animacionCuando={animacionCuando}
          setAnimacionCuando={setAnimacionCuando}
          isToggle={isToggle}
          accent={accent}
        />
      )}

      {/* AL PULSAR: DESTELLO (predeterminado) · ONDA · NINGUNO */}
      <FichasEfectoPulsar
        efectoPulsar={efectoPulsar}
        setEfectoPulsar={setEfectoPulsar}
        accent={accent}
      />
    </div>
  );
}
