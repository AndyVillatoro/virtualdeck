# Tablero de Comunicación y Bloqueo Multi-Agente (OpenCode)

Este archivo es el **medio de comunicación activo y sincronización de estado** para los diferentes modelos de IA orquestados por OpenCode sobre VirtualDeck.

---

> Histórico archivado (reclamos DONE anteriores a 2026-10-10 y notas de turnos cerrados): [docs/archivo/AGENT_COMMUNICATION-historico.md](archivo/AGENT_COMMUNICATION-historico.md).

## 1. Registro de Reclamo de Tareas (Task Claims)

Antes de que un modelo empiece a editar archivos, debe registrar su asignación aquí para evitar conflictos de edición simultánea:

| ID | Prioridad | Tarea / Módulo | Modelo / Agente Asignado | Archivos Bloqueados | Estado | Actualizado |
|---|-----------|----------------|--------------------------|---------------------|--------|-------------|
| **T-SEC-06** | **P0** | **Encender el sandbox del renderer**: apagado por deuda, y **no se ha podido medir** que se pueda quitar (el proceso gráfico de Chromium no arranca en este equipo, y eso es del entorno) | (sin asignar) | `electron/main/index.ts`, `windowManager.ts` | `PENDING` (bloqueado) | 2026-09-26 |
| **T-HW-05** | P1 | Página según la aplicación en los docks (roadmap 58): varias páginas por dispositivo, cada una con `targetApp`, cada dispositivo cambia la suya; la principal ignora las páginas de dock | Claude Opus 5.5 (supervisa) + opencode | `src/utils/superficies/useSuperficies.ts`, `paginaSegunApp.ts` (nuevo), `src/utils/useAutoProfile.ts`, `src/utils/useDeck/paginas.ts`, `src/screens/DispositivosB.tsx`, `src/screens/dispositivos/*` salvo `PanelInspectorControl.tsx`, `src/App.tsx`, idiomas `*Dispositivos`/`*Comun` | `VERIFYING` (check y build en verde; falta la prueba con el N3) | 2026-10-04 |
| **T-HW-06** | P1 | Botones prearmados para controles de dock (roadmap 62): 10 tríos de perilla, 7 botones, 3 tiras, en el inspector | Claude Opus 5.5 (supervisa) + agy | `src/data/presetsDock.ts` (nuevo), `src/screens/dispositivos/SelectorPresetsControl.tsx` (nuevo), `PanelInspectorControl.tsx`, idiomas `*Editor`, una línea de `scripts/check-i18n.mjs` | `VERIFYING` (check y build en verde; falta la prueba con el N3) | 2026-10-04 |
| **T-HW-07** | P1 | Página elegida a mano se respeta (67) + sonido de las perillas (64) | opencode | `src/utils/superficies/useSuperficies.ts`, `paginaSegunApp.ts`, `src/utils/useAutoProfile.ts`, `src/utils/sound.ts`, `src/App.tsx` | `VERIFYING` (check y build en verde; falta la prueba con el N3) | 2026-10-04 |
| **T-HW-08** | P1 | Dispositivos se adapta al tamaño + zona de arrastre en Dispositivos/Fondos/Barra (69) | agy | `src/screens/DispositivosB.tsx`, `src/screens/dispositivos/**`, `WallpaperB.tsx`, `BarConfigB.tsx`, idiomas `*Dispositivos` | `VERIFYING` (check y build en verde; falta la prueba con el N3) | 2026-10-04 |
| **T-HW-09** | P1 | Atajos de perilla: zoom con teclado numérico y camino rápido sin PowerShell (65) | Claude Opus 5.5 | `electron/main/launcher.ts`, `src/data/presetsDock.ts` | `VERIFYING` (check y build en verde; falta la prueba con el N3) | 2026-10-04 |
| **T-HW-10** | P1 | Acción `page-nav` (siguiente/anterior/primera/ir a) en deck y en cada dock (63) | opencode | `src/types/actions.ts`, `src/utils/acciones/pageNav.ts` (nuevo), `pulsarBoton.ts`, `useSuperficies.ts`, editor, `presetsDock.ts`, wiki | `VERIFYING` (check y build en verde; falta la prueba con el N3) | 2026-10-04 |
| **T-HW-11** | P1 | Qué hace cada preset y cada control, en palabras (66) | agy | `src/screens/dispositivos/describirAccion.ts` (nuevo), selector e inspector, idiomas `*Dispositivos` | `VERIFYING` (check en verde; falta verlo en pantalla) | 2026-10-04 |
| **T-HW-12** | P1 | Botones fijos en todas las páginas del deck o del dock (68) | opencode | `src/types/**`, `src/utils/**`, `src/components/**`, editor, principal, kiosko | `VERIFYING` (check y build en verde; falta la prueba) | 2026-10-04 |
| **T-CFG-01** | P1 | Quitar configuración duplicada (70) | opencode + Claude Opus 5.5 (mando móvil) | `src/**`, `electron/main/index.ts`, `sensors.ts`, `servidorLocal.ts` | `VERIFYING` (check y build en verde; falta la prueba) | 2026-10-04 |
| **T-HW-13** | P1 | `page-nav` con extremos y `cycle` (72); pulsar otra vez deshace (73) | opencode | `pageNav.ts`, `actions.ts`, `presetsDock.ts`, editor, `describirAccion.ts` | `VERIFYING` (check y build en verde; falta la prueba) | 2026-10-04 |
| **T-HW-14** | P1 | Mando móvil con tema y acento, sin páginas de dock (76) | agy | `electron/main/paginaMando.ts`, `servidorLocal.ts` | `VERIFYING` (revisado por el supervisor; falta la prueba) | 2026-10-04 |
| **T-HW-15** | P1 | Ventana anterior / siguiente: Rust `cycle_window` (supervisor) + acción `window-cycle` (opencode) (74) | Claude Opus 5.5 + opencode | `crates/**`, `electron/main/launcher.ts`, `native.ts`, IPC, editor, presets | `VERIFYING` (falta instalar el `.node` nuevo y probar) | 2026-10-04 |
| **T-HW-16** | P1 | Plantillas de página por app y su operación (75) | opencode | `src/data/plantillasApp.ts`, `src/utils/useDeck/**` | `VERIFYING` (check y build en verde; falta la prueba) | 2026-10-04 |
| **T-HW-17** | P1 | Selector de app (abiertas / buscar .exe / plantilla) (75) | agy | `src/components/SelectorApp.tsx`, `ModalVincularApp.tsx`, `PestanasSuperficie.tsx` | `VERIFYING` (check y build en verde; falta la prueba) | 2026-10-04 |
| **T-UI-01** | P1 | Un solo editor de dibujo DOT + inventario de iconos de primera generación (81) | opencode (wE) | `src/components/dot480/EditorPuntos.tsx` (nuevo), `ModalesIconosEditor.tsx` | `VERIFYING` (check y build en verde; falta verlo) | 2026-10-04 |
| **T-UI-02** | P1 | Editor de botones en secciones plegables, presets ordenados (80) | agy | `src/screens/EditorB.tsx`, `src/screens/editor/**` salvo `ModalesIconosEditor.tsx` | `VERIFYING` (check y build en verde; falta verlo) | 2026-10-04 |
| **T-UI-03** | P1 | GIF animado en tecla física, mando móvil y barra flotante (77) | opencode (wN, DeepSeek V4.1 Flash, Go) | `src/utils/superficies/**`, `FloatingBarB.tsx`, `paginaMando.ts`, `servidorLocal.ts`, `protocoloVd.ts` | `VERIFYING` (check y build en verde; falta verlo) | 2026-10-04 |
| **T-UI-04..12** | P1 | Iconos DOT (fuera VDIcon, migración), campo ICONO único, fijo/anclado unificados, Comportamiento con opciones, catálogo Simple Icons + Tabler, iconos en las cinco superficies, animaciones y efecto al pulsar (77–82, 87–89) | opencode (wE, wN) + agy + Claude Opus 5.5 | ver `docs/HANDOFF.md` | `VERIFYING` (check y build en verde, en commits; falta verlo el dueño) | 2026-10-05 |
| **T-PIP-01** | P1 | Prototipo: vídeo de lo que suena en el panel de música (113) | opencode wN (Claude Haiku 5.5, Go) | `electron/main/capturaVentana.ts`, IPC, preload, `src/types/ipc.ts`, `config.ts` (musicPanel), `src/screens/main/**`, idiomas `*Comun` | `PAUSED` (reclamo caducado 2026-10-17: sin agente activo) | 2026-10-07 |
| **T-TND-03** | P1 | La tienda anuncia plugins en desarrollo (105c) | agy wK (Gemini Flash) | `src/screens/tienda/**`, idiomas `*Ajustes` | `DONE` (reemplazado por T-TND-12, tienda con plugins) | 2026-10-07 |
| **T-VID-03** | P1 | Montar el tráiler con HyperFrames (107) | agy wK (Gemini Flash) | `_referencias/trailer/**` | `PAUSED` (reclamo caducado 2026-10-17: sin agente activo) | 2026-10-07 |
| **T-NAV-01** | P2 | Presets ampliados de navegación web (ítem 1.6 de ROADMAP) | opencode w11 | `src/screens/editor/actionData.ts`, `src/screens/editor/formularios/basicos.tsx`, `docs/ROADMAP.md` (apéndice 1.6) | `DONE` (ya implementado en ítems 54/98 — 0 cambios de código; solo marcado ✅ en apéndice 1.6; check 7/7 verde, build 1.71 s) | 2026-10-10 |
| **T-DOCK-02** | P1 | Fase 0 de Docks: interfaces DriverSuperficie y FamiliaSuperficie (ítem 115) | agy wW | `electron/main/superficies/driver.ts`, `dispositivoMirabox.ts` | `DONE` (driver.ts creado, DispositivoMirabox implementa DriverSuperficie, compatibilidad N3 intacta; check 7/7 verde, build 1.54 s) | 2026-10-10 |
| **T-PERF-01** | P2 | Bundle diferido del catálogo de marcas (ítem 4.1 de ROADMAP) | opencode w12 | `docs/ROADMAP.md`, `docs/AGENT_COMMUNICATION.md` | `DONE` — **el encargo partía de una premisa caducada**: `src/components/BrandIconPicker.tsx` no existe (borrado en `3b1a12d`) y el diferido ya estaba hecho desde `9bbe70d`. Sin cambios de código; verificado en el build | 2026-10-10 |
| **T-WID-02** | P1 | Widget música redimensionable con 3 modos adaptativos (16:9 amplio, estándar, vertical en pila) | Antigravity (orquestador) | `PanelMusica.tsx`, `PanelMusicaBarra.tsx`, `PanelesMusica.tsx`, `ManejadorRedimension.tsx`, `CuerpoVideo.tsx`, `CuerpoCaratula.tsx`, `ControlesTransporte.tsx`, `config.ts` | `DONE` | 2026-10-10 |
| **T-VID-02** | P1 | Geometría y centrado de recorte de vídeo (contain scaling sin corte lateral) | Antigravity (orquestador) | `src/screens/main/musica/recorteVideo.ts` | `DONE` | 2026-10-10 |
| **T-DOCK-03** | P1 | Animación de encendido VirtualDeck y borrado de VRAM / splash Mirabox | Antigravity (orquestador) | `electron/main/superficies/dispositivoMirabox.ts`, `animacionInicioDock.ts`, `useSuperficies.ts` | `DONE` | 2026-10-10 |
| **T-EXT-01-fix** | P1 | La extensión no se enfoca en el vídeo: sale la pantalla completa del navegador (encargo `_referencias/encargos/T-EXT-01-enfoque-video.md`) | Antigravity (orquestador) | `companion-extension/**`, `electron/main/companion/**`, `electron/main/ipc/companionIpc.ts`, `src/types/companion.ts`, `src/screens/main/musica/{useCompanionStream,VideoVentana,recorteVideo,useStreamVentana,tamanoCaptura}` | `DONE` (recorte por fracciones y sincronización del rect; check 7/7 verde; **sin verificar en navegador real**) | 2026-10-10 |
| **T-PLG-01** | P1 | Gestor de plugins de Stream Deck, MVP parte 1 (83): instalar/desinstalar/habilitar, ciclo de vida, eventos, PI (encargo `_referencias/encargos/T-PLG-01-gestor.md`) | opencode (Muse Spark) | `electron/main/plugins/**`, `electron/main/ipc/pluginsIpc.ts`, `electron/main/index.ts` (solo arranque/cierre), `package.json` + `package-lock.json` (solo dep ZIP), `electron/main/idioma.ts` (solo claves de diálogo) | `DONE` (check verde salvo 2 errores ajenos en vuelco; humo real OK) | 2026-10-11 |
| **T-DEU-02** | P2 | Partir `rgb.ts` (724), `useEstadoEditor.ts` (635) y `PanelInspectorControl.tsx` (611) por responsabilidad, sin cambiar comportamiento (encargo `_referencias/encargos/T-DEU-02-partir-rgb-editor.md`) | opencode (space-bunny-free) | `electron/main/rgb.ts` → `electron/main/rgb/*.ts` (nuevos, `rgb.ts` borrado; `scripts/check-acciones.mjs` con `PRESETS_MAIN` a `rgb/presets.ts`), `src/screens/editor/useEstadoEditor.ts` + 6 hooks `use*.ts` y `subButtonsIniciales.ts` (nuevos), `src/screens/dispositivos/PanelInspectorControl.tsx` + 6 subcomponentes (nuevos), imports de quien los use | `DONE` (los tres por debajo de 306 líneas; return del hook con las mismas 146 claves, comprobado por tipos; check 7/7 verde, build 1,75 s; **sin probar en la app**) | 2026-10-10 |

