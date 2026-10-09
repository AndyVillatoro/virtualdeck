import React, { useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { useCapturaHotkey } from '../useCapturaHotkey';
import { normalizarHotkey } from './useConfiguracionExistente';
import type { PageConfig } from '../../../types';

interface ComboSugerido {
  atajo: string;
  nombreKey: string;
  paraQueKey: string;
}

const COMBOS_SUGERIDOS: ComboSugerido[] = [
  { atajo: 'Ctrl+Alt+F1', nombreKey: 'hotkey.sug.muteMicro', paraQueKey: 'hotkey.sug.muteMicroDesc' },
  { atajo: 'Ctrl+Alt+F2', nombreKey: 'hotkey.sug.deafen', paraQueKey: 'hotkey.sug.deafenDesc' },
  { atajo: 'Ctrl+Alt+F3', nombreKey: 'hotkey.sug.escenaSig', paraQueKey: 'hotkey.sug.escenaSigDesc' },
  { atajo: 'Ctrl+Alt+F4', nombreKey: 'hotkey.sug.modoConcentracion', paraQueKey: 'hotkey.sug.modoConcentracionDesc' },
  { atajo: 'Ctrl+Alt+F5', nombreKey: 'hotkey.sug.grabarClip', paraQueKey: 'hotkey.sug.grabarClipDesc' },
  { atajo: 'Ctrl+Alt+F6', nombreKey: 'hotkey.sug.playPause', paraQueKey: 'hotkey.sug.playPauseDesc' },
  { atajo: 'Ctrl+Alt+F7', nombreKey: 'hotkey.sug.pistaSig', paraQueKey: 'hotkey.sug.pistaSigDesc' },
  { atajo: 'Ctrl+Alt+F8', nombreKey: 'hotkey.sug.overlayJuego', paraQueKey: 'hotkey.sug.overlayJuegoDesc' },
  { atajo: 'Ctrl+Alt+F9', nombreKey: 'hotkey.sug.perfilDeck', paraQueKey: 'hotkey.sug.perfilDeckDesc' },
  { atajo: 'Ctrl+Alt+F10', nombreKey: 'hotkey.sug.capturaPantalla', paraQueKey: 'hotkey.sug.capturaPantallaDesc' },
  { atajo: 'Ctrl+Alt+F11', nombreKey: 'hotkey.sug.modoStream', paraQueKey: 'hotkey.sug.modoStreamDesc' },
  { atajo: 'Ctrl+Alt+F12', nombreKey: 'hotkey.sug.emergencia', paraQueKey: 'hotkey.sug.emergenciaDesc' },
  { atajo: 'Ctrl+Shift+Alt+A', nombreKey: 'hotkey.sug.accionA', paraQueKey: 'hotkey.sug.accionADesc' },
  { atajo: 'Ctrl+Shift+Alt+S', nombreKey: 'hotkey.sug.accionS', paraQueKey: 'hotkey.sug.accionSDesc' },
  { atajo: 'Ctrl+Shift+Alt+D', nombreKey: 'hotkey.sug.accionD', paraQueKey: 'hotkey.sug.accionDDesc' },
  { atajo: 'Ctrl+Shift+Alt+X', nombreKey: 'hotkey.sug.accionX', paraQueKey: 'hotkey.sug.accionXDesc' },
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

function FilaComboSugerido({
  item,
  activo,
  ocupado,
  conflictoLabel,
  onClick,
  accent,
  vd,
  t,
}: {
  item: ComboSugerido;
  activo: boolean;
  ocupado: boolean;
  conflictoLabel?: string;
  onClick: () => void;
  accent: string;
  vd: ReturnType<typeof useTheme>;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  let borde = vd.border;
  let bg = vd.elevated;
  let colorAtajo = vd.text;

  if (activo) {
    borde = accent;
    bg = `${accent}1c`;
    colorAtajo = accent;
  } else if (ocupado) {
    borde = vd.borderStrong;
    bg = `${vd.surface}80`;
    colorAtajo = vd.textMuted;
  }

  const tooltip = ocupado && conflictoLabel
    ? `${t(item.nombreKey)} · ${t('hotkey.sug.ocupadoPor', { boton: conflictoLabel })}`
    : `${t(item.nombreKey)} — ${t(item.paraQueKey)}`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      style={{
        width: '100%',
        minHeight: 36,
        padding: '5px 8px',
        background: bg,
        border: `1px solid ${borde}`,
        borderRadius: vd.radius.sm,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        textAlign: 'left',
        boxSizing: 'border-box',
        transition: 'background 0.12s, border-color 0.12s',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {activo && <DotGlyphIcon glyph="CHECK" size={8} color={accent} />}
          {ocupado && !activo && <DotGlyphIcon glyph="DOTS" size={6} color={vd.textMuted} />}
          <span
            style={{
              fontSize: 8.5,
              fontWeight: 600,
              fontFamily: vd.mono,
              color: activo ? accent : (ocupado ? vd.textMuted : vd.text),
              letterSpacing: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {t(item.nombreKey)}
          </span>
          {ocupado && conflictoLabel && (
            <span
              style={{
                fontSize: 7.5,
                fontFamily: vd.mono,
                color: vd.textDim,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ({t('hotkey.sug.ocupadoPor', { boton: conflictoLabel })})
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 7.5,
            fontFamily: vd.mono,
            color: vd.textDim,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {t(item.paraQueKey)}
        </div>
      </div>

      <span
        style={{
          fontSize: 8.5,
          fontFamily: vd.mono,
          fontWeight: 600,
          color: colorAtajo,
          letterSpacing: 0.5,
          padding: '2px 6px',
          background: activo ? `${accent}28` : vd.surface,
          borderRadius: vd.radius.sm,
          border: `1px solid ${activo ? accent : vd.border}`,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {item.atajo}
      </span>
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
  const t = useT();
  const tf = useFieldText();
  const [grabando, setGrabando] = useState(false);
  const [avisoCaptura, setAvisoCaptura] = useState<string | null>(null);

  useCapturaHotkey(
    grabando,
    (combo) => {
      setAvisoCaptura(null);
      onChange(combo);
      setGrabando(false);
    },
    () => setGrabando(false),
    () => {
      setAvisoCaptura(t('hotkey.aviso.reservadaWin'));
    },
  );

  const normActual = normalizarHotkey(value);
  const conflicto = normActual ? hotkeysOcupadas.get(normActual) : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Botones de acción rápida: Grabar, campo de texto, limpiar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            setAvisoCaptura(null);
            setGrabando((prev) => !prev);
          }}
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
          onChange={(e) => {
            setAvisoCaptura(null);
            onChange(e.target.value);
          }}
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
            onClick={() => {
              setAvisoCaptura(null);
              onChange('');
            }}
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

      {/* Aviso si se intentó capturar una tecla Windows reservada */}
      {avisoCaptura && (
        <div
          style={{
            padding: '8px 10px',
            background: `${VD.warning}18`,
            border: `1px solid ${VD.warning}`,
            borderRadius: VD.radius.sm,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: VD.mono,
            fontSize: 8.5,
            color: VD.warning,
            letterSpacing: 0.5,
          }}
        >
          <DotGlyphIcon glyph="WARN" size={10} color={VD.warning} />
          <span>{avisoCaptura}</span>
        </div>
      )}

      {/* Aviso de conflicto si la tecla ya está asignada */}
      {conflicto && (
        <AvisoConflicto
          conflicto={conflicto}
          pages={pages}
          vd={VD}
          tf={tf}
        />
      )}

      {/* Explicación de la diferencia con el atajo de la propia acción */}
      <div
        style={{
          fontFamily: VD.mono,
          fontSize: 8,
          color: VD.textDim,
          padding: '6px 8px',
          background: VD.surface,
          borderRadius: VD.radius.sm,
          border: `1px solid ${VD.border}`,
          lineHeight: 1.4,
        }}
      >
        {t('hotkey.global.diferencia')}
      </div>

      {/* Lista de combinaciones sugeridas con nombre y para qué */}
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {t('hotkey.sug.titulo')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' }}>
          {COMBOS_SUGERIDOS.map((item) => {
            const normCombo = normalizarHotkey(item.atajo);
            const activo = normActual === normCombo;
            const conflictoBtn = hotkeysOcupadas.get(normCombo);
            const ocupado = hotkeysOcupadas.has(normCombo);
            return (
              <FilaComboSugerido
                key={item.atajo}
                item={item}
                activo={activo}
                ocupado={ocupado}
                conflictoLabel={conflictoBtn?.label}
                onClick={() => {
                  setAvisoCaptura(null);
                  onChange(item.atajo);
                }}
                accent={accent}
                vd={VD}
                t={t}
              />
            );
          })}
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
