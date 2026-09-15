# Handoff entre modelos (OpenCode / VirtualDeck)

Registro de traspaso exigido por `AGENTS.md` (Canal 2). Cada turno actualiza este archivo.

## Turno 2026-09-15 — Estabilizacion del protocolo

* **Modelo saliente:** Muse Spark (OpenCode, modo build).
* **Base git:** `main` en `4b1479b` (`feat: prioridades v0.13.0...`), sincronizado con `origin/main` via `git pull --rebase` (ya estaba al dia, sigue `ahead 1` + 2 untracked).
* **Archivos de este turno:**
  * `AGENTS.md` (nuevo, untracked -> comiteado).
  * `docs/AGENT_COMMUNICATION.md` (nuevo, untracked -> comiteado).
  * `docs/HANDOFF.md` (nuevo, este archivo).
* **Sin cambios de logica:** no se toco `src/` ni `electron/` en este turno.

### Verificacion

* `npm run check`: **0 errores, 46 warnings**.
  * `tsc --noEmit`: ok.
  * `depcruise src electron`: `no dependency violations found (201 modules, 689 dependencies cruised)`.
  * `eslint .`: 46 warnings, 0 errores. Incluye `es.ts (802 lineas)` y `en.ts (802 lineas)` por `max-lines:600`, mas complejidades `>18` en `EditorB (33)`, `MainB (30)`, `App (32)`, `galeria.ts`, `rgb.ts`, etc.
  * `check-i18n.mjs`: `ES/EN 834 claves, FIELDS_EN 235 textos`.
  * `check-acciones.mjs`: `40 tipos, 35 con manejador, 5 los resuelve quien llama, 40 con formulario, 18 presets RGB, 40 elegibles en el paso 1`.
  * `check-ipc.mjs`: `115 canales y 12 eventos, los dos lados cuadran`.
  * `check-wiki.mjs`: `14 paginas, 7 parejas ES/EN, 39 tipos de accion documentados`.
  * `check-campos.mjs`: `62 campos de accion, 59 los lee el ejecutor, todos rellenables`.
  * `check-perfiles.mjs`: `1 revisado(s) contra 40 tipos, 7 widgets, 18 presets RGB, 11 posiciones`.
* `npm run build` (`electron-vite build`): **ok**.
  * `out/main/index.js 219.36 kB`, `out/preload/index.js 13.37 kB`, `out/renderer/assets/index-CuuEbAe_.js 1168.48 kB`.

### Tablero

* `docs/AGENT_COMMUNICATION.md` queda sin cambios de estado en este turno: `T-052..T-055 DONE`, `T-P3A/T-P3B/T-P4/T-P5 READY`.
* No se reclama ninguna tarea de codigo en este turno.

## Turno 2026-09-15 — T-P3A Modularizacion Diccionarios (DONE)

* **Modelo:** Muse Spark, rama `task/p3-idiomas` (desde `main` en `751616d`).
* **Archivos nuevos:** `src/utils/idiomas/esComun.ts`, `esEditor.ts`, `esAcciones.ts`, `esAjustes.ts` y espejos `enComun.ts`, `enEditor.ts`, `enAcciones.ts`, `enAjustes.ts` (dominio por prefijo de clave; máx 329 líneas).
* **Archivos modificados:** `src/utils/idiomas/es.ts` y `en.ts` (ahora solo fusionan con spreads, 22 líneas), `scripts/check-i18n.mjs` (`FRAGMENTOS` + `clavesEnBloque`; el skip del barrido, el chequeo de registro y el de `GLYPHS_5x7` leen fragmentos), `CLAUDE.md` (línea de `i18n.tsx`), `docs/AGENT_COMMUNICATION.md` (`T-P3A DONE` + buzón).
* **Sin cambios de comportamiento:** 0 claves añadidas/eliminadas/renombradas; el orden de fusión es Comun/Editor/Acciones/Ajustes (solo afecta a lectura).

### Verificacion

* `npm run check`: **0 errores, 44 warnings** (antes 46; caen los 2 `max-lines` de `es.ts`/`en.ts`).
  * `tsc --noEmit`: ok. `depcruise`: `no violations (209 modules, 705 dependencies)`.
  * `i18n: ok — ES/EN 834 claves, FIELDS_EN 235 textos` (conteos idénticos a pre-split).
  * `acciones / ipc / wiki / campos / perfiles`: ok, conteos idénticos.
* `npm run build`: **ok** (`main`, `preload`, `renderer` 181 módulos).

## Proximo paso concreto (antes de T-P3A, historico)

