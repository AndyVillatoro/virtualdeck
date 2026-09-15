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

## Estado general (2026-09-14)

Auditoría sobre el código (no solo el doc):

- **Iteraciones 1 y 2 del plan original: ✅ completas** — memo(ButtonCell), formatters
  reutilizados, reloj DotText, radios tokenizados, búsqueda Ctrl+K, pegar imagen,
  drag entre páginas, toast de undo, celda viva de preview, backups, toasts de error.
- **Iteración 3 (diferencial): ✅ 1.2 Variables** (interpolación `{var}`, `set-var`/
  `incr-var`, persistencia, `branch`, widget `variable`).
- **Iteración 4 (comunidad): ✅** — auto-update ✅ (**el código estaba desde el
  principio, pero no funcionaba**: ninguna publicación subía el `latest.yml` que
  electron-updater pide, así que la comprobación daba 404 en silencio. Arreglado
  en la 0.9.2 y verificado descargando el manifiesto), docs ✅, firma documentada ✅;
  galería de perfiles ✅ en la app (manifiesto v2, ficha de riesgo, tienda `#tienda`;
  ver [galeria.md](galeria.md)). Lo único fuera es el **repo público**, diferido a
  otra versión por decisión del dueño (qué se publica y con qué criterio).
- **Publicado / Versión actual:** **v0.12.0** en GitHub Releases, con `latest.yml` y `.blockmap`
  —sin esos dos la actualización automática no funciona y no avisa—. La Store va por
  separado (ítem 30). Incluye Bloque 7 completo (DOT/480, multi-monitor, auto-perfiles,
  botones anclados, mosaico 2×2, sliders continuos táctiles, mando web móvil interactivo
  y refactor modular SRP).
- **Deuda Técnica y Modularidad (Bloque B): ✅ completado** — modularización de `DotGlyphIcon.tsx`
  (887 → 72 líneas), descomposición de `src/types/` en módulos semánticos, desacople SRP de
  `FullscreenB.tsx` (complejidad 36 → <18) y `ButtonCell.tsx` (complejidad 34 → <18 con `CuerpoCelda`).
- **i18n profundo (Bloque A): ✅ todo**, incluido lo que no estaba en la lista — el
  **proceso principal** (bandeja y diálogos) y los módulos que no son componentes.
  818 claves ES/EN. Con una salvedad que conviene no olvidar: la auditoría es una
  heurística, y esta sesión encontró textos con ella en verde **abriendo la app en
  inglés**. «Auditoría limpia» no es «todo traducido».
- **Código muerto: ✅** knip en cero (eran ~97 exports y 17 tipos).
- **Guardianes de `npm run check`: seis.** i18n, tipos de acción, canales IPC, wiki,
  campos del editor y perfiles de la galería. Cada uno nació de un fallo que llegó a
  la máquina del usuario con la compilación en verde.
- **Lecciones de la ronda de auditoría (0.9.4 y 0.10.0):** *un camino que no se ejecuta nunca
  se pudre sin que nadie lo note, y a quien le toca es justo quien no puede
  diagnosticarlo* — de ahí `VD_SIN_NUCLEO=1`. Y *devolver éxito sin haber hecho nada
  es peor que fallar*, porque no deja rastro que seguir.

---

## Bloque A — i18n profundo (pantalla por pantalla)

Cerrado. Quedó además cubierto el proceso principal, que no estaba en la lista.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 1 | `WallpaperB` | Traducir 100% (UI + nombres de fondos). | ✅ 2026-05-29 |
| 2 | `EditorB` — pasos y chrome | Pasos, botones, encabezados de sección. | ✅ 2026-05-29 |
| 3 | `editor/actionData.ts` | Etiquetas/descripciones de los 34 tipos de acción (label→clave i18n). | ✅ 2026-05-29 |
| 4 | `EditorB` — config por acción | Campos/placeholders de cada tipo (120 strings vía `useFieldText`). | ✅ 2026-05-29 |
| 5 | `EditorB` — estilo e íconos | Completo; la auditoría cubre labels, placeholders y children. | ✅ 2026-08-23 |
| 6 | `RGBManagerB` | Traducido (27 llamadas a t/tf en la pantalla + 26 en sus piezas). | ✅ 2026-08-23 |
| 7 | `FullscreenB` | Traducido, incluida la fecha del reloj, que estaba fija en `es-HN`. | ✅ 2026-08-23 |
| 8 | `MainB` | Traducido. | ✅ 2026-08-23 |
| 9 | `settings/RGBSection` · `SensorsSection` | Traducido. | ✅ 2026-08-23 |
| 10 | `BrandIconEditor` / `BrandIconPicker` | Traducido. | ✅ 2026-08-23 |

