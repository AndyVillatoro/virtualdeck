import React from 'react';
import { useTheme } from '../../utils/theme';
import { DotGlyphIcon } from '../../components/dot480/DotGlyphIcon';
import type { DispositivoItem } from './ListaDispositivosHardware';
import type { DisposicionSuperficie } from '../../types/superficies';

const OPCIONES_ROTACION = [0, 90, 180, 270] as const;

export function generarResumenControles(
  d: DisposicionSuperficie,
  t: (k: string, p?: Record<string, number | string>) => string,
): string {
  const partes: string[] = [];
  const k = d.controles.filter((c) => c.tipo === 'key').length;
  const b = d.controles.filter((c) => c.tipo === 'button').length;
  const p = d.controles.filter((c) => c.tipo === 'knob').length;
  const s = d.controles.filter((c) => c.tipo === 'swipe').length;
  if (k > 0) partes.push(t('disp.resumen.teclas', { n: k }));
  if (b > 0) partes.push(t('disp.resumen.botones', { n: b }));
  if (p > 0) partes.push(t('disp.resumen.perillas', { n: p }));
  if (s > 0) partes.push(t('disp.resumen.tiras', { n: s }));
  return partes.join(' · ');
}

export function InsigniaNoVerificado({
  vd,
  titulo,
  descripcion,
}: {
  vd: ReturnType<typeof useTheme>;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: vd.space.xs,
        marginTop: 4,
        padding: '2px 8px',
        background: `${vd.warning}18`,
        border: `1px solid ${vd.warning}66`,
        borderRadius: vd.radius.sm,
        color: vd.warning,
        fontSize: 8.5,
        fontFamily: vd.mono,
      }}
    >
      <DotGlyphIcon glyph="WARN" size={10} color={vd.warning} />
      <span style={{ fontWeight: 600, letterSpacing: 0.5 }}>{titulo}</span>
      <span style={{ opacity: 0.6 }}>·</span>
      <span>{descripcion}</span>
    </div>
  );
}

