import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotText } from '../../components/DotText';
import { DotLabel } from '../../components/DotLabel';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import { SensorCard, type HardwareGroup } from '../../components/SensorPanel';
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

  const statusColor = sensorStatus?.connected
    ? VD.success
    : sensorStatus?.enabled
    ? VD.warning
    : VD.textMuted;
  const statusLabel = sensorStatus?.connected
    ? 'LHM'
    : sensorStatus?.enabled
    ? 'OFFLINE'
    : 'DISABLED';

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
        {pages.map((p, i) => {
          const isActive = i === activePage;
          return (
            <button
              key={p.id}
              onClick={() => setActivePage(i)}
              style={{
                flex: 1,
                padding: '4px 0',
                background: isActive ? accent : VD.elevated,
                border: `1px solid ${isActive ? accent : VD.border}`,
                color: isActive ? '#fff' : VD.textMuted,
                fontFamily: VD.mono,
                fontSize: 8,
                letterSpacing: 1,
                cursor: 'pointer',
                borderRadius: VD.radius.sm,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

