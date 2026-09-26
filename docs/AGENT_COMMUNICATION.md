# Tablero de Comunicación y Bloqueo Multi-Agente (OpenCode)

Este archivo es el **medio de comunicación activo y sincronización de estado** para los diferentes modelos de IA orquestados por OpenCode sobre VirtualDeck.

---

## 1. Registro de Reclamo de Tareas (Task Claims)

Antes de que un modelo empiece a editar archivos, debe registrar su asignación aquí para evitar conflictos de edición simultánea:

| ID | Prioridad | Tarea / Módulo | Modelo / Agente Asignado | Archivos Bloqueados | Estado | Actualizado |
|---|-----------|----------------|--------------------------|---------------------|--------|-------------|
| **T-SEC-01** | **P0** | Electron: quitar `no-sandbox` global + `setWindowOpenHandler`/`will-navigate` | space-bunny-free | `electron/main/index.ts`, `windowManager.ts`, `tienda.ts`, `floatingBar.ts`, `seguridadVentana.ts` (nuevo) | `DONE` ✅ | 2026-09-26 |
| **T-SEC-02** | **P0** | Electron: traversal en el handler `vd://` + `img-src` sin `file:`/`https:` | (sin asignar) | `electron/main/index.ts`, `index.html` | `PENDING` | 2026-09-26 |
| **T-SEC-03** | **P1** | Inyección en numéricos de `macro.ts` + `case 'delay'` ausente en el resumen de riesgos de galería | (sin asignar) | `electron/main/macro.ts`, `ipc/macroIpc.ts`, `galeria.ts` | `PENDING` | 2026-09-26 |
| **T-SEC-04** | **P1** | Allowlist de esquema en los dos `shell.openExternal` (`launch:url`, `spotify:playUri`) | (sin asignar) | `ipc/launcherIpc.ts`, `electron/main/spotify.ts` | `PENDING` | 2026-09-26 |
| **T-SEC-05** | **P1** | XSS almacenado en origen LAN: validar `fgColor`/`customGlyph57` antes del `innerHTML` | (sin asignar) | `electron/main/paginaMando.ts` | `PENDING` | 2026-09-26 |
| **T-IDT-01** | P1 | Redacción forward-only de identidad (el historial NO se reescribe) | (sin asignar) | `CHANGELOG.md`, `ipc/appIpc.ts`, `macro.ts`, `docs/MIGRACION-RUST.md`, `package.json`, `Cargo.toml` | `PENDING` | 2026-09-26 |
| **T-IDT-02** | P1 | Sanear config de orquestación/agy en docs versionados | (sin asignar) | `AGENTS.md`, `docs/AGENT_COMMUNICATION.md`, `docs/HANDOFF.md`, `docs/EXPORTAR-CONFIG.md`, `scripts/export-opencode-config.ps1` | `PENDING` | 2026-09-26 |
| **T-UTL-01** | P2 | Tranche SAFE de `src/utils`: extraer bloque ×4 de `pulsarBoton`, comentarios huérfanos, `sensors.tsx`→`.ts`, repoint de `interpolate` | (sin asignar) | `src/utils/pulsarBoton.ts`, `useDeck.ts`, `estadoSistema.ts`, `sensors.tsx`, `formatos.ts` | `PENDING` | 2026-09-26 |
| **T-UTL-02** | P2 | Mergear `acciones/media.ts` en `terceros.ts` — **arregla el bug de now-playing desactualizado** | (sin asignar) | `src/utils/acciones/media.ts`, `acciones/terceros.ts` | `PENDING` | 2026-09-26 |
| **T-UTL-03** | P3 | Re-verificar el recuento de claves i18n muertas antes de borrar nada (el dato previo no es fiable) | (sin asignar) | `src/utils/idiomas/**`, `scripts/check-i18n.mjs` | `PENDING` | 2026-09-26 |
| **T-UTL-04** | P3 | Partir `useDeck.ts` (644 L) en 5 hooks por responsabilidad; `App.tsx` no debe cambiar | (sin asignar) | `src/utils/useDeck.ts` | `PENDING` | 2026-09-26 |
| **T-AGY-01** | P2 | Integración global Gemini-vía-agy (wrapper + docs) | big-pickle | `.config/opencode/AGENTS.md`, `.config/opencode/bin/agy-gemini.ps1`, `.config/opencode/agents/orchestrator.md`, `docs/AGENT_COMMUNICATION.md`, `docs/HANDOFF.md` | `DONE` ✅ | 2026-09-19 |
| **T-052** | P1 | Modo Claro Anti-Glare | Claude / Gemini Pair | `design.ts`, `index.css` | `DONE` ✅ | 2026-09-14 |
| **T-053** | P1 | Acordeón Colapsable Ajustes | Claude / Gemini Pair | `PanelAjustes.tsx`, `SeccionAjustes.tsx`, `SeccionPerfiles.tsx` | `DONE` ✅ | 2026-09-14 |
| **T-054** | P1 | Presets Web Ampliados | Claude / Gemini Pair | `actionData.ts`, `formularios/basicos.tsx` | `DONE` ✅ | 2026-09-14 |
| **T-055** | P2 | Hardening Spotify & Discord | Claude / Gemini Pair | `discord.ts`, `spotify.ts`, `terceros.ts`, `SeccionIntegraciones.tsx` | `DONE` ✅ | 2026-09-14 |
| **T-P3A** | P3 | Modularización Diccionarios Idiomas | Muse Spark | `es.ts`, `en.ts`, `es*.ts`, `en*.ts`, `check-i18n.mjs` | `DONE` ✅ | 2026-09-15 |
| **T-P3B** | P3 | Reducción Complejidad Pantallas | Muse Spark | `EditorB.tsx`, `MainB.tsx` (+ piezas en `editor/`, `main/`) | `DONE` ✅ | 2026-09-15 |
| **T-P4**  | P4 | Tienda plugins/perfiles (Fase 1: modelo+main) | Muse Spark | `galeria.ts`, `config.ts`, `GallerySection.tsx`, `useDeck.ts`, `check-perfiles.mjs` | `DONE` ✅ | 2026-09-15 |
| **T-P5**  | P5 | Lazy Loading Iconos de Marca + Store MSIX | Muse Spark | `brandIcons.ts`, `BrandIconPicker.tsx`, `build-store.mjs` | `DONE` ✅ | 2026-09-15 |
| **T-P4-F2** | P4 | Tienda: ventana #tienda (buscador/filtros/ficha/updates) | Muse Spark | `tienda.ts`, `TiendaB.tsx`, `tiendaAplicar.ts` | `DONE` ✅ | 2026-09-15 |
| **T-REL-014** | - | Corregir notas 0.13.0 (sin rescan, faltantes incluidos) | Muse Spark | `CHANGELOG.md`, release GH | `DONE` ✅ | 2026-09-15 |
| **T-REL-013** | - | Release v0.13.0: bump+changelog+tag+installer+MSIX+Pages | Muse Spark | `package.json`, `CHANGELOG.md`, `docs/index.html` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-07** | - | RGB: auto-calibrador tras rescan + picker con commit | Muse Spark | `RGBManagerB.tsx`, `ColorPicker.tsx`, `piezas.tsx` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-06** | - | RGB: reescaneo real (requestRescan + busy + toast) | Muse Spark | `rgb.ts`, `rgbIpc.ts`, `RGBManagerB.tsx` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-05** | - | Pre-release UI: carátula visible + mando móvil DOT + solo bandeja | Muse Spark | `PanelMusica*`, `SeccionRemot*`, `windowManager.ts` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-04** | - | Docs galería: el repo público ya existe (verificar + actualizar) | Muse Spark | `galeria.md`, `ROADMAP.md` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-03** | - | Higiene pre-release: ROADMAP al día + knip sin huella propia | Muse Spark | `ROADMAP.md`, `galeriaComun.ts`, `catalogoMarcas.ts` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-01** | - | Panel ajustes: cabeceras sticky + ancho responsive | Muse Spark | `SeccionAjustes.tsx`, `PanelAjustes.tsx` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-02** | - | Ayuda: quitar colapsable interior duplicado | Muse Spark | `HelpAboutPanel.tsx` | `DONE` ✅ | 2026-09-15 |
| **T-WEB-01** | - | Landing Pages: rediseño DOT 480 OLED + registro de features | Muse Spark | `docs/index.html` | `DONE` ✅ | 2026-09-15 |
| **T-WEB-02** | - | Landing: botón Store solo contorno + ES/EN en secciones y tabs | Muse Spark | `docs/index.html` | `DONE` ✅ | 2026-09-15 |

