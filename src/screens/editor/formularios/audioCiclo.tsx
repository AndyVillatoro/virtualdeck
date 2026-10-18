import React from 'react';
import { useTheme } from '../../../utils/theme';
import { useT } from '../../../utils/i18n';
import { Field, estiloEntrada } from '../comunes';
import { Segmentado } from '../../../components/ui/Chip';
import { DotGlyphIcon } from '../../../components/dot480/DotGlyphIcon';
import { heuristicaAudioDispositivo } from '../../../comun/audioIcono';
import { mismoDispositivoAudio, normalizarNombreAudio } from '../../../utils/acciones/audio';
import type { AudioMode } from '../../../types';
import type { PropsFormulario } from './base';

/**
 * T-AUD-03, Fase 1 — El modo del botón de audio y sus listas.
 *
 * Va en su propio archivo y no dentro de `sistema.tsx` porque ese ya roza el
 * tope de 600 líneas: aquí viven el selector FIJA/ROTAR TODO/LISTA, la lista
 * de excluidas de `cycle-all` y la lista fija de `cycle-list` en su orden.
 */

function estiloFila(VD: ReturnType<typeof useTheme>, marcada: boolean, accent: string) {
  return {
    background: marcada ? VD.accentBg : VD.elevated,
    border: `1px solid ${marcada ? accent : VD.border}`,
    borderRadius: VD.radius.md, padding: '10px 12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  } as const;
}

function estiloAyuda(VD: ReturnType<typeof useTheme>) {
  return {
    fontFamily: VD.mono, fontSize: 9, color: VD.textMuted, marginTop: 6, lineHeight: 1.5,
  } as const;
}

/** Añade o quita un valor comparando sin caja ni espacios de más. */
function conmutarTexto(lista: string[], valor: string): string[] {
  const aguja = valor.trim().toLowerCase();
  const i = lista.findIndex((e) => (e ?? '').trim().toLowerCase() === aguja);
  if (i >= 0) return lista.filter((_, j) => j !== i);
  return [...lista, valor];
}

export function SeccionModoAudio(p: PropsFormulario) {
  const VD = useTheme();
  const t = useT();
  const { accent, action, setAction, audioDevices } = p;
  const modo: AudioMode = action.audioMode ?? 'fixed';

  const ayuda = modo === 'cycle-all'
    ? t('ed.audio.ayudaTodas')
    : modo === 'cycle-list'
      ? t('ed.audio.ayudaLista')
      : t('ed.audio.ayudaFija');

  const excluidas = new Set((action.excludedDeviceIds ?? []).map((e) => (e ?? '').trim().toLowerCase()));
  const candidatas = action.audioCandidates ?? [];

  const alternarExcluida = (id: string) => {
    setAction((a) => ({ ...a, excludedDeviceIds: conmutarTexto(a.excludedDeviceIds ?? [], id) }));
  };
  const alternarCandidata = (id: string, name: string) => {
    setAction((a) => {
      const lista = a.audioCandidates ?? [];
      const i = lista.findIndex((c) => mismoDispositivoAudio(c.deviceId, id));
      if (i >= 0) return { ...a, audioCandidates: lista.filter((_, j) => j !== i) };
      return { ...a, audioCandidates: [...lista, { deviceId: id, deviceName: name }] };
    });
  };
  const renombrarCandidata = (id: string, etiqueta: string) => {
    setAction((a) => ({
      ...a,
      audioCandidates: (a.audioCandidates ?? []).map((c) =>
        mismoDispositivoAudio(c.deviceId, id) ? { ...c, label: etiqueta || undefined } : c),
    }));
  };

  return (
    <>
      <Field label={t('ed.audio.modo')}>
        <Segmentado
          repartir
          accent={accent}
          valor={modo}
          onChange={(o) => setAction((a) => ({ ...a, audioMode: o }))}
          opciones={[
            { valor: 'fixed', etiqueta: t('ed.audio.fijo') },
            { valor: 'cycle-all', etiqueta: t('ed.audio.todas') },
            { valor: 'cycle-list', etiqueta: t('ed.audio.lista') },
          ]}
        />
        <div style={estiloAyuda(VD)}>{ayuda}</div>
      </Field>
      {modo === 'cycle-all' && (
        <Field label={t('ed.audio.excluir')}>
          {audioDevices.length === 0 && (
            <div style={estiloAyuda(VD)}>{t('ed.audio.sinDispositivos')}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {audioDevices.map((dev) => {
              const marcada = excluidas.has(dev.id.trim().toLowerCase())
                || excluidas.has(normalizarNombreAudio(dev.name));
              return (
                <div
                  key={dev.id}
                  onClick={() => alternarExcluida(dev.id)}
                  style={estiloFila(VD, marcada, accent)}
                >
                  <span style={{ fontFamily: VD.mono, fontSize: 11, color: VD.text }}>{dev.name}</span>
                  {marcada && (
                    <span style={{ fontFamily: VD.mono, fontSize: 9, color: accent, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <DotGlyphIcon glyph="CHECK" size={7} color={accent} />
                      {t('ed.audio.excluida')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Field>
      )}
      {modo === 'cycle-list' && (
        <Field label={t('ed.audio.candidatas')}>
          {audioDevices.length === 0 && (
            <div style={estiloAyuda(VD)}>{t('ed.audio.sinDispositivos')}</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {audioDevices.map((dev) => {
              const marcada = candidatas.some((c) => mismoDispositivoAudio(c.deviceId, dev.id));
              const h = heuristicaAudioDispositivo(dev.name);
              return (
                <div
                  key={dev.id}
                  onClick={() => alternarCandidata(dev.id, dev.name)}
                  style={estiloFila(VD, marcada, accent)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: VD.mono, fontSize: 11, color: VD.text }}>
                    <DotGlyphIcon glyph={h.glifo} size={10} color={marcada ? accent : VD.textDim} />
                    <span>{dev.name}</span>
                  </span>
                  {marcada && <DotGlyphIcon glyph="CHECK" size={8} color={accent} />}
                </div>
              );
            })}
          </div>
          {candidatas.length > 0 && (
            <div style={estiloAyuda(VD)}>
              {t('ed.audio.orden', {
                nombres: candidatas.map((c) => c.label || c.deviceName).join(' → '),
              })}
            </div>
          )}
          {candidatas.map((c) => (
            <div key={c.deviceId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <span style={{ fontFamily: VD.mono, fontSize: 9, color: VD.textDim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.deviceName}
              </span>
              <input
                value={c.label ?? ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => renombrarCandidata(c.deviceId, e.target.value)}
                placeholder={t('ed.audio.etiqueta')}
                style={{ ...estiloEntrada(VD), width: 110, fontSize: 11 }}
              />
            </div>
          ))}
        </Field>
      )}
    </>
  );
}
