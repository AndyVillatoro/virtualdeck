# Changelog

Todos los cambios notables de VirtualDeck se documentan aquí.
Sigue el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [SemVer](https://semver.org/lang/es/).

## [0.8.0] — 2026-08-24

Otra tanda del mismo método, y esta vez tocó fondo: seis funciones anunciadas
en la interfaz que no funcionaban, y en cuatro casos **no habían funcionado
nunca**. La técnica que las encontró fue siempre la misma — cruzar lo que hace
una pantalla contra lo que hace otra con el mismo botón — y en todos los casos
la prueba se hizo con la aplicación abierta y con un control, no leyendo el
código.

### Fixed

- **Los botones de una página añadida desaparecían al reiniciar.** Al cargar,
  los botones guardados se emparejaban con sus huecos **por id**, dando por
  hecho que el id de un botón es siempre `página-hueco`. Hay cuatro caminos en
  los que no lo es: añadir una página con «+», agrandar la cuadrícula, importar
  una página, y borrar una página (que renumera las páginas pero no los ids).
  En los cuatro, los botones seguían en el archivo y desaparecían de la
  pantalla. Ahora el emparejamiento es por posición, que es lo que se ve — y
  con eso **los decks que ya estaban en disco recuperan sus botones al abrir**.
- **El grupo radio no funcionaba con el ratón, en ninguna pantalla.** Encender
  un botón del grupo dejaba encendidos los demás. La celda que se pulsa conserva
  el manejador de su primer render, y con él una lista de encendidos vacía. Lo
  disimulaba que la acción «al apagar» sí funcionase: esa celda ya había
  cambiado algo suyo y tenía el manejador fresco.
- **Las acciones con `{variable}` leían un valor caducado**, el de cuando se
  dibujó la celda. Solo se salvaban los botones cuya **etiqueta** lleva llaves,
  porque eso fuerza el redibujo — o sea que la función parecía ir bien justo en
  el caso en que el valor se ve en el propio botón, y fallaba en los contadores
  y en las acciones encadenadas.
- **Un botón pulsado en la barra flotante no guardaba nada.** Un contador
  pulsado ahí no contaba. La barra tenía su propia copia del gesto de pulsar y
  descartaba el cambio de estado. Además el proceso principal solo avisaba de
  los cambios a la barra, nunca al deck, así que lo que la barra guardaba se
  perdía en cuanto el deck volvía a guardar.
- **El grabador de macros nunca produjo una macro correcta.** El mapa de teclas
  suponía los códigos virtuales de Windows y la librería entrega scancodes:
  grabar `abc1 Ctrl+C Alt+Tab F5 Enter` daba cuatro pasos, tres de ellos teclas
  que nadie pulsó. Tampoco se guardaban los modificadores, así que `Ctrl+C` se
  grababa como `c`. El mapa se deriva ahora de la propia librería. Y toda macro
  terminaba con un clic en el botón de detener, que al reproducirla caía sobre
  lo que hubiera en ese punto de la pantalla.
- **El tutorial de bienvenida no se había mostrado nunca.** La migración que
  marca el tutorial como visto para los usuarios veteranos tomaba una
  instalación virgen por un usuario antiguo, y lo descartaba antes de
  enseñarlo.
- **El texto con acentos se corrompía al pasar por PowerShell**, en los dos
  sentidos: al entrar (los archivos temporales se escribían sin marca de
  codificación) y al salir (el núcleo nativo leía la salida sin forzar UTF-8).
  Afectaba a «leer en voz alta», «escribir texto» y a la salida de un script
  guardada en una variable.
- **El icono de la barra de tareas volvió a esconderse.** VirtualDeck vive en
  la bandeja y su icono en la barra era un duplicado.
- **Guardar, cargar y borrar un perfil quedaban fuera del deshacer.** Borrar
  uno era irreversible; y peor, deshacer una acción anterior se llevaba por
  delante un perfil guardado después. Guardar con un nombre existente ahora
  sobrescribe en vez de duplicar, y el perfil guarda también el fondo.
- **Vaciar o mover varios botones era una operación por botón**: diez pasos de
  deshacer y diez escrituras en disco para una sola acción.
- **El español estaba mezclado en tres registros**: voseo en el tutorial y los
  avisos, tuteo en los ajustes y los errores, y regionalismos sueltos. Todo
  pasa a neutro formal (usted), tanto en la aplicación como en la guía.
- **Las notificaciones se registraban en Windows con una identidad que no
  existe**, así que aparecían sin el nombre ni el icono de la aplicación.

### Added

- **El estado de los interruptores se comparte entre las tres pantallas** —
  principal, kiosko y barra flotante — y sobrevive a reiniciar. Antes cada una
  llevaba su propia cuenta.
- **El tutorial pasa de 5 a 7 pasos y los nuevos hacen algo**: elegir idioma
  (primero, porque todo lo que sigue se lee en él), tema y color de acento en
  vivo, e importar una configuración existente antes de empezar.
- **Arrancar con Windows entra directo a la bandeja**, sin abrir la ventana
  delante de lo que estuvieras haciendo.
- **Widget de conversión de divisas** con tasa diaria, 166 monedas, y la última
  tasa guardada para seguir funcionando sin conexión.
- **Botón que sube y baja** el brillo o el volumen desde donde estén, también
  con la rueda del ratón sobre la celda.
- **De 7 a 18 presets de RGB**, con brillo y velocidad propios.
- **Mantener pulsado arrastra un botón a otra casilla**, que es la única forma
  de reordenar con el dedo.

### Changed

- Lo que pasa al pulsar un botón vive ahora **en un solo sitio**. Estaba escrito
  cuatro veces y cada copia perdía algo distinto: el grupo radio, el tope para
  una acción colgada, la captura de salida de un script, los avisos de error o
  el guardado de variables.
- `Ctrl+K` busca en los quince campos de un botón, no solo en tres.
- La auditoría de traducción tiene dos comprobaciones más: una para el registro
  del español y otra para el texto pegado a una expresión. Entre las dos
  encontraron una docena de textos vivos sin traducir.

## [0.7.0] — 2026-08-23

Una tanda de arreglos, casi todos del mismo tipo: cosas que estaban en la
interfaz y no hacían lo que decían. Ninguno salió de un reporte — salieron de
cruzar inventarios (qué tipos de acción existen contra cuáles se pueden
configurar, qué le pasa cada pantalla a una celda, qué canales IPC declara
cada lado) y de abrir la aplicación en inglés.

### Fixed

- **Importar una configuración inválida borraba la que tenías.** El archivo se
  guardaba en disco *antes* de validarlo, así que un JSON que no fuera un deck
  reemplazaba todo mientras la pantalla decía «Importación rechazada» — es
  decir, «no ha pasado nada». Quedaba copia de seguridad, pero había que saber
  que hacía falta buscarla. Ahora se valida primero y solo se guarda lo que
  pasa.
- **Importar un perfil desde una URL no podía funcionar.** La política de
  seguridad de la propia ventana bloquea cualquier conexión que no sea a los
  servicios del clima, así que la descarga se rechazaba siempre y además
  tumbaba la ventana. Ahora la hace el proceso principal, que no está sujeto a
  esa política, y solo admite `http` y `https`.
- **Una importación correcta tampoco se guardaba del todo**: se escribía el
  JSON del archivo y no lo que la aplicación estaba usando. Por eso un perfil
  descargado desaparecía al reiniciar.
- **Los widgets no se dibujaban en pantalla completa.** Un botón con reloj,
  clima o sensor mostraba el dato en la ventana normal y el icono de la acción
  en kiosko — justo el modo pensado para dejar el deck mirando a la
  habitación.
- **En kiosko faltaban además**: las etiquetas con `{variable}` salían con las
  llaves literales, la visibilidad condicional se ignoraba (un botón con «solo
  si corre tal aplicación» aparecía siempre), no se marcaba el dispositivo de
  audio en uso y la pulsación larga no hacía nada.
- **Los disparadores automáticos no sonaban en kiosko.** Los de hora y los de
  sensor vivían en la pantalla principal, así que al pasar a pantalla completa
  dejaban de existir. El de hora además solo miraba la página que tuvieras
  abierta: una acción puesta a las 08:00 solo saltaba si a esa hora estabas
  mirando esa página.
- **En la barra flotante, un botón con varias acciones ejecutaba solo la
  primera**, y la acción «al apagar» de un interruptor no se ejecutaba nunca.
- **Tres tipos de acción no se podían configurar**: al elegir *Shuffle*,
  *Repetir* o un preset RGB, el paso 2 del editor salía en blanco.
- **Doce botones de ejemplo estaban escondidos**: la categoría RGB del
  catálogo no aparecía entre las pestañas, solo se llegaba a ella escribiendo
  en el buscador.
- **Un atajo global aplicaba perfiles RGB desactualizados**: si editabas los
  colores de un perfil, el atajo seguía aplicando los de antes hasta
  reiniciar.
- **Poner un widget de clima no arrancaba nada** hasta reiniciar la
  aplicación.
- **Las casillas del modo «cuadradas» no eran cuadradas** (114×122 en una
  rejilla de 4×3) y en modo «llenar área» la última fila quedaba recortada.
- Elegir un archivo que no fuera una página exportada cerraba el diálogo sin
  decir nada.
- En el editor de ramas, los presets RGB se listaban por su identificador
  interno (`night-blue`) en vez de por su nombre.

### Changed

- **La aplicación en inglés ya está en inglés.** Faltaban unos sesenta textos
  que la auditoría no veía: los que viven dentro de expresiones (`x ? 'A' :
  'B'`), los de los módulos que no son componentes, y **todo el proceso
  principal** — el menú de la bandeja, los títulos de los diálogos de archivo
  y los errores que devuelve a la pantalla. La fecha de kiosko también estaba
  fija en español.
- El nombre de la página importada y el aviso de rechazo pasan por el
  diccionario.

### Interno

- Cuatro cosas que estaban duplicadas entre pantallas pasan a compartirse: la
  rejilla de botones, los datos de los widgets, el sondeo del sistema y los
  disparadores. Los cuatro fallos de kiosko de esta versión eran justamente
  copias que se habían separado.
- Dos guardianes nuevos en `npm run check`: uno cruza los 86 canales IPC entre
  el proceso principal y el puente del preload, y otro comprueba que cada tipo
  de acción tenga formulario en el editor y que los presets RGB existan en los
  dos lados. Los dos fallan si se rompe la correspondencia; comprobado
  rompiéndola a propósito.
- La auditoría de idioma gana tres formas nuevas de mirar y aprende a callarse
  con lo que no es interfaz (la salida de consola, los scripts de PowerShell
  que se generan dentro, las expresiones regulares que casan texto en
  español).
- `i18n.tsx` pasa de 1135 líneas a 75; los diccionarios viven aparte.

### Sin probar

- Macros con teclado real, síntesis de voz, notificaciones y RGB con hardware:
  verificados por código, no ejecutados en esta tanda.
- El desplegable de presets dentro del editor de ramas: no se puede abrir esa
  pantalla con eventos sintéticos. El selector equivalente del paso 2 sí está
  comprobado en la aplicación empaquetada.
- Los widgets en la barra flotante siguen sin dibujarse. Esa ventana no
  consulta nada a propósito, y el clima, la música y los sensores traerían un
  segundo proceso de sondeo permanente.

## [0.6.0] — 2026-08-20

Dos cosas grandes: el núcleo pasa a ser código nativo en Rust en vez de
PowerShell, y aparece la barra flotante. El resto es una tanda larga de
arreglos de interfaz —modo claro, traducciones, arrastre— y una reorganización
del código que no se ve pero que toca casi todos los archivos.

### Added
- **Núcleo nativo (`vd-core`, Rust compilado como módulo de Node)**. Sustituye a
  PowerShell en audio, lanzador, media, macros y sensores. Lo que antes eran
  procesos de PowerShell de cientos de milisegundos ahora son llamadas directas
  a la API de Windows. Si el `.node` no carga, se cae a PowerShell como antes:
  nada deja de funcionar, solo va más lento.
- **Barra flotante**: una columna de tiles por encima de todo, en el monitor
  principal, para pulsar botones sin abrir el deck. Sin fondo (solo los tiles se
  ven), opacidad 30–100 %, 1–N huecos según lo que quepa en la pantalla, y se
  arrastra a donde quieras. Se arma en la pantalla **BARRA** arrastrando botones
  que ya existen; guarda ids, así que editar el botón en el deck cambia también
  la barra.
- **Siempre visible** (Ajustes ⚙): la ventana del deck se queda por encima de
  las demás. Usa el nivel `screen-saver`, que también gana a un juego en
  pantalla completa.
- **Perfil RGB de arranque**: se marca con el círculo junto a APLICAR en el
  panel de perfiles. Al abrir VirtualDeck se aplica solo, que es lo que faltaba
  para no tener que abrir el gestor RGB después de cada reinicio.
- **Sensores sin LibreHardwareMonitor**: el núcleo nativo lee los sensores
  directamente. LHM sigue soportado como alternativa.

### Changed
- **Sin PowerShell en el camino caliente.** Se quitaron las cachés de audio y
  sensores: existían solo para tapar la lentitud de PowerShell y ahora estorban
  (devolvían datos viejos).
- **El deck aparece en la barra de tareas.** Antes se ocultaba porque la
  aplicación vive en la bandeja, pero la ventana no tiene marco: si quedaba
  detrás de otra no había forma de distinguirla, y el resultado era
  indistinguible de que la aplicación no arrancara.
- **La ventana se muestra en cuanto hay DOM**, no al terminar de cargar. Antes
  esperaba a la hoja de fuentes remota, y si Google Fonts no respondía la
  ventana no llegaba a mostrarse nunca.
- **El reloj y la fecha siguen al idioma elegido.** Estaban fijos en español.
- Los umbrales del widget de sensor ya no guardan `NaN` cuando se escribe algo
  que no es número.

### Fixed
- **Un color RGB dejaba las luces apagadas al cerrar la aplicación.** La acción
  pintaba en modo `Direct`, que no guarda nada en el dispositivo: es OpenRGB
  alimentando los LEDs en vivo. Como VirtualDeck arranca OpenRGB y lo mata al
  salir, la tira se quedaba sin nadie que la mandara. Ahora usa `Static`, que el
  controlador se queda. **Sin probar contra hardware**: cambiar de modo a ciegas
  en una placa que no se puede observar es justo lo que apagó las luces la otra
  vez.
- **El núcleo nativo no llegaba al instalador.** `asarUnpack` lo incluía, pero
  `files` no, así que nunca entraba en el paquete. No fallaba —hay respaldo en
  PowerShell— simplemente no había núcleo nativo en la aplicación instalada.
- **Arrastrar un botón a otra casilla no hacía nada.** El memo de la celda
  ignora los handlers a propósito, así que la celda de destino se quedaba con el
  de antes del arrastre, cuando todavía no había nada arrastrándose. El id viaja
  ahora dentro del propio arrastre.
- **El botón "?" del widget de música congelaba la aplicación.** El diagnóstico
  recorre todas las sesiones SMTC, y basta con que una aplicación haya dejado
  una a medio cerrar para que no termine nunca. Al ser una llamada nativa
  síncrona, bloqueaba el proceso principal entero. Va por PowerShell mientras
  tanto: tarda medio segundo pero corre en otro proceso. El arreglo de raíz
  (límite de 5 s en `vd-core`) está escrito pero **sin compilar** — ver abajo.
- **SMTC colgaba el proceso principal**: el widget de música bloqueaba Electron
  indefinidamente. Las llamadas a WinRT van ahora en un hilo MTA propio.
- **La CSP bloqueaba el arranque en desarrollo** (pantalla en negro sin ningún
  error).
- **Modo claro**: doce archivos leían la paleta oscura directamente en vez del
  contexto. En modo claro se veían con texto oscuro sobre fondo oscuro. Una
  regla de eslint lo impide ahora.
- **Traducción al inglés**: quedaban ~75 textos en español, incluidos los 50
  mensajes de error de las acciones y el panel de ajustes entero.
- **La barra flotante se recortaba** con la interfaz escalada, y el recuadro de
  detrás no era transparente. Ahora se mide a sí misma y pide el tamaño exacto.
- Tildes que se comían los títulos, títulos cortados, y fondos de pantalla que
  no se veían.

### Interno
Reorganización grande. No cambia nada de lo que se ve, pero es la mitad de los
commits de esta versión.

- `EditorB` 2083 → 553 líneas, repartido en pasos (`PasoAccion`,
  `PasoConfigurar`, `PasoEstilo`), un formulario por tipo de acción en un mapa,
  y piezas comunes.
- `MainB` 1210 → 815 (`BarraLateral`, `PestanasPagina`, `OverlayCarpeta`).
- `App` 813 → 542: toda la configuración y sus 25 operaciones van a `useDeck`.
- `ButtonCell` complejidad 94 → 43; `RGBManagerB` 872 → 456; `TitleBar` 500 →
  257; el despachador de acciones, de complejidad 105 a 6.
- Tres auditorías nuevas en `npm run check`, cada una porque el fallo que
  detectan ya se había colado:
  - `check-acciones.mjs`: un tipo de acción sin implementar hacía un botón que
    no hacía nada y decía que había ido bien.
  - `check-i18n.mjs`: texto visible en español que nunca se envolvió.
  - regla de eslint contra importar la paleta de colores directamente.

### Sin probar
Lo verificado a mano: arranque, arrastre entre casillas y a otra página, los
tres pasos del editor, el panel de ajustes, la pantalla RGB, la barra flotante,
el cambio de idioma, y que un cambio llegue al disco.

No verificado: la mayoría de los 30 tipos de acción uno por uno, el calibrador
de zonas ARGB, el grabador de macros y el widget de música. Ejecutarlos habría
cambiado el audio, el brillo y las luces de la máquina donde se desarrolla.

## [0.5.1] — 2026-05-29

### Fixed
- **Ícono de bandeja (tray) vacío en el instalador**: `createTray` cargaba `build/icon.ico` con una ruta relativa a `__dirname`, pero ese archivo no se empaqueta dentro del asar (solo `out/**`), así que en la app instalada el `nativeImage` quedaba vacío y el ícono de la bandeja no aparecía (en dev sí funcionaba). Ahora `loadTrayIcon()` prueba el ícono empaquetado (`process.resourcesPath`) y las rutas de dev, y cae a un ícono PNG generado por código (`makeTrayIcon`, que existía sin usar) si todo falla. Además `build/icon.{png,ico}` se incluyen en `extraResources` y `build:installer` regenera el ícono primero.

## [0.5.0] — 2026-05-29

Milestone de internacionalización, onboarding y calidad: la app pasa a ser bilingüe (ES/EN), recibe a usuarios nuevos con tutorial + hints, gana un widget de variable, y suma un marco de mejoras (mapa SRP + roadmap 1/N) con tooling que hace cumplir SOLID. Incluye la corrección de una regresión del widget de música.

### Added
- **Tooling SRP/SOLID verificable**: `dependency-cruiser` (hace cumplir las capas de `docs/ARQUITECTURA.md` — sin ciclos, main↔renderer aislados, components/utils/data sin importar "hacia arriba"), `eslint` + `typescript-eslint` + `react-hooks` (con `complexity`/`max-lines`/`max-depth` como señal de deuda SRP) y `knip` (código muerto). Nuevo gate único **`npm run check`** (tsc + arquitectura + eslint). Arquitectura: 0 violaciones en 75 módulos.
- **Marco de mejoras + documentación**: nuevo `docs/ARQUITECTURA.md` (mapa SRP de cada módulo/clase/feature con su responsabilidad única), `docs/ROADMAP.md` (secuencia "1/N" para mejorar un apartado por sesión con ritual de verificar→mejorar→documentar) y `docs/wiki/` (staging bilingüe ES/EN del wiki público al que apunta el botón Documentación: Home, Sidebar, Primeros pasos / Getting Started, e instrucciones de publicación).
- **Más hints y tooltips**: hint de búsqueda (Ctrl+K) cuando el deck ya tiene botones, hint de Configuración anclado al engranaje ⚙, y traducción ES/EN de todos los tooltips nativos de la barra superior.
- **i18n: WallpaperB 100% traducido** (ítem #1 del roadmap de i18n profundo): UI y nombres de fondos.
- **i18n: EditorB — chrome** (ítem #2): pasos (ACCIÓN/CONFIGURAR/ESTILO), título, vista previa, navegación (atrás/cancelar/siguiente/guardar) y contador de paso, traducidos ES/EN.
- **i18n: tipos de acción** (ítem #3): los 34 tipos del selector (label + descripción) traducidos ES/EN. `actionData.ts` ahora guarda **claves** (`act.<tipo>.label/.desc`) en vez de texto — el diccionario i18n es la fuente única (sin duplicación). Cubre el picker principal, la lista de secuencia y los selectores de toggle-off/branch/acción-extra.
- **i18n: campos del editor** (ítem #4): los **120** `label`/`placeholder` de configuración por acción (y, de paso, los del paso ESTILO/widget/disparadores) traducidos ES/EN vía un nuevo helper `useFieldText()` que traduce por texto-fuente español con fallback (sin inventar 120 claves). Las rutas y nombres de marca pasan sin cambio.
- **Idiomas Español / Inglés (i18n)**: nuevo sistema de traducción ligero sin dependencias (`src/utils/i18n.tsx`): `LanguageProvider` + `useT()` + diccionarios `es`/`en` con interpolación `{var}`. Selector **IDIOMA** (Sistema / Español / English) en ⚙ Configuración, junto a Tema; se persiste en `config.language` y `'system'` detecta el locale del SO. Traducidas las superficies de mayor tráfico: configuración (tema/idioma/autostart), onboarding completo, búsqueda Ctrl+K y banner de actualización. Las pantallas de configuración profunda (EditorB, RGB, Wallpaper) siguen en español por ahora — la infraestructura ya permite traducirlas incrementalmente clave por clave.
- **Hints contextuales descartables**: nuevo componente `Hint` (mensaje flotante que aclara para qué sirve un control y se descarta para siempre con "Entendido"/"Got it"). Aprovecha el campo `hintsDismissed` (v0.4.0). Primer hint activo: en un deck nuevo sin botones, una nota sobre la grilla explica "hacé clic en una celda vacía para crear tu primer botón". Complementa el onboarding (el tutorial da el panorama; los hints aclaran controles in situ). Traducido ES/EN.
- **Widget `variable` (1.2 del roadmap — diferencial)**: un botón puede ahora mostrar en vivo el valor de una variable de estado (`DeckConfig.state`), con prefijo y etiqueta opcionales. Cierra el caso de uso estrella de las variables: combinar acciones "Incrementar variable" / "Asignar variable" con un botón que muestra el contador (tomas de stream, pomodoro, etc.). El resto de la capa de variables (interpolación `{var}` en app/url/script/clipboard/type-text/webhook/tts, acciones `set-var`/`incr-var`, persistencia, `branch` condicional) ya existía; faltaba poder **ver** el valor. El editor del widget autocompleta nombres de variables ya usadas.
- **Onboarding / tutorial inicial**: nuevo overlay de bienvenida de 5 pasos (`src/components/Onboarding.tsx`) que se muestra en la primera ejecución (instalación virgen). Explica qué es VirtualDeck, cómo configurar botones, páginas/grilla, widgets/pantalla completa y dónde está la ayuda. Navegable con teclado (←/→/Enter/Esc), con "Saltar". Al terminar persiste `onboardingCompleted: true`. Hasta ahora el flag existía (v0.4.0) pero no había UI: el botón "Repetir tutorial" de Ayuda → Acerca de quedaba sin efecto y los usuarios nuevos no recibían ninguna guía. Ahora `App.tsx` provee `onReplayOnboarding` y el tutorial se puede repetir.

### Changed
- **Reorganización de documentación**: fusionados los markdowns para mejor seguimiento. `SUGERENCIAS.md` + `docs/ROADMAP-MEJORAS.md` → **`docs/ROADMAP.md`** (fuente única: secuencia 1/N + catálogo de ideas). `RELEASE.md` + `docs/desarrollo.md` + `docs/firma-y-distribucion.md` → **`CONTRIBUTING.md`** (un solo doc de desarrollo). Guías de usuario (`docs/guia.md`, `acciones.md`, `sensores.md`) movidas al **wiki** (`docs/wiki/`). `README.md` raíz reemplazado (era un handoff bundle de diseño) por un README real del proyecto.
- **Limpieza de recursos muertos**: eliminadas `chats/`, `project/` (wireframes/mockups), `.interface-design/` y `docs/legacy/` — recursos de diseño/guía ya usados, sin referencias de código.

### Removed
- **Código muerto (detectado por knip)**: eliminado `electron/main/bootstrap.ts` (entry point alternativo huérfano, con un `Module._load = Module._load` no-op roto) y desinstalada la dependencia **`lucide-react`** (sin usar: `VDIcon` ya define todos los íconos como SVG inline propio). Atribución de lucide-react quitada de `credits.ts`.

### Fixed
- **Rules of Hooks en `ButtonCell`**: el `return` temprano por `isHidden` ocurría **antes** de dos `useEffect`, así que al alternar visibilidad de un botón cambiaba el orden de hooks (bug latente de React). Detectado por el nuevo `eslint` (`react-hooks/rules-of-hooks`); el early-return se movió a después de todos los hooks.
- **🔥 Widget de música no detectaba nada (regresión)**: el `Await-Op` de `media.ts` hacía polling de `$op.Status` del `IAsyncOperation` de WinRT, pero en PowerShell 5.1 stock esa propiedad no se proyecta (queda vacía), así que el await devolvía siempre `$null`, el `SessionManager` salía `null` y el widget `now-playing` (sidebar, fullscreen y celdas) quedaba en blanco. Fix: volver al mecanismo `AsTask` (`System.Runtime.WindowsRuntime` + reflection) con tipo de resultado explícito. Alias de tipo (`$TMgr`/`$TProps`/`$TStream`) cargados con el loader WinRT completo. Soporte de `IAsyncOperationWithProgress` para el thumbnail (`OpenReadAsync`). Verificado en vivo: manager resuelve OK donde antes salía null.

## [0.4.0] — 2026-05-28

Primer milestone del roadmap "store-ready": el dev ya puede publicar actualizaciones y el usuario tiene ayuda integrada + reporte de errores.

### Added
- **Auto-actualizaciones**: integración de `electron-updater` con GitHub Releases. La app busca updates al arrancar (8s) y, cuando descarga una versión nueva, muestra un banner "Actualización lista → Reiniciar". También hay botón manual "Buscar update" en Ayuda → Acerca de.
- **Panel Ayuda y Acerca de**: nueva sección colapsable en el flyout de configuración (⚙). Muestra versión de la app, documentación, reportar error, apoyar el proyecto, abrir/exportar registro, repetir tutorial (cuando exista), y créditos/licencias.
- **Reporte de bugs**: botón "Reportar error" que abre un issue de GitHub pre-llenado con versión, OS, Electron/Chrome y las últimas líneas del registro. Plantillas de issue (`bug_report`, `feature_request`).
- **Donaciones (no intrusivo)**: botón discreto "♥ Apoyar" con Ko-fi, GitHub Sponsors y PayPal. App 100% gratis; cero banners ni nags.
- **Registro de errores persistente**: log rotativo en `userData/logs/virtualdeck.log` (512KB, 1 backup). Captura errores antes silenciados (`window.onerror`, promesas sin catch, fallos de acción). Exportable y adjuntable a reportes.
- **IPC de versión/metadata**: `app:version` + `app:platformInfo` (OS, Electron, Chrome, locale) accesibles desde el renderer.

### Changed
- **Metadata de package.json**: agregados `author`, `license`, `homepage`, `repository` (resuelve el warning de electron-builder) + `build.publish` apuntando a GitHub Releases.
- **Config schema v3 → v4**: nuevos campos opcionales `language`, `onboardingCompleted`, `hintsDismissed`. La migración marca a usuarios existentes como `onboardingCompleted: true` (solo instalaciones nuevas verán el futuro onboarding).
- **Validación de import**: el set de tipos de acción válidos ahora incluye `macro`, `media-shuffle`, `media-repeat` (faltaban desde 0.3.0).

## [0.3.0] — 2026-05-10

### Added
- **Multi-select de botones**: Ctrl+clic para seleccionar varios botones; barra flotante con acciones bulk: mover/copiar a otra página, limpiar selección.
- **Macros de teclado y ratón**: nuevo tipo de acción `macro` con grabador global (`uiohook-napi`) y editor manual de pasos (tecla, hotkey, texto, click, move, scroll, delay). Reproductor via PowerShell (`SendKeys` + `user32.dll mouse_event`).
- **Media SMTC extendido**: nuevas acciones `media-shuffle` y `media-repeat` que invocan `TryChangeShuffleActiveAsync` / `TryChangeAutoRepeatModeAsync` del SMTC nativo de Windows.
- **Paleta de colores de acento**: 5 → 10 colores predefinidos (azul, verde, amarillo, violeta, rojo, teal, rosa, naranja, lima, índigo). El selector de color libre sigue disponible.
- **Audio device cache**: lista de dispositivos cacheada 30s en main process; invalida automáticamente al cambiar default. Reduce el spawn de PowerShell por tick de polling.
- **Botón "Reintentar" en editor de audio**: si la lista de dispositivos falla al cargar, ahora se muestra error visible con opción de reintento (antes era falla silenciosa).

### Fixed
- **🔥 Cambio de dispositivo de audio**: bug crítico que impedía que el botón aplicara el cambio.
  - `ps-helpers.ts`: `param()` debe ser la primera sentencia en PowerShell. El prefix UTF-8 (3 líneas) lo empujaba a la línea 4 → PS rechazaba el `param()` → `$Id` llegaba vacío al C#. Fix: parser que detecta `param(...)` (con whitespace y comentarios) y mete el prefix UTF-8 después.
  - `audio.ts`: el código C# usaba `[PreserveSig]` pero ignoraba los HRESULT → siempre devolvía "OK" aunque la API fallara silenciosamente. Fix: chequeo HRESULT de cada `SetDefaultEndpoint` (Console/Multimedia/Communications), fallback a `IPolicyConfigVista` (IID `568b9108-...`) para builds Win10/11 con `E_NOINTERFACE`, y verificación post-set con `GetDefaultAudioEndpoint` para detectar drivers que aceptan la llamada sin aplicar el cambio.
  - Logs en `console.error` con prefix `[audio]` para diagnóstico.

### Changed
- **Refactor SRP de `electron/main/index.ts`**: 675 → ~95 líneas. Split en módulos cohesivos:
  - `configManager.ts` (load/save/backup)
  - `windowManager.ts` (creación de BrowserWindow + persistencia de bounds)
  - `trayManager.ts` (tray icon + global shortcuts + tray menu)
  - `electron/main/ipc/` (10 módulos por dominio: audio, media, macro, config, window, app, page, dialog, launcher, rgb, sensors)
- **Refactor SRP de `TitleBar.tsx`**: 748 → 430 líneas. `RGBSection` y `SensorsSection` extraídas a `src/components/settings/`.
- **Refactor SRP de `EditorB.tsx`**: arrays de datos (ACTION_TYPES, PRESETS, FOLDER_PRESETS, PRESET_CATEGORIES) movidos a `src/screens/editor/actionData.ts`.
- **Installer limpio**: `App.tsx` `PAGES_DEFAULT` reducido a 1 página vacía "Main" para que la app abra como instalación virgen sin presets precargados.
- **`.gitignore`**: excluye `resources/lhm/` (19MB de binarios bundleados de LibreHardwareMonitor).
- **`package.json`**: agrega `asarUnpack` para `node_modules/uiohook-napi/**` (binario nativo no puede ir dentro del asar).

### Internal
- Nueva dependencia: `uiohook-napi@^1.5.5` (NAPI estable, no requiere rebuild para Electron 33).
- `ButtonCell.tsx`: añadidos props `isSelected` y `onSelect` con check verde overlay; comparator de memo actualizado.
- `MainB.tsx`: estado `selectedIds: Set<string>`; se limpia al cambiar de página.

---

## [0.2.0] — 2026-04-30

### Added
- Registro automático de URL ACL para LibreHardwareMonitor (1 sola UAC).
- UI scale, temas claro/oscuro/sistema, widget buttons (clock/weather/now-playing/sensor), visibilidad condicional, swipe entre páginas, page export/import, timer triggers, execution feedback.
- Window snap, RGB presets, radio groups, soporte touch screen.

### Fixed
- Fullscreen: respeta `gridRows` correctamente.
- Toggle de widget de sensores funciona en sidebar y FullscreenB.
- Audio device fallback cuando COM call falla.
