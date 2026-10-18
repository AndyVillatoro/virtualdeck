# Handoff entre modelos (OpenCode / VirtualDeck)

Registro de traspaso exigido por `CLAUDE.md` (protocolo, canal 2). Cada turno actualiza este archivo.

Turnos anteriores archivados en [`docs/archivo/HANDOFF-hasta-2026-10-05.md`](archivo/HANDOFF-hasta-2026-10-05.md) y [`docs/archivo/HANDOFF-hasta-2026-10-09.md`](archivo/HANDOFF-hasta-2026-10-09.md).

## Turno 2026-10-10 (T-DEU-02) — Partir `rgb.ts`, `useEstadoEditor.ts` y `PanelInspectorControl.tsx` por responsabilidad

* **Quién:** opencode `space-bunny-free`. **Rama:** `main`, sin commit (lo pide el encargo).
* **Encargo:** `_referencias/encargos/T-DEU-02-partir-rgb-editor.md`. Tres archivos de más de 600 líneas partidos **sin cambiar comportamiento**: código movido tal cual, verificado línea por línea contra el original.

### 1. `electron/main/rgb.ts` (724) → `electron/main/rgb/` (fichero borrado, fachada en `rgb/index.ts`)

| Módulo | Qué lleva | Líneas |
|---|---|---|
| `estado.ts` | **Único** dueño del estado (cliente, proceso del servidor, host/puerto, caché, temporizador de reconexión) | 28 |
| `conexion.ts` | ciclo de vida, reconexión, `refreshDevices`, `status`/`connect`/`disconnect` | 112 |
| `servidor.ts` | `spawnServer`/`killServer` | 28 |
| `dispositivos.ts` | `listDevices`, `rescanDevices`, `resizeZone` | 52 |
| `aplicar.ts` | colores, modos y LEDs (`setDeviceColor`, `setMode`…) | 219 |
| `perfil.ts` | perfiles guardados | 71 |
| `presets.ts` | `SMART_PRESETS`, `listaPresets`, `applySmartPreset` | 117 |
| `color.ts` | puros: hex↔rgb, `deviceToInfo`, `aplicarBrilloYVelocidad` | 105 |
| `tipos.ts` | tipos espejo de `src/types.ts` | 31 |

* **Los imports externos no cambian:** `import * as rgb from './rgb'` (y `'../rgb'`) resuelven al `index.ts` de la carpeta, igual que ya hacían con `./ipc`. La API pública es la misma función por función; los tipos (`RGBStatus`, `RGBDeviceInfo`, `RGBProfile`) viven ahora en `./tipos`, que es donde los importa cada módulo.
* `aplicarBrilloYVelocidad` se movió a `color.ts` (no a `presets.ts`) para no crear el ciclo `presets → aplicar → presets`: `applySmartPreset` necesita `setDeviceColor`, y `setMode` necesita el traductor de brillo/velocidad.
* `scripts/check-acciones.mjs`: una línea, `PRESETS_MAIN` pasa a `electron/main/rgb/presets.ts` (el guardián leía la ruta del fichero para cruzar los presets con `src/data/rgbPresets.ts`).

### 2. `useEstadoEditor.ts` (635) → seis hooks por tema + cableado (306)

`useEstadoIcono` (242, con `iconoRef`, el catálogo, `pickImage` y el pegado), `useEstadoApariencia`, `useEstadoAccion`, `useEstadoWidget`, `useEstadoVisibilidad`, `useEstadoDisparadores`; en `useEstadoEditor.ts` quedan los modos 2×2, el acordeón, los presets y `handleSave`. `subButtonsIniciales` se extrajo a su propio fichero porque lo usan el hook del icono y el principal.

* **El objeto que devuelve el hook tiene las mismas 146 claves**, comprobado a nivel de tipos contra el original (y que no sobren ninguna).
* Los `useEffect` conservan sus arrays de dependencias. El de «audio-device no puede llevar *lo que suena*» vive ahora en `useEstadoWidget`, que recibe `tipoAccion`: sigue con `[tipoAccion, widget]` y el `setWidget` local evita el aviso de `exhaustive-deps` sin tocar las dependencias.
* Orden de hooks: todos sin condiciones; cambia entre bloques, no entre renders.

### 3. `PanelInspectorControl.tsx` (611) → componente (199) + subcomponentes

`tiposPanelInspector.ts` (los tipos, para no cerrar un ciclo con los helpers de texto), `textoPanelInspector.ts` (los cuatro helpers puros y `iconoFallback`), `PanelInspectorVacio.tsx`, `PreviaInspector.tsx` (`MiniPreview`), `PiezasInspector.tsx` (`FilaAccion`, `BotonEditar`, `SeccionModos`), `ListaHermanosPerilla.tsx` (el bloque de gestos hermanos). `PanelInspectorControl.tsx` reexporta `HermanoPerilla` y `PanelInspectorControlProps`, así que `PanelesLaterales.tsx` no cambia.

### Verificación

* `npm run check`: **0 errores**, 7/7 guardianes en verde (depcruise 459 módulos, eslint sin avisos).
* `npm run lint:dead`: sin huérfanos de estos archivos. Queda **un aviso ajeno**: el tipo `NowPlaying` sin usar en `electron/main/media.ts`, del agente que está partiendo `media.ts` ahora mismo.
* `npm run build`: correcto en 1,75 s.
* **Sin probar en la app**: no se ha abierto (el RGB necesitaría un servidor OpenRGB y el resto es puro reordenación). Todo lo demás está verificado por inspección y por el compilador.

### Avisos para quien siga

* El mapa de `CLAUDE.md` sigue diciendo `rgb.ts` en la lista del proceso principal: ahora es `rgb/`. No lo he tocado porque otro agente lo estaba editando a la vez.
* Durante este turno el sistema de ficheros dio varios `ENOENT` falsos y `PanelInspectorControl.tsx` volvió a HEAD una vez; la versión final está escrita y verificada (`npm run check` y `build` en verde **con** ella en disco). Conviene un `git diff --stat` antes de dar por buena la rama.

