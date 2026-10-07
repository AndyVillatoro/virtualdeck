import React from 'react';
import { useTheme } from '../../utils/theme';
import { textoSobre } from '../../design';
import { useT } from '../../utils/i18n';
import { useFormatoPantalla } from '../../utils/useFormatoPantalla';
import { DotText } from '../../components/DotText';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { SensorCard, type HardwareGroup } from '../../components/SensorPanel';
import { indicesPaginasDeck } from '../../utils/paginasDeck';
import type { PageConfig, SensorsStatus } from '../../types';

interface PanelLateralFullscreenProps {
  hours: string;
  minutes: string;
  pages: PageConfig[];
  activePage: number;
  setActivePage: (idx: number) => void;
  accent: string;
  showSensors?: boolean;
  sensorStatus?: SensorsStatus;
  sensorGroups: HardwareGroup[];
}

/** Glifo por familia de hardware, para la columna estrecha de `barra`. */
const GLYPH_CATEGORIA: Record<string, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  mainboard: 'GEAR',
  memory: 'RAM',
  storage: 'STORAGE',
  other: 'DOTS',
};

/**
 * Una lectura por grupo en una línea. La columna estrecha de `barra` no da
 * para la tarjeta entera (`SensorCard`), así que enseña la métrica más
 * significativa de cada grupo.
 */
function FilaSensorBarra({ group }: { group: HardwareGroup }) {
  const VD = useTheme();
  const valor = group.temp
    ? `${Math.round(group.temp.value)}°`
    : group.load
    ? `${Math.round(group.load.value)}%`
    : group.power
    ? `${Math.round(group.power.value)}W`
    : group.fan
    ? `${Math.round(group.fan.value)}`
    : null;
  if (!valor) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
      <DotGlyphIcon glyph={GLYPH_CATEGORIA[group.category] ?? 'DOTS'} size={7} color={VD.accent} showRecessed />
      <span
        style={{
          flex: 1, minWidth: 0, fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
          color: VD.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
      >
        {group.hardware.toUpperCase()}
      </span>
      <span style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>{valor}</span>
    </div>
  );
}

interface PanelBarraProps {
  hours: string;
  minutes: string;
  showSensors: boolean;
  sensorStatus?: SensorsStatus;
  sensorGroups: HardwareGroup[];
  statusColor: string;
  statusLabel: string;
}

/** La columna estrecha de `barra`: reloj compacto, 2–3 lecturas y el estado. */
function PanelBarra({ hours, minutes, showSensors, sensorStatus, sensorGroups, statusColor, statusLabel }: PanelBarraProps) {
  const VD = useTheme();
  const t = useT();
  const visibles = sensorGroups.slice(0, 3);

  return (
    <div
      style={{
        width: 132,
        padding: '8px 10px',
        borderRight: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flexShrink: 0,
        minHeight: 0,
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <DotLabel size={7} color={VD.textMuted} spacing={2} style={{ marginBottom: 4, display: 'block' }}>
          {t('full.clock')}
        </DotLabel>
        <DotText text={`${hours}:${minutes}`} dotSize={4} gap={1} color={VD.text} maxWidth={112} />
      </div>

      {showSensors && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <DotLabel size={7} color={VD.textMuted} spacing={2}>
              {t('panel.sensors')}
            </DotLabel>
            <DotGlyphIcon glyph="DOTS" size={5} color={statusColor} />
          </div>
          {visibles.length === 0 ? (
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
              {t(sensorStatus?.enabled ? 'sensors.noData' : 'sensors.offHint')}
            </div>
          ) : (
            visibles.map((g) => <FilaSensorBarra key={g.hardware} group={g} />)
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          fontFamily: VD.mono, fontSize: 7, letterSpacing: 1, color: statusColor,
        }}
      >
        <DotGlyphIcon glyph="DOTS" size={5} color={statusColor} />
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{statusLabel}</span>
      </div>
    </div>
  );
}

export function PanelLateralFullscreen({
  hours,
  minutes,
  pages,
  activePage,
  setActivePage,
  accent,
  showSensors = true,
  sensorStatus,
  sensorGroups,
}: PanelLateralFullscreenProps) {
  const VD = useTheme();
  const t = useT();
  const { formato } = useFormatoPantalla();

  const statusColor = sensorStatus?.connected
    ? VD.success
    : sensorStatus?.enabled
    ? VD.warning
    : VD.textMuted;
  const statusLabel = sensorStatus?.connected
    ? 'LHM'
    : sensorStatus?.enabled
    ? 'OFFLINE'
    : t('sensors.disabledDot');

  // Solo las páginas del deck, como en las pestañas de la principal: las de
  // dock se editan en `Dispositivos`. `activePage` es índice real.
  const indicesDeck = indicesPaginasDeck(pages);

  // En `barra` el ancho es para la rejilla: columna estrecha con el reloj y
  // 2–3 lecturas. El selector de página se muda a las fichas de la franja
  // inferior (`FullscreenB`), por eso aquí no se dibuja.
  if (formato === 'barra') {
    return (
      <PanelBarra
        hours={hours}
        minutes={minutes}
        showSensors={showSensors}
        sensorStatus={sensorStatus}
        sensorGroups={sensorGroups}
        statusColor={statusColor}
        statusLabel={statusLabel}
      />
    );
  }

  return (
    <div
      style={{
        width: '34%',
        padding: '20px 24px 16px',
        borderRight: `1px solid ${VD.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        gap: 12,
        minHeight: 0,
      }}
    >
      <div>
        <DotLabel size={8} color={VD.textMuted} spacing={2} style={{ marginBottom: 8, display: 'block' }}>
          {t('full.clock')}
        </DotLabel>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <DotText text={hours} dotSize={7} gap={2} color={VD.text} />
          <DotText text={minutes} dotSize={7} gap={2} color={VD.textDim} />
        </div>
      </div>

      {/* Sensor cards */}
      {showSensors ? (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <DotLabel size={8} color={VD.textMuted} spacing={2}>
              {t('panel.sensors')}
            </DotLabel>
            <span
              style={{
                fontFamily: VD.mono,
                fontSize: 7,
                letterSpacing: 1,
                color: statusColor,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <DotGlyphIcon glyph="DOTS" size={5} color={statusColor} />
              <span>{statusLabel}</span>
            </span>
          </div>
          {sensorGroups.length === 0 ? (
            <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, padding: '8px 0' }}>
              {t(sensorStatus?.enabled ? 'sensors.noData' : 'sensors.offHint')}
            </div>
          ) : (
            sensorGroups.map((g) => <SensorCard key={g.hardware} group={g} />)
          )}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {/* Page selector */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {indicesDeck.map((realIdx, pos) => {
          const p = pages[realIdx];
          const isActive = realIdx === activePage;
          return (
            <button
              key={p.id}
              onClick={() => setActivePage(realIdx)}
              style={{
                flex: 1,
                padding: '0 4px',
                minHeight: 32,
                background: isActive ? accent : VD.elevated,
                border: `1px solid ${isActive ? accent : VD.border}`,
                color: isActive ? textoSobre(accent) : VD.textMuted,
                fontFamily: VD.mono,
                fontSize: 9,
                letterSpacing: 1,
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
              }}
            >
              {pos + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

