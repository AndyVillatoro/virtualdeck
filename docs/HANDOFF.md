# Handoff entre modelos (OpenCode / VirtualDeck)

Registro de traspaso exigido por `CLAUDE.md` (protocolo, canal 2). Cada turno actualiza este archivo.

Turnos hasta 2026-10-05 archivados en `docs/archivo/HANDOFF-hasta-2026-10-05.md`.

## Turno 2026-10-07 (tarde) — tanda de tiendas, perfiles del N3, panel de música y widgets (DONE)

* **Reparto:** opencode `wN` Claude Haiku 5.5 por Go (partes 2 de 109 y 111); agy `wK` Gemini Flash (105b, con 105a revisado);
  opencode `wR` Muse Spark, `wS` LongCat, `wT` Fledge y `wV` Space Bunny, todos gratis (investigaciones de 109 y 111, wiki y
  notas técnicas, tablero y documentación); Nemotron 3 Ultra por `opencode run` cuando Exo no respondía (aviso de página 6×2).
* **Rama:** `task/p1-revision-ui`. Los siete commits de código están; la documentación de esta tanda va sin commit (lo pide el encargo).

### Qué entró (2026-10-07, tarde)

| Commit | Qué |
|---|---|
| `f333e6a` | 105a + aviso de página 6×2 del 110: Ajustes pierde la galería (TIENDA abre la ventana de la tienda), manifiesto con `icono`/`portada`/`capturas` |
| `9bf5233` | 62: los tres perfiles completos del N3 (multimedia, streaming, productividad) rellenan los 18 huecos de la página del dock |
| `f260ad5` | 109: `GetTimelineProperties()` en el núcleo (posición, duración e instante de la medida, FILETIME a epoch ms; el respaldo PowerShell no la pide) + `BarraProgreso` en el panel de música (normal y de barra) y en el kiosko, interpolando desde la última medida mientras suena |
| `26705e6` | 112: los widgets de la celda usan `fgColor` o `textoSobre(bgColor)` cuando el botón tiene fondo propio |
| `9901bff` | 112: lo mismo en el deslizador (cabecera, valor, escala y puntos apagados) |
| `2a4f021` | 111: panel de música de 300 px anclado arriba y lengüeta de 28 px para plegarlo; se guarda en `musicPanel.plegado` (opcional, sin migración) |
| `bd9a8d4` | 105b: tienda con tarjetas (icono DOT, portada recortada, nombre, autor, tipo, estado) y ficha con portada, tira de capturas, requisitos y el riesgo completo |

Además, sin commit: wiki ES/EN `Docks-y-Controladores` / `Docks-and-Controllers` con la sección «Perfiles completos» / «Full profiles»
(T-DOC-03, wT), `NOTAS-TECNICAS.md` con «Timeline SMTC (solo el núcleo nativo)» (`GetTimelineProperties()` síncrono, `None` con
duración 0, FILETIME → epoch Unix, solo nativo, la pantalla interpola vía `timelineUpdatedAt` en vez de sondear), `docs/galeria.md`
con los campos `icono`/`portada`/`capturas` y el ejemplo v2, y el CHANGELOG/ROADMAP/tablero de esta misma tanda (T-DOC-04).

### Verificación

* `npm run check`: **0 errores, 28 warnings** (deuda previa, ninguno de estos archivos) y los **7 guardianes en verde** —
  `check-i18n` 1366 claves ES/EN, `check-acciones` 43 tipos, `check-ipc` 135 canales y 16 eventos, `check-wiki` 24 páginas y 12
  parejas ES/EN, `check-campos` 69 campos, `check-paridad` 38 campos con 0 huecos, `check-perfiles` 2 revisados.
* Capturas en `_referencias/informes/`: `capturas-musica/` (principal en oscuro y en claro, con y sin el panel) y
  `capturas-widgets/` (widgets en los dos temas). Informes: `barra-progreso-smtc.md`, `panel-musica-compacto.md`.
* Los errores que quedaban a media tanda (`TitleBar.tsx:213` por la cadena de la galería, `check-i18n` en `tienda/**`) están
  cerrados: los quitó `f333e6a` y `bd9a8d4`.

### Falta (dueño)