* **Quién:** Antigravity (orquestador). **Rama:** `main`, sin commit (lo pide el encargo).
* **Archivos tocados:** `companion-extension/content.js`, `companion-extension/background.js`, `companion-extension/offscreen.js`, `companion-extension/README.md`. Nada del lado Electron ni del renderer: el recorte se aplica aguas arriba y el protocolo VDCM no ha cambiado, así que `src/types/companion.ts` y `VideoVentana.tsx` se quedan como estaban.
* **Causa raíz:** el rectángulo del `<video>` llegaba por un canal lateral atado a `tabCapturada`, que se asigna al final de `iniciarCapturaTab` y vivía solo en memoria del service worker. Sin rect, `offscreen.js` dibujaba el fotograma entero.
* **Arreglos:** rect en fracciones del viewport (no px CSS), elección del `<video>` visible, refresco por `ResizeObserver`/`fullscreenchange`/`resize`/`scroll`, rectángulos por `tabId` con reenvío al offscreen y petición explícita si falta, y `tabCapturada` persistido en `chrome.storage.local` para sobrevivir al reinicio del service worker. De paso, la fuga de escuchadores duplicados en `registrarEventosMedia`.
* **Verificación:** `npm run check` 7/7 verde, `npm run lint:dead` sin huérfanos nuevos. **Sin verificar en navegador real** (aquí no se puede cargar la extensión).
* **Siguiente paso para el dueño:** recargar la extensión en `chrome://extensions`, recargar la pestaña de YouTube y comprobar el vídeo del panel en modo normal, teatro y pantalla completa.

## Turno 2026-10-10 (T-WID-02, T-VID-02, T-DOCK-03) — Widget de música responsivo, recorte de vídeo nítido y arranque limpio de Dock

* **Quién:** Antigravity (orquestador) + agentes Herdr (`wW`, `w11`, `w12`).
* **Rama:** `main`.
* **Encargos resueltos:**
  1. Redimensionamiento adaptativo del panel/widget de música (formato 16:9 amplio para vídeo/música, formato estándar equilibrado, y formato vertical en pila).
  2. Corrección geométrica del recorte de vídeo (contain centrado para evitar recortes excesivos).
  3. Eliminación de colisión del logotipo Mirabox de fábrica e introducción de animación de arranque VirtualDeck estilo dot-matrix.
  4. Delegación a subagentes Herdr (`wW` completó Fase 0 de drivers `T-DOCK-02`, `w11` verificó `T-NAV-01`, `w12` verificó `T-PERF-01`).

### Cambios realizados
- `src/screens/main/musica/ManejadorRedimension.tsx`: Tirador visual de borde con captura de puntero y acento activo.
- `src/types/config.ts`: Soporte de `ancho` persistente en `musicPanel`.
- `src/screens/main/PanelMusica.tsx`, `CuerpoVideo.tsx`, `CuerpoCaratula.tsx`: Desacoplamiento modular, complejidad < 18, soporte completo de las tres vistas adaptativas.
- `src/screens/main/musica/recorteVideo.ts`: Escala matemática uniforme `contain` con márgenes centrados.
- `electron/main/superficies/dispositivoMirabox.ts` & `animacionInicioDock.ts`: Comando de limpieza VRAM y animación de barrido radial con glifo VD.

### Verificación
- `npm run check` → 7/7 guardianes verdes (0 errores, 0 advertencias).
- `npm run lint:dead` → 0 tipos/exportaciones huérfanas en código fuente.
- `npm run build` → 1.72 s sin errores.

## Turno 2026-10-10 (T-PERF-01) — Verificación del diferido del catálogo de marcas: ya estaba hecho

* **Quién:** opencode `w12`.
* **Rama:** `main`. **Sin cambios de código** (solo `docs/ROADMAP.md`, este archivo y el tablero).
* **Encargo:** diferir `BrandIconPicker` con `React.lazy`/`dynamic import` (ítem 4.1 de ROADMAP).

### Lo que encontré

El encargo partía de una premisa caducada por dos hechos:

1. **`src/components/BrandIconPicker.tsx` no existe.** Se borró en `3b1a12d`
   (*«borrar el editor viejo por pasos»*); su función la/absorbió el selector unificado
   (`SelectorIconosDot` → `PanelCatalogoIcono`).
2. **El diferido ya estaba implementado** desde `9bbe70d` (*«lazy loading de marcas»*) y nunca se
   documentó como tal en el catálogo de ideas, que es lo que dejaba el ítem 4.1 sin marcar.

### Estado real (medido, no supuesto)

- La única ruta al catálogo es `src/utils/catalogoMarcas.ts`: `import('../data/brandIcons')` dentro
  de `precargarCatalogoMarcas()`, con `useCatalogoMarcas()` (reactivo, re-renderiza al llegar) e
  `iconoDeCatalogo()`. Un solo vuelo compartido aunque lo pidan varios a la vez.
- **En el build:** `assets/brandIcons-uzeqAVWS.js` = **29,40 kB**, chunk aparte. En
  `index-BUI5uMsp.js` la única mención es `import("./brandIcons-uzeqAVWS.js")` (dinámico) dentro del
  helper de preload; `index.html` solo carga el entry. **Nada lo arrastra al bundle inicial.**
- `src/comun/marcaSvg.ts` importa el catálogo de forma estática, pero solo lo usa `electron/main`
  (mando móvil) y `utils/superficies/pintarTeclaDibujo.ts`, que lo baja con `await import()`.
- El disparador real ya no es «abrir el selector» sino **«el botón tiene `brandIcon`»**:
  `celda/CapasDeFondo.tsx:38` hace `if (!button.brandIcon) return null;` **antes** de montar
  `BrandIconDisplay`, así que un deck sin marcas nunca baja el chunk.

### Verificación

- `npm run check` → **7/7 en verde**, 0 errores tsc, 0 violaciones depcruise.
- `npm run build` → correcto (1,86 s).
- `npm run lint:dead` (knip) → 0 archivos/exportes huérfanos en `src/`. Los 3 `devDependencies`
  sin usar (`@tabler/icons`, `simple-icons`, `rollup-plugin-visualizer`) son deuda previa, ajena a este turno.

### Cambio hecho

