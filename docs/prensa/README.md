# Prensa — el material para la ficha de la Store y la web

Tres cosas distintas, hechas por tres caminos distintos:

| | Qué es | Se regenera con |
|---|---|---|
| **[Capturas](#capturas-e-icono)** | Once PNG (las nueve de la ficha de la Store, la 05b vertical y la 06b de la ficha) y el icono de 300×300, en español, y las mismas doce en `en/` | `node scripts/prensa/capturar.mjs` |
| **[Artes](#artes-de-la-ficha-y-de-la-web)** | Los cuatro PNG que no son capturas: dos recursos de la ficha (tráiler y superhéroe) y dos de la web (`og-image` y banner) | HyperFrames, en `_referencias/trailer/` (fuera del repo) |
| **[Animación](#animación-de-cabecera)** | `hero.svg`, y el `hero.mp4` del héroe | `npm run build:hero` · `bash docs/prensa/render.sh` |

**Nada de esto se edita a mano.** Las capturas salen de la aplicación corriendo, las
artes y la animación de sendos generadores; si hay que cambiar algo, se cambia el
guion y se vuelve a correr.

---

## Capturas e icono
Las capturas de esta sección y las de `en/` están sacadas de la aplicación
**corriendo**, no montadas en un editor de imágenes. Se regeneran con:

```bash
npm run build                       # las capturas salen de out/, no de dev
node scripts/prensa/capturar.mjs    # las once capturas + el icono
node scripts/prensa/capturar.mjs 03 05   # o solo algunas, por su número
```

El guion imprime las medidas de cada archivo y marca con `✗` cualquiera que no
salga a 1920×1080, así que si la Store rechaza una imagen no es por el tamaño.
También escribe `fuentes/reproduccion.json` (la pista inventada) y las artes de
la tienda si no existen, así que en una máquina limpia basta con el comando.

### Los archivos

| Archivo | Qué es | Medidas |
|---|---|---|
| `01-deck.png` | La pantalla principal: panel de música a la izquierda, rejilla de 4×4 con iconos del catálogo 16×16, barra lateral con reloj, clima, sensores y RGB. La primera que conviene subir. | 1920×1080 PNG |
| `02-editor.png` | El editor por secciones sobre un botón ya configurado (Spotify): vista previa llena, PRESETS desplegados con las fichas de apps y APARIENCIA con el icono del catálogo (`marcas:spotify`). | 1920×1080 PNG |
| `03-catalogo.png` | El catálogo de iconos con sus grupos y buscador: «speaker» devuelve el glifo 8×8 SPEAKER, las acciones de sonido y la marca Speaker Deck, todo en la misma pantalla. | 1920×1080 PNG |
| `04-dock.png` | La pantalla Dispositivos con la página del N3 pintada entera: 6 teclas LCD, 3 botones y las 3 perillas con el perfil «multimedia». El serial y la lista de apps en ejecución se sustituyen antes de disparar (ver «Repaso de privacidad»). | 1920×1080 PNG |
| `05-movil.png` | La página del mando móvil, capturada en vista de teléfono (390×844 @2) y pegada centrada en un lienzo OLED 1920×1080. | 1920×1080 PNG |
| `05b-movil-marco.png` | La misma vista de teléfono, pero el PNG final es vertical 1080×1920: el teléfono llena el alto y solo quedan dos franjas finas de fondo OLED. Para meterla en un marco en el vídeo. | 1080×1920 PNG |
| `06-tienda.png` | La tienda con la rejilla de tarjetas de la galería, con el scroll arriba: varias entradas con portada e icono a la vista. | 1920×1080 PNG |
| `06b-tienda-ficha.png` | La misma tienda con la ficha abierta: portada, capturas y el aviso de riesgo completo, con el scroll arriba (vista más alta que 16:9 para que todo entre sin desplazarse). | 1920×1080 PNG |
| `07-barra-flotante.png` | Columna de tiles flotante sobre un escritorio abstracto generado (`fuentes/fondo-neutro.png`): sin interfaz ni marca de terceros. | 1920×1080 PNG |
| `08-kiosko-barra.png` | Modo kiosko en formato barra (1280×480 de verdad) centrado en un lienzo OLED 1920×1080: rejilla 6×2, panel lateral de 132 px y franja de reproducción. | 1920×1080 PNG |
| `09-rgb.png` | El gestor RGB: tres dispositivos, selector de color, modos, zonas, el pintor LED a LED y los 18 presets. | 1920×1080 PNG |
| `icono-mosaico-300.png` | El icono de mosaico. No es una captura: es `build/icon.svg` centrado sobre el fondo del tema. | 300×300 PNG exactos |
| `fuentes/` | Las entradas que usan las escenas: la pista y la carátula de la franja de música, el fondo neutro de la barra y las artes de la tienda (manifiesto, portadas y capturas generadas). | — |
| `en/` | Las mismas doce imágenes de la tanda **en inglés**, con los nombres idénticos: la Store pide las capturas una vez por idioma. No hay carpeta `en/` para las cuatro artes ([más abajo](#artes-de-la-ficha-y-de-la-web)): son la misma imagen para los dos idiomas. | — |

### La ficha en inglés, y el borrador

**La tanda en inglés** se saca con `VD_PRENSA_IDIOMA=en` y va a
`docs/prensa/en/` — la Store pide las imágenes una vez por idioma, y con una
sola carpeta la segunda tanda pisaba la primera. Cambiar `language` **no
basta**: las etiquetas de los botones son datos que siembra `escenas.mjs`, así
que hay una tabla `EN` que las traduce, **revienta si falta una** y cubre
también los rótulos de la interfaz en los que hacen clic los pasos y el
contenido de la tienda (`artes.mjs`).

**A un borrador**, sin tocar las definitivas, con dos variables de entorno:

```bash
VD_PRENSA_SALIDA=_referencias/informes/prensa-borrador/es \
VD_PRENSA_FUENTES=_referencias/informes/prensa-borrador/fuentes \
node scripts/prensa/capturar.mjs
```

Sale **una sola copia a la vez**: si `probar-app.mjs` tiene la suya abierta
(comparten el puerto 9333), el guion espera a que se cierre. El candado es el
mismo archivo (`%TEMP%\vd-prueba.lock`).

**El guion corre en Windows.** Lo que en Linux se resolvía con `xvfb-run` y una
entrada en `/etc/hosts`, aquí se hace con los nombres redirigidos solo para esa
copia (`--host-resolver-rules`), `taskkill /T` para cerrar el árbol de procesos
y reintentos al borrar el temporal. La única pieza que no es de la app es el
espejo de `fonts.googleapis.com`, que también funciona (la corrida de la 0.14
comprobó las tres fuentes antes de cada escena).

### Lo que pide la Store, y cómo queda

- **PNG a 1920×1080.** El mínimo son 1366×768; se usa 1080p porque se ve mejor
  en la ficha y porque permite recortar después sin perder nitidez. La única
  que no es 16:9 es `05b-movil-marco.png`, que es vertical a propósito
  (1080×1920) para el marco del vídeo.
- **Lo importante, en los dos tercios de arriba.** La Store superpone su propio
  texto en el tercio inferior. En las nueve, el asunto de la captura cae por
  encima de la línea de los 720 px. Con cuatro salvedades que hay que saber:
  - En `05-movil.png` el contenido es un teléfono vertical: el lienzo OLED
    ocupa los lados y el asunto queda centrado, entero en el tercio medio.
  - En `08-kiosko-barra.png` la franja de reproducción va abajo **como en la
    app**; lo que la Store tape cae sobre el lienzo, no sobre la rejilla. La
    captura se hace a 1280×480 (el modo barra real, que por sí solo no llega
    al mínimo de la Store) y se centra en el lienzo de 1920×1080.
  - En `07-barra-flotante.png` la columna va de arriba abajo: el proceso
    principal la centra en el monitor. Los primeros tiles quedan por encima de
    la línea, y con eso ya se entiende qué es.
  - En `06b-tienda-ficha.png` la vista se pide más alta que 16:9 (1792×1008
    con escala 15/14, que da 1920×1080 exactos) para que la ficha y su aviso
    de riesgo entren enteros con el scroll arriba.
- **Sin logotipos de terceros, sin marcos, sin texto de marketing.** Son
  capturas limpias de la ventana, sin nada añadido encima. La barra flotante va
  sobre un escritorio abstracto generado; la tienda enseña un manifiesto local
  inventado; y los iconos de marcas (OBS, Discord, Spotify) son los del propio
  catálogo de la app, no logotipos pegados en el editor.
- **Sin contrastes extremos.** Fondo `dotgrid` en todas: es la trama de puntos
  del proyecto y deja un gris uniforme y oscuro, sin blancos que estropeen el
  texto que la Store pone delante.

### Repaso de privacidad, una por una

Esto se revisó mirando cada imagen a tamaño completo, no por deducción.

| | Nombre de usuario | Ruta con un nombre | Carátula con derechos | Nombre de red |
|---|---|---|---|---|
| `01-deck.png` | no aparece | no hay ninguna ruta a la vista | carátula generada | no aparece |
| `02-editor.png` | no aparece | no aparece: el botón es Spotify pero la ruta no se enseña | no sale carátula | no aparece |
| `03-catalogo.png` | no aparece | ninguna | no sale carátula | no aparece |
| `04-dock.png` | no aparece | ninguna | no sale carátula | no aparece; el serial y las apps en ejecución se sustituyen antes de disparar (ver abajo) |
| `05-movil.png` | no aparece | ninguna: los botones no enseñan rutas | carátula generada | no aparece; la página la sirve la propia app en `127.0.0.1` |
| `05b-movil-marco.png` | igual que la 05 | igual | igual | igual |
| `06-tienda.png` | no aparece | las rutas que lista el aviso de riesgo son inventadas (`C:\Programas\...`); el campo del manifiesto enseña la URL del repositorio de la galería, con el usuario de GitHub del proyecto | portada y capturas generadas | las direcciones del aviso son `ejemplo.invalid`, que no existe; la del manifiesto es la del repo de la galería, que es pública |
| `06b-tienda-ficha.png` | igual que la 06 (más `C:\Programa\...\estudio.exe` y `ultimo_acceso.txt`, también inventados) | igual | igual | igual |
| `07-barra-flotante.png` | no aparece | ninguna; el escritorio de debajo es abstracto, sin ventanas de nadie | no sale carátula (la barra no dibuja widgets) | no aparece |
| `08-kiosko-barra.png` | no aparece | ninguna | carátula generada | no aparece |
| `09-rgb.png` | no aparece | los dispositivos salen sin número de serie (el emulador lo manda vacío) | no sale carátula | no aparece; la ubicación de cada dispositivo es un bus `I2C`/`HID`, no una dirección de red |

Cuatro cosas que conviene decidir a conciencia:

- **El serial y las apps del dock (04).** El aparato real reporta su propio
  número de serie y el núcleo nativo enumera las ventanas abiertas de la
  máquina; ninguno de los dos se puede apagar sin que la pantalla deje de
  enseñar lo que enseña (el dock «CONECTADO» con su lista de apps). Así que,
  justo antes de disparar, `capturar.mjs` sustituye lo que se ve: el serial por
  `PRENSA-N3-0001` y las fichas de la lista por apps inventadas (sin sus
  iconos, que salían del ejecutable real). El aparato sigue «CONECTADO» y la
  sustitución se busca por la *forma* del rótulo (`…Serie: …`), no por el
  valor: el serial real no está escrito en ningún archivo del repositorio.
  `VD_PRENSA_N3_SERIAL=sin-n3` fuerza el modo sin aparato, y
  `VD_PRENSA_N3_SERIAL=<serial>` ata la página a uno concreto.
- **El núcleo nativo, apagado.** Todos los procesos de las capturas corren con
  `VD_SIN_NUCLEO=1` (documentado en `CLAUDE.md` para probar los caminos de
  respaldo), porque sus sensores nativos son los de la máquina de quien
  captura: CPU, GPU y discos reales. Con él apagado, los únicos sensores que
  se ven son los del LibreHardwareMonitor de mentira de `servicios.mjs`. La
  escena 04 es la única que lo enciende (necesita la lista de apps para poder
  sustituirla).
- **La ciudad del clima.** El widget enseña `Tegucigalpa, 25°`. No se saca de
  la IP: está escrita a mano en `CLIMA`, dentro de
  `scripts/prensa/servicios.mjs`, y `capturar.mjs` la mete en
  `scripts/prensa/climaFijo.cjs`, que se precarga en el proceso principal con
  `NODE_OPTIONS=--require` y contesta a los tres proveedores de geo y al de
  pronóstico. Así funciona también en Windows, donde el `fetch` de Node no lee
  el archivo `hosts` ni `--host-resolver-rules` y la petición salía a internet
  de verdad —la corrida del 2026-10-07 salió con la ciudad real de la
  máquina—. Se eligió Tegucigalpa porque es coherente con el proyecto, pero
  una ciudad es un dato de ubicación en una ficha pública: si preferís otra,
  se cambia esa línea y se vuelven a sacar las capturas.
- **Iconos de marcas.** Las casillas usan iconos del catálogo de la propia
  aplicación (OBS, Discord, Spotify, Chrome...). Es lo que un deck real tiene
  encima y no hay logotipo ajeno pegado sobre la captura, pero son marcas de
  terceros dentro de la imagen. Si querés evitarlo del todo, cambiá
  `iconoCat('marcas:…')` por `iconoCat('acciones:…')` en
  `scripts/prensa/escenas.mjs`.

### De dónde sale cada dato que se ve

Esto es lo que hace que las capturas sean de la aplicación y no un montaje. La
regla fue: **poner algo al otro extremo del cable y dejar el código de
VirtualDeck intacto.** Nada de esto toca `electron/main` ni `src`.

- **Sensores.** `scripts/prensa/servicios.mjs` levanta un servidor en
  `127.0.0.1` (puerto `18085` en Windows, `8085` en Linux) que contesta un
  `/data.json` con la forma exacta del de LibreHardwareMonitor. La aplicación
  lo lee con su `net.fetch` de siempre y lo interpreta con su propio parser.
  Los valores llevan un pequeño temblor para que no salgan clavados entre
  escena y escena. Las capturas corren con `VD_SIN_NUCLEO=1`: con el núcleo
  encendido, encima de estos salían los sensores nativos de la máquina real.
- **RGB.** `scripts/prensa/openrgb-falso.mjs` habla el protocolo binario del
  SDK de OpenRGB en el puerto 6742: tres dispositivos con sus zonas, modos y
  LEDs. VirtualDeck se conecta con su `openrgb-sdk` y no sabe que no hay luces
  detrás. El formato se sacó del **lector** del SDK
  (`node_modules/openrgb-sdk/src/device.ts`).
- **Clima.** Sus dos proveedores (`ipapi.co` y `api.open-meteo.com`) llevan la
  dirección escrita dentro de `weather.ts`. En Linux bastaba con el servidor
  local con certificado y los nombres redirigidos; en Windows el `fetch` de
  Node del proceso principal no pasa por ahí y la petición salía a internet,
  así que además `capturar.mjs` precarga `scripts/prensa/climaFijo.cjs` con
  `NODE_OPTIONS=--require`: ese archivo contesta a los tres proveedores de geo
  (también `ip-api.com` e `ipwho.is`, que `weather.ts` prueba de respaldo) y al
  de pronóstico con la misma ciudad de `CLIMA`.
- **Fuentes.** `index.html` pide Inter, JetBrains Mono y DotGothic16 a Google
  Fonts, y **sin bloquear el pintado**: si no llegan, la aplicación se dibuja
  con la tipografía del sistema y no avisa. Las fuentes se **reflejan** desde el
  sitio de verdad y el guion se para si alguna de las tres no llegó a cargar.
- **Tienda.** La ventana carga un manifiesto **local** de mentira (`artes.mjs`
  lo genera en `fuentes/tienda/`) que `servicios.mjs` sirve en el sitio del
  manifiesto de la galería cuando `VD_PRENSA_TIENDA` está puesta. Son cinco
  entradas inventadas, con `icono`, portada y capturas generadas por el propio
  guion, y el perfil de la primera lleva una acción de cada clase (script,
  programa, atajo, texto, webhook, URL, temporizador, audio) para que el aviso
  de riesgo enseñe de verdad lo que resume. El código de la tienda es el de
  siempre: solo cambia de dónde viene el manifiesto.
- **Mando móvil.** La página la sirve la propia app en
  `http://127.0.0.1:<puerto>/` (`servidorLocal.ts`) desde que la config siembra
  `remote.enabled`. El guion navega la ventana principal a esa dirección —el
  proxy CDP de Electron 33 no deja abrir pestañas— y siembra el token en
  `localStorage` antes de recargar, que es de donde la página lo lee. Se
  captura con vista de teléfono y el texto sale en el idioma de la tanda; la
  05b es la misma captura compuesta en un lienzo vertical 1080×1920.
- **Dock N3.** La página se siembra con `superficie: { serial, modelo: 'n3' }`
  y los 18 huecos del perfil «multimedia» (`perfilesDock.ts`), con los iconos
  del catálogo. `DispositivosB` fusiona el hardware vivo con las páginas de la
  config: sin aparato, el serial inventado sale «Desconectado» y el chasis se
  pinta igual; con aparato, la página se ata a su serial para que salga
  «CONECTADO», y lo que se ve se enmascara antes de disparar (ver «Repaso de
  privacidad»).
- **Barra flotante — dos ventanas en una imagen.** La barra **es otra ventana
  de Electron**, así que no sale en la captura de la de debajo:
  `Page.captureScreenshot` fotografía un documento, no la pantalla. Y en la
  máquina donde se generan estas imágenes no hay con qué fotografiar la pantalla
  entera, así que el guion junta las dos capas **por sus coordenadas reales**:
  pide a la barra su propia captura (con fondo transparente, como la ventana) y
  la pega en el margen derecho del fondo. Lo de debajo es
  `fuentes/fondo-neutro.png`, un escritorio abstracto generado —dos ventanas y
  una trama, sin marca de nadie—. Con `--fondo=<ruta>` se rehace sobre una
  captura de escritorio de verdad:

  ```bash
  node scripts/prensa/capturar.mjs 07 --fondo=docs/prensa/fuentes/escritorio.png
  ```

  Si se cambia la captura de escritorio, hay que revisar a mano que no lleve
  nombre de usuario ni marcas de terceros a la vista.
- **Reproducción — la única excepción.** La franja de música necesita una sesión
  de medios de Windows (SMTC), que es una API del sistema y no tiene cable que
  enchufar. Así que `electron/main/mediosFijos.ts` lee la pista de un archivo
  **solo si `VD_MEDIOS_FIJOS` está puesta**; sin esa variable devuelve `null` en
  la primera línea y no cambia nada de la aplicación instalada. El archivo es
  `fuentes/reproduccion.json`, y la pista es inventada a propósito: **una
  carátula real tendría derechos de autor**, así que la de las capturas se
  genera con la trama de puntos del proyecto (`scripts/prensa/caratula.mjs`,
  que el capturador ejecuta solo si falta el archivo).
  **La barra de progreso no sale**: `PistaFija` (el camino de `VD_MEDIOS_FIJOS`)
  no lleva `positionMs`/`durationMs`/`timelineUpdatedAt`, y `getNowPlaying`
  devuelve el objeto fijo tal cual. Para verla haría falta tocar
  `electron/main/mediosFijos.ts` y `media.ts`, que este encargo no permite.

### Un detalle del producto que salió al hacer esto

- El aviso de calibración del gestor RGB dice «1 **zonas** ARGB sin tamaño
  guardado». En las capturas no se ve porque se siembra `zoneSizes`, pero el
  plural sin concordancia está en `rgb.uncalibrated`.

---

## Animación de cabecera

| Archivo | Qué es |
|---|---|
| `hero.svg` | La animación. Un solo archivo, sin librerías, **sin JavaScript**, 65 KB. Bucle de 12 s. |
| `vista.html` | Lo enseña sobre fondo oscuro y claro a la vez. Se abre a doble clic, no hace falta servidor. |
| `render.sh` | Convierte `hero.svg` en `hero.mp4` y saca de él un fotograma a `miniatura.png`. **Ese `miniatura.png` es el mismo nombre que la miniatura del tráiler**: ver «[Dos nombres que chocan](#dos-nombres-que-chocan)». |

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

### El vídeo del héroe (ya no es el de la Store)

La ficha 0.14.0 lleva el **tráiler de HyperFrames** ([más abajo](#artes-de-la-ficha-y-de-la-web)),
no este. `hero.mp4` se sigue generando para el héroe de la web y como plan B.

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

`hero.mp4` **no está en el repositorio**: es salida, se regenera con el script y pesa de más
para versionarlo. `miniatura.png` sí está, pero es la miniatura del tráiler, no la de este
vídeo (ver «[Dos nombres que chocan](#dos-nombres-que-chocan)»).

---

## Artes de la ficha y de la web

Los cuatro PNG de la tanda 0.14.0 que **no** son capturas: dos son recursos que pide el
formulario de la Store, dos los usa la web. No se sacan de la aplicación: salen del
proyecto de **HyperFrames** (el del tráiler), que vive en `_referencias/trailer/` y **no
se versiona**. Aquí solo queda la salida.

| Archivo | Qué es | Para qué sirve | Medidas |
|---|---|---|---|
| `miniatura.png` | Un fotograma legible del tráiler: el logotipo con el lema arriba y, debajo, el deck y el Stream Dock N3 sobre la trama de puntos. | Recurso **«miniatura del tráiler»** de la ficha: el formulario lo pide **si** se sube el MP4. | 1920×1080 PNG |
| `superheroe.png` | El deck y el Stream Dock N3 sobre la trama de puntos, **sin una sola línea de texto encima**. | Recurso **«superhéroe»** 16:9 de la ficha. Opcional. | 1920×1080 PNG |
| `og-image.png` | El logotipo, el lema y los dos botones (Store y código abierto) sobre la trama de puntos. | `og:image` y `twitter:image` de `docs/index.html`: lo que se ve al compartir el enlace. | 1200×630 PNG |
| `banner.png` | El lema con los cuatro rótulos de recursos (STREAM DOCK N3 · KIOSKO 1280×480 · MANDO MÓVIL WI-FI · MICROSOFT STORE) y, a la derecha, el deck y el dock. | Cabecera ancha para el README o la página de las releases. La Store **no** pide banner: no es un recurso suyo. | 1280×640 PNG |

**El tráiler no está en el repositorio.** El MP4 de 1920×1080 y ≤60 s **se genera con
HyperFrames y se sube a la ficha de la Store**; pesa demasiado para versionarlo y desde el
repo no se reproduce. Lo único que queda de él es la miniatura.

Las cuatro no llevan carpeta `en/`: la Store no pide artes por idioma. Dos cosas que
conviene tener presentes: el lema de `banner.png` y `og-image.png` está en castellano a
propósito (es la marca, no una traducción pendiente), y `miniatura.png` y
`superheroe.png` salen del deck de demostración, así que en ellas se lee «Retícula en
azul», el título de la pista inventada, aunque la ficha esté en inglés.

### Lo que se revisó en las cuatro, una por una

Miradas a tamaño completo, igual que las capturas:

| | Ruta con un nombre | Serial | Música real | Marca de tercero pegada |
|---|---|---|---|---|
| `miniatura.png` | no | no | no: la pista es la inventada | no: los rótulos son glifos DOT |
| `superheroe.png` | no | no | no: la pista es la inventada | no: «Stream Dock N3» es el nombre del modelo que la propia app reconoce, escrito en texto |
| `og-image.png` | no | no | no sale música | no |
| `banner.png` | no | no | no sale música | no |

Lo que sí aparece, en las cuatro, son **nombres de apps y de hardware escritos como
texto** (Spotify, Discord, OBS Studio, «NVIDIA GEFORCE RTX 4070», «ASUS ROG STRIX B650-E»):
son los rótulos de los botones y los widgets de la propia aplicación, con los iconos de su
catálogo, igual que en las capturas (ver «Repaso de privacidad»). No hay ningún logotipo
ajeno pegado encima de la imagen, ni rutas, ni seriales.

### Dos nombres que chocan

`miniatura.png` está en las dos listas de golpe: es la salida de `render.sh` (el fotograma
del héroe) **y** la miniatura del tráiler que sí se quiere en el repo. `.gitignore` la
sigue ignorando —por lo que hoy la miniatura del tráiler es el único PNG de esta carpeta
que git no ve— y `render.sh` la sigue sobreescribiendo con el fotograma del héroe. Si se
vuelve a correr el guion, hay que reponer la del tráiler detrás.