## Bloque B — Deuda SRP (dividir lo que hace de más)

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 11 | `EditorB` | Vista previa y los tres efectos de carga fuera (`editor/VistaPrevia`, `useCatalogos`, `useCapturaHotkey`, `usePegarImagen`). 605 → 485 líneas, complejidad 21 → bajo el límite. | ✅ 2026-08-31 |
| 12 | `TitleBar` | Extraído a `settings/PanelAjustes` + `RGBSection`/`SensorsSection`. | ✅ |
| 12.1 | `TitleBar` (auditoría profunda) | Reducir complejidad ciclomática (29 → <18), separar controles de ventana, navegación y atajos, reducir prop drilling a `PanelAjustes`. Modo compacto adaptativo para monitores estrechos / zoom > 150%. | ✅ 2026-09-12 |
| 13 | `MainB` | Rejilla, panel lateral, pestañas fuera; desacople modular con `ModalVincularApp`, `BarraSeleccionLote`, `MenuContextualPagina` y `tipos.ts`. 933 → 542 líneas, complejidad baja. | ✅ 2026-09-13 |
| 14 | `RGBManagerB` | Lista de dispositivos y panel de perfiles fuera (`rgb/ListaDispositivos`, `rgb/PanelPerfiles`). 478 → 450 líneas, complejidad 20 → bajo el límite. | ✅ 2026-08-31 |
| 15 | `utils/actions.ts` | Dividido en `utils/acciones/` (una familia por archivo) + guardián de cobertura. | ✅ |

### Limpieza continua de código muerto (knip)

Correr `npm run lint:dead` y eliminar lo confirmado, de a poco. (`electron-updater` figura como falso positivo por su import dinámico → ignorado en `knip.json`.)

- ✅ 2026-05-29 — `electron/main/bootstrap.ts` (entry point alternativo huérfano, con no-op roto) eliminado.
- ✅ 2026-05-29 — `lucide-react` (dependencia muerta: `VDIcon` migró a SVG inline) desinstalada + atribución quitada de `credits.ts`.
- ✅ 2026-08-23 — knip en cero. 64 iconos SVG muertos, 6 funciones huérfanas y 35 `export` innecesarios. El paquete **no adelgazó** (mismo hash): Vite ya los descartaba.
- ✅ 2026-09-13 — knip en cero. Limpieza de exports e imports huérfanos tras integración de widgets, sliders, monitores y perfiles. Parada limpia de tracker (`stopActiveWindowTracker`).

## Bloque C — Documentación (wiki bilingüe)

El botón "Documentación" apunta al wiki. Lo llenamos desde [docs/wiki/](wiki/README.md).

**Publicado el 2026-09-05**: las 14 páginas están en vivo en
`github.com/AndyVillatoro/virtualdeck/wiki`. Comprobado que responden.
`docs/wiki/` sigue siendo el borrador: se edita ahí y se republica.

| # | Página | Objetivo | Estado |
|---|--------|----------|--------|
| 16 | `Home` / `_Sidebar` | Landing bilingüe + navegación. | ✅ |
| 17 | Primeros pasos / Getting Started | Instalar, primer botón, páginas. | ✅ |
| 18 | Guía de uso / Referencia de acciones / Sensores y RGB (ES) | Migradas desde `docs/`. | ✅ |
| 19 | Versiones EN de las guías | Guía de uso, acciones y sensores traducidas. | ✅ |
| 20 | Widgets y variables (ES/EN) | Los seis widgets, variables, interruptores y grupos. | ✅ |
| 21 | Atajos y macros (ES/EN) | Atajos, hotkeys globales, grabador y formato de macro. | ✅ |

## Bloque D — Features y pulido