* Tomar **`T-P3A Modularizacion Diccionarios Idiomas`** (`src/utils/idiomas/es.ts`, `en.ts`, `scripts/check-i18n.mjs`).
* Antes de editar: reclamar `T-P3A` como `CLAIMED` en `docs/AGENT_COMMUNICATION.md`.
* Ojo: `scripts/check-i18n.mjs:46-59` (`clavesDe`) solo lee `const ES: Dict` / `const EN: Dict` hasta `\n};`. Si se divide en `esAcciones.ts` etc., hay que actualizar esa funcion para fusionar submódulos.
* Tras el cambio: `npm run check` (0 errores) + `npm run build`, luego actualizar tabla a `DONE` y dejar mensaje en el buzon.

## Turno 2026-09-15 — T-P3B Reduccion Complejidad Pantallas (DONE)

* **Modelo:** Muse Spark, rama `task/p3-pantallas` (desde `main` con T-P3A ya fusionado).
* **Archivos nuevos:** `src/screens/editor/botonConfigurado.ts`, `CabeceraEditorB.tsx`, `FranjaPasosEditorB.tsx`, `FormularioPasoEditorB.tsx`; `src/screens/main/atajosSeleccion.ts`, `BarraSuperiorMain.tsx`, `AvisosContextuales.tsx`, `PanelesMusica.tsx`, `CeldaPrincipal.tsx`.
* **Archivos modificados:** `src/screens/EditorB.tsx` (complejidad 33 → sin avisos), `src/screens/MainB.tsx` (30 + flecha 22 → sin avisos), `docs/AGENT_COMMUNICATION.md` (`T-P3B DONE` + buzón).
* **Sin cambios de comportamiento:** mismo JSX/props reordenado; `onSelect` sigue alternando selección; `STEPS` ahora se exporta desde `FranjaPasosEditorB`; `AtajoSeleccion` usa valores en inglés por el guardián i18n.
* **Nota:** `PanelMusicaLateral` va en dos instancias (una por lado) porque el orden en el flex importa.

### Verificacion

* `npm run check`: **0 errores, 41 warnings** (antes 44; caen `EditorB`, `MainB` y la flecha de atajos).
  * `tsc --noEmit`: ok. `depcruise`: sin violaciones.
  * Los 6 guardianes en verde con conteos idénticos.
* `npm run build`: **ok**.

## Turno 2026-09-15 — T-FIX-01 Panel ajustes sticky (DONE)

* **Modelo:** Muse Spark, rama `fix/ajustes-sticky`.
* **Motivo:** con ventana baja o zoom grande, los títulos del acordeón se escondían al hacer scroll y no se sabía qué sección se leía.
* **Cambio:** `SeccionAjustes.tsx` (cabecera `sticky`, `top: -12`, `zIndex: 2`; fuera el `overflow: hidden` de la sección; radios por piezas) y `PanelAjustes.tsx` (`width: min(280px, calc(100vw - 16px))`).
* **Verificación:** `npm run check` 0 errores (41 warnings, sin cambios), 6 guardianes verdes, `npm run build` ok.

## Turno 2026-09-15 — T-FIX-02 Ayuda sin doble colapsable (DONE)

* **Modelo:** Muse Spark, rama `fix/ayuda-doble-colapsable`.
* **Motivo:** la sección Ayuda mostraba dos colapsables con el mismo título (acordeón + toggle heredado interior).
* **Cambio:** `HelpAboutPanel.tsx` sin toggle interior; versión/plataforma se cargan al montar; el sub-colapsable de créditos queda igual.
* **Verificación:** `npm run check` 0 errores (41 warnings, sin cambios), 6 guardianes verdes, `npm run build` ok.

## Turno 2026-09-15 — T-P4 Fase 1 Tienda: modelo + main (DONE)

