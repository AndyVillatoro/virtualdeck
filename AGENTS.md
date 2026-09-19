# Guía de Orquestación Multi-Agente para OpenCode (VirtualDeck)

Bienvenido a **VirtualDeck**. Este documento está diseñado para que cualquier agente de IA o modelo orquestado mediante **OpenCode** (Claude, GPT, Gemini, DeepSeek, etc.) comprenda inmediatamente el estado del proyecto, las directrices de arquitectura, la suite de guardianes y el protocolo de comunicación inter-agente.

---

## 1. Reglas Sagradas del Proyecto (NO VIOLAR)

1. **Estética DOT / 480 OLED Micro Interface**:
   - Modo oscuro: Fondo OLED puro `#070809`, superficie `#111315`, bordes `#26292e`, acento `#FF3B30` o preset.
   - Modo claro: Grises industriales suaves cemento mate (`#d8dbe0` fondo, `#cbcfd5` superficie, bordes `#9da4ae`, texto `#111418`). **Prohibido el blanco puro `#ffffff`**.
   - Grilla estricta de 4px (`4PX GRID`).
   - **0 Emojis**: Todo icono debe ser un glifo dot-matrix SVG o mapa de puntos 8×8 / 5×7 de `src/components/dot480/`.
   - Colores obligatorios vía hook: `const VD = useTheme();`. Prohibido importar `VD` o `VD_LIGHT` directo de `design.ts` en componentes de UI (ESLint lo bloquea con `no-restricted-imports`).
2. **Suite de Calidad Estricta (`npm run check`)**:
   - Antes de dar una tarea por terminada y antes de hacer commit, **TODO agente debe ejecutar**:
     ```powershell
     npm run check
     ```
   - Debe pasar con **0 errores**.
   - Los 6 guardianes deben quedar 100% en verde:
     - `check-i18n.mjs`: Paridad exacta ES/EN y neutralidad de registro.
     - `check-acciones.mjs`: Cobertura de tipos de acción en ejecutor y formularios.
     - `check-ipc.mjs`: Sincronía bidireccional entre `ipcMain` y preload `ipcRenderer`.
     - `check-wiki.mjs`: Documentación técnica bilingüe en `docs/wiki/`.
     - `check-campos.mjs`: Todo campo de `ButtonAction` que se lee debe poder escribirse en pantalla.
     - `check-perfiles.mjs`: Integridad de perfiles de la galería.
3. **Límites SRP y Complejidad**:
   - Complejidad ciclomática máxima por función: **18**.
   - Líneas máximas por archivo: **600** (`max-lines`).

---

## 2. Protocolo de Comunicación entre Modelos (OpenCode)

Cuando múltiples modelos de IA colaboran simultáneamente o por turnos en este repositorio, la comunicación y coordinación se realiza a través de **archivos compartidos en el workspace**:

### Canal 1: Tablero de Tareas y Bloqueos (`docs/AGENT_COMMUNICATION.md`)
- **Propósito**: Evitar colisiones donde dos modelos editan el mismo archivo al mismo tiempo.
- **Protocolo**:
  1. Antes de iniciar una tarea, el agente debe leer `docs/AGENT_COMMUNICATION.md` y verificar que la tarea o archivos no estén bloqueados (`CLAIMED`).
  2. Registrar su reclamo en la tabla:
     `| Modelo/Agente | Tarea | Archivos en Edición | Estado |`
  3. Al terminar y verificar con `npm run check`, actualizar el estado a `DONE` y liberar los archivos.

### Canal 2: Registro de Handoff / Traspaso (`docs/HANDOFF.md`)
- **Propósito**: Pasar el testigo entre modelos en turnos sucesivos.
- **Formato**:
  - Qué modelo actuó y qué archivos modificó.
  - Resultados exactos de `npm run check` y `npm run build`.
  - Próximo paso concreto que el siguiente modelo debe retomar.

### Canal 3: Estrategia Git y Ramas
- Cada agente o tarea significativa debe trabajar en una rama aislada si se opera en paralelo:
  - `git checkout -b task/<prioridad>-<nombre>`
- Commit atómico tras verificar:
  - `git commit -m "tipo: descripción clara"`
- Rebase limpio sobre `main`.

---

## 2b. Delegación por Capacidad (OpenCode / global)

- Elegir siempre el subagente/modelo más capaz para cada subtarea. No degradar por ser contenido sensible.
- Orden de capacidad:
  1. `pickle` — arquitectura dura, drafts, review, docs.
  2. `mimo-worker` — repos grandes (1M ctx).
  3. `zen-muse-free` — coding en paralelo / segunda opinión.
  4. `lightning-exec` — micro-tareas, schema estricto.
  5. `ling-fin` — solo finanzas.
  6. `go-flash` / `go-kimi-code` — bulk / alternativo Go.