`docs/ROADMAP.md`: el ítem 4.1 del catálogo de ideas pasa a ✅ HECHO con la evidencia de arriba y
corrige la referencia al archivo borrado. El resto del catálogo ya lo tenía marcado en la fila P5
(«✅ 2026-09-15 (chunk `brandIcons` + `build-store.mjs`)»); era una incoherencia interna del
documento, no trabajo pendiente.

### Si alguien retoma esta línea

No hay nada que diferir. Lo único abierto y con retorno real es el **peso del resto**: el chunk
`indice-*.js` (424 kB) y `acciones-*.js` (332 kB) son los que empujan el aviso de chunks >500 kB
del build. Afecta a `utils/usoSelectorIconosDot.ts` y al mapa `MANEJADORES`, no al catálogo de marcas.

## Turno 2026-10-10 (cierre) — Correcciones tras prueba del dueño

* **Animación de inicio del dock: eliminada.** Se pintaba encima de los botones configurables (su último cuadro pisaba la página y la firma impedía repintar) y no puede sustituir el logo del firmware, que sale antes de que la app conecte. Se borró `animacionInicioDock.ts` y su llamada en `useSuperficies.ts`. Se conserva el comando `CLE` + refresco de `dispositivoMirabox.ts` al despertar la pantalla (limpia el logo de fábrica sin pintar nada propio).
* **Extensión, estado que alternaba «transmitiendo» / «capturar pestaña»:** `iniciarCapturaTab` ponía `tabCapturada` tras varios `await`, y cada metadato nuevo (autoStreaming) lanzaba otra captura que reiniciaba la anterior en el offscreen. Ahora hay `capturaEnCurso`, no se reinicia si ya se captura esa pestaña y la captura automática espera 5 s tras una parada. El popup refresca su estado cada segundo. **Sin verificar en navegador real: recargar la extensión y mirar si el botón deja de alternar.**
* T-MUS-01/02, T-SEN-01/02, T-EXT-01/02 hechos (ver ROADMAP 117–119).

## Turno 2026-10-10 (tarde) — Extensión estable, deuda técnica de tamaño y docs al día

* **Extensión «se desconecta»:** los manejadores `onclose`/`onerror` del socket de control no comprobaban cuál era el socket actual; el servidor cierra el anterior al llegar uno nuevo y ese cierre tardío tumbaba al nuevo (bucle). Ahora solo cuenta el socket vigente, y una alarma `vd-keepalive` (permiso `alarms`) despierta el worker MV3 y reconecta. **Recargar la extensión** (cambió el manifest). Sin verificar en navegador real.
* **T-DEU-01/02:** `launcher.ts`, `media.ts`, `rgb.ts`, `useEstadoEditor.ts` y `PanelInspectorControl.tsx` partidos por responsabilidad, sin cambios de comportamiento (fachadas con reexport). Ya solo superan 600 líneas los archivos de datos exentos (`brandIcons.ts`, `presetsDock.ts`). `check` y `build` en verde.
* **T-DOC-01:** ARQUITECTURA, NOTAS-TECNICAS (zona Extensión compañera), CONTRIBUTING (solo Store), CHANGELOG `[Unreleased]`, ROADMAP «Estado general».
* Pendiente: partes en Rust >600 (`actions/mod.rs`, `config/model.rs`, `vd-node/lib.rs`, `openrgb.rs`, `ventanas.rs`), mando móvil, `sensors.ts`, plugins (60/83), Elgato (59), limpieza local de `_referencias/` y stashes.

## Turno 2026-10-10 (noche) — Rust partido (T-DEU-03/04)

* `vd-core`: `actions/mod.rs`, `config/model.rs`, `rgb/openrgb.rs`, `launcher/ventanas.rs`, `media/mod.rs` y `launcher/mod.rs` partidos en submódulos (máx. 367 líneas), API pública intacta con `pub use`. `cargo test -p vd-core` 178 verdes (igual que antes), clippy con los 3 warnings que ya había.
* `vd-node/src/lib.rs` (910) → `lib.rs` (83) + `audio`, `launcher`, `media`, `macros`, `voz`, `sensores`. Los 47 exports del `.node` y los 54 `#[napi]` coinciden con antes.
* Ya no queda ningún archivo de código (TS ni Rust) >600 líneas salvo datos exentos (`brandIcons.ts`, `presetsDock.ts`). `knip`: quitado el reexport huérfano `NowPlaying`; quedan 3 devDependencies que knip da por sin uso pero usan `scripts/generar-iconos-dot.mjs` y `electron.vite.config.ts` (falso positivo).
* Sin probar en la app real tras partir el núcleo Rust: abrir con `node scripts/probar-app.mjs abrir <quien>` y probar audio, música, macros y ventanas.

## Turno 2026-10-11 — Gestor de plugins, MVP parte 1 (T-PLG-01, roadmap 83)

