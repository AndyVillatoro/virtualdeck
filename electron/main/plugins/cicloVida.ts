import { app } from 'electron';
import { DISPOSITIVO_GESTOR, ESPERA_REGISTRO_MS, MAX_REINTENTOS, dirDe, dirPlugins, estado, type Marcha } from './estado';
import { emitir, leerInstalados } from './inventario';
import { emitirSettings, emitirVisual } from './eventos';
import { iniciarServidorArchivos, type ServidorArchivos } from './archivos';
import { crearAnfitrion, type Anfitrion } from './anfitrion';
import { leerManifiesto } from './manifiesto';
import { lanzarPluginHTML, lanzarPluginNode, type PluginLanzado } from './procesos';
import { guardarGlobales, leerDeshabilitados, leerGlobales } from './ajustesPlugins';
import { validarUuid } from './instalacion';
import { loadConfig } from '../configManager';

/**
 * Ciclo de vida de los plugins en marcha (roadmap 83, MVP).
 *
 * Arranca los habilitados al abrir la aplicación, levanta cada uno (un
 * servidor de archivos + un anfitrión + un proceso o ventana oculta), lo marca
 * `running` al registrarse, lo reintenta hasta 3 veces (espera 1/2/4 s) si se
 * cae y lo detiene al cerrar. El inventario de lo instalado es de
 * `inventario.ts`; instalar y quitar es de `instalar.ts`.
 *
 * Concurrencia (hallazgo #5): la marcha se registra en `enMarcha`
 * **sincrónicamente** en `arrancar`, antes de cualquier `await`; si `levantar`
 * despierta y su marcha ya no es la vigente (o se está deteniendo), cierra lo
 * que levantó y no lanza el proceso. Así ni los arranques en paralelo duplican
 * servidores ni un arranque lento resucita tras detener o desinstalar.
 */

/** Cuánto tiene que seguir vivo un plugin para perdonar sus fallos (#6). */
const ESPERA_ESTABLE_MS = 5000;

/** Arranca la aplicación: lanza los plugins habilitados. */
export function iniciarGestorPlugins(): void {
  if (estado.iniciado) return;
  estado.iniciado = true;
  estado.deshabilitados = leerDeshabilitados(dirPlugins());
  for (const manifiesto of leerInstalados()) {
    if (!estado.deshabilitados.has(manifiesto.uuid)) arrancar(manifiesto.uuid);
  }
}

/** Cierre de la aplicación: síncrono, como `detenerPrototipoPlugins`. */
export function detenerGestorPlugins(): void {
  estado.iniciado = false;
  for (const temporizador of estado.reintentosPendientes.values()) clearTimeout(temporizador);
  estado.reintentosPendientes.clear();
  for (const uuid of [...estado.enMarcha.keys()]) detenerMarcha(uuid);
}

export async function arrancar(uuid: string): Promise<void> {
  // Defensa en profundidad: `dirDe(uuid)` es un `join`, y un UUID con `..`
  // saldría de `plugins/` (hallazgo #4). Todos los llamadores ya validan.
  if (!validarUuid(uuid)) {
    console.log(`[plugins] ${uuid} no arranca: uuid invalido`);
    return;
  }
  if (estado.enMarcha.has(uuid)) return;
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
  // Sincrónico, antes del primer `await`: los arranques en paralelo ven la
  // marcha y no levantan otra (hallazgo #5).
  estado.enMarcha.set(uuid, marcha);
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
    // Solo entierra a la marcha vigente: si mientras esperaba ya se detuvo (o
    // otro arranque la sustituyó), no se toca lo ajeno (hallazgo #5).
    if (estado.enMarcha.get(uuid) === marcha) {
      detenerMarcha(uuid);
      estado.fallos.set(uuid, 'inicio');
      emitir();
    }
    return;
  }
  // Alguien lo detuvo (o desinstaló) mientras esperaba: se cierra lo levantado
  // y no se lanza el proceso de un plugin ya muerto (hallazgo #5).
  if (marcha.deteniendo || estado.enMarcha.get(uuid) !== marcha) {
    cerrarServidores(anfitrion, archivos);
    return;
  }
  marcha.archivos = archivos;
  marcha.puertoArchivos = archivos.puerto;
  marcha.anfitrion = anfitrion;
  marcha.estado = 'starting';
  marcha.registrado = false;
  // La salida solo cuenta si es de este proceso: en modo `spawn` un fallo de
  // arranque dispara `error` y `exit` (doble aviso), y una salida tardía del
  // proceso viejo no puede tumbar al reintento nuevo (hallazgo #6).
  let lanzado: PluginLanzado | null = null;
  const datos = {
    carpeta: marcha.manifiesto.carpeta,
    uuid: marcha.manifiesto.uuid,
    uuidRegistro: anfitrion.uuidRegistro,
    codePath: marcha.manifiesto.codePath,
    puerto: anfitrion.puerto,
    puertoArchivos: archivos.puerto,
    infoJSON: anfitrion.infoJSON,
    alSalir: () => {
      if (lanzado && marcha.proceso === lanzado) alSalirPlugin(uuid);
    },
  };
  marcha.proceso = marcha.manifiesto.tipo === 'html' ? lanzarPluginHTML(datos) : lanzarPluginNode(datos);
  lanzado = marcha.proceso;
  vigilarRegistro(uuid, marcha);
  console.log(`[plugins] ${marcha.manifiesto.nombre} ${marcha.manifiesto.version} en marcha (${uuid})`);
  emitir();
}

