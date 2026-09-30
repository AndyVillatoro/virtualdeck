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

## Turno 2026-09-15 — Cierre post-release 0.13.0 (notas Store ES/EN + ficha, DONE)

* **Modelo:** Muse Spark, en `main` (solo docs de coordinación; `dist/` ignorado por git).
* **Hecho tras T-REL-014:**
  - Bloque "What's new (English)" añadido a `dist/store-submission-0.13.0.md` (no versionado).
  - Corrección de la Description de Partner Center (texto externo, no está en el repo): "turns any touchscreen… into a touch control surface" → "gives your PC a customizable control surface on any tablet, secondary monitor, or touchscreen" (+ espejo ES). Motivo: no prometer convertir pantallas en táctiles.
* **Estado release:** tag `v0.13.0` en su commit; `main` en `6764367`; release GH con notas ES corregidas; MSIX + ficha listos para Partner Center.

## Proximo paso concreto

* **Dueño en Partner Center:** pegar Description EN corregida + bloque "Novedades"/"What's new", subir `dist/VirtualDeck-0.13.0.msix`, notas runFullTrust (`docs/MICROSOFT-STORE.md` §4).
* **Diferidos a otra versión:** galería completa, fino del escáner RGB.

## Proximo paso historico (T-P3B, hecho)

## Turno 2026-09-15 — T-WEB-01 Landing DOT 480 OLED + registro de features (DONE)

* **Modelo:** Muse Spark, en `main` (solo Pages; `src/` y `electron/` sin tocar).
* **Cambios:** `docs/index.html` (1236 -> 719 lineas): acento RED #FF3B30, 0 azul IA, 0 blur, fuera Three.js/CDN; consola DOT 12 teclas con HUD + clic; seccion [03 - REGISTRO] con array FEATURES (v0.13.0 x12, v0.12.0 x6; sin fixes) + plantilla v0.14.0 comentada.
* **Tablero:** `docs/AGENT_COMMUNICATION.md` con `T-WEB-01 DONE` + mensaje en buzon.
* **Verificacion:** `npm run check` 0 errores (39 warnings preexistentes), 6 guardianes verdes; prohibidos (4a8ef0, blur, three, unpkg): 0.

## Proximo paso concreto

* Push a `main` = publicado (Pages sirve `/docs`). Siguiente feature de Pages = anadir objeto a `FEATURES` en `docs/index.html`.

## Turno 2026-09-29 - Correccion del diagnostico de agy (sin cambios de codigo)

* **Que se modifico:** solo este fichero y el tablero, para no dejar un diagnostico equivocado escrito.
  * `docs/HANDOFF.md`: esta seccion.

* **Que se comprobe:**
  * `agy -p="/quota"` dice **100%** en las cuatro filas (semanal y de 5 horas, Gemini y Claude/GPT), con
    reinicio el `2026-09-30T09:54:38Z` para el limite de 5 horas.
  * Y sin embargo la generacion falla: `RESOURCE_EXHAUSTED (code 429)` en
    `https://daily-cloudcode-pa.googleapis.com/v1internal:streamGenerateContent`.
  * Probado con `gemini-3.8-flash-high` (se quedó esperando hasta el timeout de impresión, con el turno en curso),
    `gemini-3.8-flash-medium`, `gemini-3.1-pro-low` y `gemini-3.7-flash-low` (los tres ultimos, 429 a los
    ~145-150 s). El wrapper y el binario directo fallan igual.

* **Conclusion, y corrige lo que decia antes:** el 429 **no es throttling de la cuenta**, asi que
  `agy -p="/quota"` **no sirve para saber si agy va a funcionar**. El turno anterior dejo escrito
  "reintentar cuando se agote el limite de 5 horas", con la hora de reinicio sacada de ahi: esa espera
  no iba a arreglar nada, porque el limite estaba al 100%. Lo que falla es el endpoint de generacion,
  para todos los modelos a la vez.

* **Como reintentar sin quemarse:** un `Reply with exactly: OK` con 60-90 s de margen. Si no responde,
  no insistir con mas modelos ni con timeouts mas largos: son ~150 s por intento. Y **no** fiarse del
  `/quota` como senal.

