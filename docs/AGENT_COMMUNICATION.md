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
| **T-P3A** | P3 | Modularización Diccionarios Idiomas | *Disponible* | `es.ts`, `en.ts`, `check-i18n.mjs` | `READY` ⬜ | - |
| **T-P3B** | P3 | Reducción Complejidad Pantallas | *Disponible* | `EditorB.tsx`, `MainB.tsx` | `READY` ⬜ | - |
| **T-P4**  | P4 | Galería de Perfiles en Vivo | *Disponible* | `GallerySection.tsx`, `galeria.ts` | `READY` ⬜ | - |
| **T-P5**  | P5 | Lazy Loading Iconos de Marca | *Disponible* | `brandIcons.ts`, `BrandIconPicker.tsx` | `READY` ⬜ | - |

> **Estados posibles**:
> - `READY`: Disponible para ser tomada por cualquier modelo.
> - `CLAIMED`: Reclamada por un modelo; otros modelos no deben tocar los archivos listados.
> - `IN_PROGRESS`: Código siendo modificado y probado.
> - `VERIFYING`: Ejecutando `npm run check` y `npm run build`.
> - `DONE`: Completado, verificado con 0 errores y comiteado en git.

---

## 2. Buzón de Mensajes Inter-Agente (Message Log)

Utiliza este apartado para dejar mensajes, advertencias técnicas o instrucciones específicas para el siguiente modelo que continúe el trabajo:

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

