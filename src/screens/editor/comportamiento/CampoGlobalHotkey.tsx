import React, { useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { useCapturaHotkey } from '../useCapturaHotkey';
import { normalizarHotkey } from './useConfiguracionExistente';
import type { PageConfig } from '../../../types';

const COMBOS_SUGERIDOS = [
  'Ctrl+Alt+F1',
  'Ctrl+Alt+F2',
  'Ctrl+Alt+F3',
  'Ctrl+Alt+F4',
  'Ctrl+Alt+F5',
  'Ctrl+Alt+F6',
  'Ctrl+Alt+F7',
  'Ctrl+Alt+F8',
  'Ctrl+Alt+F9',
  'Ctrl+Alt+F10',
  'Ctrl+Alt+F11',
  'Ctrl+Alt+F12',
  'Ctrl+Shift+Alt+A',
  'Ctrl+Shift+Alt+S',
  'Ctrl+Shift+Alt+D',
  'Ctrl+Shift+Alt+X',
];

interface InfoConflicto {
  id: string;
  label: string;
  page?: number;
}

interface CampoGlobalHotkeyProps {
  value: string;
  onChange: (hotkey: string) => void;
  accent: string;
  hotkeysOcupadas: Map<string, InfoConflicto>;
  pages?: PageConfig[];
}

function AvisoConflicto({
  conflicto,
  pages,
  vd,
  tf,
}: {
  conflicto: InfoConflicto;
  pages?: PageConfig[];
  vd: ReturnType<typeof useTheme>;
  tf: (s: string) => string;
}) {
  const numPagina = conflicto.page !== undefined ? conflicto.page + 1 : undefined;
  const nombrePagina = conflicto.page !== undefined && pages && pages[conflicto.page]
    ? pages[conflicto.page].name
    : undefined;

  let textoUbicacion = '';
  if (nombrePagina) {
    textoUbicacion = ` (${tf('Página')} ${numPagina}: ${nombrePagina})`;
  } else if (numPagina) {
    textoUbicacion = ` (${tf('Página')} ${numPagina})`;
  }

  return (
    <div
      style={{
        padding: '8px 10px',
        background: `${vd.danger}18`,
        border: `1px solid ${vd.danger}`,
        borderRadius: vd.radius.sm,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: vd.mono,
        fontSize: 8.5,
        color: vd.danger,
        letterSpacing: 0.5,
      }}
    >
      <DotGlyphIcon glyph="WARN" size={10} color={vd.danger} />
      <span>
        {tf('Este atajo ya está asignado al botón:')}{' '}
        <strong>"{conflicto.label}"</strong>
        {textoUbicacion}
      </span>
    </div>
  );
}

function FichaSugerida({
  combo,
  activo,
  ocupado,
  onClick,
  accent,
  vd,
}: {
  combo: string;
  activo: boolean;
  ocupado: boolean;
  onClick: () => void;
  accent: string;
  vd: ReturnType<typeof useTheme>;
}) {
  let borde = vd.border;
  let colorTexto = vd.text;

  if (activo) {
    borde = accent;
    colorTexto = accent;
  } else if (ocupado) {
    borde = vd.borderStrong;
    colorTexto = vd.textMuted;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 32,
        padding: '4px 8px',
        background: activo ? `${accent}24` : vd.elevated,
        border: `1px solid ${borde}`,
        borderRadius: vd.radius.sm,
        color: colorTexto,
        fontFamily: vd.mono,
        fontSize: 8.5,
        cursor: 'pointer',
        letterSpacing: 0.5,
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {activo && <DotGlyphIcon glyph="CHECK" size={8} color={accent} />}
      {ocupado && !activo && <DotGlyphIcon glyph="DOTS" size={6} color={vd.textMuted} />}
      <span>{combo}</span>
    </button>
  );
}

export function CampoGlobalHotkey({
  value,
  onChange,
  accent,
  hotkeysOcupadas,
  pages,
}: CampoGlobalHotkeyProps) {
  const VD = useTheme();
  const tf = useFieldText();
  const [grabando, setGrabando] = useState(false);

  useCapturaHotkey(
    grabando,
    (combo) => {
      onChange(combo);
      setGrabando(false);
    },
    () => setGrabando(false),
  );

  const normActual = normalizarHotkey(value);
  const conflicto = normActual ? hotkeysOcupadas.get(normActual) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Botones de acción rápida: Grabar, campo de texto, limpiar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setGrabando((prev) => !prev)}
          style={{
            minHeight: 32,
            padding: '6px 12px',
            background: grabando ? VD.accentBg : VD.surface,
            border: `1px solid ${grabando ? accent : VD.border}`,
            borderRadius: VD.radius.sm,
            color: grabando ? accent : VD.text,
            fontFamily: VD.mono,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          <DotGlyphIcon glyph="REC" size={10} color={grabando ? accent : VD.textDim} />
          <span>{grabando ? tf('ESPERANDO TECLAS...') : tf('GRABAR ATAJO')}</span>
        </button>

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tf("vacío = sin atajo global")}
          readOnly={grabando}
          style={{
            flex: 1,
            minHeight: 32,
            background: VD.surface,
            border: `1px solid ${grabando ? accent : VD.border}`,
            borderRadius: VD.radius.sm,
            padding: '6px 10px',
            color: VD.text,
            fontFamily: VD.mono,
            fontSize: 10,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            title={tf('BORRAR ATAJO')}
            style={{
              minHeight: 32,
              padding: '6px 10px',
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              color: VD.danger,
              fontFamily: VD.mono,
              fontSize: 8.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              textTransform: 'uppercase',
              boxSizing: 'border-box',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
            <span>{tf('BORRAR ATAJO')}</span>
          </button>
        )}
      </div>

      {/* Aviso de conflicto si la tecla ya está asignada */}
      {conflicto && (
        <AvisoConflicto
          conflicto={conflicto}
          pages={pages}
          vd={VD}
          tf={tf}
        />
      )}

      {/* Sugerencias de combinaciones seguras en Windows */}
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {tf('COMBINACIONES SUGERIDAS (SEGURAS EN WINDOWS)')}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COMBOS_SUGERIDOS.map((combo) => (
            <FichaSugerida
              key={combo}
              combo={combo}
              activo={normActual === combo}
              ocupado={hotkeysOcupadas.has(combo)}
              onClick={() => onChange(combo)}
              accent={accent}
              vd={VD}
            />
          ))}
        </div>
      </div>

      {/* Línea descriptiva para qué sirve */}
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 2 }}>
        {value
          ? `${tf('Ejecuta esta acción desde cualquier aplicación al pulsar')} ${value}.`
          : tf('Permite ejecutar esta acción desde cualquier aplicación o juego con una combinación global del sistema.')}
      </div>
    </div>
  );
}