> **Estados posibles**:
> - `READY`: Disponible para ser tomada por cualquier modelo.
> - `CLAIMED`: Reclamada por un modelo; otros modelos no deben tocar los archivos listados.
> - `IN_PROGRESS`: Código siendo modificado y probado.
> - `VERIFYING`: Ejecutando `npm run check` y `npm run build`.
> - `DONE`: Completado, verificado con 0 errores y comiteado en git.

---

## 1b. Pruebas que quedan pendientes (las hace el dueño)

Todo lo de aquí está **verificado por inspección o por prueba automatizada**, pero no en la app real. Ninguna ha bloqueado un commit: cada fix llega con lo que sí se pudo comprobar y con esta lista como deuda explícita.


| # | Qué probar | Cómo | Qué mira | Por qué no lo hice aquí |
|---|---|---|---|---|
| **P5** | **`sandbox: true` no rompe nada** (T-SEC-01/06) | Con el sandbox encendido: macro, RGB, sensores, mando LAN, un par de acciones | Que todo siga igual | Aquí el sandbox **no se puede probar** porque el canvas lo revienta (T-SEC-06) |
| **P7** | **La macro importada con números raros** (T-SEC-03) | Un perfil con `delayMs` enorme o negativo | Que no se cuelgue y que la espera sea la acotada | Lanzar una macro mueve el ratón y escribe en el escritorio |

