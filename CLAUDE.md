# VirtualDeck — Notas para Claude

Stream Deck alternativo para Windows. Electron + React + TypeScript + Vite.

## 📚 Documentos relacionados (leer antes de empezar)

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Workflow de desarrollo: branches, commits, PRs, release, firma/distribución, recetas y notas para LLMs. (Absorbió RELEASE/desarrollo/firma-y-distribución.)
- **[CHANGELOG.md](CHANGELOG.md)** — Historial cronológico de versiones (Keep a Changelog).
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** — Mapa SRP: cada módulo/clase/feature con su responsabilidad única. Índice maestro del trabajo.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — Secuencia 1/N (+ catálogo de ideas, ex-SUGERENCIAS): mejoramos **un apartado por sesión**, con ritual de verificar→mejorar→documentar→marcar. Empezar cada sesión eligiendo el próximo ítem ⬜.
- **[docs/wiki/](docs/wiki/)** — Staging del wiki público (bilingüe ES/EN) al que apunta el botón Documentación. Ver `docs/wiki/README.md` para publicar.
- **package.json** → campo `version`: source of truth de la versión actual.
- **[docs/NOTAS-TECNICAS.md](docs/NOTAS-TECNICAS.md)** — el detalle de cada zona (estructura, decisiones medidas, trampas). **Leer la sección de la zona antes de tocarla**; aquí solo va una línea por tema.

**Antes y después de cualquier cambio**: `npm run check` (tsc + arquitectura + eslint + 7 guardianes). Cero **errores**; los *warnings* son deuda, no bloquean. Más: `npm run lint:dead` (knip). `check-ipc` cruza los nombres de canales IPC main y preload; las firmas las cruza el compilador (`satisfies ElectronAPI`).

## Reglas sagradas del proyecto (NO VIOLAR)

1. **Estética DOT / 480 OLED Micro Interface**:
   - Modo oscuro: fondo OLED puro `#070809`, superficie `#111315`, bordes `#26292e`, acento `#FF3B30` o preset.
   - Modo claro: grises industriales cemento mate (`#d8dbe0` fondo, `#cbcfd5` superficie, bordes `#9da4ae`, texto `#111418`). **Prohibido el blanco puro `#ffffff`**.
   - Grilla estricta de 4px.
   - **0 emojis**: todo icono es un glifo dot-matrix SVG o mapa de puntos 8×8/5×7 de `src/components/dot480/`.
   - Colores obligatorios vía `const VD = useTheme();`. Prohibido importar `VD`/`VD_LIGHT` directo de `design.ts` en componentes de UI (ESLint lo bloquea).
2. `npm run check` **obligatorio antes de dar una tarea por terminada y antes de hacer commit**, con los 7 guardianes en verde (`check-i18n`, `check-acciones`, `check-ipc`, `check-wiki`, `check-campos`, `check-paridad`, `check-perfiles`). `check-paridad` cruza cada campo de `ButtonConfig` con `scripts/paridad.json` (`si`/`no-aplica`/`hueco` por pantallas, móvil y dock): **añadir un campo de botón obliga a decidir su paridad**, y un `si` sin el campo en los archivos de esa superficie falla. Si se consume por un ayudante de fuera, se declara con `via`, no con un `no-aplica` falso.
3. Complejidad ciclomática máxima por función: **18**. Líneas máximas por archivo: **600**.

## Protocolo de coordinación multi-agente

Este repo lo trabajan, por turnos o en paralelo, OpenCode (con varios modelos propios), Claude
Code y agy/Antigravity (Gemini). La coordinación va por **archivos compartidos**, no por un
archivo de instrucciones aparte — ver la corrección más abajo sobre por qué.

- **Canal 1 — tablero de reclamos** (`docs/AGENT_COMMUNICATION.md`): antes de tocar archivos,
  leerlo y confirmar que nada relevante esté `CLAIMED`; registrar el propio reclamo; al
  terminar y verificar, pasar a `DONE`.
- **Canal 2 — log de handoff** (`docs/HANDOFF.md`): qué se tocó, resultado de `npm run check`/
  `npm run build`, próximo paso concreto para quien continúe.
- **Canal 3 — ramas**: una rama por tarea significativa, `task/<prioridad>-<nombre>`; commits
  atómicos tras verificar.
- **Modelos de OpenCode**: elegir el más capaz para la subtarea; `opencode-go/*` no entrena con el
  prompt, los `*-free` sí (solo documentación o tareas sin nada sensible). Reportar
  `Delegación usada: [tarea -> modelo, ...]` al cerrar.
- **Encargos a otros agentes** (desde herdr): cada encargo dice qué archivos puede tocar **y cuáles son
  de otro agente**; los encargos viven en `_referencias/encargos/` (no versionado).
