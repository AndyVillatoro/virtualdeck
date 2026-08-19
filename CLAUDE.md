# VirtualDeck — Notas para Claude

Stream Deck alternativo para Windows. Electron + React + TypeScript + Vite.

## 📚 Documentos relacionados (leer antes de empezar)

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Workflow de desarrollo: branches, commits, PRs, release, firma/distribución, recetas y notas para LLMs. (Absorbió RELEASE/desarrollo/firma-y-distribución.)
- **[CHANGELOG.md](CHANGELOG.md)** — Historial cronológico de versiones (Keep a Changelog).
- **[docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)** — Mapa SRP: cada módulo/clase/feature con su responsabilidad única. Índice maestro del trabajo.
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — Secuencia 1/N (+ catálogo de ideas, ex-SUGERENCIAS): mejoramos **un apartado por sesión**, con ritual de verificar→mejorar→documentar→marcar. Empezar cada sesión eligiendo el próximo ítem ⬜.
- **[docs/wiki/](docs/wiki/)** — Staging del wiki público (bilingüe ES/EN) al que apunta el botón Documentación. Ver `docs/wiki/README.md` para publicar.
- **package.json** → campo `version`: source of truth de la versión actual.

**Antes y después de cualquier cambio**: corré `npm run check` (tsc + arquitectura + eslint). Cero **errores** antes y después (los *warnings* de eslint son señal de deuda SRP, no bloquean — ver Bloque B del roadmap). Tooling: `npm run lint:acciones` (cobertura de tipos de acción), `npm run lint:arch` (dependency-cruiser, límites de capas SRP), `npm run lint` (eslint), `npm run lint:dead` (knip, código muerto).

## Stack
- **Electron 33** (main: `electron/main/index.ts`, preload: `electron/preload/index.ts`)
- **React 18 + Vite 5** (renderer en `src/`)
- **electron-vite** como builder, **electron-builder** para empaquetado
- **openrgb-sdk** para integración RGB

## Estructura clave
- `build/` — app icon (`icon.ico`, `icon.png`, `icon.svg`) generado por `scripts/generate-icon.js`
- `scripts/generate-icon.js` — renderiza icono dot-matrix SVG → PNG → ICO (requiere `sharp`)
- `src/screens/` — pantallas: `MainB`, `EditorB`, `FullscreenB`, `RGBManagerB`, `WallpaperB`
- `src/screens/editor/` — el editor por partes: `PasoAccion` (elegir qué hace),
  `PasoConfigurar` (los apartados comunes: toggle, mantener pulsado, disparadores),
  `formularios/` (**un componente por tipo de acción en un mapa `FORMULARIOS`** — añadir un tipo
  es añadir una entrada, no tocar una cadena de condiciones; repartidos por familia: `basicos`,
  `sistema`, `datos`, `rgb`, `compuestos`), `comunes.tsx` (`Field`, `Btn`, los sub-selectores
  y las funciones de estilo que comparten los pasos), `actionData.ts` (datos puros) y `MacroEditor.tsx`.
  `EditorB.tsx` se queda con el estado, el paso de estilo y el guardado.
- `src/components/ButtonCell.tsx` — celda de botón: estructura, gestos y estado (~370 líneas)
- `src/components/celda/` — las piezas de la celda: `colores.ts` (prioridad de fondo y borde),
  `ContenidoCentral` (widget o icono, con sus cuatro formas), `Insignias` (las marcas de las esquinas),
  `MenuContextual` y `usePulsacionTactil` (toque, doble toque y pulsación larga).
- `src/utils/actions.ts` — despachador de acciones y runner de secuencias (~200 líneas)
- `src/utils/acciones/` — una familia por archivo: `lanzar`, `audio`, `media`, `entrada`, `datos`, `rgb`.
  `index.ts` arma el mapa `MANEJADORES` y declara `RESUELTAS_POR_EL_LLAMADOR` (los tipos que
  resuelve `runActionSequence`: script, folder, branch, countdown). **No hay `default: return OK`**:
  un tipo sin manejador devuelve error, y `scripts/check-acciones.mjs` lo detecta antes de ejecutar.