* **Modelos usados en este turno:** space-bunny-free (este). **Sin cuota de pago.** agy se intento y no
  respondio; no se paso nada por el.

## Turno 2026-09-19 — Integración global Gemini-vía-agy (DONE)

* **Modelo:** big-pickle (OpenCode), fuera de `main` (solo docs de coordinación del repo; cambios globales fuera del repo).
* **Qué se modificó:**
  * `.config/opencode/AGENTS.md`: bloque nuevo `Gemini-Pro via agy (CLI externa v1.2.7)` (sintaxis directa, wrapper, uso P1/P2, privacidad entrenable, cuota aparte).
  * `.config/opencode/bin/agy-gemini.ps1` (nuevo): wrapper PowerShell — `-Prompt` obligatorio, `-Model` ValidateSet (gemini-3.8/3.7/3.6-flash-high/medium/low, gemini-3.1-pro-high/low, default `gemini-3.8-flash-medium`), `-Dir` default `Get-Location`, `-Timeout` default `60s`, switches `-Json`/`-Schema` (`--output-format json`, `--json-schema`), flags `-p/--model/--print-timeout/--add-dir`, `exit $LASTEXITCODE`. Solo modo print.
  * `.config/opencode/agents/orchestrator.md`: frontmatter `permission.bash` con `agy*` y `*agy-gemini*` allow + regla 3b de uso de Gemini-pro vía shell/wrapper.
  * `docs/AGENT_COMMUNICATION.md`: claim `T-AGY-01` → `DONE` ✅ + sección Antigravity actualizada con comando verificado.
* **Verificación del wrapper** (llamada mínima real): `& "$env:USERPROFILE\.config\opencode\bin\agy-gemini.ps1" "Reply with exactly: OK" -Model gemini-3.6-flash-low -Timeout 60s` → **OK** (exit 0). Syntax PowerShell ok.
* **No verificado:** no se ejecutó `npm run check` completo (tarea instrumental, no toca `src/` ni `electron/`; no hay commit en el repo).
* **Próximo paso concreto:** usar el wrapper en tareas P1/P2 pesadas (`& bin\agy-gemini.ps1 "<prompt>" -Model gemini-3.6-flash-low -Timeout 60s`); si GitHub Pages/docs del repo requieren algo, seguir el flujo normal de commit. OpenCode quizá necesite recargar la config de agentes para tomar el nuevo `permission.bash`.

## Turno 2026-09-26 — Auditoría de seguridad +compactación (P0 abierto, sin fixes de código aún)

* **Modelos:** `pickle` y `zen-muse-free` (ambos Zen free). Cuota `opencode-go/` = 0. Nada por agy.
* **Naturaleza:** turno de **auditoría read-only** + configuración. **No se tocó `src/` ni `electron/`.**
* **Detalle completo: `auditorias/2026-09-26-sesion-01.md` — DIRECTORIO IGNORADO POR GIT A PROPÓSITO.**
  Contiene vulnerabilidades sin parchear; el repo es público, así que versionar el
  hallazgo le regalaría el mapa al atacante. Los docs versionados solo llevan índice.
* **Hecho (verificado):**
  - `.gitignore`: añadidos `opencode-export/`, `.opencode/.archivado-*/` y `auditorias/`.
    `opencode-export/` contenía la config global de opencode completa (orchestrator,
    9 subagentes, `agy-gemini.ps1` con rutas absolutas del perfil de usuario) y **no estaba ignorada** →
    un `git add -A` lo subía al repo público. Landmine neutralizada.
  - Redacción forward-only de rutas personales en `docs/HANDOFF.md` (esta línea) y
    `docs/AGENT_COMMUNICATION.md` (`$env:USERPROFILE` en lugar de la ruta literal).
  - `npm run check`: **PASS, 0 errores**, 6 guardianes verdes.
