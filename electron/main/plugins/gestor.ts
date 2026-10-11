import { app, dialog, type BrowserWindow } from 'electron';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, type Dirent } from 'fs';
import { join } from 'path';
import type { EstadoPlugin, PluginInfo, PluginRef, ResultadoInstalacion } from '../../../src/types';
import { emitirCambios, emitirSettings, emitirVisual } from './eventos';
import { iniciarServidorArchivos, type ServidorArchivos } from './archivos';
import { crearAnfitrion, type Anfitrion } from './anfitrion';
import { leerManifiesto, type AccionManifiesto, type CodigoManifiesto, type Manifiesto } from './manifiesto';
import { lanzarPluginHTML, lanzarPluginNode, type PluginLanzado } from './procesos';
import { abrirVentanaPI } from './ventanaPI';
import { extraerZipSeguro, validarUuid } from './instalacion';
import { TablaContextos } from './contextos';
import { guardarDeshabilitados, guardarGlobales, leerDeshabilitados, leerGlobales } from './ajustesPlugins';
import { loadConfig } from '../configManager';
import { tm } from '../idioma';

/**
 * Gestor de plugins instalados (roadmap 83, MVP).
 *
 * Convierte el prototipo de un solo plugin (`prototipo.ts`, fase 0) en un
 * gestor de varios: cada plugin habilitado tiene **un anfitrión** (WebSocket
 * local) **+ un proceso** (Node) o ventana oculta (HTML), sus ventanas PI y
 * sus contextos (ver `contextos.ts`). El contrato con el renderer no cambia:
 * `src/types/plugins.ts`, `ipc/pluginsIpc.ts`, preload y `eventos.ts`.
 */

const DISPOSITIVO_GESTOR = { id: 'virtualdeck', nombre: 'VirtualDeck', columnas: 5, filas: 3 };
/** Cuánto se espera a que un plugin se registre antes de decir que no. */
const ESPERA_REGISTRO_MS = 3000;
const MAX_REINTENTOS = 3;

interface Marcha {
  manifiesto: Manifiesto;
  archivos: ServidorArchivos | null;
  puertoArchivos: number;
  anfitrion: Anfitrion | null;
  proceso: PluginLanzado | null;
  estado: EstadoPlugin;
  reintentos: number;
  registrado: boolean;
  enEspera: Array<(ok: boolean) => void>;
  temporizadores: Array<ReturnType<typeof setTimeout>>;
  pis: Map<string, BrowserWindow>;
  deteniendo: boolean;
}

/** Una marcha con el anfitrión ya levantado, lista para hablar. */
interface MarchaLista {
  marcha: Marcha;
  anfitrion: Anfitrion;
}

const enMarcha = new Map<string, Marcha>();
/** UUID → código del último fallo (lo que `PluginInfo.error` enseña). */
const fallos = new Map<string, string>();
const reintentosPendientes = new Map<string, ReturnType<typeof setTimeout>>();
const contextos = new TablaContextos();
let deshabilitados = new Set<string>();
let iniciado = false;

function dirPlugins(): string {
  return join(app.getPath('userData'), 'plugins');
}

function dirDe(uuid: string): string {
  return join(dirPlugins(), `${uuid}.sdPlugin`);
}

function emitir(): void {
  emitirCambios(listarPlugins());
}

function aAccion(manifiesto: Manifiesto, accion: AccionManifiesto, indice: number): PluginInfo['acciones'][number] {
  const reserva = `${manifiesto.uuid}#${indice}`;
  return {
    uuid: accion.uuid || reserva,
    nombre: accion.nombre || accion.uuid || reserva,
    esTecla: accion.controladores.includes('Keypad'),
    tienePI: !!(accion.piPath ?? manifiesto.piPath),
  };
}

