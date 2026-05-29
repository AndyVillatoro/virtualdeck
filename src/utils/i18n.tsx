import React, { createContext, useContext, useMemo } from 'react';

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

type Dict = Record<string, string>;

const ES: Dict = {
  // — Chrome / settings (TitleBar) —
  'settings.theme': 'TEMA',
  'settings.theme.dark': 'OSCURO',
  'settings.theme.light': 'CLARO',
  'settings.theme.system': 'SISTEMA',
  'settings.language': 'IDIOMA',
  'settings.language.system': 'SISTEMA',
  'settings.autostart': 'INICIAR CON WINDOWS',
  'settings.uiscale': 'ESCALA DE INTERFAZ',
  'settings.tiles': 'FORMA DE BOTONES',
  'settings.tiles.square': 'CUADRADOS',
  'settings.tiles.fill': 'RELLENAR',
  // — Acciones de página / barra —
  'main.search.placeholder': 'Etiqueta, app, URL, atajo...',
  'main.search.title': 'BUSCAR BOTÓN',
  'main.search.empty': 'No hay botones configurados',
  'main.search.nomatch': 'Sin coincidencias',
  'main.search.nav': '↑↓ NAVEGAR',
  'main.search.edit': '↵ EDITAR',
  'main.search.exit': 'ESC SALIR',
  // — Update banner —
  'update.ready': 'Actualización {version} lista.',
  'update.restart': 'REINICIAR',
  'update.later': 'DESPUÉS',
  // — Onboarding —
  'onb.step': 'PASO {n} / 0{total}',
  'onb.skip': 'Saltar',
  'onb.back': 'Atrás',
  'onb.next': 'Siguiente',
  'onb.start': 'Empezar',
  'onb.1.title': 'VIRTUALDECK',
  'onb.1.body': 'Tu Stream Deck por software. Una grilla de botones que disparan acciones: abrir apps, webs y carpetas, cambiar el audio, controlar la música, ejecutar atajos, macros y más.',
  'onb.1.hint': 'Todo se guarda solo. No hay nube ni cuentas: es 100% local.',
  'onb.2.title': 'TUS BOTONES',
  'onb.2.body': 'Hacé clic en cualquier celda vacía para configurarla. Elegí una etiqueta, un ícono y la acción que querés que ejecute. Un clic normal la dispara; el menú contextual (clic derecho) la edita, duplica o limpia.',
  'onb.2.hint': 'Ctrl+clic selecciona varios botones para operaciones en lote.',
  'onb.3.title': 'PÁGINAS Y GRILLA',
  'onb.3.body': 'Organizá tus botones en varias páginas (pestañas arriba). Cambiá entre ellas con las teclas 1-9 o deslizando. Cada página puede tener su propio tamaño de grilla.',
  'onb.3.hint': 'Arrastrá un botón sobre la pestaña de otra página para moverlo.',
  'onb.4.title': 'WIDGETS Y PANTALLA COMPLETA',
  'onb.4.body': 'Un botón puede mostrar reloj, clima, sensores del PC, una variable o la música que suena ahora. Entrá en pantalla completa para usar VirtualDeck como panel dedicado en una tablet o monitor secundario.',
  'onb.4.hint': 'El widget de música detecta Spotify, YouTube, navegadores y más.',
  'onb.5.title': 'AYUDA SIEMPRE A MANO',
  'onb.5.body': 'Pulsá Ctrl+K para buscar cualquier botón al instante. En ⚙ → Ayuda y Acerca de encontrás la documentación, el reporte de errores y este tutorial por si querés repetirlo.',
  'onb.5.hint': '¿Listo? Creá tu primer botón.',
  // — Hints contextuales —
  'hint.firstButton': 'Hacé clic en una celda vacía para crear tu primer botón.',
  'hint.settings': 'Tema, idioma, escala y más están acá en Configuración.',
  'hint.search': 'Tip: Ctrl+K busca cualquier botón al instante.',
  'hint.dismiss': 'Entendido',
  // — Ayuda y Acerca de —
  'help.title': 'AYUDA Y ACERCA DE',
  'help.docs': '📖 DOCUMENTACIÓN',
  'help.report': '🐞 REPORTAR ERROR',
  'help.check': '⟳ BUSCAR UPDATE',
  'help.checking': 'BUSCANDO…',
  'help.support': '♥ APOYAR',
  'help.donateIntro': 'VirtualDeck es gratis. Si te sirve, podés apoyar su desarrollo:',
  'help.openLog': 'ABRIR REGISTRO',
  'help.exportLog': 'EXPORTAR REGISTRO',
  'help.replay': '🎓 REPETIR TUTORIAL',
  'help.credits': 'CRÉDITOS Y LICENCIAS',
  'help.bundled': ' (incluido)',
  'help.upd.ready': 'Actualización {version} lista — reiniciá para aplicar.',
  'help.upd.downloading': 'Descargando actualización {version}…',
  'help.upd.error': 'No se pudo buscar actualizaciones.',
  'help.upd.disabled': 'Auto-update no disponible en este build (modo desarrollo).',
  'help.upd.checkError': 'Error al buscar actualizaciones.',
  'help.upd.checking': 'Buscando actualizaciones…',
  // — Tooltips de la barra superior —
  'tip.export': 'Exportar configuración',
  'tip.import': 'Importar configuración',
  'tip.rgb': 'Gestor RGB',
  'tip.settings': 'Configuración',
  'tip.fullscreen': 'Modo pantalla completa',
  'tip.minimize': 'Minimizar',
  'tip.close': 'Cerrar (minimiza a bandeja)',
  // — Pantalla de fondos (WallpaperB) —
  'wp.back': '← VOLVER',
  'wp.preview': 'VISTA PREVIA',
  'wp.select': 'SELECCIONAR FONDO',
  'wp.applied': '✓ APLICADO',
  'wp.apply': 'APLICAR →',
  'wp.selected': '● SELECCIONADO',
  'wp.autosave': 'Los cambios se guardan automáticamente al presionar Aplicar.',
  'wp.name.solid': 'Sólido',
  'wp.name.gradient': 'Gradiente Azul',
  'wp.name.dotgrid': 'Cuadrícula Dot',
  'wp.name.scanlines': 'Scanlines',
  'wp.name.crt': 'CRT',
  'wp.name.mesh': 'Mesh técnico',
  'wp.name.photo': 'Neón',
  'wp.name.grid-blue': 'Grid Azul',
  // — Editor de botón (chrome: pasos y navegación) —
  'ed.title': 'CONFIGURAR BOTÓN',
  'ed.preview': 'VISTA PREVIA',
  'ed.step.action': 'ACCIÓN',
  'ed.step.config': 'CONFIGURAR',
  'ed.step.style': 'ESTILO',
  'ed.back': '← ATRÁS',
  'ed.cancel': 'CANCELAR',
  'ed.next': 'SIGUIENTE →',
  'ed.save': 'GUARDAR ✓',
  'ed.stepN': 'PASO {n} / {total}',
  'ed.toggleMode': 'MODO TOGGLE',
};

