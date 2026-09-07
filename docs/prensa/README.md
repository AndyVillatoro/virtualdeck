# Imágenes para la ficha de la Store y la página de promoción

Todo lo que hay en esta carpeta está sacado de la aplicación **corriendo**, no
montado en un editor de imágenes. Se regenera con:

```bash
npm run build                       # las capturas salen de out/, no de dev
node scripts/prensa/caratula.mjs    # la carátula de la pista (una vez)
node scripts/prensa/capturar.mjs    # las seis capturas + el icono
node scripts/prensa/capturar.mjs 03 05   # o solo algunas, por su número
```

El guion imprime las medidas de cada archivo y marca con `✗` cualquiera que no
salga a 1920×1080, así que si la Store rechaza una imagen no es por el tamaño.

## Los archivos

| Archivo | Qué es | Medidas |
|---|---|---|
| `01-deck.png` | La pantalla principal: panel de música a la izquierda, rejilla de 4×4 con icono y color por botón, barra lateral con reloj, clima, sensores y RGB. La primera que conviene subir. | 1920×1080 PNG |
| `02-editor.png` | El editor en el paso 1: los presets rápidos por categoría y la retícula de tipos de acción. | 1920×1080 PNG |
| `03-kiosko.png` | Modo kiosko: sin barra de título, casillas grandes en modo «llenar área», sensores y selector de página a la izquierda y la franja de reproducción abajo. | 1920×1080 PNG |
| `04-barra-lateral.png` | Una página de 5×4 hecha de widgets en vivo, con la barra lateral leyendo reloj, clima, cinco piezas de hardware y el estado del RGB. | 1920×1080 PNG |
| `05-rgb.png` | El gestor RGB: tres dispositivos, selector de color, modos, zonas, el pintor LED a LED y los 18 presets. | 1920×1080 PNG |
| `06-galeria.png` | La galería de perfiles con el aviso de riesgo desplegado: lo que un perfil descargado va a ejecutar, antes de importarlo. | 1920×1080 PNG |
| `icono-mosaico-300.png` | El icono de mosaico. No es una captura: es `build/icon.svg` centrado sobre el fondo del tema. | 300×300 PNG exactos |
| `fuentes/` | Los datos de los que tira una de las capturas. Ver más abajo. | — |

## Lo que pide la Store, y cómo queda

- **PNG a 1920×1080.** El mínimo son 1366×768; se usa 1080p porque se ve mejor
  en la ficha y porque permite recortar después sin perder nitidez.
- **Lo importante, en los dos tercios de arriba.** La Store superpone su propio
  texto en el tercio inferior. En las seis, el asunto de la captura cae por
  encima de la línea de los 720 px. Con una excepción que hay que saber: en
  `03-kiosko.png` la **franja de reproducción está abajo**, porque es donde la
  dibuja la aplicación. No se puede subir sin falsear la pantalla; el mensaje
  principal —las casillas grandes— se lee entero por arriba.
- **Sin logotipos, sin marcos, sin texto de marketing.** Son capturas limpias
  de la ventana, sin nada añadido encima.
- **Sin contrastes extremos.** Fondo `dotgrid` en todas: es la trama de puntos
  del proyecto y deja un gris uniforme y oscuro, sin blancos que estropeen el
  texto que la Store pone delante.

## Repaso de privacidad, una por una

Esto se revisó mirando cada imagen a tamaño completo, no por deducción.

| | Nombre de usuario | Ruta con un nombre | Carátula con derechos | Nombre de red |
|---|---|---|---|---|
| `01-deck.png` | no aparece | no hay ninguna ruta a la vista | carátula generada, ver abajo | no aparece |
| `02-editor.png` | no aparece | ninguna: los presets no traen ruta escrita | no sale carátula | no aparece |
| `03-kiosko.png` | no aparece | ninguna | carátula generada | no aparece |
| `04-barra-lateral.png` | no aparece | ninguna | carátula generada | no aparece |
| `05-rgb.png` | no aparece | los dispositivos salen sin número de serie (el emulador lo manda vacío) | no sale carátula | no aparece; la ubicación de cada dispositivo es un bus `I2C`/`HID`, no una dirección de red |
| `06-galeria.png` | no aparece | ninguna: el perfil «Streaming» de la galería no abre programas, solo manda atajos | carátula generada | no aparece; la única dirección visible es la de la galería del proyecto |