- **agy/Antigravity (Gemini) vía shell**: no es un provider de `opencode.json`, es un binario
  aparte (`agy.exe`) invocado en modo print/headless: `agy -p="<prompt>" --model
  gemini-3.8-flash-medium --print-timeout 60s --add-dir <cwd>`. Solo modo print — nunca
  `--dangerously-skip-permissions` ni `--mode accept-edits`. Cuota aparte de la de OpenCode.
  virtualdeck es un proyecto abierto, así que no rige acá la restricción habitual de no
  mandarle contenido `[privado]`/sensible (decisión explícita del dueño).

- **Copias de prueba de la app: solo con `node scripts/probar-app.mjs`** (abrir `<quien>`, `estado`,
  `cerrar`, `medir-arranque <quien> [veces]`). Una sola a la vez para todos los agentes (candado en
  `%TEMP%\vd-prueba.lock`), siempre con su propia carpeta de datos (nunca la config del dueño), la
  salida a un registro y no a la terminal, y se cierra con todos sus procesos hijos. Antes cada agente
  abría la suya con `electron.exe` a mano y no la cerraba: el 2026-10-05 había **seis** abiertas (24
  procesos), y lanzarla con la salida redirigida dejaba colgada la herramienta del agente.
- **Si un guardián (tsc, depcruise, eslint, `check-*`) bloquea, se dice y se para; no se esquiva**
  (cadenas partidas, `import.meta.glob` «para que no lo vea», `eslint-disable`, `as unknown as`).

**No crear un `AGENTS.md` en la raíz**: Antigravity lo carga como sus propias reglas y se cuelga
(~130 s y un `RESOURCE_EXHAUSTED` falso). El protocolo vive aquí; `opencode.json` apunta su
`instructions` a este archivo.

## Stack
- **Electron 33** (main: `electron/main/index.ts`, preload: `electron/preload/index.ts`)
- **React 18 + Vite 5** (renderer en `src/`)
- **electron-vite** como builder, **electron-builder** para empaquetado
- **openrgb-sdk** para integración RGB

## Mapa rápido (detalle en NOTAS-TECNICAS → «Estructura clave»)
- Pantallas en `src/screens/`: `MainB` (+`main/`), `EditorB` (+`editor/`: secciones plegables, estado en
  `useEstadoEditor`, `formularios/` = un formulario por tipo en `FORMULARIOS`), `FullscreenB` (kiosko,
  +`fullscreen/`), `DispositivosB` (docks, +`dispositivos/`), `RGBManagerB` (+`rgb/`), `WallpaperB`,
  `FloatingBarB`/`BarConfigB`, `TiendaB` (+`tienda/`).
- Celda: `components/ButtonCell.tsx` + `celda/` (derivados, colores, insignias, pulsación); rejilla
  compartida `components/rejilla/RejillaBotones.tsx`. Primitivas: `components/ui/`.
- Lógica: `utils/pulsarBoton.ts` (**lo que pasa al pulsar, un solo sitio**), `utils/actions.ts` +
  `utils/acciones/` (un archivo por familia, mapa `MANEJADORES`, sin `default: OK`), `utils/useDeck/`
  (config y sus operaciones), `utils/useDisparadores.ts` (hora/días/sensor, montado en `App`),
  `utils/estadoSistema.ts`, `utils/superficies/` (docks), `utils/idiomas/` (i18n por fragmentos).
- `src/comun/`: lógica **pura** compartida renderer ↔ proceso principal (contraste, interpolar,
  visibilidad, widgets, catálogo de marcas). Regla `comun-es-puro`.
- Proceso principal `electron/main/`: `index.ts` (arranque), `windowManager.ts` + `ventanaMonitor.ts`
  (ventana y monitor), `ipc/` (por dominio), `superficies/` (driver del N3, tabla de modelos),
  `paginaMando.ts`/`servidorLocal.ts` (mando móvil), `galeria.ts` (riesgo de perfiles), `media.ts`,
  `audio.ts`, `launcher.ts`, `macro.ts`, `rgb.ts`, `sensors.ts`, `idioma.ts` (textos del main).
- Núcleo Rust: `crates/vd-core` (lógica) + `crates/vd-node` (napi) → `native/vd-core.node`
  (`npm run build:native`). Lo que tarda (`runScript`, `playMacro`, `speakText`) es `AsyncTask`.

## Trampas conocidas (una línea; el porqué en NOTAS-TECNICAS)
- Botones ↔ huecos **por posición, nunca por id** (`conHuecosCompletos`): borrar una página renumera sin renumerar ids.
- Encendido/apagado en `config.toggledIds` (lo ven las tres pantallas); `toggledIds` entra en `pulsarBoton`
  **como función**: `ButtonCell` está memoizado e ignora manejadores nuevos.
