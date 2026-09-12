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

## Estado general (2026-09-06)

Auditoría sobre el código (no solo el doc):

- **Iteraciones 1 y 2 del plan original: ✅ completas** — memo(ButtonCell), formatters
  reutilizados, reloj DotText, radios tokenizados, búsqueda Ctrl+K, pegar imagen,
  drag entre páginas, toast de undo, celda viva de preview, backups, toasts de error.
- **Iteración 3 (diferencial): ✅ 1.2 Variables** (interpolación `{var}`, `set-var`/
  `incr-var`, persistencia, `branch`, widget `variable`).
- **Iteración 4 (comunidad): 🟡** — auto-update ✅ (**el código estaba desde el
  principio, pero no funcionaba**: ninguna publicación subía el `latest.yml` que
  electron-updater pide, así que la comprobación daba 404 en silencio. Arreglado
  en la 0.9.2 y verificado descargando el manifiesto), docs ✅, firma documentada ✅;
  falta **galería de perfiles** (ver [galeria.md](galeria.md)).
- **Publicado:** hasta **v0.11.0** en GitHub Releases, con `latest.yml` y `.blockmap`
  —sin esos dos la actualización automática no funciona y no avisa—. La Store va por
  separado (ítem 30).
- **i18n profundo (Bloque A): ✅ todo**, incluido lo que no estaba en la lista — el
  **proceso principal** (bandeja y diálogos) y los módulos que no son componentes.
  512 claves ES/EN. Con una salvedad que conviene no olvidar: la auditoría es una
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
| 12.1 | `TitleBar` (auditoría profunda) | Reducir complejidad ciclomática (29 → <18), separar controles de ventana, navegación y atajos, reducir prop drilling a `PanelAjustes`. Enfoque prioritario exclusivo antes de otros componentes. | 🚧 |
| 12.1 | `TitleBar` (auditoría profunda) | Reducir complejidad ciclomática (29 → <18), separar controles de ventana, navegación y atajos, reducir prop drilling a `PanelAjustes`. Modo compacto adaptativo para monitores estrechos / zoom > 150%. | ✅ 2026-09-12 |
| 13 | `MainB` | Rejilla, panel lateral, pestañas, widgets y disparadores fuera. 815 → 618 líneas. | ✅ |
| 14 | `RGBManagerB` | Lista de dispositivos y panel de perfiles fuera (`rgb/ListaDispositivos`, `rgb/PanelPerfiles`). 478 → 450 líneas, complejidad 20 → bajo el límite. | ✅ 2026-08-31 |
| 15 | `utils/actions.ts` | Dividido en `utils/acciones/` (una familia por archivo) + guardián de cobertura. | ✅ |

### Limpieza continua de código muerto (knip)

Correr `npm run lint:dead` y eliminar lo confirmado, de a poco. (`electron-updater` figura como falso positivo por su import dinámico → ignorado en `knip.json`.)

