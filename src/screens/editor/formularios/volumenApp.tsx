import React, { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../../../utils/theme';
import { useT, useFieldText, type TFunc } from '../../../utils/i18n';
import { Field } from '../comunes';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { Chip, Segmentado } from '../../../components/ui/Chip';
import { SelectorApp } from '../../../components/SelectorApp';
import { normalizarApp } from '../../../utils/apps';
import type { SesionAudioApp } from '../../../types';
import type { PropsFormulario } from './base';

/**
 * Volumen de una app concreta (lo que enseña el Mezclador de volumen).
 *
 * El destino es «app activa» (vacío = la que esté delante) o una concreta, que
 * se elige con `SelectorApp` y además entre las que tienen sonido abierto ahora
 * (`audioSessions`): no siempre coinciden con las de ventana (WhatsApp suena
 * como `msedgewebview2`).
 */

type ModoAppVolume = 'adjust' | 'set' | 'mute';

type TextoCampo = (k: string, p?: Record<string, string | number>) => string;

/** Si aún no hay destino, propone lo que está sonando (o Spotify, el caso más común). */
function proponerDestino(target: string | undefined, sesiones: SesionAudioApp[]): string {
  if (target?.trim()) return target;
  return sesiones[0] ? normalizarApp(sesiones[0].proceso) : 'spotify';
}

interface PropsModo {
  modo: ModoAppVolume;
  onElegir: (m: ModoAppVolume) => void;
  accent: string;
  t: TextoCampo;
}

function BotonesModo({ modo, onElegir, accent, t }: PropsModo) {
  return (
    <Segmentado
      repartir
      accent={accent}
      valor={modo}
      onChange={onElegir}
      opciones={[
        { valor: 'adjust', etiqueta: t('ed.appVolume.adjust') },
        { valor: 'set', etiqueta: t('ed.appVolume.set') },
        { valor: 'mute', etiqueta: t('ed.appVolume.mute') },
      ]}
    />
  );
}

interface PropsFicha {
  sesion: SesionAudioApp;
  elegida: boolean;
  onElegir: (proc: string) => void;
  accent: string;
}

function FichaSesion({ sesion, elegida, onElegir, accent }: PropsFicha) {
  const proc = normalizarApp(sesion.proceso);
  return (
    <Chip
      activo={elegida}
      onClick={() => onElegir(proc)}
      title={`${sesion.volumen}%${sesion.silenciada ? ' · mute' : ''}`}
      accent={accent}
    >
      {elegida && <DotGlyphIcon glyph="CHECK" size={8} color={accent} />}
      <span>{proc}</span>
      <span style={{ opacity: 0.7 }}>{sesion.silenciada ? 'mute' : `${sesion.volumen}%`}</span>
    </Chip>
  );
}

interface PropsSonando {
  sesiones: SesionAudioApp[];
  objetivo: string;
  cargando: boolean;
  onElegir: (proc: string) => void;
  onRecargar: () => void;
  VD: ReturnType<typeof useTheme>;
  accent: string;
  t: TextoCampo;
  tf: TFunc;
}

function ListaSonando({ sesiones, objetivo, cargando, onElegir, onRecargar, VD, accent, t, tf }: PropsSonando) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <span style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textDim, letterSpacing: 1 }}>
          {t('ed.appVolume.sounding')} ({sesiones.length})
        </span>
        <button
          type="button"
          onClick={onRecargar}
          disabled={cargando}
          style={{
            background: 'transparent', border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm,
            padding: '3px 7px', color: VD.textDim, cursor: cargando ? 'default' : 'pointer',
            fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5, minHeight: 24, boxSizing: 'border-box',
          }}
        >
          {tf('RECARGAR')}
        </button>
      </div>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto',
          padding: 8, marginTop: 6, background: VD.elevated,
          borderRadius: VD.radius.sm, border: `1px solid ${VD.border}`, boxSizing: 'border-box',
        }}
      >
        {sesiones.length === 0 ? (
          <div style={{ fontFamily: VD.mono, fontSize: 8.5, color: VD.textMuted, padding: '8px 4px', width: '100%', textAlign: 'center', letterSpacing: 0.5 }}>
            {t('ed.appVolume.noSessions')}
          </div>
        ) : (
          sesiones.map((s) => (
            <FichaSesion
              key={s.proceso}
              sesion={s}
              elegida={objetivo.toLowerCase() === normalizarApp(s.proceso)}
              onElegir={onElegir}
              accent={accent}
            />
          ))
        )}
      </div>
    </>
  );
}