* **Hecho (opencode, Muse Spark):** `electron/main/plugins/gestor.ts` implementado (era esqueleto). Instalar desde ZIP (diálogo o ruta) con `yauzl` 3.4.0 (MIT) + `@types/yauzl` (única dependencia nueva); desinstalar con borrado con reintentos; habilitar/deshabilitar persistido en `userData/plugins.json` (atómico); ciclo de vida (arranque de habilitados, 1 anfitrión + 1 proceso/ventana por plugin, `error` con máx. 3 reintentos y espera 1/2/4 s, cierre síncrono en `before-quit`); eventos app→plugin (`willAppear`/`willDisappear`/`keyDown`/`keyUp`/`deviceDidConnect` «VirtualDeck», espera de registro 3 s) y plugin→app (`setImage`/`setTitle`/`setState`→`plugins:visual`, `setSettings`→`plugins:settings` + memoria, globales en `<uuid>.global.json`); PI por contexto con `ventanaPI.ts`. Nuevos: `instalacion.ts` (UUID, zip-slip, topes 100/300 MB/5000), `contextos.ts` (tabla pura), `ajustesPlugins.ts` (estado y globales). `anfitrion.ts` generalizado (multi-contexto, `aparecer`/`desaparecer`/`tecla`, callbacks, dispositivo configurable; el prototipo `VD_PLUGIN_PROTO` intacto). `index.ts` solo arranque/cierre. `idioma.ts` solo 2 claves (`dlg.installPlugin`, `filter.plugins`); el resto son códigos, no frases. Contrato `src/**` y preload intactos.
* **Trampas medidas (que ahorran horas al siguiente):** (1) `yauzl` con `autoClose: true` (defecto) se cierra solo al leer el directorio y todo `openReadStream` posterior falla con `closed` → abrir con `autoClose: false` y cerrar a mano. (2) `yauzl` 3.x ya rechaza `..`/absolutas al leer (`invalid relative path`, `absolute path`) → se mapean a `invalido`, no a `zip`. (3) Con este tsconfig (`strict: false`), `if (!x.ok)` NO estrecha uniones discriminadas (sí `if (x.ok === false)` y el positivo) — el mismo muro rompe `src/components/settings/PluginsSection.tsx` del agente paralelo si usa `!r.ok`. (4) En Windows, desinstalar justo tras matar el proceso falla el `rm` (la carpeta sigue bloqueada) → borrado con 5×200 ms. (5) Comparar el sufijo `.sdPlugin` siempre en minúsculas a ambos lados.
* **Verificación:** puras con `npx tsx` (UUID, tabla de contextos, ida/vuelta de ajustes: en comentarios de cada módulo) + extracción con 9 ZIPs de mentira en `%TEMP%` (bueno/deflate/`__MACOSX`, `../`, absoluta, symlink, multi-raíz, mal UUID, sin manifiesto, no-zip, barra invertida: todos con su código y sin escribir fuera). **Humo real en app** (`probar-app.mjs abrir t-plg-01` + plugin falso Node sin dependencias, WS a mano): instalar→running→appear→press→`setTitle`/`setState` en la ventana→disappear→uninstall→desaparece, y disable→stopped→enable→running. Sin `.sdPlugin` real a mano (no se descargó ninguno): queda probar con un plugin de verdad (Spotify Essentials, Home Assistant, Stopwatch). Sin commit (lo pide el encargo).
* **Guardianes:** `npm run check` 0 errores (tsc, depcruise, eslint, 7 guardianes), `npm run build` 1,8 s, `lint:dead` solo los 3 devDeps falsos positivos ya documentados. `gestor.ts` 595 líneas, complejidad ≤18, eslint 0 avisos en lo mío. Archivos fuera del encargo que toqué: `electron/main/idioma.ts` (2 claves que exige el punto 8) + tablero y este handoff (protocolo).
* **Aviso de coordinación:** otro agente trabaja en paralelo la parte renderer (tipo `plugin`, `PluginsSection`, `src/utils/plugins/*`, riesgo `gal.risk.plugin`): sus 2 errores de tsc a media mañana ya los arregló él; las claves de `idioma.ts` conviven sin choque. `t-plg-03-cdp.cjs` en la raíz (suyo) deja 1 aviso de eslint (`require`).

## Turno 2026-10-10 (plugins) — MVP de plugins de Stream Deck, iteración 1 (roadmap 83)

* **Contrato cableado primero** (`src/types/plugins.ts`, `pluginsIpc.ts`, preload, `plugins/eventos.ts`) para que tres agentes trabajaran en paralelo: T-PLG-01 gestor en el main (`electron/main/plugins/{gestor,instalacion,contextos,ajustesPlugins,anfitrion,procesos}.ts`, `yauzl`), T-PLG-02 sección Ajustes → Plugins, T-PLG-03 acción `plugin` (tipo, manejador, formulario, hooks `usePluginsVisibles`/`usePluginAjustes`, store visual, celda, riesgo en galería, wiki ES/EN).
* **Decisiones tomadas por defecto** (el dueño puede revertirlas): la imagen del plugin se muestra tal cual, en color (no se pasa a DOT); solo plugins Node/HTML (los `.exe` se rechazan con código `exe`); docks y mando móvil sin imagen de plugin todavía.
* `gestor.ts` está en 595 líneas: el siguiente cambio ahí obliga a partirlo.
* Verificado: `npm run check`, `npm run build` y un humo con plugin falso (instalar → running → appear → press → visuales → uninstall). **Sin probar con un plugin real**: instalar Stopwatch / Home Assistant / Multi OBS desde Ajustes → Plugins y poner la acción en un botón.

## Cierre 2026-10-10 — para la próxima sesión

* **Estado:** `main` limpio, 5 commits locales sin push (`a52cdc0` … `5541b5e`+este). Paneles de herdr limpios. `check` y `build` en verde.
* **El dueño debe probar primero:** (1) recargar la extensión en `chrome://extensions` y ver si ya no cae a «desconectado»; (2) núcleo Rust partido en la app real (audio, música, macros, ventanas); (3) un `.streamDeckPlugin` real (Stopwatch, Home Assistant, Multi OBS): Ajustes → Plugins → instalar, acción `plugin` en un botón, pulsar y abrir «Configurar».
* **Decisiones pendientes del dueño:** imagen de plugin en color vs DOT (hoy color); licencias del catálogo curado; borrar los 2 `git stash` (no se tocaron); borrar carpetas locales ignoradas (`_referencias/store-0.14.0` 143M, `trailer` 59M, `informes`).
* **Siguiente iteración de plugins (83):** imagen en docks y mando móvil, perillas (Mirabox/dock), catálogo curado, actualizaciones; partir `gestor.ts` (595 líneas) antes de tocarlo. Faltan también 59 (Elgato), pruebas de hardware T-HW-05..17 con el N3 y la release (certificación 0.14.1; decidir 0.14.2 vs 0.15).

## Turno 2026-10-16 — Delegado a los paneles (T-DEL-A..E), sin commit

* **A (Muse Spark, Go):** `plugins/gestor.ts` 595 -> fachada + `estado`, `inventario`, `instalar`, `cicloVida`, `interaccion` (9 exports idénticos, verificado).
* **B (Space Bunny free):** `mediosFijos.ts` ya tenía `positionMs`/`durationMs`; arreglado `timelineUpdatedAt` que se reiniciaba en cada sondeo.
* **C (DeepSeek free):** mapa de `CLAUDE.md`/ARQUITECTURA/NOTAS/CONTRIBUTING al día; aviso a usuarios del `.exe` 0.13 en README y wiki Home ES/EN.
* **D (Gemini 4 Argon, solo lectura):** 12 hallazgos de seguridad/robustez en plugins (`_referencias/encargos/T-DEL-D-hallazgos.txt`).
* **E (Muse Spark):** arreglados #3 (token de sesión), #4, #5, #6, #8, #9, #10; `anfitrion.ts` 481 con `ordenesVisuales.ts`. **Sin tocar, decisión del dueño:** #1 (will-navigate acumulado), #2 (`no-sandbox` global + CORS `*` en partición de plugin; ligado a T-SEC-06), #7 (nietos huérfanos al cerrar, `taskkill /T`).
* **Verificación:** `npm run check` 0 errores, `build` ok. Sin probar con un plugin real ni en la app.