* **N3**: los tres perfiles completos del 62 y el resto del dock físico — en esta tanda no había aparato conectado.
* **Monitor 1280×480 con la app instalada**: sin empaquetar la ventana ignora las coordenadas guardadas (103).
* **Voz**: oír el texto a voz; desde el agente no se puede escuchar.
* **CPU en reposo**: repetir el A/B de 100 en las mismas condiciones que el 84 (la de entonces era con música sonando).
* **Regenerar `native/vd-core.node`** con `npm run build:native` **con la app cerrada**: el `.node` instalado es anterior a
  `GetTimelineProperties()`, así que la barra de progreso de la canción (109) todavía no sale en pantalla.

### Próximo paso

1. Pruebas del dueño (las de arriba).
2. Fusionar `task/p1-revision-ui` y publicar **0.14.0**: el `[Unreleased]` del CHANGELOG ya resume 56–112.
3. Después: 105c (plugins, atado al MVP del 83) y 107 (vídeo para la Store y la página).

## Turno 2026-10-07 — T-REV-19 Deslizador vertical DOT (DONE)

* **Modelo saliente:** opencode wS (Qwen3.8 Max, Go).
* **Base git:** `task/p1-revision-ui` (sin commit ni push, por encargo).
* **Archivos de este turno:**
  * `src/components/dot480/DotSliderPartes.tsx`: `PistaSlider` unifica las dos orientaciones en un solo segmento espejado — columnas de 3 puntos redondos en horizontal, **filas** de 3 en vertical (antes la vertical eran 12 barras macizas `height: 3`); los puntos apagados pasan del `rgba(255,255,255,0.08)` fijo a `VD.dotIdle` (visibles en modo claro). `EscalaSlider` acepta `orientation`: en vertical es una columna con el max arriba y el 0 abajo.
  * `src/components/dot480/DotContinuousSlider.tsx`: en vertical la pista y la escala van lado a lado (envoltorio `row`); en horizontal la escala sigue cerrando la columna. Añadido `data-orientation` para pruebas.
  * `electron/main/vivoMandoPagina.ts`: nuevo bloque `JS_SLIDER_MANDO` con `sliderPuntosMovil`, el constructor de la pista de puntos del mando móvil (respeta `orientation`, segmentos de 3 puntos redondos, colores por variables CSS del tema `--ac`/`--txt`/`--sub-bor`, arrastre con puntero y throttle de envío de 60 ms como el `<input range>` anterior).
  * `electron/main/paginaMando.ts`: la rama del slider ya no crea un `<input type="range">` (ignoraba la orientación y no era DOT); llama a `sliderPuntosMovil`. El CSS `.slider-control` de `estiloMandoPagina.ts` queda sin uso, pero ese archivo es de otro agente (T-REV-18): no se tocó.
  * `docs/AGENT_COMMUNICATION.md`: T-REV-19 pasado a `DONE`.
* **Tecla del dock:** confirmado que el pintor no dibuja deslizadores — `useWidgetsSuperficie.ts:70` excluye `widget === 'slider'`; no se añadió nada.

### Verificacion

* `npx tsc --noEmit`: ok. `npm run build`: ok.
* `npm run check`: 0 errores, 26 warnings (todos preexistentes/de otros). **`check-wiki` falla con 1 problema** (`Barra-Flotante.md` enlaza a `Floating-Bar`, que no existe): archivos del turno T-REV-22, no de este. `check-campos`, `check-paridad` y `check-perfiles` corrieron aparte: ok.
* **Prueba en la app** (`node scripts/probar-app.mjs abrir wS`, CDP 9333, config sembrada con un slider vertical de volumen y uno horizontal de variable al 25%):
  * Oscuro: vertical 12 segmentos, filas (`row`) de 3 puntos redondos 2,5 px, pista `column-reverse`, escala en columna al lado (`100/50/0`); horizontal 16 segmentos en columnas; punto apagado `rgba(255,255,255,0.04)` = `VD.dotIdle`; puntero `VD.text`, activo = acento.
  * Claro: punto apagado `rgba(0,0,0,0.08)` = `dotIdle` claro; puntero `#111418`.
  * Mando móvil: servidor arriba, página servida (52 KB); sintaxis del script completo OK (`new Function`); prueba funcional con DOM falso de `sliderPuntosMovil` en las dos orientaciones: segmentos, 3 puntos redondos por segmento, dirección correcta, valor inicial 50, arrastre al 25% → 25.
  * Copia de prueba cerrada al terminar (`probar-app.mjs estado`: sin copia abierta).

