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
  // — Tipos de acción (selector del editor) —
  'act.none.label': 'Ninguno', 'act.none.desc': 'Sin acción asignada',
  'act.app.label': 'Abrir App', 'act.app.desc': 'Ejecuta una aplicación',
  'act.web.label': 'Página Web', 'act.web.desc': 'Abre una URL en el navegador',
  'act.shortcut.label': 'Acceso Dir.', 'act.shortcut.desc': 'Abre un archivo o carpeta',
  'act.script.label': 'Script', 'act.script.desc': 'Ejecuta PowerShell o CMD',
  'act.audio-device.label': 'Audio', 'act.audio-device.desc': 'Cambia dispositivo de salida',
  'act.hotkey.label': 'Atajo', 'act.hotkey.desc': 'Envía combinación de teclas',
  'act.clipboard.label': 'Portapapeles', 'act.clipboard.desc': 'Copia texto al portapapeles',
  'act.type-text.label': 'Escribir', 'act.type-text.desc': 'Escribe texto automáticamente',
  'act.kill-process.label': 'Cerrar App', 'act.kill-process.desc': 'Termina un proceso por nombre',
  'act.volume-set.label': 'Vol. Exacto', 'act.volume-set.desc': 'Establece volumen a un % exacto',
  'act.folder.label': 'Carpeta', 'act.folder.desc': 'Abre un sub-deck de botones',
  'act.media-play-pause.label': 'Play/Pausa', 'act.media-play-pause.desc': 'Reproducir / Pausar',
  'act.media-next.label': 'Siguiente', 'act.media-next.desc': 'Siguiente pista',
  'act.media-prev.label': 'Anterior', 'act.media-prev.desc': 'Pista anterior',
  'act.volume-up.label': 'Vol. ＋', 'act.volume-up.desc': 'Sube el volumen',
  'act.volume-down.label': 'Vol. −', 'act.volume-down.desc': 'Baja el volumen',
  'act.mute.label': 'Silenciar', 'act.mute.desc': 'Silencia / activa sonido',
  'act.brightness.label': 'Brillo', 'act.brightness.desc': 'Controla brillo del monitor',
  'act.notify.label': 'Notificación', 'act.notify.desc': 'Muestra una notificación de Windows',
  'act.set-var.label': 'Var: Asignar', 'act.set-var.desc': 'Asigna valor a una variable global',
  'act.incr-var.label': 'Var: Sumar', 'act.incr-var.desc': 'Incrementa o decrementa una variable numérica',
  'act.webhook.label': 'Webhook', 'act.webhook.desc': 'POST/GET a una URL con body y headers',
  'act.tts.label': 'Texto-a-voz', 'act.tts.desc': 'Lee un texto en voz alta',
  'act.region-capture.label': 'Captura', 'act.region-capture.desc': 'Abre la captura de región de Windows',
  'act.rgb-color.label': 'RGB Color', 'act.rgb-color.desc': 'Pinta un color sólido en un dispositivo RGB',
  'act.rgb-mode.label': 'RGB Modo', 'act.rgb-mode.desc': 'Cambia el modo/efecto RGB (Direct, Breathing, etc.)',
  'act.rgb-profile.label': 'RGB Perfil', 'act.rgb-profile.desc': 'Aplica un perfil RGB guardado',
  'act.window-snap.label': 'Snap Ventana', 'act.window-snap.desc': 'Mueve y redimensiona una ventana a un cuadrante',
  'act.branch.label': 'Si / Si no', 'act.branch.desc': 'Ejecuta acción A o B según el valor de una variable',
  'act.countdown.label': 'Temporizador', 'act.countdown.desc': 'Espera N ms y luego ejecuta una acción',
  'act.media-shuffle.label': 'Shuffle', 'act.media-shuffle.desc': 'Alterna shuffle en el reproductor activo (SMTC)',
  'act.media-repeat.label': 'Repetir', 'act.media-repeat.desc': 'Cicla el modo de repetición (ninguno → lista → pista)',
  'act.macro.label': 'Macro', 'act.macro.desc': 'Secuencia de teclas y clics de ratón grabada o configurada',
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
  // — Action types (editor picker) —
  'act.none.label': 'None', 'act.none.desc': 'No action assigned',
  'act.app.label': 'Open App', 'act.app.desc': 'Launch an application',
  'act.web.label': 'Website', 'act.web.desc': 'Open a URL in the browser',
  'act.shortcut.label': 'Shortcut', 'act.shortcut.desc': 'Open a file or folder',
  'act.script.label': 'Script', 'act.script.desc': 'Run PowerShell or CMD',
  'act.audio-device.label': 'Audio', 'act.audio-device.desc': 'Switch output device',
  'act.hotkey.label': 'Hotkey', 'act.hotkey.desc': 'Send a key combination',
  'act.clipboard.label': 'Clipboard', 'act.clipboard.desc': 'Copy text to clipboard',
  'act.type-text.label': 'Type Text', 'act.type-text.desc': 'Type text automatically',
  'act.kill-process.label': 'Kill App', 'act.kill-process.desc': 'Terminate a process by name',
  'act.volume-set.label': 'Exact Vol.', 'act.volume-set.desc': 'Set volume to an exact %',
  'act.folder.label': 'Folder', 'act.folder.desc': 'Open a sub-deck of buttons',
  'act.media-play-pause.label': 'Play/Pause', 'act.media-play-pause.desc': 'Play / Pause',
  'act.media-next.label': 'Next', 'act.media-next.desc': 'Next track',
  'act.media-prev.label': 'Previous', 'act.media-prev.desc': 'Previous track',
  'act.volume-up.label': 'Vol. ＋', 'act.volume-up.desc': 'Volume up',
  'act.volume-down.label': 'Vol. −', 'act.volume-down.desc': 'Volume down',
  'act.mute.label': 'Mute', 'act.mute.desc': 'Mute / unmute',
  'act.brightness.label': 'Brightness', 'act.brightness.desc': 'Control monitor brightness',
  'act.notify.label': 'Notification', 'act.notify.desc': 'Show a Windows notification',
  'act.set-var.label': 'Var: Set', 'act.set-var.desc': 'Assign a value to a global variable',
  'act.incr-var.label': 'Var: Add', 'act.incr-var.desc': 'Increment or decrement a numeric variable',
  'act.webhook.label': 'Webhook', 'act.webhook.desc': 'POST/GET to a URL with body and headers',
  'act.tts.label': 'Text-to-speech', 'act.tts.desc': 'Read a text out loud',
  'act.region-capture.label': 'Capture', 'act.region-capture.desc': 'Open Windows region capture',
  'act.rgb-color.label': 'RGB Color', 'act.rgb-color.desc': 'Paint a solid color on an RGB device',
  'act.rgb-mode.label': 'RGB Mode', 'act.rgb-mode.desc': 'Change the RGB mode/effect (Direct, Breathing, etc.)',
  'act.rgb-profile.label': 'RGB Profile', 'act.rgb-profile.desc': 'Apply a saved RGB profile',
  'act.window-snap.label': 'Snap Window', 'act.window-snap.desc': 'Move and resize a window to a quadrant',
  'act.branch.label': 'If / Else', 'act.branch.desc': 'Run action A or B based on a variable value',
  'act.countdown.label': 'Timer', 'act.countdown.desc': 'Wait N ms then run an action',
  'act.media-shuffle.label': 'Shuffle', 'act.media-shuffle.desc': 'Toggle shuffle on the active player (SMTC)',
  'act.media-repeat.label': 'Repeat', 'act.media-repeat.desc': 'Cycle repeat mode (none → list → track)',
  'act.macro.label': 'Macro', 'act.macro.desc': 'Recorded or configured key and mouse-click sequence',
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