## Turno 2026-10-17 — T-TND-10 instalar plugin desde URL (contrato + manifiesto v3)

* **Quién:** opencode w16 Muse Spark (Go). **Sin commit** (lo pide el encargo).
* **Encargo:** `_referencias/encargos/T-TND-10-contrato-instalar-url.md`. Backend + contrato; la UI la hace otro agente (T-TND-12) en paralelo.
* **Hecho:**
  1. `electron/main/plugins/descarga.ts` (nuevo): `instalarDesdeUrl({ url, sha256, uuid })`. Solo `https` y hosts `raw.githubusercontent.com` / `github.com` / `objects.githubusercontent.com` (redirecciones seguidas a mano, máx. 5 saltos, fuera de la lista = `descarga`); tope 100 MB (supera = `tamano`); timeout 120 s; SHA-256 verificado antes de instalar (`hash` si difiere); entrega a `instalarDesdeZip` (misma validación zip-slip/topas/DRM, ahora exportada de `instalar.ts`); temporal borrado siempre (`finally`); si el uuid instalado difiere del pedido se desinstala y es `invalido`. `gestor.ts` lo reexporta.
  2. Contrato: `CodigoInstalacion` + `descarga`/`hash`, `EntradaInstalacionUrl`, `ApiPlugins.installFromUrl`; canal `plugins:installFromUrl` en `pluginsIpc.ts` + preload (`satisfies ElectronAPI` cuadra; `check-ipc`: 151 canales, 22 eventos, ok).
  3. Manifiesto v3: `TipoEntradaGaleria` + `plugin` y campos `sha256`/`uuid`/`license` en `src/types/config.ts` y `electron/main/galeria.ts`; `manifiesto()` sanea por helpers (`esFilaValida`, `traeRespaldoPlugin`, `tipoDe`, `respaldoPlugin`, `sanearEntrada`) y **filtra entradas plugin sin sha/uuid válidos**; `resumirRiesgoPlugin(entrada)` exportado (riesgo = `gal.risk.plugin`, sin traer nada por red) + canal `gallery:riesgoPlugin` en `configIpc.ts` + tipos + preload.
  4. Helper puro `src/utils/plugins/estadoTienda.ts`: `estadoPluginTienda(entrada, instalados)` → `disponible`/`instalado`/`actualizable` (casa por `uuid`, compara con `versionMayor`); probado con `npx tsx` (5 casos ok).
* **Guardián exigió tocar `scripts/check-i18n.mjs`:** el literal `'descarga'` (código de máquina de `CodigoInstalacion`, nunca texto visible) tripa el barrido de español; añadido a `PERMITIDOS` con comentario (mecanismo propio del script, no evasión). También se partió el `.map` de `manifiesto()` en helpers (complejidad 23 → ≤18).
* **Verificación:** `npm run check` 0 errores 0 warnings (tsc, depcruise, eslint, 7 guardianes), `npm run build` ok.
* **Para T-TND-12 (UI):** llamar `api.plugins.installFromUrl({ url, sha256, uuid })`; riesgo con `api.gallery.riesgoPlugin(entrada)`; estado con `estadoPluginTienda`. **Códigos nuevos que necesitan texto** (no toco `src/utils/idiomas/**`): `descarga` (fallo de red/host), `hash` (SHA no coincide), detalles `url`, `red`, `redireccion`, `redirecciones`, `cuerpo`, `http-<n>`, `sha-ausente`, `sha-distinto`, `uuid`, `uuid-distinto`, `temporal`.
* **Sin probar en app real:** falta instalar un plugin de verdad desde URL (cuando T-TND-11 publique el manifiesto con `sha256`).

## Turno 2026-10-16 (tarde) — Tienda renovada con plugins (T-DEL-F, T-TND-10/11/12), sin commit

* **T-DEL-F (Muse Spark):** hallazgos 1, 2 (solo CORS; `no-sandbox` se queda, T-SEC-06) y 7 (`taskkill /T /F`). **T-DEL-G (DeepSeek free):** mensaje DRM con alternativa.
* **T-TND-10 (Muse Spark):** `plugins.installFromUrl({url,sha256,uuid})`, `descarga.ts` (https, 3 hosts, redirecciones manuales, 100 MB, sha256 obligatorio), manifiesto v3 con `kind:'plugin'` dentro de `profiles`.
* **T-TND-11 (Space Bunny free):** 6 plugins HTML propios (`docs/galeria-ejemplo/plugins/`), `npm run build:plugins`, 6 entradas en el manifiesto. Sin probar: Property Inspector y fases del pomodoro en la app real.
* **T-TND-12 (Gemini 4 Argon):** tienda rediseñada (pestañas Todo/Perfiles/Páginas/Plugins, destacados, tarjetas, ficha con instalar en un clic). Capturas en `~/.gemini/antigravity-cli/brain/*/scratch/tienda-despues*.png`.
* **Para que se pueda instalar de verdad:** hace falta **push** a `main` (las URL son `raw.githubusercontent.com/.../virtualdeck/main/docs/galeria-ejemplo/plugins/dist/*`) y decidir el manifiesto por defecto: hoy la tienda apunta a `AndyVillatoro/virtualdeck-gallery`, no a `virtualdeck/docs/galeria-ejemplo`.

## Turno 2026-10-17 — T-FIX-02 dock: negro al editar + plugins en docks (sin commit)