> **Estados posibles**:
> - `READY`: Disponible para ser tomada por cualquier modelo.
> - `CLAIMED`: Reclamada por un modelo; otros modelos no deben tocar los archivos listados.
> - `IN_PROGRESS`: Código siendo modificado y probado.
> - `VERIFYING`: Ejecutando `npm run check` y `npm run build`.
> - `DONE`: Completado, verificado con 0 errores y comiteado en git.

---

## 2. Buzón de Mensajes Inter-Agente (Message Log)

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-WEB-01 DONE)
- **Contexto**: rediseño de la landing de Pages (`docs/index.html`, 1236 → 719 líneas) a DOT 480 OLED: fuera azul IA `#4a8ef0`, blurs y Three.js por CDN; acento `RED #FF3B30`, consola DOT de 12 teclas (CSS puro + HUD + clic), y sección `[03 · REGISTRO]` que renderiza features desde el array `FEATURES` (v0.13.0 ×12 + v0.12.0 ×6, sin fixes). Próxima feature = añadir objeto al array (plantilla comentada en el código).
- **Pruebas**: `npm run check` 0 errores (39 warnings preexistentes en `src/`, sin tocar), 6 guardianes verdes. Escaneo de prohibidos (`4a8ef0`, `blur(`, `three`, `unpkg`): 0 coincidencias.
- **Recomendación**: commit directo en `main` (solo Pages, sin código). Publicar = push a `main` (Pages sirve `/docs`).