> **Cómo arrancar una build sin tocar `%APPDATA%`** (la app del Store en marcha
> bloquea la de desarrollo por el `lockfile` de instancia única):
> `npx electron . --user-data-dir=<tmp>`, con `VD_DIAG=1` para ver qué se ha pintado.

---

## 2. Buzón de Mensajes Inter-Agente (Message Log)

Utiliza este apartado para dejar mensajes, advertencias técnicas o instrucciones específicas para el siguiente modelo que continúe el trabajo:

* **2026-10-10** — *opencode (T-DEU-02, partir rgb/editor/inspector)*:
  - **Los tres archivos ya están partidos**, sin cambio de comportamiento: `electron/main/rgb.ts` (724) → `electron/main/rgb/` con `estado.ts` como **único** dueño del estado y `index.ts` de fachada (los `import * as rgb from './rgb'` siguen igual); `useEstadoEditor.ts` (635) → seis hooks por tema + cableado, con el **mismo objeto de retorno de 146 claves** (comprobado con un tipo que las enumera y otro que exige que no sobren); `PanelInspectorControl.tsx` (611) → componente + `tiposPanelInspector.ts` (los tipos, para no cerrar ciclo), `textoPanelInspector.ts`, `PanelInspectorVacio`, `PreviaInspector`, `PiezasInspector` y `ListaHermanosPerilla`.
  - **Un cambio fuera de los tres**: `scripts/check-acciones.mjs`, una línea (`PRESETS_MAIN` a `electron/main/rgb/presets.ts`). Sin eso el guardián no encuentra la lista de presets y `npm run check` se para.
  - **`aplicarBrilloYVelocidad` está en `color.ts`, no en `presets.ts`**: `applySmartPreset` llama a `setDeviceColor` y `setMode` al traductor; dejarlo en `presets.ts` cerraba el círculo y depcruise lo veta.
  - `npm run check` 7/7 verde, `npm run build` 1,75 s. `knip` limpio en lo mío; queda el tipo `NowPlaying` sin usar de `electron/main/media.ts`, que es del agente que está partiendo `media.ts` ahora mismo.
  - **Lo que nadie ha comprobado: la app en pantalla.** No se ha abierto (el RGB necesitaría un OpenRGB de verdad).
  - **Para el mapa:** `CLAUDE.md` sigue listando `rgb.ts`; ahora es `rgb/`. No lo toqué porque otro agente lo editaba a la vez.

* **2026-10-10** — *opencode w12 (T-PERF-01)*:
  - **Aviso de premisa caducada**: T-PERF-01 pedía diferir `src/components/BrandIconPicker.tsx`, archivo que **no existe** (borrado en `3b1a12d`; lo absorbió el selector unificado `SelectorIconosDot`/`PanelCatalogoIcono`). El diferido ya estaba hecho desde `9bbe70d`.
  - **Verificado en el build**, no supuesto: `brandIcons` sale como chunk aparte de 29,40 kB y en el index solo aparece como `import()` dinámico; `index.html` no lo carga. El disparador real es «el botón tiene `brandIcon`» (`celda/CapasDeFondo.tsx:38` monta `BrandIconDisplay` solo si lo hay).
  - **Sin cambios de código.** Solo se corrigió la incoherencia del ROADMAP (el ítem 4.1 estaba sin marcar pese a que la fila P5 ya lo daba por hecho).
  - **Para quien siga con rendimiento**: el peso real está en `indice-*.js` (424 kB) y `acciones-*.js` (332 kB), no en el catálogo de marcas.
  - `npm run check` 7/7 verde, build 1,86 s, `knip` sin huérfanos en `src/`.

* **2026-10-09 (madrugada / cierre de sesión)** — *Antigravity (orquestador)*:
  - **Estado**: Todo limpio y comiteado en `main` (`origin/main` al día).
  - **Deuda técnica completada**:
    - `src/App.tsx`: complejidad reducida de 29 a <18 extrayendo `VistasSecundarias.tsx`, `OverlaysApp.tsx` (en `src/screens/` para respetar `components-no-screens`), `useAppShortcuts.ts`. 0 advertencias ESLint en el repo.
    - `src/utils/superficies/pintarTecla.ts` (835 → 316 líneas): extraído `pintarTeclaDibujo.ts` (413 líneas).
    - `electron/main/sensors.ts` (596 → 240 líneas): extraído `sensors-parser.ts` (216 líneas).
    - `Glyph57Editor.tsx` renombrado a `Glyph57View.tsx` (41 líneas); actualizadas sus 3 importaciones y `ROADMAP.md:299`.
    - Eliminadas 10 claves i18n huérfanas `glyph.*` en `esEditor.ts` y `enEditor.ts`.
  - **Guardianes**: 7/7 en verde con `npm run check`, 0 exports huérfanos en `knip`, build 1.68 s.
  - **Siguiente versión (v0.15.0)**: Iniciar Browser Companion Extension (Ítem 114) y compatibilidad física OpenDeck / Elgato Plus/Neo (Ítem 115).

* **2026-10-09 (tarde / delegación multi-agente Herdr)** — *Antigravity wK (orquestador)*:
  - **Coordinación Herdr**: Trabajo distribuido en paralelo entre paneles Herdr (`wK:p1` orquestador agy, `wW:p1` agy, `w0:p1` opencode, `w11:p1` opencode, `wX:p1` opencode).
  - **Ítem 114 (VirtualDeck Companion Extension)**: Extensión Manifest V3 (`companion-extension/`) completada y conectada a Electron (`electron/main/companion/`). Hardening de seguridad aplicado por `wW`: sockets autenticados obligatorios, CORS restrictivo sin `*`, Origin estricto a extensiones y endpoints locales protegidos.
  - **Documentación de Novedades**: Documentación bilingüe unificada en `docs/store/submission-0.14.1.md` con las 5 novedades oficiales para visibilidad inmediata del usuario y proceso de envío.
  - **Ítem 115 (Compatibilidad Docks Físicos)**: Actualizado `docs/ROADMAP.md` y redactado plan técnico en `docs/investigacion/plan-docks-v015.md` (por `wW`) con arquitectura para Elgato Plus (8 teclas + 4 diales + LCD 800×100), Neo (8 teclas + 2 touchpoints + infobar 248×58) y reposo de docks por inactividad.
  - **Deuda Técnica v0.15**: Auditoría exhaustiva consolidada en el roadmap (filas 121, 123-125) con mapa de limpieza segura (archivos >500 líneas, stashes redundantes y poda de `_referencias/` cerradas).
  - **Guardianes**: `npm run check` 7/7 en verde, `knip` con 0 exports huérfanos y 0 tipos huérfanos, `npm run build` en 1.67 s.