export function ControlRotacion({
  rotacionActual,
  conectado,
  vd,
  labelRotacion,
  ayudaRotacion,
  onCambiarRotacion,
}: {
  rotacionActual: number;
  conectado: boolean;
  vd: ReturnType<typeof useTheme>;
  labelRotacion: string;
  ayudaRotacion: string;
  onCambiarRotacion: (grados: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: vd.space.sm }}>
        <DotGlyphIcon glyph="ROTATE_CW" size={12} color={vd.textMuted} />
        <label style={{ fontSize: 8.5, color: vd.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
          {labelRotacion}:
        </label>
        <div style={{ display: 'flex', gap: 2 }}>
          {OPCIONES_ROTACION.map((grados) => {
            const activo = rotacionActual === grados;
            return (
              <button
                key={grados}
                type="button"
                disabled={!conectado}
                onClick={() => onCambiarRotacion(grados)}
                style={{
                  background: activo ? vd.accent : vd.elevated,
                  border: `1px solid ${activo ? vd.accent : vd.border}`,
                  color: activo ? vd.bg : vd.text,
                  fontSize: 8.5,
                  fontFamily: vd.mono,
                  fontWeight: activo ? 600 : 400,
                  padding: '2px 6px',
                  borderRadius: vd.radius.sm,
                  cursor: conectado ? 'pointer' : 'default',
                  opacity: conectado ? 1 : 0.5,
                  transition: 'all 0.15s ease',
                }}
              >
                {`${grados}°`}
              </button>
            );
          })}
        </div>
      </div>
      <span style={{ fontSize: 7.5, color: vd.textMuted, fontStyle: 'italic' }}>
        {ayudaRotacion}
      </span>
    </div>
  );
}

export function ControlBrillo({
  brillo,
  conectado,
  vd,
  labelBrillo,
  onChangeVivo,
  onCommit,
}: {
  brillo: number;
  conectado: boolean;
  vd: ReturnType<typeof useTheme>;
  labelBrillo: string;
  onChangeVivo: (val: number) => void;
  onCommit: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: vd.space.sm }}>
      <DotGlyphIcon glyph="BRIGHTNESS" size={12} color={vd.textMuted} />
      <label style={{ fontSize: 8.5, color: vd.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>
        {labelBrillo}:
      </label>
      <input
        type="range"
        min={0}
        max={100}
        value={brillo}
        disabled={!conectado}
        onChange={(e) => onChangeVivo(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
        style={{
          width: 120,
          accentColor: vd.accent,
          cursor: conectado ? 'pointer' : 'default',
        }}
      />
      <span style={{ fontSize: 9, minWidth: 28, color: vd.text }}>
        {`${brillo}%`}
      </span>
    </div>
  );
}

export function AvisoModeloDesconocido({
  vd,
  titulo,
  descripcion,
}: {
  vd: ReturnType<typeof useTheme>;
  titulo: string;
  descripcion: string;
}) {
  return (
    <div
      style={{
        background: vd.surface,
        border: `1px solid ${vd.border}`,
        borderRadius: vd.radius.md,
        padding: vd.space['2xl'],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vd.space.md,
        textAlign: 'center',
        color: vd.textMuted,
        flex: 1,
      }}
    >
      <DotGlyphIcon glyph="WARN" size={28} color={vd.warning} />
      <div style={{ fontSize: 12, fontWeight: 600, color: vd.text }}>
        {titulo}
      </div>
      <div style={{ fontSize: 9.5, maxWidth: 360, lineHeight: 1.5 }}>
        {descripcion}
      </div>
    </div>
  );
}

export function HeaderDispositivoActivo({
  dispositivoActivo,
  disposicionActiva,
  resumenControles,
  tieneLcds,
  rotacionActual,
  brilloLocal,
  vd,
  t,
  onCambiarRotacion,
  onBrilloMoving,
  onBrilloCommit,
}: {
  dispositivoActivo: DispositivoItem;
  disposicionActiva: DisposicionSuperficie | null;
  resumenControles: string;
  tieneLcds: boolean;
  rotacionActual: number;
  brilloLocal: number;
  vd: ReturnType<typeof useTheme>;
  t: (k: string, p?: Record<string, string | number>) => string;
  onCambiarRotacion: (grados: number) => void;
  onBrilloMoving: (val: number) => void;
  onBrilloCommit: () => void;
}) {
  return (
    <div
      style={{
        background: vd.surface,
        border: `1px solid ${vd.border}`,
        borderRadius: vd.radius.md,
        padding: `${vd.space.sm}px ${vd.space.md}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: vd.space.md,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: vd.space.sm }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: vd.text }}>
            {dispositivoActivo.nombre}
          </span>
        </div>

        {resumenControles && (
          <div style={{ fontSize: 8.5, color: vd.textMuted, marginTop: 2 }}>
            {resumenControles}
          </div>
        )}

        {disposicionActiva && !disposicionActiva.verificado && (
          <InsigniaNoVerificado
            vd={vd}
            titulo={t('disp.experimental')}
            descripcion={t('disp.experimentalDesc')}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: vd.space.lg, flexWrap: 'wrap' }}>
        {tieneLcds && (
          <ControlRotacion
            rotacionActual={rotacionActual}
            conectado={dispositivoActivo.conectado}
            vd={vd}
            labelRotacion={t('disp.rotacion')}
            ayudaRotacion={t('disp.rotacionAyuda')}
            onCambiarRotacion={onCambiarRotacion}
          />
        )}

        <ControlBrillo
          brillo={brilloLocal}
          conectado={dispositivoActivo.conectado}
          vd={vd}
          labelBrillo={t('disp.brillo')}
          onChangeVivo={onBrilloMoving}
          onCommit={onBrilloCommit}
        />
      </div>
    </div>
  );
}

export function BannersDispositivoActivo({
  conectado,
  indicePagina,
  vd,
  t,
}: {
  conectado: boolean;
  indicePagina: number;
  vd: ReturnType<typeof useTheme>;
  t: (k: string) => string;
}) {
  return (
    <>
      {!conectado && (
        <div
          style={{
            background: `${vd.warning}18`,
            border: `1px solid ${vd.warning}`,
            color: vd.warning,
            borderRadius: vd.radius.md,
            padding: `${vd.space.sm}px ${vd.space.md}px`,
            display: 'flex',
            alignItems: 'center',
            gap: vd.space.sm,
            fontSize: 9.5,
          }}
        >
          <DotGlyphIcon glyph="WARN" size={12} color={vd.warning} />
          <span>{t('disp.avisoDesconectado')}</span>
        </div>
      )}

      {indicePagina < 0 && (
        <div
          style={{
            background: `${vd.warning}18`,
            border: `1px solid ${vd.warning}`,
            color: vd.warning,
            borderRadius: vd.radius.md,
            padding: `${vd.space.sm}px ${vd.space.md}px`,
            display: 'flex',
            alignItems: 'center',
            gap: vd.space.sm,
            fontSize: 9.5,
          }}
        >
          <DotGlyphIcon glyph="WARN" size={12} color={vd.warning} />
          <span>{t('disp.avisoSinPagina')}</span>
        </div>
      )}
    </>
  );
}
