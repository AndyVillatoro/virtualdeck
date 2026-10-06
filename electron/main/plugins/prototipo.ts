import { app } from 'electron';
import { loadConfig } from '../configManager';
import { iniciarServidorArchivos } from './archivos';
import type { ServidorArchivos } from './archivos';
import { crearAnfitrion } from './anfitrion';
import type { Anfitrion } from './anfitrion';
import { leerManifiesto } from './manifiesto';
import type { AccionManifiesto, CodigoManifiesto, Manifiesto } from './manifiesto';
import { lanzarPluginHTML, lanzarPluginNode } from './procesos';
import type { PluginLanzado } from './procesos';
import { abrirVentanaPI } from './ventanaPI';

/**
 * Fase 0 del anfitrión de plugins: un prototipo sin interfaz que solo se
 * enciende con `VD_PLUGIN_PROTO=<carpeta .sdPlugin>`.
 *
 * Sin esa variable no se crea nada —ni servidor, ni ventana, ni proceso—: es un
 * banco de pruebas para medir con plugins reales (Essentials for Spotify, Home
 * Assistant, Multi OBS) antes de decidir el MVP del roadmap 83.
 *
 * Los pasos quedan en el registro con el prefijo `[plugins]` y los
 * milisegundos desde que arrancó el prototipo. La salida del proceso del
 * plugin va aparte, con `[plugin:<uuid>]`.
 */

const CONTEXTO_PROTO = 'proto-1';
const DISPOSITIVO_PROTO = 'vd-proto';

interface EstadoPrototipo {
  inicio: number;
  archivos: ServidorArchivos;
  anfitrion: Anfitrion;
  plugin: PluginLanzado | null;
  ventanaPI: ReturnType<typeof abrirVentanaPI> | null;
  temporizadores: Array<ReturnType<typeof setTimeout>>;
}

let activo: EstadoPrototipo | null = null;

/** Apaga todo lo que encendió `iniciarPrototipoPlugins`. Síncrono a propósito. */
export function detenerPrototipoPlugins(): void {
  const corriente = activo;
  if (!corriente) return;
  activo = null;
  for (const temporizador of corriente.temporizadores) clearTimeout(temporizador);
  try {
    corriente.plugin?.cerrar();
  } catch {
    /* ya estaba muerto */
  }
  try {
    if (corriente.ventanaPI && !corriente.ventanaPI.isDestroyed()) corriente.ventanaPI.destroy();
  } catch {
    /* ya estaba cerrada */
  }
  try {
    corriente.anfitrion.cerrar();
  } catch {
    /* ya estaba cerrado */
  }
  try {
    corriente.archivos.cerrar();
  } catch {
    /* ya estaba cerrado */
  }
  console.log('[plugins] prototipo detenido');
}

/** Arranca el prototipo si `VD_PLUGIN_PROTO` apunta a una carpeta. */
export function iniciarPrototipoPlugins(): void {
  const ruta = process.env.VD_PLUGIN_PROTO;
  if (!ruta) return;
  arrancar(ruta).catch((e: Error) => console.log(`[plugins] no arranco: ${e.message}`));
}

async function arrancar(ruta: string): Promise<void> {
  const inicio = Date.now();
  const ms = () => Date.now() - inicio;
  console.log(`[plugins] leyendo manifiesto en ${ruta}`);
  const lectura = leerManifiesto(ruta);
  if (lectura.estado === 'error') {
    motivoDeRechazo(lectura.codigo);
    return;
  }
  const manifiesto = lectura.manifiesto;
  if (manifiesto.tipo === 'exe') {
    console.log('[plugins] el prototipo no lanza ejecutables .exe');
    return;
  }
  const accion = manifiesto.acciones.find((a) => a.controladores.includes('Keypad'));
  if (!accion) {
    console.log('[plugins] el manifiesto no trae ninguna accion Keypad');
    return;
  }
  const idioma = idiomaDeLaApp();
  console.log(`[plugins] ${manifiesto.nombre} ${manifiesto.version} (${manifiesto.uuid}) tipo=${manifiesto.tipo}${manifiesto.esMirabox ? ' Mirabox' : ''} a los ${ms()} ms`);

  const archivos = await iniciarServidorArchivos(manifiesto.carpeta);
  const anfitrion = await crearAnfitrion(
    { puertoArchivos: archivos.puerto, uuid: manifiesto.uuid, version: manifiesto.version, idioma, carpeta: manifiesto.carpeta },
    () => alRegistrarse(manifiesto, accion),
  );
  activo = { inicio, archivos, anfitrion, plugin: null, ventanaPI: null, temporizadores: [] };
  const plugin = manifiesto.tipo === 'html'
    ? lanzarPluginHTML({
      carpeta: manifiesto.carpeta,
      uuid: manifiesto.uuid,
      codePath: manifiesto.codePath,
      puerto: anfitrion.puerto,
      puertoArchivos: archivos.puerto,
      infoJSON: anfitrion.infoJSON,
    })
    : lanzarPluginNode({
      carpeta: manifiesto.carpeta,
      uuid: manifiesto.uuid,
      codePath: manifiesto.codePath,
      puerto: anfitrion.puerto,
      puertoArchivos: archivos.puerto,
      infoJSON: anfitrion.infoJSON,
    });
  activo.plugin = plugin;
  console.log(`[plugins] escuchando ws ${anfitrion.puerto} y archivos ${archivos.puerto}, plugin lanzado a los ${ms()} ms`);
}

