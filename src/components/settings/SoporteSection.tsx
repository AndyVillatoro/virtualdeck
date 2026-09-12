import React from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { DONATION_LINKS } from '../../data/links';
import { SettingLabel } from './settingHelpers';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';

/**
 * Apoyar el proyecto: su propio apartado de los ajustes.
 *
 * Vivía dentro de «Ayuda y acerca de», detrás de un botón que abría un
 * desplegable — o sea, a **cuatro clics**: abrir ajustes, bajar del todo,
 * desplegar Ayuda, pulsar «Apoyar», y solo entonces salían los enlaces. Sale a
 * su propio apartado con los enlaces a la vista.
 *
 * Lo que **no** hace, a propósito: no hay botón en la barra de título, ni aviso,
 * ni nada en la rejilla, ni se recuerda si lo cerró para volver a insistir. Está
 * en los ajustes, que es donde uno mira cuando ya decidió buscarlo. Un deck es
 * una herramienta que se deja abierta todo el día: lo que moleste una vez,
 * molesta cien.
 *
 * Y una regla que no es estética: **donar no puede desbloquear nada.** La
 * política 10.8.2 de la Microsoft Store obliga a usar su sistema de compras en
 * cuanto el usuario recibe algo a cambio. Mientras esto sean dos enlaces que
 * abren el navegador, PayPal está permitido.
 */
export function SoporteSection({ accent }: { accent: string }) {
  const VD = useTheme();
  const t = useT();
  const api = window.electronAPI;
  const abrir = (url: string) => api?.launch.url(url);

  return (
    <div>
      <SettingLabel>{t('set.support')}</SettingLabel>
      <div
        style={{
          marginTop: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
          background: VD.elevated, border: `1px solid ${VD.border}`, borderRadius: VD.radius.sm,
        }}
      >
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('help.donateIntro')}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {DONATION_LINKS.map((d) => (
            <button
              key={d.id}
              onClick={() => abrir(d.url)}
              style={{
                flex: 1, padding: '6px 8px', background: 'transparent',
                border: `1px solid ${accent}`, color: accent,
                fontFamily: VD.mono, fontSize: 8, letterSpacing: 0.5,
                cursor: 'pointer', borderRadius: VD.radius.sm,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <DotGlyphIcon glyph="HEART" size={8} color={accent} />
              <span>{d.label}</span>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: VD.mono, fontSize: 7, color: VD.textMuted, lineHeight: 1.5 }}>
          {t('help.donateFree')}
        </div>
      </div>
    </div>
  );
}
