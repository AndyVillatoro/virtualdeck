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
  ver [galeria.md](galeria.md)). El **repo público existe** (4 perfiles v1, validados
  con `npm run check:galeria`); diferido a otra versión dejarlo bien completo
  (versionado v2, más perfiles).
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
| 30b | Microsoft Store (MSIX) | Publicada en la Store como VirtualDeck. Automatización completa del empaquetado y validación de `VirtualDeck-X.Y.Z.msix` con `npm run package:store` (`scripts/build-store.mjs`), generación de assets, saneado de mapping y makeappx del Windows SDK con checklist interactivo para Partner Center. | ✅ 2026-09-12 |
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

| 56 | Controladores físicos, fase 1: Stream Dock N3 | Detección, página propia por dispositivo, teclas LCD pintadas, teclas/botones/perillas disparan acciones, pantalla `Dispositivos`. Medido con el N3 real (T-HW-01). | ✅ 2026-10-04 (rama `task/p1-hw-streamdock`) |
| 57 | Controladores, fase 1b: tabla de modelos | Tabla de **12 modelos** Mirabox/Ajazz (Bitfocus, MIT) en el proceso principal; la página y el dibujo salen de la distribución de cada modelo (posición física de cada control); solo el N3 verificado, el resto con insignia «experimental»; rotación por dispositivo; brillo en vivo sin pasar por la config (fusionado en el driver, se guarda al soltar); iconos de acción en la tecla física. Probado con el N3 real por el dueño. | ✅ 2026-10-04 |
| 58 | Controladores, fase 1c: página según la aplicación | Varias páginas por dispositivo, cada una con `targetApp`; cada dispositivo cambia la suya por su cuenta (reutiliza `activeWindow` / `useAutoProfile`) y vuelve a la predeterminada. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 59 | Controladores, fase 1d: Elgato | Familia Elgato vía `@elgato-stream-deck/node` (MIT): Mini, MK.2, XL, Plus (perillas + tira táctil), Neo, Pedal. Sin hardware aquí: **sin verificar** hasta que alguien lo conecte. | ⬜ |
| 60 | Controladores, fase 2: plugins | Host de plugins del SDK de Stream Deck / VSD Craft (WebSocket, `manifest.json`, Property Inspector). Ejecuta código de terceros: pasa por la misma lógica de aviso de riesgo que la galería. Protocolo documentado en `_referencias/informes/opendeck.md` (fuera del repo). | ⬜ |
| 61 | Estilo DOT/480 en las teclas físicas | El LCD de las teclas aún no aplica por completo el lenguaje DOT (reportado por el dueño): llevar al pintor el tratamiento dot-matrix de la app (iconos y texto en puntos, halftone de imágenes, fuente de puntos) respetando el tamaño de cada LCD. Hecho: misma precedencia que la celda (glifo DOT 8×8 con relieve, glifo 5×7, texto corto en DotGothic16, icono de acción como último recurso), trama de puntos en imágenes, fuentes reales, vacías en gris apagado; la pantalla de dispositivos muestra la imagen exacta que recibe el aparato. Validado por el dueño con el N3. Pendiente: widgets (reloj, clima...) en la tecla física. | ✅ 2026-10-04 |
| 62 | Botones prearmados para docks físicos | Diez tríos de perilla, siete botones ciegos y 3 perfiles completos para el N3 (`src/data/perfilesDock.ts`). Se ofrecen en el inspector de Dispositivos y rellenan los huecos de una vez. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 63 | Acciones nuevas para hardware | `page-nav` (siguiente/anterior/ir a), `app-volume` nativo en Rust (`crates/vd-core/src/audio/sesiones.rs`) y perillas multimodo (*dial stacks* con rotación de modos al presionar). | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 64 | Sonido de las perillas | Tic propio en los giros (700→350 Hz, 45 ms, 50% del perfil de audio, limitador a 40 ms) y lectura reactiva de volumen/sonido. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 65 | Atajos de las perillas: zoom solo baja y todo tarda | Zoom con `Ctrl+Add`/`Ctrl+Subtract` (teclado numérico) y teclas por `uiohook-napi` en el propio proceso (1,2 ms) evitando dependencias de distribución de teclado latinoamericano o procesos PowerShell. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 66 | Que se entienda qué hace cada preset | Cada preset describe explícitamente en el inspector qué acción dispara cada gesto («GIRO IZQ · DESHACER · CTRL + Z») antes y después de aplicar. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 67 | La página elegida a mano se respeta | La página seleccionada manualmente actúa como base estable; las aplicaciones vinculadas en primer plano sustituyen temporalmente y retornan a la base al desenfocarse. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 68 | Botones fijos en todas las páginas | `ButtonConfig.fijo` proyecta el botón en el mismo hueco en todas las páginas del dock o del deck de forma consistente. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 69 | Pantalla de dispositivos: redimensionar y mover la ventana | Paneles responsivos con puntos de quiebre (580/860 px), reescalado del dibujo del chasis y zonas de arrastre de ventana dedicadas. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 70 | Configuración duplicada (auditoría) | Mando móvil unificado con `useConfigExterna`, migración v4→v5 idempotente de superficies, normalización de apps activas y saneamiento de estados. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 71 | Lo que convendría pasar a Rust | Signos de atajos resueltos con el idioma de teclado activo (`VkKeyScanW` en `keys.rs`) y teclado numérico nativo. | ✅ 2026-10-04 |
| 72 | `page-nav` que se entienda | Navegación con tope en extremos para anterior/siguiente y modo `cycle` para dar la vuelta en perillas y presets de página fijos. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 73 | Pulsar otra vez deshace | Multitarea (`Win+Tab` / `Esc`) y Portapapeles (`Win+V` / `Esc`) alternan estado al pulsar repetidamente. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 74 | Ventana anterior / siguiente | Ciclo estable de programas abiertos en proceso Rust nativo (`window-cycle` y perilla «VENTANAS»). | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 75 | Vincular app sin teclear | Selector visual `SelectorApp` con procesos activos del sistema, búsqueda de `.exe` y catálogo de 7 plantillas completas preconfiguradas. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 76 | Mando móvil: estética y docks | Estilo DOT responsivo, soporte de acentos de usuario y separación de botones de dock en interfaz remota. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 77 | GIF en los botones | Decodificación nativa con `ImageDecoder` a 10 fps con tope de memoria en teclas LCD, barra flotante y móvil. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 78 | Iconos animados en estilo DOT | Motor puro `efectosPuntos.js` con cálculo matemático de 5 efectos sobre glifos de 8×8 en todas las superficies. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 79 | Animación o cambio de estado al pulsar | Efecto visual de pulsación (destello/onda) y doble estado visual (encendido/apagado) proyectado a las teclas LCD. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 80 | Editor de botones centralizado | Editor modular en acordeón de 5 secciones con vista previa OLED en tiempo real accesible desde la cuadrícula y desde el inspector de hardware. | ✅ 2026-10-09 probado en hardware físico N3 por el dueño: pasa prueba física. |
| 81 | Estilo sin duplicados | Editor DOT unificado (`EditorPuntos.tsx`), eliminación de `BrandIconEditor` y `VDIcon`, glifos DOT por tipo de acción y migración v5→v6. | ✅ 2026-10-04 |
| 82 | Paridad entre superficies | Matriz de paridad completa (`docs/PARIDAD.md`) con 37 campos en las 5 superficies, 0 huecos y validación continua con `check-paridad.mjs`. | ✅ 2026-10-09 validado con hardware físico N3 por el dueño. |
| 83 | Plugins de Stream Deck fáciles | Concreta el 60 pensando en el usuario: instalar un `.streamDeckPlugin` con doble clic o arrastrándolo, catálogo curado de plugins que se sabe que funcionan, su configuración (Property Inspector) en una ventana propia, y aviso de riesgo como la galería (un plugin ejecuta código). Primero, investigación de compatibilidad de los más usados. | ⬜ **Investigado (2026-10-04, `_referencias/informes/plugins-streamdeck.md`):** un `.streamDeckPlugin` es un ZIP con `<uuid>.sdPlugin/manifest.json`; el host lo lanza con `-port -pluginUUID -registerEvent -info` y hablan JSON por WebSocket local. **Medido:** un plugin Node sin modificar (Essentials for Spotify) arranca con el Node de Electron (`ELECTRON_RUN_AS_NODE`), se registra y responde `setImage`/`setTitle`/`setState`; hay que anunciar versión 7.1. **Límite:** los del Marketplace vienen cifrados (DRM) y los oficiales de Elgato (OBS, Spotify, Discord, Twitch) son cerrados: no cuentan. Funcionarían, por manifiesto: Multi OBS Controller, Home Assistant, Spotify Essentials, Hue, WLED, VoiceMeeter, timers. VSD Craft usa el mismo protocolo (`Knob` en vez de `Encoder`). Seguridad: WebSocket solo en 127.0.0.1 y rechazando `Origin`, un proceso por plugin, HTML con sandbox, Node con `--no-addons`, `.exe` con aviso reforzado, resumen de riesgo como la galería; el endurecimiento de `web-contents-created` rompería sus ventanas de ajustes si no se les da política propia. MSIX: en `userData/plugins`, matar plugins antes de actualizar, mencionarlo en la ficha (10.2.2), doble clic con `FileTypeAssociation`. **Fases:** prototipo 1–2 días; MVP (Node + HTML, teclas, arrastrar el archivo, ajustes en ventana propia, aviso) 2–3 semanas; perillas del dock y Mirabox 1–1,5 semanas; catálogo y actualizaciones 1 semana. **Decisiones del dueño:** las imágenes en color de los plugins contra la estética DOT; licencias de los plugins del catálogo. **Fase 0 medida (2026-10-06, T-PLG-00):** anfitrión de prueba en `electron/main/plugins/`, solo con `VD_PLUGIN_PROTO` (`probar-app.mjs --plugin=`). Cinco plugins reales sin modificar: Spotify (Node), Discord de Mirabox (Node ESM), Home Assistant, Multi OBS y Stopwatch (HTML) se registran en 0,1–0,8 s, contestan a las pulsaciones y sus PI se abren (OBS, en español). `utilityProcess` carga ESM. Resultados y lista para el MVP en `_referencias/informes/plugins-streamdeck.md` §9. **Siguiente:** MVP (fase 1) — es un trabajo de semanas, decisión del dueño. |
| 84 | Optimizar en cada iteración | Presupuesto medido por ronda: arranque, memoria, CPU en reposo (las animaciones de 77–79 no pueden costar en reposo), tamaño del renderer (1,17 MB), re-renders. Medir con `VD_DIAG` antes y después. | 🟡 Dato: el JS de la pantalla pasó de 1.168 kB (2026-09-15) a 1.604 kB (2026-10-04). Mirar qué entra en el bundle principal que podría cargarse bajo demanda (editor, plantillas, presets, dibujante). El índice de búsqueda del catálogo de iconos sale en un trozo de 1,5 MB al abrir el selector (JSON escapado, con todas las etiquetas de Tabler): adelgazarlo (etiquetas más cortas, o buscar solo por nombre al principio). |
| 85 | Idea: valor en la tecla al girar | Al girar una perilla, la tecla LCD de encima enseña un momento el valor (volumen 65 %, brillo, modo de la perilla multimodo). El N3 tiene las teclas justo encima. | 🟡 2026-10-05 hecho (DeepSeek por Go, T-HW-21), falta verlo con el N3: cada manejador devuelve un `detalle` (volumen y brillo con el nivel nuevo, volumen por app, página «PÁG 2/3», modo «MODO 2/4»); la tecla encima de la perilla lo enseña 1,2 s y vuelve, sin encolarse al girar rápido. **Arreglo del supervisor:** el resultado llegaba por un «buzón» global en `pulsarBoton` porque el `dispararBoton` de `App` no lo devolvía; ahora lo devuelve y el buzón se quitó. |
| 86 | Idea: icono de la app al vincular | Al vincular una página a una app, sacar el icono del `.exe` y pasarlo a puntos para la pestaña y para una tecla de «volver». Y un vídeo corto para la ficha de la Store y la wiki con HyperFrames (ver la respuesta del 2026-10-04). | 🟡 **Icono del `.exe` (supervisor, 2026-10-05):** `crates/vd-core/src/launcher/icono_app.rs`: icono grande del ejecutable (`SHGetFileInfoW` → `GetDIBits`) a 16×16 puntos en el formato de `iconoPuntos`: silueta por alfa, contorno si está muy rellena y, si la silueta es solo la forma de fondo, el logo de dentro por contraste. 7–15 ms; VS Code, Explorador y Bambu Studio se reconocen. IPC `launch:iconoApp`; el selector de apps enseña el icono junto a cada nombre. **Falta** instalar el `.node` nuevo (estaba en uso) y usarlo como icono de la página vinculada. **Pestañas (agy T-UI-13):** al vincular una página se guarda `PageConfig.iconoApp` (el icono del `.exe` en puntos) y se dibuja en las pestañas del deck y del dock; al desvincular se quita. `.node` nuevo instalado (`iconoApp`). |
| 87 | «Fijo» y «anclado» son lo mismo | Dueño (2026-10-04): en Comportamiento salen «fijo en todas las páginas» y «anclado en todas las páginas». **Error del supervisor:** `pinned` (7.4, `src/utils/botonesPagina.ts`) ya proyectaba el botón en su ranura de todas las páginas, y el 68 hizo `fijo` sin verlo. `fijo` es mejor (por grupo: el deck y cada dock por separado, y llega a la tecla física). Unificar en una sola opción: migrar `pinned` → `fijo`, quitar el código de `pinned` (proyección, menú «anclar», insignia, mando móvil) y dejar un solo control. | 🟡 2026-10-04 hecho (opencode T-UI-06), falta verlo: migración v6→v7 `pinned` → `fijo` (sobre una copia de la config del dueño: 2 botones, sin choque de hueco), `pinned` fuera del código, del mando móvil y del editor; el menú de la celda ofrece «FIJO EN TODAS LAS PÁGINAS». |
| 88 | Comportamiento sin escribir a ciegas | «La gente no sabe qué poner.» Disparadores externos y condiciones con opciones para elegir: atajo global grabando las teclas (y sugerencias libres que no choquen con Windows), hora con selector y días de la semana, sensores de la lista real con su unidad, «visible solo si esta app está activa» con `SelectorApp`, grupo radio de los grupos que ya existen, y lo demás que se escriba a mano en el editor. | 🟡 2026-10-04 hecho (agy T-UI-07), falta verlo: atajo global con «GRABAR», sugerencias sin choque con Windows y aviso de conflicto; visibilidad por app con `SelectorApp`; sensores de la lista real con unidad, operadores como fichas y valor en vivo; hora con fichas rápidas y selector (el motor solo admite HH:MM diario: días de la semana pendientes); grupo radio con los grupos existentes; cada opción explica para qué sirve. |
| 89 | Catálogo grande de iconos derivado a DOT | En vez de dibujar marcas a mano: tomar repositorios abiertos grandes —**Simple Icons** (marcas, CC0, ~3.300) y uno de acciones (**Tabler**, MIT, ~5.900; o **Lucide**, ISC)— y **pasarlos a puntos en tiempo de compilación** con un script (SVG → rejilla 16×16 → bits), con licencias comprobadas y aviso de marcas registradas. Catálogo en un trozo que se carga solo al abrir el selector (~32 bytes por icono); al elegir uno se **copia** el mapa de puntos en el botón, así que pintar nunca carga el catálogo. Sustituye a los 17×17 hechos a mano. Base de 78/79: las animaciones se **derivan** de cualquier mapa de puntos (encendido por filas, barrido, pulso, parpadeo de estado), no se dibujan una a una. | 🟡 2026-10-04 catálogo hecho (DeepSeek por Go, T-UI-08, ~$0.25; revisado con muestras): `scripts/generar-iconos-dot.mjs` (`npm run build:iconos`) pasa a 16×16 **Simple Icons 16.34** (CC0; fuera 211 con licencia propia) y **Tabler 3.48** (MIT, elegido sobre Lucide por cantidad y etiquetas). Marcas: 2.866 (fuera 315 logotipos de texto, ilegibles en una raya; 1.419 rellenos pasados a **contorno**); acciones: 5.150. `src/data/iconosDot/`: marcas 175 KB, acciones 337 KB, índice de búsqueda 867 KB — **todo bajo demanda** (el supervisor pasó el índice a `import()`: era estático). Falta: usarlo en el campo ICONO (GLIFO y MARCA) copiando el mapa al botón, y pintar 16×16 en las cinco superficies. **En uso (2026-10-05):** el campo ICONO ofrece las acciones (Tabler) en GLIFO y las marcas (Simple Icons) en MARCA, con buscador (150 ms de retardo, 72 por página, primera página en 12–28 ms; agy T-UI-10); al elegir se copia en `iconoPuntos`. Se pinta igual en las cinco superficies (opencode T-UI-09; precedencia: widget > fondo/marca > 5×7 propio > `iconoPuntos` > glifo por nombre > tipo de acción). Las marcas viejas de 17×17 ya no se ofrecen para botones nuevos. JS principal +11,6 KB; el índice de búsqueda pesa **1,5 MB** al abrir el selector (ver 84). |
| 90 | Revisión integral de la interfaz | Dueño (2026-10-06): «el apartado de Acción, al ser muchos, se hacen columnas de 3 y se salen de la interfaz; unir los iconos de glifos con los de marca y tener grupos de iconos». Medido: `SeccionAccion` usa `repeat(4, 1fr)` con texto `nowrap` y sin `minWidth: 0` —`1fr` es `minmax(auto, 1fr)`, la columna crece hasta la descripción más larga (90 caracteres) y se sale—; 43 tipos sin familias ni buscador. Iconos en dos pestañas separadas (glifo/marca) y el catálogo grande sin grupos. Auditoría completa (tres pasadas): ~1150 líneas muertas del editor por pasos, la tienda no hace scroll, el tema «oscuro» por defecto era gris y no el OLED de las reglas, colores fijos que rompen el modo claro (teclas 2×2), unicode como icono, ~25 botones de solo icono sin `title`, objetivos táctiles <32 px en kiosko y barra flotante, estilos duplicados; `folder`/`page-nav` en la barra flotante devuelven OK sin hacer nada; PowerShell por canción (capacidades SMTC) aun con núcleo; `runScript`/`playMacro`/TTS nativos bloquean el proceso principal. Plan en 6 fases aprobado por el dueño (oscuro = OLED; catálogo con barra lateral de grupos). | 🟡 2026-10-06 hecho (rama `task/p1-revision-ui`, T-REV-01…10), falta verlo el dueño: tipos de acción por familias con buscador; catálogo único con grupos y búsqueda en español (índice 716 → 438 KB); oscuro = OLED con migración v7→v8; primitivas `ui/` y tokens (`onAccent`, `backdrop`, `tipo`); desbordes en ventanas pequeñas; kiosko y barra flotante táctiles; colores fijos, unicode y botones sin nombre fuera (regla de eslint contra el blanco puro); núcleo sin PowerShell por canción, scripts/macros/voz asíncronos con límite; `folder`/`page-nav` avisan donde no se pueden; días de la semana en el disparo por hora (88); complejidad <18 en 11 funciones (avisos 33 → 22). Probado en la app (oscuro, claro, 1280/900/800 px). **Falta (dueño):** oír el texto a voz (la voz vive en un hilo propio: no se pudo escuchar desde aquí), y pasar el editor y el catálogo con su configuración real. |
| 91 | Comportamiento vacío en un botón nuevo | Dueño (2026-10-06): «el apartado comportamiento de un botón quedó vacío» (con un preset o acción elegidos sí sale). Medido: en `SeccionComportamiento.tsx` todo depende del tipo de acción (`esAccionValida` l.126 oculta toggle y mantener; fijo y disparadores, l.208/229, se ocultan con `none`) y queda solo un separador vacío (l.207). En modo 2×2 enseña toggle y mantener del padre, que con `subButtons` no hacen nada. Estado vacío que explique «elige primero una acción» con atajo a Presets/Acción, y opciones del padre fuera en 2×2. | 🟡 2026-10-07 hecho (T-REV-12), falta verlo: estado vacío con atajos a PRESETS/ACCIÓN; en 2×2 fuera lo del padre. |
| 92 | Editor y propiedades coherentes para controles del dock | Dueño: «2×2 no debería ser configurable aquí, son botones físicos; revisa que las opciones de propiedades del control no colisionen». Medido: el editor no recibe el contexto de dock (`App.tsx:711-720`; `useDockPresets` lo deduce y solo lo usa Presets). Ofrece 2×2 (el aparato no lo dispara, `useSuperficies.ts:420`, pero el LCD lo dibuja como si sí); mantener pulsado en perillas (`esperaLarga` solo acepta tecla/botón); toggle/radio/aspecto encendido en los giros (cada clic alterna); acción de pulsar perilla con `modosPerilla` (nunca corre, sin aviso); presets de deslizador y carpeta (el LCD no los pinta / necesita pantalla); Apariencia completa en controles sin pantalla; pestaña APPS por defecto en vez de DOCK. El inspector (`PanelInspectorControl`) describe solo `action` (2×2 sale «SIN ACCIÓN» sin aviso; ignora secuencia, mantener y apagado) y su mini vista solo lee `icon`. Pasar el tipo de control y gesto al editor y ocultar/avisar lo que no aplica. | 🟡 2026-10-07 hecho (T-REV-12), falta con el N3: contexto de dock en el editor (sin 2×2, sin mantener en perillas, sin toggle en giros, aviso de modos, Apariencia mínima sin pantalla, pestaña DOCK, sin presets de deslizador/carpeta); el inspector avisa de cuadrantes, secuencia, mantener y apagado. |
| 93 | 2×2 con el catálogo de iconos | Dueño: «en avanzado los 2×2 muestran solo los glifos, ¿no deberían mostrar el nuevo catálogo?». Medido: `SubButtonConfig` no tiene `iconoPuntos` y `QuadGlyphPicker` solo lista los 69 glifos. Añadir el campo, abrir `SelectorIconosDot` desde el cuadrante y pintarlo en celda (`Subdivision2x2`), mando móvil (`iconosMando.ts:297`, la página ya dibuja 16×16) y tecla (`subdivisionLcd.ts:138` pasa `undefined` a propósito). Paridad declarada en `paridad.json`. | 🟡 2026-10-07 hecho (T-REV-15), falta verlo: `iconoPuntos` por cuadrante, pintado en celda, móvil y tecla. |
| 94 | «Secuencia de acciones» que se entienda | Dueño: «desconozco dónde sirve esa función». Es `button.actions`: varias acciones en cadena al pulsar, y **sí** se ejecuta en todas las superficies (`pulsarBoton.ts:204`). Vive en Avanzado, lejos de la acción. Moverla a ACCIÓN como «+ AÑADIR OTRA ACCIÓN DESPUÉS» con un ejemplo; arreglar el tope (dice 8, deja 9); no guardarla con `none`/`folder`/2×2, donde no corre. Confundible con la acción `macro` (teclas/ratón): decirlo. | 🟡 2026-10-07 hecho (T-REV-15): la secuencia vive en ACCIÓN («añadir otra acción después»), tope 8 en total, no se guarda con none/folder/2×2. |
| 95 | Vista previa del editor completa | Dueño: «el preview de los botones como los 2×2 no se observa». Medido: `VistaPrevia` usa la celda real (2×2, imagen, GIF e iconos deberían verse) pero sin `widgetData` (los widgets salen como icono), sin las opciones de widget de variable/sensor/divisa, sin variables `{var}`, sin estado de cuadrantes. Para un control del dock enseña una celda del deck en vez de la tecla de 64 px de `pintarTecla`. Ver con el dueño qué 2×2 no se ve. | 🟡 2026-10-07 hecho (T-REV-16): el 2×2 vacío se veía como celda vacía (un punto de 4 px por cuadrante); la vista previa los rotula Q1–Q4 y alterna cada uno, y enseña widgets en vivo, variables y la tecla del dock de 64 px. |
| 96 | Atajos sugeridos con nombre y para qué | Dueño: «las combinaciones sugeridas no tienen nombre; que sea una lista con para qué sirven». Medido: `COMBOS_SUGERIDOS` (`CampoGlobalHotkey.tsx:9-26`) son 16 cadenas sueltas. Fallo: los 4 `Ctrl+Shift+Alt+…` nunca salen como activos ni ocupados (se comparan sin normalizar). Grabar con la tecla Windows la pierde (`useCapturaHotkey.ts:23`). Lista con atajo, nombre y para qué, y explicar la diferencia con el atajo de la propia acción. | 🟡 2026-10-07 hecho (T-REV-11): lista con nombre y para qué, nota frente al atajo de la acción, normalización (los Ctrl+Shift+Alt no salían ocupados) y tecla Windows. |
| 97 | Textos que se salen en el dock y en los presets | Dueño: «historial de portapapeles y multitarea tienen descripción que sale de la interfaz; creo que hay más». Medido: `SelectorPresetsControl.tsx` con `nowrap` en un inspector de 200–280 px y `textOverflow` sobre un `flex` (no recorta); `describirHueco` junta etiqueta, teclas y «OTRA VEZ: …» (~44 caracteres). Mismo patrón en las fichas de `SeccionPresets` (72 px). Dos líneas, `title` con el texto entero, y repasar el resto de listas. | 🟡 2026-10-07 hecho (T-REV-11): dos líneas y `title` en presets del dock y del editor y en el resto de Dispositivos. |
| 98 | Iconos de los presets con el catálogo | Dueño: «los iconos de los presets se ven desfasados, no correlativos». Medido: los presets solo admiten glifo 8×8 (Spotify → AUDIO_WAVE; YouTube, Twitch, Netflix, OBS, Steam → PLAY; Gemini/ChatGPT/Claude → SPARKLE; REHACER = DESHACER en el dock…). El catálogo tiene la marca o el icono exacto de ~40 de ellos (`marcas:spotify`, `marcas:obsstudio`, `acciones:power`, `acciones:clipboard`, `acciones:arrow-forward-up`…). `iconoPuntos` (por `origen`, resuelto al aplicar) en presets del deck y del dock, y fichas que lo pinten. | 🟡 2026-10-07 hecho (T-REV-17, T-REV-20): `iconoCatalogo` en 90 presets del deck y 80 del dock (ids comprobados), fichas que lo pintan y el botón lo recibe al elegir (editor, dock y plantillas). Visto en la app: Spotify con su marca. |
| 99 | Lápiz de editar tapado por la trama | Dueño: «el botón lápiz de editar está debajo del filtro dot, ilegible». Medido: lápiz y trama con `zIndex: 2` y la trama después en el DOM; otras insignias (×N, toggle, carpeta, configurado, barra de activo) sin `zIndex`, debajo de la propia imagen. En claro el lápiz es gris oscuro sobre negro. Capa de insignias por encima (4) y chip OLED fijo. | 🟡 2026-10-07 hecho (T-REV-11): insignias en capa 4 sobre trama e imagen; lápiz con chip OLED fijo. |
| 100 | Animaciones de pulsación que se noten | Dueño: «las animaciones de pulsación no son muy notorias». Medido: barrido de 380–420 ms con anillos de 1,5 px; «destello» es en realidad un **apagado** de 180 ms; el fondo no cambia al pulsar (con color propio ni el `pressed`); `efectoPulsar: 'none'` no quita el barrido; imágenes y marcas sin efecto; con «efectos de animación» de Windows apagados todo se corta a 200 ms. Destello real (400 ms, a acento), barrido ~600 ms más visible, tinte de fondo breve y respetar 'none'. En las cinco superficies (LCD: 250 ms). | 🟡 2026-10-07 hecho (T-REV-18), falta verlo el dueño: destello real 420 ms, onda 620 ms, tinte de fondo, `none` lo quita todo; dock 400/620 ms, móvil 440/680 ms. CPU en reposo medida en 2,8 % de un núcleo **con música sonando** (no comparable con la medida del 78): repetir A/B en las mismas condiciones (84). |
| 101 | Deslizador vertical en estética DOT | Dueño: «la barra de volumen vertical no tiene estética dot, solo líneas horizontales». Medido: `DotSliderPartes.tsx:110-126` dibuja 12 barras macizas; los apagados con blanco fijo (invisibles en claro); escala siempre horizontal; el móvil ignora la orientación. Filas de puntos redondos, `VD.dotIdle`, escala al lado. | 🟡 2026-10-07 hecho (T-REV-19): filas de puntos en vertical, `dotIdle`, escala al lado; el móvil respeta la orientación. |
| 102 | Contraste automático en las celdas | Dueño: «en modo claro los botones tienen que cambiar texto o iconos a un color de contraste». Medido: icono y rótulo usan `fgColor` o el texto del tema, nunca el contraste con el fondo del botón (`derivados.ts:51`, `RotuloCelda.tsx:63`); la franja del rótulo es negra al 35 % también en claro. `textoSobre(bg)` existe y no se usa en la celda. Los botones físicos **no** dependen del tema (paleta OLED fija, confirmado), pero tienen el mismo fallo con un fondo claro propio (`pintarTecla.ts:222`). Aplicarlo en celda, móvil y tecla. | 🟡 2026-10-07 hecho (T-REV-13): `src/comun/contraste.ts` en celda, tecla del dock y móvil. |
| 103 | Recordar el monitor de la ventana | Dueño: «a veces inicio la PC y VirtualDeck aparece en la pantalla principal cuando debería estar en la secundaria». Medido: `windowManager.ts` guarda solo x/y/w/h; al arrancar con `--oculto` el segundo monitor puede no estar aún y se recentra en el principal; un `display-removed` (monitor dormido, KVM) mueve la ventana al principal **y esa posición se guarda**, así que desde entonces arranca ahí; `display-added` no la devuelve; `targetDisplayId` solo se usa al entrar en kiosko. Guardar el monitor (etiqueta + tamaño + escala) y la posición relativa, no guardar los recolocados automáticos, y volver al monitor preferido cuando aparezca. | 🟡 2026-10-07 hecho (T-REV-14, supervisor), falta verlo instalado (sin empaquetar la app ignora las coordenadas): huella del monitor, pendiente que vuelve al reaparecer, sin guardar lo que mueve la app. 7 casos simulados en verde. |
| 104 | Exportar/importar dentro de Ajustes | Dueño: «el botón de importar y exportar del encabezado ya debería ir en la configuración». Medido: solo están en la barra de título (y en el paso 7 del tutorial); Ajustes no los tiene. Bloque RESPALDO en «Perfiles y respaldo» (con exportar un perfil suelto) y fuera EXP/IMP de la barra. | 🟡 2026-10-07 hecho (T-REV-21): PERFILES Y RESPALDO en Ajustes; EXP/IMP fuera de la barra. |
| 105 | Una sola tienda, bonita, con perfiles y plugins | Dueño: «galería de perfiles debería quitarse y quedar solo tienda, con perfiles de la comunidad y plugins alojados ahí, y los nuestros; intuitiva, bonita, misma estética, con fotos e iconos; buscar referencias de una tienda de plugins que no sea cargada». Medido: `GallerySection` (Ajustes) es una copia más pobre de la tienda (`#tienda`). El manifiesto v2 no tiene icono, capturas ni vista previa. Plugins: hace falta el MVP del 83 (entrada `plugin`, descarga del ZIP, instalación, riesgo propio). Fases: (a) quitar la galería de Ajustes y dejar «ABRIR TIENDA»; (b) manifiesto con `icono` (DOT), `capturas[]` y portada, y rediseño con referencias; (c) plugins cuando exista el 83. | 🟡 2026-10-07 (a) y (b) hechas (T-TND-01 `f333e6a`, T-TND-02 `bd9a8d4`): Ajustes solo abre la tienda y la galería embotida desaparece; manifiesto con `icono`/`portada`/`capturas` y tienda con tarjetas, portada, tira de capturas y riesgo completo. Falta (c), atada al MVP de plugins del 83 (decisión del dueño por tamaño). |
| 106 | Documentación, wiki, página y tutorial al día | Dueño: «actualizar la documentación y tutorial; ver si la wiki o la GitHub Page están desactualizadas». Medido: la wiki describe el editor por pasos (borrado), «tutorial de 5 pasos» (son 7), iconos con emoji, teclas 1–8 (son 1–9); faltan páginas de docks, mando móvil, barra flotante, tienda, catálogo de iconos, animaciones y temas. `docs/index.html` dice «editor paso a paso, 37 tipos» y no tiene nada posterior a 0.13. `docs/galeria.md` dice que solo se importan archivos locales. El tutorial no enseña docks, catálogo, mando móvil, tienda ni disparadores. Capturas de prensa del 2026-09-13 (editor viejo, tema gris). | ✅ 2026-10-08 completado: wiki al día (24 páginas, 12 parejas ES/EN), tutorial de 9 pasos, GitHub Pages completamente rediseñada (`docs/index.html`, `docs/web/`, galería DOT por scroll, bilingüe, canal exclusivo Microsoft Store), y capturas/banners limpios con datos inventados sin fugas de privacidad. |
| 107 | Vídeo introductorio (HyperFrames) | Dueño: «usar el skill de HyperFrames para un vídeo introductorio para la MS Store o la GitHub Page». Hoy hay `docs/prensa/hero.mp4` (12 s, animación abstracta, no la interfaz) y las capturas viejas. Tráiler ≤60 s 1920×1080 + miniatura (requisitos de la Store en `docs/MICROSOFT-STORE.md`) con la interfaz real: familias de acciones, catálogo, pulsación, dock, móvil. Va **después** de 99–102 y 106, para grabar la interfaz ya pulida. | ✅ 2026-10-08 completado: tráilers en español e inglés hechos con HyperFrames (`docs/video/trailer-es.mp4` y `trailer-en.mp4`, 1920×1080 CRF 16, corte a 115 BPM, ~41.7 s) con subtítulos `.vtt` ES/EN; 11 banners 1920×1080 ES/EN y artes de marca (miniatura, superhéroe, og-image, banner) con datos genéricos sin filtrar usuario ni hardware real. Integrado en GitHub Pages y listo para Store. |
| 108 | Dispositivos en una pantalla baja y ancha | Dueño (2026-10-07): «la visualización del dock físico en un formato de pantalla pequeño como mi segundo monitor alargado no se muestra; planear una forma bien pensada». Su segundo monitor es **1280×480** (8:3), donde vive VirtualDeck. Medido a ese tamaño: tres columnas fijas (lista de dispositivos ~240 px, inspector vacío ~280 px) y arriba la configuración de la página (app vinculada, apps en ejecución), así que el dibujo del N3 queda diminuto abajo (~270×120 px). **Plan:** (1) base común `useFormatoPantalla()` → `normal` / `barra` (ancho/alto ≥ 2 y alto ≤ 600) / `estrecha`, compartida con 109 y 110; (2) en `barra`: el dibujo del aparato a la izquierda escalado **por alto** (ocupa todo el alto útil), inspector a la derecha solo con un control elegido (superpuesto, como ya existe por debajo de cierto ancho), lista de dispositivos como fichas arriba (o nada si hay uno), y la configuración de la página en un desplegable «PÁGINA» cerrado por defecto; (3) comprobarlo con capturas a 1280×480, 1920×1080 y 900×600, y con el N3 real. | ✅ 2026-10-07 (falta probarlo con el N3 y en el monitor real) |
| 109 | Panel de música lateral mejor | Dueño: «el reproductor de música en panel lateral, el que es elegible para mostrar, ver cómo mejorarlo». Medido a 1280×480: la carátula cuadrada ocupa casi todo el alto y **los botones de control quedan fuera de la pantalla**; con 1280 de ancho caben barra lateral y panel a la vez y la rejilla se aprieta; el interruptor está escondido en Ajustes → SONIDO. **Plan:** (1) en alturas < 600 el panel pasa a horizontal (carátula a la izquierda al alto disponible, título/artista y controles a la derecha), controles siempre visibles; (2) enseñar el estado de aleatorio y repetición (el núcleo ya da `isShuffleActive`/`autoRepeatMode`) y deshabilitar lo que la fuente no admite (`controls`); (3) volumen de la app que suena (acción `app-volume` ya existe) y, si SMTC da posición, una barra de progreso en puntos; (4) abrirlo y cerrarlo desde la propia franja de música de la barra lateral (no solo en Ajustes) y que en formato barra sustituya a la barra lateral en vez de sumarse; (5) estética DOT (carátula con trama, botones de 32 px o más). | ✅ 2026-10-07 completa: barra de progreso incluida (`f260ad5`). El núcleo lee posición y duración con el timeline de SMTC y la pantalla las interpola desde la última medida mientras suena. **Pendiente del dueño:** regenerar `native/vd-core.node` con `npm run build:native` **con la app cerrada** — hasta entonces la barra no sale, porque el `.node` instalado es el viejo. Falta verlo en pantalla. |
| 110 | Kiosko (y principal) en formato barra | Dueño: «también el kiosko». Medido a 1280×480: barra superior (40 px) y franja de música (60 px) se comen ~100 de 480 px; el panel lateral ocupa ~435 px con un reloj enorme; la rejilla 4×4 cuadrada queda en casillas de ~80 px y desperdicia el ancho (en la principal ocupa ~410 de 1060 px); el selector de página es una barra azul enorme con un «1»; el estado de sensores dice «DISABLED» sin traducir. **Plan:** (1) en `barra` (ver 108): la rejilla manda — panel lateral plegado a una columna estrecha (reloj compacto, 2–3 sensores) o desplegable, barra superior de 32 px que se oculta sola en kiosko, música integrada en la franja inferior junto al selector de página (no una franja aparte); (2) selector de página como fichas pequeñas; (3) rejilla: en `barra` usar el modo «llenar» o proponer una página con forma de barra (8×2, 6×2) al detectar el monitor, sin tocar las páginas del usuario sin preguntar; (4) traducir «DISABLED»; (5) lo mismo en la principal; (6) probar en 1280×480 real, con el PIN del kiosko. | 🟡 2026-10-07 (`f333e6a`): la propuesta de página quedó en **6×2**, no en 8×2, porque la rejilla admite hasta 6 columnas; si la página actual es cuadrada en formato barra, un aviso propone crear una 6×2 nueva sin tocar las existentes y no se recuerda. Falta verlo con el dueño. |
| 111 | Panel de música más compacto | Dueño (2026-10-07, en su monitor 1280×480): «no me gusta el widget de música: ocupa mucho espacio en lo horizontal y deja barras arriba y abajo». En investigación (T-MUS-03): medir de dónde salen los huecos y proponer 2–3 variantes compactas (solo en la franja inferior, panel estrecho a alto completo, plegable). | ✅ 2026-10-07 hecho (T-MUS-05, `2a4f021`), **decisión del dueño: plegable**. En 1280×480 el panel mide 300 px (antes 440) y va anclado arriba; plegado queda una lenguieta de 28 px con glifo de onda, «MÚSICA» en vertical y un punto de estado. El plegado se guarda en `musicPanel.plegado` (opcional, sin migración). |
| 112 | Widgets ilegibles con fondo propio al cambiar de tema | Dueño (2026-10-07): «widget divisa en un botón; al cambiar de tema claro/oscuro queda en negro ilegible». Medido en su config: botón divisa con fondo `#0f172a` y el texto del widget con el color del tema (casi negro en claro). Afectaba a **todos** los widgets de la celda. Corregido en `ContenidoCentral` (con fondo propio usa el color del icono: `fgColor` o `textoSobre`) y en el deslizador (`26705e6` + `9901bff`: cabecera, valor, escala y puntos apagados). | ✅ 2026-10-07 hecho y verificado con capturas en los dos temas (`_referencias/informes/capturas-widgets/`). Falta verlo con la config real del dueño. |
| 113 | Vídeo de lo que suena en el panel de música (imagen en imagen) | Dueño (2026-10-07): «en el widget de música colapsable, un botón que use ese espacio para mostrar el vídeo, duplicado o picture in picture, como se pueda; sin el filtro DOT, ese sí totalmente visible». Medido: no hay captura de pantalla en el código (`desktopCapturer` sin usar) y SMTC solo da carátula, no vídeo; el PiP del navegador no se puede pedir desde fuera. Camino viable: **capturar la ventana de la app que suena** con `desktopCapturer` (Windows Graphics Capture) y pintarla en un `<video>` dentro del panel, sin filtro DOT. Límites: se ve la ventana entera (con la barra del navegador) salvo que se recorte; la pestaña tiene que ser la visible de su ventana; cuesta GPU mientras está abierto (apagado = cero). Plan: (1) prototipo con selector de ventana y medida de CPU/GPU; (2) elegir sola la ventana por el proceso de la sesión SMTC y el título; (3) recorte ajustable guardado por app; (4) permiso de captura solo para la ventana principal y solo para ventanas (nunca pantalla completa). | ✅ 2026-10-08 resuelto en 0.14.1 (`f669a9e` y `6a62854`): nitidez nativa corregida adaptando la resolución de captura al tamaño pintado (`tamanoCaptura.ts` + `useTamanoPedido.ts`), reduciendo CPU de 1,78 % a 0,64 %. Detección de ventana ocluida/congelada en Chromium (`CalculateNativeWinOcclusion`) con aviso dinámico `music.videoCongelado` (ES/EN). Botón VÍDEO habilitado en ambos modos (barra y panel vertical estándar). Probado por el dueño (2026-10-09): vídeo activo y claro; limitación de oclusión/cambio de pestaña de Chromium resuelta en hoja de ruta vía extensión compañera (114). |
| 114 | Extensión compañera de navegador (`virtualdeck-companion`) | Extensión ligera (Chrome / Edge / Firefox) para capturar streams de vídeo/audio a nivel de pestaña directa (`chrome.tabCapture` / Offscreen Document / WebSocket local hacia VirtualDeck). Permite transmitir el vídeo del reproductor (YouTube, Twitch, Netflix, etc.) de manera continua hacia el panel de música de VirtualDeck incluso cuando el usuario cambia de pestaña (ej. ver Gmail en la misma ventana) o minimiza el navegador sin congelamiento por HWND. Especificación técnica y arquitectura completa documentada en `docs/investigacion/extension-companion.md`. | 🟡 Especificación completada (2026-10-09) |
| 115 | Compatibilidad multi-dock y revisión de OpenDeck | Análisis exhaustivo del ecosistema y repositorio OpenDeck (`opendeck`) para incorporar compatibilidad con otros formatos de docks físicos: teclados macro con pantallas LCD/OLED, Loupedeck Live / Razer Stream Controller, Stream Deck Studio/Pedal, Stream Dock 293 / N4 / N6 / Visual Deck, tiras táctiles continuas (touch strips), encoders rotativos con pantalla y características de protocolo aún no integradas. Auditoría técnica completa documentada en `docs/investigacion/auditoria-opendeck.md`. | 🟡 Auditoría completada (2026-10-09) |
| 116 | Auditoría profunda de deuda técnica, modularización y saneamiento | Partición de archivos sobredimensionados (>400 líneas o complejidad ciclomática >18 en `electron/main` y `src/screens`), eliminación de código duplicado, purga de código muerto detectado por knip (0 exports huérfanos, 0 tipos huérfanos en todo el proyecto), saneamiento de archivos temporales/obsoletos y centralización ordenada de documentación Markdown. | ✅ Fase 1 completada (2026-10-09) |