* **Modelo:** Muse Spark, rama `task/p4-tienda` (fusionada a main).
* **Modelo v2:** `EntradaGaleria` con `kind`/`version`/`minAppVersion`/`targetApp`/`requires` (compatible v1); `ResumenRiesgo` con `automaticos` e `integraciones`; `OrigenInstalacion` sellado en `PageConfig`/`Profile`.
* **Main:** `resumirRiesgo` descompuesto (`mirarDirectas/Macro/PasoMacro/Integraciones/Hijas/Boton`) + recorre `subButtons` y clics de macro; fragmentos por `tm()` (13 claves nuevas en `idioma.ts` ES/EN).
* **Renderer:** `appendPageFromGallery` (sanea, remapea, limpia hotkeys en choque, sella origen, deshacer `undo.appendPage`); `GallerySection` con flujo de páginas (`FilaEntradaGaleria`, `FichaRiesgoGaleria`), bloqueo por `minAppVersion`, insignias y aviso de hotkeys; cadena `App→MainB→Barra→TitleBar→PanelAjustes`.
* **Guardianes:** `check-perfiles.mjs` valida shape `{page, buttons}` y recorre carpetas/cuadrantes; ejemplo `pages/obs-mini.json` + entrada v2 en el manifiesto; `package.json check` cubre `pages/`. Preload sin tercera copia de tipos.
* **Docs:** `galeria.md` con spec v2.
* **Verificación:** `npm run check` 0 errores (39 warnings, antes 41), 6 guardianes verdes (`perfiles: 2 revisados`), `npm run build` ok.

## Turno 2026-09-15 — T-P5 Lazy marcas + Store MSIX (DONE)

* **Modelo:** Muse Spark, rama `task/p5-tienda` (fusionada a main).
* **Lazy marcas:** `brandIconTypes.ts` + `utils/catalogoMarcas.ts` (holder `import()` + `useCatalogoMarcas` + `iconoDeCatalogo` + `precargarCatalogoMarcas` como API de preload); Display/Picker/Editor/PasoEstilo/helpers consumen diferido con fallback (`brand.loading` ES/EN); `celdaDesdeFraccion` + `ICON_SIZE` viven en tipos. Índice −37KB, chunk `brandIcons` (38KB) aparte. Deuda propia dejada en cero (Editor 24, PasoEstilo 27<29).
* **Store MSIX:** `build-store.mjs` con `--bump patch|minor|major` (sincroniza lock), `--check-only`, `--preflight`, `--skip-assets/--skip-build`, validaciones previas (appx, extensions, makeappx, CHANGELOG, git) y ficha `dist/store-submission-VERSION.md`. Probado: check-only OK + bump/validación en fixture (positivo y negativo).
* **Verificación:** `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes, `npm run build` ok.

## Turno 2026-09-15 — T-P4 Fase 2 Tienda en ventana propia (DONE)

* **Modelo:** Muse Spark, rama `task/p4-tienda-f2` (fusionada a main).
* **Ventana:** `electron/main/tienda.ts` (abrir/enfocar/cerrar, 980×680, hash `#tienda` en `main.tsx`) + `ipc/tiendaIpc.ts` registrado en `ipc/index.ts`; `config:save` reavisa a la tienda.
* **UI:** `TiendaB` + `screens/tienda/` (`ContenidoTienda`, `BarraTienda`, `ListaTienda`, `FichaTienda`, `tiendaUtils`); `gallery:readme` en main+preload; `readme`/`readmeUrl` en `EntradaGaleria` (main y renderer); 19 claves `tienda.*` + `gal.openStore*` ES/EN; botón ABRIR TIENDA en `GallerySection` (+ insignia opcional en `FilaEntradaGaleria`).
* **Relay:** `utils/tiendaAplicar.ts` + efecto en `App` (`onAplicar` → validar/aplicar → `tienda:resultado`); `PedidoTienda`/`ResultadoTienda`/`InstaladoTienda` en `types/config.ts` + `api.tienda` en `types/ipc.ts` y preload.
* **Verificación:** `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes (`i18n 865 claves`, `ipc 121 canales y 14 eventos`), `npm run build` ok. Lógica pura ejecutada en node (19 aserciones).
* **Notas:** canales en inglés por el guardián (`tienda:import/apply`); `GALERIA_OFICIAL`+semver viven en `utils/galeriaComun.ts` por las capas; la tienda nunca escribe config.

## Turno 2026-09-15 — T-FIX-03 Higiene pre-release (DONE)

* **Modelo:** Muse Spark, rama `task/fix-higiene-prerelease` (fusionada a main).
* **Cambios:** `ROADMAP.md` al día (matriz P1–P5 DONE, iteración 4 ✅ lado app, 6.1 con repo diferido); `galeria.md` anota el diferimiento; `compararVersiones` y `precargarCatalogoMarcas` privatizadas (knip limpio de huella propia).
* **Verificación:** `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes, `npm run build` ok.

## Turno 2026-09-15 — T-FIX-04 Docs galería (repo existe) (DONE)