* **2026-10-10** — *Antigravity (orquestador / Companion HD isolation)*:
  - **Diagnóstico del problema**: El usuario reportó que la captura mostraba la interfaz completa del navegador a baja resolución y cambiaba al cambiar de pestaña activa. Esto ocurría porque al fallar el enlace con el offscreen de la extensión, `VideoVentana.tsx` recurría a `useStreamVentana` (captura HWND de Windows mediante `desktopCapturer`), la cual captura la ventana completa de Chrome en primer plano.
  - **Soluciones aplicadas**:
    1. **Recorte adaptativo en offscreen**: `companion-extension/offscreen.js` implementa `dibujarRecorte()` que lee las coordenadas reales de `media.getBoundingClientRect()` emitidas por `content.js` y recorta canvas exclusivamente al elemento `<video>`, escalando en HD nítido (hasta 1280px con JPEG 0.85).
    2. **Aislamiento de sockets en backend**: En `servidorCompanion.ts`, los sockets con `rol=stream` se autentican pero no suplantan `clienteWs`. Al desconectar el stream, se resetea el último frame a vacío para retornar elegantemente a reposo sin fugas.
    3. **Handshake fiable con reintentos**: En `background.js`, `enviarMensajeOffscreen` realiza reintentos con espera hasta confirmar que `offscreen.js` ha recibido `start_capture`.
    4. **Auto-streaming al reproducir**: `background.js` inicia automáticamente la captura de la pestaña correspondiente cuando detecta reproducción de vídeo activa (`autoStreaming: true`).
    5. **Optimización en VideoVentana**: Se desactiva la captura HWND nativa (`desktopCapturer`) mientras `usandoCompanion` esté activo para ahorrar CPU/GPU, y se añade listener `onLoadImg` para calcular la relación de aspecto exacta de los fotogramas recibidos.
  - **Verificación**: `npm run check` 7/7 guardianes verdes (0 errores, 0 advertencias), `npm run lint:dead` 0 huérfanos en src, `npm run build` 1.65 s.

* **2026-10-10** — *opencode w11 (T-NAV-01, ítem 1.6)*:
  - **Hallazgo**: el objetivo ya estaba implementado (ítems 54 y 98). `src/screens/editor/actionData.ts:108-122` trae los 14 presets WEB con las 11 URLs pedidas (Gemini, Claude, ChatGPT, GitHub, YouTube, Twitch, Reddit, Discord Web, WhatsApp Web, Notion, Spotify Web + Netflix, X, Gmail), cada uno con `label`, `url` e `iconoCatalogo`. `FormWeb` en `src/screens/editor/formularios/basicos.tsx:44-78` expone los 11 chips vía `Segmentado`.
  - **Verificación de iconos**: los 18 `iconoCatalogo` usados (`marcas:*`, `acciones:brand-openai`, `acciones:brand-vscode`) resuelven en `src/data/iconosDot/` (2.866 marcas, 5.150 acciones). Sin cambios de código.
  - **Correcciones al encargo**: las rutas del reclamo no existían (`src/data/actionData.ts`, `src/screens/editor/pasos/PasoAccion.tsx`); las reales son `src/screens/editor/actionData.ts` y `src/screens/editor/formularios/basicos.tsx`. Apéndice 1.6 del ROADMAP marcado ✅.
  - **Verificación**: `npm run check` 7/7 verde (tsc 0 errores), `npm run build` 1.71 s. Estado → `DONE`.

* **2026-10-10** — *agy wW (T-DOCK-02, Fase 0 de Docks, ítem 115)*:
  - **Objetivo**: Fase 0 del plan de docks (`docs/investigacion/plan-docks-v015.md` §3.1 y §6).
  - **Cambios realizados**:
    1. Creado `electron/main/superficies/driver.ts` con los contratos `DriverSuperficie`, `FamiliaSuperficie`, `ControlRef`, `ControlId` y `CallbacksDispositivo`.
    2. Modificado `electron/main/superficies/dispositivoMirabox.ts` para implementar `DriverSuperficie`.
    3. Su método `imagen(control: ControlId, jpeg: Buffer)` admite tanto el índice numérico simple (`tecla0: number`) como la referencia estructurada `ControlRef` (`tipo === 'key'`), preservando intacto el comportamiento, rendimiento y latencia del Mirabox N3 actual.
  - **Verificación**:
    - `npm run check`: 7/7 guardianes verdes (tsc 0 errores, depcruise 0 violaciones, eslint 0 advertencias, check-i18n, check-acciones, check-ipc, check-wiki, check-campos, check-paridad, check-perfiles).
    - `npm run build`: 1.54 s sin errores.
    - Estado → `DONE`.

* **2026-10-10** — *Antigravity (T-EXT-01-fix, la extensión no se enfoca en el vídeo)*:
  - **Causa raíz**: el recorte al `<video>` vivía en un canal lateral frágil. `background.js` solo reenviaba el rect de la pestaña **igual a `tabCapturada`**, que se asigna al final de `iniciarCapturaTab` (tras dos `await`); mientras tanto, y **para siempre tras cualquier reinicio del service worker de MV3** (la variable era solo de módulo), ese rect se descartaba. `offscreen.js` arrancaba con `rectVideo = null` y `dibujarRecorte()` dibujaba entonces el fotograma entero: la pantalla completa del navegador.
  - **Cinco arreglos** (solo en `companion-extension/`, sin tocar el protocolo VDCM ni el lado app):
    1. `content.js`: el rect se mide en **fracciones 0..1 del viewport visible**, no en píxeles CSS — el cuadro capturado no es `viewport × devicePixelRatio` (zoom, escalado, scrollbar), así que la fracción es lo único exacto. `dpr` y `vw/vh` viajan solo como diagnóstico.
    2. `content.js`: elige el `<video>` que se ve (suena + más área visible), descartando anuncios, vistas previas y reproductores ocultos. Metadatos y transporte siguen usando el criterio laxo, para no romper Spotify (su `<audio>` no se ve nunca).
    3. `content.js`: el rect se refresca con `ResizeObserver`, `fullscreenchange`, `resize` y `scroll` (con 80 ms de retardo), no solo con el sondeo de 250 ms; y si no hay vídeo a la vista se manda rectángulo «página entera» en vez de dejar uno viejo clavado.
    4. `background.js`: rectángulos **por `tabId`**; se reenvían todos y el offscreen elige el de la pestaña capturada. La pestaña capturada se guarda en `chrome.storage.local` y se restaura al despertar el service worker. Al arrancar la captura se le pasa el rect conocido y se pide uno fresco (`pedir_rect`).
    5. `offscreen.js`: si no tiene el rect de la pestaña capturada, **lo pide** (`video_rect_pedido`, cada 3 s) y reutiliza el último bueno, en vez de rendirse a la pestaña entera.
  - **Extra**: `registrarEventosMedia` acumulaba miles de escuchadores duplicados sobre el mismo `<video>` (la llamaba el `MutationObserver` en cada mutación); ahora hay guarda con `WeakSet`.
  - **Descartado**: `captureStream()` del `<video>` desde el content script. En YouTube el vídeo va por Widevine y `captureStream()` lanza `NotSupportedError` sobre contenido protegido por EME; solo daría el vídeo sin los controles del reproductor, y obligaría a recodificar en el content script. Sigue siendo el camino a explorar si algún día hay que capturar sin pantalla.
  - **Verificación**: `npm run check` 7/7 verde (tsc, depcruise, eslint, 7 guardianes), `knip` sin huérfanos nuevos. **Sin verificar en navegador real**: no se puede cargar la extensión aquí. Pruebas sugeridas al dueño en `youtube.com/watch?v=…` en modo normal, teatro y pantalla completa.

