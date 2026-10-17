import { existsSync } from 'fs';
import { join } from 'path';
import { resolverImagenVisual } from './validacion';

/**
 * Las órdenes visuales de un plugin (`setImage`/`setTitle`/`setState`/…):
 * lo que pinta en un botón.
 *
 * Antes vivía dentro de `anfitrion.ts`; al crecer el anfitrión por los
 * hallazgos de seguridad (#3, #8, #9, #10) se extrajo aquí sin cambiar
 * comportamiento: el anfitrión decide qué contexto vale (`contextoDe`) y a
 * dónde va el aviso (`alVisual`); este módulo lleva el registro, la última
 * orden por botón y la validación de la imagen.
 *
 * Puro salvo el registro y la lectura de imágenes (proceso principal). Cómo
 * correr las pruebas (en la raíz del repo):
 *
 *   npx tsx --eval "import { crearOrdenesVisuales } from './electron/main/plugins/ordenesVisuales.ts'; const assert = (c, m) => { if (!c) { console.error('FALLO: ' + m); process.exit(1); } }; const avisos = []; const o = crearOrdenesVisuales({ carpeta: '/tmp', contextoDe: (m) => m.context ? String(m.context) : null, alVisual: (v) => avisos.push(v) }); o.registrar({ event: 'setTitle', context: 'c', payload: { title: 'hola' } }); assert(avisos.length === 1 && avisos[0].titulo === 'hola', 'setTitle avisa'); o.registrar({ event: 'setImage', context: 'c', payload: { image: 'https://x/y.png' } }); assert(avisos.length === 1, 'https se rechaza'); o.registrar({ event: 'setImage', context: 'c', payload: { image: '' } }); assert(avisos.length === 2 && avisos[1].imagen === '', 'vacio borra'); o.registrar({ event: 'setTitle', payload: { title: 'sin contexto' } }); assert(avisos.length === 2, 'sin contexto no avisa'); console.log('ordenes: ok');"
 */

/** Lo que un plugin pinta en un botón (`setImage`/`setTitle`/`setState`). */
export interface AvisoVisual {
  contexto: string;
  imagen?: string;
  titulo?: string;
  estado?: number;
}

type Mensaje = Record<string, any>;

interface OrdenGuardada {
  imagen?: string;
  titulo?: unknown;
  estado?: unknown;
}

interface DestinoOrdenes {
  carpeta: string;
  alVisual?: (visual: AvisoVisual) => void;
  /** El contexto del mensaje si está registrado, o `null` (deja constancia en el registro). */
  contextoDe: (msg: Mensaje) => string | null;
}

interface ManejoOrdenes {
  registrar(msg: Mensaje): void;
  olvidar(contexto: string): void;
}

export function crearOrdenesVisuales(destino: DestinoOrdenes): ManejoOrdenes {
  const ultimo = new Map<string, OrdenGuardada>();

  function registrar(msg: Mensaje): void {
    // Sin contexto registrado no hay botón: un plugin no pinta en teclas de
    // otro ni crea contextos arbitrarios que crezcan sin límite (#9).
    const contexto = destino.contextoDe(msg);
    if (!contexto) return;
    const previo = ultimo.get(contexto) ?? {};
    const evento = String(msg.event ?? '');
    anotarOrden(msg, contexto, evento, previo);
    ultimo.set(contexto, previo);
    const aviso = avisoVisualDe(msg, contexto, evento);
    if (aviso) destino.alVisual?.(aviso);
  }

  function olvidar(contexto: string): void {
    ultimo.delete(contexto);
  }

  /** La línea de registro de cada orden visual (el aviso va aparte). */
  function anotarOrden(msg: Mensaje, contexto: string, evento: string, previo: OrdenGuardada): void {
    if (evento === 'setImage') {
      const imagen = String(msg.payload?.image ?? '');
      previo.imagen = imagen;
      console.log(`[plugins] setImage ${contexto}: ${recortar(imagen, 80)}${notaImagen(imagen)}`);
    } else if (evento === 'setTitle') {
      previo.titulo = msg.payload?.title;
      console.log(`[plugins] setTitle ${contexto}: ${recortar(String(msg.payload?.title ?? ''), 80)}`);
    } else if (evento === 'setState') {
      previo.estado = msg.payload?.state;
      console.log(`[plugins] setState ${contexto}: ${String(msg.payload?.state)}`);
    } else if (evento === 'showAlert') {
      console.log(`[plugins] showAlert ${contexto}`);
    } else if (evento === 'showOk') {
      console.log(`[plugins] showOk ${contexto}`);
    } else {
      console.log(`[plugins] setFeedback ${contexto}: ${recortar(JSON.stringify(msg.payload ?? {}), 80)}`);
    }
  }

  /**
   * Lo que el plugin pintó en el botón, o `null` si el evento no pinta nada
   * (`showAlert`/`showOk`/desconocidos se ignoran, como pide el MVP) o la
   * imagen se rechaza.
   *
   * La imagen solo sale como `data:` válido o `''` (borrar):
   * `resolverImagenVisual` convierte las rutas relativas del paquete y
   * rechaza esquemas externos (`https:`, `vd:`, `file:`), que el renderer
   * cargaba sin validar (hallazgo #9).
   */
  function avisoVisualDe(msg: Mensaje, contexto: string, evento: string): AvisoVisual | null {
    if (evento === 'setImage') {
      const imagen = resolverImagenVisual(String(msg.payload?.image ?? ''), destino.carpeta);
      if (imagen === null) {
        console.log(`[plugins] setImage rechazada para ${contexto}: origen no permitido`);
        return null;
      }
      return { contexto, imagen };
    }
    if (evento === 'setTitle') return { contexto, titulo: String(msg.payload?.title ?? '') };
    if (evento === 'setState') {
      const estado = Number(msg.payload?.state ?? 0);
      return { contexto, estado: Number.isFinite(estado) ? estado : 0 };
    }
    return null;
  }

  /**
   * Resuelve como Elgato una imagen relativa sin extensión: prueba `.svg`,
   * `@2x.png` y `.png` contra la carpeta del plugin y deja dicho cuál saldría.
   */
  function notaImagen(imagen: string): string {
    if (!imagen || imagen.startsWith('data:') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(imagen)) return '';
    const nombre = imagen.split(/[\\/]/).pop() ?? '';
    if (!nombre || nombre.includes('.')) return '';
    const candidatos = ['.svg', '@2x.png', '.png'].map((ext) => join(destino.carpeta, imagen + ext));
    const existe = candidatos.find((ruta) => existsSync(ruta));
    return existe ? ` (resuelve a ${existe})` : ` (no existe ${candidatos.join(' | ')})`;
  }

  return { registrar, olvidar };
}

/** Texto acotado para el registro: una imagen entera no cabe ni dice nada. */
function recortar(valor: string, max: number): string {
  return valor.length > max ? valor.slice(0, max) + '…' : valor;
}
