// i18n ligero (6.x del roadmap). Sin dependencias: un diccionario plano por
// idioma + un provider que resuelve 'system' al locale del SO. Las claves son
// estables (no el texto), así el español también pasa por el diccionario y se
// evita el drift entre idiomas. Fallback: es → clave cruda.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ES } from './idiomas/es';
import type { Dict } from './idiomas/tipos';

import type { Lang } from '../comun/formatos';
export type { Lang };
export type LangPref = 'system' | Lang;

export function resolveLang(pref: LangPref | undefined): Lang {
  if (pref === 'es' || pref === 'en') return pref;
  // 'system' o indefinido → detectar del SO.
  const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : '';
  return nav.startsWith('es') ? 'es' : 'en';
}

let dictEn: Dict | null = null;
let camposEn: Record<string, string> | null = null;
let promesaIngles: Promise<void> | null = null;

/**
 * Carga bajo demanda los diccionarios en inglés (`en.ts` y `campos.ts`).
 * Si el idioma resuelto es `'es'` o ya están cargados, resuelve al instante.
 */
export function prepararIdioma(pref: LangPref | undefined): Promise<void> {
  if (resolveLang(pref) !== 'en' || (dictEn && camposEn)) {
    return Promise.resolve();
  }
  if (!promesaIngles) {
    promesaIngles = Promise.all([
      import('./idiomas/en'),
      import('./idiomas/campos'),
    ]).then(([modEn, modCampos]) => {
      dictEn = modEn.EN;
      camposEn = modCampos.FIELDS_EN;
    }).catch(() => {
      promesaIngles = null;
    });
  }
  return promesaIngles;
}

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Traductor suelto, sin contexto de React.
 *
 * `utils/actions.ts` lo necesita: ejecuta acciones y genera los mensajes de
 * error, pero no es un componente y no puede usar `useT()`. La alternativa
 * —devolver claves y traducir donde se muestran— dejaba los registros llenos
 * de identificadores en vez de frases.
 */
export function makeT(lang: Lang): TFunc {
  if (lang === 'en' && !dictEn) void prepararIdioma('en');
  return (key, vars) => {
    const tabla = lang === 'en' ? (dictEn ?? ES) : ES;
    let s = tabla[key] ?? ES[key] ?? key;
    if (vars) {
      for (const k of Object.keys(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
    }
    return s;
  };
}

interface I18nValue {
  lang: Lang;
  t: TFunc;
}

const I18nContext = createContext<I18nValue>({ lang: 'es', t: makeT('es') });

export function LanguageProvider({ pref, children }: { pref: LangPref | undefined; children: React.ReactNode }) {
  const [versionIngles, setVersionIngles] = useState(0);
  useEffect(() => {
    if (resolveLang(pref) !== 'en' || (dictEn && camposEn)) return;
    let vivo = true;
    void prepararIdioma(pref).then(() => {
      if (vivo) setVersionIngles((v) => v + 1);
    });
    return () => { vivo = false; };
  }, [pref]);
  const value = useMemo<I18nValue>(() => {
    void versionIngles;
    const lang = resolveLang(pref);
    return { lang, t: makeT(lang) };
  }, [pref, versionIngles]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): TFunc {
  return useContext(I18nContext).t;
}

export function useLang(): Lang {
  return useContext(I18nContext).lang;
}

// — Traducción bulk de campos del editor (labels/placeholders) por su texto-fuente
// español. Evita inventar ~120 claves: el español queda inline en EditorB.tsx como
// fuente y acá solo mapeamos a inglés. Lo no mapeado cae al español (fallback seguro).
/** Traductor de campos del editor por texto español (bulk). EN o passthrough. */
export function useFieldText(): (es: string) => string {
  const lang = useLang();
  return (es) => (lang === 'en' && camposEn ? (camposEn[es] ?? es) : es);
}
