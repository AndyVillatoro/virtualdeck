# Roadmap de VirtualDeck

> **Fuente única de seguimiento.** Fusiona la *secuencia de mejoras* (qué hacemos,
> en qué orden) con el *catálogo de ideas* (el detalle de cada propuesta, antes en
> `SUGERENCIAS.md`).
>
> **Cómo trabajamos.** Mejoramos **un apartado por sesión**. Cada ítem es un
> "feature N/total": lo verificamos, lo mejoramos, lo documentamos y lo marcamos.
> Cada ítem referencia su módulo en [ARQUITECTURA.md](ARQUITECTURA.md).
>
> **Ritual por ítem:** 1) leer la fila + el módulo en el mapa · 2) verificar estado
> actual · 3) aplicar la mejora (código + i18n) · 4) **`npm run check`** (tsc + arquitectura
> + eslint) + `npm run build` en verde · 5) documentar en CHANGELOG y wiki si cambió el
> comportamiento · 6) marcar ✅.
>
> **Tooling SRP/SOLID verificable** (ver [CONTRIBUTING.md](../CONTRIBUTING.md)): `npm run lint:arch`
> (dependency-cruiser — hace cumplir las capas de ARQUITECTURA.md), `npm run lint` (eslint —
> los *warnings* de `complexity`/`max-lines` señalan qué dividir en el Bloque B), `npm run lint:dead`
> (knip — código muerto).
>
> Estados: ⬜ pendiente · 🚧 en curso · ✅ hecho · ⏸ pausado

---

## Estado general (2026-05-29)

Auditoría sobre el código (no solo el doc):

- **Iteraciones 1 y 2 del plan original: ✅ completas** — memo(ButtonCell), formatters
  reutilizados, reloj DotText, radios tokenizados, búsqueda Ctrl+K, pegar imagen,
  drag entre páginas, toast de undo, celda viva de preview, backups, toasts de error.
- **Iteración 3 (diferencial): ✅ 1.2 Variables** (interpolación `{var}`, `set-var`/
  `incr-var`, persistencia, `branch`, widget `variable`).
- **Iteración 4 (comunidad): 🟡** — auto-update ✅, docs ✅, firma documentada ✅;
  falta **galería de perfiles** (ver [galeria.md](galeria.md)).
- **Cerrado reciente (no publicado):** regresión widget de música, onboarding,
  i18n base + hints + tooltips, Wallpaper i18n. Ver CHANGELOG.

---

## Bloque A — i18n profundo (pantalla por pantalla)

