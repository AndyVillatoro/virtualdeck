import React, { useEffect, useState } from 'react';
import type { VDTokens } from '../../design';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DotLabel } from '../../components/DotLabel';
import { ColorPicker } from '../../components/ColorPicker';
import type { RGBDeviceInfo, RGBSettings, RGBStatus } from '../../types';

/**
 * Las piezas del gestor RGB.
 *
 * `RGBManagerB` se queda con el estado y con la conexion; aqui viven la
 * insignia de estado, el detalle de un dispositivo, el pintor LED a LED, la
 * barra de guardar perfil, el calibrador de zonas y los estilos compartidos.
 */

// Sugerencias de tamaño cuando el calibrador detecta una zona sin valor guardado.
// Heurística: nombre conocido → cantidad. El usuario puede sobreescribir.
// `note` es una clave de i18n, no texto: el idioma se resuelve al pintar.
const KNOWN_ZONE_HINTS: Array<{ pattern: RegExp; size: number; note: string }> = [
  { pattern: /uni\s*fan|sl120|sl-?infinity/i, size: 16, note: 'rgb.hint.unifan' },
  { pattern: /strimer.*24/i, size: 24, note: 'rgb.hint.strimer24' },
  { pattern: /strimer.*8/i, size: 8, note: 'rgb.hint.strimer8' },
  { pattern: /argb.*header|addressable/i, size: 8, note: 'rgb.hint.argb' },
];

export function StatusBadge({ status }: { status: RGBStatus }) {
  const VD = useTheme();
  const t = useT();
  const dotColor = status.connected ? VD.success : status.serverRunning ? VD.warning : VD.textMuted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: VD.mono, fontSize: 10, color: VD.textDim, letterSpacing: 1 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
      {status.connected ? t('rgb.connected', { n: status.deviceCount }) :
       status.serverRunning ? t('rgb.serverUp') : t('rgb.disconnected')}
    </div>
  );
}

