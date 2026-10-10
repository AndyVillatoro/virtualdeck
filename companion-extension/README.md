# VirtualDeck Companion (extensión de navegador)

Extensión Manifest V3 (Chrome / Edge / Brave y otros Chromium) que envía a VirtualDeck:

- **Vídeo de una pestaña** (preview 320×180, JPEG, ~20 FPS) vía `tabCapture` + documento *offscreen*.
- **Metadatos multimedia** (YouTube, Twitch, Spotify, SoundCloud) desde `content.js`.
- Recibe **comandos de transporte** desde VirtualDeck: `play`, `pause`, `playPause`, `next`, `previous`, `seek`, `volumen`.

## Requisitos

- Navegador Chromium con soporte MV3 y la API `offscreen` (Chrome 109+).
- VirtualDeck en ejecución (modo desarrollo o instalado) con el servidor Companion activo.
- No requiere build ni `npm install`: la extensión es JavaScript plano.

## Instalación (modo desarrollador)

1. Inicia VirtualDeck (por ejemplo `npm run dev` en la raíz del repo). El servidor local arranca solo si el Companion está habilitado en los ajustes.
2. Abre `chrome://extensions` (o `edge://extensions`).
3. Activa **Modo de desarrollador**.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta `companion-extension/`.
5. (Opcional) Fija el icono de la extensión en la barra de herramientas.

Tras editar archivos de la extensión, pulsa **Recargar** en la tarjeta de la extensión. Los cambios en `content.js` además requieren recargar las pestañas de los sitios soportados. Para depurar el service worker usa **Inspeccionar vistas → service worker**.

## Emparejamiento

1. En VirtualDeck, genera un **código de emparejamiento** (6 dígitos; caduca a los 5 min y admite 5 intentos).
2. Abre el popup de la extensión, escribe el código y pulsa **EMPAREJAR**.
3. VirtualDeck responde con un token que la extensión guarda en `chrome.storage.local`. A partir de ahí reconecta sola con el token.

También puedes pegar el token manualmente en **Ajustes** del popup y pulsar **GUARDAR Y RECONECTAR**. El token se regenera desde VirtualDeck; si lo haces, vuelve a emparejar.

## Uso

- Insignia **ON** (verde): conectado a VirtualDeck.
- Insignia **REC** (cian): hay una pestaña capturada.
- Para transmitir, abre la pestaña deseada, abre el popup y pulsa el botón de captura. Se cierra automáticamente si cierras la pestaña.
- Los metadatos se envían automáticamente en las pestañas de los sitios soportados.

## Configuración y puerto

| Ajuste | Valor por defecto |
| --- | --- |
| Puerto | `48201` (rango válido 1024–65535) |
| Host | `127.0.0.1` únicamente |

Si cambias el puerto en VirtualDeck, actualiza el mismo valor en el popup de la extensión. La extensión reintenta la conexión cada 2,5 s y envía *ping* cada 15 s.

En **Ajustes → EXTENSIÓN DE NAVEGADOR** hay un interruptor que enciende y apaga el servidor y un campo para el puerto. El token, el puerto y el interruptor se guardan (`companion.json`, junto a `deck-config.json`): el token ya no se regenera en cada arranque de VirtualDeck, así que la extensión solo tiene que emparejarse una vez.

## Arquitectura

```
content.js ──meta──▶ background.js ──ws://127.0.0.1:<puerto>/companion──▶ VirtualDeck
content.js ──video_rect──▶ background.js ──video_rect_offscreen──▶ offscreen.js
popup.js ◀─estado/ajustes─▶ background.js ◀──comandos──┘
background.js ──start_capture──▶ offscreen.js ──frames binarios VDCM (WS)──▶ VirtualDeck
```

### Recorte al elemento `<video>`

`content.js` manda dónde está el vídeo como **fracción del viewport visible** (0..1), no en píxeles CSS: el offscreen recorta un cuadro cuyo tamaño no es `ancho × alto × devicePixelRatio` de la página (zoom del navegador, escalado de la ventana, barra de desplazamiento), así que la fracción es lo único exacto. Vale igual en modo normal, teatro y pantalla completa.

