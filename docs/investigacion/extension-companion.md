# VirtualDeck Companion — Documento Canónico (Extensión y Servidor)

**Documento unificado y canónico de la extensión compañera del navegador y el servidor local de VirtualDeck.**  
*Reemplaza y consolida la especificación de investigación previa y el manual operativo de la extensión.*

- **Objetivo en el Roadmap:** Ítems 114 y 117
- **Ubicación en el código:** `companion-extension/` (extensión MV3 Chromium) y `electron/main/companion/` (servidor local Electron)
- **Protocolo y canal:** WebSocket `ws://127.0.0.1:<puerto>/companion` + protocolo binario de fotogramas `VDCM`

---

## 1. Introducción y Objetivos

### 1.1 El Problema Resuelto
En versiones anteriores (v0.14.1), la previsualización de vídeo en el panel de música (`PanelMusica.tsx` y `PanelMusicaBarra.tsx`) dependía exclusivamente de la captura nativa de ventanas de Windows mediante HWND (`desktopCapturer` en Electron). Este enfoque presentaba limitaciones intrínsecas:
1. **Oclusión de ventana:** Si otra ventana cubría el navegador, Chromium congelaba los fotogramas (`CalculateNativeWinOcclusion`).
2. **Pestañas en segundo plano:** Los navegadores pausan el renderizado visual de pestañas inactivas aunque el audio continúe reproduciéndose.
3. **Minimización:** Al minimizar la ventana del navegador, el manejador HWND perdía dimensiones de pantalla activas, interrumpiendo la captura.

### 1.2 Misión de la Extensión
La extensión de navegador (**VirtualDeck Companion**) desacopla la captura del compositor de ventanas del SO:
- Captura el stream de vídeo y audio directamente desde el motor de renderizado de la pestaña vía `chrome.tabCapture` y documentos *offscreen*.
- Mantiene la transmisión de fotogramas fluida (~20 FPS) incluso con la pestaña en segundo plano o cubierta.
- Recorta con precisión matemática el canvas exclusivamente al elemento `<video>` visible en primer plano (YouTube, Twitch, Spotify, SoundCloud, etc.), enviando coordenadas relativas al viewport.
- Sincroniza metadatos enriquecidos de reproducción y acepta comandos de transporte (`play`, `pause`, `playPause`, `next`, `previous`, `seek`, `volumen`).
- Consumo mínimo de recursos (<0.5% CPU en reposo y <1.5% CPU durante streaming).

---

## 2. Requisitos e Instalación

### 2.1 Requisitos
- Navegador basado en Chromium con soporte Manifest V3 y la API `offscreen` (Chrome 109+, Edge, Brave, Opera, etc.).
- VirtualDeck en ejecución con la extensión habilitada en Ajustes.
- No requiere compilación ni `npm install`: la extensión es JavaScript puro.

### 2.2 Instalación (Modo Desarrollador)
1. Abre VirtualDeck (en modo desarrollo `npm run dev` o desde la aplicación instalada).
2. Abre `chrome://extensions` (o `edge://extensions`).
3. Activa el **Modo de desarrollador** en la esquina superior derecha.
4. Pulsa **Cargar descomprimida** y selecciona la carpeta [`companion-extension/`](../../companion-extension/).
5. (Opcional) Fija el icono de la extensión en la barra de herramientas del navegador.

> Tras modificar archivos de la extensión, pulsa **Recargar** en la tarjeta de la extensión. Los cambios en `content.js` requieren recargar las pestañas de los sitios de reproducción. Para depurar el service worker usa **Inspeccionar vistas → service worker**.

---

## 3. Emparejamiento y Configuración

### 3.1 Emparejamiento Seguro
1. En VirtualDeck (**Ajustes → EXTENSIÓN DE NAVEGADOR**), activa el interruptor y pulsa en generar un **código de emparejamiento** (6 dígitos; expira a los 5 min y permite 5 intentos).
2. Abre el popup de la extensión en el navegador, escribe el código de 6 dígitos y pulsa **EMPAREJAR**.
3. VirtualDeck responde con un token de 24 bytes que la extensión guarda en `chrome.storage.local`. A partir de ahí, la extensión reconecta automáticamente.
4. También es posible copiar/pegar el token directamente en la sección Ajustes del popup.

### 3.2 Persistencia Aislada
El token persistente, el puerto y el estado del interruptor viven exclusivamente en `userData/companion.json` (aislados de `deck-config.json` y administrados por `electron/main/companion/ajustes.ts`). El token no se regenera en cada reinicio, garantizando que el emparejamiento sea necesario una sola vez.

### 3.3 Puertos y Estados
| Ajuste | Valor por defecto |
| --- | --- |
| Puerto | `48201` (rango válido 1024–65535) |
| Host | `127.0.0.1` (estrictamente interfaz loopback) |

- **Insignia ON (verde):** Conectado con éxito a VirtualDeck.
- **Insignia REC (cian):** Hay una pestaña capturándose activamente.

---

## 4. Arquitectura y Flujo de Datos

```
content.js ──meta──▶ background.js ──ws://127.0.0.1:<puerto>/companion──▶ VirtualDeck
content.js ──video_rect──▶ background.js ──video_rect_offscreen──▶ offscreen.js
popup.js ◀─estado/ajustes─▶ background.js ◀──comandos──┘
background.js ──start_capture──▶ offscreen.js ──frames binarios VDCM (WS)──▶ VirtualDeck
```

