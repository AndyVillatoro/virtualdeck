# VirtualDeck — Notas para Claude

Stream Deck alternativo para Windows. Electron + React + TypeScript + Vite.

## 📚 Documentos relacionados (leer antes de empezar)

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Workflow de desarrollo: branches, commits, PRs, release, firma/distribución, recetas y notas para LLMs. (Absorbió RELEASE/desarrollo/firma-y-distribución.)
- **[CHANGELOG.md](CHANGELOG.md)** — Historial cronológico de versiones (Keep a Changelog).
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** — Mapa SRP: cada módulo/clase/feature con su responsabilidad única. Índice maestro del trabajo.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — Secuencia 1/N (+ catálogo de ideas, ex-SUGERENCIAS): mejoramos **un apartado por sesión**, con ritual de verificar→mejorar→documentar→marcar. Empezar cada sesión eligiendo el próximo ítem ⬜.
- **[docs/wiki/](docs/wiki/)** — Staging del wiki público (bilingüe ES/EN) al que apunta el botón Documentación. Ver `docs/wiki/README.md` para publicar.
- **package.json** → campo `version`: source of truth de la versión actual.

**Antes y después de cualquier cambio**: corré `npm run check` (tsc + arquitectura + eslint). Cero **errores** antes y después (los *warnings* de eslint son señal de deuda SRP, no bloquean — ver Bloque B del roadmap). Tooling: `npm run lint:acciones` (cobertura de tipos de acción), `npm run lint:arch` (dependency-cruiser, límites de capas SRP), `npm run lint` (eslint), `npm run lint:dead` (knip, código muerto). `scripts/check-ipc.mjs` cruza los 85 canales IPC del proceso principal contra el puente del preload: los dos lados son cadenas sueltas, así que un renombrado en uno solo revienta en la máquina del usuario, y solo al pulsar justo eso.

## Stack
- **Electron 33** (main: `electron/main/index.ts`, preload: `electron/preload/index.ts`)
- **React 18 + Vite 5** (renderer en `src/`)
- **electron-vite** como builder, **electron-builder** para empaquetado
- **openrgb-sdk** para integración RGB

## Estructura clave
- `build/` — app icon (`icon.ico`, `icon.png`, `icon.svg`) generado por `scripts/generate-icon.js`
- `scripts/generate-icon.js` — renderiza icono dot-matrix SVG → PNG → ICO (requiere `sharp`)
- `src/screens/` — pantallas: `MainB`, `EditorB`, `FullscreenB`, `RGBManagerB`, `WallpaperB`
- `src/screens/fullscreen/` — `PinKiosko` (el PIN que bloquea la salida del modo kiosko,
  con su estado y su comprobación) y `SonandoAhora` (la franja de reproducción de abajo).
- `src/screens/rgb/piezas.tsx` — las piezas del gestor RGB: insignia de estado, detalle de
  dispositivo, pintor LED a LED, guardar perfil, calibrador de zonas y estilos compartidos.
  `RGBManagerB` se queda con el estado y la conexión.
- `src/screens/main/` — piezas de la principal: `BarraLateral` (reloj, clima, sensores, RGB,
  registro y música), `PestanasPagina` (cambiar, renombrar, reordenar y recibir botones
  arrastrados), `OverlayCarpeta` y `formatos.ts` (reloj y fecha, en el idioma elegido)
- `src/screens/editor/` — el editor por partes: `PasoAccion` (elegir qué hace),
  `valoresIniciales.ts` (de qué botón guardado salen los campos del formulario — ahí viven
  todos los `?? ''`, que eran la mitad de la complejidad de `EditorB`),
  `PasoConfigurar` (los apartados comunes: toggle, mantener pulsado, disparadores),
  `formularios/` (**un componente por tipo de acción en un mapa `FORMULARIOS`** — añadir un tipo
  es añadir una entrada, no tocar una cadena de condiciones; repartidos por familia: `basicos`,
  `sistema`, `datos`, `rgb`, `compuestos`), `PasoEstilo` (etiqueta,
  iconos, colores, widget y disparadores), `guardar.ts` (arma el botón a guardar, función pura),
  `actionData.ts` deriva `PRESET_CATEGORIES` **de los propios presets**: escrita a mano faltaba
  'RGB', y sus doce botones sembrados no salían por ninguna pestaña — solo buscándolos.
  `comunes.tsx` (`Field`, `Btn`, los sub-selectores
  y las funciones de estilo que comparten los pasos), `actionData.ts` (datos puros) y `MacroEditor.tsx`.
  `EditorB.tsx` se queda con el estado y el armado de la pantalla.