* **Resultado de seguridad:**
  - **Credenciales: LIMPIO.** Cero secretos en árbol e historial. Nada que rotar.
  - **Identidad: fuga forward-only ARREGLADA este turno** (decisión del dueño: NO
    reescribir historial, porque rompería 16 tags + 14 Releases y no hay
    credencial comprometida). Redactado: los 4 enlaces `file:///` del
    `CHANGELOG.md` (ahora rutas relativas al repo), la ruta de ejemplo de
    `appIpc.ts`, el nombre de cuenta de un ejemplo en `macroScript.ts`, las
    rutas absolutas de `AGENTS.md` (ahora `$env:USERPROFILE`) y el email del
    autor en `package.json` + `Cargo.toml` (que además viajaba en el paquete
    publicado). `docs/MIGRACION-RUST.md`, que citaba la auditoría, **no existe
    en el repo**. Queda solo el historial, que se acepta.
  - **⚠️ P0 NUEVO, más grave que lo anterior: vulnerabilidades Electron sin parchear.**
    2 CRIT (`no-sandbox` global en `index.ts:23-24`; ausencia total de
    `setWindowOpenHandler`/`will-navigate` con preload de ~70 métodos heredado), 6 ALTO
    (traversal en el handler `vd://`, inyección en los numéricos de `macro.ts`visible
    porque `galeria.ts` no tiene `case 'delay'` en el resumen de riesgos, dos
    `shell.openExternal` sin allowlist, primitiva de elevación en `sensors.ts`).
    Ver §4 del fichero de auditoría.
* **Resultado `src/utils` (módulo del turno, 42 ficheros):** **cero ficheros muertos**,
  cero exports huérfanos, cero ciclos. `useDeck.ts` está en 488/600 por la métrica de
  ESLint, no en riesgo. Solo 2 funciones pasan de complejidad 18. Ganancia principal:
  `pulsarBoton.ts` repite un bloque de 9 líneas **4 veces**. La auditoría de i18n quedó
  **incompleta** (el subagente agotó pasos) y su recuento de claves muertas **no es
  fiable** — no tocar esas cifras sin re-verificar.
* **Herramientas:** skill `security-audit` de Cloudflare instalada global
  (`~/.agents/skills/security-audit/`, auto-cargada). Agent-Reach v1.5.0 instalado pero
  **inerte** (4/16 canales, sin config, sin tokens, sin elevación).
* **Próximo paso concreto:** verificar las 2 incertidumbres de §4.3 de la auditoría
  (si `window.open()` hereda el preload, y si `%2f` sobrevive al parser) y luego atacar
  los 2 CRIT + el traversal de `vd://`. Orden y fixes propuestos en §8 de la auditoría.
  La redacción de identidad es trivial y sin riesgo si se prefiere cerrar eso primero.

## Turno 2026-09-26 — T-SEC-01 Electron: sandbox y ventanas hijas (DONE)

* **Modelo:** space-bunny-free, rama `task/p0-sec-01-sandbox-navegacion` (desde el commit `1a99d51`; el código de `src/` y `electron/` es idéntico a `main`).
* **Los 2 CRIT de §4 de la auditoría (los P0 de la lista de §8):**
  * `index.ts`: fuera `appendSwitch('no-sandbox')` y `appendSwitch('disable-gpu-sandbox')`. Se queda solo `app.disableHardwareAcceleration()`, que es el arreglo real de los tiles negros y no toca seguridad. Los switches venían del commit `ea94139` (landing 3D) y nunca se documentaron como arreglo de nada.
  * `electron/main/seguridadVentana.ts` (nuevo, 100 líneas): `asegurarVentana(win)` / `asegurarWebContents(wc)` con `setWindowOpenHandler` → `deny`, `will-navigate` y `will-redirect` con allowlist por origen (propio `file:` o origen de vite) y `will-attach-webview` bloqueado. Llamado en `windowManager`, `tienda` y `floatingBar`, más `app.on('web-contents-created')` en `index.ts` como red de seguridad para la ventana que alguien añada mañana (excluye `devtools://`).
