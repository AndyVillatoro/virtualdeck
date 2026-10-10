# Tablero de Comunicación y Bloqueo Multi-Agente (OpenCode)

Este archivo es el **medio de comunicación activo y sincronización de estado** para los diferentes modelos de IA orquestados por OpenCode sobre VirtualDeck.

---

> Histórico archivado (reclamos DONE anteriores a 2026-10-06 y notas de turnos cerrados): `docs/archivo/AGENT_COMMUNICATION-historico.md`.

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
| **T-PLG-00** | P2 | Prototipo de anfitrión de plugins de Stream Deck, fase 0 (83) | opencode (DeepSeek V4.1 Flash, Go) + supervisor | `electron/main/plugins/**` (nuevo), `index.ts`, `scripts/probar-app.mjs`, `package.json` (ws) | `DONE` (fase 0 medida con 5 plugins reales) | 2026-10-06 |
| **T-REV-01** | P1 | Revisión UI fase 1: rejilla de acciones agrupada sin desborde + catálogo de iconos unificado con grupos + código muerto del editor por pasos (90) | Claude Opus 5.5 (supervisa) + opencode + agy | `src/screens/editor/**`, `src/screens/EditorB.tsx`, `src/components/BrandIconPicker.tsx`, `src/data/iconosDot/**`, `scripts/generar-iconos-dot.mjs`, `scripts/check-acciones.mjs`, idiomas `*Editor`/`*Acciones` | `DONE` (check y build en verde; probado en la app) | 2026-10-06 |
| **T-REV-02** | P1 | Revisión UI fases 2–4: primitivas `src/components/ui/`, tokens (`onAccent`, tipografía, backdrop), oscuro = OLED, desbordes, colores fijos, unicode→glifos, accesibilidad (90) | Claude Opus 5.5 (supervisa) + opencode + agy | `src/design.ts`, `src/index.css`, `src/components/**`, `src/screens/**`, `src/utils/theme.tsx`, `configMigration` | `DONE` (check y build en verde; probado en la app) | 2026-10-06 |
| **T-REV-03** | P1 | Revisión fase 5: núcleo Rust (controles SMTC, TTS, scripts/macros asíncronos con límite, LHM una vez, carátula en caché) (90) | Muse Spark (opencode) | `crates/**`, `electron/main/media.ts`, `sensors.ts`, `launcher.ts`, `macro.ts`, `src/utils/acciones/entrada.ts` | `DONE` (cargo 176 verde, build:native ok, check 0 errores, build ok, medido en app con y sin núcleo) | 2026-10-07 |
| **T-REV-04** | P2 | Revisión fase 6: folder/page-nav en barra flotante y dock, días de la semana en disparadores, docs desactualizadas (90) | Claude Opus 5.5 (supervisa) + opencode | `src/utils/pulsarBoton.ts`, `src/utils/useDisparadores.ts`, `CLAUDE.md`, `docs/**` | `DONE` (check y build en verde; probado en la app) | 2026-10-06 |
| **T-REV-05** | P1 | Revisión fase 7: mojibake en comentarios + complejidad ≤18 en 4 funciones, sin cambiar comportamiento (90) | Muse Spark (opencode) | `electron/main/macro.ts`, `ps-helpers.ts`, `src/utils/actions.ts`, `src/components/settings/SensorsSection.tsx`, `src/components/celda/Subdivision2x2.tsx`, `src/components/ButtonCell.tsx` | `DONE` (sin commit: lo pide el encargo; ver HANDOFF) | 2026-10-07 |
| **T-REV-08** | P1 | Días de la semana en el disparo programado por hora (roadmap 88), encargo `_referencias/encargos/T-REV-08-dias-semana.md` | DeepSeek V4.1 Flash (opencode) | `src/types/config.ts`, `src/utils/useDisparadores.ts`, `src/screens/editor/**` (solo `CampoTimerTrigger`, `valoresIniciales`, `useEstadoEditor`, `guardar`, `SeccionComportamiento`, `EditorB`), `scripts/paridad.json`, `electron/main/galeria.ts`, `electron/main/idioma.ts`, idiomas `*Editor`/`campos`, `docs/wiki/**` | `DONE` (sin commit: lo pide el encargo; ver HANDOFF) | 2026-10-07 |
| **T-REV-11** | P1 | Lápiz sobre la trama, textos que se salen, atajos sugeridos con nombre (99, 97, 96) | agy (wK) | `celda/Insignias`, `CapasDeFondo`, `ButtonCell`, `dispositivos/SelectorPresetsControl`, `describirAccion`, `editor/SeccionPresets` (fichas), `comportamiento/CampoGlobalHotkey`, idiomas `*Comun`/`*Dispositivos` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-12** | P1 | Editor con contexto de dock + Comportamiento vacío (92, 91) | opencode (wN) | `EditorB`, `editor/Cabecera*`, `SeccionComportamiento`, `SeccionAvanzado`, `SeccionApariencia`, `useEstadoEditor`, `useDockPresets`, `PanelInspectorControl`, `presetsDock`, `App.tsx` (montaje del editor), idiomas `*Editor` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-13** | P1 | Contraste automático en las cinco superficies (102) | opencode (wR) | `design.ts`, `src/comun/contraste.ts`, `celda/derivados`, `RotuloCelda`, `pintarTecla`, `paginaMando`/`iconosMando`/`vivoMandoPagina`, `paridad.json` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-14** | P1 | Recordar el monitor de la ventana (103) | Claude Opus 5.5 | `electron/main/windowManager.ts`, `displays.ts`, `trayManager.ts` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-15** | P1 | 2×2 con catálogo + secuencia junto a la acción (93, 94) | opencode wN (DeepSeek, Go) | ver encargo | `DONE` (commit 949e80f) | 2026-10-06 |
| **T-REV-16** | P1 | Vista previa completa (95) | agy (wK) | `editor/VistaPrevia.tsx` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-17** | P1 | Iconos del catálogo en presets, datos (98) | opencode wR | ver encargo | `DONE` (commit f9866a8) | 2026-10-06 |
| **T-REV-18** | P1 | Pulsación que se note, cinco superficies (100) | opencode wN (DeepSeek, Go) | `DotRadialSweep`, `efectosPuntos.js`, `animacionPuntos`, `index.css`, `celda/usePulsacion*`, `colores.ts`, `ButtonCell` (barrido), `useAnimacionLcd`, `tactilMandoPagina`, `estiloMandoPagina` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-19** | P1 | Deslizador vertical DOT (101) | opencode wS (Qwen3.8 Max, Go) | `DotSliderPartes`, `DotContinuousSlider`, `paginaMando.ts` (deslizador), `vivoMandoPagina` | `DONE` (sin commit: lo pide el encargo; ver HANDOFF) | 2026-10-07 |
| **T-REV-20** | P1 | Aplicar icono del catálogo al elegir preset (98) | opencode wV (Kimi K2.7 Code, Go) | `useEstadoEditor`, caminos de preset del dock | `DONE` | 2026-10-07 |
| **T-REV-21** | P2 | Respaldo dentro de Ajustes (104) | opencode wR | `PanelAjustes`, `SeccionPerfiles`, `BotonesNavegacion`, `TitleBar`, `App.tsx` (props), idiomas `*Ajustes` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-REV-22** | P2 | Wiki y galeria.md al día (106) | opencode wT (Fledge, gratis) | `docs/wiki/**`, `docs/galeria.md` | `DONE` (revisado y en la rama) | 2026-10-07 |
| **T-TND-01** | P2 | Quitar la galería de Ajustes, solo tienda (105a) | opencode wR (Muse Spark, gratis) | `src/components/settings/**`, `docs/galeria*`, `docs/wiki/**` | `DONE` (f333e6a) | 2026-10-07 |
| **T-TND-02** | P2 | Tienda con iconos, portada y capturas (105b) | agy wK (Gemini Flash) | `src/screens/tienda/**`, `TiendaB.tsx`, idiomas `*Ajustes` | `DONE` (bd9a8d4) | 2026-10-07 |
| **T-DOCK-01** | P2 | Tres perfiles completos del N3 (62) | opencode wN (Claude Haiku 5.5, Go) | `src/data/presetsDock.ts`, `perfilesDock.ts`, `src/screens/dispositivos/**`, `SeccionPresets`, `useDockPresets`, idiomas `*Editor`/`*Dispositivos` | `DONE` (9bf5233) | 2026-10-07 |
| **T-BAR-01** | P2 | Proponer página 8×2 en formato barra (110) | opencode run Nemotron 3 Ultra (Exo no respondía) | `src/screens/main/**`, `MainB.tsx`, idiomas `*Comun` | `DONE` (f333e6a) | 2026-10-07 |
| **T-DOC-03** | P2 | Wiki de perfiles completos del N3 + timeline SMTC en NOTAS-TECNICAS (encargo en `_referencias/encargos/`) | opencode wT | `docs/wiki/Docks-y-Controladores.md`, `docs/wiki/Docks-and-Controllers.md`, `docs/NOTAS-TECNICAS.md` | `DONE` (check-wiki verde; sin cambios de código) | 2026-10-07 |
| **T-DOC-02** | P2 | CHANGELOG al día con 91–110 | opencode wV (Space Bunny, gratis; LongCat no entregó) | `CHANGELOG.md` | `DONE` | 2026-10-07 |
| **T-MUS-01** | P3 | Investigar barra de progreso SMTC (109) | opencode wT (Fledge, gratis) | solo `_referencias/informes/` | `DONE` (informe revisado) | 2026-10-07 |
| **T-MUS-02** | P2 | Posición/duración de la canción en el núcleo (109), encargo `_referencias/encargos/T-MUS-02-timeline-nativo.md` | opencode wT (Fledge, gratis) | `crates/vd-core/src/media/**`, `crates/vd-node/src/lib.rs`, `src/types/hardware.ts`, `electron/main/media.ts` | `DONE` (f260ad5) | 2026-10-07 |
| **T-MUS-03** | P2 | Investigar panel de música compacto (111) | opencode wR (Muse Spark, gratis) | solo `_referencias/informes/` | `DONE` (informe revisado) | 2026-10-07 |
| **T-WID-01** | P2 | Widgets legibles con fondo propio (112) | opencode wS (LongCat, gratis) | `src/components/dot480/DotContinuousSlider.tsx` | `DONE` (9901bff, sin capturas) | 2026-10-07 |
| **T-MUS-04** | P2 | Barra de progreso en pantalla (109) | opencode wN (Claude Haiku 5.5, Go) | `progresoCancion.ts`, `BarraProgreso.tsx`, paneles de música | `DONE` (f260ad5) | 2026-10-07 |
| **T-MUS-05** | P2 | Panel de música plegable en formato barra (111) | opencode wN (Claude Haiku 5.5, Go) | `src/screens/main/**`, `MainB.tsx`, `config.ts` (musicPanel), idiomas `*Comun` | `DONE` (2a4f021) | 2026-10-07 |
| **T-DOC-04** | P2 | Documentar la tanda de la tarde: CHANGELOG, ROADMAP, tablero y este HANDOFF | opencode wV (Space Bunny, gratis) | `CHANGELOG.md`, `docs/ROADMAP.md`, `docs/AGENT_COMMUNICATION.md`, `docs/HANDOFF.md` | `DONE` (sin commit: lo pide el encargo) | 2026-10-07 |
| **T-PIP-01** | P1 | Prototipo: vídeo de lo que suena en el panel de música (113) | opencode wN (Claude Haiku 5.5, Go) | `electron/main/capturaVentana.ts`, IPC, preload, `src/types/ipc.ts`, `config.ts` (musicPanel), `src/screens/main/**`, idiomas `*Comun` | `CLAIMED` | 2026-10-07 |
| **T-TND-03** | P1 | La tienda anuncia plugins en desarrollo (105c) | agy wK (Gemini Flash) | `src/screens/tienda/**`, idiomas `*Ajustes` | `CLAIMED` | 2026-10-07 |
| **T-ART-01** | P1 | Capturas de prensa de la 0.14 con datos inventados | opencode wR (DeepSeek V4.1 Flash, Go) | `scripts/prensa/**` | `DONE` (4fac5a6) | 2026-10-07 |
| **T-VID-03** | P1 | Montar el tráiler con HyperFrames (107) | agy wK (Gemini Flash) | `_referencias/trailer/**` | `CLAIMED` | 2026-10-07 |
| **T-ART-00** | P1 | Inventario de artes para Store y Pages (106/107) | opencode wT (Fledge, gratis) | solo `_referencias/informes/` | `DONE` (informe revisado) | 2026-10-07 |
| **T-VID-01** | P1 | Arreglar el vídeo del panel de música: mala resolución y congelado si otra ventana tapa el navegador (roadmap 113), encargo `_referencias/encargos/T-VID-01-video-panel.md` | opencode wK (orquesta; hace el trabajo de wR, que no estaba disponible) | `electron/main/capturaVentana.ts`, `electron/main/ipc/capturaIpc.ts`, `electron/main/ipc/index.ts` (solo captura), `src/screens/main/musica/**` (solo vídeo), `src/screens/main/musica/PanelMusicaBarra.tsx` (solo botón VÍDEO), `src/types/ipc.ts` (solo `captura`), idiomas `esComun`/`enComun` (solo `music.video*`) | `DONE` (f669a9e y 6a62854) | 2026-10-08 |
| **T-EXT-01** | P1 | Extensión compañera de navegador (`virtualdeck-companion`) y servidor local (ítem 114) | agy wK + wW (revisión y hardening) | `companion-extension/**`, `electron/main/companion/**`, `companionIpc.ts`, `CompanionSection.tsx`, `useCompanionStream.ts`, `VideoVentana.tsx`, idiomas | `DONE` | 2026-10-09 |
| **T-DOC-05** | P2 | Guía de instalación y protocolo de la extensión compañera | agy wW | `companion-extension/README.md` | `DONE` | 2026-10-09 |
| **T-DOC-06** | P2 | Novedades 0.14.1 visibles y sincronización de ROADMAP (ítems 114 y 115) | opencode w11 | `docs/WHATS_NEW_0.14.1.md`, `docs/ROADMAP.md` | `DONE` | 2026-10-09 |
| **T-DEB-01** | P2 | Auditoría integral de deuda técnica, código duplicado y markdown dispersos para v0.15 | opencode w0 | `docs/deuda-tecnica-v015.md` | `DONE` | 2026-10-09 |
| **T-HW-18** | P1 | Plan de arquitectura y especificación técnica: Stream Deck Plus, Neo y reposo de docks (ítem 115) | agy wW | `docs/investigacion/plan-docks-v015.md` | `DONE` | 2026-10-09 |
| **T-NAV-01** | P2 | Presets ampliados de navegación web (ítem 1.6 de ROADMAP) | opencode w11 | `src/screens/editor/actionData.ts`, `src/screens/editor/formularios/basicos.tsx`, `docs/ROADMAP.md` (apéndice 1.6) | `DONE` (ya implementado en ítems 54/98 — 0 cambios de código; solo marcado ✅ en apéndice 1.6; check 7/7 verde, build 1.71 s) | 2026-10-10 |
| **T-DOCK-02** | P1 | Fase 0 de Docks: interfaces DriverSuperficie y FamiliaSuperficie (ítem 115) | agy wW | `electron/main/superficies/driver.ts`, `dispositivoMirabox.ts` | `DONE` (driver.ts creado, DispositivoMirabox implementa DriverSuperficie, compatibilidad N3 intacta; check 7/7 verde, build 1.54 s) | 2026-10-10 |
| **T-PERF-01** | P2 | Bundle diferido del catálogo de marcas (ítem 4.1 de ROADMAP) | opencode w12 | `docs/ROADMAP.md`, `docs/AGENT_COMMUNICATION.md` | `DONE` — **el encargo partía de una premisa caducada**: `src/components/BrandIconPicker.tsx` no existe (borrado en `3b1a12d`) y el diferido ya estaba hecho desde `9bbe70d`. Sin cambios de código; verificado en el build | 2026-10-10 |
| **T-WID-02** | P1 | Widget música redimensionable con 3 modos adaptativos (16:9 amplio, estándar, vertical en pila) | Antigravity (orquestador) | `PanelMusica.tsx`, `PanelMusicaBarra.tsx`, `PanelesMusica.tsx`, `ManejadorRedimension.tsx`, `CuerpoVideo.tsx`, `CuerpoCaratula.tsx`, `ControlesTransporte.tsx`, `config.ts` | `DONE` | 2026-10-10 |
| **T-VID-02** | P1 | Geometría y centrado de recorte de vídeo (contain scaling sin corte lateral) | Antigravity (orquestador) | `src/screens/main/musica/recorteVideo.ts` | `DONE` | 2026-10-10 |
| **T-DOCK-03** | P1 | Animación de encendido VirtualDeck y borrado de VRAM / splash Mirabox | Antigravity (orquestador) | `electron/main/superficies/dispositivoMirabox.ts`, `animacionInicioDock.ts`, `useSuperficies.ts` | `DONE` | 2026-10-10 |
| **T-EXT-01-fix** | P1 | La extensión no se enfoca en el vídeo: sale la pantalla completa del navegador (encargo `_referencias/encargos/T-EXT-01-enfoque-video.md`) | Antigravity (orquestador) | `companion-extension/**`, `electron/main/companion/**`, `electron/main/ipc/companionIpc.ts`, `src/types/companion.ts`, `src/screens/main/musica/{useCompanionStream,VideoVentana,recorteVideo,useStreamVentana,tamanoCaptura}` | `DONE` (recorte por fracciones y sincronización del rect; check 7/7 verde; **sin verificar en navegador real**) | 2026-10-10 |

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
  - **Documentación de Novedades**: Creado `docs/WHATS_NEW_0.14.1.md` (por `w11`) bilingüe en raíz de `docs/` con las 5 novedades oficiales para visibilidad inmediata del usuario.
  - **Ítem 115 (Compatibilidad Docks Físicos)**: Actualizado `docs/ROADMAP.md` y redactado plan técnico en `docs/investigacion/plan-docks-v015.md` (por `wW`) con arquitectura para Elgato Plus (8 teclas + 4 diales + LCD 800×100), Neo (8 teclas + 2 touchpoints + infobar 248×58) y reposo de docks por inactividad.
  - **Deuda Técnica v0.15**: Auditoría exhaustiva en `docs/deuda-tecnica-v015.md` (por `w0`) con mapa de limpieza segura (archivos >500 líneas, stashes redundantes y poda de `_referencias/` cerradas).
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



---

## 3. Checklist de Entrega de Turno (Handoff Checklist)

Antes de liberar tu turno o enviar tu commit, marca que has cumplido:

- [ ] ¿El código respeta la grilla de 4px y la paleta DOT (`VD_LIGHT` / `#070809`)?
- [ ] ¿Cero emojis en la interfaz?
- [ ] ¿Se ejecutó `npm run check` con 0 errores?
- [ ] ¿Se verificó `npm run build` sin errores de bundle?
- [ ] ¿Se actualizó el estado de la tarea en la tabla a `DONE`?
- [ ] ¿Se dejó un mensaje en el buzón explicando qué se hizo y qué falta?
