# Changelog

Todos los cambios notables de VirtualDeck se documentan acá.
Sigue el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [SemVer](https://semver.org/lang/es/).

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