**Orden propuesto (2026-10-06, tarde)** — junto a lo pendiente de antes:

1. **Fallos que se ven al usar** (cortos): 99 lápiz, 97 textos, 91 comportamiento vacío, 102 contraste, 103 monitor, 96 atajos sugeridos.
2. **Editor coherente**: 92 dock (el más grande del bloque), 94 secuencia, 93 2×2 con catálogo, 98 iconos de presets, 95 vista previa.
3. **Pulido visual**: 100 pulsación, 101 deslizador vertical, 104 respaldo en Ajustes, con la medición del 84 (que las animaciones no cuesten en reposo).
3b. **Orden del dueño (2026-10-07, noche), pruebas de la 0.14.0 hechas y en orden:** antes de publicar, (1) prototipo del 113 (vídeo en el panel de música, con recorte; si consume mucho, ventana entera), (2) la tienda indica que los plugins están en desarrollo, (3) artes con acabado profesional —vídeo con HyperFrames (107), banner y capturas— para la MS Store y GitHub Pages; luego publicar la 0.14.0.
4. **Antes de publicar (dueño, 2026-10-07): 108 Dispositivos, 109 panel de música y 110 kiosko en formato barra** (su segundo monitor es 1280×480).
5. **Fusionar `task/p1-revision-ui` con estos bloques y publicar 0.14.0** (CHANGELOG de 56–107; pruebas del dueño: N3, teléfono, texto a voz).
6. **Tienda**: 105 (a) y (b); la (c) con el MVP de plugins (83), que sigue siendo decisión del dueño por tamaño.
7. **Documentación y lanzamiento**: 106 con capturas nuevas, luego 107 (vídeo para la Store y la página).
8. Sin fecha: 59 Elgato, T-SEC-06 sandbox (bloqueado). (Clima compartido con la barra flotante: ya lo está — `electron/main/weather.ts` guarda la consulta 15 min y une las simultáneas; las dos ventanas leen esa caché. Verificado 2026-10-07.)