- **Nota: `ultra-planner` eliminado (2026-09-19)** — falla fuera del cliente OpenCode con `OpenCode's free tier can only be used from within OpenCode`. Reintentos agotados. Arquitectura dura pasa a `pickle`. No usar ni documentar `ultra-planner` en este repo.
- Privacidad: los modelos free Zen + Contributor entrenan con prompts; `opencode-go` (zero-retention) y locales no entrenan. Aun así, priorizar el mejor resultado aunque entrene. Excepción: si el mensaje contiene `[privado]`, usar local / Go zero-retention aunque pierda calidad.
- Reporte: al final de cada tarea devolver `Delegación usada: [tarea -> subagent_type, ...]`. Para auditoría: `opencode-go/` cobra; `opencode/` free no cobra.

## 2c. Gemini-Pro vía agy (CLI externa v1.2.7)

- **Qué es**: integración de Gemini vía **Antigravity CLI** (`C:\Users\andyf\AppData\Local\agy\bin\agy.exe` v1.2.7), no es un provider de `opencode.json` (binario cerrado sin servidor). Integración vía shell en modo print headless.
- **Wrapper recomendado**: `C:\Users\andyf\.config\opencode\bin\agy-gemini.ps1` (global, fuera del repo; **no copiar a `bin/` del repo**). Parámetros: `-Prompt` obligatorio, `-Model` ValidateSet (`gemini-3.8/3.7/3.6-flash-high/medium/low`, `gemini-3.1-pro-high/low`, default `gemini-3.8-flash-medium`), `-Dir` default `Get-Location`, `-Timeout` default `60s`, switches `-Json`/`-Schema`. Uso:
  ```powershell
  & C:\Users\andyf\.config\opencode\bin\agy-gemini.ps1 "<prompt>" -Model gemini-3.6-flash-low -Timeout 60s
  ```
  Equivalente directo: `agy -p="<prompt>" --model gemini-3.8-flash-medium --print-timeout 60s --add-dir <cwd>`.
- **Uso**: tareas P1/P2 o trabajo pesado (arquitectura, drafts, síntesis multi-fuente, segunda opinión fuerte) cuando Go/Zen no bastan o se quiere cuota aparte. Solo modo print; prohibido `--dangerously-skip-permissions` y `--mode accept-edits`.
- **Privacidad**: tratar como **entrenable**. Prohibido enviar `[privado]`, secretos, credenciales o material sensible (usar local / Go zero-retention en ese caso).
- **Cuota**: aparte — la CLI externa NO cuenta contra `opencode-go/` ni la cuota Zen/Contributor. Tercer bucket (agy / Antigravity). Ver estado verificado en `docs/AGENT_COMMUNICATION.md` § Antigravity y `docs/HANDOFF.md` turno 2026-09-19 (T-AGY-01 DONE, prueba `Reply with exactly: OK` → `OK`).

---

## 3. Estado Actual del Proyecto (v0.13.0+)

### Lo completado recientemente (Verificado y en `main`):
- **Ítem 52 (Modo claro industrial anti-glare)**: Paleta `#d8dbe0` en `design.ts` e `index.css`.
- **Ítem 53 (Menú de ajustes colapsable)**: Acordeón modular en `PanelAjustes.tsx` mediante `SeccionAjustes.tsx` y `SeccionPerfiles.tsx`.
- **Ítem 54 (Presets web ampliados)**: Chips de autocompletado en editor para Gemini, Claude, ChatGPT, GitHub, YouTube, etc.
- **Ítem 55 (Hardening Spotify & Discord)**:
  - Discord: Pre-chequeo de proceso en <0.05ms para evitar freeze de 10s; Client ID oficial de StreamKit (`207646673902501888`); rechazo adecuado ante `evt === 'ERROR'`; fallback a atajos globales `Ctrl+Shift+M` / `Ctrl+Shift+D`.
  - Spotify: Normalización universal de URIs (`normalizeSpotifyUri`); reproducción contextual vía Web API en segundo plano; listado y transferencia de dispositivos; token global en `localStorage` (`vd-spotify-token`) + override por botón.
  - UI de Integraciones: Creado `SeccionIntegraciones.tsx` en panel de ajustes.
- **Deuda Técnica y Modularidad**:
  - `src/types/` subdividido en `actions.ts`, `config.ts`, `hardware.ts`, `ipc.ts`, `index.ts`.
  - `DotGlyphIcon.tsx` modularizado (`dotGlyphsCatalog.ts`, `dotGlyphs8x8.ts`, `resolveDotGlyph.ts`).
  - `ButtonCell.tsx` modularizado con `CuerpoCelda.tsx`.
  - `FullscreenB.tsx` desacoplado con `ModalPinKiosko.tsx`, `useFullscreenHotkeys.ts`, etc.
  - Animación Radial Dot Sweep y editor de glifos 5×7 interactivo.