Utiliza este apartado para dejar mensajes, advertencias técnicas o instrucciones específicas para el siguiente modelo que continúe el trabajo:

### [2026-09-26] De: space-bunny-free → Para: Siguiente Modelo (T-SEC-01 DONE)
- **Qué se hizo:** los 2 CRIT de §4 de la auditoría. (1) `index.ts`: fuera `appendSwitch('no-sandbox')` **y** `appendSwitch('disable-gpu-sandbox')` (los dos venían del commit `ea94139` de la landing 3D, sin relación con el problema de los tiles negros); se queda `disableHardwareAcceleration()`, que es el arreglo real y no toca seguridad. (2) Nuevo `electron/main/seguridadVentana.ts` (`asegurarVentana` / `asegurarWebContents`): `setWindowOpenHandler` → `deny` total, `will-navigate` y `will-redirect` con allowlist por origen (el `index.html` propio en `file:` o el origen de vite en dev; los cambios de hash no disparan evento, así que `#barra`/`#tienda` no se rompen) y `will-attach-webview` → `preventDefault`. Cableado en las 3 ventanas + red de seguridad `app.on('web-contents-created')` en `index.ts` (excluye `devtools://`).
- **Hallazgo extra (no estaba en la auditoría):** los 3 `webPreferences` tenían **`sandbox: false`**, que es lo que de verdad apagaba el sandbox del renderer — la bandera global era redundante para ellas. Como el preload solo usa `contextBridge` + `ipcRenderer` (verificado también en el bundle: un único `require("electron")`), se puso **`sandbox: true`** en las 3. Con eso el sandbox queda puesto de verdad, no solo la bandera global.
- **Por qué `deny` y sin reenviar a `openExternal`:** no hay ni un `target="_blank"` ni un `window.open()` en el renderer; los enlaces externos van por `launch:url`, que es donde toca la allowlist (T-SEC-04). Reenviar aquí abriría un segundo `openExternal` sin validar.
- **Pruebas:** `npm run check` **0 errores, 40 warnings** (39 previos + 1 de `opencode-export/`, que está sin versionar a propósito); los 6 guardianes verdes; `npm run build` ok. En el bundle: 0 `no-sandbox`, `sandbox: true` ×3, `setWindowOpenHandler` presente.
- **Arranque verificado de verdad:** `npx electron . --user-data-dir=<tmp>` con `VD_DIAG=1` (el `npm run dev` normal no vale aquí: la app del Store está corriendo y su `lockfile` en `%APPDATA%\virtualdeck` hace que la de desarrollo salga sola por instancia única). Resultado: `[arranque] ventana visible a los 354 ms`, `[diag] DOM: {"nodos":2319,…}`, captura de 1650×1080 — **el preload carga con el sandbox puesto** y el renderer monta. Sin errores de GPU ni de caché (los que salían antes eran de la colisión de `userData`).
- **Lo que no se ha probado:** la barra flotante y la tienda no se abrieron en esa prueba (config nueva, todo en onboarding). El guard se basa en origen y los cambios de hash no emiten `will-navigate`, pero un clic del dueño las abre es lo que falta.
- **Sigue abierto:** T-SEC-02 (`vd://` traversal + CSP de `index.html`) es el siguiente P0. La incertidumbre §4.3.1 de la auditoría (si `window.open()` hereda el preload) queda **sin efecto**: con `deny` el resultado es el mismo haya herencia o no, así que no hace falta ejecutarlo.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (CIERRE SESIÓN post-0.13.0)
- **Contexto**: T-REL-014 fusionada a `main` (`6764367`). Después: bloque EN en ficha dist + corrección de la Description de Partner Center (externa al repo) + release GH ya con notas ES corregidas.
- **Estado**: `main` limpio, tag `v0.13.0` fijo, release publicado. Pendiente solo el dueño en Partner Center + diferidos (galería, RGB fino).
- **Recomendación**: próxima sesión parte de este HANDOFF; no rebuild/retag salvo cambio de código.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-REL-014 DONE)
- **Contexto**: el dueño corrigió las notas (rescan fuera por no quedar bien; faltaban Dot Sweep, editor 5×7, portapapeles, PIN kiosko, Rust, acciones Discord/Spotify; bandeja como fix). Rama `task/fix-release-notes`: CHANGELOG corregido, ficha `dist/store-submission-0.13.0.md` con texto corto, `gh release edit` con notas nuevas. Sin cambios de código: sin rebuild ni retag.
- **Recomendación**: nada pendiente salvo diferidos (galería completa, escáner RGB fino).

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-REL-013 DONE)
- **Contexto**: release v0.13.0 publicado. CHANGELOG con Added/Changed/Fixed desde 0.12.0; `build-store --bump minor`; Pages a 0.13.0 (+ ficha de tienda); commit `chore(release)` en main + tag `v0.13.0` pusheados; NSIS 80.3MB + blockmap + latest.yml fresco; MSIX 116.6MB + ficha `dist/store-submission-0.13.0.md`; `gh release create` con los 3 assets (auto-update encadenado). Nota: `build-store` no tiene `--help` (dispara build); no volver a llamarlo a ciegas.
- **Pruebas**: `npm run check` 0 errores (39 warnings), 6 guardianes verdes. Installer y MSIX generados en esta máquina.
- **Recomendación**: pendiente del dueño en Partner Center: subir MSIX + pegar novedades + notas runFullTrust. Galería pública y escáner RGB fino, diferidos.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-07 DONE)
- **Contexto**: dos reportes RGB, rama `task/fix-rgb-picker-calib` (fusionada a main). (1) Tras reescanear no se abría nada: `refresh` ahora devuelve la lista y `handleRescan` abre el calibrador (conteo LEDs) si hay zonas sin calibrar, si no toast con la cuenta. (2) Picker trabado: cada píxel mandaba al hardware + releía y el efecto devolvía el selector al color del aparato. Ahora `ColorPicker` separa `onChange` (local, por píxel) de `onCommit` (al soltar; hex directo confirma al momento) y `DeviceDetail` solo sincroniza por aparato (`[device.id]`, con disable-explicado). `BrandColorPicker` no se toca (local, sin bug).
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes. `npm run build` ok. Sin hardware OpenRGB aquí: camino con servidor no ejecutado.
- **Recomendación**: listo para release v0.13.0.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-06 DONE)
- **Contexto**: el botón reescanear solo releía la lista vieja (sin busy ni toast: parecía no hacer nada) y el servidor nunca recibía `requestRescan()` (existe en el SDK, sin usar). Rama `task/fix-rgb-rescan` (fusionada a main): `rgb.rescanDevices()` (rescan + espera a que cambie la cuenta, tope 8s + relectura total de zonas/LEDs), canal `rgb:rescan` (main+preload+tipos), `handleRescan` con busy y toast (`rgb.rescanned/rescanFailed`), clave `rgb.sinConexion` en `idioma.ts` ES/EN.
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes (i18n 864, ipc 122+14). `npm run build` ok. Sin hardware OpenRGB aquí: el camino con servidor no se ejecutó, solo tipos/guardianes.
- **Recomendación**: listo para release v0.13.0.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-05 DONE)
- **Contexto**: reporte con captura, rama `task/fix-prerelease-ui` (fusionada a main). (1) Carátula: transporte (prev/play/next) dentro de la cover en franja inferior DOT (`PanelMusica`, botones 52/64, `flexShrink: 0`); fuera la fila separada (~90px menos de panel). (2) Mando móvil: 3 claves ES a usted/neutro + 3 claves muertas fuera (`remoteLan`, `remotePairNeedsLan`, `remotePairHint`, ES+EN); tarjeta más densa. (3) Solo bandeja: `skipTaskbar: true` en creación + fuera los 3 `setSkipTaskbar(false)` (dom-ready, bandeja, second-instance); `window:minimize` ya era `hide()`, así que no hay ventana inalcanzable.
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes (i18n 862 por las claves muertas). `npm run build` ok. Sin verificación visual en app (sin display aquí): pendiente clicar del lado del dueño.
- **Recomendación**: listo para release v0.13.0.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-04 DONE)
- **Contexto**: el dueño avisó de que el repo público existe. Verificado: `manifest.json` sirve 4 perfiles v1 (esencial, streaming, trabajo, rgb) y `npm run check:galeria` da verde (4 revisados, 40 tipos). Docs actualizados (`galeria.md` Estado actual + `ROADMAP` iteración 4 / matriz P4 / 6.1): existe, falta clicarlo en la app y versionarlo a v2. Solo docs, sin tocar código.
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes + `check:galeria` en vivo ok.
- **Recomendación**: listo para release v0.13.0. En el repo-galería (otro repo) faltaría `version` por entrada para activar los UPDATE.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-03 DONE)
- **Contexto**: higiene pre-release en rama `task/fix-higiene-prerelease` (fusionada a main). ROADMAP al día: matriz P1–P5 marcada DONE con fechas, iteración 4 en ✅ (lado app), 6.1 con repo diferido; `galeria.md` anota el diferimiento. knip sin huella propia: `compararVersiones` y `precargarCatalogoMarcas` privatizadas (el preload externo no aportaba: el hook ya carga al montar el paso de estilo).
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes. `npm run build` ok. `lint:dead` ya no lista archivos propios.
- **Recomendación**: listo para release v0.13.0. Galería pública diferida por decisión del dueño.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-P4-F2 DONE)
- **Contexto**: Fase 2 en rama `task/p4-tienda-f2` (fusionada a main). Ventana `#tienda` (patrón `#barra`): `electron/main/tienda.ts` + `ipc/tiendaIpc.ts` (`tienda:open/close/isOpen/import/resultado`, eventos `tienda:apply/hecho`); `TiendaB` + piezas `tienda/` (buscador, filtros tipo/app/tags, ficha con README inline/`readmeUrl` vía `gallery:readme`, insignias INSTALADO/UPDATE desde `origen`); la tienda no escribe — `tiendaAplicar.ts` valida y aplica en la principal (misma forma + `tiposDesconocidos` que la empotrada); cada `config:save` reavisa a la tienda. Canales en inglés por el guardián i18n (`tienda:import/apply`, no `importar/aplicar`). `GALERIA_OFICIAL`+semver a `utils/galeriaComun.ts` (components no puede importar de screens).
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes (i18n 865, ipc 121+14). `npm run build` ok. Lógica pura ejecutada: 19 aserciones (versiones, estados, filtros, instalados).
- **Recomendación**: backlog P1-P5 + tienda completos. Siguiente: release v0.13.0 (hay `feat:` acumulado → MINOR; CONTRIBUTING: bump + CHANGELOG + tag + installer + `latest.yml`/`.blockmap`).

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-P5 DONE)
- **Contexto**: T-P5 en rama `task/p5-tienda` (fusionada a main). (1) Lazy marcas: `brandIconTypes.ts` (tipos+geometría) + `utils/catalogoMarcas.ts` (`import()` + hook); Display/Picker/Editor/PasoEstilo consumen diferido con fallback; índice −37KB, chunk `brandIcons` propio. (2) `build-store.mjs`: `--bump`, `--check-only`, `--preflight`, `--skip-assets/build`, validaciones previas y ficha `dist/store-submission-VERSION.md` (probado en fixture). AGENTS apuntaba a `docs/STORE.md` inexistente → `docs/MICROSOFT-STORE.md`.
- **Pruebas**: `npm run check` 0 errores (39 warnings, igual), 6 guardianes verdes. `npm run build` ok. `build-store --check-only` OK en esta máquina.
- **Recomendación**: backlog P1-P5 vacío. Siguiente: T-P4 Fase 2 (ventana `#tienda`) o release v0.13.0 (hay `feat:` acumulado → MINOR según CONTRIBUTING).

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-P4 Fase 1 DONE)
- **Contexto**: Fase 1 en rama `task/p4-tienda` (fusionada a main). Manifiesto v2 (`kind` page/profile, `version`, `minAppVersion`, `targetApp`, `requires`, compatible v1); páginas sueltas instalables (`appendPageFromGallery`: sanea, remapea ids, limpia hotkeys en choque y lo cuenta, sella `origen`); `resumirRiesgo` con `automaticos` (timers/sensores) e `integraciones` (tts/kill/clipboard/audio/region/discord/spotify) vía `tm()` + recorre `subButtons`; `tiposDesconocidos` y `check-perfiles.mjs` con la misma cobertura + shape `{page, buttons}`; tipos del preload unificados (`type X = ...`, se acabó la tercera copia); ejemplo `pages/obs-mini.json` cubierto por `npm run check`.
- **Pruebas**: `npm run check` 0 errores (39 warnings, antes 41), 6 guardianes verdes. `npm run build` ok.
- **Recomendación**: Fase 2 = ventana `#tienda` con buscador/filtros/ficha + aviso de updates (leer `origen` guardado). Ojo: `GallerySection`/`mirar` estaban al límite de complejidad — cualquier añadido va en pieza nueva.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-02 DONE)
- **Contexto**: reporte de usuario — `HelpAboutPanel` traía su propio colapsable con el mismo título dentro de la sección acordeón. Fix en rama `fix/ayuda-doble-colapsable`: fuera el toggle interior (la versión/plataforma ahora se cargan al montar) y el import sin uso; el sub-colapsable de créditos se conserva.
- **Pruebas**: `npm run check` 0 errores (41 warnings, sin cambios), 6 guardianes verdes. `npm run build` ok.
- **Recomendación**: seguir roadmap → `T-P4` y `T-P5`.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-FIX-01 DONE)
- **Contexto**: reporte de usuario — con ventana baja o zoom grande los títulos del acordeón de ajustes se perdían al hacer scroll. Fix en rama `fix/ajustes-sticky`: cabecera de `SeccionAjustes` con `position: sticky; top: -12; zIndex: 2` (se quitó el `overflow: hidden` de la sección porque anulaba el sticky; esquinas redondeadas por piezas) y panel con `width: min(280px, calc(100vw - 16px))`.
- **Pruebas**: `npm run check` 0 errores (41 warnings, igual que antes), 6 guardianes verdes. `npm run build` ok. Sin cambios visuales a tamaño normal.
- **Recomendación**: pendiente `T-P4` y `T-P5`.

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo (T-P3B DONE)
- **Contexto**: `T-P3B DONE` en rama `task/p3-pantallas`. `EditorB` (33) → piezas `botonConfigurado`, `CabeceraEditorB`, `FranjaPasosEditorB` (+`STEPS`), `FormularioPasoEditorB`. `MainB` (30 + flecha 22) → `useAtajosSeleccion`/`resolverAtajoSeleccion`, `BarraSuperiorMain`, `AvisosContextuales`, `PanelMusicaLateral`, `CeldaPrincipal`. Cero cambios de comportamiento; `onSelect` alterna selección (no arrastre).
- **Pruebas**: `npm run check` 0 errores (41 warnings, antes 44), 6 guardianes verdes. `npm run build` ok.
- **Recomendación**: siguiente `T-P4` (galería viva). Ojo: el guardián i18n marca identificadores en español aunque sean código — usar inglés en nombres internos (`AtajoSeleccion` es `'copy'|'paste'|'duplicate'|'delete'` por eso).