- Elige el `<video>` que se ve: el que suena y más área visible, descartando anuncios, vistas previas y reproductores ocultos.
- Se refresca al cambiar de tamaño (`ResizeObserver`), al entrar o salir de pantalla completa, al redimensionar y al hacer scroll, además de un sondeo cada 250 ms.
- Los rectángulos viajan **con su `tabId`** y se guardan uno por pestaña. `background.js` los reenvía todos y elige el de la pestaña capturada; si no ha llegado, lo pide (`video_rect_pedido` → `pedir_rect`) en vez de emitir la pestaña entera.
- La pestaña capturada se guarda en `chrome.storage.local`: el service worker de MV3 se apaga solo y, al volver, recupera el recorte en vez de quedarse emitiendo la pantalla completa.

| Mensaje | De → a | Para qué |
| --- | --- | --- |
| `video_rect` | `content.js` → `background.js` | Posición del vídeo (fracciones) |
| `pedir_rect` | `background.js` → `content.js` | Reemitir el rectángulo ahora |
| `video_rect_offscreen` | `background.js` → `offscreen.js` | Guardar el rectángulo de esa pestaña |
| `video_rect_pedido` | `offscreen.js` → `background.js` | «No tengo el rectángulo de la pestaña capturada» |

| Archivo | Rol |
| --- | --- |
| `manifest.json` | Permisos (`tabCapture`, `offscreen`, `storage`, `activeTab`) y hosts soportados |
| `background.js` | Service worker: WebSocket de control, emparejamiento, ciclo de vida de offscreen, badge |
| `offscreen.js` / `.html` | Captura el MediaStream y envía frames JPEG |
| `content.js` | Lee metadatos y ejecuta comandos en la página |
| `popup.*` | Interfaz: emparejar, capturar, ajustes |

Lado Electron: [`servidorCompanion.ts`](../electron/main/companion/servidorCompanion.ts) (HTTP/WS) y [`estadoCompanion.ts`](../electron/main/companion/estadoCompanion.ts) (token, código de emparejamiento, FPS).

### Protocolo WebSocket (`/companion`)

Mensajes de texto JSON con campo `tipo`: `auth`, `pair`, `meta`, `ping`/`pong`. Los comandos de VirtualDeck llevan el campo `comando`.

Frames binarios (cabecera de 16 bytes + JPEG):

| Bytes | Contenido |
| --- | --- |
| 0–3 | Magic `0x5644434D` (`VDCM`, uint32 BE) |
| 4–5 | Ancho (uint16 LE) |
| 6–7 | Alto (uint16 LE) |
| 8–11 | ID de frame (uint32 LE) |
| 12–15 | Longitud del payload (uint32 LE) |

### Endpoints HTTP locales (depuración)

Requieren el token (cabecera `X-VD-Token` o `?token=`), no envían cabeceras CORS y rechazan `Host` no local. `/companion/status` nunca devuelve el token.

- `http://127.0.0.1:48201/companion/status`: JSON de estado.
- `http://127.0.0.1:48201/companion/frame.jpg`: último frame (404 si no hay).
- `http://127.0.0.1:48201/companion/stream`: MJPEG continuo.

## Seguridad

- El servidor escucha solo en `127.0.0.1`; el *upgrade* WS valida `Host` exacto y exige `Origin` de extensión (`chrome-extension://`, `moz-extension://`). Se rechazan orígenes web y conexiones sin `Origin`.
- Frames binarios y metadatos solo se procesan en sockets autenticados (token en el handshake, `auth` o `pair`).
- Token aleatorio de 24 bytes (base64url) comparado en tiempo constante y código de emparejamiento de un solo uso, sin sesgo de módulo y con caducidad.
- Topes: 4 MB por fotograma, 20 mensajes `meta` por segundo y socket, 4 clientes MJPEG a la vez. Lo que los rebasa se descarta.

## Topes que puede notar la extensión

Ninguno cambia el protocolo: si un cambio del servidor llega a cortar algo, es que se pasó un tope.

| Tope | Valor | Qué pasa si se pasa |
| --- | --- | --- |
| Payload de un fotograma | 4 MB | El fotograma se descarta entero |
| `meta` por socket | 20/s | Se descartan los que sobran |
| Clientes `/companion/stream` | 4 | El quinto recibe `503` |

## Solución de problemas

| Síntoma | Causa probable |
| --- | --- |
| Sin insignia `ON` | VirtualDeck cerrado, Companion deshabilitado o puerto distinto |
| No conecta tras regenerar token | Token obsoleto: vuelve a emparejar |
| Error al capturar | `tabCapture` requiere iniciar desde el popup (gesto del usuario) en una pestaña `http(s)` normal; no funciona en `chrome://` |
| Comandos sin efecto | Recarga la pestaña tras instalar/recargar la extensión |
| Puerto en uso | Cambia el puerto en VirtualDeck y en el popup |