### Proximo paso concreto

* Quien cierre T-REV-18 (dueño de `estiloMandoPagina.ts`) puede borrar el CSS muerto de `.slider-control` y sus pseudo-clases; el mando ya no usa `<input type="range">`.

## Turno 2026-10-07 — T-REV-20 Aplicar icono del catálogo al elegir preset (DONE)

* **Modelo saliente:** opencode wV (Kimi K2.7 Code, Go).
* **Base git:** `task/p1-revision-ui` (sin commit ni push, por encargo).
* **Archivos de este turno:**
  * `src/screens/editor/useEstadoEditor.ts`: `applyPreset` y `applyDockPreset` ahora resuelven `iconoCatalogo`, aplican primero el glifo de respaldo y sustituyen por `iconoPuntos` si el usuario no cambió el icono entretanto.
  * `src/utils/useDeck/botones.ts`: `rellenarBotones` acepta `iconoCatalogo` como campo extra; aplica el glifo en un paso de historial y resuelve el icono del catálogo después sin apilar otro deshacer.
  * `src/utils/useDeck/paginas.ts`: `crearPaginaDesdePlantilla` ahora también resuelve `iconoCatalogo` de los huecos de plantilla.
  * `docs/AGENT_COMMUNICATION.md`: T-REV-20 pasado a `DONE`.
* **Caminos de aplicar preset cubiertos:** presets del editor (`applyPreset`), presets del dock en el editor (`applyDockPreset`), presets de controles de dock desde el inspector (`rellenarBotones` vía `useDockHardwareState`), y páginas creadas desde plantillas de app (`crearPaginaDesdePlantilla`).

### Verificacion

* `npm run check`: **0 errores, 22 warnings** (ninguno introducido por este turno; el warning de `max-lines` en `useEstadoEditor.ts` quedó resuelto).
* `npm run build`: **ok**.
* **Prueba en la app:** no se pudo realizar — la copia de prueba estaba ocupada por `wS` (`node scripts/probar-app.mjs abrir wV` reportó PID 19384 abierto desde las 12:07:37 a.m.).

### Proximo paso concreto

* Cuando la copia de prueba esté libre, abrir con `node scripts/probar-app.mjs abrir <quien>`, elegir el preset **Spotify** y el de **Apagar**, guardar, y verificar que el icono del catálogo aparece en la celda.

## Turno 2026-10-06 — prototipo de plugins de Stream Deck (83, fase 0)

* **T-PLG-00 (opencode `wN`, DeepSeek por Go, ~$0.32):** anfitrión de prueba en `electron/main/plugins/` (`manifiesto`, `archivos`, `anfitrion`, `procesos`, `ventanaPI`, `prototipo`), encendido solo con `VD_PLUGIN_PROTO`; `probar-app.mjs` gana `--plugin= --modo= --pulsar --pi`. Dependencia nueva `ws` 8 (MIT), la añadió el supervisor. WebSocket y HTTP en `127.0.0.1` con puerto aleatorio, conexiones con `Origin` ajeno rechazadas (403), plugins HTML y PI en ventanas con sandbox, sin preload y con sesión propia. 37 aserciones y un plugin falso Node/HTML.
* **Supervisor:** midió con cinco plugins reales (ver `_referencias/informes/plugins-streamdeck.md` §9) y corrigió lo que salió: `UUID` ausente → nombre de la carpeta; CORS duplicado en el PI; `platformVersion` en `-info`.
* **Verificación:** `npm run check` 0 errores, 33 warnings; `npm run build` OK; sin `VD_PLUGIN_PROTO` no aparece ninguna línea `[plugins]`; tras cerrar no queda ningún proceso de plugin.
* **Pendiente:** el MVP (fase 1, semanas; decisión del dueño) y revisar si el proceso principal tarda en salir con `app.quit()` (lo vio opencode, sin verificar).

## Turno 2026-10-07 — T-REV-03 núcleo Rust (fases 1–5 del encargo, DONE sin commit)