La infraestructura (`utils/i18n.tsx`) y el chrome ya están. Falta la config profunda.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 1 | `WallpaperB` | Traducir 100% (UI + nombres de fondos). | ✅ 2026-05-29 |
| 2 | `EditorB` — pasos y chrome | Pasos, botones, encabezados de sección. | ✅ 2026-05-29 |
| 3 | `editor/actionData.ts` | Etiquetas/descripciones de los 34 tipos de acción (label→clave i18n). | ✅ 2026-05-29 |
| 4 | `EditorB` — config por acción | Campos/placeholders de cada tipo (120 strings vía `useFieldText`). | ✅ 2026-05-29 |
| 5 | `EditorB` — estilo e íconos | Labels/placeholders de estilo ✅; faltan textos de botones/hints (children) y `BrandIcon*` (#10). | 🚧 parcial |
| 6 | `RGBManagerB` | Traducir 100% (~760 líneas). | ⬜ |
| 7 | `FullscreenB` | Strings visibles (reloj, salida, PIN kiosko). | ⬜ |
| 8 | `MainB` | Restantes (menú contextual, feedback de ejecución). | ⬜ |
| 9 | `settings/RGBSection` · `SensorsSection` | Traducir secciones de settings. | ⬜ |
| 10 | `BrandIconEditor` / `BrandIconPicker` | Traducir editor/selector de íconos. | ⬜ |

## Bloque B — Deuda SRP (dividir lo que hace de más)

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 11 | `EditorB` | Dividir por sección (ActionStep / StyleStep / IconStep / TriggersStep). | ⬜ |
| 12 | `TitleBar` | Extraer el settings flyout a `SettingsPanel`. | ⬜ |
| 13 | `MainB` | Extraer grilla y panel lateral a sub-componentes. | ⬜ |
| 14 | `RGBManagerB` | Separar lista de dispositivos / editor de perfil / presets. | ⬜ |
| 15 | `utils/actions.ts` | Evaluar dividir el dispatcher por familia de acción. | ⬜ |

### Limpieza continua de código muerto (knip)

Correr `npm run lint:dead` y eliminar lo confirmado, de a poco. (`electron-updater` figura como falso positivo por su import dinámico → ignorado en `knip.json`.)

- ✅ 2026-05-29 — `electron/main/bootstrap.ts` (entry point alternativo huérfano, con no-op roto) eliminado.
- ✅ 2026-05-29 — `lucide-react` (dependencia muerta: `VDIcon` migró a SVG inline) desinstalada + atribución quitada de `credits.ts`.
- ⬜ ~88 *unused exports* reportados por knip (helpers exportados sin uso externo): revisar por módulo y volver `export`→privado o eliminar. Verificar caso por caso (algunos pueden ser API intencional).

## Bloque C — Documentación (wiki bilingüe)

El botón "Documentación" apunta al wiki. Lo llenamos desde [docs/wiki/](wiki/README.md).

| # | Página | Objetivo | Estado |
|---|--------|----------|--------|
| 16 | `Home` / `_Sidebar` | Landing bilingüe + navegación. | ✅ |
| 17 | Primeros pasos / Getting Started | Instalar, primer botón, páginas. | ✅ |
| 18 | Guía de uso / Referencia de acciones / Sensores y RGB (ES) | Migradas desde `docs/`. | ✅ |
| 19 | Versiones EN de las guías | Traducir guía, acciones, sensores. | ⬜ |
| 20 | Widgets y variables (ES/EN) | Reloj, clima, sensores, música, variable. | ⬜ |
| 21 | Atajos y macros (ES/EN) | Hotkeys globales, grabador de macros. | ⬜ |

## Bloque D — Features y pulido

Detalle de cada ítem en el [apéndice](#apéndice--catálogo-de-ideas) abajo.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 22 | 1.3 Acciones encadenadas | Delay por paso, condicional, bucles. | ⬜ |
| 23 | 1.4 Disparadores externos | Hotkey global / deep-link / HTTP local. | ⬜ |
| 24 | 6.1 Galería de perfiles | Repo público de perfiles ([spec](galeria.md)). | ⬜ |
| 25 | 1.1 Mando móvil | Controlar el deck desde el teléfono (red local). | ⬜ |
| 26 | 5.3/5.4 Pulido sensorial | Animación de press + sonidos seleccionables. | ⬜ |

---

## Apéndice — Catálogo de ideas

> Detalle de las propuestas (antes en `SUGERENCIAS.md`). Costo: S=pequeño,
> M=medio, L=grande. Beneficio: ★ útil, ★★ importante, ★★★ diferencial.

### 1. Funcionalidades nuevas

- **1.1 Mando móvil ★★★ · L** — Controlar el deck desde el teléfono vía red local
  (servidor HTTP/WS + pairing + UI web). Convierte cualquier teléfono en un panel.
- **1.2 Variables y estado ★★ · M** — ✅ HECHO. Capa `state` + interpolación `{var}` +
  `set-var`/`incr-var` + widget `variable`.
- **1.3 Acciones condicionales/encadenadas ★★ · M** — Ya hay `actions: ButtonAction[]`
  con delay fijo 150ms. Ampliar: delay por paso, condicional (ejecutar B si A ok),
  bucles (`repeat: 3`).
- **1.4 Disparadores externos ★★ · L** — Que un botón se active sin clic: hotkey global
  (✅ ya existe `globalHotkey`/`inTrayMenu`), deep-link `vd://`, llamada HTTP local.
- **1.5 Tipos de acción nuevos ★ · S-M** — Discord push-to-talk, control Spotify vía API,
  captura de región (✅ `region-capture`), webhook (✅), TTS (✅).

### 2. UX y editor

- **2.1 Editor de matriz 5×7 para íconos propios ★★ · M** — Dibujar un glifo 5×7 en el
  editor y usarlo como ícono (coherente con la firma dot-matrix). Existe `customGlyph57`.
- **2.2 Búsqueda global Ctrl+K ★★ · S** — ✅ HECHO (`SearchOverlay`).
- **2.4 Pegar imagen del portapapeles ★ · S** — ✅ HECHO (Ctrl+V en `EditorB`).
- **2.5 Drag & drop entre páginas ★ · M** — ✅ HECHO (arrastrar a la pestaña destino).
- **2.6 Historial visible (undo) ★ · S** — ✅ HECHO (toast de undo).
- **2.8 Vista previa al editar ★ · S** — ✅ HECHO (celda viva en `EditorB`).

### 3. Calidad de vida y robustez

- **3.1 Backups automáticos ★★ · S** — ✅ HECHO (5 backups con timestamp).
- **3.2 Validación de import ★ · S** — ✅ HECHO (`validateConfig`).
- **3.3 Toasts de error visibles ★ · S** — ✅ HECHO (errores de acción en `MainB`).
- **3.5 Migración de versiones del config ★ · S** — ✅ HECHO (`configVersion` + migrador).

### 4. Performance y deuda técnica

- **4.1 Bundle de íconos de marca diferido ★★ · M** — Cargar el catálogo con dynamic
  import solo al abrir `BrandIconPicker`. (Ya hay chunks separados en el build.)
- **4.2 Memoización de `ButtonCell` ★ · S** — ✅ HECHO (`memo` + comparator).
- **4.3 Centralizar polling de `nowPlaying` ★ · S** — ✅ HECHO (provider en `App`).
- **4.4 Formateadores reutilizables ★ · S** — ✅ HECHO (`TIME_FMT`/`DATE_FMT`).
- **4.6 Aplicar `VD.radius`/`shadow` al resto ★ · S** — ✅ HECHO (radios tokenizados).

### 5. Diseño e identidad

- **5.1 Reloj siempre en DotText ★★ · S** — ✅ HECHO (sidebar y fullscreen).
- **5.2 Wallpapers procedurales (scanlines/CRT) ★ · S** — ✅ HECHO (incluidos en fondos).
- **5.3 Animación de press con más carácter ★ · S** — Pulso radial / barrido de puntos
  desde el centro, en vez del flash de 300ms.
- **5.4 Sonido al press configurable ★ · S** — ✅ HECHO (4 perfiles).
- **5.5 Modo kiosko real ★ · M** — ✅ HECHO (PIN de salida en fullscreen).

### 6. Distribución y comunidad

- **6.1 Galería de perfiles ★★ · L** — Repo público de perfiles compartibles. Spec en
  [galeria.md](galeria.md). Pendiente: repo + UI de importar desde URL.
- **6.2 Auto-update ★ · M** — ✅ HECHO (`electron-updater` + GitHub Releases).
- **6.3 Empaquetado firmado ★ · M** — Documentado en [CONTRIBUTING.md](../CONTRIBUTING.md) (sección Firma y distribución).
- **6.4 Documentación ★ · S** — ✅ HECHO (wiki bilingüe).

---

## Cosas a NO hacer (lecciones)

- **No reintroducir polling pesado de sistema** (`systeminformation`, polling <5s).
  Si se necesita CPU/RAM, opt-in con widget aislado y polling >10s.
- **No agregar dependencias nativas sin justificación** (cada `node-gyp` suma tamaño,
  tiempo de instalación y bugs en Windows).
- **No multiplicar la paleta.** Los tokens de `src/design.ts` son la fuente de verdad.
- **No romper la firma dot-matrix.** Es lo que distingue a VirtualDeck.