- `src/components/ButtonCell.tsx` — celda de botón: estructura, gestos y estado (~370 líneas)
- `src/components/rejilla/RejillaBotones.tsx` — la rejilla de botones, compartida por
  `MainB` y `FullscreenB`. Encaja las casillas en el hueco (`square` = casillas cuadradas,
  `fill` = ocupar todo) y las coloca; **cada pantalla arma su propia celda** vía la prop
  `celda`, porque la principal pasa veinte props y kiosko seis. El calculo del encaje
  descuenta el relleno (`clientWidth` lo incluye) y los huecos entre casillas: sin eso las
  casillas del modo `square` no salian cuadradas y en `fill` la ultima fila se recortaba.
- `src/utils/useDisparadores.ts` — los botones que se disparan solos (a una hora, o por
  umbral de un sensor). Los llama `App`, que está montada siempre: dentro de `MainB`
  **dejaban de sonar en kiosko**, y el programado además solo miraba la página abierta.
- `src/utils/estadoSistema.ts` — el sondeo de 5 s (salida de audio por defecto, procesos
  corriendo, estado RGB) y las dos funciones que lo leen: `botonActivo` y `botonVisible`.
  Estaba dentro de `MainB` y **kiosko no lo tenía**: la visibilidad condicional se ignoraba
  y el marcador de activo no se pintaba. Las dos pantallas se turnan en la misma ventana,
  así que compartirlo no duplica el sondeo.
- `src/utils/formatos.ts` — reloj, fecha y día en el idioma elegido, cacheados por idioma.
  Vivía bajo `screens/main/`, y el limitador de capas no dejaba que un componente lo usara.
- `src/components/celda/useDatosWidget.ts` — lo que muestra cada widget (reloj, clima,
  reproducción, sensor, variable), compartido por las dos pantallas. Estaba dentro de `MainB`
  y **kiosko no lo tenía**: un botón con widget mostraba el icono de la acción en pantalla
  completa. Incluye `useClimaWidget`, el sondeo del clima.
- `src/components/celda/` — las piezas de la celda: `colores.ts` (prioridad de fondo y borde),
  `ContenidoCentral` (widget o icono, con sus cuatro formas), `Insignias` (las marcas de las esquinas),
  `MenuContextual`, y los dos hermanos del gesto: `usePulsacionTactil` (dedo) y
  `usePulsacionRaton` (ratón). El destello y el sonido salen **solo** de
  `destellar()`, dentro del hook de ratón; estaban copiados en tres sitios que leían
  las props en vez de las referencias, y el comparador del `memo` ignora esas props.
- **Los botones se emparejan con los huecos POR POSICIÓN, nunca por id**
  (`conHuecosCompletos` en `configDefaults.ts`). Al cargar se hacía por id, dando por hecho
  que el id de un botón es `${página}-${hueco}`, y hay cuatro caminos donde no lo es:
  `addPage` y `setPageGridSize` acuñan `p<timestamp>_<hueco>`, la importación de una página
  también, y **borrar una página renumera `b.page` pero no los ids**. En los cuatro el `find`
  fallaba y devolvía el hueco vacío: los botones seguían en el archivo y desaparecían de la
  pantalla al reiniciar. Medido con dos páginas en el mismo arranque — la de ids canónicos
  conservó sus cuatro etiquetas, la creada con «+» ninguna. Mientras borrar una página
  renumere sin renumerar ids, **el id no puede codificar la posición**.
- `src/utils/useDeck.ts` — la configuración del deck y las 25 operaciones que la cambian
  (botones, páginas, perfiles, ajustes), con el historial de deshacer. `App` se queda con la
  vista y los avisos. `src/utils/configDefaults.ts` — la configuración de una instalación nueva.