- La barra flotante es otra ventana: `config:changed` va a las dos y quien lo recibe **no vuelve a guardar**;
  lo que se guarde con `api.config.save` directo tiene que estar en la lista de adoptados (`state`,
  `floatingBar`, `toggledIds`, `remote`).
- Kiosko: `FullscreenB` escucha el teclado en **captura** con `stopImmediatePropagation` (si no, ESC salía sin PIN).
- `App` renderiza los proveedores de tema e idioma: JSX a nivel de `App` que necesite color o `t()` va en un hijo.
- `galeria.resumirRiesgo` es lo único entre «importar un perfil» y «ejecutar código ajeno»: todo tipo de
  acción nuevo que toque el sistema (también teclear) se añade ahí.
- PowerShell: `.ps1` temporal **con BOM**; el prefijo UTF-8 va **después** de `param()` (`runPS`, `injectUtf8Prefix`).
- SMTC: `Await-Op` con `AsTask`, nunca sondear `$op.Status`; `media.diagnose` va por PowerShell **a propósito**.
- Carátula de música solo con núcleo nativo (PowerShell 5.1 no puede).
- Ventana: `skipTaskbar: true` siempre; arranque con sesión `--oculto`; monitor recordado por huella
  (`ventanaMonitor.ts`); lo que mueve la propia app no se guarda.
- LibreHardwareMonitor **no** se empaqueta (escribe junto a su `.exe`, imposible en MSIX).
- `app.setAppUserModelId` = `build.appId` (si no, notificaciones sin nombre).
- Docks (N3): interfaz HID 0, imagen **rotada 90°**, el orden de `controles` del modelo = huecos (cambiarlo
  desordena páginas guardadas); los botones fijos se pintan y disparan con `botonesResueltos`.
- i18n: `t()` y `tf()` fallan en silencio; `check-i18n` tiene seis comprobaciones (incluida la fuente de
  puntos de `DotText`). Los datos sembrados (`actionData`, `brandIcons`) no se traducen en caliente.
- Macros: el mapa de teclas sale de `UiohookKey` (scancodes); el texto para PowerShell pasa por `paraPS`.
- Sondas temporales en el main: `require('./x')` no sirve (todo va en un bundle); usar el import de arriba.
- Arranque: `npm run dev` tarda ~49 s y es solo de desarrollo; empaquetado ~240 ms.
- `VD_SIN_NUCLEO=1` prueba los caminos de respaldo; `VD_PLUGIN_PROTO` enciende el prototipo de plugins (83).

## Scripts
- `npm run dev` · `npm run build` · `npm run build:native` · `npm run package:store` · `npm run build:iconos`
- `build:installer` existe pero **no es un canal de publicación** (el `.exe` no se publica; solo Store).
- Copia de prueba: `node scripts/probar-app.mjs abrir <quien> | estado | cerrar` (CDP en 9333).

## Convenciones
- Estilos inline con `useTheme()`; tokens además de colores: `onAccent` (texto sobre acento, nunca `#fff`),
  `backdrop`, escala `tipo`. Contraste sobre un color cualquiera: `textoSobre(color)` (`src/comun/contraste.ts`).
- Iconos: glifos DOT (`DotGlyphIcon`) y catálogo 16×16 (`src/data/iconosDot/`, campo `iconoPuntos`); nada de emojis ni unicode.
- Primitivas: `components/ui/` (`Chip`, `Segmentado`, `BotonIcono`, `Modal`, `estilos.ts`) antes de escribir otra a mano.
- Config en `userData` como JSON UTF-8, con migraciones versionadas en `configMigration.ts`.
- Respuestas al dueño en español, cortas y directas.

## Release (detalle en CONTRIBUTING.md)
1. Bump en `package.json` + `npm install --package-lock-only`. 2. Entrada en `CHANGELOG.md`.
3. Commit `chore(release): bump X -> Y`, tag `vX.Y.Z`, push. 4. `npm run build:store` (el `.appx`/MSIX
   que se sube a Partner Center; ver `docs/MICROSOFT-STORE.md` por el rodeo de `makeappx`).
5. `gh release create vX.Y.Z --notes-file <notas>` **sin adjuntos**: decisión del dueño (2026-10-07), el `.exe`
   NSIS no está firmado y no se publica; todo enlace de descarga va a la Store
   (`https://apps.microsoft.com/detail/9N92JRF820JP`). Sin `latest.yml` no hay autoactualización del `.exe`.
   Publicar solo con el visto bueno del dueño.

## Si algo se rompe en runtime
Audio: `[audio]` en el log del main. Música: IPC `media:diagnose`. Sensores: botón «?» de la barra lateral.
PowerShell con `param()` roto: el prefijo UTF-8 está mal colocado (`injectUtf8Prefix`).