* **Modelo:** Muse Spark (opencode), rama `task/p1-revision-ui`. Sin commits ni push (lo pide el encargo).
* **Punto 1 (controles SMTC):** `vd-core/src/media/mod.rs` — `NowPlaying` gana `controls` (play/pause/next/prev/shuffle/repeat de `GetPlaybackInfo().Controls`), `is_shuffle_active` y `auto_repeat_mode` (`RepeatMode::None/Track/List`); `vd-node` los expone (`ControlesSesion` + opcionales); `media.ts` ya no lanza `CAPS_SCRIPT` si el nativo los trae (queda de respaldo para `.node` viejo/sin núcleo) y su `NowPlaying` gana los tres campos opcionales.
* **Punto 2 (límite + carátula):** `now_playing_smtc` va por `en_hilo_mta_con_limite` (1500 ms); carátula en caché por pista (app+título+artista) en un estático con `Mutex`.
* **Punto 3 (TTS):** `speak_text` como `AsyncTask` (Promise), canal nuevo `launch:speak` (`launcher.ts`+`launcherIpc.ts`, preload, `src/types/ipc.ts`), `entrada.ts` usa `api.launch.speak` con el script System.Speech de respaldo sin núcleo.
* **Punto 4 (async + límite):** `run_script`/`play_macro` como `AsyncTask` (Promise); `run_script_con_limite` (30 s por defecto, mata al hijo por PID al vencer, variante nueva `LauncherError::Timeout`); llamadores TS (`launcher.ts`, `macro.ts`, `native.ts`) con `await` y caída al respaldo si la Promise se rechaza.
* **Punto 5 (LHM):** `sensors.ts` pasa `enabled:false` a Rust; LHM queda solo en la capa JS asíncrona (medido: 42 sensores `/native/` sin LHM).
* **Verificación:** `cargo test -p vd-core` 176 verde (4 tests nuevos); `npm run build:native` ok (`.node` 2287 KB, sin warnings propios); `npm run check` 0 errores (32 warnings preexistentes en archivos ajenos); `npm run build` ok; `check-ipc` 135 canales.
* **Medido en app real** (`probar-app.mjs`, copia `opencode`, con Edge sonando): controles nativos `{play:false,pause:true,next/prev/shuffle/repeat:false}`; TTS frase larga 0.16–0.23 s; script de 10 s con `nowPlaying` respondiendo en 0.00 s a la vez; timeout de 2 s mata al hijo (sin `powershell.exe` colgados); con `VD_SIN_NUCLEO=1` el respaldo PS anda (pista+controles, script, speak).
* **No tocado:** `media.diagnose` (sigue en PowerShell a propósito), `typeText`/`controlMedia`/sensores Rust (síncronos, fuera del encargo), `src/types/hardware.ts` (sin cambios: los campos nuevos viajan como opcionales y la UI no los lee aún).
* **Aviso:** `scripts/generar-iconos-dot.mjs` aparece modificado (+182) y no es de este turno (mtime 20:30, reclama T-REV-01); se dejó intacto.

## Turno 2026-10-07 — T-REV-05 mojibake + complejidad (DONE sin commit)

* **Modelo:** Muse Spark (opencode), rama `task/p1-revision-ui`. Sin commits ni push (lo pide el encargo).
* **Mojibake:** `macro.ts` traía doble codificación cp1252→UTF-8 en comentarios (ó/í/—/→/·/«» salían como `Ã³`/`â€"`/etc.); reparado por script (46 secuencias, 0 restos en `electron/main/*.ts`). `ps-helpers.ts:58` mostraba el mojibake a propósito como ejemplo de salida sin BOM: se sustituyó por descripción equivalente para que el grep del encargo quede vacío.
* **Complejidad:** `SensorsSection` 29→sin aviso (3 subcomponentes a nivel de módulo en el mismo archivo: `CampoRutaLHM`, `CamposHostPuerto`, `FilaBotonesLHM`, `LineaEstadoLHM` — a nivel de módulo para no perder el foco de los inputs); `runActionSequence` 22→sin aviso (`debeSaltarPaso`, `ejecutarPaso`, `debeSeguir`; semántica idéntica incluido el borde de error `''`); `Subdivision2x2` 21→sin aviso (`fondoCuadrante`, `bordeCuadrante`, `colorCuadrante` puros); `ButtonCellInner` 19→sin aviso (`puedeArrastrarCelda`, `quierePulsacionLarga`; props/comparador/manejadores intactos). Equivalencia comprobada con tablas de verdad (TODO IGUAL).
* **Verificación:** `tsc` 0 errores en los 6 archivos tocados (los errores que salen son de `comunes.tsx`/`SelectorIconosDot.tsx`/`tipos.ts`, del catálogo de iconos que otro agente edita en vivo); `eslint` en lo tocado: solo 2 warnings preexistentes en código no tocado (`require` en `macro.ts:31`, `injectUtf8Prefix` 20); `check-acciones.mjs` ok (43 tipos); `npm run build` ok. Todos los tocados ≤600 líneas.
* **AVISO stash:** a mitad del turno se hizo `git stash push --include-untracked` para comprobar un error de `tsc` y el `pop` abortó (otro agente editaba `comunes.tsx` a la vez). Los 4 archivos propios se restauraron con `git restore --source=stash@{0} --worktree` y los demás agentes regrabaron lo suyo (verificado: worktree completo, nadie perdió nada). Queda `stash@{0}` (`wip-t-rev-05`) como copia redundante: **NO hacer `pop`** (abortaría igual); si hiciera falta algo, `git checkout stash@{0} -- <archivo>` tras difuminar. No volver a usar `stash` con agentes concurrentes.
* **No tocado:** `injectUtf8Prefix` (complejidad 20, fuera del encargo: solo comentarios en esos dos archivos).