* **2026-10-10** — *Antigravity (T-WID-02, T-VID-02, T-DOCK-03)*:
  - **Widget música redimensionable (T-WID-02)**:
    - Implementado `ManejadorRedimension.tsx` con arrastre continuo y persistencia en `musicPanel.ancho`.
    - 3 modos de disposición adaptativos:
      1. Amplio (>= 440px): Escenario 16:9 grande para vídeo o carátula musical expansiva.
      2. Estándar (240px - 439px): Balance clásico cuadrado con controles integrados.
      3. Vertical en pila (< 240px): Carátula compacta con transporte en pila vertical (botones hacia abajo) para paneles ultradelgados.
    - Componentes desacoplados en `CuerpoVideo.tsx` y `CuerpoCaratula.tsx`, manteniendo complejidad ESLint < 18.
  - **Geometría de recorte de vídeo (T-VID-02)**:
    - Resuelto el corte del 50-60% del vídeo en contenedores cuadrados o reducidos: `recorteVideo.ts` ahora aplica escala uniforme `contain` centrando los ejes X e Y, garantizando que el 100% del área recortada sea visible.
  - **Inicio Dock sin colisiones de firmware (T-DOCK-03)**:
    - Borrado de VRAM física inmediato (`CLE \xff` + `REFRESCO`) en `dispositivoMirabox.ts` al inicializar conexión, limpiando el logo de arranque quemado por el firmware.
    - Animación de encendido VirtualDeck dot-matrix (`animacionInicioDock.ts`) con barrido radial de luz y glifo "VD" centrado antes de montar los botones reales.
  - **Verificación**: `npm run check` 7/7 guardianes verdes (0 errores, 0 advertencias), `npm run lint:dead` 0 tipos/exports huérfanos, `npm run build` 1.72 s.



* **2026-10-16** — *opencode w12 Space Bunny (T-DEL-B, barra de progreso en `mediosFijos.ts`)*:
  - **El pendiente 4 de «Pendientes tras la 0.14.0» ya estaba hecho**: el commit `25f1038` (2026-10-08) metió `positionMs`/`durationMs`/`timelineUpdatedAt` en `PistaFija` y en el `return` de `medioFijo()`, y las capturas de ese día ya salen con la barra (**1:26 / 3:42** en `docs/prensa/01-deck.png` y en `08-kiosko-barra.png`). El pendiente no se cerró en el handoff; lo que faltaba era **consistencia y prueba**, no el tipo.
  - **Lo que sí estaba roto** (encontrado mirando la captura, no el tipo): `timelineUpdatedAt: j.timelineUpdatedAt ?? Date.now()` se recalculaba en **cada** llamada, y `getNowPlaying` se pregunta cada pocos segundos. Como el widget interpola la posición desde ese campo (`src/utils/progresoCancion.ts`), la barra volvía a 1:26 y **retrocedía en cada sondeo**. Ahora el ancla se fija **una vez por proceso** (`anclaTimelineMs`) y la barra avanza sola. Además los tres campos pasan por `numero()`: el JSON se edita a mano y un `"86000"` entre comillas habría dejado la barra en `NaN`.
  - **`scripts/prensa/caratula.mjs`** declara ya `positionMs: 86_000` / `durationMs: 222_000` en `reproduccion()` —lo que le faltaba al archivo de la pista— y **`capturar.mjs`** (`sembrarPista()`) los **añade** al `reproduccion.json` que ya exista, respetando todo lo demás, porque ese archivo se edita a mano y con el `if (!existsSync)` de antes se quedaba a medias hasta que alguien lo borrara de la carpeta de fuentes.
  - **Fuera del encargo pero de paso:** regenerado `docs/prensa/fuentes/reproduccion.json` con su propio generador; el diff son **solo esos dos campos** (la carátula en base64 sale idéntica, comprobado).
  - **Verificación:** `npm run check` 0 errores con los 7 guardianes en verde y `npm run build` OK. Capturas **de verdad** sacadas a borrador (`_referencias/informes/prensa-borrador/t-del-b/`, sin pisar las de `docs/prensa/`): `01-deck.png` y `08-kiosko-barra.png` con la barra a **1:35** de 3:42, avanzando y sin saltos. Los PNG de `docs/prensa/` no se han tocado: ya tenían barra.
  - **Para quien siga:**
    - `docs/prensa/README.md:244` sigue diciendo que «la barra de progreso no sale» y que harían falta `mediosFijos.ts` **y `media.ts`**: caducado, `media.ts` no hizo falta. Es de la limpieza de docs (w11).
    - El pendiente 4 de `docs/HANDOFF.md:456` está caducado por lo mismo.
    - `node scripts/prensa/caratula.mjs` **no hace nada en Windows**: el guardia `import.meta.url === \`file://${process.argv[1]}\`` nunca cuadra (`file:///C:/...` contra `file://C:\...`). Regeneré el JSON con un `node -e` que importa `reproduccion()`. Es un arreglo de una línea; no lo he tocado por no salirme del encargo.
    - Nada de esto está en el `[Unreleased]` del `CHANGELOG`.

* **2026-10-22** — *opencode run Kimi K2.7 Code (T-CYC-01, acción `cycle`)*:
  - Terminado: tipo + manejador, formulario, aspecto en celda/LCD/mando móvil, riesgo de galería, preset "Ambiente RGB", i18n ES/EN, wiki ES/EN y prueba pura.
  - Arreglos finales: parámetro `accent` sin usar renombrado a `_accent` en `formularios/ciclo.tsx`; añadidas las 4 etiquetas de ciclo en `FIELDS_EN`.
  - `npm run check` 7/7 guardianes verdes (0 errores, 0 advertencias), `npm run build` 1,78 s, `npx tsx scripts/probar-ciclo.ts` verde.
  - **No probado en app real**: el candado de `scripts/probar-app.mjs` está ocupado por la copia de «t-deu-06» (PID 9184). La prueba manual en pantalla queda pendiente de liberar el candado.