function aInfo(manifiesto: Manifiesto): PluginInfo {
  const marcha = enMarcha.get(manifiesto.uuid);
  const fallo = fallos.get(manifiesto.uuid);
  return {
    uuid: manifiesto.uuid,
    nombre: manifiesto.nombre,
    version: manifiesto.version,
    tipo: manifiesto.tipo === 'exe' ? 'node' : manifiesto.tipo,
    acciones: manifiesto.acciones.map((accion, i) => aAccion(manifiesto, accion, i)),
    habilitado: !deshabilitados.has(manifiesto.uuid),
    estado: marcha?.estado ?? (fallo ? 'error' : 'stopped'),
    ...(fallo ? { error: fallo } : {}),
  };
}

/** Los manifiestos instalados que el gestor entiende (los `.exe` no). */
function leerInstalados(): Manifiesto[] {
  const salida: Manifiesto[] = [];
  let base: string;
  try {
    base = dirPlugins();
  } catch {
    return [];
  }
  if (!existsSync(base)) return [];
  let entradas: Dirent<string>[];
  try {
    entradas = readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entrada of entradas) {
    if (!entrada.isDirectory() || !entrada.name.endsWith('.sdPlugin')) continue;
    const lectura = leerManifiesto(join(base, entrada.name));
    if (lectura.estado !== 'ok' || lectura.manifiesto.tipo === 'exe') continue;
    salida.push(lectura.manifiesto);
  }
  return salida.sort((a, b) => (a.uuid < b.uuid ? -1 : 1));
}

export function listarPlugins(): PluginInfo[] {
  return leerInstalados().map(aInfo);
}

function codigoDeManifiesto(codigo: CodigoManifiesto): 'cifrado' | 'os' | 'invalido' {
  if (codigo === 'cifrado') return 'cifrado';
  if (codigo === 'os') return 'os';
  return 'invalido';
}

function infoDe(uuid: string): PluginInfo | null {
  const manifiesto = leerInstalados().find((m) => m.uuid === uuid);
  return manifiesto ? aInfo(manifiesto) : null;
}

export async function instalarPlugin(ruta?: string): Promise<ResultadoInstalacion> {
  if (ruta) return instalarDesdeZip(ruta);
  const elegido = await dialog.showOpenDialog({
    title: tm('dlg.installPlugin'),
    filters: [{ name: tm('filter.plugins'), extensions: ['streamDeckPlugin'] }],
    properties: ['openFile'],
  });
  if (elegido.canceled || !elegido.filePaths[0]) return { ok: false, codigo: 'cancelado' };
  return instalarDesdeZip(elegido.filePaths[0]);
}

async function instalarDesdeZip(zipPath: string): Promise<ResultadoInstalacion> {
  let esArchivo: boolean;
  try {
    esArchivo = statSync(zipPath).isFile();
  } catch {
    esArchivo = false;
  }
  if (!esArchivo) return { ok: false, codigo: 'zip', detalle: 'no-archivo' };
  const base = dirPlugins();
  try {
    mkdirSync(base, { recursive: true });
  } catch {
    return { ok: false, codigo: 'zip', detalle: 'sin-carpeta' };
  }
  const temporal = join(base, `.tmp-${process.pid}-${Date.now()}`);
  try {
    mkdirSync(temporal, { recursive: true });
  } catch {
    return { ok: false, codigo: 'zip', detalle: 'sin-temporal' };
  }
  const limpiar = () => {
    try {
      rmSync(temporal, { recursive: true, force: true });
    } catch {
      /* ya estaba limpio */
    }
  };
  const extraido = await extraerZipSeguro(zipPath, temporal);
  // Ojo: `if (!extraido.ok)` NO estrecha con este tsconfig (`strict: false`);
  // la comparación explícita sí (ver handoff de T-PLG-01).
  if (extraido.ok === false) {
    limpiar();
    return extraido;
  }
  const lectura = leerManifiesto(extraido.carpeta);
  if (lectura.estado === 'error') {
    limpiar();
    return { ok: false, codigo: codigoDeManifiesto(lectura.codigo) };
  }
  // El MVP no lanza ejecutables: ni los instala.
  if (lectura.manifiesto.tipo === 'exe') {
    limpiar();
    return { ok: false, codigo: 'exe' };
  }
  if (!validarUuid(lectura.manifiesto.uuid)) {
    limpiar();
    return { ok: false, codigo: 'invalido', detalle: 'uuid' };
  }
  const uuid = lectura.manifiesto.uuid;
  if (existsSync(dirDe(uuid))) {
    limpiar();
    return { ok: false, codigo: 'duplicado' };
  }
  try {
    renameSync(extraido.carpeta, dirDe(uuid));
    rmSync(temporal, { recursive: true, force: true });
  } catch {
    limpiar();
    return { ok: false, codigo: 'zip', detalle: 'rename' };
  }
  // Instalar es habilitar: si se deshabilitó una versión anterior, la nueva
  // vuelve encendida.
  if (deshabilitados.delete(uuid)) guardarDeshabilitados(base, deshabilitados);
  fallos.delete(uuid);
  emitir();
  await arrancar(uuid);
  const info = infoDe(uuid);
  return info ? { ok: true, plugin: info } : { ok: false, codigo: 'invalido', detalle: 'manifiesto' };
}