* **Hallazgo propio, no estaba en la auditoría:** los tres `webPreferences` llevaban `sandbox: false`. Eso era lo que apagaba el sandbox **de los renderers**; la bandera global era redundante para esas ventanas. El preload solo usa `contextBridge` e `ipcRenderer` (el bundle tiene un único `require("electron")`), o sea que es válido con sandbox: puesto → los tres pasaron a `sandbox: true`.
* **Decisión de diseño:** `deny` sin reenviar a `shell.openExternal`. En el renderer no hay ni un `target="_blank"` ni un `window.open()`; los enlaces externos ya salen por `launch:url`, que es donde va la allowlist de esquemas (T-SEC-04). Reenviar aquí sería un segundo `openExternal` sin validar.
* **Sin cambios de comportamiento** para el usuario: los cambios de hash (`#barra`, `#tienda`) no emiten `will-navigate`, y `loadURL`/`loadFile` del proceso principal tampoco.

### Verificacion

* `npm run check`: **0 errores, 40 warnings** (39 previos y uno de `opencode-export/`, que está sin versionar a propósito; `electron/main/seguridadVentana.ts` sin avisos). Guardianes: `i18n 864`, `acciones 40`, `ipc 122+14`, `wiki 14`, `campos 62`, `perfiles 2`.
* `npm run build`: **ok** (`main` 228.67 kB, `preload` 14.63 kB, renderer 202 módulos).
* Comprobado en el bundle: 0 apariciones de `no-sandbox`, `sandbox: true` ×3, `setWindowOpenHandler` presente.
* **Arranque real:** `npx electron . --user-data-dir=<tmp>` con `VD_DIAG=1` → `[arranque] ventana visible a los 354 ms`, `[diag] DOM: {"nodos":2319,…}` y captura de 1650×1080. El preload carga con el sandbox puesto y el renderer monta. Sin errores de GPU ni de caché.
  * Trampa para el siguiente: **`npm run dev` no sirve como prueba si la app del Store está corriendo**. Su `lockfile` en `%APPDATA%\virtualdeck` hace que la instancia de desarrollo salga por `requestSingleInstanceLock` antes de pintar nada, y el `ERROR:cache_util_win.cc / disk_cache.cc` que se ve en el log es de esa colisión, no de este cambio. Con `--user-data-dir` propio desaparece.
  * La prueba anterior deja la config en onboarding, así que **barra flotante y tienda no se abrieron**. Es lo único que queda por mirar con un clic: el guard es por origen y los cambios de hash no emiten `will-navigate`, pero conviene abrirlas.

### Sigue abierto

* **T-SEC-02** es el siguiente P0 (traversal en el handler `vd://` + `img-src` de `index.html`), y ya tiene el patrón correcto a mano en `servidorLocal.ts:354-355`.
* La incertidumbre §4.3.1 de la auditoría (si `window.open()` hereda el preload) **queda sin efecto**: con `deny` da igual. La §4.3.2 (`%2f`) sí importa y es de T-SEC-02.
* Los cambios de configuración del turno anterior (`.gitignore`, `opencode.json`, borrados de `.opencode/`) siguen **sin commitear a propósito**. Los dos `docs/` sí entran en este commit porque el tablero y el buzón de T-SEC-01 viven ahí; de paso quedan versionadas las filas T-SEC-01..05 y la redacción forward-only de rutas personales.

## Turno 2026-09-26 — T-SEC-02 `vd://` traversal + CSP (DONE) · T-SEC-01 a medias