## Turno 2026-10-07 — T-REV-08 días de la semana en el disparo por hora (DONE sin commit)

* **Modelo:** DeepSeek V4.1 Flash (opencode), rama `task/p1-revision-ui`. Sin commits ni push (lo pide el encargo). Cuota de pago `opencode-go/`; nada por agy.
* **Modelo de datos:** `ButtonConfig.timerTriggerDias?: number[]` (`src/types/config.ts`, JSDoc con `Date.getDay()`); ausente o vacío = todos los días, así lo guardado antes sigue igual.
* **Disparo:** `src/utils/useDisparadores.ts` gana `tocaHoy(dias, fecha)` (pura, sin exportar) y el bucle del reloj filtra por el día de `ahora`, que cuando `cruzoLaHora` da verdadero es el mismo día natural del instante objetivo (el salto de medianoche lo resuelve el tic siguiente).
* **Editor:** `CampoTimerTrigger` añade una fila de 7 `Chip` (lunes→domingo, deshabilitadas sin hora; se guarda el número de `getDay`), "TODOS LOS DÍAS" cuando no hay ninguno y la línea descriptiva cambia a «los días marcados». Cableado en `valoresIniciales` (copia del array), `useEstadoEditor`, `guardar` (`diasDeTimer`: sin días → `undefined`, con días ordenados y sin repetidos), `SeccionComportamiento` y `EditorB`.
* **Resto:** `scripts/paridad.json` con `timerTriggerDias` (no-aplica en las tres, como `timerTriggerAt`); `galeria.ts` avisa `temporizador {hora} (días: …)` con `diasDeLaSemana` en `idioma.ts` (ES/EN, se saltan números fuera de rango); claves `ed.dia.*` en `*Editor` y los dos textos nuevos en `campos.ts`; wiki ES y EN (una línea cada una).
* **Prueba de `tocaHoy`:** script desechable fuera del repo (temp) que extrae la función del fuente y evalúa 15 aserciones: domingo, sábado y lunes (fechas reales 2026-10-03/04/05), lista vacía y ausente en los tres, domingo solo, sábado solo y lista múltiple. Todas en verde; script borrado.
* **Verificación:** `npm run check` 0 errores, 22 warnings (los 22 preexistentes; el cambio había subido `mirarBoton` a complejidad 19 y se extrajo `mirarTimer` para dejarlo en 18 o menos); guardianes: i18n 1290 claves/334 textos, paridad 38 campos/0 huecos; `npm run build` ok.
* **Falta (dueño):** verlo en pantalla — marcar días, guardar, reiniciar y comprobar que solo salta el día elegido; y el aviso de la ficha de riesgo con días.

## Turno 2026-10-06 — revisión integral de la interfaz (90), supervisor Claude Opus 5.5

* **Rama:** `task/p1-revision-ui` (sale de `task/p1-hw-streamdock`). Plan en 6 fases aprobado por el dueño.
* **Reparto (herdr):** agy `wK` (rejilla de acciones, integridad visual, 107 fichas a `Chip`);
  opencode `wN` DeepSeek V4.1 Flash por Go (catálogo de iconos, días de la semana, `PARIDAD.md`; ~$0.6);
  opencode `wR` Muse Spark free (núcleo Rust, complejidad, mojibake, catálogo en español).
  Supervisor: primitivas `src/components/ui/`, tokens y oscuro = OLED, desbordes, kiosko/barra
  flotante táctiles, `folder`/`page-nav`, docs, revisión de cada diff.