export async function desinstalarPlugin(uuid: string): Promise<boolean> {
  if (!validarUuid(uuid) || !existeInstalado(uuid)) return false;
  detenerMarcha(uuid);
  fallos.delete(uuid);
  // En Windows la carpeta sigue bloqueada un instante por el proceso que acaba
  // de morir (`cwd` y el propio `plugin.js`): se reintenta, como el renombre
  // de `configManager`. Sin esto, desinstalar siempre dice que no.
  const carpetaBorrada = await borrarConReintentos(dirDe(uuid));
  await borrarConReintentos(join(dirPlugins(), `${uuid}.global.json`));
  if (!carpetaBorrada) {
    emitir();
    return false;
  }
  if (deshabilitados.delete(uuid)) guardarDeshabilitados(dirPlugins(), deshabilitados);
  emitir();
  return true;
}

/** Borra (archivo o carpeta) reintentando: en Windows el bloqueo tarda en soltarse. */
async function borrarConReintentos(ruta: string, intentos = 5): Promise<boolean> {
  for (let i = 0; i < intentos; i++) {
    try {
      rmSync(ruta, { recursive: true, force: true });
      return true;
    } catch {
      if (i === intentos - 1) return false;
      await new Promise((dormir) => setTimeout(dormir, 200));
    }
  }
  return false;
}

function existeInstalado(uuid: string): boolean {
  try {
    return existsSync(dirDe(uuid));
  } catch {
    return false;
  }
}

export async function habilitarPlugin(uuid: string, habilitado: boolean): Promise<PluginInfo | null> {
  if (!validarUuid(uuid) || !existeInstalado(uuid)) return null;
  const lectura = leerManifiesto(dirDe(uuid));
  if (lectura.estado === 'error' || lectura.manifiesto.tipo === 'exe') return null;
  if (habilitado) {
    if (deshabilitados.delete(uuid)) guardarDeshabilitados(dirPlugins(), deshabilitados);
    fallos.delete(uuid);
    await arrancar(uuid);
  } else {
    if (!deshabilitados.has(uuid)) {
      deshabilitados.add(uuid);
      guardarDeshabilitados(dirPlugins(), deshabilitados);
    }
    detenerMarcha(uuid);
  }
  emitir();
  return infoDe(uuid);
}

/** El botón apareció (`willAppear`) o dejó de estarlo (`willDisappear`). */
export async function aparecerPlugin(ref: PluginRef, visible: boolean): Promise<boolean> {
  const lista = await marchaLista(ref);
  if (!lista) return false;
  const accion = lista.marcha.manifiesto.acciones.find((a) => a.uuid === ref.accionUuid);
  if (!accion) return false;
  if (visible) {
    const settings = settingsDe(ref);
    lista.anfitrion.aparecer(ref.contexto, { accion: ref.accionUuid, settings });
    contextos.registrar(ref.contexto, {
      pluginUuid: ref.pluginUuid,
      accionUuid: ref.accionUuid,
      settings,
      columna: 0,
      fila: 0,
    });
  } else {
    lista.anfitrion.desaparecer(ref.contexto);
    contextos.retirar(ref.contexto);
  }
  return true;
}