* **Modelo:** space-bunny-free, misma rama `task/p0-sec-01-sandbox-navegacion`. Nada commiteado todavía en este tramo.
* **T-SEC-02 — hecho.** `electron/main/protocoloVd.ts` (nuevo, función pura) decide qué se sirve; `index.ts` solo llama a `net.fetch` con esa ruta. Se acepta únicamente `images/<nombre de imagen>`: sin carpetas, `..`, rutas absolutas, `:` (ADS y unidades), sin controles, y con allowlist de extensiones de imagen; más una contención final `resolve`+`startsWith` que no depende del regex. `index.html`: fuera `file:` del `img-src`; **se queda `https:`** porque la carátula de Spotify es una URL remota y las miniaturas de Windows ya llegan convertidas en `data:`.
* **La duda de §4.3.2 resuelta midiendo.** En Chromium con `standard:true` el parser colapsa los `..` sueltos pero `%2f` **llega entero**: solo se vuelve separador tras `decodeURIComponent`. Con el código viejo, `vd://images/..%2f..%2fsecreto.txt` acababa en `C:\Users\<usuario>\AppData\Roaming\secreto.txt`. Y sin traversal tampoco vale: `vd://deck-config.json` servía la configuración con el token del mando LAN.
* **T-SEC-01 — la mitad del sandbox se deshace.** Se queda todo lo de las ventanas hijas. El sandbox del renderer **no se puede encender en esta máquina**: con sandbox, cualquier `<canvas>` revienta el proceso, y el fondo de los botones se dibuja en un canvas. A/B medido (botón con fondo de imagen, 30 s por caso):

  | sandbox del renderer | bandera global | Resultado |
  |---|---|---|
  | sí | (ninguna) | revienta el renderer |
  | sí | `--in-process-gpu` | revienta el renderer |
  | sí | `--no-sandbox` | funciona (la global gana) |
  | no | (ninguna) | funciona |
  | no | `--in-process-gpu` | funciona |

  `--disable-gpu-sandbox`, `--disable-gpu` y `--use-angle=swiftshader` también revientan. El aviso es `GPU process exited unexpectedly: exit_code=-1073741515` (`0xC0000135`, DLL que falta). `no-sandbox`, `disable-gpu-sandbox` y `sandbox: false` quedan **restaurados y documentados** en el código; abrirlos es **T-SEC-06** (en el tablero).

### Verificacion

* **Unidad, con la función real** (`node --experimental-strip-types` importa el `.ts`, no una copia): **31 vectores bloqueados, 7 URLs legítimas aceptadas**.
* **Extremo a extremo en la app** (`npx electron . --user-data-dir=<tmp>` + `VD_DIAG=1` + un `deck-config.json` escrito a mano): `vd://images/img_1737000000000.png=64` (carga, 64 px), `..%2f..%2f..%2fsecreto.txt=0`, `..%2fdeck-config.json=0`, `file:///C:/Windows/win.ini=0`.
* `npm run check`: **0 errores, 40 warnings** (los 39 de siempre + 1 de `opencode-export/`). Guardianes verdes. `npm run build`: ok.
* **agy no disponible**: 429 `RESOURCE_EXHAUSTED` en Pro, 3.8-flash-high y Claude Sonnet; *print timeout* en los pequeños incluso con `Reply with exactly: OK`. `agy models` responde, así que el catálogo va y lo agotado es la generación. Reintentar cuando haya cuota.

### Trampas de este turno

* **Para arrancar una build sin tocar `%APPDATA%`:** `npx electron . --user-data-dir=<tmp>`. Con la app del Store corriendo, `npm run dev` sale por `requestSingleInstanceLock` y los `ERROR:cache_util_win.cc` del log son de esa colisión, no del código.
* **Probar imagenes mata el renderer** (por lo de arriba), asi que una prueba de humo con `imageData` no vale como senal si no se compara contra el baseline.
* `Set-Content -Encoding utf8` en Windows PowerShell 5.1 **mete BOM** y `deck-config.json` deja de cargar en silencio. Usar `[System.IO.File]::WriteAllText($ruta, $json, (New-Object System.Text.UTF8Encoding($false)))`. Además `hintsDismissed` es un array, no un booleano: con `true` el renderer revienta con `dismissed.includes is not a function`.

## Turno 2026-09-26 - T-SEC-03 numericos de macro + resumen de riesgos (DONE)

