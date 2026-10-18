/**
 * Gestor de plugins instalados (roadmap 83, MVP).
 *
 * Convierte el prototipo de un solo plugin (`prototipo.ts`, fase 0) en un
 * gestor de varios: cada plugin habilitado tiene **un anfitrión** (WebSocket
 * local) **+ un proceso** (Node) o ventana oculta (HTML), sus ventanas PI y
 * sus contextos. El contrato con el renderer no cambia: `src/types/plugins.ts`,
 * `ipc/pluginsIpc.ts`, preload y `eventos.ts`.
 *
 * Todo lo que hace vive repartido por responsabilidad en módulos de esta
 * carpeta: `estado` es el único que guarda la marcha, los fallos, los
 * reintentos, los contextos y los deshabilitados; `inventario` lee lo instalado
 * y lo convierte a `PluginInfo`; `instalar` instala, desinstala y habilita;
 * `cicloVida` arranca, reintenta y detiene; `interaccion` resuelve la marcha
 * lista y manda aparecer/pulsar/PI. Aquí solo se reexporta lo que el resto de
 * la app tenía antes: quien importa `'./gestor'` sigue viendo exactamente la
 * misma API (los mismos 9 exports).
 */
export { listarPlugins } from './inventario';
export { instalarPlugin, desinstalarPlugin, habilitarPlugin } from './instalar';
export { instalarDesdeUrl } from './descarga';
export { aparecerPlugin, pulsarPlugin, abrirPIPlugin } from './interaccion';
export { iniciarGestorPlugins, detenerGestorPlugins } from './cicloVida';