const EN: Dict = {
  'settings.theme': 'THEME',
  'settings.theme.dark': 'DARK',
  'settings.theme.light': 'LIGHT',
  'settings.theme.system': 'SYSTEM',
  'settings.language': 'LANGUAGE',
  'settings.language.system': 'SYSTEM',
  'settings.autostart': 'START WITH WINDOWS',
  'settings.uiscale': 'INTERFACE SCALE',
  'settings.tiles': 'BUTTON SHAPE',
  'settings.tiles.square': 'SQUARE',
  'settings.tiles.fill': 'FILL',
  'main.search.placeholder': 'Label, app, URL, shortcut...',
  'main.search.title': 'FIND BUTTON',
  'main.search.empty': 'No buttons configured',
  'main.search.nomatch': 'No matches',
  'main.search.nav': '↑↓ NAVIGATE',
  'main.search.edit': '↵ EDIT',
  'main.search.exit': 'ESC CLOSE',
  'update.ready': 'Update {version} ready.',
  'update.restart': 'RESTART',
  'update.later': 'LATER',
  'onb.step': 'STEP {n} / 0{total}',
  'onb.skip': 'Skip',
  'onb.back': 'Back',
  'onb.next': 'Next',
  'onb.start': 'Get started',
  'onb.1.title': 'VIRTUALDECK',
  'onb.1.body': 'Your software Stream Deck. A grid of buttons that fire actions: open apps, websites and folders, switch audio, control music, run shortcuts, macros and more.',
  'onb.1.hint': 'Everything saves itself. No cloud, no accounts: 100% local.',
  'onb.2.title': 'YOUR BUTTONS',
  'onb.2.body': 'Click any empty cell to set it up. Pick a label, an icon and the action it should run. A normal click fires it; the context menu (right-click) edits, duplicates or clears it.',
  'onb.2.hint': 'Ctrl+click selects multiple buttons for bulk operations.',
  'onb.3.title': 'PAGES & GRID',
  'onb.3.body': 'Organize your buttons across several pages (tabs at the top). Switch between them with keys 1-9 or by swiping. Each page can have its own grid size.',
  'onb.3.hint': 'Drag a button onto another page tab to move it there.',
  'onb.4.title': 'WIDGETS & FULLSCREEN',
  'onb.4.body': 'A button can show a clock, weather, PC sensors, a variable or the music playing right now. Go fullscreen to use VirtualDeck as a dedicated panel on a tablet or second monitor.',
  'onb.4.hint': 'The music widget detects Spotify, YouTube, browsers and more.',
  'onb.5.title': 'HELP ALWAYS AT HAND',
  'onb.5.body': 'Press Ctrl+K to find any button instantly. Under ⚙ → Help & About you will find the docs, bug reporting and this tutorial in case you want to replay it.',
  'onb.5.hint': 'Ready? Create your first button.',
  'hint.firstButton': 'Click an empty cell to create your first button.',
  'hint.settings': 'Theme, language, scale and more live here in Settings.',
  'hint.search': 'Tip: Ctrl+K finds any button instantly.',
  'hint.dismiss': 'Got it',
  'help.title': 'HELP & ABOUT',
  'help.docs': '📖 DOCUMENTATION',
  'help.report': '🐞 REPORT BUG',
  'help.check': '⟳ CHECK UPDATE',
  'help.checking': 'CHECKING…',
  'help.support': '♥ SUPPORT',
  'help.donateIntro': 'VirtualDeck is free. If it helps you, you can support its development:',
  'help.openLog': 'OPEN LOG',
  'help.exportLog': 'EXPORT LOG',
  'help.replay': '🎓 REPLAY TUTORIAL',
  'help.credits': 'CREDITS & LICENSES',
  'help.bundled': ' (bundled)',
  'help.upd.ready': 'Update {version} ready — restart to apply.',
  'help.upd.downloading': 'Downloading update {version}…',
  'help.upd.error': 'Could not check for updates.',
  'help.upd.disabled': 'Auto-update not available in this build (dev mode).',
  'help.upd.checkError': 'Error checking for updates.',
  'help.upd.checking': 'Checking for updates…',
  'tip.export': 'Export configuration',
  'tip.import': 'Import configuration',
  'tip.rgb': 'RGB manager',
  'tip.settings': 'Settings',
  'tip.fullscreen': 'Fullscreen mode',
  'tip.minimize': 'Minimize',
  'tip.close': 'Close (minimizes to tray)',
  'wp.back': '← BACK',
  'wp.preview': 'PREVIEW',
  'wp.select': 'SELECT WALLPAPER',
  'wp.applied': '✓ APPLIED',
  'wp.apply': 'APPLY →',
  'wp.selected': '● SELECTED',
  'wp.autosave': 'Changes are saved automatically when you press Apply.',
  'wp.name.solid': 'Solid',
  'wp.name.gradient': 'Blue Gradient',
  'wp.name.dotgrid': 'Dot Grid',
  'wp.name.scanlines': 'Scanlines',
  'wp.name.crt': 'CRT',
  'wp.name.mesh': 'Tech Mesh',
  'wp.name.photo': 'Neon',
  'wp.name.grid-blue': 'Blue Grid',
  'ed.title': 'CONFIGURE BUTTON',
  'ed.preview': 'PREVIEW',
  'ed.step.action': 'ACTION',
  'ed.step.config': 'CONFIGURE',
  'ed.step.style': 'STYLE',
  'ed.back': '← BACK',
  'ed.cancel': 'CANCEL',
  'ed.next': 'NEXT →',
  'ed.save': 'SAVE ✓',
  'ed.stepN': 'STEP {n} / {total}',
  'ed.toggleMode': 'TOGGLE MODE',
};

const DICTS: Record<Lang, Dict> = { es: ES, en: EN };

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

function makeT(lang: Lang): TFunc {
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