* **Corregido en revisión:** la voz se soltaba al volver y cortaba la frase (ahora hilo `vd-voz` con
  una sola `ISpVoice`); la caché de carátula guardaba el `None` del primer instante; dos rodeos al
  guardián de i18n (`'acc' + 'iones'` y una función para no escribir el literal) → `'acciones'`
  declarada en `PERMITIDOS` con su razón (es el prefijo guardado en `iconoPuntos.origen`).
* **Guardianes nuevos:** `check-acciones` exige familia a cada tipo; eslint prohíbe `#fff`/`#ffffff`
  en propiedades y atributos de color (`src/**/*.tsx`).
* **Verificación:** `npm run check` 0 errores, 22 avisos (eran 33), 7 guardianes en verde;
  `npm run build` OK; `cargo test -p vd-core` en verde; `.node` reconstruido y medido (voz 20–58 ms,
  script cortado a 1 s, nowPlaying con controles). App probada por CDP en oscuro, claro y a 1280/900/800 px.
* **Falta (dueño):** oír el texto a voz; pasar editor y catálogo con su configuración real; el
  `CHANGELOG [Unreleased]` no resume aún los ítems 56–89.
* **Próximo:** fusionar la rama tras la prueba del dueño; luego 0.14.0.

## Turno 2026-10-07 — observaciones del dueño tras la revisión (91–104, 106), seis trabajadores

* **Reparto (herdr):** agy `wK` (99/97/96, 95); opencode `wN` DeepSeek V4.1 Flash Go (91/92, 93/94, 100);
  `wR` Muse Spark free (102, 98 datos, 104, CHANGELOG, tutorial); `wS` Qwen3.8 Max Go (101);
  `wV` Kimi K2.7 Code Go (98 al aplicar); `wT` Fledge Alpha free (wiki, página y ficha). Supervisor: 103 y revisión.
* **Orquestación:** una espera por panel (`--until done`, no `idle`), cada encargo con sus archivos y los de los
  demás, una sola copia de prueba para todos (si está ocupada, seguir sin ella y decirlo).
* **Ajustes del supervisor:** `check-wiki` comprueba 12 parejas (antes 7); el símbolo de la rueda en la wiki
  pasa a texto; errata en la página.
* **Verificación:** `npm run check` 0 errores (21 avisos), 7 guardianes en verde; `npm run build` OK. En la app:
  tutorial de 9 pasos, Comportamiento vacío, atajos sugeridos, presets con marca aplicada (Spotify).
* **Falta (dueño):** N3 (editor de dock, pulsación en la tecla), ventana en el monitor secundario con la app
  instalada, CPU en reposo A/B (2,8 % de un núcleo con música, no comparable con el 78), capturas nuevas.
* **Próximo (orden acordado):** fusionar `task/p1-revision-ui` y publicar 0.14.0; luego tienda (105) y vídeo (107).

## Turno 2026-10-07 (noche) — pruebas del dueño en orden, 0.14.0 publicada

* **Decisiones del dueño:** el `.exe` NSIS no se publica (no está firmado): el release de GitHub va sin adjuntos y
  todo enlace de descarga va a la Store; música libre de derechos (sintetizada por código, CC0); plegable para el
  panel de música; vídeo de lo que suena en el panel como prototipo, con recorte.
* **Publicado:** `main` en `e1154b4` (0.14.0), tag `v0.14.0`, release de GitHub sin adjuntos, rama
  `task/p1-revision-ui` empujada. Paquete de la Store `VirtualDeck-0.14.0.appx` (MSIX, 120 MB, `0.14.0.0`) hecho
  con el `makeappx` del SDK (el de electron-builder rechaza `uap10:Parameters`). Kit de subida en
  `_referencias/store-0.14.0/` (paquete, capturas ES/EN, tráiler, miniatura, superhéroe, icono, fichas ES/EN,
  novedades ES/EN, subtítulos `.vtt`). El dueño ya lo subió a Partner Center.
