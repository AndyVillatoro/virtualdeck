import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { EntradaGaleria, ResumenRiesgo } from '../../types';
import { estiloBotonMiniAjustes } from './settingHelpers';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';

/** Nada que enseñar: ninguna lista trae nada. */
function nadaRiesgoso(r: ResumenRiesgo): boolean {
  return r.scripts.length === 0 && r.programas.length === 0 &&
    (r.webhooks?.length ?? 0) === 0 && (r.teclas?.length ?? 0) === 0 &&
    r.automaticos.length === 0 && r.integraciones.length === 0;
}

/** Cada lista de riesgo con su título. Solo pinta lo que trae algo. */
function BloquesRiesgo({ riesgo }: { riesgo: ResumenRiesgo }) {
  const VD = useTheme();
  const t = useT();
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };
  return (
    <>
      <div style={menudo}>{t('gal.counts', { n: riesgo.botones })}</div>
      {riesgo.programas.length > 0 && (
        <div style={menudo}>
          {t('gal.launches')}
          {riesgo.programas.map((p, i) => <div key={i} style={{ color: VD.textDim }}>· {p}</div>)}
        </div>
      )}
      {riesgo.scripts.length > 0 && (
        <div style={menudo}>
          {t('gal.runs')}
          {riesgo.scripts.map((s, i) => (
            <div key={i} style={{ color: VD.danger, wordBreak: 'break-all' }}>· {s}</div>
          ))}
        </div>
      )}
      {(riesgo.webhooks?.length ?? 0) > 0 && (
        <div style={menudo}>
          {t('gal.sends')}
          {riesgo.webhooks!.map((w, i) => <div key={i} style={{ color: VD.textDim }}>· {w}</div>)}
        </div>
      )}
      {(riesgo.teclas?.length ?? 0) > 0 && (
        <div style={menudo}>
          {t('gal.types')}
          {riesgo.teclas!.map((k, i) => (
            <div key={i} style={{ color: VD.danger, wordBreak: 'break-all' }}>· {k}</div>
          ))}
        </div>
      )}
      {riesgo.automaticos.length > 0 && (
        <div style={menudo}>
          {t('gal.auto')}
          {riesgo.automaticos.map((a, i) => <div key={i} style={{ color: VD.warning }}>· {a}</div>)}
        </div>
      )}
      {riesgo.integraciones.length > 0 && (
        <div style={menudo}>
          {t('gal.integrations')}
          {riesgo.integraciones.map((g, i) => <div key={i} style={{ color: VD.textDim }}>· {g}</div>)}
        </div>
      )}
      {riesgo.atajosGlobales.length > 0 && (
        <div style={menudo}>{t('gal.hotkeys', { list: riesgo.atajosGlobales.join(', ') })}</div>
      )}
      {nadaRiesgoso(riesgo) && <div style={menudo}>{t('gal.nothingRisky')}</div>}
    </>
  );
}

/**
 * Ficha de lo elegido: qué va a ejecutar, sin recortar, y cómo traerlo.
 * Un perfil no son datos, es código que se ejecutará al pulsar sus botones.
 */
export function FichaRiesgoGaleria({ entrada, riesgo, puedeAgregarPagina, onImportar, onImportarPagina, onCerrar }: {
  entrada: EntradaGaleria;
  riesgo: ResumenRiesgo;
  puedeAgregarPagina: boolean;
  onImportar: (agregarAlDeck: boolean) => void;
  onImportarPagina: () => void;
  onCerrar: () => void;
}) {
  const VD = useTheme();
  const t = useT();
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };
  const miniBtn = (c: string) => estiloBotonMiniAjustes(VD, c);
  const esPagina = entrada.kind === 'page';
  return (
    <div style={{
      background: VD.elevated, border: `1px solid ${VD.warning}`,
      borderRadius: VD.radius.md, padding: '9px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontFamily: VD.mono, fontSize: 9, color: VD.text, letterSpacing: 0.5 }}>
        {entrada.label}
        {entrada.version ? <span style={{ color: VD.textMuted }}> · v{entrada.version}</span> : null}
      </div>
      {entrada.requires && entrada.requires.length > 0 && (
        <div style={menudo}>{t('gal.requires')}{entrada.requires.join(' · ')}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <DotGlyphIcon glyph="WARN" size={9} color={VD.warning} />
        <div style={{ ...menudo, color: VD.warning }}>{t('gal.warn')}</div>
      </div>
      <BloquesRiesgo riesgo={riesgo} />
      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        {esPagina ? (
          <button onClick={onImportarPagina} disabled={!puedeAgregarPagina} style={miniBtn(VD.accent)} title={t('gal.addPageHint')}>
            {t('gal.addPage')}
          </button>
        ) : (
          <>
            <button onClick={() => onImportar(true)} style={miniBtn(VD.accent)} title={t('gal.importAndAppendHint')}>
              {t('gal.importAndAppend')}
            </button>
            <button onClick={() => onImportar(false)} style={miniBtn(VD.textDim)} title={t('gal.importOnlyHint')}>
              {t('gal.importOnly')}
            </button>
          </>
        )}
        <button onClick={onCerrar} style={miniBtn(VD.textMuted)}>{t('ui.cancel')}</button>
      </div>
    </div>
  );
}