- `src/utils/pulsarBoton.ts` — **lo que pasa al pulsar un botón, en un solo sitio**. Estaba
  escrito tres veces (principal, kiosko, disparador automático de `App`) y las tres habían
  divergido: el grupo radio y el tope de 60 s solo en la principal, el gancho de scripts —y con
  él «guardar la salida en una variable» y «mostrar la salida»— en ninguna de las automáticas,
  y los errores de una acción disparada sola no se enseñaban en ninguna parte. Cada llamador se
  queda con lo suyo: el indicador de «ejecutando», el registro lateral y el sonido.
  **`toggledIds` entra como función, no como `Set`**: `ButtonCell` está memoizado con un
  comparador que ignora los manejadores, así que una celda solo recibe uno nuevo cuando cambia
  algo suyo (incluido su propio `toggled`). La celda que se pulsa conserva el manejador de su
  primer render, con un `toggledIds` vacío — y por eso el grupo radio no funcionaba con el
  ratón en ninguna pantalla, aunque la acción de apagar sí (esa celda ya había cambiado lo
  suyo). Cualquier cosa que un manejador de celda lea del estado del padre tiene el mismo
  problema: va por referencia.
- `src/utils/actions.ts` — despachador de acciones y runner de secuencias (~200 líneas)
- `adjust` (en `acciones/audio.ts`) sube o baja brillo/volumen **desde donde estén**, en vez
  de fijar un número. Para eso hay que leer primero: el núcleo nativo ya declaraba
  `getBrightness`/`getVolume` pero solo había camino para escribir. Un monitor externo no
  suele exponer el brillo, así que la lectura puede devolver `null` y se avisa.
- `src/utils/acciones/` — una familia por archivo: `lanzar`, `audio`, `media`, `entrada`, `datos`, `rgb`.
  `index.ts` arma el mapa `MANEJADORES` y declara `RESUELTAS_POR_EL_LLAMADOR` (los tipos que
  resuelve `runActionSequence`: script, folder, branch, countdown). **No hay `default: return OK`**:
  un tipo sin manejador devuelve error, y `scripts/check-acciones.mjs` lo detecta antes de ejecutar. El mismo script comprueba que **cada tipo tenga formulario** en el editor: `media-shuffle`, `media-repeat` y `rgb-preset` estaban en el selector sin entrada en `FORMULARIOS`, y el paso 2 salía en blanco aunque el botón funcionase al pulsarlo.