export function FormAppVolume(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const tf = useFieldText();
  const { accent, action, setAction } = p;
  const modo: ModoAppVolume = action.appVolumeMode ?? 'adjust';
  const objetivo = (action.appVolumeTarget ?? '').trim();
  const especifica = objetivo !== '';
  const [sesiones, setSesiones] = useState<SesionAudioApp[]>([]);
  const [cargando, setCargando] = useState(false);

  const refrescarSesiones = useCallback(async () => {
    if (!window.electronAPI?.audio?.sessions) return;
    setCargando(true);
    try {
      setSesiones((await window.electronAPI.audio.sessions()) ?? []);
    } catch {
      // Ignorar fallo de sondeo
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    refrescarSesiones();
  }, [refrescarSesiones]);

  const elegirModo = (m: ModoAppVolume) => {
    setAction((a) => ({
      ...a,
      appVolumeMode: m,
      ...(m === 'adjust' && a.appVolumeDelta === undefined ? { appVolumeDelta: 5 } : {}),
      ...(m === 'set' && a.appVolumeLevel === undefined ? { appVolumeLevel: 50 } : {}),
    }));
  };

  const delta = action.appVolumeDelta ?? 5;
  const nivel = action.appVolumeLevel ?? 50;

  return (
    <>
      <Field label={t('ed.appVolume.mode')}>
        <BotonesModo modo={modo} onElegir={elegirModo} accent={accent} t={t} />
      </Field>

      {modo === 'adjust' && (
        <Field label={tf('CUÁNTO CAMBIA CADA PULSACIÓN')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range" min={-50} max={50} step={5} value={delta}
              onChange={(e) => setAction((a) => ({ ...a, appVolumeDelta: parseInt(e.target.value, 10) }))}
              style={{ flex: 1, accentColor: accent }}
            />
            <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 48, textAlign: 'right' }}>
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          </div>
        </Field>
      )}

      {modo === 'set' && (
        <Field label={tf('NIVEL DE VOLUMEN')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="range" min={0} max={100} step={5}
              value={nivel}
              onChange={(e) => setAction((a) => ({ ...a, appVolumeLevel: parseInt(e.target.value, 10) }))}
              style={{ flex: 1, accentColor: accent }}
            />
            <span style={{ fontFamily: VD.mono, fontSize: 14, color: VD.text, minWidth: 40, textAlign: 'right' }}>
              {nivel}%
            </span>
          </div>
        </Field>
      )}

      {modo === 'mute' && (
        <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('ed.appVolume.muteHint')}
        </div>
      )}

      <Field label={t('ed.appVolume.app')}>
        <div style={{ marginBottom: especifica ? 8 : 0 }}>
          <Segmentado<'activa' | 'especifica'>
            repartir
            accent={accent}
            valor={especifica ? 'especifica' : 'activa'}
            onChange={(val) => {
              if (val === 'activa') {
                setAction((a) => ({ ...a, appVolumeTarget: undefined }));
              } else {
                const propuesto = proponerDestino(action.appVolumeTarget, sesiones);
                setAction((a) => ({ ...a, appVolumeTarget: propuesto }));
              }
            }}
            opciones={[
              { valor: 'activa', etiqueta: t('ed.appVolume.active') },
              { valor: 'especifica', etiqueta: t('ed.appVolume.specific') },
            ]}
          />
        </div>
        {especifica && (
          <>
            <SelectorApp
              valor={action.appVolumeTarget ?? ''}
              onElegir={(app) => setAction((a) => ({ ...a, appVolumeTarget: app.trim() || undefined }))}
            />
            <ListaSonando
              sesiones={sesiones}
              objetivo={objetivo}
              cargando={cargando}
              onElegir={(proc) => setAction((a) => ({ ...a, appVolumeTarget: proc }))}
              onRecargar={refrescarSesiones}
              VD={VD}
              accent={accent}
              t={t}
              tf={tf}
            />
          </>
        )}
      </Field>
    </>
  );
}