**Orden propuesto (2026-10-04):** primero lo que se nota cada vez que se toca el dock — 65, 64, 67 y 69 — porque son fallos y no funciones; luego 63 (`page-nav`) + 68 (botones fijos) juntos, porque uno sin el otro no sirve; después 66, 70 y 71.

**Ojo con T-SEC-06 (sandbox del renderer, bloqueado):** el pintor de las teclas LCD usa
`<canvas>`, y en este equipo el canvas revienta el renderer con el sandbox encendido. Si se
desbloquea T-SEC-06, probar el N3 en esa misma sesión.

### 🚢 Entregas a la Microsoft Store (la app ya está publicada)

**Decidido (2026-10-04): todo junto en la 0.14.0** — seguridad (T-SEC), refactors (T-UTL), orquestación (T-ORC) y controladores fases 1, 1b y 1c. Elgato (59) y plugins (60) en versiones posteriores. Cada entrega cumple:

- **Compatibilidad de configuración:** `PageConfig.superficie` es opcional; quien actualiza desde la
  0.13 no necesita migración. Cualquier campo nuevo de las fases siguientes, igual: opcional o con
  paso de migración en `configMigration`.
- **Puerta antes de enviar a Partner Center:** `npm run package:store`, instalar el MSIX en local y
  probar el N3 **desde el paquete** (`node-hid` va en `asarUnpack`; la app es FullTrust, así que el
  acceso HID debería funcionar, pero no se ha medido dentro del MSIX).
- **Lo no verificado se dice en la app** (insignia «experimental» en modelos sin probar) y en la ficha
  de la Store, para no prometer hardware que nadie ha conectado.
- **Ritual por entrega:** CHANGELOG + página de wiki ES/EN de controladores físicos + bump semver.

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
| **P4 — Ecosistema** | **24/6.1. Galería de Perfiles en Vivo** | ✅ 2026-09-15 app (Fase 1: manifiesto v2; Fase 2: ventana `#tienda`); repo público existe (4 perfiles); completarla (v2 + más) diferido |
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
  Diseñador interactivo en `dot480/PestanaGlifo` + `EditorPuntos` (y visualizador inline `Glyph57View.tsx`) con arrastre continuo (paint/erase),
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
  El repo público existe (4 perfiles v1, en verde con `npm run check:galeria`).
  Spec en [galeria.md](galeria.md). Diferido a otra versión dejarla bien completa
  (versionado v2 de las entradas, más perfiles).
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