### 4.1 Componentes de la Extensión
| Archivo | Rol |
| --- | --- |
| `manifest.json` | Declaración Manifest V3, permisos (`tabCapture`, `offscreen`, `storage`, `activeTab`) y host permissions declarados |
| `background.js` | Service Worker: WebSocket de control y comandos, ciclo de vida de offscreen, reconexión con backoff, badge de estado |
| `offscreen.js` / `.html` | Documento fuera de pantalla que consume el MediaStream vía `tabCapture.getMediaStreamId()`, recorta al canvas y transmite fotogramas JPEG binarios |
| `content.js` | Inyectado en páginas multimedia; monitorea el elemento `<video>` visible, emite metadatos, calcula el rect y ejecuta comandos de transporte en la web |
| `popup.*` | Interfaz de usuario para emparejamiento, inicio de captura manual y cambio de puerto |

### 4.2 Recorte Adaptativo al Elemento `<video>`
`content.js` envía la posición del reproductor como **fracción normalizada del viewport** (0..1), no en píxeles CSS: el lienzo offscreen recorta un cuadro cuyo escalado no depende del zoom, escala de la ventana ni devicePixelRatio.
- Selecciona el `<video>` con mayor área visible que esté reproduciendo audio/vídeo, descartando anuncios y vistas previas.
- Sincronizado ante eventos `ResizeObserver`, pantalla completa, scroll y re-escalado de ventana.
- Si el service worker entra en reposo (`idle`), recupera el ID de la pestaña capturada desde `chrome.storage.local`.

---

## 5. Protocolo de Comunicación (`/companion`)

### 5.1 Canal de Control (JSON)
Mensajes de texto JSON con discriminador `tipo`:
- `auth`: Autenticación por token al abrir el socket (`{ tipo: 'auth', token }`).
- `pair`: Intento de emparejamiento con código de 6 dígitos (`{ tipo: 'pair', code }`).
- `meta`: Sincronización de metadatos multimedia (`titulo`, `artista`, `album`, `posicionMs`, `duracionMs`, `reproduciendo`, `volumen`, `caratulaUrl`, etc.).
- `ping` / `pong`: Liveness heartbeat cada 15 segundos.
- Comandos recibidos desde VirtualDeck: `{ comando: 'play' | 'pause' | 'playPause' | 'next' | 'previous' | 'seek' | 'volumen', valor? }`.

### 5.2 Canal de Vídeo Binario (`VDCM`)
El documento offscreen abre un socket secundario autenticado (`rol=stream`). Cada fotograma se transmite con una cabecera binaria fija de 16 bytes:

| Offset (Bytes) | Formato | Contenido |
| --- | --- | --- |
| 0..3 | uint32 (Big Endian) | Magic Number `0x5644434D` (`VDCM` — VirtualDeck Companion Media) |
| 4..5 | uint16 (Little Endian) | Ancho del fotograma en píxeles (ej. 320, 640, 1280) |
| 6..7 | uint16 (Little Endian) | Alto del fotograma en píxeles (ej. 180, 360, 720) |
| 8..11 | uint32 (Little Endian) | ID secuencial de fotograma / Timestamp |
| 12..15 | uint32 (Little Endian) | Longitud del payload de imagen en bytes |
| 16..N | Bytes binarios | Payload de imagen en formato JPEG (calidad 0.85 adaptive) |

### 5.3 Endpoints HTTP Locales (Diagnóstico)
Requieren autenticación con token (cabecera `X-VD-Token` o `?token=`):
- `GET http://127.0.0.1:48201/companion/status`: JSON con métricas de FPS, sockets conectados y metadatos (nunca expone el token).
- `GET http://127.0.0.1:48201/companion/frame.jpg`: Último fotograma capturado (404 si no hay stream activo).
- `GET http://127.0.0.1:48201/companion/stream`: Transmisión MJPEG continua (`multipart/x-mixed-replace`).

---

## 6. Seguridad y Restricciones
1. **Loopback Estricto:** El servidor solo escucha en `127.0.0.1`. Se rechaza cualquier petición con `Host` ajeno.
2. **Validación de Origin:** La actualización a WebSocket valida obligatoriamente que `Origin` proceda de una extensión de navegador autorizada (`chrome-extension://`, `moz-extension://`). Se rechazan conexiones procedentes de páginas web ordinarias o sin cabecera `Origin`.
3. **Autenticación en Tiempo Constante:** El token se compara con algoritmo resistente a ataques de temporización (`timingSafeEqual`).
4. **Límites de Seguridad:**
   - Máximo 4 MB por fotograma de vídeo (lo que supere el límite se descarta).
   - Máximo 20 mensajes `meta` por segundo por socket.
   - Máximo 4 clientes MJPEG concurrentes (el 5° recibe `503 Service Unavailable`).
5. **Cero Telemetría y Compatibilidad MSIX:** Ningún dato sale del equipo del usuario. No requiere permisos especiales ni afecta la certificación de la Microsoft Store.

---

## 7. Solución de Problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Sin insignia `ON` | VirtualDeck cerrado, interruptor apagado o puerto distinto | Verifica Ajustes → Extensión en VirtualDeck y el puerto en el popup |
| Error al conectar tras regenerar token | Token antiguo en el almacenamiento del navegador | Pulsa **Emparejar** con un nuevo código de 6 dígitos |
| Error al iniciar captura | Gesto de usuario requerido en pestaña normal | Inicia la captura desde el popup en una pestaña `http://` o `https://` válida (no en páginas internas `chrome://`) |
| Vídeo capturado desfasado o incompleto | Modificación dinámica del reproductor web | Pulsa recargar en la pestaña web para refrescar `content.js` |