import React from 'react';
import { useTheme } from '../utils/theme';
import { DotGlyphIcon } from './dot480/DotGlyphIcon';
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
    // Unificar lecturas de CPU y GPU bajo una misma clave para combinar
    // carga nativa y temperaturas de LHM en una sola tarjeta informativa.
    const groupKey = (s.category === 'cpu' || s.category === 'gpu' || s.category === 'memory')
      ? `cat_${s.category}`
      : s.hardware;

    if (!groups[groupKey]) {
      groups[groupKey] = { hardware: s.hardware, category: s.category, temps: [], loads: [], powers: [], fans: [] };
    } else if (s.hardware.length < groups[groupKey].hardware.length && s.hardware.length > 3) {
      groups[groupKey].hardware = s.hardware;
    }
    if (s.kind === 'Temperature') groups[groupKey].temps.push(s);
    else if (s.kind === 'Load') groups[groupKey].loads.push(s);
    else if (s.kind === 'Power') groups[groupKey].powers.push(s);
    else if (s.kind === 'Fan') groups[groupKey].fans.push(s);
  }
  return Object.values(groups)
    .filter((g) => g.temps.length || g.loads.length || g.powers.length || g.fans.length)
    .map((g): HardwareGroup => ({
      hardware: g.hardware,
      category: g.category,
      temp: g.temps.find((s) => /package|tctl|tdie|hot ?spot|gpu core|cpu/i.test(s.name)) ?? g.temps[0],
      load: g.loads.find((s) => /^cpu total$|gpu core|^total|carga total|memoria usada|^memory$|^memory used$/i.test(s.name))
        ?? g.loads.find((s) => !/module|virtual/i.test(s.name))
        ?? g.loads[0],
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

function shortHardwareLabel(name: string): string {
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

const CAT_GLYPHS: Record<string, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  mainboard: 'GEAR',
  memory: 'RAM',
  storage: 'STORAGE',
  other: 'DOTS',
};

const METRIC_GLYPHS: Record<string, string> = {
  TEMP: 'WEATHER_THERMO',
  LOAD: 'CPU',
  FAN: 'FAN',
  PWR: 'BOLT',
};

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
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: compact ? 4 : 6,
      }}>
        <DotGlyphIcon
          glyph={CAT_GLYPHS[group.category] ?? 'DOTS'}
          size={labelFontSize + 3}
          color={VD.accent}
          showRecessed
        />
        <div style={{
          fontFamily: VD.mono, fontSize: labelFontSize + 1, letterSpacing: 1, color: VD.textDim,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {shortHardwareLabel(group.hardware).toUpperCase()}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, gap: compact ? 4 : 6 }}>
        {cells.map((c) => (
          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1 }}>
              <DotGlyphIcon glyph={METRIC_GLYPHS[c.label] ?? 'DOTS'} size={labelFontSize} color={VD.textMuted} />
              <span style={{ fontFamily: VD.mono, fontSize: labelFontSize, color: VD.textMuted, letterSpacing: 1 }}>{c.label}</span>
            </div>
            <div style={{ fontFamily: VD.mono, fontSize: valueFontSize, color: c.color || VD.text, lineHeight: 1.1, marginTop: 2 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface SensorTileProps {
  category: Sensor['category'];
  metric: 'LOAD' | 'TEMP';
  value: number;
  hardware?: string;
  onClick?: () => void;
}

export function SensorTile({ category, metric, value, hardware, onClick }: SensorTileProps) {
  const VD = useTheme();
  const rounded = Math.round(value);
  const displayVal = metric === 'TEMP' ? `${rounded}°` : `${rounded}%`;
  const valColor = metric === 'TEMP'
    ? (value >= 85 ? VD.danger : value >= 70 ? VD.warning : VD.text)
    : VD.text;
  const glyph = CAT_GLYPHS[category] ?? 'DOTS';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={hardware ? `${shortHardwareLabel(hardware)}: ${metric} ${displayVal}` : `${metric} ${displayVal}`}
      style={{
        background: VD.elevated,
        border: `1px solid ${VD.border}`,
        borderRadius: VD.radius.md,
        padding: '6px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      <DotGlyphIcon
        glyph={glyph}
        size={11}
        color={VD.accent}
        showRecessed
      />
      <div
        style={{
          fontFamily: VD.mono,
          fontSize: 13,
          fontWeight: 600,
          color: valColor,
          lineHeight: 1,
          marginTop: 4,
        }}
      >
        {displayVal}
      </div>
      <div
        style={{
          fontFamily: VD.mono,
          fontSize: 7,
          color: VD.textMuted,
          letterSpacing: 1,
          lineHeight: 1,
          marginTop: 3,
        }}
      >
        {metric}
      </div>
    </div>
  );
}

export interface RepresentativeTile {
  id: string;
  category: Sensor['category'];
  metric: 'LOAD' | 'TEMP';
  value: number;
  hardware: string;
}

/**
 * Extrae los sensores representativos para el panel de cuadros:
 * uso total CPU, temp CPU, uso GPU, temp GPU, uso de RAM total (%)
 * y temperatura de almacenamiento/placa si existe.
 */
export function getRepresentativeTiles(list: Sensor[]): RepresentativeTile[] {
  const groups = groupSensorsByHardware(list);
  const tiles: RepresentativeTile[] = [];

  const cpu = groups.find((g) => g.category === 'cpu');
  if (cpu?.load) {
    tiles.push({ id: 'cpu_load', category: 'cpu', metric: 'LOAD', value: cpu.load.value, hardware: cpu.hardware });
  }
  if (cpu?.temp) {
    tiles.push({ id: 'cpu_temp', category: 'cpu', metric: 'TEMP', value: cpu.temp.value, hardware: cpu.hardware });
  }

  const gpu = groups.find((g) => g.category === 'gpu');
  if (gpu?.load) {
    tiles.push({ id: 'gpu_load', category: 'gpu', metric: 'LOAD', value: gpu.load.value, hardware: gpu.hardware });
  }
  if (gpu?.temp) {
    tiles.push({ id: 'gpu_temp', category: 'gpu', metric: 'TEMP', value: gpu.temp.value, hardware: gpu.hardware });
  }

  const mem = groups.find((g) => g.category === 'memory');
  if (mem?.load) {
    tiles.push({ id: 'mem_load', category: 'memory', metric: 'LOAD', value: mem.load.value, hardware: mem.hardware });
  }

  const storage = groups.find((g) => g.category === 'storage' && g.temp);
  if (storage?.temp) {
    tiles.push({ id: 'storage_temp', category: 'storage', metric: 'TEMP', value: storage.temp.value, hardware: storage.hardware });
  } else {
    const mb = groups.find((g) => g.category === 'mainboard' && g.temp);
    if (mb?.temp) {
      tiles.push({ id: 'mb_temp', category: 'mainboard', metric: 'TEMP', value: mb.temp.value, hardware: mb.hardware });
    }
  }

  return tiles;
}

export type { HardwareGroup };

