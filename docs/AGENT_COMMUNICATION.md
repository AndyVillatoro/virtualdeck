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

---

## 3. Checklist de Entrega de Turno (Handoff Checklist)

Antes de liberar tu turno o enviar tu commit, marca que has cumplido:

- [ ] ¿El código respeta la grilla de 4px y la paleta DOT (`VD_LIGHT` / `#070809`)?
- [ ] ¿Cero emojis en la interfaz?
- [ ] ¿Se ejecutó `npm run check` con 0 errores?
- [ ] ¿Se verificó `npm run build` sin errores de bundle?
- [ ] ¿Se actualizó el estado de la tarea en la tabla a `DONE`?
- [ ] ¿Se dejó un mensaje en el buzón explicando qué se hizo y qué falta?
