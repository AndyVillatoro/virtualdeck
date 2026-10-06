import { readFileSync } from 'fs';
import { extname, join } from 'path';

/**
 * El manifiesto de un plugin del SDK de Stream Deck, leído y desconfiado.
 *
 * `interpretarManifiesto` es **pura** (no toca disco) para poder probarla con
 * `npx tsx` sobre textos escritos a mano: los manifiestos buenos, los de
 * Mirabox (`SDKVersion: 1`), los que solo son de macOS, los que traen BOM, los
 * que vienen cifrados por el DRM de Elgato y los que intentan escapar de la
 * carpeta del plugin.
 *
 * Devuelve **códigos**, no frases: el texto para el registro se escribe en la
 * línea de `console.log` que los interpreta (`prototipo.ts`). Así la auditoría
 * de i18n —que salta las líneas de consola pero mira todos los literales de
 * `electron/main`— no tiene que decidir si una frase es interfaz o no.
 */

export type TipoPlugin = 'node' | 'html' | 'exe';

export type CodigoManifiesto =
  | 'leer'
  | 'cifrado'
  | 'uuid'
  | 'codepath'
  | 'fuera'
  | 'tipo'
  | 'os';

export interface AccionManifiesto {
  uuid: string;
  nombre: string;
  controladores: string[];
  piPath?: string;
}

export interface Manifiesto {
  uuid: string;
  nombre: string;
  version: string;
  tipo: TipoPlugin;
  codePath: string;
  piPath?: string;
  acciones: AccionManifiesto[];
  tamanoPI: [number, number];
  esMirabox: boolean;
  carpeta: string;
}

export type LecturaManifiesto =
  | { estado: 'ok'; manifiesto: Manifiesto }
  | { estado: 'error'; codigo: CodigoManifiesto; detalle?: string };

/** La extensión decide cómo se lanza el plugin. */
const EXTENSIONES: Record<string, TipoPlugin> = {
  '.js': 'node',
  '.mjs': 'node',
  '.cjs': 'node',
  '.html': 'html',
  '.exe': 'exe',
};

/** `DefaultWindowSize` de Elgato cuando el manifiesto no trae uno válido. */
const TAMANO_PI_POR_DEFECTO: [number, number] = [500, 650];

/**
 * Una ruta del manifiesto que sea relativa y no pueda salir de la carpeta.
 *
 * Se rechazan las absolutas (`C:\...`, `\\servidor\...`, `/etc/...`) y
 * cualquier tramo `..`. Es una comprobación de texto, sin disco: la carpeta
 * real no hace falta para saber si una ruta se escapa.
 */
function rutaRelativaValida(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false;
  const ruta = valor.trim();
  if (ruta === '') return false;
  if (ruta.includes('\0')) return false;
  if (/^[a-zA-Z]:/.test(ruta)) return false;
  if (/^[/\\]/.test(ruta)) return false;
  return !ruta.split(/[\\/]+/).includes('..');
}

function incluyeWindows(datos: Record<string, unknown>): boolean {
  const os = Array.isArray(datos.OS) ? datos.OS : [];
  return os.some(
    (entrada) => String((entrada as { Platform?: unknown })?.Platform ?? '').toLowerCase() === 'windows',
  );
}

function validarCodePath(
  datos: Record<string, unknown>,
): { estado: 'ok'; codePath: string; tipo: TipoPlugin } | { estado: 'error'; codigo: CodigoManifiesto; detalle?: string } {
  // `CodePathWin` gana: es el que Elgato usa en Windows aunque haya un
  // `CodePath` genérico o de macOS.
  const codePath = datos.CodePathWin ?? datos.CodePath;
  if (typeof codePath !== 'string' || codePath.trim() === '') return { estado: 'error', codigo: 'codepath' };
  if (!rutaRelativaValida(codePath)) return { estado: 'error', codigo: 'fuera' };
  const tipo = EXTENSIONES[extname(codePath).toLowerCase()];
  if (!tipo) return { estado: 'error', codigo: 'tipo', detalle: extname(codePath).toLowerCase() };
  return { estado: 'ok', codePath, tipo };
}

function resolverPI(valor: unknown): { estado: 'ok'; piPath?: string } | { estado: 'error' } {
  if (valor === undefined) return { estado: 'ok' };
  if (!rutaRelativaValida(valor)) return { estado: 'error' };
  return { estado: 'ok', piPath: valor.trim() };
}

function tamanoPI(datos: { DefaultWindowSize?: unknown }): [number, number] {
  const bruto = datos.DefaultWindowSize;
  if (!Array.isArray(bruto) || bruto.length !== 2) return TAMANO_PI_POR_DEFECTO;
  const [ancho, alto] = bruto as unknown[];
  if (!Number.isFinite(ancho) || !Number.isFinite(alto)) return TAMANO_PI_POR_DEFECTO;
  if ((ancho as number) <= 0 || (alto as number) <= 0) return TAMANO_PI_POR_DEFECTO;
  if ((ancho as number) > 4000 || (alto as number) > 4000) return TAMANO_PI_POR_DEFECTO;
  return [Math.round(ancho as number), Math.round(alto as number)];
}

