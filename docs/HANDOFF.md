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

## Proximo paso concreto

* Tomar **`T-P3B Reduccion Complejidad Pantallas`** (`src/screens/EditorB.tsx` complejidad 33, `src/screens/MainB.tsx` 30 + arrow 22).
* Reclamar `T-P3B` en `docs/AGENT_COMMUNICATION.md` antes de editar; rama `task/p3-pantallas`; claves nuevas de i18n van al fragmento de su dominio, nunca al merge.