* **2026-10-25** — *opencode w1A GLM-5.3 Flash Free (T-PLG-04, actualizar en el sitio)*:
  - Los tres cambios: `instalarDesdeZip(zipPath, opciones?)` con `{ uuidEsperado?, actualizar? }` (la ruta de la tienda pasa `actualizar: true`; arrastrar o elegir archivo sigue devolviendo `duplicado`); `reemplazarCarpeta` en `instalar.ts` (`detenerMarcha` conserva los contextos → apartar la vieja a `.old-<pid>-<ts>` con reintentos → entra la nueva → se borra la `.old-*` con `borrarConReintentos`; `<uuid>.global.json` no se toca nunca; un deshabilitado sigue deshabilitado y sin arrancar); y la tienda sin el `uninstall` previo en `ContenidoTienda.tsx`.
  - **Dos decisiones sobre el encargo**: (1) en los caminos de fallo del reemplazo, `arrancar(uuid)` de la versión vieja **solo si estaba en marcha** antes de detenerla — un `arrancar` a ciegas encendería a un deshabilitado, que es justo lo que el punto 5 prohíbe; (2) si el borrado de la `.old-*` falla, la actualización ya está hecha y solo se avisa por log: `leerInstalados` la ignora porque su nombre no acaba en `.sdPlugin`.
  - **La prueba pura encontró un fallo real del primer borrador**: el temporal del ZIP no se limpiaba en el camino de éxito del reemplazo (solo en el de fallo). Corregido; `scripts/probar-actualizar-plugin.ts` (`npx tsx scripts/probar-actualizar-plugin.ts`) cubre 4 escenarios con disco y procesos de verdad: instalar de cero, actualizar en marcha (re-arranca), actualizar deshabilitado (no arranca, sigue deshabilitado) y actualizar con la carpeta bloqueada por un proceso vivo (el rename falla tras los reintentos, la vieja queda en su sitio y vuelve a correr, sin `.old-*` ni `.tmp-*`).
  - `npm run check` 0 errores (tsc, depcruise, eslint, 7 guardianes), `npm run build` OK. knip: solo las 2 devDependencies viejas ya conocidas; sin huérfanos de estos archivos.
  - **No probado en la app** con una actualización real de la tienda (haría falta un plugin publicado con versión nueva); los caminos están cubiertos por la prueba pura.

* **2026-10-25** — *opencode w1A GLM-5.3 Flash Free (T-PLG-05, imagen del plugin en el mando móvil)*:
  - El último `setImage`/`setTitle` del plugin se pinta en el mando móvil: tienda en `electron/main/plugins/visualesMando.ts` por contexto (`deck:<id>`; los de dock se ignoran porque `baseViva()` no da páginas de dock). Se acepta solo `data:image/(png|jpeg|gif|webp);base64` con ≤ 256 KB una vez decodificada; svg y demás se saltan y se conserva el visual anterior (igual que el deck ignora los `setImage` que rechaza). `''` limpia la imagen y conserva el título.
  - Cable: ayudantes de contexto puros movidos a `src/comun/contextoPlugin.ts` (re-exportados por `src/utils/plugins/ref.ts`); `plugins/cicloVida.ts` guarda y olvida (`alVisual` / `detenerMarcha`), `plugins/interaccion.ts` olvida al retirar el contexto (`appear` a falso); la actualización en vivo va por el sondeo de 3 s de `/api/buttons` (`ticVivo` dice que cambió el JSON), sin canal nuevo; la precedencia de capas de la página va en `mando/pantallaMandoPagina.ts` (imagen del plugin por encima de acciones e imagen propia, centro vacío y título del plugin en vez del rótulo, con velo oscuro y texto `#e6e8eb`/`#9da2a8` para que se lea sobre cualquier imagen).
  - Prueba pura nueva `scripts/probar-visual-mando.ts` (16 escenarios en verde, `npx tsx scripts/probar-visual-mando.ts`): guardar/fusionar/limpiar/olvidar por contexto, techo de 256 KB, formatos aceptados y rechazados.
  - `npm run check` 0 errores (tsc, depcruise 544 módulos, eslint, 7 guardianes), `npm run build` OK, `npm run lint:dead` sin huérfanos de estos archivos (solo las 2 devDependencies viejas). El JS embebido de la página del mando se parsea igual que antes (comprobado con `new Function`).
  - Paridad sin campo nuevo en `ButtonConfig` (`scripts/paridad.json` sin cambios). **No probado en el mando real** (haría falta el candado del dueño y un plugin que pinte); cubierto por la prueba pura.

---

## 3. Checklist de Entrega de Turno (Handoff Checklist)

Antes de liberar tu turno o enviar tu commit, marca que has cumplido:

- [ ] ¿El código respeta la grilla de 4px y la paleta DOT (`VD_LIGHT` / `#070809`)?
- [ ] ¿Cero emojis en la interfaz?
- [ ] ¿Se ejecutó `npm run check` con 0 errores?
- [ ] ¿Se verificó `npm run build` sin errores de bundle?
- [ ] ¿Se actualizó el estado de la tarea en la tabla a `DONE`?
- [ ] ¿Se dejó un mensaje en el buzón explicando qué se hizo y qué falta?
| **T-DEL-A..D** | P2 | A partir `plugins/gestor.ts` (w16 Muse Spark); B barra de progreso en `mediosFijos.ts` (w12 Space Bunny); C limpieza de docs (w11 DeepSeek free); D revision de seguridad de plugins, solo lectura (w14 Gemini 4 Argon) | ver `_referencias/encargos/T-DEL-*.md` | `electron/main/plugins/**`; `electron/main/mediosFijos.ts`; docs/README/wiki | `VERIFYING` (check y build en verde; sin probar con plugin real ni commit) | 2026-10-16 |
| **T-DEL-E** | P1 | Arreglar hallazgos #3,#4,#5,#6,#8,#9,#10 de la revisión de plugins; NO tocar #1,#2,#7 (encargo `_referencias/encargos/T-DEL-E-arreglos-plugins.md`) | opencode (Muse Spark) | `electron/main/plugins/**`, `src/utils/plugins/**` (+`PluginsSection.tsx`, `src/types/plugins.ts` solo si hace falta) | `DONE` (check 0 errores 0 warnings, build ok, pruebas puras tsx ok; sin commit: lo pide el encargo; no probado en app) | 2026-10-17 |
| **T-TND-10** | P1 | Instalar plugin desde URL con sha256 (contrato IPC + manifiesto v3) | w16 Muse Spark (Go) | `electron/main/plugins/**`, `ipc/**`, `galeria.ts`, preload, `src/types/**`, `src/utils/plugins/**` | `DONE` (check 0 errores 0 warnings, build ok, helper puro probado con tsx; sin commit: lo pide el encargo) | 2026-10-17 |
| **T-TND-11** | P1 | 6 plugins propios HTML + empaquetador + manifiesto | w12 Space Bunny (free) | `docs/galeria-ejemplo/**`, `scripts/empaquetar-plugins.mjs`, `package.json` | `VERIFYING` (check y build en verde; sin commit ni probar en la app) | 2026-10-16 |
| **T-TND-12** | P1 | Rediseño de la tienda con sección Plugins | w14 Gemini 4 Argon | `src/screens/tienda/**`, `TiendaB.tsx`, `esAjustes/enAjustes`, `components/ui/**` | `VERIFYING` (check y build en verde; sin commit ni probar en la app) | 2026-10-16 |
| **T-FIX-01** | P1 | Plugins duplicados en la tienda | w11 DeepSeek (free) | `src/screens/tienda/**`, `src/utils/galeria*`, `electron/main/galeria.ts` | `DONE` (check y build en verde; commit hecho) | 2026-10-16 |
| **T-FIX-02** | P1 | Dock: pantalla negra al editar + plugins aplicables a docks | w16 Muse Spark (Go) | `src/screens/dispositivos/**`, `src/utils/superficies/**`, `src/utils/plugins/**`, `pulsarBoton.ts`, `presetsDock.ts`, `paridad.json` | `DONE` (check 0 errores 0 warnings, build ok, verificado en app real con N3; sin commit: lo pide el encargo) | 2026-10-17 |
| **T-FIX-03** | P1 | Imagen del plugin en la tecla fisica del dock (borrosa, vuelve la anterior) | w16 Muse Spark (Go) | `src/utils/superficies/**`, `src/utils/plugins/**`, `useDockHardwareState.ts` | `DONE` (tsc+depcruise+7 guardianes+build ok, verificado en app real con N3 salvo la pulsación física; sin commit: lo pide el encargo; `npm run check` entero lo bloquea T-FIX-04) | 2026-10-17 |
| **T-FIX-04** | P1 | Plugin sobrescribe el boton, apariencia bloqueable, previa | w15 Gemini 3.8 Flash | `src/screens/editor/**`, `src/screens/dispositivos/**` (salvo useDockHardwareState), `src/utils/plugins/` ficheros nuevos | `DONE` (check y build en verde; commit hecho; falta pulsar tecla fisica) | 2026-10-17 |
| **T-DK-01** | P1 | Previa LCD duplicada + bloquear personalizacion sin LCD (multi-modelo) | w18 Gemini 3.8 Flash | `src/screens/dispositivos/**` (salvo useDockHardwareState), idiomas `*Dispositivos` | `DONE` (check, build, tsx y cargo test en verde; sin probar en la app) | 2026-10-17 |
| **T-DK-02** | P1 | Perillas: latencia y giros perdidos | w15 agy Claude Sonnet 5.5 | `src/utils/superficies/**`, `electron/main/superficies/**`, `launcher*.ts`, `useDockHardwareState.ts` | `DONE` (check, build, tsx y cargo test en verde; sin probar en la app) | 2026-10-17 |
| **T-AUD-01** | P1 | Audio: boton desconfigurado al agregar dispositivo + estado activo incorrecto | w12 Muse Spark (Go) | acciones de audio, `audio.ts`, `crates/**/audio`, `estadoSistema.ts`, celda (estado activo) | `DONE` (sin commit; check+build+tsx verde, ver HANDOFF) | 2026-10-17 |
| **T-AUD-02** | P2 | Spec del switch de audio + filas de roadmap (solo lectura) | w14 Gemini 4 Argon | `docs/ROADMAP.md` (filas nuevas) | `DONE` (check, build, tsx y cargo test en verde; sin probar en la app) | 2026-10-17 |
| **T-DEP-01** | P2 | Auditoria de depuracion: docs y codigo (solo lectura) | w17 Beam Free | ninguno (informes en `_referencias/informes/`) | `DONE` (check, build, tsx y cargo test en verde; sin probar en la app) | 2026-10-17 |
| **T-AUD-03** | P1 | Activo de audio sin toggle + switch de audio fase 1 | w12 Muse Spark (Go) | `actions.ts`, `acciones/audio.ts`, `pulsarBoton.ts`, `estadoSistema.ts`, celda, formulario audio, `actionData.ts`, `presetsDock.ts`, paridad, wiki | `DONE` (check, build, tsx y cargo test en verde; sin probar en la app) | 2026-10-17 |
| **T-DEP-02** | P2 | Limpieza segura de la auditoria: lote A React/persistencia (w12), B duplicados+Rust (w17), C traduccion (w15) | w12 Muse Spark, w17 Beam Free, w15 agy Sonnet 5.5 | ver `_referencias/encargos/T-DEP-02-limpieza-lotes.md` | `DONE` (check, build, tsx y cargo test en verde; sin probar en la app) | 2026-10-17 |
| **T-ORG-01** | P2 | Reorganizar `electron/main/` por dominio (solo mover) | w12 Muse Spark (Go) | `electron/main/**`, preload (imports), `scripts/**` (rutas), configs | `DONE` (check, build, tsx y cargo en verde) | 2026-10-18 |
| **T-COL-01** | P2 | Unificar los dos selectores de color | w15 Gemini 4 Argon | `ColorPicker.tsx`, `dot480/SelectorColor.tsx`, `components/ui/**`, lineas de import/uso | `DONE` (check, build, tsx y cargo en verde) | 2026-10-18 |
| **T-DOC-02** | P2 | Deuda tecnica al roadmap y docs unificadas | w18 Gemini 3.8 Flash | `docs/**`, README, CONTRIBUTING, `companion-extension/*.md` | `DONE` (roadmap filas 123-125 añadidas, docs extensión y 0.14.1 unificadas, deuda-tecnica borrada, check-wiki verde) | 2026-10-18 |
| **T-PRE-01** | P3 | Proponer imagenes de prensa que sobran (solo lectura) | w17 Beam Free | ninguno | `DONE` (check, build, tsx y cargo en verde) | 2026-10-18 |
| **T-ORG-02** | P2 | Reorganizar `src/screens/editor/` + comentarios con rutas viejas del main | w12 Muse Spark (Go) | `src/screens/editor/**`, imports y comentarios en `src/**`, `scripts/**` (rutas) | `DONE` (check 0 errores 7/7 guardianes, depcruise 504 módulos 0 violaciones, build ok, 5 probar-tsx verdes, editor abierto en app real con 5 secciones y 0 errores de consola; sin commit: lo pide el encargo) | 2026-10-18 |
| **T-DEU-05** | P2 | Partir `formularios/sistema.tsx` (121a) | w19 DeepSeek V4.1 Flash Free | `formularios/sistema.tsx`, `formularios/sistema/**`, rutas en `check-campos`/`check-acciones` | `DONE` (movimiento puro verificado linea a linea por el supervisor; check y build en verde; sin commit) | 2026-10-22 |
| **T-DEU-06** | P2 | Partir `EditorSubdivision2x2.tsx` y `VistaPreviaPiezas.tsx` (121b) | w17 MiMo-V2.6-Flash Free | esos dos + archivos nuevos junto a ellos | `DONE` (movimiento puro verificado por el supervisor; check/build verdes; probado en app) | 2026-10-22 |
| **T-DEU-07** | P2 | Partir `PestanasSuperficie`, `FichaTienda`, `PluginsSection` (123 parte) | w18 agy Gemini 3.8 Flash | esos tres + archivos nuevos junto a ellos | `DONE` (movimiento puro verificado linea a linea por el supervisor; check y build en verde; sin commit) | 2026-10-22 |
| **T-CYC-01** | P1 | Accion generica `cycle` (120 fase 3) | opencode run Kimi K2.7 Code (Go; Muse Spark cayo con "model not found") | ver `_referencias/encargos/T-CYC-01-accion-cycle.md` | `DONE` | 2026-10-22 |
| **T-SEC-07** | P1 | Revision de seguridad de red y codigo ajeno (solo lectura) | w15 agy Gemini 4 Argon | ninguno (informe en `_referencias/informes/`) | `DONE` (17 hallazgos; el supervisor verifico los altos: H-11 y H-01 reales y altos, H-02/H-09 reales pero medios/bajos; H-01, H-02 y H-11 arreglados por el supervisor) | 2026-10-22 |
| **T-SEC-08** | P1 | Endurecimiento acotado H-03/05/07/09/12/13/15/16/17 | opencode run Kimi K2.7 Code (Go) | ver `_referencias/encargos/T-SEC-08-endurecer.md` | `DONE` (revisado linea a linea; el supervisor corrigio 4 regresiones: `*` fuera de PROHIBIDOS, regex del token sin `^`, dominios fc*/fd* bloqueados, statSync que lanzaba; pruebas ampliadas) | 2026-10-22 |
| **T-DOC-03** | P3 | Documentar shims y politicas "no unificar" (124) | w17 MiMo-V2.6-Flash Free | comentarios en `src/types.ts`/`src/data/brandIcons.ts`, `NOTAS-TECNICAS.md`, fila 124 | `DONE` (revisado por el supervisor; check/build verdes) | 2026-10-22 |
| **T-CYC-02** | P2 | Pulir formulario del ciclo con primitivas (SelectorColor, glifos, excluir `cycle`) | w18 agy Gemini 3.8 Flash | `formularios/ciclo.tsx`, `filas/FilaRama.tsx`, claves `ed.cycle.*` | `DONE` (revisado; el supervisor cambio colores fijos por tokens del tema) | 2026-10-22 |
| **T-DEU-08** | P2 | Partir `paginaMando.ts` e `iconosMando.ts` (121e) | w19 DeepSeek V4.1 Flash Free | `electron/main/mando/` (esos dos + nuevos) | `DONE` (HTML del mando identico en 30 combinaciones tema/acento/motor, verificado por el supervisor contra HEAD; check/build verdes) | 2026-10-22 |
| **T-DEU-09** | P2 | Partir `App.tsx` y `MainB.tsx` (123 resto) | opencode run GLM 5.3 Flash Free | esos dos + nuevos en `src/app/`, `src/screens/main/` | `DONE` (verificado por el supervisor contra HEAD; check/build verdes; app real: rejilla, editor y ciclo sin errores) | 2026-10-22 |
| **T-DEU-10** | P3 | 121 (c) `sensors-http.ts` y (d) renombrar `animacionLcd.ts` | w19 DeepSeek V4.1 Flash Free | `sistema/sensors*.ts`, `superficies/animacionLcd.ts` (ahora `gifLcd.ts`) + imports | `DONE` (movimiento puro: HTTP+caché a `sensors-http.ts`, `git mv` al 100 % a `gifLcd.ts`; check 0 errores, build 1,83 s; probado en app real por IPC: `list` 42 nativos, `probe`/`status` con ERR_CONNECTION_REFUSED y `get` igual que antes) | 2026-10-23 |
| **T-CYC-03** | P3 | Presets ciclicos de energia y proyeccion (120) | w17 MiMo-V2.6-Flash Free | `editor/datos/actionData.ts`, `data/presetsDock.ts`, claves de idiomas | `DONE` (revisado; el supervisor cambio el rotulo «SOLO 2.ª» por «EXTERNA» por la fuente del LCD) | 2026-10-23 |
| **T-SEC-09** | P1 | H-08 (endpoints HTTP del companion, frames/s) y H-10 parte segura (CORS de plugins) | opencode run Kimi K2.7 Code (Go) | `companion/servidorCompanion.ts`, `plugins/ventanaPI.ts`, `scripts/probar-cors-plugins.ts` | `DONE` (revisado; el supervisor devolvio la excepcion CORS del puerto propio del plugin, con prueba) | 2026-10-23 |
| **T-DOC-04** | P3 | Propuesta de medios pesados (125), solo lectura | w18 agy Gemini 3.8 Flash | ninguno (informe en `_referencias/informes/`) | `DONE` (recomienda dejarlo como esta; decide el dueño) | 2026-10-23 |
| **T-DK-03** | P2 | PowerShell persistente para perillas sin nucleo (122) | opencode run Kimi K2.7 Code (Go) | `launcher/ps-helpers.ts`, `launcher/psPersistente.ts`, `launcher/launcherBrilloVolumen.ts`, cierre de procesos | `DONE` (revisado; el supervisor arreglo `setVolume`, que fallaba siempre por choque de tipos C#, y la carrera al relanzar) | 2026-10-23 |
| **T-DEU-11** | P3 | knip a cero y NOTAS-TECNICAS del companion | w19 DeepSeek V4.1 Flash Free | `knip.json`, `companion/estadoCompanion.ts`, `companion/limites.ts`, exports sueltos, NOTAS-TECNICAS | `DONE` (w19 se quedo sin mensajes gratis a mitad; el supervisor reviso y termino NOTAS-TECNICAS; knip solo marca 3 devDependencies viejas) | 2026-10-23 |
| **T-OPT-01** | P3 | Qué pesa en el bundle principal (84), solo lectura | w19 GLM-5.3 Flash Free | ninguno (informe en `_referencias/informes/`) | `DONE` (verificado) | 2026-10-25 |
| **T-PLG-AUD** | P3 | Estado real de la lista «Falta» del 83, solo lectura | w1A GLM-5.3 Flash Free | ninguno (informe en `_referencias/informes/`) | `DONE` (verificado) | 2026-10-25 |
| **T-DOC-05** | P3 | Filas 🟡/🚧 del roadmap: código pendiente o solo prueba, solo lectura | w15 agy Gemini 3.8 Flash | ninguno (informe en `_referencias/informes/`) | `DONE` (verificado; 3 de sus 5 sugerencias ya estaban hechas) | 2026-10-25 |
| **T-PLG-04** | P2 | Actualizar plugin en el sitio sin borrar `global.json` (83 f) | w1A GLM-5.3 Flash Free | `electron/main/plugins/instalar.ts`, `descarga.ts`, `src/screens/tienda/ContenidoTienda.tsx`, `scripts/probar-actualizar-plugin.ts` (nuevo) | `DONE` (check y build en verde; prueba pura tsx de 4 escenarios en verde; sin commit: lo pide el encargo; sin probar en la app con plugin real) | 2026-10-25 |
| **T-OPT-02** | P3 | Ajustes y kiosko bajo demanda (84) | w19 DeepSeek V4.1 Flash (Go) | `src/components/TitleBar.tsx`, `src/screens/VistasSecundarias.tsx` | `DONE` (verificado: index 747 -> 670 KiB) | 2026-10-25 |
| **T-OPT-03** | P3 | `react-dom/server` diferido (84) | w19 DeepSeek V4.1 Flash (Go) | `src/components/celda/iconoSvg.tsx`, `src/App.tsx`, `src/utils/superficies/useSuperficies.ts`, `src/screens/editor/previa/piezas/hardware.tsx` | `DONE` (verificado: index 670 -> 601 KiB) | 2026-10-25 |
| **T-PLG-05** | P2 | Imagen del plugin en el mando móvil (83 c) | w1A GLM-5.3 Flash Free | `src/comun/contextoPlugin.ts` (nuevo), `src/utils/plugins/ref.ts`, `electron/main/plugins/` (visualesMando nuevo + validacion, cicloVida, interaccion), `electron/main/mando/` (mandoVivo, iconosMando, pantallaMandoPagina), `scripts/probar-visual-mando.ts` (nuevo), `docs/HANDOFF.md` | `DONE` (check y build en verde; prueba pura tsx de 16 escenarios en verde; paridad sin campo nuevo; sin commit: lo pide el encargo; sin probar en el mando real con plugin que pinte) | 2026-10-25 |