* **Reparto:** wN Claude Haiku 5.5 (Go): perfiles N3, barra de progreso, plegable, vídeo en el panel; wK agy:
  tienda y tráiler; wR Muse Spark (se agotó) y DeepSeek V4.1 Flash (Go): capturas de prensa; wS, wT, wV (gratis):
  slider, núcleo, docs, artes. Nemotron por `opencode run` cuando Exo no respondía.
* **Verificación:** `npm run check` 0 errores, 7 guardianes. Corregido el guardián `check-i18n` (una línea que
  empieza por palabra clave de JS ya no es un rótulo). Capturas de prensa revisadas una a una por privacidad
  (serial, apps, ciudad, hardware, rutas).
* **Pendientes:** ver la lista de abajo.

### Pendientes tras la 0.14.0 (2026-10-07)

1. **Certificación de la Store:** esperar el veredicto; si rechaza algo (notas para el revisor en
   `docs/MICROSOFT-STORE.md`), corregir y subir otra presentación.
2. **Vídeo en el panel de música (113):** que el dueño lo pruebe con un vídeo real, y repetir la medida de
   CPU/GPU con el equipo en reposo y una ventana visible (la primera no fue concluyente).
3. **Tráiler en inglés** (mismos planos, rótulos en inglés) y, si se quiere, una pista de música mejor.
4. **Barra de progreso en las capturas de prensa:** hace falta que `electron/main/mediosFijos.ts` admita
   `positionMs`/`durationMs`/`timelineUpdatedAt`.
5. **Tienda (105c) y plugins (83):** MVP de plugins de Stream Deck (semanas, decisión del dueño por tamaño); hoy
   la tienda solo dice «en desarrollo». Elgato (59) sin fecha.
6. **Limpieza de documentación:** `CONTRIBUTING.md` sigue describiendo `build:installer`, el `.exe` en el release
   y la firma; pasarlo a «solo Store». `docs/MICROSOFT-STORE.md` §5.4 y la wiki ya apuntan a la Store, revisar el resto.
7. **Detalles de arte:** portadas generadas de la tienda con el glifo recortado; `08-kiosko-barra` con bandas negras;
   `05-movil` estrecha sobre lienzo negro; rótulo «Tienda de perfiles e integraciones» del tráiler.
8. **Usuarios del `.exe` 0.13:** no tienen autoactualización; valorar un aviso en la página y el README (ya dicen
   que se pasen a la Store).
9. **Sin fecha:** T-SEC-06 (sandbox del renderer, bloqueado por el canvas).
10. **Higiene:** `_referencias/` aparece como no versionado; confirmar que debe quedar fuera de git.
11. **Cuota:** al cerrar el 2026-10-07 la cuenta de Claude iba al 93 % semanal (se renueva el 10-oct); el trabajo
    de montaje y capturas corrió con la cuota de los trabajadores.

## Apéndice A - Referencias Rápidas

### Guardianes Verificables (para `npm run check`)
Las cifras las imprime cada script; no se copian aquí porque se quedan viejas.
- `check-i18n.mjs`: paridad ES/EN y neutralidad de registro.
- `check-acciones.mjs`: cada tipo con manejador o resuelto por quien llama, y con formulario en el editor.
- `check-ipc.mjs`: los dos lados de cada canal cuadran.
- `check-wiki.mjs`: páginas y parejas ES/EN con los tipos de acción documentados.
- `check-campos.mjs`: campos de acción rellenables y leídos por el ejecutor.
- `check-paridad.mjs`: cada campo de botón con su paridad por superficie.
- `check-perfiles.mjs`: integridad de perfiles de la galería.

### Rutas y Convenios Clave
- `src/types/index.ts` - Tipos principales del sistema.
- `docs/AGENT_COMMUNICATION.md` - Tablero de tareas y estados (`T-P3A`, `T-P3B`, etc.).
- `docs/HANDOFF.md` - Registro de traspaso entre modelos en turnos sucesivos.
- `design.ts` - Paleta de colores OLED: modo oscuro `#070809`, `#111315`, `#26292e`, acento `#FF3B30`; modo claro `#d8dbe0`, `#cbcfd5`, `#9da4ae`.
- `docs/ROADMAP.md` - Estado P1–P5 y siguiente release.
- `package.json check` - Cubre validaciones de pages/ y config.

### Comandos de Verificación Obligatorios
```powershell
npm run check
npm run build
```