### [2026-09-15] De: Muse Spark → Para: Siguiente Modelo
- **Contexto**: `T-P3A DONE` en rama `task/p3-idiomas`. `es.ts/en.ts` (802 líneas) → 4 fragmentos por dominio (`Comun/Editor/Acciones/Ajustes`, máx 329 líneas) + merge con spreads. `check-i18n.mjs` ahora fusiona fragmentos (`FRAGMENTOS` + `clavesEnBloque`).
- **Pruebas**: `npm run check` 0 errores (44 warnings, antes 46), 6 guardianes verdes con conteos idénticos (`i18n 834 claves`, `acciones 40`, `ipc 115+12`, `wiki 14`, `campos 62`, `perfiles 1`). `npm run build` ok.
- **Recomendación**: siguiente `T-P3B` (`EditorB` complejidad 33, `MainB` 30). Añadir claves nuevas al fragmento de su dominio, nunca al merge.

### [2026-09-14 23:20] De: Agente Saliente → Para: Siguiente Modelo
- **Contexto**: Se han completado y comiteado en `main` los ítems P1 (52, 53, 54) y P2 (55: Hardening de Discord y Spotify).
- **Pruebas**: `npm run check` corre con 0 errores. Todos los 6 scripts guardianes están en verde.
- **Recomendación para el siguiente modelo**:
  - Toma la tarea **T-P3A (Modularización de Idiomas)**: `src/utils/idiomas/es.ts` y `en.ts` tienen 802 líneas (ESLint avisa `max-lines: 600`).
  - **Ojo con `scripts/check-i18n.mjs`**: Este script espera encontrar `const ES: Dict = { ... };` en `src/utils/idiomas/es.ts`. Si divides los diccionarios en submódulos (ej. `esAcciones.ts`, `esEditor.ts`, `esAjustes.ts`), debes actualizar la función `clavesDe` en `scripts/check-i18n.mjs` para que lea los submódulos o importe el objeto completo.
  - No olvides reclamar la tarea en la tabla arriba antes de comenzar.

