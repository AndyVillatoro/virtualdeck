import React, { createContext, useContext, useMemo } from 'react';
import { ES } from './idiomas/es';
import { EN } from './idiomas/en';
import { FIELDS_EN } from './idiomas/campos';
import type { Dict } from './idiomas/tipos';


// i18n ligero (6.x del roadmap). Sin dependencias: un diccionario plano por
// idioma + un provider que resuelve 'system' al locale del SO. Las claves son
// estables (no el texto), así el español también pasa por el diccionario y se
// evita el drift entre idiomas. Fallback: es → clave cruda.

export type Lang = 'es' | 'en';
export type LangPref = 'system' | Lang;

export function resolveLang(pref: LangPref | undefined): Lang {
  if (pref === 'es' || pref === 'en') return pref;
  // 'system' o indefinido → detectar del SO.
  const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() ?? '' : '';
  return nav.startsWith('es') ? 'es' : 'en';
}

const DICTS: Record<Lang, Dict> = { es: ES, en: EN };

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
  return (key, vars) => {
    let s = DICTS[lang][key] ?? ES[key] ?? key;
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
  const value = useMemo<I18nValue>(() => {
    const lang = resolveLang(pref);
    return { lang, t: makeT(lang) };
  }, [pref]);
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
  return (es) => (lang === 'en' ? (FIELDS_EN[es] ?? es) : es);
}