export async function pulsarPlugin(ref: PluginRef, abajo: boolean): Promise<boolean> {
  const lista = await marchaLista(ref);
  if (!lista || !contextos.tiene(ref.contexto)) return false;
  lista.anfitrion.tecla(ref.contexto, abajo);
  return true;
}

/** Los ajustes que trae el botón, o un objeto vacío si trae otra cosa. */
function settingsDe(ref: PluginRef): Record<string, unknown> {
  if (ref.settings !== null && typeof ref.settings === 'object' && !Array.isArray(ref.settings)) {
    return ref.settings as Record<string, unknown>;
  }
  return {};
}

/**
 * La marcha lista para hablar con el plugin, o `null`. Si está habilitado
 * pero parado, se arranca; si aún no se registró, se espera hasta 3 s. El
 * anfitrión va en un local ya estrechado, sin `as`.
 */
async function marchaLista(ref: PluginRef | undefined): Promise<MarchaLista | null> {
  if (!ref || !validarUuid(ref.pluginUuid)) return null;
  if (typeof ref.contexto !== 'string' || ref.contexto === '') return null;
  if (typeof ref.accionUuid !== 'string' || ref.accionUuid === '') return null;
  if (!enMarcha.has(ref.pluginUuid)) {
    if (deshabilitados.has(ref.pluginUuid) || !existeInstalado(ref.pluginUuid)) return null;
    await arrancar(ref.pluginUuid);
  }
  const marcha = enMarcha.get(ref.pluginUuid);
  const anfitrion = marcha?.anfitrion;
  if (!marcha || !anfitrion) return null;
  if (!marcha.registrado && !(await esperarRegistro(ref.pluginUuid, marcha))) return null;
  const actual = enMarcha.get(ref.pluginUuid);
  const actualAnfitrion = actual?.anfitrion;
  if (actual !== marcha || !actualAnfitrion) return null;
  return { marcha, anfitrion: actualAnfitrion };
}

function esperarRegistro(uuid: string, marcha: Marcha): Promise<boolean> {
  if (marcha.registrado) return Promise.resolve(true);
  return new Promise((listo) => {
    const temporizador = setTimeout(() => {
      const indice = marcha.enEspera.indexOf(despertar);
      if (indice >= 0) marcha.enEspera.splice(indice, 1);
      listo(enMarcha.get(uuid) === marcha && marcha.registrado);
    }, ESPERA_REGISTRO_MS);
    const despertar = (ok: boolean) => {
      clearTimeout(temporizador);
      listo(ok);
    };
    // Sin guardar el temporizador en la marcha: si se desinstala, la espera se
    // resuelve con `false` por el vaciado de `detenerMarcha` y este `listo`
    // tardío ya no hace nada.
    marcha.enEspera.push(despertar);
  });
}

export async function abrirPIPlugin(ref: PluginRef): Promise<boolean> {
  const lista = await marchaLista(ref);
  if (!lista) return false;
  const accion = lista.marcha.manifiesto.acciones.find((a) => a.uuid === ref.accionUuid);
  const piPath = accion?.piPath ?? lista.marcha.manifiesto.piPath;
  if (!accion || !piPath) return false;
  const abierto = lista.marcha.pis.get(ref.contexto);
  if (abierto && !abierto.isDestroyed()) {
    abierto.focus();
    return true;
  }
  const guardado = contextos.obtener(ref.contexto);
  const win = abrirVentanaPI({
    uuid: lista.marcha.manifiesto.uuid,
    carpeta: lista.marcha.manifiesto.carpeta,
    piPath,
    puerto: lista.anfitrion.puerto,
    puertoArchivos: lista.marcha.puertoArchivos,
    contexto: ref.contexto,
    accion: ref.accionUuid,
    infoJSON: lista.anfitrion.infoJSON,
    tamano: lista.marcha.manifiesto.tamanoPI,
    settings: guardado?.settings ?? settingsDe(ref),
    coordinates: { column: guardado?.columna ?? 0, row: guardado?.fila ?? 0 },
  });
  lista.marcha.pis.set(ref.contexto, win);
  win.on('closed', () => {
    if (lista.marcha.pis.get(ref.contexto) === win) lista.marcha.pis.delete(ref.contexto);
  });
  return true;
}