/**
 * `Knob` es el nombre de Mirabox para `Encoder`: mismo control, otro rótulo.
 * Se normaliza aquí, que es donde se lee el manifiesto, para que el resto del
 * prototipo no tenga que saber que existen dos vocabularios.
 */
function normalizarControladores(brutos: unknown): string[] {
  const lista = Array.isArray(brutos) && brutos.length > 0 ? brutos : ['Keypad'];
  const vistos = new Set<string>();
  for (const control of lista) {
    vistos.add(control === 'Knob' ? 'Encoder' : String(control));
  }
  return [...vistos];
}

function leerAcciones(brutos: unknown): AccionManifiesto[] | null {
  if (!Array.isArray(brutos)) return [];
  const acciones: AccionManifiesto[] = [];
  for (const bruta of brutos) {
    if (!bruta || typeof bruta !== 'object') continue;
    const accion = bruta as Record<string, unknown>;
    const pi = resolverPI(accion.PropertyInspectorPath);
    if (pi.estado === 'error') return null;
    acciones.push({
      uuid: typeof accion.UUID === 'string' ? accion.UUID : '',
      nombre: typeof accion.Name === 'string' ? accion.Name : '',
      controladores: normalizarControladores(accion.Controllers),
      ...(pi.piPath ? { piPath: pi.piPath } : {}),
    });
  }
  return acciones;
}

/**
 * El manifiesto interpretado, o el código de por qué no vale.
 *
 * @param texto El contenido de `manifest.json`, tal cual se leyó.
 * @param carpeta La carpeta `.sdPlugin` (se devuelve dentro del resultado).
 */
export function interpretarManifiesto(texto: string, carpeta: string): LecturaManifiesto {
  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(texto.replace(/^\uFEFF/, ''));
  } catch {
    // Los del Marketplace de Elgato llegan cifrados por DRM: no son JSON.
    return { estado: 'error', codigo: 'cifrado' };
  }
  if (!datos || typeof datos !== 'object') return { estado: 'error', codigo: 'cifrado' };

  // `UUID` en el manifiesto es de las versiones nuevas del SDK; antes el UUID
  // era el nombre de la carpeta sin `.sdPlugin` (medido: Stopwatch y Multi OBS
  // Controller no lo traen), y así lo sigue haciendo Stream Deck.
  const uuid = uuidDe(datos.UUID, carpeta);
  if (!uuid) return { estado: 'error', codigo: 'uuid' };
  if (!incluyeWindows(datos)) return { estado: 'error', codigo: 'os' };

  const code = validarCodePath(datos);
  if (code.estado === 'error') return { estado: 'error', codigo: code.codigo, detalle: code.detalle };
  const pi = resolverPI(datos.PropertyInspectorPath);
  if (pi.estado === 'error') return { estado: 'error', codigo: 'fuera' };
  const acciones = leerAcciones(datos.Actions);
  if (acciones === null) return { estado: 'error', codigo: 'fuera' };

  const minimo = String((datos.Software as { MinimumVersion?: unknown })?.MinimumVersion ?? '');
  const esMirabox = Number(datos.SDKVersion) === 1 && /^[23]\./.test(minimo);
  const nombre = typeof datos.Name === 'string' && datos.Name ? datos.Name : uuid.trim();

  return {
    estado: 'ok',
    manifiesto: {
      uuid: uuid.trim(),
      nombre,
      version: typeof datos.Version === 'string' && datos.Version ? datos.Version : '0.0.0',
      tipo: code.tipo,
      codePath: code.codePath.trim(),
      ...(pi.piPath ? { piPath: pi.piPath } : {}),
      acciones,
      tamanoPI: tamanoPI(datos),
      esMirabox,
      carpeta,
    },
  };
}

/** El `UUID` del manifiesto, o el de la carpeta: `com.x.y.sdPlugin` → `com.x.y`; vacío si no hay ninguno. */
function uuidDe(declarado: unknown, carpeta: string): string {
  if (typeof declarado === 'string' && declarado.trim()) return declarado;
  const nombre = carpeta.split(/[\\/]/).filter(Boolean).pop() ?? '';
  const m = /^(.+)\.sdPlugin$/i.exec(nombre);
  return m ? m[1] : '';
}

/** Lee `manifest.json` de la carpeta y lo interpreta. */
export function leerManifiesto(carpeta: string): LecturaManifiesto {
  let texto: string;
  try {
    texto = readFileSync(join(carpeta, 'manifest.json'), 'utf-8');
  } catch {
    return { estado: 'error', codigo: 'leer' };
  }
  return interpretarManifiesto(texto, carpeta);
}
