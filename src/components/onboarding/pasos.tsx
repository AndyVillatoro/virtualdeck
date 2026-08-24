import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { ACCENT_PRESETS } from '../../design';

/**
 * Las piezas con las que se puede *hacer* algo dentro del tutorial.
 *
 * Los cinco pasos originales solo contaban cosas. Los tres de aqui aplican el
 * cambio en el momento —idioma, tema, color— para que la primera pantalla que
 * ve alguien no sea la que le tocó por defecto, sino la que eligió. El paso de
 * respaldo, ademas, es la unica via para que quien viene de otro PC empiece con
 * su configuracion en vez de con una vacia.
 *
 * Van en su propio archivo porque `Onboarding` es la carcasa —titulo, cuerpo,
 * puntos, navegacion— y meter aqui tres rejillas de botones la volvia otra cosa.
 */

/** Un boton de eleccion: se enciende con el acento cuando esta puesto. */
function Opcion({ activa, accent, onClick, children, ancho }: {
  activa: boolean; accent: string; onClick: () => void;
  children: React.ReactNode; ancho?: number;
}) {
  const VD = useTheme();
  return (
    <button
      onClick={onClick}
      style={{
        flex: ancho ? undefined : 1, width: ancho,
        padding: '9px 10px',
        background: activa ? VD.accentBg : VD.elevated,
        border: `1px solid ${activa ? accent : VD.border}`,
        color: activa ? accent : VD.textMuted,
        fontFamily: VD.mono, fontSize: 10, letterSpacing: 1,
        cursor: 'pointer', borderRadius: VD.radius.sm,
      }}
    >
      {children}
    </button>
  );
}

export type Idioma = 'system' | 'es' | 'en';
export type Tema = 'dark' | 'light' | 'system';

export function PasoIdioma({ valor, accent, onChange }: {
  valor: Idioma; accent: string; onChange: (v: Idioma) => void;
}) {
  const t = useT();
  const opciones: Idioma[] = ['es', 'en', 'system'];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {opciones.map((id) => (
        <Opcion key={id} activa={valor === id} accent={accent} onClick={() => onChange(id)}>
          {t(`settings.language.${id}`)}
        </Opcion>
      ))}
    </div>
  );
}

export function PasoApariencia({ tema, accent, onTema, onAccent }: {
  tema: Tema; accent: string; onTema: (v: Tema) => void; onAccent: (c: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  const temas: [Tema, string][] = [
    ['dark', t('settings.theme.dark')],
    ['light', t('settings.theme.light')],
    ['system', t('settings.theme.system')],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {temas.map(([id, texto]) => (
          <Opcion key={id} activa={tema === id} accent={accent} onClick={() => onTema(id)}>
            {texto}
          </Opcion>
        ))}
      </div>
      <div>
        <div style={{ fontFamily: VD.mono, fontSize: 8, color: VD.textMuted, letterSpacing: 1, marginBottom: 7 }}>
          {t('set.accent')}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => onAccent(c)}
              title={c}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                // El elegido se marca con un anillo separado del propio color:
                // un borde del mismo tono no se distingue sobre el color.
                border: accent.toLowerCase() === c.toLowerCase()
                  ? `2px solid ${VD.text}` : `1px solid ${VD.border}`,
                boxShadow: accent.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${VD.surface}` : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Exportar e importar la configuracion, sin salir del tutorial.
 *
 * Importar es lo que de verdad importa aqui: es el unico momento en el que
 * alguien que viene de otra instalacion puede traerse lo suyo antes de empezar
 * a montar botones encima. Exportar en la primera ejecucion guarda un deck
 * vacio, y por eso el boton lo dice en vez de fingir que sirve de algo.
 */
export function PasoRespaldo({ accent, onExport, onImport }: {
  accent: string; onExport: () => void | Promise<void>; onImport: () => void | Promise<void>;
}) {
  const t = useT();
  const [hecho, setHecho] = useState<'exp' | 'imp' | null>(null);
  const lanzar = async (que: 'exp' | 'imp', f: () => void | Promise<void>) => {
    await f();
    setHecho(que);
    // El aviso se apaga solo: es una confirmacion, no un estado.
    setTimeout(() => setHecho(null), 2500);
  };
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Opcion activa={hecho === 'exp'} accent={accent} onClick={() => lanzar('exp', onExport)}>
        ↗ {t('onb.backup.export')}
      </Opcion>
      <Opcion activa={hecho === 'imp'} accent={accent} onClick={() => lanzar('imp', onImport)}>
        ↙ {t('onb.backup.import')}
      </Opcion>
    </div>
  );
}