* **Quién:** opencode w16 Muse Spark (Go). **Sin commit** (lo pide el encargo).
* **Encargo:** `_referencias/encargos/T-FIX-02-dock-pantalla-negra-y-plugin-en-dock.md`.
* **(a) Causa raíz (reproducida en copia de prueba con el N3 real):** `EditorB` y `Onboarding` son `React.lazy` en `OverlaysApp.tsx`, que se renderiza **fuera** del `<Suspense>` de `App.tsx`. La primera apertura del editor en la sesión suspende durante un update síncrono → React error #426 → se desmonta el árbol entero (ventana en negro, 0 caracteres en el DOM). No es específico del dock: fue la primera apertura de esa sesión. **Arreglo:** `<Suspense fallback={null}>` alrededor de los dos lazy en `OverlaysApp.tsx` (archivo fuera de la lista del encargo pero dueño de los `lazy()`; no toca tienda ni main). Además `LimiteErrorInspector` (nuevo, `dispositivos/`): ErrorBoundary con mensaje DOT alrededor del inspector del dock. Verificado: abrir el editor de una tecla del dock a la primera, sin negro ni errores.
* **(b) Plugins en docks, verificado de punta a punta con el plugin Dado de ejemplo:** el inspector del dock trae sección `PLUGINS INSTALADOS` (`SelectorPluginControl`, nuevo) con el mismo formulario del editor (`CuerpoPlugin` extraído de `formularios/plugins.tsx`; `useListaPlugins` movido a `utils/plugins/listaPlugins.ts`): se elige plugin+acción y se aplica al control entero conservando los gestos hermanos (perilla: trío; tira: hermanos generalizados en `useDockHardwareState`; tecla/botón: su hueco). Aplica por el camino de presets existente (`onAplicarPreset`), sin props nuevas en `DispositivosB`. Runtime: `usePluginsVisiblesDock` (nuevo en `usePluginsVisibles.ts`, montado vía `usePluginsSuperficie` en `useSuperficies`) manda `willAppear`/`willDisappear` de las páginas activas de cada dock (sin esto el main rechaza el `press`); `pintarTecla` pinta `setImage` a sangre + `setTitle` como rótulo (nuevo `dibujarImagenPlena`, firma con imagen/título, repintado al llegar el visual); el widget sigue ganando a la imagen. Pulsar tecla física no se tocó (`pulsarBoton` ya anota `<serial>:<id>`). Medido: aplicado Dado a tecla 1 → `setTitle`/`setImage` en el log, miniatura LCD repintada, `press` aceptado (`setState: 1`).
* **Sin cambios:** `pulsarBoton.ts`, `presetsDock.ts`, `scripts/paridad.json` (sin campos nuevos de `ButtonConfig`: paridad verde), `esEditor/enEditor` (el formulario reutiliza `ed.plugin.*`). Claves nuevas solo `disp.inspector.error`, `disp.plugin.{titulo,aplicar,aplicaPrimero}`.
* **Verificación:** `npm run check` 0 errores 0 warnings (7 guardianes), `npm run build` 1,86 s, `lint:dead` sin huérfanos en lo mío (los 3 que reporta son de tienda/main-plugins, de otros agentes).
* **Para el dueño:** pulsar de verdad una tecla física con plugin (aquí solo se simuló el `press` por CDP) y mirar el LCD del N3 con la imagen del Dado; la vista previa del editor aún no enseña la imagen del plugin en docks; el mando móvil sigue sin imagen de plugin (decisión del encargo).

## Turno 2026-10-17 — T-FIX-03 imagen del plugin en la tecla física (sin commit)

* **Quién:** opencode w16 Muse Spark (Go). **Sin commit** (lo pide el encargo). N3 real conectado (serial 81D0DA78211F), copia `w16` (cerrada al terminar).
* **Encargo:** `_referencias/encargos/T-FIX-03-plugin-en-tecla-fisica.md`. Dos síntomas, dos causas distintas, ambas reproducidas/meditas en la copia:
* **(1) Revertido: la imagen solo salía un instante al pulsar.** Causa: el pintor estático (`pintarCambiadas` en `useSuperficies.ts`) sí lleva el visual del plugin, pero otros tres caminos repintaban la tecla sin él y la pisaban con el arte guardado del botón: el destello de pulsación (`enviarPulso` en `useAnimacionLcd.ts`: al bajar la tecla pintaba botón+destello, el plugin repintaba su cara en el `keyUp`, y los tics restantes del pulso la volvían a tapar hasta quedarse clavada en el arte viejo), el restaurar del aviso de perilla (`restaurar` en `useAvisoPerilla.ts`) y los ciclos de GIF/puntos (un fotograma borraba la imagen). Arreglo: `visualDe()` en `useAnimacionLcd.ts` (misma lectura del store que el pintor estático) enhebrada en `resolverPulso`→`enviarPulso` (el destello va **encima** de la imagen, como en la celda del deck), `centroOcupado()` para que GIF y puntos no animen teclas con imagen de plugin (la enseña el estático), y visual en `restaurar`. Precedencia en todo repintado: widget > imagen de plugin > arte del botón.
* **(2) Borroso en la tecla física, nítido en la interfaz.** Medido en el Chromium de la app: el downscale 256→64 sale igual de nítido que el nativo; el que desdibuja es el JPEG a calidad 0.9 (submuestreo de croma sobre los puntos rojos pequeños; medido: PNG nítido, JPEG 0.9 borroso a 1221 B, JPEG 1.0 nítido a 1938 B). Arreglo (`pintarTeclaDibujo.ts`): `CALIDAD_MAXIMA` 0.9→1.0 (el bucle sigue bajando hasta caber en 10 KB, así que nunca empeora), `rotar` con `imageSmoothingEnabled=false` (giro de 90° exacto sin reinterpolar) y origen entero en `dibujarImagenPlena`.
* **Verificación:** tsc 0 errores; depcruise 0 violaciones; eslint limpio en los 3 archivos; los 7 guardianes en verde por separado; `npm run build` ok. En la copia con el N3: `willAppear` automático al arrancar con el botón ya plugin (setTitle/setImage en el log), cara del dado en la previa de Dispositivos (captura). **`npm run check` entero no pasa por culpa de T-FIX-04 (otro agente, en paralelo): `PreviaInspector.tsx` trae blanco puro (error) y hay 3 warnings en `DispositivosB`/`SeccionApariencia`/`useAppearPluginPreview` — todos fuera de mi lista, no los toco.**
* **Para el dueño (no se puede hacer sin manos):** pulsar de verdad la tecla del dado y mirar el LCD: la cara debe quedarse fija tras soltar (antes volvía el arte viejo) y verse nítida (antes borrosa). Si el dado sigue sin verse fijo, el siguiente sospechoso es el `press`/`keyDown` del hardware, no el pintado.

