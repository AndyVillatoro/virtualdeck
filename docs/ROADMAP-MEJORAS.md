# Roadmap de mejoras — VirtualDeck (secuencia 1/N)

> **Cómo trabajamos acá.** En vez de tocar muchas cosas a la vez, mejoramos **un
> apartado por sesión**. Cada ítem es un "feature N/total": lo verificamos, lo
> arreglamos/mejoramos, lo documentamos y lo marcamos hecho. Con calma y trazable.
>
> Cada apartado referencia su módulo en [ARQUITECTURA.md](ARQUITECTURA.md).
>
> **Ritual por ítem:**
> 1. Leer la fila del ítem + el módulo en el mapa de arquitectura.
> 2. Verificar el estado actual (qué funciona, qué falta, deuda SRP).
> 3. Aplicar la mejora (código + i18n si aplica).
> 4. `npx tsc --noEmit` + `npm run build` en verde.
> 5. Documentar en CHANGELOG y, si cambió el comportamiento, en el wiki.
> 6. Marcar el ítem ✅ acá con la fecha.
>
> Estados: ⬜ pendiente · 🚧 en curso · ✅ hecho · ⏸ pausado

---

## Bloque A — Internacionalización (i18n profundo, pantalla por pantalla)

La infraestructura i18n (`utils/i18n.tsx`) ya existe y las superficies de chrome
están traducidas. Falta traducir las pantallas de configuración profunda. Cada
pantalla es un ítem independiente.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 1 | `WallpaperB` | Traducir 100% (UI + nombres de fondos). | ✅ 2026-05-29 |
| 2 | `EditorB` — pasos y chrome | Pasos (ACCIÓN/CONFIGURAR/ESTILO), botones, encabezados de sección. | ⬜ |
| 3 | `editor/actionData.ts` | Etiquetas y descripciones de tipos de acción (~147 strings). | ⬜ |
| 4 | `EditorB` — config por acción | Campos/placeholders de cada tipo de acción. | ⬜ |
| 5 | `EditorB` — estilo e íconos | Sección de estilo, colores, picker de íconos. | ⬜ |
| 6 | `RGBManagerB` | Traducir 100% (~760 líneas). | ⬜ |
| 7 | `FullscreenB` | Revisar strings visibles (reloj, salida, PIN kiosko). | ⬜ |
| 8 | `MainB` | Strings restantes (menú contextual, feedback de ejecución). | ⬜ |
| 9 | `settings/RGBSection` · `SensorsSection` | Traducir secciones de settings. | ⬜ |
| 10 | `BrandIconEditor` / `BrandIconPicker` | Traducir editor/selector de íconos. | ⬜ |

---

## Bloque B — Deuda SRP (dividir lo que hace de más)

Refactors guiados por el mapa de arquitectura. Sin cambiar comportamiento.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 11 | `EditorB` | Dividir por sección (ActionStep / StyleStep / IconStep / TriggersStep). | ⬜ |
| 12 | `TitleBar` | Extraer el settings flyout a `SettingsPanel`. | ⬜ |
| 13 | `MainB` | Extraer la grilla y el panel lateral a sub-componentes. | ⬜ |
| 14 | `RGBManagerB` | Separar lista de dispositivos / editor de perfil / presets. | ⬜ |
| 15 | `utils/actions.ts` | Evaluar dividir el dispatcher por familia de acción. | ⬜ |

---

## Bloque C — Documentación (wiki bilingüe, ir llenando)

El botón "Documentación" apunta al wiki de GitHub. Lo llenamos página por página
desde `docs/wiki/` (ver [docs/wiki/README.md](wiki/README.md)).

| # | Página | Objetivo | Estado |
|---|--------|----------|--------|
| 16 | `Home` / `_Sidebar` | Landing bilingüe + navegación. | 🚧 (esqueleto creado) |
| 17 | Primeros pasos (ES/EN) | Instalar, primer botón, páginas. | 🚧 (esqueleto) |
| 18 | Referencia de acciones (ES/EN) | Cada tipo de acción explicado. | ⬜ |
| 19 | Widgets y variables (ES/EN) | Reloj, clima, sensores, música, variable. | ⬜ |
| 20 | Sensores / RGB (ES/EN) | Setup de LibreHardwareMonitor y OpenRGB. | ⬜ |
| 21 | Atajos y macros (ES/EN) | Hotkeys globales, grabador de macros. | ⬜ |

---

## Bloque D — Features y pulido (desde SUGERENCIAS.md)

Items de producto ya identificados. Ver [SUGERENCIAS.md](../SUGERENCIAS.md) para detalle.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 22 | 1.3 Acciones encadenadas | Delay por paso, condicional, bucles. | ⬜ |
| 23 | 1.4 Disparadores externos | Hotkey global / deep-link / HTTP local. | ⬜ |
| 24 | 6.1 Galería de perfiles | Repo público de perfiles compartibles. | ⬜ |
| 25 | 1.1 Mando móvil | Controlar el deck desde el teléfono (red local). | ⬜ |
| 26 | 5.3/5.4 Pulido sensorial | Animación de press + sonidos seleccionables. | ⬜ |

---

> **Cerrados recientemente** (ver CHANGELOG "No publicado"): regresión widget de
> música, onboarding, widget `variable`, i18n base + hints + tooltips, Wallpaper i18n.
>
> El total "N" crece a medida que el mapa de arquitectura revela más apartados.
> No es una lista fija: es la cola de trabajo ordenada.
