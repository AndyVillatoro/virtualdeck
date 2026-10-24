import { dialog } from 'electron';
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import type { PluginInfo, ResultadoInstalacion } from '../../../src/types';
import { dirDe, dirPlugins, estado } from './estado';
import { emitir, existeInstalado, infoDe } from './inventario';
import { arrancar, detenerMarcha } from './cicloVida';
import { leerManifiesto, type CodigoManifiesto } from './manifiesto';
import { extraerZipSeguro, validarUuid } from './instalacion';
import { guardarDeshabilitados } from './ajustesPlugins';
import { tm } from '../sistema/idioma';

/**
 * Instalar, desinstalar y habilitar plugins (roadmap 83, MVP).
 *
 * Opera sobre lo instalado en disco: valida el ZIP extraído, lo mueve a su
 * sitio, lo borra con reintentos o lo enciende y apaga. La extracción segura
 * del ZIP (zip-slip, topes) vive en `instalacion.ts`; el arranque y la parada
 * en `cicloVida.ts`; el inventario en `inventario.ts`.
 */

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

export async function instalarDesdeZip(zipPath: string, uuidEsperado?: string): Promise<ResultadoInstalacion> {
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
  // Cuando se instala desde URL el manifiesto de la tienda declara un UUID;
  // si el ZIP trae otro, no se extrae ni se arranca (T-SEC-07 H-09).
  if (uuidEsperado !== undefined && lectura.manifiesto.uuid !== uuidEsperado) {
    limpiar();
    return { ok: false, codigo: 'invalido', detalle: 'uuid-distinto' };
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
  if (estado.deshabilitados.delete(uuid)) guardarDeshabilitados(base, estado.deshabilitados);
  estado.fallos.delete(uuid);
  emitir();
  await arrancar(uuid);
  const info = infoDe(uuid);
  return info ? { ok: true, plugin: info } : { ok: false, codigo: 'invalido', detalle: 'manifiesto' };
}

function codigoDeManifiesto(codigo: CodigoManifiesto): 'cifrado' | 'os' | 'invalido' {
  if (codigo === 'cifrado') return 'cifrado';
  if (codigo === 'os') return 'os';
  return 'invalido';
}

export async function desinstalarPlugin(uuid: string): Promise<boolean> {
  if (!validarUuid(uuid) || !existeInstalado(uuid)) return false;
  detenerMarcha(uuid);
  estado.fallos.delete(uuid);
  // El plugin no vuelve: sus contextos sí se retiran (detener los conserva
  // para el caso de rehabilitar, ver `detenerMarcha`).
  estado.contextos.retirarDePlugin(uuid);
  // En Windows la carpeta sigue bloqueada un instante por el proceso que acaba
  // de morir (`cwd` y el propio `plugin.js`): se reintenta, como el renombre
  // de `configManager`. Sin esto, desinstalar siempre dice que no.
  const carpetaBorrada = await borrarConReintentos(dirDe(uuid));
  await borrarConReintentos(join(dirPlugins(), `${uuid}.global.json`));
  if (!carpetaBorrada) {
    emitir();
    return false;
  }
  if (estado.deshabilitados.delete(uuid)) guardarDeshabilitados(dirPlugins(), estado.deshabilitados);
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

export async function habilitarPlugin(uuid: string, habilitado: boolean): Promise<PluginInfo | null> {
  if (!validarUuid(uuid) || !existeInstalado(uuid)) return null;
  const lectura = leerManifiesto(dirDe(uuid));
  if (lectura.estado === 'error' || lectura.manifiesto.tipo === 'exe') return null;
  if (habilitado) {
    if (estado.deshabilitados.delete(uuid)) guardarDeshabilitados(dirPlugins(), estado.deshabilitados);
    estado.fallos.delete(uuid);
    await arrancar(uuid);
  } else {
    if (!estado.deshabilitados.has(uuid)) {
      estado.deshabilitados.add(uuid);
      guardarDeshabilitados(dirPlugins(), estado.deshabilitados);
    }
    detenerMarcha(uuid);
  }
  emitir();
  return infoDe(uuid);
}