/** Arranca la aplicación: lanza los plugins habilitados. */
export function iniciarGestorPlugins(): void {
  if (iniciado) return;
  iniciado = true;
  deshabilitados = leerDeshabilitados(dirPlugins());
  for (const manifiesto of leerInstalados()) {
    if (!deshabilitados.has(manifiesto.uuid)) arrancar(manifiesto.uuid);
  }
}

/** Cierre de la aplicación: síncrono, como `detenerPrototipoPlugins`. */
export function detenerGestorPlugins(): void {
  iniciado = false;
  for (const temporizador of reintentosPendientes.values()) clearTimeout(temporizador);
  reintentosPendientes.clear();
  for (const uuid of [...enMarcha.keys()]) detenerMarcha(uuid);
}

async function arrancar(uuid: string): Promise<void> {
  if (enMarcha.has(uuid)) return;
  const lectura = leerManifiesto(dirDe(uuid));
  if (lectura.estado === 'error') {
    console.log(`[plugins] ${uuid} no arranca: manifiesto ${lectura.codigo}`);
    return;
  }
  if (lectura.manifiesto.tipo === 'exe') {
    console.log(`[plugins] ${uuid} no arranca: el MVP no lanza ejecutables`);
    return;
  }
  const marcha: Marcha = {
    manifiesto: lectura.manifiesto,
    archivos: null,
    puertoArchivos: 0,
    anfitrion: null,
    proceso: null,
    estado: 'starting',
    reintentos: 0,
    registrado: false,
    enEspera: [],
    temporizadores: [],
    pis: new Map(),
    deteniendo: false,
  };
  await levantar(uuid, marcha);
}

async function levantar(uuid: string, marcha: Marcha): Promise<void> {
  let archivos: ServidorArchivos;
  let anfitrion: Anfitrion;
  try {
    archivos = await iniciarServidorArchivos(marcha.manifiesto.carpeta);
    anfitrion = await crearAnfitrion(
      {
        puertoArchivos: archivos.puerto,
        uuid: marcha.manifiesto.uuid,
        version: marcha.manifiesto.version,
        idioma: idiomaDeLaApp(),
        carpeta: marcha.manifiesto.carpeta,
        dispositivo: DISPOSITIVO_GESTOR,
        globalesIniciales: leerGlobales(dirPlugins(), uuid) ?? {},
        alVisual: (visual) => emitirVisual(visual),
        alSettings: (contexto, settings) => alGuardarSettings(contexto, settings),
        alGlobales: (globales) => guardarGlobales(dirPlugins(), uuid, globales),
      },
      () => alRegistrarse(uuid),
    );
  } catch (e) {
    console.log(`[plugins] ${uuid} no arranca: ${(e as Error).message}`);
    detenerMarcha(uuid);
    fallos.set(uuid, 'inicio');
    emitir();
    return;
  }
  marcha.archivos = archivos;
  marcha.puertoArchivos = archivos.puerto;
  marcha.anfitrion = anfitrion;
  marcha.estado = 'starting';
  marcha.registrado = false;
  enMarcha.set(uuid, marcha);
  const datos = {
    carpeta: marcha.manifiesto.carpeta,
    uuid: marcha.manifiesto.uuid,
    codePath: marcha.manifiesto.codePath,
    puerto: anfitrion.puerto,
    puertoArchivos: archivos.puerto,
    infoJSON: anfitrion.infoJSON,
    alSalir: () => alSalirPlugin(uuid),
  };
  marcha.proceso = marcha.manifiesto.tipo === 'html' ? lanzarPluginHTML(datos) : lanzarPluginNode(datos);
  console.log(`[plugins] ${marcha.manifiesto.nombre} ${marcha.manifiesto.version} en marcha (${uuid})`);
  emitir();
}

