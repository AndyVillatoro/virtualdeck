import type { Dict } from './tipos';

/**
 * Fragmento del diccionario: pantalla de dispositivos (controladores físicos como el Stream Dock N3).
 *
 * Se fusiona en `es.ts`. Las claves son estables (no el texto).
 */
export const ES_DISPOSITIVOS: Dict = {
  'disp.nav': 'DISP',
  'disp.titulo': 'Dispositivos',
  'disp.volver': 'Atrás',
  'disp.breadcrumb.config': 'Configuración',
  'disp.detectados': 'Dispositivos detectados',
  'disp.conectado': 'Conectado',
  'disp.desconectado': 'Desconectado',
  'disp.sinDispositivos': 'No hay dispositivos configurados',
  'disp.sinDispositivosDesc': 'Conecta un Stream Dock N3 por USB para empezar a usarlo.',
  'disp.resumenN3': '6 teclas LCD (64×64) · 3 botones · 3 perillas',
  'disp.brillo': 'Brillo LCD',
  'disp.serial': 'Nº Serie',
  'disp.pagina': 'Página vinculada',
  'disp.vacio': 'Vacío',
  'disp.tecla': 'Tecla LCD {n}',
  'disp.boton': 'Botón {n}',
  'disp.perilla': 'Perilla {n}',
  'disp.izq': 'Giro izq.',
  'disp.pulsar': 'Pulsar',
  'disp.der': 'Giro der.',
  'disp.editar': 'Editar acción',
  'disp.inspector.titulo': 'Propiedades del control',
  'disp.inspector.tipo': 'Tipo de control',
  'disp.inspector.accion': 'Acción asignada',
  'disp.inspector.sinAccion': 'Sin acción asignada',
  'disp.inspector.ayuda': 'Pulsa cualquier tecla, botón o acción de perilla para editar su acción.',
  'disp.avisoDesconectado': 'Dispositivo desconectado. Puedes configurar sus acciones; se sincronizarán al conectarlo.',
  'disp.avisoSinPagina': 'Este dispositivo aún no tiene página asignada en el deck.',
  'disp.tipo.tecla': 'Pantalla LCD (64×64) con switch',
  'disp.tipo.boton': 'Botón físico mecánico',
  'disp.tipo.perilla': 'Encoder rotativo (3 acciones)',
};
