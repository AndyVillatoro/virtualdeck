# Imágenes para la ficha de la Store y la página de promoción

Todo lo que hay en esta carpeta está sacado de la aplicación **corriendo**, no
montado en un editor de imágenes. Se regenera con:

```bash
npm run build                       # las capturas salen de out/, no de dev
node scripts/prensa/caratula.mjs    # la carátula de la pista (una vez)
node scripts/prensa/capturar.mjs    # las siete capturas + el icono
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
| `07-barra-flotante.png` | La barra flotante: una columna de seis tiles pegada al borde del monitor, por delante de **otra aplicación** (Autodesk Fusion). Se ve Fusion a través de los huecos entre tiles, y va al tamaño que ocupa de verdad en una pantalla de 1920×1080: 104 px. | 1920×1080 PNG |
| `icono-mosaico-300.png` | El icono de mosaico. No es una captura: es `build/icon.svg` centrado sobre el fondo del tema. | 300×300 PNG exactos |
| `fuentes/` | Las entradas de las que tiran dos capturas: la pista y la carátula de la franja de música, y la captura de escritorio sobre la que va la barra flotante. Ver más abajo. | — |

## Lo que pide la Store, y cómo queda

- **PNG a 1920×1080.** El mínimo son 1366×768; se usa 1080p porque se ve mejor
  en la ficha y porque permite recortar después sin perder nitidez.
- **Lo importante, en los dos tercios de arriba.** La Store superpone su propio
  texto en el tercio inferior. En las siete, el asunto de la captura cae por
  encima de la línea de los 720 px. Con dos salvedades que hay que saber, y que
  no se pueden arreglar sin falsear la pantalla:

  - En `03-kiosko.png` la **franja de reproducción está abajo**, porque es donde
    la dibuja la aplicación. El mensaje principal —las casillas grandes— se lee
    entero por arriba.
  - En `07-barra-flotante.png` la columna **va de arriba abajo**: el proceso
    principal la centra en el monitor. Los tres primeros tiles quedan por
    encima de la línea, y con eso ya se entiende qué es.
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
| `07-barra-flotante.png` | no aparece: el recorte por la derecha se lleva las iniciales del avatar de Fusion, y la captura es de un diseño abierto, no de la pantalla de inicio que saluda por el nombre | ninguna; el único texto propio es `MagsafeCaraJimny`, el nombre de una pieza | no sale carátula (la barra no dibuja widgets) | no aparece |

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
- **La interfaz de Autodesk en la 07.** Es lo mismo pero más grande: media
  captura es la ventana de otra empresa. Enseñar una utilidad que se superpone
  encima de la aplicación sobre la que se usa es corriente, y no hay nada
  añadido ni retocado, pero es material comercial tuyo con marca ajena dentro.
  Si preferís no depender de eso, sirve cualquier otra captura de escritorio con
  `--fondo` —un explorador de archivos, el navegador, el editor de código— y la
  imagen se rehace en un comando.

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
- **La barra flotante — dos ventanas en una imagen.** La barra **es otra ventana
  de Electron**, así que no sale en la captura de la de debajo:
  `Page.captureScreenshot` fotografía un documento, no la pantalla. Y en la
  máquina donde se generan estas imágenes no hay con qué fotografiar la pantalla
  entera —ni `import`, ni `xwd`, ni `ffmpeg` con `x11grab`—, así que el guion
  junta las dos capas **por sus coordenadas reales**: pide a la barra su propia
  captura y la superpone en el `screenX`/`screenY` que la propia ventana declara.

  No es un montaje libre, es lo que hace el compositor del sistema: la ventana de
  la barra es transparente y lo único opaco son los tiles, así que se captura con
  fondo transparente y se pega con su canal alfa. Por eso en la imagen **se ve
  Fusion a través de los huecos** entre tiles, que es la prueba de que es una
  ventana por delante de otra y no un panel.

  Lo de debajo es `fuentes/escritorio-fusion.png`, una captura de escritorio de
  verdad —Autodesk Fusion en Windows, 3823×2053 porque es una pantalla 4K al
  200 %—. Se pasa con `--fondo`:

  ```bash
  node scripts/prensa/capturar.mjs 07 --fondo=docs/prensa/fuentes/escritorio-fusion.png
  ```

  Con `--fondo` la escena cambia de geometría a propósito: la pantalla pasa a
  1920×1080 y la escala a **1**. Una captura de escritorio viene de una pantalla
  de verdad, así que la columna tiene que salir **al tamaño que ocupa en ella**
  —104 px de ancho, el 5,4 % del ancho de la pantalla—; con la vista de 1280×720
  a 1,5 que usan las otras seis saldría un 50 % más ancha, y ese tamaño real es
  justo lo que esta captura tiene que dejar claro.

  El fondo se escala a 1920×1080 recortando **por la derecha**. Una pantalla de
  Windows sin la barra de tareas no da 16:9 exacto (aquí 1,862), así que sobran
  91 px de ancho. Recortando por el centro se come el borde del panel izquierdo
  de Fusion y deja el cubo de navegación partido por la mitad, que parece un
  dibujado roto. Recortando solo por la derecha, el panel izquierdo queda entero
  y lo que se va es la franja del borde —donde va la columna— y, de paso, las
  iniciales del avatar de la cuenta.

  **Si se cambia la captura de escritorio**, dos cosas que el guion no puede
  comprobar: que no lleve nombre ni usuario a la vista —la pantalla de inicio de
  Fusion dice «Hola, <nombre>» y trae el nombre del equipo en el panel
  izquierdo, así que hay que sacarla con un diseño abierto, no en el inicio— y
  que la interfaz de la otra aplicación se pueda publicar, porque es marca de un
  tercero dentro de una imagen de la ficha. Sobre esto último, ver la nota de más
  abajo.

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
