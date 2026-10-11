/**
 * La tabla de contextos del gestor de plugins (roadmap 83, MVP).
 *
 * Un `contexto` es el identificador que el renderer elige por botón y
 * superficie (`PluginRef.contexto`): el plugin lo usa para saber a qué botón
 * pertenece cada `willAppear`, `keyDown` o `setImage`. El anfitrión guarda lo
 * suyo para el protocolo; esta tabla es lo que el **gestor** recuerda por
 * contexto (de qué plugin y acción viene, con qué ajustes y coordenadas) para
 * poder pulsar, abrir el PI o reenviar ajustes sin preguntarle al protocolo.
 *
 * Es pura a propósito (sin disco ni Electron): se prueba con `npx tsx` sin
 * levantar la aplicación. Cómo correr las pruebas (en la raíz del repo):
 *
 *   npx tsx --eval "import { TablaContextos } from './electron/main/plugins/contextos.ts'; const assert = (c, m) => { if (!c) { console.error('FALLO: ' + m); process.exit(1); } }; const t = new TablaContextos(); t.registrar('ctx-1', { pluginUuid: 'com.a.b', accionUuid: 'com.a.b.accion', settings: { x: 1 }, columna: 0, fila: 0 }); assert(t.tiene('ctx-1'), 'registrar+hacer visible'); assert(t.obtener('ctx-1')?.accionUuid === 'com.a.b.accion', 'obtener devuelve lo registrado'); t.registrar('ctx-2', { pluginUuid: 'com.a.b', accionUuid: 'com.a.b.otra', settings: {}, columna: 1, fila: 0 }); assert(t.contar() === 2, 'contar con dos'); assert(t.contextosDePlugin('com.a.b').length === 2, 'contextosDePlugin'); assert(t.retirar('ctx-1') && !t.tiene('ctx-1'), 'retirar'); assert(t.retirarDePlugin('com.a.b') === 1 && t.contar() === 0, 'retirarDePlugin vacia'); console.log('contextos: ok');"
 */

export interface DatosContexto {
  pluginUuid: string;
  accionUuid: string;
  settings: Record<string, unknown>;
  columna: number;
  fila: number;
}

/** Qué botón y con qué ajustes representa cada contexto del protocolo. */
export class TablaContextos {
  private tabla = new Map<string, DatosContexto>();

  registrar(contexto: string, datos: DatosContexto): void {
    this.tabla.set(contexto, datos);
  }

  obtener(contexto: string): DatosContexto | undefined {
    return this.tabla.get(contexto);
  }

  tiene(contexto: string): boolean {
    return this.tabla.has(contexto);
  }

  retirar(contexto: string): boolean {
    return this.tabla.delete(contexto);
  }

  /** Todos los contextos de un plugin (para cerrarlos al detenerlo). */
  contextosDePlugin(pluginUuid: string): string[] {
    const salida: string[] = [];
    for (const [contexto, datos] of this.tabla) {
      if (datos.pluginUuid === pluginUuid) salida.push(contexto);
    }
    return salida;
  }

  /** Saca todos los contextos de un plugin. Devuelve cuántos había. */
  retirarDePlugin(pluginUuid: string): number {
    let sacados = 0;
    for (const contexto of this.contextosDePlugin(pluginUuid)) {
      this.tabla.delete(contexto);
      sacados += 1;
    }
    return sacados;
  }

  contar(): number {
    return this.tabla.size;
  }
}