- `src/utils/nowPlaying.tsx` — hook que consulta media session via PowerShell
- `electron/main/audio.ts` — control de dispositivos de audio (PowerShell + C# IPolicyConfig)
- `electron/main/media.ts` — info de reproducción actual + shuffle/repeat via SMTC
- `electron/main/macro.ts` — grabación de macros (uiohook-napi) + reproducción via PowerShell
- `electron/main/rgb.ts` — control RGB vía OpenRGB SDK. `SMART_PRESETS` son 18 presets que
  se apoyan **solo en modos que el dispositivo ya sabe hacer**: no hay motor de animación,
  VirtualDeck no manda fotogramas. Cada uno lleva color, una lista de modos a intentar (de
  lo específico a lo genérico, acabando siempre en `static`/`direct`) y opcionalmente
  brillo y velocidad. `scripts/check-acciones.mjs` cruza esa lista con
  `src/data/rgbPresets.ts`: si se separan, el botón no haría nada y no habría error
- `electron/main/launcher.ts` — ejecutar apps/scripts
- `electron/main/configManager.ts` — carga/guardado/backup de configuración (SRP)
- `electron/main/windowManager.ts` — creación y estado de ventanas (SRP)
- `electron/main/trayManager.ts` — tray icon, menú contextual, hotkeys globales (SRP)
- `electron/main/ipc/` — handlers IPC organizados por dominio (audio, media, macro, config, etc.)
- `electron/main/divisas.ts` — las tasas de cambio del widget de divisas. Va en el proceso
  principal por lo mismo que la descarga de perfiles: la CSP del renderer solo deja
  conectar con `self` y los dos servicios del clima. Fuente `open.er-api.com` (gratis, sin
  clave, 166 monedas incluido el lempira, una actualización al día). La respuesta dice
  cuándo toca la siguiente, así que no hay intervalo inventado; se cachea en `userData` y
  con eso se sigue enseñando la tasa de ayer sin conexión.
- `electron/main/idioma.ts` — el puñado de textos que enseña el **proceso principal**
  (menú de la bandeja, títulos de los diálogos de archivo, los errores que devuelve al
  renderer). No puede usar el i18n de `src/`: son dos procesos. Estaba todo fijo en
  español y la auditoría no lo veía, porque solo miraba `src/`. `fijarIdioma()` se llama
  al arrancar y al guardar la configuración, antes de reconstruir la bandeja.
- `electron/main/index.ts` — slim bootstrap (~95 líneas); importa los módulos anteriores
- `src/components/settings/` — `PanelAjustes` (el desplegable entero de la rueda dentada)
  y sus secciones: `RGBSection`, `SensorsSection`, `settingHelpers`. `TitleBar` se queda con
  la barra en sí (~250 líneas).

## Scripts
- `npm run dev` — desarrollo (electron-vite)
- `npm run build` — compila renderer + main + preload
- `npm run build:win` — empaquetar Windows (solo `--dir`, sin instalador)
- `npm run build:icon` — regenerar `build/icon.{ico,png,svg}` desde `scripts/generate-icon.js`
- `npm run build:installer` — compilar + generar NSIS installer (`dist/VirtualDeck-Setup-{version}.exe`)

## Convenciones
- Estilos inline con tema desde `src/utils/theme.tsx` (`useTheme()` → `VD`)
- Iconos: lucide-react via `src/components/VDIcon.tsx`, fuentes brand en `src/data/brandIcons.ts`
- Persistencia de config en `userData` (Electron) como JSON UTF-8
- Estilo: respuestas cortas y directas; preguntar si no se sabe; dar opciones cuando aplique

## Notas técnicas
- **Codificacion de PowerShell — dos problemas distintos, y el aviso viejo era falso.**
  El prefijo `chcp 65001` + `$OutputEncoding` + `[Console]::OutputEncoding` arregla la
  **salida**. La **entrada** —el texto no ASCII dentro del propio script— es otra cosa:
  PowerShell 5.1 lee un `.ps1` sin BOM en la pagina de codigos ANSI, no en UTF-8. Medido:
  `Hola, ¿qué hora es?` salia `Hola, Â¿quÃ© hora es?`. Por eso `runPS` escribe el temporal
  **con BOM**. La nota que decia «no usar BOM — rompe el parsing de PS» se comprobo y no se
  sostiene: un `param(...)` con BOM delante se sigue reconociendo, y los scripts de audio y
  SMTC dan el mismo resultado con y sin el.
  Ademas, el camino **nativo** (`vd-core`, `powershell -Command`) no inyectaba el prefijo y
  leia la salida con `from_utf8_lossy`: cada acento volvia como caracter de reemplazo, y eso
  afectaba a la accion «script» que guarda la salida en una variable. El arreglo de raiz esta
  en `crates/vd-core` (que no se puede recompilar); mientras tanto `conUtf8()` en `launcher.ts`
  inyecta el prefijo **antes** de elegir camino, asi que lo arregla con el `.node` que ya hay.
  `injectUtf8Prefix` es idempotente para que no se aplique dos veces.
- **Notificaciones y AppUserModelId**: `app.setAppUserModelId('com.virtualdeck.app')` se llama
  al arrancar y **tiene que coincidir con `build.appId` de `package.json`**, que es el que el
  instalador NSIS graba en el acceso directo del menu de inicio; Windows solo muestra el nombre
  y el icono de la aplicacion si los dos cuadran. Electron lo pone solo con Squirrel, no con
  NSIS: sin la llamada las notificaciones quedaban registradas como `electron.app.Electron`
  (visible en `HKCU\...\CurrentVersion\Notifications\Settings`, que es el sitio donde se puede
  comprobar si Windows acepto una notificacion — buscar el toast en pantalla no sirve, un toast
  de control nativo tampoco aparece si hay un video a pantalla completa). `scripts/check-ipc.mjs`
  cruza las dos cadenas.
- `IPolicyConfig` COM: IID correcto es `F8679F50-850A-41CF-9C72-430F290290C8` (no confundir con CLSID `870AF99C-...`). El orden de métodos en la interfaz debe coincidir con la vtable real.
- Widget `now-playing` no se aplica a botones de tipo `audio-device`: el editor deshabilita
  esa combinación (`PasoEstilo`) y `useDatosWidget` la descarta también.
- `media.ts` re-consulta ventanas activas en cada ciclo cuando SMTC falla, para reflejar cambios de pestaña/video.
- **SMTC await (NO tocar)**: el `Await-Op` del PREAMBLE de `media.ts` convierte el `IAsyncOperation` de WinRT a un `Task` de .NET vía `System.Runtime.WindowsRuntime` + reflection (`AsTask`), pasando el tipo de resultado explícito. **NO** volver al polling de `$op.Status`: en PowerShell 5.1 stock esa propiedad no se proyecta (queda vacía), el await devuelve siempre `$null`, el manager sale `null` y el widget de música deja de mostrar nada. Verificado en vivo (polling → manager null, AsTask → OK). Los alias de tipo (`$TMgr`, `$TProps`, `$TStream`) usan el loader WinRT completo `,Namespace,ContentType=WindowsRuntime` para resolver sin depender del orden de carga del winmd. El thumbnail (`OpenReadAsync`) devuelve `IAsyncOperationWithProgress`, por eso se le pasa también `$progressType` (`[UInt64]`).
- **`media.diagnose` va por PowerShell a propósito (NO tocar sin leer esto).** El diagnóstico
  recorre *todas* las sesiones SMTC, no solo la activa. Basta con que una aplicación haya dejado
  una sesión a medio cerrar —Windows la sigue listando pero ya no contesta— para que su
  `TryGetMediaPropertiesAsync` no termine nunca. Como la llamada nativa es síncrona vista desde
  fuera, eso **congela el proceso principal de Electron entero**: ni un `Promise.race` con
  temporizador llega a dispararse, porque el bucle de eventos está parado. PowerShell tarda
  ~500 ms pero corre en otro proceso.
  El arreglo de raíz ya está escrito en `vd-core` (`en_hilo_mta_con_limite`, que espera por canal
  con `recv_timeout` y se rinde a los 5 s) pero **el `.node` no se ha podido recompilar**: una
  directiva de Control de aplicaciones de Windows bloquea los proc-macro recién compilados
  (`darling_macro-*.dll`, os error 4551). Cuando se pueda compilar, `diagnose()` puede volver a
  `intentarNativo`.
- **Audio cache**: `audioIpc.ts` cachea la lista de dispositivos 30 s. Invalida automáticamente al cambiar dispositivo default. Pasar `force=true` para forzar refresco.
- **Multi-select**: Ctrl+clic en celdas para seleccionar múltiples botones. La barra de bulk-ops flota sobre la grilla. `selectedIds` se limpia al cambiar de página.
- **Shuffle/repeat SMTC**: usan `TryChangeShuffleActiveAsync` / `TryChangeAutoRepeatModeAsync` de Windows.Media.Control. Requieren que haya una sesión SMTC activa.
- **Macro**: grabación global via `uiohook-napi` (N-API — no requiere rebuild para Electron 33).
  Reproducción por `vd-core` (SendInput), con un script PowerShell de respaldo. El `.node` va
  fuera del asar (`asarUnpack`). **El mapa de teclas se deriva de `UiohookKey`, no se escribe**:
  uiohook entrega *scancodes* (`A` = 0x1E), no los códigos virtuales de Windows (`A` = 0x41), y
  el mapa escrito a mano suponía lo segundo — grabar `abc1 Ctrl+C Alt+Tab F5 Enter` daba
  `0 {DELETE} {DELETE} 8`. Los modificadores salen de `e.ctrlKey/altKey/shiftKey/metaKey` del
  propio evento; sin ellos `Ctrl+C` se grababa como `c`. El formato en disco es `Ctrl+C` /
  `{ENTER}`, que es lo que parsea `crates/vd-core/src/macros/keys.rs` y lo que se escribe a mano
  en el editor. `escapeSendKeys` (solo el respaldo) **no toca los tramos ya entre llaves**: al
  aplicarse sobre la cadena entera convertía `{ENTER}` en `{{ENTER}}`. Y los clics sobre la
  propia ventana no se graban (`esNuestro` en `startRecording`): si no, toda macro acaba con un
  clic en el botón de detener.
- **Accent presets**: `ACCENT_PRESETS` en `design.ts` — 10 colores predefinidos. El color libre via `<input type="color">` sigue disponible.
- **Tema claro/oscuro/sistema**: `ThemeProvider` en `src/utils/theme.tsx`. Selector en TitleBar → ⚙ → TEMA. **El color siempre sale de `useTheme()`**; importar la paleta `VD` de `design` la congela en oscuro y el fallo no se ve ni en `tsc` ni en el build — solo en pantalla, y solo si alguien prueba el tema claro en esa pantalla. Por eso hay una regla `no-restricted-imports` en `eslint.config.mjs` que lo prohíbe en todo `src/` salvo `theme.tsx`.
  Los estilos que antes eran constantes de módulo (`inputStyle`, `btnPrimary`, `inputStyleSettings`…) son ahora funciones `estilo*(VD)`, y cada componente se hace un alias local con el mismo nombre — así los ~100 usos siguen escritos igual.
  `App` *renderiza* el proveedor, así que su propio cuerpo queda fuera del contexto: cualquier JSX a nivel de `App` que necesite color va en un componente hijo (`PantallaCargando`, `AvisoDeshacer`, `AvisoError`, `UpdateBanner`).
- **i18n (ES/EN)**: `src/utils/i18n.tsx` (75 líneas: proveedor, `makeT` y los hooks) + `src/utils/idiomas/` (`es.ts`, `en.ts`, `campos.ts` — los tres diccionarios, que son datos y llegaban a hacer de `i18n.tsx` un archivo de 1135 líneas). `LanguageProvider` (envuelve todo en `App`, es el provider más externo) + `useT()` + diccionarios `es`/`en` con claves planas estables (no el texto). `t(key, vars?)` interpola `{var}` y cae a `es` y luego a la clave. `config.language` ('system'|'es'|'en'); 'system' detecta `navigator.language`. **Importante**: como `App` *renderiza* el provider, su propio cuerpo queda fuera del contexto — cualquier JSX a nivel de `App` que necesite `t()` debe extraerse a un componente hijo (ej. `UpdateBanner`). Cobertura: al día de hoy no queda texto que la auditoría detecte, que no es lo mismo que "todo traducido" — la cuarta comprobación es heurística. Hay dos mecanismos: `t('clave')` con claves estables para textos de la app, y `tf('Texto en español')` (`useFieldText`) para las etiquetas del editor, que usa el propio español como clave contra `FIELDS_EN`. **Los dos fallan en silencio**: `t` cae a la clave literal y `tf` cae al español, así que un texto sin traducir se ve igual que uno traducido a medias. Por eso `npm run check` corre `scripts/check-i18n.mjs`, con cinco comprobaciones: claves duplicadas, ES↔EN desparejadas, todo `t()`/`tf()` literal sin entrada, y —la cuarta, la que faltaba— **texto visible en español que nunca se envolvió**. Las tres primeras solo miran lo que ya pasó por `t()`: con ellas en verde quedaban ~55 textos sin traducir (los errores de `utils/actions.ts`, los ajustes, los menús de página), y los encontró el usuario, no el build. La cuarta es heurística y mira tres sitios: atributos (`title`, `placeholder`…), texto entre etiquetas en la misma línea, y **texto que ocupa su propia línea** — este último se añadió después, porque sin él se colaron otros 20 (los avisos del editor, el grabador de macros, el editor de iconos) con la auditoría en verde. Marca lo que tenga acentos españoles, dos palabras funcionales, o una palabra inequívoca en frases cortas. Lo que no sea idioma va a `PERMITIDOS`, que debe seguir siendo corta. Los literales que no son idioma (rutas, atajos, hex, URLs) van **sin** `tf()`. **La quinta** mira los literales de cadena dentro de expresiones: los ternarios (`x ? 'CUADRADAS' : 'LLENAR ÁREA'`), los `??` y los mapas de objeto. Ninguna de las cuatro anteriores los veía —no son atributos ni texto entre etiquetas— y por ahí quedaban 45 textos visibles con la auditoría en verde: los avisos y botones de sensores y RGB, los modos de casilla, el PIN de kiosko, los controles de música, el grabador de macros y los errores de acción. Al principio se saltaba **todos** los `.ts`, y por ahí se colaron 14 textos vivos más (los rótulos de deshacer de `useDeck`, los errores de importación de `configMigration`, los perfiles de sonido, la plantilla del reporte de fallos). Ahora se salta solo `actionData.ts` y `brandIcons.ts` por nombre: eso son datos sembrados que se **copian dentro** del botón que crea el usuario, y traducirlos en caliente le cambiaría etiquetas ya guardadas. Los dos módulos puros que ahora traducen (`configMigration`, `bugReport`) **reciben `t` como parámetro**: no son componentes y no pueden llamar a `useT()`.
  Aun con las cinco en verde, la app en inglés todavía enseñó cuatro textos más (`Rango: 75%…`, `PROBAR`, el aviso de LHM, el pie del editor): sin acentos y sin dos palabras funcionales, la heurística los daba por buenos. **Mirar la aplicación en inglés sigue encontrando lo que el script no.**
- **Onboarding + hints**: `Onboarding.tsx` (la carcasa: título, cuerpo, puntos y navegación) +
  `src/components/onboarding/pasos.tsx` (los tres pasos con controles: idioma, tema+acento y
  exportar/importar). Siete pasos; `CONTROLES` es un mapa por número de paso, así que añadir
  uno interactivo es añadir una entrada. Se dispara si `config.onboardingCompleted !== true`;
  repetible vía Ayuda → Acerca de. **Ojo con la migración**: `loadConfig` devuelve `{}` cuando
  no hay archivo, y eso entra en la cadena de migración como si fuera un config de v1 — con
  `onboardingCompleted: c.onboardingCompleted ?? true` el paso v3→v4 marcaba el tutorial como
  visto **antes de enseñarlo**, y no salió nunca desde que existe. La condición correcta es
  «tiene botones guardados». `Hint.tsx` (mensaje flotante contextual descartable; usa `config.hintsDismissed` para no repetirse). Ambos i18n.
- **PowerShell `param()`**: `runPS` (en `ps-helpers.ts`) detecta si el script empieza con `param(...)` y, en ese caso, inserta el prefix UTF-8 DESPUÉS del bloque param. PowerShell exige que `param()` sea la primera sentencia del script — meterle `chcp 65001` arriba lo rompe silenciosamente. Si modificás `runPS`, mantené ese parser.
- **Barra de tareas y bandeja (NO volver a tocar sin leer esto)**: la ventana lleva
  `skipTaskbar: true` **siempre**. VirtualDeck vive en la bandeja y su icono en la barra de
  tareas es un duplicado. Una vez se cambió a «solo mientras se ve» por miedo a que una
  ventana sin marco no se pudiera recuperar; no es cierto — Alt+Tab la lista, el clic en el
  icono de la bandeja la trae y el menú tiene «Mostrar». Se midió enumerando los botones
  reales de la barra por UI Automation, que es la única forma: en Windows `skipTaskbar` no
  se refleja en los bits de estilo de la ventana (`WS_EX_APPWINDOW`/`TOOLWINDOW`), Electron
  usa `ITaskbarList::DeleteTab`. El arranque con la sesión se registra con `--oculto`
  (`fijarArranqueAutomatico` en `ipc/appIpc.ts`) y con esa marca la ventana se crea con
  `show: false`: el renderer carga igual —de eso dependen los disparadores programados— pero
  no se enseña. Quien ya tenía el inicio automático puesto lo tiene registrado sin la marca,
  así que se reescribe en cada arranque.
- **Audio device switching**: `audio.ts` chequea HRESULT por cada `SetDefaultEndpoint` (3 roles: Console/Multimedia/Communications). Si `IPolicyConfig` falla con `E_NOINTERFACE`, prueba `IPolicyConfigVista` (IID `568b9108-44bf-40b4-9006-86afe5b5a620`). Después de setear, vuelve a consultar `GetDefaultAudioEndpoint` para verificar que el cambio se aplicó (algunos drivers aceptan la llamada sin aplicarla). Logs en `console.error` con prefix `[audio]`.

## 🔬 Sondas en el proceso principal: `require` no sirve

electron-vite empaqueta todo el proceso principal en **un solo `out/main/index.js`**,
así que dentro de una sonda temporal `require('./rgb')` o `require('./floatingBar')`
falla: en tiempo de ejecución esos módulos no existen como archivos. La sonda no
imprime nada y parece que el código no se ejecuta — dos veces se dio por «no medible»
un arreglo que sí lo era.

Lo que funciona es usar el módulo **ya importado arriba** (`import * as rgb`), o añadir
el import que haga falta en el propio `index.ts` mientras dure la sonda. `require('electron')`
sí funciona, porque es un módulo externo de verdad.

## ⏱️ Arranque: desarrollo y producción no se parecen

Medido con `VD_DIAG=1` (la línea `[arranque] ventana visible a los N ms`):

| Cómo se ejecuta | Tiempo hasta ver algo |
|---|---|
| `npx electron .` sobre `out/` — lo mismo que instala el usuario | **~240 ms** |
| `npm run dev` (electron-vite) | **~49 s** |

Los 49 s son **solo de desarrollo**, y son reproducibles. Ya se descartaron, con
medición y no por deducción: la resolución de `localhost` (127.0.0.1 tarda igual),
el plugin de CSP de desarrollo, las DevTools, el proxy de Chromium
(`no-proxy-server`), la velocidad de disco (3000 archivos de `node_modules` en
483 ms) y esbuild (empaqueta `src` + React entero en 55 ms). El servidor sirve
cada módulo en menos de 1 ms: el tiempo se va en huecos de 10–20 s **entre
oleadas de peticiones**, o sea del lado del renderer. Causa no encontrada.

Antes de "optimizar el arranque", mirá cuál de los dos se está midiendo: si el
reporte sale de `npm run dev`, la aplicación empaquetada no tiene ese problema.

## ⚡ Workflow rápido (cheatsheet)

### Verificar antes de cualquier cambio
```bash
git status           # debe estar limpio o tener cambios coherentes
npx tsc --noEmit     # cero errores
```

### Ciclo de feature
```bash
git checkout -b feat/algo
# ...editar...
npx tsc --noEmit
git add <files-específicos>      # nunca git add -A sin revisar
git commit -m "feat: descripción corta en imperativo"
git push -u origin feat/algo
gh pr create                     # con --title y --body apropiados
```

### Release nuevo
Ver **[CONTRIBUTING.md](CONTRIBUTING.md)** (sección Release). Resumen:
1. Editar `package.json` → bump version (semver: feat=MINOR, fix=PATCH, breaking=MAJOR).
2. `npm install --package-lock-only`.
3. Agregar entrada al **inicio** de `CHANGELOG.md` con fecha ISO.
4. Commit `chore(release): bump X -> Y`.
5. Tag `vX.Y.Z` y push.
6. `npm run build:installer`.
7. `gh release create vX.Y.Z dist/VirtualDeck-Setup-X.Y.Z.exe`.

### Si algo se rompe en runtime
- Audio: console.error con prefix `[audio]` (DevTools del main process).
- Media SMTC: `media:diagnose` IPC devuelve estado paso por paso.
- Sensores: el botón "?" en el sidebar muestra el HTTP probe de LHM.
- PowerShell scripts: si `param()` no se reconoce, el prefix UTF-8 está mal ubicado — `injectUtf8Prefix` en `ps-helpers.ts`.
