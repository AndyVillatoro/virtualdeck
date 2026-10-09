# virtualdeck-companion: Especificación Técnica de la Extensión de Navegador Compañera

**Estado:** Propuesta de arquitectura técnica  
**Objetivo del Roadmap:** Ítem 114  
**Audiencia:** Desarrolladores del núcleo de VirtualDeck  
**Fecha:** 2026-10-09  

---

## 1. Introducción y Objetivos

### 1.1 El Problema Actual
En VirtualDeck v0.14.1, la previsualización de vídeo en el panel de música (`PanelMusica.tsx` y `PanelMusicaBarra.tsx`) depende de la captura nativa de ventanas de Windows mediante HWND (`desktopCapturer` / `BitBlt` / Desktop Duplication API en `electron/main/capturaVentana.ts`).

Este enfoque presenta limitaciones intrínsecas del sistema operativo y del compositor de ventanas (DWM):
1. **Oclusión de ventana:** cuando otra ventana cubre el navegador que reproduce el vídeo, el compositor marca la superficie como ocluida (`CalculateNativeWinOcclusion`), deteniendo la actualización de fotogramas o entregando una imagen estática congelada.
2. **Pestañas en segundo plano:** los navegadores basados en Chromium (Google Chrome, Microsoft Edge, Brave) pausan el renderizado visual del elemento `<video>` cuando la pestaña pierde el foco, aunque el audio continúe sonando.
3. **Minimización:** al minimizar la ventana del navegador, el manejador HWND deja de tener dimensiones de pantalla activas, imposibilitando la captura.

### 1.2 Objetivos de la Extensión
La extensión de navegador compañera (**VirtualDeck Companion**) desacopla la captura del sistema de ventanas de Windows:
- Capturar el stream de vídeo y audio directamente desde el motor de renderizado de la pestaña mediante las APIs internas del navegador.
- Mantener la transmisión de fotogramas fluida (15–30 FPS adaptativos) incluso cuando la pestaña esté en segundo plano, la ventana esté cubierta o minimizada.
- Sincronizar metadatos enriquecidos de reproducción (título exacto, artista, posición actual, duración, carátula en alta resolución y estado de transporte) superando las limitaciones del servicio GSMTC de Windows.
- Consumo mínimo de recursos (<0.5% CPU en reposo y <1.5% CPU durante streaming).

---

## 2. APIs y Capacidades del Navegador

### 2.1 Manifest V3 — Estructura Base
La extensión se diseñará bajo la especificación **Manifest V3** para asegurar compatibilidad a largo plazo con Chrome Web Store y Microsoft Edge Add-ons:

```json
{
  "manifest_version": 3,
  "name": "VirtualDeck Companion",
  "version": "0.1.0",
  "description": "Transmite vídeo y metadatos de medios directamente a VirtualDeck en tiempo real.",
  "permissions": [
    "tabCapture",
    "offscreen",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.youtube.com/*",
    "https://*.twitch.tv/*",
    "https://*.spotify.com/*",
    "https://*.soundcloud.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon-32.png"
  }
}
```

### 2.2 Captura de Pestaña en Manifest V3 (Offscreen Document)
En Manifest V3, los Service Workers carecen de acceso al DOM, a objetos `MediaStream`, `AudioContext` y `<canvas>`. Por ello, la captura de medios requiere la API de **Offscreen Documents**:

1. **Obtención del Media Stream ID:**  
   El Service Worker invoca `chrome.tabCapture.getMediaStreamId({ targetTabId })` para generar un identificador de flujo seguro.
2. **Creación del documento fuera de pantalla:**  
   Se inicializa un documento en segundo plano con `chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['USER_MEDIA'], justification: 'Procesamiento de frames de streaming' })`.
3. **Consumo del stream:**  
   Dentro de `offscreen.js`, se invoca `navigator.mediaDevices.getUserMedia({ video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } })`.
4. **Extracción y codificación de fotogramas:**  
   El `MediaStream` se proyecta sobre un elemento `<video>` invisible y se muestrea periódicamente en un `OffscreenCanvas` a resolución adaptativa (p. ej., 320×180 o 480×270 px) codificado como WebP o JPEG de calidad 70.

---

## 3. Canal de Comunicación con VirtualDeck

Se evaluaron tres alternativas arquitectónicas para el transporte local de datos:

| Mecanismo | Latencia | Complejidad de Instalación | Compatibilidad MS Store | Sobrecarga CPU |
|---|---|---|---|---|
| **A. WebSocket Local (`ws://127.0.0.1:<port>`)** | **< 3 ms** | **Cero (solo instalar extensión)** | **100% Nativa (Directa)** | **Mínima (< 0.8%)** |
| B. Chrome Native Messaging Host | < 2 ms | Requiere escribir en registro Windows | Compleja (permisos especiales de MSIX) | Baja |
| C. WebRTC Local Peer-to-Peer | < 5 ms | Alta (señalización previa requerida) | Factible | Moderada (SDP exchange) |

### 3.1 Decisión Arquitectónica: WebSocket Local con Autenticación por Token
VirtualDeck ya implementa un servidor HTTP/WebSocket local seguro para el mando móvil (`electron/main/remote.ts`).  
Se habilitará un endpoint específico (`ws://127.0.0.1:48201/companion`) con las siguientes características:
- **Handshake de seguridad:** la primera conexión requiere un token de sesión efímero generado por VirtualDeck y transferible mediante un clic en la extensión o lectura de código de emparejamiento.
- **Canal bidireccional:**
  - *Extensión → VirtualDeck:* envío de paquetes de metadatos (JSON) y fotogramas de vídeo (binario).
  - *VirtualDeck → Extensión:* comandos de control remoto (play, pause, next, previous, seek, volume).

---

## 4. Protocolo de Datos

### 4.1 Paquetes de Metadatos (JSON)
Emitidos cuando cambia el estado de la reproducción o la pista:

```json
{
  "tipo": "meta",
  "tabId": 142,
  "titulo": "Sintetizador Analógico — Sesión En Vivo",
  "artista": "VirtualDeck Audio",
  "album": "OLED Sessions 2026",
  "posicionMs": 74200,
  "duracionMs": 240000,
  "reproduciendo": true,
  "volumen": 0.85,
  "silenciado": false,
  "caratulaUrl": "https://img.youtube.com/vi/xyz/maxresdefault.jpg",
  "tieneVideo": true
}
```

### 4.2 Paquetes de Fotogramas de Vídeo (Binario)
Para evitar el coste de codificación/decodificación Base64, los fotogramas se envían como `ArrayBuffer` binario con una cabecera fija de 16 bytes:

```text
[0..3]   Magic Number: 0x5644434D ('VDCM' — VirtualDeck Companion Media)
[4..5]   Ancho (uint16 little-endian, p. ej. 320)
[6..7]   Alto (uint16 little-endian, p. ej. 180)
[8..11]  Timestamp / Frame ID (uint32 little-endian)
[12..15] Longitud del payload (uint32 little-endian)
[16..N]  Payload de imagen codificado en WebP o JPEG
```

---

## 5. Permisos y Privacidad

1. **Privilegio Mínimo:** La extensión no solicitará el permiso `<all_urls>`.
2. **Activación Selectiva:**
   - Modo Automático: solo en dominios multimedia declarados (YouTube, Twitch, Spotify Web, SoundCloud).
   - Modo Manual: el usuario puede pulsar el botón de la extensión en cualquier pestaña para iniciar la captura explícita.
3. **Cero Telemetría Externa:** Toda la comunicación ocurre exclusivamente en la interfaz de bucle local `127.0.0.1`. Ningún dato de navegación ni imagen sale del equipo del usuario.
4. **Cumplimiento de Políticas de Microsoft Store:** Al no interactuar con APIs restringidas ni modificar binarios del sistema, no interfiere con la certificación del paquete MSIX principal.

---

## 6. Plan de Fases de Implementación (Roadmap)

### Fase 1: Endpoint WebSocket en VirtualDeck y Prototipo de Metadatos (v0.15.0)
- Crear el módulo servidor `electron/main/companion/servidorCompanion.ts`.
- Despacho de eventos de control hacia `PanelMusica.tsx` (play/pause, seek, volumen).
- Extensión MVP en Manifest V3 capaz de sincronizar metadatos y controles de YouTube.

### Fase 2: Streaming de Fotogramas por Offscreen Document (v0.15.1)
- Implementación de `offscreen.html` y captura con `tabCapture.getMediaStreamId()`.
- Receptor de frames binarios en `electron/main/companion/receptorVideo.ts`.
- Integración en `PanelMusica.tsx` y `PanelMusicaBarra.tsx` como fuente de vídeo preferente sobre la captura por HWND.

### Fase 3: Publicación y Soporte Multi-Navegador (v0.16.0)
- Publicación oficial en Chrome Web Store y Microsoft Edge Add-ons.
- Adaptador para Mozilla Firefox (`browser.tabs.captureTab`).
- Enlace directo de instalación desde la pantalla de Ajustes de VirtualDeck.