Detalle de cada ítem en el [apéndice](#apéndice--catálogo-de-ideas) abajo.

| # | Apartado | Objetivo | Estado |
|---|----------|----------|--------|
| 22 | 1.3 Acciones encadenadas | El motor ya lo hacia; faltaban los mandos. Espera, repetir y «solo si OK» por paso en el editor. | ✅ 2026-08-31 |
| 23 | 1.4 Disparadores externos | Hotkey global, deep-link `virtualdeck://` y servidor HTTP local con token (apagado de fabrica). | ✅ 2026-08-31 |
| 24 | 6.1 Galería de perfiles | Repo público con cuatro perfiles, botón «galería del proyecto» en los ajustes y aviso previo de lo que el perfil ejecuta — **incluido lo que teclea**, que faltaba y era el agujero grande ([spec](galeria.md)). | ✅ 2026-09-06 |
| 25 | 1.1 Mando móvil | Página servida por el servidor local, con emparejamiento por código de seis cifras. | ✅ 2026-08-31 |
| 26 | 5.3/5.4 Pulido sensorial | Ya estaba hecho: pulso radial de 320 ms (`vd-flash-pulse`) + 4 perfiles de sonido. Verificado en pantalla. | ✅ 2026-08-31 |
| 27 | Botón ± para brillo y volumen | Acción `adjust`: sube o baja desde donde esté. Rueda del ratón sobre la celda, o dos botones. Cuatro presets sembrados. | ✅ 2026-08-23 |
| 28 | Widget de divisas | Conversión entre dos monedas, tasa diaria de `open.er-api.com`, cacheada. | ✅ 2026-08-23 |
| 29 | Más presets RGB | De 7 a 18, con brillo y velocidad por preset. Sin motor de animación: se decidió ir por presets prehechos. | ✅ 2026-08-23 |
| 30 | Microsoft Store (MSIX) | Publicada en la Store como VirtualDeck. Documentar ciclo de actualización continua de versiones (bump semver + partner center) e incorporar botón oficial en landing. | ✅ / 🚧 |
| 30 | Microsoft Store (MSIX) | Publicada en la Store como VirtualDeck. Automatización completa del empaquetado y validación de `VirtualDeck-X.Y.Z.msix` con `npm run package:store` (`scripts/build-store.mjs`), generación de assets, saneado de mapping y makeappx del Windows SDK con checklist interactivo para Partner Center. | ✅ 2026-09-12 |
| 31 | Auditoría de caminos de respaldo | `VD_SIN_NUCLEO=1` para arrancar ignorando el núcleo nativo. Sin él ese código no se ejecuta nunca y se pudre; cinco fallos de la 0.9.4 salieron de ahí. | ✅ 2026-09-06 |
| 32 | Auditoría «dice que sí sin hacer nada» | Barrido de las acciones que devuelven éxito con la lista vacía o sin encontrar nada: RGB, enlaces, lanzador. | ✅ 2026-09-06 |
| 33 | Integridad de la configuración | Escritura atómica (temporal + renombre con reintentos) y rotación de copias por fecha, no por nombre. | ✅ 2026-09-06 |
| 34 | Mando entre decks | Accion `remote`: un deck pulsa botones de otro por el servidor local que ya existia. Medido con dos VirtualDeck a la vez. | ✅ 2026-09-06 |
| 35 | Pagina de promocion | `docs/index.html`, bilingue, servible por Pages desde `main` / `/docs`. Rediseño moderno/3D con Three.js, recursos de `docs/prensa` y badge de Microsoft Store. | ✅ 2026-09-12 |
| 36 | Donaciones | Ko-fi y PayPal reales, apartado propio en los ajustes. GitHub Sponsors fuera: Stripe no opera en Honduras. | ✅ 2026-09-07 |
| 37 | Barra flotante: GIFs e imágenes | Registrar esquema y protocolo `vd://` en la partición de sesión `persist:vd-barra`. Actualmente las imágenes locales `vd://` no cargan en la barra. | ✅ 2026-09-12 |
| 38 | Mando móvil y servidor local | Resolver conectividad LAN: comprobación de firewall en Windows, soporte para hostnames/mDNS en validación de Host, feedback de IP activa en UI. | ✅ 2026-09-12 |
| 39 | Control de brillo y Surface Pro 8 | Soporte para pantallas modernas sin WMI clásico (Surface Pro 8 / Intel Xe via WinRT `BrightnessOverride` o WDDM) y resiliencia en DDC/CI cuando la lectura falla pero la escritura funciona. | ✅ 2026-09-12 |
| 40 | Landing Page con Three.js | Modelo 3D interactivo en la web con física de pulsación en botones, texturas dinámicas OLED dot-matrix, iluminación realista y badge oficial de Microsoft Store. | ✅ 2026-09-12 |
| 41 | Sistema Visual DOT / 480 (OLED Micro Interface) | Evolución de identidad inspirada en [Ideas, Now Physical — ESP-Mosaico (Henry Li)](https://esp-mosaico.vercel.app/): grilla estricta de 4px (`4PX GRID`); modo oscuro en negro OLED puro (`BG #070809`, `SURFACE #111315`); modo claro con tonalidades en grises industriales/cemento (evitando blancos deslumbrantes); compatibilidad total con los acentos de VirtualDeck (los 10 presets actúan como acento primario `RED #FF3B30`); gráficos halftone/dithered para carátulas e imágenes, arcos dot concéntricos y formas de onda de audio en puntos. | ✅ 2026-09-12 |
| 42 | Estudio de Hardware Paramétrico | Inspirado en [Codyboard — Hardware Study 01](https://codyboard.github.io/codyboard-designer/) ([repositorio](https://github.com/Codyboard/codyboard-designer.git)): Modelado de proporciones de chasis físico (escala mm a px), knobs/encoders giratorios virtuales y barras de luz difusa LED WS2812B como widgets decorativos. | ⏸ Archivado |
| 43 | Detección dinámica de monitores y multi-pantalla | Escucha en caliente de pantallas conectadas/desconectadas (`screen.on('display-added')`), selector de monitor destino para ventana principal / kiosko, clamping de seguridad contra desconexiones, conmutador rápido en TitleBar y sección DOT en ajustes. | ✅ 2026-09-12 |
| 44 | Perfiles automáticos por aplicación activa + Botones anclados globales | Cambio inteligente de página según la ventana/proceso en primer plano (ej. OBS, Photoshop, IDE) y opción de botones fijos/anclados que persisten en todas las páginas. | ✅ 2026-09-12 |
| 45 | Subdivisión modular de mosaico 2×2 | Capacidad de dividir 1 celda estándar en 4 mini-botones independientes (cuartos de celda) para funciones compactas y alta densidad de controles. | ✅ 2026-09-12 |
| 46 | Botón explícito "Eliminar botón" / vaciar celda | Integración directa del botón de eliminación en `EditorB` con confirmación in-situ, cancelación por Escape y botón interactivo `[DESHACER]` táctil/ratón en el toast. | ✅ 2026-09-12 |
| 47 | Dial visual rotativo dot-matrix para scroll de mouse | Indicador gráfico circular (dial de 16 puntos LED concéntricos) en celdas de volumen y brillo (`adjust`) que responde visualmente en tiempo real al giro de la rueda del ratón y clics, con estela de rotación y feedback flotante del delta. | ✅ 2026-09-12 |
| 48 | Widget de barra / slider táctil continuo | Widget táctil horizontal/vertical para deslizamiento continuo con dedo o ratón, optimizado para tabletas y dispositivos táctiles (Surface Pro). | ✅ 2026-09-12 |
| 49 | Acciones encadenadas avanzadas | Retraso individual por paso (`delayMs`), condiciones de bifurcación («ejecutar paso B solo si paso A fue OK / si falló»), bucles de repetición («repetir N veces»), continuación ante fallos (`continueOnError`) y reordenamiento visual de pasos (hasta 8 acciones). | ✅ 2026-09-13 |
| 50 | Nuevos tipos de acción e integraciones de terceros | Discord push-to-talk / toggle mute nativo vía RPC/IPC, y control de Spotify Web API para selección directa de playlists y dispositivos de reproducción. | ✅ 2026-09-13 |
| 51 | Expansión del núcleo nativo Rust (`vd-core`) | Migración completa de comandos auxiliares de PowerShell (búsqueda de procesos, manipulación de ventanas, monitor multi-pantalla, active app tracker in-process en <0.05ms) al módulo compilado en Rust a 2ms. | ✅ 2026-09-14 |
| 52 | Modo claro refinado (grises industriales / anti-glare) | Sustituir fondos blancos puros (#ffffff) en `VD_LIGHT` y controles por escala de grises suaves (cemento/industrial #e2e4e8 / #d8dbe0 / #1a1d20) para evitar deslumbramiento manteniendo legibilidad y estilo DOT. | ✅ 2026-09-14 |
| 53 | Menú de configuración colapsable (acordeón DOT) | Cada apartado de `PanelAjustes.tsx` se convierte en una sección colapsable individual con cabecera técnica DOT, indicador LED/chevron interactivo y memoria de estado colapsado para navegación limpia y compacta. | ✅ 2026-09-14 |
| 54 | Presets de navegación web ampliados (IA y utilidades) | Expansión del catálogo de accesos web en `actionData.ts` y chips de autocompletado en el editor: Gemini, Claude, ChatGPT, GitHub, YouTube, Twitch, Reddit, Discord Web, WhatsApp Web, Notion, Spotify Web. | ✅ 2026-09-14 |
| 55 | Hardening y auditoría de integraciones Spotify y Discord | Pruebas exhaustivas y validación end-to-end de Discord (RPC local / pipes / mute / deafen / manejo ante app cerrada) y Spotify (flujo de tokens / play URI / selección de dispositivo / reconexión y feedback en celda). | ✅ 2026-09-14 |

### 🎯 Matriz de Prioridades de Nuevas Características y Pendientes (v0.13.0+)

Completada el 2026-09-15 (todo en `main`; ver `docs/HANDOFF.md`). Se conserva
como registro:

| Prioridad | Ítem | Estado |
|-----------|------|--------|
| **P1 — Inmediata** | **52. Modo Claro Refinado (Anti-Glare)** | ✅ 2026-09-14 |
| **P1 — Inmediata** | **53. Menú de Configuración Colapsable** | ✅ 2026-09-14 |
| **P1 — Inmediata** | **54. Presets Web Ampliados (Gemini, etc.)** | ✅ 2026-09-14 |
| **P2 — Alta** | **55. Hardening Spotify & Discord** | ✅ 2026-09-14 |
| **P3 — Media** | **Auditoría Deuda Técnica: Idiomas (`max-lines: 600`)** | ✅ 2026-09-15 (fragmentos por dominio) |
| **P3 — Media** | **Auditoría SRP: Complejidad en `EditorB` / `MainB`** | ✅ 2026-09-15 (piezas puras extraídas) |
| **P4 — Ecosistema** | **24/6.1. Galería de Perfiles en Vivo** | ✅ 2026-09-15 app (Fase 1: manifiesto v2; Fase 2: ventana `#tienda`); repo público diferido |
| **P5 — Mantenimiento** | **4.1 / 30. Lazy Loading de Iconos & Store MSIX** | ✅ 2026-09-15 (chunk `brandIcons` + `build-store.mjs`) |


---

## Apéndice — Catálogo de ideas

> Detalle de las propuestas (antes en `SUGERENCIAS.md`). Costo: S=pequeño,
> M=medio, L=grande. Beneficio: ★ útil, ★★ importante, ★★★ diferencial.

### 1. Funcionalidades nuevas

- **1.1 Mando móvil ★★★ · L** — Controlar el deck desde el teléfono vía red local
  (servidor HTTP/WS + pairing + UI web). Convierte cualquier teléfono en un panel.
- **1.2 Variables y estado ★★ · M** — ✅ HECHO. Capa `state` + interpolación `{var}` +
  `set-var`/`incr-var` + widget `variable`.
- **1.3 Acciones condicionales/encadenadas ★★ · M** — ✅ HECHO (Ítem 49).
  Secuencia ampliada a 8 pasos, delay individual por paso (`delayMs`), bifurcación condicional
  (`onlyIfPrevOk` / `onlyIfPrevFailed`), bucles (`repeat: N`), `continueOnError` y reordenamiento.
- **1.4 Disparadores externos ★★ · L** — Que un botón se active sin clic: hotkey global
  (✅ ya existe `globalHotkey`/`inTrayMenu`), deep-link `vd://`, llamada HTTP local.
- **1.5 Tipos de acción nuevos ★ · S-M** — ✅ HECHO (Ítem 50). Discord push-to-talk / toggle mute nativo vía RPC/IPC local, control Spotify vía URI/API, captura de región (✅ `region-capture`), webhook (✅), TTS (✅).
- **1.6 Presets ampliados de navegación web ★★ · S** — Catálogo directo en `actionData.ts` y chips de inserción en el editor para IA y herramientas habituales: Gemini (`gemini.google.com`), Claude, ChatGPT, GitHub, YouTube, Twitch, Reddit, Discord Web, WhatsApp Web, Notion, Spotify Web.
- **1.7 Auditoría y hardening de integraciones de terceros (Spotify & Discord) ★★ · M** — Pruebas end-to-end de los canales IPC/RPC: Discord Named Pipes ante inicio tardío o cierre del cliente, y control de Spotify Web API (dispositivos, transferencias y fallback de token) con feedback reactivo de estado en celda.


### 2. UX y editor

- **2.1 Editor de matriz 5×7 para íconos propios ★★ · M** — ✅ HECHO (2026-09-14).
  Diseñador interactivo en `Glyph57Editor.tsx` con arrastre continuo (paint/erase),
  herramientas de transformación (Shift ▲▼◀▶, Invertir, Espejo H/V, Limpiar, Llenar, Deshacer Ctrl+Z),
  paleta de 16 símbolos pre-calculados y celda simulada OLED de vista previa.
- **2.2 Búsqueda global Ctrl+K ★★ · S** — ✅ HECHO (`SearchOverlay`).
- **2.3 Portapapeles de botones y duplicación de página ★★ · S** — ✅ HECHO (2026-09-14).
  Copiar (`Ctrl+C`), pegar (`Ctrl+V`) y duplicar (`Ctrl+D`) celdas, vaciar (`Delete`/`Backspace`),
  menú contextual en celda y duplicación de página completa en menú contextual de pestañas
  con persistencia en historial `withHistory` y feedback de toasts.
- **2.4 Pegar imagen del portapapeles ★ · S** — ✅ HECHO (Ctrl+V en `EditorB`).
- **2.5 Drag & drop entre páginas ★ · M** — ✅ HECHO (arrastrar a la pestaña destino).
- **2.6 Historial visible (undo) ★ · S** — ✅ HECHO (toast de undo).
- **2.8 Vista previa al editar ★ · S** — ✅ HECHO (celda viva en `EditorB`).
- **2.9 Menú de configuración colapsable (acordeón DOT) ★★ · S-M** — Transformación de `PanelAjustes.tsx` en un acordeón técnico modular donde cada uno de los 12 apartados (Acento, Monitores, Sonido, Perfiles, etc.) posee un encabezado cliqueable, indicador visual LED/chevron y memoria de colapso, evitando el desbordamiento vertical de pantalla.

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
- **5.3 Animación de press con más carácter ★ · S** — ✅ HECHO (2026-09-14).
  "Radial Dot Sweep": onda expansiva de micro-puntos LED discretos acelerada por GPU que nace
  en el centro (50%, 50%) de la celda y viaja físicamente hacia afuera en 360° con anillos concéntricos
  punteados, chispa nuclear central de ignición y transición fluida tanto en botones configurados
  como en celdas vacías (con delay de 250ms antes de abrir el editor modal).
- **5.4 Sonido al press configurable ★ · S** — ✅ HECHO (4 perfiles).
- **5.5 Modo kiosko real ★ · M** — ✅ HECHO (PIN de salida en fullscreen).
- **5.6 Modo claro refinado (grises ergonómicos anti-glare) ★★ · S** — Revisión completa de `VD_LIGHT` y estilos de inputs/paneles: sustitución de fondos blancos puros (`#ffffff`) que causan fatiga visual por una escala de grises industriales suaves (`#e2e4e8`, `#d8dbe0`, `#f0f1f4`) inspirada en el hardware Braun/teenage engineering, preservando legibilidad técnica de 8-9px y ratios de contraste WCAG AA.

### 6. Distribución y comunidad

- **6.1 Galería de perfiles ★★ · L** — ✅ HECHO en la app (manifiesto v2 con
  páginas/versiones, ficha de riesgo, tienda `#tienda` con buscador/filtros/updates).
  Spec en [galeria.md](galeria.md). Diferido a otra versión: el repo público
  (decisión del dueño: qué se publica y con qué criterio).
- **6.2 Auto-update ★ · M** — ✅ HECHO (`electron-updater` + GitHub Releases).
- **6.3 Empaquetado firmado ★ · M** — Documentado en [CONTRIBUTING.md](../CONTRIBUTING.md) (sección Firma y distribución).
- **6.4 Documentación ★ · S** — ✅ HECHO (wiki bilingüe).

### 7. Sistema Visual DOT / 480 & Hardware Táctil (Ítems 41 a 48)

- **7.1 Sistema Visual DOT / 480 (OLED Micro Interface) ★★★ · L** — ✅ HECHO (Prototipo multi-lámina PX-05/PX-03/Casing, purga integral de emojis y unicode, micro-iconos bitmask 8×8 y diseño de hardware ESP-Mosaico implementados en toda la aplicación).
  Evolución estética inspirada en [Ideas, Now Physical — ESP-Mosaico (Henry Li)](https://esp-mosaico.vercel.app/):
  - **Paleta y Cuadrícula**: Grilla estricta en múltiplos de 4px (`4PX GRID`). Modo oscuro en negro OLED puro (`BG #070809`, `SURFACE #111315`, `BORDER #1F2229`), acento primario de referencia (`RED #FF3B30`) plenamente intercambiable con los 10 presets de color de VirtualDeck. Modo claro en tonalidades de grises industriales/cemento (evitando blancos deslumbrantes).
  - **Tipografía y Componentes**: Números grandes y códigos de estado renderizados en matriz de puntos discretos (5×7 y 7×9). Módulos de celda con cabecera técnica (`01 HOME`, `02 MUSIC`, `03 TIMER`) y carril lateral vertical táctil para disparadores secundarios.
  - **Gráficos Dithered / Halftone**: Procesamiento de carátulas e imágenes en tramado de puntos (1-bit / 2-bit halftone) estilo serigrafía técnica.
  - **Indicadores Concéntricos de Puntos**: Arcos circulares de puntos (`●●●○○○`) para temporizador, volumen, batería y progreso. Ondas de audio en barras verticales de puntos.
- **7.2 Estudio de Hardware Paramétrico ★★ · M** — ⏸ Archivado / Pausado.
  Inspirado en [Codyboard Designer](https://codyboard.github.io/codyboard-designer/) ([repositorio](https://github.com/Codyboard/codyboard-designer.git)):
  - Modelado de proporciones de chasis físico (conversión milímetros a píxeles), knobs/encoders giratorios virtuales y tiras de luz difusa LED WS2812B como widgets decorativos.
- **7.3 Detección Dinámica de Monitores y Multi-Pantalla ★★ · M** — ✅ HECHO (2026-09-12)
  - **Detección Dinámica Hotplug**: Suscripción reactiva en proceso principal (`screen.on('display-added')`, `screen.on('display-removed')`, `screen.on('display-metrics-changed')`) con difusión en tiempo real al renderer vía `events.onDisplaysChanged`.
  - **Seguridad Offscreen Auto-Clamping**: Si un monitor secundario se desconecta mientras VirtualDeck se encuentra en él, la ventana se reposiciona y sujeta automáticamente en el área de trabajo de la pantalla principal (`clampBoundsToDisplay`) previniendo que la app quede invisible o perdida fuera de pantalla.
  - **Movimiento de Ventana y Destino de Kiosko**: Canales IPC `window:getDisplays` y `window:moveToDisplay` para mover la ventana preservando estados maximizado y fullscreen. Configuración persistente de `targetDisplayId` para proyectar el modo Kiosko/Fullscreen automáticamente sobre un monitor secundario o pantalla auxiliar seleccionada.
  - **Conmutador Rápido en Barra de Título & Sección DOT en Ajustes**: Botón contextual táctil `[MONITOR X/Y]` en la `TitleBar` cuando existen múltiples pantallas para saltar de monitor en un solo clic, y panel `DisplaysSection` en ajustes con estética DOT/OLED micro-interface, métricas técnicas (resolución, tasa Hz, soporte táctil) y botones de acción rápida.
- **7.4 Perfiles Automáticos por Aplicación Activa + Botones Anclados ★★ · M** — ✅ HECHO (2026-09-12)
  - **Seguimiento Nativo de Ventana Activa**: Daemon persistente en segundo plano PowerShell/P-Invoke con Win32 `GetForegroundWindow` + `GetWindowThreadProcessId` que emite `window:activeAppChanged` y expone `window.getActiveApp()` con 0% de CPU.
  - **Cambio Automático de Páginas y Perfiles**: Hook `useAutoProfile` con debounce (250ms) y filtro de bucle/auto-enfoque; cambia dinámicamente a la página o perfil configurado para el proceso en primer plano (ej. `obs64`, `photoshop`, `code`), y vuelve a la página 1 (`autoProfileRestoreDefault`) si no hay coincidencias.
  - **Vinculación de Aplicaciones**: Insignia retro DOT `APP_WINDOW` en pestañas de páginas, selector interactivo en menú contextual de página con lista de procesos en ejecución (`runningProcesses`) y campo de texto libre, y asociación de app destino por perfil en `PanelAjustes`.
  - **Botones Anclados Globales**: Conmutador DOT en `PasoEstilo` del editor, micro-insignia física `PIN` en celdas, acción rápida de anclaje en el menú contextual derecho (`MenuContextual`), y proyección matemática directa de huecos en `resolverBotonesPagina` para persistencia homogénea en la cuadrícula a través de todas las páginas.
- **7.5 Subdivisión Modular de Mosaico 2×2 ★★ · S-M** — ✅ HECHO (2026-09-12)
  Capacidad de dividir 1 celda estándar en 4 mini-botones independientes (cuadrantes TL, TR, BL, BR) con soporte de todas las 37 acciones, micro-etiquetas mono, iconos dot-matrix, indicador LED de toggle, pulsación independiente, selector 2×2 en `EditorB` con plantillas predefinidas (Multimedia, Direcciones, Accesos, Audio) y capa de filtro visual Dot Matrix retro OLED para carátulas de música y fondos de botones personalizados.
- **7.6 Botón Explícito de Eliminación / Vaciar Celda ★ · S** — ✅ HECHO (2026-09-12)
  Botón directo en `EditorB` para vaciar o eliminar la configuración de un botón con confirmación in-situ con icono `TRASH`, cancelación fluida con Escape y botón interactivo táctil/ratón `[DESHACER]` (`UNDO` dot glyph) en el toast.
- **7.7 Dial Visual Rotativo Dot-Matrix para Scroll de Ratón ★★ · S** — ✅ HECHO (2026-09-12)
  Indicador gráfico circular (`DotRotaryDial`) de 16 puntos LED concéntricos en celdas de ajuste de volumen y brillo (`adjust`) que responde visualmente en tiempo real al giro de la rueda del ratón y clics, con estela de rotación en el color de acento y feedback flotante del delta (+10% / -5%).
- **7.8 Widget de Barra / Slider Táctil Continuo ★★ · S-M** — ✅ HECHO (2026-09-12)
  - **Interacción Táctil y Puntero Continuo**: Deslizamiento directo horizontal y vertical (fader) con captura de puntero (`setPointerCapture`) para tabletas (Surface Pro), pantallas táctiles y ratón, con respuesta local de 0 ms y despacho IPC acelerado/throttled (~40 ms). Soporte nativo de rueda del ratón con saltos por paso configurable.
  - **Integración con Hardware y Estado**: Soporta control en vivo de volumen del sistema (`volume`), brillo de monitores (`brightness`), o variables dinámicas del deck (`variable`) con sincronización bidireccional inmediata.
  - **Alineación Visual DOT / 480 (OLED Micro Interface)**: Renderizado en cuadrícula estricta de 4px con micro-columnas LED discretas de 3 puntos (horizontal) y segmentos fader (vertical), punto guía blanco activo (`#ffffff`), escala técnica (`0 • 50 • 100`), valor porcentual flotante y 0 emojis.
  - **Pipeline Completo en Editor**: Selector de widget `'slider'` en `PasoEstilo`, editor `CamposSlider` con preview interactiva en tiempo real en `VistaPrevia`, guardado e i18n integral en español e inglés.

---

## Cosas a NO hacer (lecciones)

- **No reintroducir polling pesado de sistema** (`systeminformation`, polling <5s).
  Si se necesita CPU/RAM, opt-in con widget aislado y polling >10s.
- **No agregar dependencias nativas sin justificación** (cada `node-gyp` suma tamaño,
  tiempo de instalación y bugs en Windows).
- **No multiplicar la paleta.** Los tokens de `src/design.ts` son la fuente de verdad.
- **No romper la firma dot-matrix.** Es lo que distingue a VirtualDeck.
- **No devolver éxito por defecto.** Un bucle sobre una lista vacía, un `find` que no
  encuentra nada o un `default:` que responde «ok» dejan al usuario sin nada que
  mirar. Si no se hizo nada, se dice.
- **No dar por buena una función con dos caminos habiendo probado uno.** Con el núcleo
  nativo cargado el respaldo no se ejecuta jamás: `VD_SIN_NUCLEO=1`.
- **No marcar ✅ sin haber abierto la aplicación.** El PIN de kiosko (5.5) figuró como
  hecho durante meses y no protegía nada; `rgb-preset` tenía manejador, formulario y
  presets, y no se podía elegir. Los dos compilaban y pasaban todos los guardianes.
  Se manejan la interfaz por CDP con `Input.dispatchMouseEvent` — los eventos
  sintéticos React los ignora — sembrando `onboardingCompleted:true` en el perfil,
  porque si no el tutorial tapa la ventana.
