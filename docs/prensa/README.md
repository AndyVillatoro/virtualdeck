# Prensa — el material para la ficha de la Store y la web

Dos cosas distintas, hechas por dos caminos distintos:

| | Qué es | Se regenera con |
|---|---|---|
| **[Capturas](#capturas-e-icono)** | Siete PNG de 1920×1080 y el icono de 300×300 | `node scripts/prensa/capturar.mjs` |
| **[Animación](#animación-de-cabecera)** | `hero.svg`, y el `hero.mp4` para el tráiler | `npm run build:hero` · `bash docs/prensa/render.sh` |

**Nada de esto se edita a mano.** Las capturas salen de la aplicación corriendo y
la animación de un generador; si hay que cambiar algo, se cambia el guion y se
vuelve a correr.

---

## Capturas e icono
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

### Los archivos

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

### Lo que pide la Store, y cómo queda

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

### Repaso de privacidad, una por una

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

### De dónde sale cada dato que se ve

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

### Dos detalles del producto que salieron al hacer esto

- El aviso de calibración del gestor RGB dice «1 **zonas** ARGB sin tamaño
  guardado». En las capturas no se ve porque se siembra `zoneSizes`, pero el
  plural sin concordancia está en `rgb.uncalibrated`.
- El botón «IMPORTAR COMO PERFIL» de la galería parte la línea en dos dentro de
  su caja de 260 px. Se ve en `06-galeria.png`.

---

## Animación de cabecera

| Archivo | Qué es |
|---|---|
| `hero.svg` | La animación. Un solo archivo, sin librerías, **sin JavaScript**, 65 KB. Bucle de 12 s. |
| `vista.html` | Lo enseña sobre fondo oscuro y claro a la vez. Se abre a doble clic, no hace falta servidor. |
| `render.sh` | Convierte `hero.svg` en `hero.mp4` + `miniatura.png` para la ficha de la Store. |

Los tres los genera `scripts/generate-hero.mjs` (`npm run build:hero`) — **no se editan a mano**.
La retícula sale de `GLYPHS_5x7` (`src/design.ts`), así que el generador **falla** si la
palabra usa una letra que la fuente de puntos no tiene, en vez de dibujar un hueco en
silencio como hace `DotText`.

### El guion (12 s, en bucle)

| Tramo | Qué pasa |
|---|---|
| 0–3 s | La retícula se enciende, escalonada, y los puntos se juntan hasta componer «VIRTUALDECK». |
| 3–6 s | Los mismos puntos se reordenan en una rejilla de 4×4 botones (cada botón es un anillo de 7×7 puntos). |
| 6–9 s | Se pulsa el botón de la fila 2, columna 2: destello radial y una onda que se propaga hacia fuera. |
| 9–12 s | Todo se dispersa otra vez y vuelve al principio. |

Los 384 puntos son **los mismos** en las cuatro fases: 160 de tinta y 224 de trama (las celdas
apagadas de la matriz, como el `apagado` de `DotText`). Nada aparece ni desaparece; solo se mueve.
El destello usa los mismos números que `vd-flash-pulse` / `vd-flash-radial` en `src/index.css`.

### Accesibilidad

- **Nada parpadea**: cada elemento cambia una vez por ciclo de 12 s (0,08 Hz), muy por debajo
  del límite de 3 Hz que mira la Store.
- **`prefers-reduced-motion: reduce`** apaga todas las animaciones y deja el fotograma de la
  pulsación: la rejilla de 4×4 con el botón encendido. El *último* fotograma del bucle está
  en negro — quieto no diría nada, así que se queda el último que se lee.

### Temas

Los colores son variables CSS con los tokens de `src/design.ts` (`bg`, `text`, `accent`).
Por defecto sigue a `prefers-color-scheme`, y `data-theme="light"` / `data-theme="dark"` en el
`<svg>` lo fuerza — que es lo que hace `vista.html` para enseñar los dos a la vez.

Un `<img src="hero.svg">` es **otro documento**: solo obedece al tema del sistema, no al de la
página. Para forzar el tema hay que incrustar el SVG en línea.

### El vídeo de la ficha de la Store

`ffmpeg` **no sabe rasterizar un SVG animado**: solo ve un archivo de texto, y no tiene motor
de CSS. Hacen falta dos pasos — un navegador dibuja los fotogramas y ffmpeg los junta:

```bash
bash docs/prensa/render.sh            # los dos pasos, de una
TEMA=light bash docs/prensa/render.sh # la variante en claro
```

El SVG lleva una variable `--seek` justo para esto: el script pausa las animaciones y le pone
el instante de cada fotograma, así que el muestreo es exacto y reproducible en vez de depender
de que el navegador vaya al día. Los comandos que ejecuta, si los querés a mano:

```bash
# 1) 360 fotogramas (12 s a 30 fps) con Chromium headless.
#    La ventana se pide 40 px más alta a propósito: en headless, Chromium le
#    descuenta ~40 px al viewport y rellena la captura por abajo. De ahí el crop.
for i in $(seq 0 359); do
  chromium --headless=new --disable-gpu --hide-scrollbars \
    --force-color-profile=srgb --window-size=1920,1120 --virtual-time-budget=1500 \
    --screenshot="$(printf 'cuadros/f%04d.png' "$i")" \
    "file://$PWD/docs/prensa/.cuadros/cuadro.html?t=$(awk -v i=$i 'BEGIN{printf "%.4f", i/30}')&tema=dark"
done

# 2) MP4: 1920x1080 exactos, H.264, 12 s (la Store admite hasta 60 s).
ffmpeg -y -framerate 30 -i cuadros/f%04d.png \
  -vf "crop=1920:1080:0:0,format=yuv420p" \
  -c:v libx264 -profile:v high -level:v 4.0 -preset slow -crf 20 \
  -movflags +faststart -r 30 -an \
  docs/prensa/hero.mp4

# 3) Miniatura 1920x1080: el mismo fotograma que se ve con prefers-reduced-motion.
ffmpeg -y -ss 6.4 -i docs/prensa/hero.mp4 -frames:v 1 docs/prensa/miniatura.png
```

`crop` en vez de `scale`: el fotograma ya viene a 1920×1080 y reescalar solo lo ablandaría.
`yuv420p` y `profile high` / `level 4.0` son lo que aceptan los reproductores de la ficha;
`+faststart` pone el índice al principio para que arranque sin descargarlo entero.

### Una advertencia sobre el encuadre

La composición va **centrada** en el lienzo de 1920×1080. La ficha de la Store puede
superponer cosas en el **tercio de abajo** (ver `docs/MICROSOFT-STORE.md` § 5.4), y ahí cae el
borde inferior de la rejilla. Lo que hay que leer —el nombre y el botón pulsado— queda en el
medio, así que no se pierde nada; pero si en algún momento se añade texto a la animación, no va
abajo.

`hero.mp4` y `miniatura.png` **no están en el repositorio**: son salida, se regeneran con el
script y pesan de más para versionarlos.