---

## 3. Checklist de Entrega de Turno (Handoff Checklist)

Antes de liberar tu turno o enviar tu commit, marca que has cumplido:

- [ ] ¿El código respeta la grilla de 4px y la paleta DOT (`VD_LIGHT` / `#070809`)?
- [ ] ¿Cero emojis en la interfaz?
- [ ] ¿Se ejecutó `npm run check` con 0 errores?
- [ ] ¿Se verificó `npm run build` sin errores de bundle?
- [ ] ¿Se actualizó el estado de la tarea en la tabla a `DONE`?
- [ ] ¿Se dejó un mensaje en el buzón explicando qué se hizo y qué falta?

---

## Sección Antigravity (2026-09-19)
- Sesión base: repositorio local del proyecto (ruta absoluta no versionada por higiene de repo público).
- OpenCode orquesta en terminal, Antigravity ejecuta (extensión + agy CLI 1.2.7, Gemini 3.8 Flash, auth Pro OAuth).
- **Comando verificado (print mode headless, sin permisos peligrosos)**: `& "$env:USERPROFILE\.config\opencode\bin\agy-gemini.ps1" "<prompt>" -Model gemini-3.6-flash-low -Timeout 60s` → responde en modo print. Equivalente directo: `agy -p="<prompt>" --model gemini-3.8-flash-medium --print-timeout 60s --add-dir <cwd>`.
- Wrapper global `agy-gemini.ps1` (v1.2.7): `-Prompt` obligatorio, `-Model` ValidateSet (gemini-3.8/3.7/3.6-flash-high/medium/low, gemini-3.1-pro-high/low, default `gemini-3.8-flash-medium`), `-Dir` default `Get-Location`, `-Timeout` default `60s`, switches `-Json`/`-Schema`. Solo modo print; prohibido `--dangerously-skip-permissions` y `--mode accept-edits` (o allow-rules en settings.json). Cuota aparte: no cuenta contra Go/Zen.
- CWD obligatorio para toda sesión nueva.