- **P3–P5 + Tienda (DONE 2026-09-15, en `main`)**:
  - **P3**: Diccionarios por dominios (`esComun/esEditor/esAcciones/esAjustes` + espejos EN) y pantallas bajo complejidad 18 (T-P3A/T-P3B).
  - **P4**: Tienda en ventana propia `#tienda` (T-P4 Fase 1: manifiesto v2 + riesgo extendido; T-P4-F2: buscador/filtros/ficha README/updates).
  - **P5**: Lazy loading de marcas (chunk `brandIcons` aparte) y automatización MSIX (`build-store.mjs`).
- **Release v0.13.0 publicado (T-REL-013 + T-REL-014, tag `v0.13.0` en su commit, `main` en `6764367`)**: CHANGELOG corregido (sin rescan; faltantes incluidos: Dot Sweep, 5×7, portapapeles, PIN kiosko, Rust, Discord/Spotify; bandeja como fix). Artefactos locales `dist/`: NSIS 80.3MB + blockmap + `latest.yml`; MSIX 116.6MB + ficha `store-submission-0.13.0.md` (bloque EN añadido). Release GH con notas ES corregidas; Description de Partner Center corregida fuera del repo (no prometer táctil).
- **Fixes pre-release (T-FIX-01 a T-FIX-07, todos DONE y fusionados)**:
  - T-FIX-01: cabeceras sticky + ancho responsive en ajustes.
  - T-FIX-02: fuera colapsable interior duplicado en Ayuda.
  - T-FIX-03: ROADMAP al día + knip sin huella propia.
  - T-FIX-04: docs galería (repo público verificado, 4 perfiles v1; diferido v2).
  - T-FIX-05: carátula con transporte integrado + mando móvil a usted/neutro + solo bandeja (`skipTaskbar`).
  - T-FIX-06: reescaneo RGB real (`rgb:rescan` + busy + toast).
  - T-FIX-07: auto-calibrador tras rescan + picker con commit (`onChange` local / `onCommit` al soltar).
- **Landing Pages (T-WEB-01 / T-WEB-02, DONE)**: `docs/index.html` rediseño DOT 480 OLED (719 líneas, acento `#FF3B30`, 0 azul IA/blur/CDN, consola DOT 12 teclas, sección registro desde array `FEATURES`); botón Store solo contorno + ES/EN en secciones y tabs. Publicar = push a `main` (sirve `/docs`).
- **Infra global Gemini-vía-agy (T-AGY-01, DONE 2026-09-19)**: wrapper + docs globales fuera del repo (ver §2c). En este repo solo consta el claim DONE y la sección Antigravity en `docs/AGENT_COMMUNICATION.md`; sin cambios en `src/`/`electron/`.

---

## 4. Próximas Tareas Pendientes (Backlog Priorizado)

Backlog P1–P5 y tienda **completos y en `main`** (ver `docs/ROADMAP.md`, `docs/HANDOFF.md` y tabla en `docs/AGENT_COMMUNICATION.md` — T-052…T-055, T-P3A/B, T-P4/F2, T-P5, T-FIX-01…07, T-WEB-01/02, T-REL-013/014, T-AGY-01 todos `DONE`):

- **Release v0.13.0**: YA PUBLICADO (tag + GH release + Pages a 0.13.0). No rebuild/retag salvo cambio de código.
- **Pendiente solo del dueño en Partner Center**: pegar Description EN corregida + bloque Novedades/What's new, subir MSIX, notas runFullTrust (`docs/MICROSOFT-STORE.md` §4).
- **Diferidos a otra versión**: galería completa (versionado v2 + curation en repo externo), fino del escáner RGB.
- **Siguiente feature de Pages**: añadir objeto a `FEATURES` en `docs/index.html` (plantilla v0.14.0 comentada).
- **Uso del wrapper agy**: tareas P1/P2 pesadas vía `agy-gemini.ps1` (cuota aparte); si OpenCode no toma el nuevo `permission.bash`, recargar config de agentes.

---

## 5. Comandos de Terminal Esenciales

```powershell
# Verificar TODO el proyecto (OBLIGATORIO antes de entregar tarea):
npm run check

# Compilar para producción (Electron + Vite):
npm run build

# Ejecutar en modo desarrollo con Hot Reload:
npm run dev

# Chequeo estático de tipos TypeScript:
npx tsc --noEmit

# Comprobar arquitectura y capas (sin dependencias circulares):
npx depcruise src electron

# Comprobar linter:
npx eslint .
```