// — Traducción bulk de campos del editor (labels/placeholders) por su texto-fuente
// español. Evita inventar ~120 claves: el español queda inline en EditorB.tsx como
// fuente y acá solo mapeamos a inglés. Lo no mapeado cae al español (fallback seguro).
const FIELDS_EN: Record<string, string> = {
  // Labels de config por acción
  'RUTA DE LA APLICACIÓN': 'APPLICATION PATH',
  'ARGUMENTOS (OPCIONAL)': 'ARGUMENTS (OPTIONAL)',
  'URL': 'URL',
  'RUTA DEL ARCHIVO O CARPETA': 'FILE OR FOLDER PATH',
  'INTÉRPRETE': 'INTERPRETER',
  'SCRIPT': 'SCRIPT',
  'GUARDAR SALIDA EN VARIABLE (opcional)': 'SAVE OUTPUT TO VARIABLE (optional)',
  'DISPOSITIVO DE AUDIO': 'AUDIO DEVICE',
  'COMBINACIÓN DE TECLAS': 'KEY COMBINATION',
  'TEXTO A COPIAR AL PORTAPAPELES': 'TEXT TO COPY TO CLIPBOARD',
  'TEXTO A ESCRIBIR AUTOMÁTICAMENTE': 'TEXT TO TYPE AUTOMATICALLY',
  'NOMBRE DEL PROCESO': 'PROCESS NAME',
  'NIVEL DE VOLUMEN': 'VOLUME LEVEL',
  'NIVEL DE BRILLO': 'BRIGHTNESS LEVEL',
  'TÍTULO': 'TITLE',
  'MENSAJE': 'MESSAGE',
  'NOMBRE DE VARIABLE': 'VARIABLE NAME',
  'VALOR (acepta {otraVariable})': 'VALUE (accepts {otherVariable})',
  'DELTA (entero — usa negativo para restar)': 'DELTA (integer — use negative to subtract)',
  'MÉTODO': 'METHOD',
  'HEADERS (JSON, opcional)': 'HEADERS (JSON, optional)',
  'BODY (acepta {variables})': 'BODY (accepts {variables})',
  'TEXTO A LEER (acepta {variables})': 'TEXT TO READ (accepts {variables})',
  'DISPOSITIVO RGB': 'RGB DEVICE',
  'COLOR (HEX)': 'COLOR (HEX)',
  'MODO / EFECTO': 'MODE / EFFECT',
  'COLOR (OPCIONAL — SOLO PARA MODOS QUE LO USAN)': 'COLOR (OPTIONAL — ONLY FOR MODES THAT USE IT)',
  'BRILLO 0-100 (OPCIONAL)': 'BRIGHTNESS 0-100 (OPTIONAL)',
  'PERFIL RGB': 'RGB PROFILE',
  'POSICIÓN / TAMAÑO': 'POSITION / SIZE',
  'PROCESO A SNAPEAR (opcional — vacío = ventana activa)': 'PROCESS TO SNAP (optional — empty = active window)',
  'CONDICIÓN: SI {variable}': 'CONDITION: IF {variable}',
  'ENTONCES (acción si VERDADERO)': 'THEN (action if TRUE)',
  'SI NO (acción si FALSO — opcional)': 'ELSE (action if FALSE — optional)',
  'TIEMPO DE ESPERA (milisegundos)': 'WAIT TIME (milliseconds)',
  'PASOS DE LA MACRO': 'MACRO STEPS',
  // Labels de estilo / widget / disparadores
  'ETIQUETA DEL BOTÓN': 'BUTTON LABEL',
  'SUB-ETIQUETA (OPCIONAL)': 'SUB-LABEL (OPTIONAL)',
  'ICONO (EMOJI O SÍMBOLO — VACÍO = ÍCONO DEL TIPO)': 'ICON (EMOJI OR SYMBOL — EMPTY = TYPE ICON)',
  'ICONO DE MARCA ANIMADO (DOT-MATRIX)': 'ANIMATED BRAND ICON (DOT-MATRIX)',
  'GLIFO PERSONAL 5×7 (DOT-MATRIX)': 'CUSTOM 5×7 GLYPH (DOT-MATRIX)',
  'IMAGEN PERSONALIZADA (PNG / JPG / GIF)': 'CUSTOM IMAGE (PNG / JPG / GIF)',
  'COLOR DE FONDO': 'BACKGROUND COLOR',
  'COLOR DE TEXTO / ÍCONO': 'TEXT / ICON COLOR',
  'GRUPO RADIO (toggles mutuamente exclusivos)': 'RADIO GROUP (mutually exclusive toggles)',
  'WIDGET (MUESTRA DATOS EN EL BOTÓN)': 'WIDGET (SHOWS LIVE DATA ON THE BUTTON)',
  'VISIBLE SOLO SI ESTA APP ESTÁ ACTIVA (opcional)': 'VISIBLE ONLY IF THIS APP IS ACTIVE (optional)',
  'VISIBLE SOLO SI SENSOR (opcional)': 'VISIBLE ONLY IF SENSOR (optional)',
  'DISPARAR AUTOMÁTICAMENTE A LA HORA (HH:MM)': 'TRIGGER AUTOMATICALLY AT TIME (HH:MM)',
  'DISPARAR CUANDO SENSOR (opcional)': 'TRIGGER WHEN SENSOR (optional)',
  // Placeholders
  'Buscar preset...': 'Search preset...',
  'ruta o comando': 'path or command',
  'ruta': 'path',
  'Script...': 'Script...',
  'Script de desactivación...': 'Deactivation script...',
  'Ej: Auriculares (Realtek HD Audio)': 'E.g. Headphones (Realtek HD Audio)',
  'Texto a escribir': 'Text to type',
  'texto al portapapeles': 'text to clipboard',
  'Texto de la notificación...': 'Notification text...',
  'Texto que se escribirá con SendKeys...': 'Text that will be typed with SendKeys...',
  'Texto, URL, código, etc.': 'Text, URL, code, etc.',
  'Título': 'Title',
  'Mensaje': 'Message',
  'Nombre': 'Name',
  'Nombre de variable (ej. tomas)': 'Variable name (e.g. takes)',
  'nombre_variable': 'variable_name',
  'contador': 'counter',
  'contador, lastApp, etc.': 'counter, lastApp, etc.',
  'valor': 'value',
  'valor o {variable}': 'value or {variable}',
  'Valor (ej. 80)': 'Value (e.g. 80)',
  'Valor (ej. 85)': 'Value (e.g. 85)',
  'variable': 'variable',
  'Descripción corta': 'Short description',
  'Mi Botón': 'My Button',
  'Prefijo (ej. 🎬 )': 'Prefix (e.g. 🎬 )',
  'Etiqueta debajo': 'Label below',
  'Etiqueta (ej. CPU)': 'Label (e.g. CPU)',
  'vacío = sin atajo global': 'empty = no global hotkey',
  'ej: modo_audio, perfil_rgb...': 'e.g. audio_mode, rgb_profile...',
  'ej: resultado_cpu': 'e.g. cpu_result',
  '--flag valor': '--flag value',
  'https://ejemplo.com': 'https://example.com',
  'proceso.exe': 'process.exe',
};

/** Traductor de campos del editor por texto español (bulk). EN o passthrough. */
export function useFieldText(): (es: string) => string {
  const lang = useLang();
  return (es) => (lang === 'en' ? (FIELDS_EN[es] ?? es) : es);
}