function alRegistrarse(uuid: string): void {
  const marcha = enMarcha.get(uuid);
  const anfitrion = marcha?.anfitrion;
  if (!marcha || !anfitrion || marcha.deteniendo) return;
  marcha.registrado = true;
  marcha.estado = 'running';
  marcha.reintentos = 0;
  fallos.delete(uuid);
  console.log(`[plugins] ${uuid} registrado`);
  anfitrion.enviar({
    event: 'deviceDidConnect',
    device: DISPOSITIVO_GESTOR.id,
    deviceInfo: {
      name: DISPOSITIVO_GESTOR.nombre,
      size: { columns: DISPOSITIVO_GESTOR.columnas, rows: DISPOSITIVO_GESTOR.filas },
      type: 0,
    },
  });
  // Si es un reintento, los botones siguen ahí: se les vuelve a aparecer.
  for (const contexto of contextos.contextosDePlugin(uuid)) {
    const datos = contextos.obtener(contexto);
    if (datos) anfitrion.aparecer(contexto, { accion: datos.accionUuid, settings: datos.settings, columna: datos.columna, fila: datos.fila });
  }
  for (const despertar of marcha.enEspera.splice(0)) despertar(true);
  emitir();
}

function alGuardarSettings(contexto: string, settings: Record<string, unknown>): void {
  const actual = contextos.obtener(contexto);
  if (actual) contextos.registrar(contexto, { ...actual, settings });
  emitirSettings(contexto, settings);
}

function alSalirPlugin(uuid: string): void {
  const marcha = enMarcha.get(uuid);
  if (!marcha || marcha.deteniendo) return;
  marcha.reintentos += 1;
  console.log(`[plugins] ${uuid} termino (intento ${marcha.reintentos} de ${MAX_REINTENTOS})`);
  if (marcha.reintentos > MAX_REINTENTOS) {
    detenerMarcha(uuid);
    fallos.set(uuid, 'fallo');
    console.log(`[plugins] ${uuid} no se pudo mantener en marcha`);
    emitir();
    return;
  }
  marcha.estado = 'starting';
  marcha.registrado = false;
  cerrarRecursos(marcha);
  marcha.proceso = null;
  const espera = 1000 * 2 ** (marcha.reintentos - 1);
  reintentosPendientes.set(
    uuid,
    setTimeout(() => {
      reintentosPendientes.delete(uuid);
      if (enMarcha.get(uuid) === marcha && !marcha.deteniendo) levantar(uuid, marcha);
    }, espera),
  );
  emitir();
}

/** Cierra anfitrión, archivos y PIs, pero guarda contextos y esperas. */
function cerrarRecursos(marcha: Marcha): void {
  for (const temporizador of marcha.temporizadores.splice(0)) clearTimeout(temporizador);
  for (const [, win] of marcha.pis) {
    try {
      if (!win.isDestroyed()) win.destroy();
    } catch {
      /* ya estaba cerrada */
    }
  }
  marcha.pis.clear();
  try {
    marcha.anfitrion?.cerrar();
  } catch {
    /* ya estaba cerrado */
  }
  try {
    marcha.archivos?.cerrar();
  } catch {
    /* ya estaba cerrado */
  }
}

function detenerMarcha(uuid: string): void {
  const marcha = enMarcha.get(uuid);
  if (!marcha) return;
  enMarcha.delete(uuid);
  marcha.deteniendo = true;
  const reintento = reintentosPendientes.get(uuid);
  if (reintento) {
    clearTimeout(reintento);
    reintentosPendientes.delete(uuid);
  }
  for (const despertar of marcha.enEspera.splice(0)) despertar(false);
  cerrarRecursos(marcha);
  try {
    marcha.proceso?.cerrar();
  } catch {
    /* ya estaba muerto */
  }
  contextos.retirarDePlugin(uuid);
}

function idiomaDeLaApp(): string {
  const pref = (loadConfig() as { language?: unknown })?.language;
  if (pref === 'es') return 'es';
  if (pref === 'en') return 'en';
  try {
    return app.getLocale().toLowerCase().startsWith('es') ? 'es' : 'en';
  } catch {
    return 'es';
  }
}