* **Modelo:** space-bunny-free, misma rama. Nada commiteado de este tramo todavía.
* **Inyección cerrada.** `delayMs`, `x`, `y` y `scrollY` se interpolaban crudos en el PowerShell de reproducción. `{"type":"key","value":"a","delayMs":"1; Start-Process calc.exe"}` pasaba el guardián `(delayMs ?? 0) > 0` por coacción de JS. Ahora todo pasa por `entero()`: solo `number` (las cadenas no se coaccionan), redondeo y topes (±32768, 600 000 ms, ±2000 muescas, 1000 repeticiones).
* **Bloque movido a `electron/main/macroScript.ts`** (`macro.ts` 430 → 224 líneas, y un warning menos). Motivo: el generador es lo único que **interpreta**, y en su propio módulo `buildPlaybackScript` se puede probar **sin ejecutar la macro** —devuelve una cadena, así que un test le mete payloads y mira el texto; dentro de `macro.ts` la única forma de probarlo era mover el ratón y escribir en el escritorio de quien lo prueba—.
* **Camino nativo confirmado leyendo Rust** (la auditoría no lo había leído, §4.3.3): `Option<i64>` y enums, así que serde **falla** ante un string. Cierra en falso.
* **Hallazgo de la prueba:** un campo numérico de sobra **rompe** la macro. `x: "1; calc"` en un paso `key` no lo lee nadie pero llega al JSON de Rust, donde serde rechaza el paso entero. `pasoSeguro` borra los numéricos que el tipo no usa.
* **Riesgos de galería:** un numérico no numérico se canta como `gal.risk.macroNumerico` (ES/EN). **No** se añade una línea por `case 'delay'`: `Start-Sleep` se emite para cualquier paso con `delayMs` y el grabador lo pone en todos, así que sería ruido. Lo que se mira es el tipo del campo, antes del switch.

### Verificacion

* Generador real con 11 pasos maliciosos (payload en cada campo, `toString` malicioso, array, `NaN`, `Infinity`, `1e21`): el script no contiene `Start-Process`, `Remove-Item`, `whoami` ni `calc`; toda llamada `SetCursorPos` lleva dos enteros; topes correctos (600000 / 32768 / 240000).
* 8 asserts de que **lo grabado no cambia**: `SetCursorPos(800, 450)`, `mouse_event(0x0800,0,0,-360,0)`, `SendWait("^c")`, `SendWait("hola mundo")`, `repeat=2` repite, `scrollY: 0` no emite rueda.
* `npm run check`: **0 errores, 39 warnings** (antes 40; el split de complejidad se lleva uno). Guardianes verdes. `npm run build` ok. App arranca (307 ms, DOM 2360 nodos).

### Decisión pendiente para el dueño

* Un perfil con un numérico no numérico **¿se rechaza al instalar o solo se avisa?** Ahora avisa (en la ficha) y el motor acota. Bloquearlo es una línea en la validación del renderer (`tiendaAplicar.ts`).

## Turno 2026-09-26 — T-SEC-04 allowlist de los dos `openExternal` (DONE)

* **Modelo:** space-bunny-free, misma rama.
* **`launch:url`.** `shell.openExternal` no es un visor de enlaces: se lo pasa al sistema, que lo abre con lo que tenga asociado a ese esquema. Sin lista, un `{"type":"web","url":"file:///C:/…/evil.exe"}` de un perfil importado es ejecutar un programa; igual con `ms-msdt:`, `search-ms:` o `ldap:`. Permitidos `http:`, `https:`, `mailto:` y **`ms-screenclip:`** (el recorte de pantalla de `lanzar.ts`, que no tiene otro camino). Se queda `http:` porque el panel del router y el mando de la red local son usos normales, y abrir en el navegador no da acceso a la respuesta.
* **`spotify:playUri`.** `normalizeSpotifyUri` devolvía la entrada tal cual y `playUri` la pasaba a `openExternal`: segundo sumidero sin lista y **alcanzable sin token**. Ahora devuelve `null` si no encaja, el dominio se compara **exacto por etiquetas** (`evil-spotify.com` y `spotify.com.evil.tld` no pasan; `hostname.includes('spotify.com')` los dejaba), el tipo tiene que estar en la lista, y la salida vuelve a pasar por la comprobación.
* **La acción `web` sale en la ficha de riesgo**, en un bucket nuevo `urls` con etiqueta `gal.opens` (ES/EN). No cabía en `webhooks`, que es «a dónde manda datos».
* **Los dos módulos de lógica pura aparte** (`abrirExterno.ts`, `spotifyUri.ts`) por lo mismo que en T-SEC-03: la primera versión del test de Spotify **probaba una copia** porque `spotify.ts` importa `shell`, y probar una copia no es probar nada.