## Turno 2026-10-17 — T-AUD-01 audio: botón desconfigurado + estado activo (sin commit)

* **Quién:** opencode w12 Muse Spark (Go). **Sin commit** (lo pide el encargo).
* **Encargo:** `_referencias/encargos/T-AUD-01-audio-bugs.md`. Dos síntomas, dos causas:
* **(1) Botón "desconfigurado" al agregar otro dispositivo:** no hay identificación por índice en el código (los ids de endpoint son estables); lo que sí rompe es el **id guardado que se queda viejo** (algunos USB cambian de id al reconectarse, lo documenta `find_audio_device_by_name` en el núcleo) y el manejador solo resolvía por nombre cuando NO había id: con id viejo el `setDefault` fallaba y el botón quedaba muerto. Arreglo (`src/utils/acciones/audio.ts`): el manejador intenta el id, y si falla y hay `deviceName` de respaldo reintenta resolviendo por nombre (exacto y luego parcial, sin caja). Lógica pura extraída y exportada (`normalizarNombreAudio`, `buscarDispositivoPorNombre`, `mismoDispositivoAudio`) + `scripts/probar-audio.ts` (`npx tsx`, 22 afirmaciones en verde). Sin cambio de formato de config (ya se guarda id + nombre) → **sin migración**, sin claves i18n nuevas, API pública intacta.
* **(2) El botón viejo sigue marcado como activo hasta 5 s:** `botonActivo` compara contra `activeAudioDeviceId`, que llega del sondeo del main cada 5 s; el cambio de dispositivo no avisaba. Arreglo (`electron/main/ipc/audioIpc.ts`, canal permitido): tras un `setDefault` ok se invalida la caché y se llama a `refrescarYa()` (mismo patrón que `rgbIpc`), así el tic llega en ms. Además `botonActivo` (`src/utils/estadoSistema.ts`) compara ids sin distinguir caja/espacios. No se tocó `pulsarBoton.ts` ni Rust (la verificación de `set_default_device` ya compara contra consulta fresca; sin tocar `crates/`, `cargo test` innecesario).
* **Verificación:** `npx tsx scripts/probar-audio.ts` verde; `npm run check` 0 errores (tsc, depcruise, eslint, 7 guardianes); `npm run build` ok. **Sin probar en app real:** otra copia con el candado de `probar-app`; no se tocó la salida de audio viva del dueño. Medido solo `listAudioDevices` nativo: 3 dispositivos, ids estables.
* **Pendiente / para otros agentes:** (a) los botones audio-device con **solo nombre** (manuales o de cuadrantes 2x2, que solo editan `deviceName`) cambian bien pero `botonActivo` no los marca; haría falta el nombre del dispositivo activo en el snapshot (main `estadoSistema.ts`, fuera de mi lista); (b) si el dueño usa estos botones como `isToggle`, su fondo de acento lo manda `toggledIds`, no `botonActivo`: el estado real lo da la barra superior de la celda; (c) T-AUD-02 (roadmap) puede referenciar este handoff.

## Turno 2026-10-17 — Docks, audio, perillas y depuración general (supervisor Claude Opus 5.5 + paneles herdr)

* **T-DK-01 (Gemini 3.8 Flash):** la previa LCD del inspector sale una sola vez y solo en controles con `lcd` según el modelo; controles sin pantalla bloquean la personalización (nota ES/EN), la acción sigue editable.
* **T-DK-02 (agy Claude Sonnet 5.5):** perillas: cola de imágenes del driver (solo la última por tecla), una pintura del aviso en vuelo por dock, `launcherIpc` ya no hace blur + 80 ms fijos salvo con foco propio. Pruebas `probar-cola-imagenes.ts`, `probar-giros.ts`. **Para el roadmap 122:** sin núcleo nativo cada paso lanza un PowerShell (~830 ms): PowerShell persistente; no se pudo medir el camino nativo (SendInput rechazado en la sesión del agente).
* **T-AUD-01/03 (Muse Spark):** audio reintenta por nombre si el id quedó viejo; `refrescarYa()` tras cambiar la salida; el activo de un botón de audio sale solo del dispositivo real (no de `toggledIds`). Switch de audio fase 1 (`audioMode` fixed/cycle-all/cycle-list) y fase 2 (icono y sublabel por dispositivo en las 5 superficies, onda al cambiar). Spec en `_referencias/informes/spec-switch-audio.md` (Argon); fase 3 (acción `cycle` genérica) = roadmap 120.
* **T-DEP-01/02/03 (auditoría Beam Free + limpieza Muse Spark, Beam Free, Gemini 4 Argon, Flash):** informes en `_referencias/informes/auditoria-2026-10-17/` (la auditoría tuvo falsos positivos: D-062, D-001/D-035). Aplicados: efectos con cancelación, updaters de `setConfig` puros, guardado sin tragar errores + aviso, macros en cola, rotación de audio serializada, `resumirRiesgo` iterativo con tope de nodos (no importable si se supera), helpers únicos en `src/comun/color.ts`/`formatos.ts`, `electron/main/rutas.ts`, clippy 0, 36 claves i18n muertas fuera, wiki ES/EN sincronizada, exports sin uso fuera, HANDOFF/tablero archivados hasta 2026-10-09.
* **Verificación:** `npm run check` 0 errores, `build` ok, 8 pruebas `probar-*` en verde, `cargo test -p vd-core` 163 ok. **Nada probado en la app real por el dueño:** perillas en el N3, switch de audio con 2+ dispositivos, previa LCD.
* **Decisiones pendientes del dueño:** trailer mp4 (13 MB) y PNG de prensa versionados, `superheroe.png` duplicado, 2 stashes, `_referencias/` (218 MB local), unir los dos selectores de color (D-004), reorganizar carpetas grandes (roadmap 121), unificar docs de la extensión y de la 0.14.1 (deuda técnica v0.15 consolidada en roadmap 121, 123-125).

