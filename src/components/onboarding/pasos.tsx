import React, { useState } from 'react';
import { useTheme } from '../../utils/theme';
import { useT } from '../../utils/i18n';
import { ACCENT_PRESETS } from '../../design';
import { DotGlyphIcon } from '../dot480/DotGlyphIcon';
import { Chip, Segmentado } from '../ui/Chip';

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

export type Idioma = 'system' | 'es' | 'en';
export type Tema = 'dark' | 'light' | 'system';

export function PasoIdioma({ valor, accent, onChange }: {
  valor: Idioma; accent: string; onChange: (v: Idioma) => void;
}) {
  const t = useT();
  const opciones = [
    { valor: 'es' as const, etiqueta: t('settings.language.es') },
    { valor: 'en' as const, etiqueta: t('settings.language.en') },
    { valor: 'system' as const, etiqueta: t('settings.language.system') },
  ];
  return (
    <Segmentado
      repartir
      accent={accent}
      valor={valor}
      onChange={onChange}
      opciones={opciones}
    />
  );
}

export function PasoApariencia({ tema, accent, onTema, onAccent }: {
  tema: Tema; accent: string; onTema: (v: Tema) => void; onAccent: (c: string) => void;
}) {
  const VD = useTheme();
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Segmentado
        repartir
        accent={accent}
        valor={tema}
        onChange={onTema}
        opciones={[
          { valor: 'dark' as const, etiqueta: t('settings.theme.dark') },
          { valor: 'light' as const, etiqueta: t('settings.theme.light') },
          { valor: 'system' as const, etiqueta: t('settings.theme.system') },
        ]}
      />
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
  const VD = useTheme();
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Chip
        ancho
        activo={hecho === 'exp'}
        accent={accent}
        onClick={() => lanzar('exp', onExport)}
      >
        <DotGlyphIcon glyph="EXPORT" size={9} color={hecho === 'exp' ? accent : VD.textMuted} />
        <span>{t('onb.backup.export')}</span>
      </Chip>
      <Chip
        ancho
        activo={hecho === 'imp'}
        accent={accent}
        onClick={() => lanzar('imp', onImport)}
      >
        <DotGlyphIcon glyph="IMPORT" size={9} color={hecho === 'imp' ? accent : VD.textMuted} />
        <span>{t('onb.backup.import')}</span>
      </Chip>
    </div>
  );
}