### Verificacion

* `launch:url`: 9 direcciones que deben pasar (incluidos `http://127.0.0.1:8085` de los sensores, `ms-screenclip:` y el esquema en mayúsculas) y 19 que no (`file:` local y UNC, `ms-msdt:`, `search-ms:`, `ldap:`, `javascript:`, `data:`, `vbscript:`, `C:\…` sin esquema, `chrome://`, `ws://`, y valores que no son cadena).
* `spotify`: 8 válidos (incluidos `intl-es`, búsqueda y `user:spotify:playlist:`) y 20 rechazados.
* `npm run check`: **0 errores, 39 warnings**. Guardianes verdes (`i18n 865`). `npm run build` ok. App arranca (316 ms).
* **Sin verificar en runtime:** que un botón `web` aparezca en la ficha. El camino compila y está cableado, pero comprobarlo necesita un perfil de galería con un botón `web` y no hay ninguno en el repo.

### Trampa de este turno

* **Al escribir ficheros, el `write`/`edit` coló palabras inglesas en comentarios en español** (`seemingly`, `toughest`, `seRelaxa`) y un `U+FFFD` en un `—`. Y **`WriteAllLines` con cadenas de PowerShell en doble comilla se come los backticks** (son su carácter de escape): una línea de markdown se quedó sin ellos. Detector en `%TEMP%\opencode\buscar-basura.mjs` — pasarlo antes de commitear.

## Turno 2026-09-26 — T-SEC-05 XSS en la página del mando (DONE)

* **Modelo:** space-bunny-free, misma rama.
* **El `innerHTML` ya no existe.** `svgGlifo57` concatenaba el `fgColor` del botón —de `deck-config.json`, o sea de un perfil importado— dentro de un `fill="…"` y lo pintaba con `innerHTML`: XSS almacenado en el origen de la red local, que es donde vive el `localStorage` con el token del mando. Ahora el SVG se construye con `createElementNS` + `setAttribute`.
* **No hay regex de colores, a propósito.** La auditoría pedía validar `fgColor` contra un patrón, que es lo correcto *si te quedas con el `innerHTML`*. Al quitar el markup, esa lista deja de ser la barrera y solo rechazaría colores exóticos escritos a mano. Las filas del glifo sí se validan (entero, 5 bits), y eso es sentido común.
* **CSP con `nonce` por respuesta** en la página del mando, más `nosniff` y `no-referrer`. El script y el estilo están en línea, así que `'unsafe-inline'` no habría servido de nada contra una inyección.
* **Un efecto de la CSP que hubo que arreglar:** `#btn-olvidar` se escondía con `style="display:none"` en línea, y con `style-src` + nonce eso no se aplica. Movido al `<style>` con nonce; el script lo sigue enseñando con `style.display`, que sí manda. La página queda con **0** atributos `style`.

### Verificacion

* Página generada analizada: nonces puestos, ningún `innerHTML` con datos, `createElementNS`/`setAttribute` presentes, filas acotadas, estructura y `fetch` intactos.
* **Extremo a extremo con el servidor de verdad**: `remote.enabled` en un `userData` de prueba + `Invoke-WebRequest` → CSP con los dos nonces correctos, `nosniff`, `no-referrer`, 0 estilos en línea. App arranca (313 ms).
* `npm run check`: **0 errores, 39 warnings**. Guardianes verdes. `npm run build` ok.
* **Sin verificar:** el *render* con la CSP puesta (hace falta un navegador). Lo comprobado es que no queda nada que la CSP pueda bloquear.

### Trampas

* **`paginaMando()` es un template literal: cualquier backtick en el JS de la página rompe el compilado.** Me pasó con un `style=` y con un `onerror=…` de un comentario. `${` solo si es interpolación de verdad.
* **Sigue abierto (MED de la auditoría):** `/media/images/` sirve `.svg` como `image/svg+xml` desde el origen del token; navegado directamente, ejecutaría su script. Se cierra con `Content-Security-Policy: default-src 'none'; sandbox` + `nosniff` en esas respuestas.

## Turno 2026-09-26 — Corrección: la medición del sandbox **no** era válida