* **Modelo:** Muse Spark, rama `task/fix-galeria-docs` (fusionada a main).
* **Hallazgo:** el repo público existe (4 perfiles v1); los docs decían "pendiente de crear".
* **Cambios:** solo docs (`galeria.md`, `ROADMAP.md` ×3): existe, validado en vivo, diferido versionado v2 + curation.
* **Verificación:** `npm run check` 0 errores, 6 guardianes verdes; `npm run check:galeria` en vivo ok (4 revisados).

## Turno 2026-09-15 — T-FIX-05 Carátula + mando móvil + solo bandeja (DONE)

* **Modelo:** Muse Spark, rama `task/fix-prerelease-ui` (fusionada a main).
* **Carátula** (`screens/main/PanelMusica.tsx`): transporte dentro de la cover (franja inferior `rgba(7,8,9,0.78)` + glifos dot, 52/64px); eliminada la fila separada; `flexShrink: 0`; comentario actualizado.
* **Mando móvil** (`RemoteSection.tsx`, `esAjustes.ts`, `enAjustes.ts`): tuteo fuera (3 claves a usted/neutro), 3 claves muertas eliminadas ES+EN, tarjeta densa (9px 10px, gap 8, URL 12px).
* **Bandeja** (`windowManager.ts`, `trayManager.ts`, `index.ts`): `skipTaskbar: true` + 3 `setSkipTaskbar(false)` fuera; verificado que `window:minimize` es `hide()` y que las 4 rutas de mostrar (bandeja, second-instance, deep-link, arranque) no dependen del taskbar.
* **Verificación:** `npm run check` 0 errores, 6 guardianes verdes (`i18n 862`), `npm run build` ok. Sin display aquí: sin captura de verificación.

## Turno 2026-09-15 — T-FIX-06 RGB reescaneo real (DONE)

* **Modelo:** Muse Spark, rama `task/fix-rgb-rescan` (fusionada a main).
* **Causa:** el botón llamaba a `refresh` (relee lista vieja), sin busy ni toast; `requestRescan()` del SDK sin usar en todo el repo.
* **Cambios:** `rgb.rescanDevices()` + `rgb:rescan` (main/preload/tipos) + `handleRescan` con busy y toast + `rgb.rescanned/rescanFailed` (ES/EN) + `rgb.sinConexion` (`idioma.ts` ES/EN).
* **Verificación:** `npm run check` 0 errores, 6 guardianes verdes (`i18n 864`, `ipc 122+14`), `npm run build` ok. Sin OpenRGB aquí: camino con hardware no ejecutado.

## Turno 2026-09-15 — T-FIX-07 RGB calibrador auto + picker commit (DONE)

* **Modelo:** Muse Spark, rama `task/fix-rgb-picker-calib` (fusionada a main).
* **Calibrador:** `refresh` devuelve la lista; `handleRescan` abre el calibrador si hay zonas sin calibrar (`zonasSinCalibrar` pura en módulo), si no toast.
* **Picker:** `onCommit` en `ColorPicker` (soltar/hex), `DeviceDetail` con `onChange` local + efecto solo `[device.id]`.
* **Verificación:** `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes, `npm run build` ok. Sin hardware: no ejecutado contra servidor.

## Turno 2026-09-15 — T-REL-013 Release v0.13.0 (DONE)

* **Modelo:** Muse Spark, rama `task/release-v0-13-0` (fusionada a main) + tag `v0.13.0` pusheado.
* **Cambios:** CHANGELOG 0.13.0; bump minor (package + lock); Pages a 0.13.0.
* **Artefactos (local, `dist/`):** `VirtualDeck-Setup-0.13.0.exe` (80.3MB) + `.blockmap` + `latest.yml` fresco; `VirtualDeck-0.13.0.msix` (116.6MB) + `store-submission-0.13.0.md`.
* **GitHub:** release v0.13.0 publicado con exe + blockmap + latest.yml (auto-update encadenado).
* **Verificación:** `npm run check` 0 errores, 6 guardianes verdes.

## Turno 2026-09-15 — T-REL-014 Corrección notas 0.13.0 (DONE)

* **Modelo:** Muse Spark, rama `task/fix-release-notes` (fusionada a main).
* **Cambios:** CHANGELOG sin rescan + faltantes (Dot Sweep, 5×7, portapapeles, PIN, Rust, Discord/Spotify) + bandeja como fix; ficha dist con texto corto; notas del release GH actualizadas.
* **Sin código:** sin rebuild, sin retag (tag sigue en el commit del release).

## Proximo paso concreto

* Nada pendiente salvo diferidos del dueño: galería completa y fino del escáner RGB (otra versión).

## Proximo paso historico (T-P3B, hecho)