## Turno 2026-10-18 — T-ORG-02 editor en subcarpetas + rutas viejas del main (sin commit)

* **Quién:** opencode w12 Muse Spark (Go). **Sin commit** (lo pide el encargo).
* **Encargo:** `_referencias/encargos/T-ORG-02-editor.md`. Mismo método que T-ORG-01 (`git mv` + arreglar imports, cero lógica).
* **(1) Partición final** (44 sueltos → 0; `EditorB.tsx` sigue en `src/screens/`; `formularios/`, `catalogo/`, `comportamiento/`, `filas/` ya existían y se quedan): `datos/` (`actionData`, `constantesCatalogo`, `tiposIcono`, `valoresIniciales`, `guardar`, `botonConfigurado`), `estado/` (13: `useEstadoEditor` + 6 `useEstado*`, `subButtonsIniciales`, `useDockPresets`, `useCatalogos`, `useCapturaHotkey`, `usePegarImagen`, `useSelectorIconosDot`), `secciones/` (9: 5 `Seccion*`, 2 `Subseccion*`, `BloqueWidgetApariencia`, `EditorSubdivision2x2`), `campos/` (9: `comunes` + 8 `Campo*`/`Selector*`/`PanelMarcaIcono`/`QuadActionInputs`), `previa/` (`VistaPrevia`, `VistaPreviaPiezas`, `CabeceraEditorB`, `PieEditorB`), `macro/` (`MacroEditor`, `PasoMacro`), `modales/` (`ModalesIconosEditor`). Trampa que costó un `tsc`: al bajar un nivel, **todos** los `../../` externos pasan a `../../../` (también 2 `import()` dinámicos de `useSelectorIconosDot` que el patrón `from '` no caza).
* **Rutas actualizadas:** `scripts/check-acciones.mjs` (`ACTION_DATA` → `datos/`), `scripts/check-i18n.mjs` (`DATOS_SEMBRADOS` → `datos/`), `scripts/informe-i18n-muertas.mjs` (lectura + descripción). `check-campos`/`check-paridad` barren recursivo/sin rutas de editor, `paridad.json` sin rutas de editor, knip/depcruise sin rutas duras: sin cambios. Docs (solo rutas): `CLAUDE.md`, `docs/ARQUITECTURA.md` (4 filas), `docs/NOTAS-TECNICAS.md` (párrafo del editor).
* **(2) Comentarios con rutas viejas del main** (8, todos en `src/**`): `main.tsx` (`floatingBar`/`tienda` → `ventana/`), `configMigration.ts` (`galeria` → `integraciones/`), `rgbPresets.ts` (`rgb.ts` → `rgb/presets.ts`), `acciones/rgb.ts` (`rgb.ts` → `rgb/aplicar.ts`, verificado dónde vive `setDeviceColor`), `marcaSvg.ts`/`formatos.ts` (`iconosMando`/`mandoVivo` → `mando/`), `hardware.ts` (`sensors` → `sistema/`). `FloatingBarB.tsx` (`index.ts`) sigue válido.
* **Verificación:** `npm run check` 0 errores (tsc, depcruise 504 módulos 0 violaciones, eslint limpio, 7 guardianes); `npm run build` ok (1,86 s); `lint:dead` sin huérfanos nuevos en lo mío (los 3 ficheros + 6 exports son de T-DK-02/T-AUD/T-FIX-04, otros agentes); 5 `probar-*.ts` en verde (audio, resumir-riesgo, giros, cola-imágenes, reglas-apariencia); app real (`probar-app` `t-org-02`, cerrada): tutorial saltado, 16 celdas, **editor abierto al pulsar una celda vacía, 5 secciones toggled, overlay montado, 0 errores de consola/excepciones**.
* **Fuera de mi lista (no tocado, para T-DOC-02/dueño):** `CONTRIBUTING.md:427` (`editor/actionData.ts`), `CHANGELOG.md:342,1141` (histórico), `ROADMAP.md:227` (fila 121 nombra `formularios/sistema.tsx`, `EditorSubdivision2x2`, `VistaPreviaPiezas`), `.opencode/skills/vd-check/SKILL.md:72` (`editor/actionData.ts`).

## Turno 2026-10-18 — Orden y limpieza (decisiones del dueño)

* **T-ORG-01/02 (Muse Spark):** `electron/main/` en 7 carpetas por dominio (`audio/`, `media/`, `launcher/`, `ventana/`, `sistema/`, `mando/`, `integraciones/`) y `src/screens/editor/` en `datos/`, `estado/`, `secciones/`, `campos/`, `previa/`, `macro/`, `modales/`; solo `git mv` + imports; rutas viejas corregidas en scripts, pruebas, comentarios de Rust, `.opencode/` y docs.
* **T-COL-01 (Gemini 4 Argon):** un solo selector de color `src/components/ui/SelectorColor.tsx` (borrados `ColorPicker.tsx` y `dot480/SelectorColor.tsx`); capturas antes/después en `_referencias/informes/capturas-unificar-color/`, sin cambio visible.
* **T-DOC-02 (Gemini 3.8 Flash):** deuda pendiente de `deuda-tecnica-v015.md` pasada al roadmap (121 actualizada, 123-125 nuevas) y archivo borrado; docs de la extensión unificadas en `docs/investigacion/extension-companion.md`; 0.14.1 en un solo `docs/store/submission-0.14.1.md`.
* **Prensa (T-PRE-01):** revisado y **no se borra nada**: no hay versiones viejas; capturas y `fuentes/` son las entradas de los banners y del kit que usa la web publicada (`/docs` en GitHub Pages) y la Store. Lo único pesado son los tráileres (13 MB), usados por la web.
* **Pendiente del dueño (bloqueado por el clasificador, irreversible):** borrar los 2 stashes y las 24 ramas viejas (las 2 sin fusionar, a etiquetas `archivo/*`) y `_referencias/store-0.14.0` + `trailer` (~200 MB locales). Comandos en la conversación del 2026-10-18.
* **Verificación:** `npm run check` 0 errores, `build` ok, 8 pruebas `probar-*` en verde, `cargo test -p vd-core` 163 ok, app de prueba con el editor abierto sin errores.