* **Modelo:** space-bunny-free, misma rama. Sin cambios de código de la app: esto es documentación y una corrección.
* **Lo que dije antes era falso.** Escribí que con el sandbox del renderer puesto «cualquier `<canvas>` revienta el proceso» en este equipo, y presenté una tabla A/B de banderas. Al volver a medirlo:
  * El aviso `GPU process exited unexpectedly: exit_code=-1073741515` sale **también en un Electron pelado** (una app mínima de una sola pantalla, sin nada de este repo). O sea que **es del entorno**.
  * **La misma build y el mismo `deck-config.json` pasaron a las 18:50 y reventaron a las 21:50** del mismo día, sin que cambiara una línea del repositorio. Con la máquina así, una tabla de «sandbox sí / sandbox no» mide el estado de la máquina, no el sandbox.
  * La causa que le atribuía era además **inventada**: el fondo dot-matrix **no usa canvas**. `DotMatrixImageOverlay` es una máscara de `radial-gradient` de CSS sobre un `<img>` con `imageRendering: 'pixelated'`. No hay ningún `<canvas>` en el camino.
* **Qué queda en pie, y es poco:** el proceso gráfico de Chromium no arranca en este equipo (`0xC0000135`) y, cuando algo lo necesita, el renderer se va con él (`GPU process isn't usable. Goodbye.`). Eso es reproducible.
* **Qué he hecho:** `no-sandbox` y `disable-gpu-sandbox` **vuelven a estar puestos** (es lo que se sabe que funciona), `sandbox: false` en las tres ventanas, y la nota del código reescrita para decir explícitamente **qué no está medido**. T-SEC-06 queda `PENDING (bloqueado)`: hace falta un entorno donde el proceso gráfico arranque, o una interfaz que no dependa de él.
* **Lo que no se toca:** la mitad de T-SEC-01 que sí es un win sin coste —`setWindowOpenHandler`, `will-navigate`, `will-redirect`, `will-attach-webview`— y las cuatro tareas siguientes.

### Lección para el resto de la sesión

* En esta máquina **no se puede medir nada que dependa del proceso gráfico**, y el síntoma (renderer muerto) es el mismo que el de un error de código. Cualquier A/B de aquí sobre GPU/canvas/sandbox es sospechoso salvo que se repita al día siguiente.
* Antes de escribir «medido que X» en un comentario o en un doc: **¿se puede repetir mañana con el mismo resultado?** Si la respuesta es que no, lo que va escrito es «no se ha podido medir», que es igual de útil y no miente.

## Apéndice A - Referencias Rápidas

### Guardianes Verificables (para `npm run check`)
- `check-i18n.mjs`: 834 claves ES/EN, 235 textos FIELDS_EN; paridad exacta y neutralidad de registro.
- `check-acciones.mjs`: 40 tipos de acción, 35 con manejador, 5 resueltos por quien llama, 40 con formulario, 18 presets RGB, 40 elegibles en el paso 1.
- `check-ipc.mjs`: 115 canales y 12 eventos; los dos lados cuadran.
- `check-wiki.mjs`: 14 páginas, 7 parejas ES/EN, 39 tipos de acción documentados.
- `check-campos.mjs`: 62 campos de acción, 59 los lee el ejecutor, todos rellenables.
- `check-perfiles.mjs`: integridad de perfiles de la galería.

### Rutas y Convenios Clave
- `src/types/index.ts` - Tipos principales del sistema.
- `docs/AGENT_COMMUNICATION.md` - Tablero de tareas y estados (`T-P3A`, `T-P3B`, etc.).
- `docs/HANDOFF.md` - Registro de traspaso entre modelos en turnos sucesivos.
- `design.ts` - Paleta de colores OLED: modo oscuro `#070809`, `#111315`, acento `#FF3B30`; modo claro `#d8dbe0`, `#cbcfd5`, `#9da4ae`.
- `docs/ROADMAP.md` - Estado P1–P5 y siguiente release.
- `package.json check` - Cubre validaciones de pages/ y config.

### Comandos de Verificación Obligatorios
```powershell
npm run check
npm run build
```
