import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import type { ResumenRiesgo } from '../../types';

function nadaRiesgoso(r: ResumenRiesgo): boolean {
  return r.scripts.length === 0 && r.programas.length === 0 &&
    (r.webhooks?.length ?? 0) === 0 && (r.urls?.length ?? 0) === 0 &&
    (r.teclas?.length ?? 0) === 0 &&
    r.automaticos.length === 0 && r.integraciones.length === 0;
}

/**
 * Muestra el desglose completo de riesgo de una entrada: scripts, programas,
 * teclas, webhooks, URLs y automatismos. Nunca se recorta ni se esconde.
 */
export function BloquesRiesgoTienda({ riesgo }: { riesgo: ResumenRiesgo }) {
  const VD = useTheme();
  const t = useT();
  const menudo: React.CSSProperties = { fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.6 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
      {(riesgo.urls?.length ?? 0) > 0 && (
        <div style={menudo}>
          {t('gal.opens')}
          {riesgo.urls!.map((u, i) => (
            <div key={i} style={{ color: VD.textDim, wordBreak: 'break-all' }}>· {u}</div>
          ))}
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
    </div>
  );
}
