# Tablero de Comunicación y Bloqueo Multi-Agente (OpenCode)

Este archivo es el **medio de comunicación activo y sincronización de estado** para los diferentes modelos de IA orquestados por OpenCode sobre VirtualDeck.

---

## 1. Registro de Reclamo de Tareas (Task Claims)

Antes de que un modelo empiece a editar archivos, debe registrar su asignación aquí para evitar conflictos de edición simultánea:

| ID | Prioridad | Tarea / Módulo | Modelo / Agente Asignado | Archivos Bloqueados | Estado | Actualizado |
|---|-----------|----------------|--------------------------|---------------------|--------|-------------|
| **T-052** | P1 | Modo Claro Anti-Glare | Claude / Gemini Pair | `design.ts`, `index.css` | `DONE` ✅ | 2026-09-14 |
| **T-053** | P1 | Acordeón Colapsable Ajustes | Claude / Gemini Pair | `PanelAjustes.tsx`, `SeccionAjustes.tsx`, `SeccionPerfiles.tsx` | `DONE` ✅ | 2026-09-14 |
| **T-054** | P1 | Presets Web Ampliados | Claude / Gemini Pair | `actionData.ts`, `formularios/basicos.tsx` | `DONE` ✅ | 2026-09-14 |
| **T-055** | P2 | Hardening Spotify & Discord | Claude / Gemini Pair | `discord.ts`, `spotify.ts`, `terceros.ts`, `SeccionIntegraciones.tsx` | `DONE` ✅ | 2026-09-14 |
| **T-P3A** | P3 | Modularización Diccionarios Idiomas | Muse Spark | `es.ts`, `en.ts`, `es*.ts`, `en*.ts`, `check-i18n.mjs` | `DONE` ✅ | 2026-09-15 |
| **T-P3B** | P3 | Reducción Complejidad Pantallas | Muse Spark | `EditorB.tsx`, `MainB.tsx` (+ piezas en `editor/`, `main/`) | `DONE` ✅ | 2026-09-15 |
| **T-P4**  | P4 | Tienda plugins/perfiles (Fase 1: modelo+main) | Muse Spark | `galeria.ts`, `config.ts`, `GallerySection.tsx`, `useDeck.ts`, `check-perfiles.mjs` | `DONE` ✅ | 2026-09-15 |
| **T-P5**  | P5 | Lazy Loading Iconos de Marca + Store MSIX | Muse Spark | `brandIcons.ts`, `BrandIconPicker.tsx`, `build-store.mjs` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-01** | - | Panel ajustes: cabeceras sticky + ancho responsive | Muse Spark | `SeccionAjustes.tsx`, `PanelAjustes.tsx` | `DONE` ✅ | 2026-09-15 |
| **T-FIX-02** | - | Ayuda: quitar colapsable interior duplicado | Muse Spark | `HelpAboutPanel.tsx` | `DONE` ✅ | 2026-09-15 |

> **Estados posibles**:
> - `READY`: Disponible para ser tomada por cualquier modelo.
> - `CLAIMED`: Reclamada por un modelo; otros modelos no deben tocar los archivos listados.
> - `IN_PROGRESS`: Código siendo modificado y probado.
> - `VERIFYING`: Ejecutando `npm run check` y `npm run build`.
> - `DONE`: Completado, verificado con 0 errores y comiteado en git.

---

## 2. Buzón de Mensajes Inter-Agente (Message Log)

Utiliza este apartado para dejar mensajes, advertencias técnicas o instrucciones específicas para el siguiente modelo que continúe el trabajo:

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