- ✅ 2026-05-29 — `electron/main/bootstrap.ts` (entry point alternativo huérfano, con no-op roto) eliminado.
- ✅ 2026-05-29 — `lucide-react` (dependencia muerta: `VDIcon` migró a SVG inline) desinstalada + atribución quitada de `credits.ts`.
- ✅ 2026-08-23 — knip en cero. 64 iconos SVG muertos, 6 funciones huérfanas y 35 `export` innecesarios. El paquete **no adelgazó** (mismo hash): Vite ya los descartaba.

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
| 41 | Sistema Visual DOT / 480 (OLED Micro Interface) | Evolución de identidad inspirada en [Ideas, Now Physical — ESP-Mosaico (Henry Li)](https://esp-mosaico.vercel.app/): grilla estricta de 4px (`4PX GRID`); modo oscuro en negro OLED puro (`BG #070809`, `SURFACE #111315`); modo claro con tonalidades en grises industriales/cemento (evitando blancos deslumbrantes); compatibilidad total con los acentos de VirtualDeck (los 10 presets actúan como acento primario `RED #FF3B30`); gráficos halftone/dithered para carátulas e imágenes, arcos dot concéntricos y formas de onda de audio en puntos. | ⬜ |
| 42 | Estudio de Hardware Paramétrico | Inspirado en [Codyboard — Hardware Study 01](https://codyboard.github.io/codyboard-designer/) ([repositorio](https://github.com/Codyboard/codyboard-designer.git)): Modelado de proporciones de chasis físico (escala mm a px), knobs/encoders giratorios virtuales y barras de luz difusa LED WS2812B como widgets decorativos. | ⬜ |
| 43 | Detección dinámica de monitores y multi-pantalla | Escucha en caliente de pantallas conectadas/desconectadas (`screen.on('display-added')`), selector de monitor destino para ventana principal / kiosko y actualización dinámica de handles DDC/CI. | ⬜ |
| 44 | Perfiles automáticos por aplicación activa + Botones anclados globales | Cambio inteligente de página según la ventana/proceso en primer plano (ej. OBS, Photoshop, IDE) y opción de botones fijos/anclados que persisten en todas las páginas. | ⬜ |
| 45 | Subdivisión modular de mosaico 2×2 | Capacidad de dividir 1 celda estándar en 4 mini-botones independientes (cuartos de celda) para funciones compactas y alta densidad de controles. | ⬜ |
| 46 | Botón explícito "Eliminar botón" / vaciar celda | Integración directa del botón de eliminación en `EditorB` (actualmente solo accesible por clic derecho como "Limpiar botón") con confirmación o deshacer rápido. | ⬜ |
| 47 | Dial visual rotativo dot-matrix para scroll de mouse | Indicador gráfico circular (dial de puntos LED concéntricos) en celdas de volumen y brillo que responde visualmente al giro de la rueda del ratón al estilo DOT / 480. | ⬜ |
| 48 | Widget de barra / slider táctil continuo | Widget táctil horizontal/vertical para deslizamiento continuo con dedo o ratón, optimizado para tabletas y dispositivos táctiles (Surface Pro). | ⬜ |

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

### 7. Sistema Visual DOT / 480 & Hardware Táctil (Ítems 41 a 48)

- **7.1 Sistema Visual DOT / 480 (OLED Micro Interface) ★★★ · L** — ✅ HECHO (Prototipo multi-lámina PX-05/PX-03/Casing, purga integral de emojis y unicode, micro-iconos bitmask 8×8 y diseño de hardware ESP-Mosaico implementados en toda la aplicación).
  Evolución estética inspirada en [Ideas, Now Physical — ESP-Mosaico (Henry Li)](https://esp-mosaico.vercel.app/):
  - **Paleta y Cuadrícula**: Grilla estricta en múltiplos de 4px (`4PX GRID`). Modo oscuro en negro OLED puro (`BG #070809`, `SURFACE #111315`, `BORDER #1F2229`), acento primario de referencia (`RED #FF3B30`) plenamente intercambiable con los 10 presets de color de VirtualDeck. Modo claro en tonalidades de grises industriales/cemento (evitando blancos deslumbrantes).
  - **Tipografía y Componentes**: Números grandes y códigos de estado renderizados en matriz de puntos discretos (5×7 y 7×9). Módulos de celda con cabecera técnica (`01 HOME`, `02 MUSIC`, `03 TIMER`) y carril lateral vertical táctil para disparadores secundarios.
  - **Gráficos Dithered / Halftone**: Procesamiento de carátulas e imágenes en tramado de puntos (1-bit / 2-bit halftone) estilo serigrafía técnica.
  - **Indicadores Concéntricos de Puntos**: Arcos circulares de puntos (`●●●○○○`) para temporizador, volumen, batería y progreso. Ondas de audio en barras verticales de puntos.
- **7.2 Estudio de Hardware Paramétrico ★★ · M** —
  Inspirado en [Codyboard Designer](https://codyboard.github.io/codyboard-designer/) ([repositorio](https://github.com/Codyboard/codyboard-designer.git)):
  - Modelado de proporciones de chasis físico (conversión milímetros a píxeles), knobs/encoders giratorios virtuales y tiras de luz difusa LED WS2812B como widgets decorativos.
- **7.3 Detección Dinámica de Monitores y Multi-Pantalla ★★ · M** —
  Escucha en caliente de pantallas conectadas/desconectadas (`screen.on('display-added')`, `screen.on('display-removed')`), selector de monitor destino para la ventana principal o modo kiosko y refresco dinámico de handles DDC/CI.
- **7.4 Perfiles Automáticos por Aplicación Activa + Botones Anclados ★★ · M** —
  Cambio inteligente de página según la ventana activa (ej. OBS, Photoshop, IDE, juego) y opción de botones fijados/anclados que persisten en la grilla en todas las páginas.
- **7.5 Subdivisión Modular de Mosaico 2×2 ★★ · S-M** —
  Capacidad de dividir 1 celda estándar en 4 mini-botones independientes (cuartos de celda) para funciones compactas y alta densidad de controles.
- **7.6 Botón Explícito de Eliminación / Vaciar Celda ★ · S** —
  Botón directo en `EditorB` para vaciar o eliminar la configuración de un botón con confirmación y deshacer rápido.
- **7.7 Dial Visual Rotativo Dot-Matrix para Scroll de Ratón ★★ · S** —
  Indicador gráfico circular (dial de puntos LED concéntricos) en celdas de volumen y brillo que responde visualmente en tiempo real al giro de la rueda del ratón.
- **7.8 Widget de Barra / Slider Táctil Continuo ★★ · S-M** —
  Widget táctil horizontal/vertical para deslizamiento continuo con dedo o ratón, optimizado para tabletas y dispositivos táctiles (Surface Pro).

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