Dos cosas más que no estaban en la lista y conviene decidir a conciencia:

- **La ciudad del clima.** El widget enseña `Tegucigalpa, 25°`. No se saca de
  la IP: está escrita a mano en `CLIMA`, dentro de
  `scripts/prensa/servicios.mjs`. Se eligió porque es coherente con el proyecto,
  pero una ciudad es un dato de ubicación en una ficha pública: si preferís otra,
  se cambia esa línea y se vuelven a sacar la 01, la 03 y la 04.
- **Iconos de marcas.** Las casillas usan los iconos de puntos del propio
  paquete de la aplicación (OBS, Discord, VS Code, Obsidian). Es lo que un deck
  real tiene encima y no hay logotipo ajeno pegado sobre la captura, pero son
  marcas de terceros dentro de la imagen. Si querés evitarlo del todo, cambiá
  `brandIcon` por `icon` con un emoji en `scripts/prensa/escenas.mjs`.

## De dónde sale cada dato que se ve

Esto es lo que hace que las capturas sean de la aplicación y no un montaje. La
regla fue: **poner algo al otro extremo del cable y dejar el código de
VirtualDeck intacto.** Nada de esto toca `electron/main` ni `src`, salvo el
último punto.

- **Sensores.** `scripts/prensa/servicios.mjs` levanta un servidor en
  `127.0.0.1:8085` que contesta un `/data.json` con la forma exacta del de
  LibreHardwareMonitor. La aplicación lo lee con su `net.fetch` de siempre y lo
  interpreta con su propio parser. Los valores llevan un pequeño temblor para
  que no salgan clavados entre escena y escena.
- **RGB.** `scripts/prensa/openrgb-falso.mjs` habla el protocolo binario del
  SDK de OpenRGB en el puerto 6742: tres dispositivos con sus zonas, modos y
  LEDs. VirtualDeck se conecta con su `openrgb-sdk` y no sabe que no hay luces
  detrás. El formato se sacó del **lector** del SDK
  (`node_modules/openrgb-sdk/src/device.ts`).
- **Clima.** Sus dos proveedores (`ipapi.co` y `api.open-meteo.com`) llevan la
  dirección escrita dentro de `weather.ts` y no se alcanzan desde donde se
  sacaron estas capturas. Se les da un servidor local con certificado y una
  entrada temporal en `/etc/hosts`, que se quita al terminar.
- **Fuentes.** `index.html` pide Inter, JetBrains Mono y DotGothic16 a Google
  Fonts, y **sin bloquear el pintado**: si no llegan, la aplicación se dibuja
  con la tipografía del sistema y no avisa. Las primeras seis capturas salieron
  así y solo se notaba comparándolas. Ahora las fuentes se **reflejan** desde el
  sitio de verdad y el guion se para si alguna de las tres no llegó a cargar.
- **Galería.** Es la del proyecto, la de verdad: se pulsa «GALERÍA DEL
  PROYECTO» y se abre uno de los perfiles publicados. La dirección que sale en
  la captura es la real y los perfiles son los que hay.
- **Reproducción — la única excepción.** La franja de música necesita una sesión
  de medios de Windows (SMTC), que es una API del sistema y no tiene cable que
  enchufar. Así que hay un módulo nuevo, `electron/main/mediosFijos.ts`, que
  lee la pista de un archivo **solo si `VD_MEDIOS_FIJOS` está puesta**; sin esa
  variable devuelve `null` en la primera línea y no cambia nada de la aplicación
  instalada. El archivo es `fuentes/reproduccion.json`, y la pista es inventada
  a propósito: **una carátula real tendría derechos de autor**, así que la de
  las capturas se genera con la trama de puntos del proyecto
  (`scripts/prensa/caratula.mjs`).

## Dos detalles del producto que salieron al hacer esto

- El aviso de calibración del gestor RGB dice «1 **zonas** ARGB sin tamaño
  guardado». En las capturas no se ve porque se siembra `zoneSizes`, pero el
  plural sin concordancia está en `rgb.uncalibrated`.
- El botón «IMPORTAR COMO PERFIL» de la galería parte la línea en dos dentro de
  su caja de 260 px. Se ve en `06-galeria.png`.
