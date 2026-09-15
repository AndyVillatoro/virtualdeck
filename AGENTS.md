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

---

## 4. Próximas Tareas Pendientes (Backlog Priorizado)

Cualquier modelo orquestado por OpenCode debe seleccionar su próxima tarea de esta lista (reflejada en `docs/ROADMAP.md`):

| Prioridad | Tarea | Archivos Involucrados | Objetivo Técnico |
|-----------|-------|-----------------------|------------------|
| **P3 — Media** | **Modularización de Diccionarios de Idiomas** | `src/utils/idiomas/es.ts`, `en.ts`, `scripts/check-i18n.mjs` | Los archivos superan las 800 líneas (`max-lines: 600` en ESLint). Subdividirlos por dominios (ej. `esAcciones.ts`, `esEditor.ts`, `esAjustes.ts`) asegurando que `check-i18n.mjs` siga pasando al 100%. |
| **P3 — Media** | **Reducción de Complejidad en Pantallas Secundarias** | `src/screens/EditorB.tsx`, `src/screens/MainB.tsx` | Extraer subcomponentes puros para llevar la complejidad ciclomática de las pantallas por debajo de 18 (eliminar warnings restantes de ESLint). |
| **P4 — Ecosistema** | **Galería de Perfiles en Vivo (Ítem 24/6.1)** | `src/components/settings/GallerySection.tsx`, `electron/main/` | Conexión directa a repositorio de perfiles comunitarios en GitHub con previsualización de riesgo de teclas y scripts. |
| **P5 — Mantenimiento** | **Lazy Loading de Catálogo de Marcas (Ítem 4.1)** | `src/data/brandIcons.ts`, `src/components/BrandIconPicker.tsx` | Carga diferida (`import()`) del catálogo de marcas SVG pesadas para optimizar tiempo de inicio y consumo de memoria. |
| **P5 — Mantenimiento** | **Automatización y Checklist de Publicación MSIX (Ítem 30)** | `scripts/build-store.mjs`, `docs/MICROSOFT-STORE.md` | Automatizar bump semver y empaquetado para la tienda de Microsoft Windows. |

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

