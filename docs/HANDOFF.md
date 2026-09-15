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

## Proximo paso concreto

* Tomar **`T-P3A Modularizacion Diccionarios Idiomas`** (`src/utils/idiomas/es.ts`, `en.ts`, `scripts/check-i18n.mjs`).
* Antes de editar: reclamar `T-P3A` como `CLAIMED` en `docs/AGENT_COMMUNICATION.md`.
* Ojo: `scripts/check-i18n.mjs:46-59` (`clavesDe`) solo lee `const ES: Dict` / `const EN: Dict` hasta `\n};`. Si se divide en `esAcciones.ts` etc., hay que actualizar esa funcion para fusionar submódulos.
* Tras el cambio: `npm run check` (0 errores) + `npm run build`, luego actualizar tabla a `DONE` y dejar mensaje en el buzon.
