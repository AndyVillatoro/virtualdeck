import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useFieldText } from '../../../utils/i18n';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { SensorPicker, estiloEntrada } from '../comunes';
import type { Sensor } from '../../../types';

type SensorOp = '>' | '<' | '>=' | '<=' | '==';

interface CampoSensorCondicionProps {
  sensors: Sensor[];
  sensorId: string;
  onSensorIdChange: (id: string) => void;
  op: SensorOp;
  onOpChange: (op: SensorOp) => void;
  val: string;
  onValChange: (v: string) => void;
  cooldown?: string;
  onCooldownChange?: (cd: string) => void;
  accent: string;
  modo: 'visibilidad' | 'disparador';
}

const OPERADORES: { op: SensorOp; label: string }[] = [
  { op: '>', label: '>' },
  { op: '<', label: '<' },
  { op: '==', label: '=' },
  { op: '>=', label: '≥' },
  { op: '<=', label: '≤' },
];

const COOLDOWNS = ['0', '5', '10', '30', '60'];

function OperadoresFichas({
  op,
  onOpChange,
  accent,
  vd,
}: {
  op: SensorOp;
  onOpChange: (op: SensorOp) => void;
  accent: string;
  vd: ReturnType<typeof useTheme>;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {OPERADORES.map((item) => {
        const activo = op === item.op;
        return (
          <button
            key={item.op}
            type="button"
            onClick={() => onOpChange(item.op)}
            style={{
              minHeight: 32,
              minWidth: 36,
              padding: '4px 10px',
              background: activo ? `${accent}24` : vd.surface,
              border: `1px solid ${activo ? accent : vd.border}`,
              borderRadius: vd.radius.sm,
              color: activo ? accent : vd.text,
              fontFamily: vd.mono,
              fontSize: 11,
              fontWeight: activo ? 700 : 400,
              cursor: 'pointer',
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function FilaUmbral({
  val,
  onValChange,
  sensorActual,
  accent,
  vd,
  tf,
}: {
  val: string;
  onValChange: (v: string) => void;
  sensorActual?: Sensor;
  accent: string;
  vd: ReturnType<typeof useTheme>;
  tf: (s: string) => string;
}) {
  const tieneValorActual = sensorActual && Number.isFinite(sensorActual.value);

  const handleUsarActual = () => {
    if (!sensorActual) return;
    const num = sensorActual.kind === 'Voltage'
      ? sensorActual.value.toFixed(2)
      : Math.round(sensorActual.value).toString();
    onValChange(num);
  };

  return (
    <div>
      <div style={{ fontFamily: vd.mono, fontSize: 8, color: vd.textDim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {tf('UMBRAL')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={val}
          onChange={(e) => onValChange(e.target.value)}
          placeholder={tf("Valor (ej. 80)")}
          style={{ ...estiloEntrada(vd), width: 110, minHeight: 32, boxSizing: 'border-box' }}
        />
        {sensorActual?.unit && (
          <span
            style={{
              fontFamily: vd.mono,
              fontSize: 10,
              fontWeight: 700,
              color: accent,
              padding: '4px 8px',
              background: `${accent}14`,
              border: `1px solid ${accent}44`,
              borderRadius: vd.radius.sm,
              minHeight: 32,
              display: 'inline-flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            {sensorActual.unit}
          </span>
        )}

        {tieneValorActual && (
          <button
            type="button"
            onClick={handleUsarActual}
            style={{
              minHeight: 32,
              padding: '4px 10px',
              background: vd.elevated,
              border: `1px solid ${vd.border}`,
              borderRadius: vd.radius.sm,
              color: vd.textDim,
              fontFamily: vd.mono,
              fontSize: 8.5,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxSizing: 'border-box',
            }}
          >
            <DotGlyphIcon glyph="CHECK" size={8} color={accent} />
            <span>
              {tf('USAR VALOR ACTUAL')} ({sensorActual.kind === 'Voltage' ? sensorActual.value.toFixed(2) : Math.round(sensorActual.value)} {sensorActual.unit})
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function FichasCooldown({
  cooldown,
  onCooldownChange,
  accent,
  vd,
  tf,
}: {
  cooldown?: string;
  onCooldownChange?: (cd: string) => void;
  accent: string;
  vd: ReturnType<typeof useTheme>;
  tf: (s: string) => string;
}) {
  const cdVal = cooldown ?? '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
      <div style={{ fontFamily: vd.mono, fontSize: 8, color: vd.textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {tf('TIEMPO DE ESPERA ENTRE DISPAROS (COOLDOWN)')}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {COOLDOWNS.map((c) => {
          const activo = cdVal === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onCooldownChange?.(c)}
              style={{
                minHeight: 32,
                padding: '4px 8px',
                background: activo ? `${accent}24` : vd.surface,
                border: `1px solid ${activo ? accent : vd.border}`,
                borderRadius: vd.radius.sm,
                color: activo ? accent : vd.text,
                fontFamily: vd.mono,
                fontSize: 9,
                fontWeight: activo ? 600 : 400,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {c === '0' ? `0 s (${tf('inmediato')})` : `${c} s`}
            </button>
          );
        })}
        <input
          value={cdVal}
          onChange={(e) => onCooldownChange?.(e.target.value.replace(/\D/g, ''))}
          placeholder="s"
          style={{
            ...estiloEntrada(vd),
            width: 60,
            minHeight: 32,
            boxSizing: 'border-box',
            textAlign: 'center',
          }}
        />
        <span style={{ fontFamily: vd.mono, fontSize: 9, color: vd.textDim }}>{tf('segundos')}</span>
      </div>
    </div>
  );
}

function DescripcionSensor({
  sensorId,
  val,
  modo,
  sensorActual,
  op,
  tf,
}: {
  sensorId: string;
  val: string;
  modo: 'visibilidad' | 'disparador';
  sensorActual?: Sensor;
  op: SensorOp;
  tf: (s: string) => string;
}) {
  if (!sensorId || !val) {
    return (
      <span>
        {modo === 'visibilidad'
          ? tf('Muestra u oculta este botón automáticamente según el valor en tiempo real de un sensor del sistema.')
          : tf('Ejecuta esta acción automáticamente cuando un sensor alcance o supere un umbral.')}
      </span>
    );
  }

  const detalle = `(${sensorActual?.name ?? sensorId} ${op} ${val} ${sensorActual?.unit ?? ''})`;
  const base = modo === 'visibilidad'
    ? tf('El botón solo es visible cuando el sensor supere o cumpla el umbral configurado.')
    : tf('Se pulsa automáticamente cuando el sensor supere o cumpla el umbral configurado.');

  return (
    <span>
      {base} {detalle}
    </span>
  );
}

export function CampoSensorCondicion({
  sensors,
  sensorId,
  onSensorIdChange,
  op,
  onOpChange,
  val,
  onValChange,
  cooldown,
  onCooldownChange,
  accent,
  modo,
}: CampoSensorCondicionProps) {
  const VD = useTheme();
  const tf = useFieldText();

  const sensorActual = sensors.find((s) => s.id === sensorId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <SensorPicker
            sensors={sensors}
            value={sensorId}
            onChange={onSensorIdChange}
            accent={accent}
            allowEmpty
          />
        </div>
        {sensorId && (
          <button
            type="button"
            onClick={() => {
              onSensorIdChange('');
              onValChange('');
            }}
            title={tf('QUITAR CONDICIÓN DE SENSOR')}
            style={{
              minHeight: 32,
              padding: '4px 8px',
              background: 'transparent',
              border: `1px solid ${VD.border}`,
              borderRadius: VD.radius.sm,
              color: VD.danger,
              fontFamily: VD.mono,
              fontSize: 8.5,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxSizing: 'border-box',
            }}
          >
            <DotGlyphIcon glyph="CLOSE" size={8} color={VD.danger} />
            <span>{tf('QUITAR')}</span>
          </button>
        )}
      </div>

      {sensorId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
          {/* Fichas de operadores */}
          <div>
            <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {tf('OPERADOR')}
            </div>
            <OperadoresFichas op={op} onOpChange={onOpChange} accent={accent} vd={VD} />
          </div>

          {/* Umbral con unidad al lado y botón valor actual */}
          <FilaUmbral
            val={val}
            onValChange={onValChange}
            sensorActual={sensorActual}
            accent={accent}
            vd={VD}
            tf={tf}
          />

          {/* Cooldown para modo disparador */}
          {modo === 'disparador' && (
            <FichasCooldown
              cooldown={cooldown}
              onCooldownChange={onCooldownChange}
              accent={accent}
              vd={VD}
              tf={tf}
            />
          )}
        </div>
      )}

      {/* Línea descriptiva */}
      <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted }}>
        <DescripcionSensor
          sensorId={sensorId}
          val={val}
          modo={modo}
          sensorActual={sensorActual}
          op={op}
          tf={tf}
        />
      </div>
    </div>
  );
}