/** Cierra un anfitrión y un servidor recién levantados que ya no hacen falta. */
function cerrarServidores(anfitrion: Anfitrion | null, archivos: ServidorArchivos | null): void {
  try {
    anfitrion?.cerrar();
  } catch {
    /* ya estaba cerrado */
  }
  try {
    archivos?.cerrar();
  } catch {
    /* ya estaba cerrado */
  }
}

/** Saca un temporizador de la marcha (ya disparó o ya no hace falta). */
function quitarTemporizador(marcha: Marcha, temporizador: ReturnType<typeof setTimeout>): void {
  const indice = marcha.temporizadores.indexOf(temporizador);
  if (indice >= 0) marcha.temporizadores.splice(indice, 1);
}

/**
 * Si el proceso no se registra en `ESPERA_REGISTRO_MS`, se lo mata y su salida
 * dispara el reintento: un plugin colgado no se queda en `starting` para
 * siempre (hallazgo #6).
 */
function vigilarRegistro(uuid: string, marcha: Marcha): void {
  const temporizador = setTimeout(() => {
    quitarTemporizador(marcha, temporizador);
    if (!marcha.registrado && estado.enMarcha.get(uuid) === marcha && !marcha.deteniendo) {
      console.log(`[plugins] ${uuid} no se registro a tiempo; se reintenta`);
      try {
        marcha.proceso?.cerrar();
      } catch {
        /* ya estaba muerto */
      }
    }
  }, ESPERA_REGISTRO_MS);
  marcha.temporizadores.push(temporizador);
}

/**
 * Los fallos solo se perdonan con estabilidad: si el plugin se registra y
 * sigue vivo 5 s, vuelve a 0. Sin esto, un plugin que se registra y crashea al
 * recibir `deviceDidConnect` no supera nunca el intento 1 y reintenta sin fin
 * sin llegar a `MAX_REINTENTOS` (hallazgo #6).
 */
function programarReseteoEstable(uuid: string, marcha: Marcha): void {
  const temporizador = setTimeout(() => {
    quitarTemporizador(marcha, temporizador);
    if (estado.enMarcha.get(uuid) === marcha && marcha.registrado && !marcha.deteniendo) {
      marcha.reintentos = 0;
    }
  }, ESPERA_ESTABLE_MS);
  marcha.temporizadores.push(temporizador);
}

function alRegistrarse(uuid: string): void {
  const marcha = estado.enMarcha.get(uuid);
  const anfitrion = marcha?.anfitrion;
  if (!marcha || !anfitrion || marcha.deteniendo) return;
  marcha.registrado = true;
  marcha.estado = 'running';
  programarReseteoEstable(uuid, marcha);
  estado.fallos.delete(uuid);
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
  for (const contexto of estado.contextos.contextosDePlugin(uuid)) {
    const datos = estado.contextos.obtener(contexto);
    if (datos) anfitrion.aparecer(contexto, { accion: datos.accionUuid, settings: datos.settings, columna: datos.columna, fila: datos.fila });
  }
  for (const despertar of marcha.enEspera.splice(0)) despertar(true);
  emitir();
}

function alGuardarSettings(contexto: string, settings: Record<string, unknown>): void {
  const actual = estado.contextos.obtener(contexto);
  if (actual) estado.contextos.registrar(contexto, { ...actual, settings });
  emitirSettings(contexto, settings);
}

function alSalirPlugin(uuid: string): void {
  const marcha = estado.enMarcha.get(uuid);
  if (!marcha || marcha.deteniendo) return;
  marcha.reintentos += 1;
  console.log(`[plugins] ${uuid} termino (intento ${marcha.reintentos} de ${MAX_REINTENTOS})`);
  if (marcha.reintentos > MAX_REINTENTOS) {
    detenerMarcha(uuid);
    estado.fallos.set(uuid, 'fallo');
    console.log(`[plugins] ${uuid} no se pudo mantener en marcha`);
    emitir();
    return;
  }
  marcha.estado = 'starting';
  marcha.registrado = false;
  cerrarRecursos(marcha);
  marcha.proceso = null;
  const espera = 1000 * 2 ** (marcha.reintentos - 1);
  estado.reintentosPendientes.set(
    uuid,
    setTimeout(() => {
      estado.reintentosPendientes.delete(uuid);
      if (estado.enMarcha.get(uuid) === marcha && !marcha.deteniendo) levantar(uuid, marcha);
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

export function detenerMarcha(uuid: string): void {
  const marcha = estado.enMarcha.get(uuid);
  if (!marcha) return;
  estado.enMarcha.delete(uuid);
  marcha.deteniendo = true;
  const reintento = estado.reintentosPendientes.get(uuid);
  if (reintento) {
    clearTimeout(reintento);
    estado.reintentosPendientes.delete(uuid);
  }
  for (const despertar of marcha.enEspera.splice(0)) despertar(false);
  cerrarRecursos(marcha);
  try {
    marcha.proceso?.cerrar();
  } catch {
    /* ya estaba muerto */
  }
  // Los contextos se quedan a propósito: siguen visibles en la página y al
  // rehabilitar el plugin se les vuelve a aparecer sin que el renderer tenga
  // que reenviar nada (hallazgo #8). Solo `aparecerPlugin(ref, false)` —el
  // botón salió de la página— o desinstalar los retiran.
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