export function DeviceDetail({
  device, accent, onSetColor, onSetMode, onSetZoneColor, onSetSingleLed,
}: {
  device: RGBDeviceInfo;
  accent: string;
  onSetColor: (hex: string) => void;
  onSetMode: (modeName: string, color: string, speed?: number) => void;
  onSetZoneColor: (zoneId: number, hex: string) => void;
  onSetSingleLed: (globalIdx: number, hex: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const selectStyle = estiloSelector(VD);
  const activeMode = device.modes.find((m) => m.id === device.activeMode);
  const [color, setColor] = useState(device.colors[0] ?? '#ffffff');
  const [showLedPainter, setShowLedPainter] = useState(false);
  // Optimistic local colors: updated immediately on LED paint without waiting for API refresh.
  const [localColors, setLocalColors] = useState<string[] | null>(null);
  const displayColors = localColors ?? device.colors;
  // Speed slider state — 0..100 user-facing, applied via onSetMode on commit.
  const [speed, setSpeed] = useState(50);
  const hasSpeed = activeMode?.speedMin !== undefined
    && activeMode.speedMax !== undefined
    && activeMode.speedMin !== activeMode.speedMax;

  // Si cambia el device seleccionado, sincroniza el color local con el primer LED.
  useEffect(() => { setColor(device.colors[0] ?? '#ffffff'); setLocalColors(null); setSpeed(50); }, [device.id]);
  // Reset speed when the active mode changes (different speed range).
  useEffect(() => { setSpeed(50); }, [activeMode?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, letterSpacing: 1 }}>{device.name}</div>
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 4, letterSpacing: 1 }}>
          {device.typeLabel.toUpperCase()} · {device.vendor || '—'}
          {device.description && device.description !== device.name && ` · ${device.description}`}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        <div>
          <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>{t('rgb.color')}</DotLabel>
          <ColorPicker value={color} onChange={(v) => { setColor(v); onSetColor(v); }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>{t('rgb.mode')}</DotLabel>
            <select
              value={activeMode?.name ?? ''}
              onChange={(e) => onSetMode(e.target.value, color)}
              style={selectStyle}
            >
              {device.modes.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Speed slider — only visible when the active mode reports a speed range.
              Commit on `change` (mouse-up) so we don't flood the SDK while dragging. */}
          {hasSpeed && activeMode && (
            <div>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>
                {t('rgb.speed', { n: speed })}
              </DotLabel>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                onMouseUp={() => onSetMode(activeMode.name, color, speed)}
                onTouchEnd={() => onSetMode(activeMode.name, color, speed)}
                onKeyUp={() => onSetMode(activeMode.name, color, speed)}
                style={{ width: '100%', accentColor: accent }}
              />
            </div>
          )}

          <div>
            <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block', marginBottom: 6 }}>{t('rgb.zones')}</DotLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {device.zones.map((z) => {
                const firstColor = displayColors[zoneStartLed(device, z.id)] ?? '#000000';
                return (
                  <div key={z.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: VD.elevated, border: `1px solid ${VD.border}`,
                    borderRadius: VD.radius.md, padding: '6px 8px',
                  }}>
                    <input
                      type="color"
                      value={firstColor}
                      onChange={(e) => onSetZoneColor(z.id, e.target.value)}
                      style={{ width: 26, height: 22, padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.text }}>{z.name}</div>
                      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1 }}>
                        {t('rgb.zoneLeds', { n: z.ledCount })}{z.resizable ? t('rgb.zoneResizable', { min: z.ledsMin, max: z.ledsMax }) : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LED Painter */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DotLabel size={9} color={VD.textMuted} spacing={2} style={{ display: 'block' }}>{t('rgb.paintLeds')}</DotLabel>
              <button
                onClick={() => setShowLedPainter((v) => !v)}
                style={{ background: 'none', border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm, fontFamily: VD.mono, fontSize: 8, color: showLedPainter ? accent : VD.textDim, cursor: 'pointer', padding: '2px 8px', letterSpacing: 0.5 }}
              >
                {showLedPainter ? t('rgb.hide') : t('rgb.show')}
              </button>
            </div>
            {showLedPainter && (
              <LedPainter
                device={device}
                displayColors={displayColors}
                color={color}
                onPaintLed={(globalIdx, hex) => {
                  const next = [...displayColors];
                  next[globalIdx] = hex;
                  setLocalColors(next);
                  onSetSingleLed(globalIdx, hex);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LedPainter({ device, displayColors, color, onPaintLed }: {
  device: RGBDeviceInfo;
  displayColors: string[];
  color: string;
  onPaintLed: (globalIdx: number, hex: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const totalLeds = device.colors.length;
  if (totalLeds === 0) {
    return (
      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6 }}>
        {t('rgb.noLeds')}
      </div>
    );
  }

  const activeMode = device.modes.find((m) => m.id === device.activeMode);
  const isPerLed = activeMode && (activeMode.colorMode === 1 || /^(direct|custom)$/i.test(activeMode.name));

  const dotSize = totalLeds > 80 ? 9 : totalLeds > 40 ? 12 : 16;
  const gap = totalLeds > 80 ? 1 : 2;

  return (
    <div style={{ marginTop: 8 }}>
      {!isPerLed && (
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.warning, marginBottom: 6, letterSpacing: 0.5 }}>
          {t('rgb.notPerLed', { mode: activeMode?.name ?? '?' })}
        </div>
      )}
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginBottom: 6, letterSpacing: 0.5 }}>
        {t('rgb.ledsHint', { n: totalLeds })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap, maxHeight: 200, overflowY: 'auto' }}>
        {device.zones.map((zone) => {
          const start = zoneStartLed(device, zone.id);
          return (
            <React.Fragment key={zone.id}>
              {Array.from({ length: zone.ledCount }, (_, i) => {
                const globalIdx = start + i;
                const ledColor = displayColors[globalIdx] ?? '#000000';
                return (
                  <div
                    key={globalIdx}
                    onClick={() => onPaintLed(globalIdx, color)}
                    title={`${zone.name} LED ${i} (global ${globalIdx})${device.ledNames[globalIdx] ? ' · ' + device.ledNames[globalIdx] : ''}`}
                    style={{
                      width: dotSize, height: dotSize,
                      background: ledColor,
                      border: `1px solid rgba(${VD.trama},0.18)`,
                      borderRadius: 2,
                      cursor: 'crosshair',
                      flexShrink: 0,
                    }}
                  />
                );
              })}
              {/* Zone separator */}
              {zone.id !== device.zones[device.zones.length - 1]?.id && (
                <div style={{ width: 1, height: dotSize, background: VD.borderStrong, flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, marginTop: 4, letterSpacing: 0.5 }}>
        {device.zones.map((z) => `${z.name}(${z.ledCount})`).join(' | ')}
      </div>
    </div>
  );
}

export function zoneStartLed(device: RGBDeviceInfo, zoneId: number): number {
  let cursor = 0;
  for (const z of device.zones) {
    if (z.id === zoneId) return cursor;
    cursor += z.ledCount;
  }
  return 0;
}

export function SaveProfileBar({ onSave, accent, disabled }: { onSave: (name: string) => void; accent: string; disabled?: boolean }) {
  const VD = useTheme();
  const t = useT();
  const [name, setName] = useState('');
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) { onSave(name.trim()); setName(''); } }}
        placeholder={t('rgb.newProfile')}
        disabled={disabled}
        style={{
          flex: 1, background: VD.elevated, border: `1px solid ${VD.border}`,
          padding: '5px 8px', color: VD.text, fontFamily: VD.mono, fontSize: 9,
          outline: 'none', borderRadius: VD.radius.sm,
        }}
      />
      <button
        onClick={() => { if (name.trim()) { onSave(name.trim()); setName(''); } }}
        disabled={disabled}
        style={{
          padding: '5px 10px', background: VD.accentBg, border: `1px solid ${accent}`,
          fontFamily: VD.mono, fontSize: 8, color: accent, cursor: 'pointer',
          borderRadius: VD.radius.sm, letterSpacing: 1,
        }}
      >{t('rgb.save')}</button>
    </div>
  );
}

// Modal calibrador
export function CalibratorModal({
  devices, rgbCfg, accent, pendingSizes, onPendingChange, onSweep, onCommit, onClose,
}: {
  devices: RGBDeviceInfo[];
  rgbCfg: RGBSettings;
  accent: string;
  pendingSizes: Record<string, Record<string, number>>;
  onPendingChange: (next: Record<string, Record<string, number>>) => void;
  onSweep: (deviceId: number, zoneId: number, maxLeds: number) => Promise<void>;
  onCommit: (deviceName: string, deviceId: number, zoneId: number, zoneName: string, size: number) => Promise<void>;
  onClose: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const btnPrimary = estiloBotonPrimario(VD);
  const btnSecondary = estiloBotonSecundario(VD);
  const modalStyle = estiloModal(VD);
  const targets = devices.flatMap((d) =>
    d.zones.filter((z) => z.resizable).map((z) => ({ device: d, zone: z })),
  );

  const setPending = (devName: string, zoneName: string, size: number) => {
    onPendingChange({
      ...pendingSizes,
      [devName]: { ...(pendingSizes[devName] ?? {}), [zoneName]: size },
    });
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${VD.border}` }}>
          <div style={{ fontFamily: VD.mono, fontSize: 12, color: VD.text, letterSpacing: 2 }}>{t('rgb.calibrator')}</div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: VD.textDim, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textDim, lineHeight: 1.6, marginBottom: 14 }}>
            {t('rgb.calibratorHelp')}
          </div>

          {targets.length === 0 && (
            <div style={{ fontFamily: VD.mono, fontSize: 10, color: VD.textMuted }}>{t('rgb.noResizable')}</div>
          )}

          {targets.map(({ device, zone }) => {
            const saved = rgbCfg.zoneSizes?.[device.name]?.[zone.name];
            const pending = pendingSizes[device.name]?.[zone.name];
            const value = pending ?? saved ?? zone.ledCount;
            const hint = KNOWN_ZONE_HINTS.find((h) => h.pattern.test(zone.name) || h.pattern.test(device.name));
            return (
              <div key={`${device.id}-${zone.id}`} style={{
                background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.md,
                padding: 12, marginBottom: 10,
              }}>
                <div style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text }}>{device.name} → {zone.name}</div>
                <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 3, letterSpacing: 1 }}>
                  {t('rgb.range', { min: zone.ledsMin, max: zone.ledsMax, cur: zone.ledCount })}{saved ? t('rgb.saved', { n: saved }) : ''}
                </div>
                {hint && (
                  <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.warning, marginTop: 4 }}>
                    {t('rgb.suggestion', { note: t(hint.note) })}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <input
                    type="range"
                    min={zone.ledsMin}
                    max={zone.ledsMax}
                    value={value}
                    onChange={(e) => setPending(device.name, zone.name, parseInt(e.target.value, 10))}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="number"
                    min={zone.ledsMin}
                    max={zone.ledsMax}
                    value={value}
                    onChange={(e) => {
                      const n = Math.max(zone.ledsMin, Math.min(zone.ledsMax, parseInt(e.target.value, 10) || zone.ledsMin));
                      setPending(device.name, zone.name, n);
                    }}
                    style={{
                      width: 60, background: VD.bg, border: `1px solid ${VD.border}`,
                      color: VD.text, fontFamily: VD.mono, fontSize: 10, padding: '3px 6px',
                      borderRadius: VD.radius.sm, outline: 'none', textAlign: 'center',
                    }}
                  />
                  <button
                    onClick={() => onSweep(device.id, zone.id, value)}
                    style={{ ...btnSecondary, borderColor: accent, color: accent }}
                  >{t('rgb.identify')}</button>
                  <button
                    onClick={() => onCommit(device.name, device.id, zone.id, zone.name, value)}
                    style={{ ...btnPrimary, background: accent, color: '#000', borderColor: accent }}
                  >{t('rgb.save')}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Estilos compartidos ─────────────────────────────────────────────────────
export function estiloBotonPrimario(VD: VDTokens): React.CSSProperties {
  return {
    padding: '6px 12px', fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
    background: 'transparent', border: `1px solid ${VD.borderStrong}`,
    color: VD.text, cursor: 'pointer', borderRadius: VD.radius.sm,
  };
}
export function estiloBotonSecundario(VD: VDTokens): React.CSSProperties {
  return {
    padding: '5px 10px', fontFamily: VD.mono, fontSize: 9, letterSpacing: 1,
    background: VD.elevated, border: `1px solid ${VD.border}`,
    color: VD.textDim, cursor: 'pointer', borderRadius: VD.radius.sm,
  };
}
export function estiloSelector(VD: VDTokens): React.CSSProperties {
  return {
    width: '100%', padding: '5px 8px',
    background: VD.elevated, border: `1px solid ${VD.border}`,
    color: VD.text, fontFamily: VD.mono, fontSize: 10,
    outline: 'none', borderRadius: VD.radius.sm,
  };
}
export const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
};
export function estiloModal(VD: VDTokens): React.CSSProperties {
  return {
    width: 'min(700px, 92vw)', maxHeight: '85vh',
    background: VD.surface, border: `1px solid ${VD.borderStrong}`,
    borderRadius: VD.radius.lg, boxShadow: VD.shadow.modal,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };
}