function alRegistrarse(manifiesto: Manifiesto, accion: AccionManifiesto): void {
  const corriente = activo;
  if (!corriente) return;
  console.log(`[plugins] registro completado a los ${Date.now() - corriente.inicio} ms`);
  corriente.anfitrion.enviar({
    event: 'deviceDidConnect',
    device: DISPOSITIVO_PROTO,
    deviceInfo: { name: 'VirtualDeck prototipo', size: { columns: 5, rows: 3 }, type: 0 },
  });
  corriente.anfitrion.enviar({
    event: 'willAppear',
    action: accion.uuid,
    context: CONTEXTO_PROTO,
    device: DISPOSITIVO_PROTO,
    payload: { settings: {}, coordinates: { column: 0, row: 0 }, controller: 'Keypad', isInMultiAction: false },
  });
  if (process.env.VD_PLUGIN_PROTO_PULSAR === '1') programarPulsos(corriente);
  if (process.env.VD_PLUGIN_PROTO_PI === '1') abrirPI(corriente, manifiesto, accion);
}

function programarPulsos(corriente: EstadoPrototipo): void {
  const disparar = () => {
    corriente.anfitrion.pulsar(CONTEXTO_PROTO);
    console.log(`[plugins] pulsacion enviada a los ${Date.now() - corriente.inicio} ms`);
    corriente.temporizadores.push(setTimeout(disparar, 10000));
  };
  corriente.temporizadores.push(setTimeout(disparar, 5000));
}

function abrirPI(corriente: EstadoPrototipo, manifiesto: Manifiesto, accion: AccionManifiesto): void {
  const piPath = accion.piPath ?? manifiesto.piPath;
  if (!piPath) {
    console.log('[plugins] la accion no trae PropertyInspectorPath');
    return;
  }
  corriente.ventanaPI = abrirVentanaPI({
    uuid: manifiesto.uuid,
    carpeta: manifiesto.carpeta,
    piPath,
    puerto: corriente.anfitrion.puerto,
    puertoArchivos: corriente.archivos.puerto,
    contexto: CONTEXTO_PROTO,
    accion: accion.uuid,
    infoJSON: corriente.anfitrion.infoJSON,
    tamano: manifiesto.tamanoPI,
    settings: {},
    coordinates: { column: 0, row: 0 },
  });
  console.log(`[plugins] PI abierto a los ${Date.now() - corriente.inicio} ms`);
}

function idiomaDeLaApp(): string {
  const pref = (loadConfig() as any)?.language;
  if (pref === 'es') return 'es';
  if (pref === 'en') return 'en';
  return app.getLocale().toLowerCase().startsWith('es') ? 'es' : 'en';
}

function motivoDeRechazo(codigo: CodigoManifiesto): void {
  if (codigo === 'cifrado') console.log('[plugins] el manifiesto esta cifrado o dañado (DRM de Elgato)');
  else if (codigo === 'leer') console.log('[plugins] no pude leer manifest.json');
  else if (codigo === 'uuid') console.log('[plugins] el manifiesto no trae UUID');
  else if (codigo === 'codepath') console.log('[plugins] el manifiesto no trae CodePath');
  else if (codigo === 'fuera') console.log('[plugins] una ruta del manifiesto sale de la carpeta del plugin');
  else if (codigo === 'tipo') console.log('[plugins] extension de CodePath no soportada');
  else if (codigo === 'os') console.log('[plugins] el manifiesto no declara OS windows');
  else console.log(`[plugins] manifiesto rechazado (${codigo})`);
}
