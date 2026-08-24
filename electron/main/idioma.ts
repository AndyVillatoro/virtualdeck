import { app } from 'electron';

/**
 * El puñado de textos que enseña el proceso principal.
 *
 * El i18n de la aplicación vive en el renderer (`src/utils/i18n.tsx`) y aquí
 * no se puede usar: son dos procesos. Y el proceso principal sí enseña texto
 * —el menú de la bandeja y los títulos de los diálogos de archivo— que hasta
 * ahora estaba **fijo en español**. Con la interfaz en inglés, la bandeja
 * seguía diciendo «Mostrar VirtualDeck» y «Salir».
 *
 * Ninguna de las cinco comprobaciones de `check-i18n.mjs` lo veía: solo mira
 * `src/`.
 *
 * Son trece cadenas y no crecen: un diccionario aquí es más barato que
 * cruzar cada título por IPC en el momento de abrir el diálogo.
 */

type Clave =
  | 'tray.show' | 'tray.quick' | 'tray.quit' | 'tray.button'
  | 'dlg.exportLog' | 'dlg.exportConfig' | 'dlg.importConfig'
  | 'dlg.pickImage' | 'dlg.exportPage' | 'dlg.importPage' | 'dlg.pickOpenRGB'
  | 'filter.images' | 'filter.text'
  // Errores que el proceso principal devuelve al renderer y acaban en un
  // aviso en pantalla. No son logs: los lee el usuario.
  | 'macro.noUiohook' | 'macro.noSteps' | 'macro.playFailed' | 'media.untitled' | 'media.noArtist' | 'rgb.onlyDirect' | 'sensors.disabled' | 'sensors.uacCancelled' | 'sensors.netshCode'
  | 'currency.badCode';

const ES: Record<Clave, string> = {
  'tray.show': 'Mostrar VirtualDeck',
  'tray.quick': 'Acciones rápidas',
  'tray.quit': 'Salir',
  'tray.button': 'Botón',
  'dlg.exportLog': 'Exportar registro de VirtualDeck',
  'dlg.exportConfig': 'Exportar configuración de VirtualDeck',
  'dlg.importConfig': 'Importar configuración de VirtualDeck',
  'dlg.pickImage': 'Seleccionar imagen o GIF',
  'dlg.exportPage': 'Exportar página',
  'dlg.importPage': 'Importar página',
  'dlg.pickOpenRGB': 'Seleccione OpenRGB.exe',
  'filter.images': 'Imágenes',
  'filter.text': 'Texto',
  'macro.noUiohook': 'uiohook-napi no está disponible en este sistema.',
  'macro.noSteps': 'Sin pasos en la macro.',
  'macro.playFailed': 'La reproducción nativa falló; consulte el registro del proceso principal.',
  'media.untitled': '(sin título)',
  'media.noArtist': '(sin artista)',
  'rgb.onlyDirect': 'solo ofrece Direct, el color se perderá al cerrar OpenRGB.',
  'sensors.disabled': 'Sensores deshabilitados',
  'sensors.uacCancelled': 'UAC cancelado por el usuario',
  'sensors.netshCode': 'netsh terminó con código',
  'currency.badCode': 'Moneda no válida:',
};

const EN: Record<Clave, string> = {
  'tray.show': 'Show VirtualDeck',
  'tray.quick': 'Quick actions',
  'tray.quit': 'Quit',
  'tray.button': 'Button',
  'dlg.exportLog': 'Export VirtualDeck log',
  'dlg.exportConfig': 'Export VirtualDeck configuration',
  'dlg.importConfig': 'Import VirtualDeck configuration',
  'dlg.pickImage': 'Select image or GIF',
  'dlg.exportPage': 'Export page',
  'dlg.importPage': 'Import page',
  'dlg.pickOpenRGB': 'Select OpenRGB.exe',
  'filter.images': 'Images',
  'filter.text': 'Text',
  'macro.noUiohook': 'uiohook-napi is not available on this system.',
  'macro.noSteps': 'The macro has no steps.',
  'macro.playFailed': 'Native playback failed; check the main-process log.',
  'media.untitled': '(untitled)',
  'media.noArtist': '(no artist)',
  'rgb.onlyDirect': 'only offers Direct; the color is lost when OpenRGB closes.',
  'sensors.disabled': 'Sensors disabled',
  'sensors.uacCancelled': 'UAC cancelled by the user',
  'sensors.netshCode': 'netsh exited with code',
  'currency.badCode': 'Invalid currency:',
};

let actual: Record<Clave, string> = ES;

/**
 * Fija el idioma desde la configuración. `'system'` (o sin valor) mira el
 * locale del sistema, igual que hace `resolveLang` en el renderer.
 */
export function fijarIdioma(pref: string | undefined) {
  if (pref === 'es') { actual = ES; return; }
  if (pref === 'en') { actual = EN; return; }
  actual = app.getLocale().toLowerCase().startsWith('es') ? ES : EN;
}

export function tm(clave: Clave): string {
  return actual[clave];
}