- `src/utils/nowPlaying.tsx` — hook que consulta media session via PowerShell
- `electron/main/audio.ts` — control de dispositivos de audio (PowerShell + C# IPolicyConfig)
- `electron/main/media.ts` — info de reproducción actual + shuffle/repeat via SMTC
- `electron/main/macro.ts` — grabación de macros (uiohook-napi) + reproducción via PowerShell
- `electron/main/rgb.ts` — control RGB vía OpenRGB SDK
- `electron/main/launcher.ts` — ejecutar apps/scripts
- `electron/main/configManager.ts` — carga/guardado/backup de configuración (SRP)
- `electron/main/windowManager.ts` — creación y estado de ventanas (SRP)
- `electron/main/trayManager.ts` — tray icon, menú contextual, hotkeys globales (SRP)
- `electron/main/ipc/` — handlers IPC organizados por dominio (audio, media, macro, config, etc.)
- `electron/main/index.ts` — slim bootstrap (~95 líneas); importa los módulos anteriores
- `src/components/settings/` — `PanelAjustes` (el desplegable entero de la rueda dentada)
  y sus secciones: `RGBSection`, `SensorsSection`, `settingHelpers`. `TitleBar` se queda con
  la barra en sí (~250 líneas).

## Scripts
- `npm run dev` — desarrollo (electron-vite)
- `npm run build` — compila renderer + main + preload
- `npm run build:win` — empaquetar Windows (solo `--dir`, sin instalador)
- `npm run build:icon` — regenerar `build/icon.{ico,png,svg}` desde `scripts/generate-icon.js`
- `npm run build:installer` — compilar + generar NSIS installer (`dist/VirtualDeck-Setup-{version}.exe`)

## Convenciones
- Estilos inline con tema desde `src/utils/theme.tsx` (`useTheme()` → `VD`)
- Iconos: lucide-react via `src/components/VDIcon.tsx`, fuentes brand en `src/data/brandIcons.ts`
- Persistencia de config en `userData` (Electron) como JSON UTF-8
- Estilo: respuestas cortas y directas; preguntar si no se sabe; dar opciones cuando aplique

## Notas técnicas
- PowerShell scripts (audio.ts, media.ts) fuerzan UTF-8 con `chcp 65001` + `$OutputEncoding` + `[Console]::OutputEncoding`. No usar BOM — rompe el parsing de PS.
- `IPolicyConfig` COM: IID correcto es `F8679F50-850A-41CF-9C72-430F290290C8` (no confundir con CLSID `870AF99C-...`). El orden de métodos en la interfaz debe coincidir con la vtable real.
- Widget `now-playing` no se aplica a botones de tipo `audio-device` (filtro en `MainB.tsx`).
- `media.ts` re-consulta ventanas activas en cada ciclo cuando SMTC falla, para reflejar cambios de pestaña/video.
- **SMTC await (NO tocar)**: el `Await-Op` del PREAMBLE de `media.ts` convierte el `IAsyncOperation` de WinRT a un `Task` de .NET vía `System.Runtime.WindowsRuntime` + reflection (`AsTask`), pasando el tipo de resultado explícito. **NO** volver al polling de `$op.Status`: en PowerShell 5.1 stock esa propiedad no se proyecta (queda vacía), el await devuelve siempre `$null`, el manager sale `null` y el widget de música deja de mostrar nada. Verificado en vivo (polling → manager null, AsTask → OK). Los alias de tipo (`$TMgr`, `$TProps`, `$TStream`) usan el loader WinRT completo `,Namespace,ContentType=WindowsRuntime` para resolver sin depender del orden de carga del winmd. El thumbnail (`OpenReadAsync`) devuelve `IAsyncOperationWithProgress`, por eso se le pasa también `$progressType` (`[UInt64]`).
- **Audio cache**: `audioIpc.ts` cachea la lista de dispositivos 30 s. Invalida automáticamente al cambiar dispositivo default. Pasar `force=true` para forzar refresco.
- **Multi-select**: Ctrl+clic en celdas para seleccionar múltiples botones. La barra de bulk-ops flota sobre la grilla. `selectedIds` se limpia al cambiar de página.
- **Shuffle/repeat SMTC**: usan `TryChangeShuffleActiveAsync` / `TryChangeAutoRepeatModeAsync` de Windows.Media.Control. Requieren que haya una sesión SMTC activa.
- **Macro**: grabación global via `uiohook-napi` (N-API — no requiere rebuild para Electron 33). Reproducción via un único script PowerShell generado dinámicamente (SendKeys + user32.dll mouse_event). El `.node` binario se desempaqueta fuera del asar (`asarUnpack` en package.json).
- **Accent presets**: `ACCENT_PRESETS` en `design.ts` — 10 colores predefinidos. El color libre via `<input type="color">` sigue disponible.
- **Tema claro/oscuro/sistema**: `ThemeProvider` en `src/utils/theme.tsx`. Selector en TitleBar → ⚙ → TEMA. **El color siempre sale de `useTheme()`**; importar la paleta `VD` de `design` la congela en oscuro y el fallo no se ve ni en `tsc` ni en el build — solo en pantalla, y solo si alguien prueba el tema claro en esa pantalla. Por eso hay una regla `no-restricted-imports` en `eslint.config.mjs` que lo prohíbe en todo `src/` salvo `theme.tsx`.
  Los estilos que antes eran constantes de módulo (`inputStyle`, `btnPrimary`, `inputStyleSettings`…) son ahora funciones `estilo*(VD)`, y cada componente se hace un alias local con el mismo nombre — así los ~100 usos siguen escritos igual.
  `App` *renderiza* el proveedor, así que su propio cuerpo queda fuera del contexto: cualquier JSX a nivel de `App` que necesite color va en un componente hijo (`PantallaCargando`, `AvisoDeshacer`, `AvisoError`, `UpdateBanner`).
- **i18n (ES/EN)**: `src/utils/i18n.tsx` — `LanguageProvider` (envuelve todo en `App`, es el provider más externo) + `useT()` + diccionarios `es`/`en` con claves planas estables (no el texto). `t(key, vars?)` interpola `{var}` y cae a `es` y luego a la clave. `config.language` ('system'|'es'|'en'); 'system' detecta `navigator.language`. **Importante**: como `App` *renderiza* el provider, su propio cuerpo queda fuera del contexto — cualquier JSX a nivel de `App` que necesite `t()` debe extraerse a un componente hijo (ej. `UpdateBanner`). Cobertura: al día de hoy no queda texto que la auditoría detecte, que no es lo mismo que "todo traducido" — la cuarta comprobación es heurística. Hay dos mecanismos: `t('clave')` con claves estables para textos de la app, y `tf('Texto en español')` (`useFieldText`) para las etiquetas del editor, que usa el propio español como clave contra `FIELDS_EN`. **Los dos fallan en silencio**: `t` cae a la clave literal y `tf` cae al español, así que un texto sin traducir se ve igual que uno traducido a medias. Por eso `npm run check` corre `scripts/check-i18n.mjs`, con cuatro comprobaciones: claves duplicadas, ES↔EN desparejadas, todo `t()`/`tf()` literal sin entrada, y —la cuarta, la que faltaba— **texto visible en español que nunca se envolvió**. Las tres primeras solo miran lo que ya pasó por `t()`: con ellas en verde quedaban ~55 textos sin traducir (los errores de `utils/actions.ts`, los ajustes, los menús de página), y los encontró el usuario, no el build. La cuarta es heurística y mira tres sitios: atributos (`title`, `placeholder`…), texto entre etiquetas en la misma línea, y **texto que ocupa su propia línea** — este último se añadió después, porque sin él se colaron otros 20 (los avisos del editor, el grabador de macros, el editor de iconos) con la auditoría en verde. Marca lo que tenga acentos españoles, dos palabras funcionales, o una palabra inequívoca en frases cortas. Lo que no sea idioma va a `PERMITIDOS`, que debe seguir siendo corta. Los literales que no son idioma (rutas, atajos, hex, URLs) van **sin** `tf()`.
- **Onboarding + hints**: `Onboarding.tsx` (tutorial inicial, se dispara si `config.onboardingCompleted !== true`; repetible vía Ayuda → Acerca de). `Hint.tsx` (mensaje flotante contextual descartable; usa `config.hintsDismissed` para no repetirse). Ambos i18n.
- **PowerShell `param()`**: `runPS` (en `ps-helpers.ts`) detecta si el script empieza con `param(...)` y, en ese caso, inserta el prefix UTF-8 DESPUÉS del bloque param. PowerShell exige que `param()` sea la primera sentencia del script — meterle `chcp 65001` arriba lo rompe silenciosamente. Si modificás `runPS`, mantené ese parser.
- **Audio device switching**: `audio.ts` chequea HRESULT por cada `SetDefaultEndpoint` (3 roles: Console/Multimedia/Communications). Si `IPolicyConfig` falla con `E_NOINTERFACE`, prueba `IPolicyConfigVista` (IID `568b9108-44bf-40b4-9006-86afe5b5a620`). Después de setear, vuelve a consultar `GetDefaultAudioEndpoint` para verificar que el cambio se aplicó (algunos drivers aceptan la llamada sin aplicarla). Logs en `console.error` con prefix `[audio]`.

## ⏱️ Arranque: desarrollo y producción no se parecen

Medido con `VD_DIAG=1` (la línea `[arranque] ventana visible a los N ms`):

| Cómo se ejecuta | Tiempo hasta ver algo |
|---|---|
| `npx electron .` sobre `out/` — lo mismo que instala el usuario | **~240 ms** |
| `npm run dev` (electron-vite) | **~49 s** |

Los 49 s son **solo de desarrollo**, y son reproducibles. Ya se descartaron, con
medición y no por deducción: la resolución de `localhost` (127.0.0.1 tarda igual),
el plugin de CSP de desarrollo, las DevTools, el proxy de Chromium
(`no-proxy-server`), la velocidad de disco (3000 archivos de `node_modules` en
483 ms) y esbuild (empaqueta `src` + React entero en 55 ms). El servidor sirve
cada módulo en menos de 1 ms: el tiempo se va en huecos de 10–20 s **entre
oleadas de peticiones**, o sea del lado del renderer. Causa no encontrada.

Antes de "optimizar el arranque", mirá cuál de los dos se está midiendo: si el
reporte sale de `npm run dev`, la aplicación empaquetada no tiene ese problema.

## ⚡ Workflow rápido (cheatsheet)

### Verificar antes de cualquier cambio
```bash
git status           # debe estar limpio o tener cambios coherentes
npx tsc --noEmit     # cero errores
```

### Ciclo de feature
```bash
git checkout -b feat/algo
# ...editar...
npx tsc --noEmit
git add <files-específicos>      # nunca git add -A sin revisar
git commit -m "feat: descripción corta en imperativo"
git push -u origin feat/algo
gh pr create                     # con --title y --body apropiados
```

### Release nuevo
Ver **[CONTRIBUTING.md](CONTRIBUTING.md)** (sección Release). Resumen:
1. Editar `package.json` → bump version (semver: feat=MINOR, fix=PATCH, breaking=MAJOR).
2. `npm install --package-lock-only`.
3. Agregar entrada al **inicio** de `CHANGELOG.md` con fecha ISO.
4. Commit `chore(release): bump X -> Y`.
5. Tag `vX.Y.Z` y push.
6. `npm run build:installer`.
7. `gh release create vX.Y.Z dist/VirtualDeck-Setup-X.Y.Z.exe`.

### Si algo se rompe en runtime
- Audio: console.error con prefix `[audio]` (DevTools del main process).
- Media SMTC: `media:diagnose` IPC devuelve estado paso por paso.
- Sensores: el botón "?" en el sidebar muestra el HTTP probe de LHM.
- PowerShell scripts: si `param()` no se reconoce, el prefix UTF-8 está mal ubicado — `injectUtf8Prefix` en `ps-helpers.ts`.
