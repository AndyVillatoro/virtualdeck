import React from 'react';
import { useTheme } from '../utils/theme';
import type { Sensor } from '../types';

interface HardwareGroup {
  hardware: string;
  category: Sensor['category'];
  temp?: Sensor;
  load?: Sensor;
  power?: Sensor;
  fan?: Sensor;
}

// Picks the most informative sensor of each kind per hardware piece. Heuristics
// match real LHM naming: "Tctl/Tdie" / "Hot Spot" / "GPU Core" beat per-core
// readings; "GPU Core" / "CPU Total" beat generic loads.
export function groupSensorsByHardware(list: Sensor[]): HardwareGroup[] {
  const groups: Record<string, { hardware: string; category: Sensor['category']; temps: Sensor[]; loads: Sensor[]; powers: Sensor[]; fans: Sensor[] }> = {};
  for (const s of list) {
    if (!s.hardware) continue;
    if (!groups[s.hardware]) {
      groups[s.hardware] = { hardware: s.hardware, category: s.category, temps: [], loads: [], powers: [], fans: [] };
    }
    if (s.kind === 'Temperature') groups[s.hardware].temps.push(s);
    else if (s.kind === 'Load') groups[s.hardware].loads.push(s);
    else if (s.kind === 'Power') groups[s.hardware].powers.push(s);
    else if (s.kind === 'Fan') groups[s.hardware].fans.push(s);
  }
  return Object.values(groups)
    .filter((g) => g.temps.length || g.loads.length || g.powers.length || g.fans.length)
    .map((g): HardwareGroup => ({
      hardware: g.hardware,
      category: g.category,
      temp: g.temps.find((s) => /package|tctl|tdie|hot ?spot|gpu core|cpu/i.test(s.name)) ?? g.temps[0],
      load: g.loads.find((s) => /^cpu total$|gpu core|^total/i.test(s.name)) ?? g.loads[0],
      power: g.powers.find((s) => /package|^total|gpu power|cpu/i.test(s.name)) ?? g.powers[0],
      fan: g.fans.find((s) => s.value > 0) ?? g.fans[0],
    }))
    .sort((a, b) => {
      // CPU first, GPU second, mainboard third, memory fourth, storage last.
      const order: Record<Sensor['category'], number> = { cpu: 0, gpu: 1, mainboard: 2, memory: 3, storage: 4, other: 5 };
      const da = order[a.category] ?? 9, db = order[b.category] ?? 9;
      if (da !== db) return da - db;
      return a.hardware.localeCompare(b.hardware);
    });
}

export function shortHardwareLabel(name: string): string {
  return name
    .replace(/(?:AMD|Intel|NVIDIA)\s+/gi, '')
    .replace(/\s+(Processor|CPU)\s*$/i, '')
    .replace(/\s+\d+-Core/i, '')
    .trim();
}

interface SensorCardProps {
  group: HardwareGroup;
  /** Compact mode — fewer columns, smaller font. Used in the MainB sidebar. */
  compact?: boolean;
}

export function SensorCard({ group, compact = false }: SensorCardProps) {
  const VD = useTheme();
  const { temp, load, power, fan } = group;
  const tempColor = temp ? (temp.value >= 85 ? VD.danger : temp.value >= 70 ? VD.warning : VD.text) : VD.textMuted;
  const cells: Array<{ label: string; value: string; color?: string }> = [];
  if (temp) cells.push({ label: 'TEMP', value: `${Math.round(temp.value)}°`, color: tempColor });
  if (load) cells.push({ label: 'LOAD', value: `${Math.round(load.value)}%` });
  if (fan && fan.value > 0) cells.push({ label: 'FAN', value: `${Math.round(fan.value)}` });
  if (power) cells.push({ label: 'PWR', value: `${Math.round(power.value)}W` });
  if (cells.length === 0) return null;
  const labelFontSize = compact ? 6 : 7;
  const valueFontSize = compact ? 11 : 13;
  const padding = compact ? '6px 8px' : '8px 10px';
  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.border}`,
      borderRadius: VD.radius.md, padding,
    }}>
      <div style={{
        fontFamily: VD.mono, fontSize: labelFontSize + 1, letterSpacing: 1, color: VD.textDim,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: compact ? 4 : 6,
      }}>
        {shortHardwareLabel(group.hardware).toUpperCase()}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, gap: compact ? 4 : 6 }}>
        {cells.map((c) => (
          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: VD.mono, fontSize: labelFontSize, color: VD.textMuted, letterSpacing: 1, lineHeight: 1 }}>{c.label}</div>
            <div style={{ fontFamily: VD.mono, fontSize: valueFontSize, color: c.color || VD.text, lineHeight: 1.1, marginTop: 2 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { HardwareGroup };
