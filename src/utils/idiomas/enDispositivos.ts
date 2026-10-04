import type { Dict } from './tipos';

/**
 * Fragmento del diccionario: pantalla de dispositivos (controladores físicos como el Stream Dock N3).
 *
 * Se fusiona en `en.ts`. Las claves son estables (no el texto).
 */
export const EN_DISPOSITIVOS: Dict = {
  'disp.nav': 'DEV',
  'disp.titulo': 'Devices',
  'disp.volver': 'Back',
  'disp.breadcrumb.config': 'Settings',
  'disp.detectados': 'Detected devices',
  'disp.conectado': 'Connected',
  'disp.desconectado': 'Disconnected',
  'disp.sinDispositivos': 'No devices configured',
  'disp.sinDispositivosDesc': 'Connect a Stream Dock N3 via USB to get started.',
  'disp.resumenN3': '6 LCD keys (64×64) · 3 buttons · 3 knobs',
  'disp.brillo': 'LCD Brightness',
  'disp.serial': 'Serial No.',
  'disp.pagina': 'Linked page',
  'disp.vacio': 'Empty',
  'disp.tecla': 'LCD Key {n}',
  'disp.boton': 'Button {n}',
  'disp.perilla': 'Knob {n}',
  'disp.izq': 'Turn left',
  'disp.pulsar': 'Press',
  'disp.der': 'Turn right',
  'disp.editar': 'Edit action',
  'disp.inspector.titulo': 'Control properties',
  'disp.inspector.tipo': 'Control type',
  'disp.inspector.accion': 'Assigned action',
  'disp.inspector.sinAccion': 'No action assigned',
  'disp.inspector.ayuda': 'Click any key, button or knob action to edit its action.',
  'disp.avisoDesconectado': 'Device disconnected. You can configure its actions; they will sync when connected.',
  'disp.avisoSinPagina': 'This device does not have an assigned deck page yet.',
  'disp.tipo.tecla': 'LCD screen (64×64) with switch',
  'disp.tipo.boton': 'Physical mechanical button',
  'disp.tipo.perilla': 'Rotary encoder (3 actions)',
};
