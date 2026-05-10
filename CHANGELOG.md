# Changelog

Todos los cambios notables de VirtualDeck se documentan acá.
Sigue el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto adhiere a [SemVer](https://semver.org/lang/es/).

## [0.3.0] — 2026-05-10

### Added
- **Multi-select de botones**: Ctrl+clic para seleccionar varios botones; barra flotante con acciones bulk: mover/copiar a otra página, limpiar selección.
- **Macros de teclado y ratón**: nuevo tipo de acción `macro` con grabador global (`uiohook-napi`) y editor manual de pasos (tecla, hotkey, texto, click, move, scroll, delay). Reproductor via PowerShell (`SendKeys` + `user32.dll mouse_event`).
- **Media SMTC extendido**: nuevas acciones `media-shuffle` y `media-repeat` que invocan `TryChangeShuffleActiveAsync` / `TryChangeAutoRepeatModeAsync` del SMTC nativo de Windows.
- **Paleta de colores de acento**: 5 → 10 colores predefinidos (azul, verde, amarillo, violeta, rojo, teal, rosa, naranja, lima, índigo). El selector de color libre sigue disponible.
- **Audio device cache**: lista de dispositivos cacheada 30s en main process; invalida automáticamente al cambiar default. Reduce el spawn de PowerShell por tick de polling.
- **Botón "Reintentar" en editor de audio**: si la lista de dispositivos falla al cargar, ahora se muestra error visible con opción de reintento (antes era falla silenciosa).

### Fixed
- **🔥 Cambio de dispositivo de audio**: bug crítico que impedía que el botón aplicara el cambio.
  - `ps-helpers.ts`: `param()` debe ser la primera sentencia en PowerShell. El prefix UTF-8 (3 líneas) lo empujaba a la línea 4 → PS rechazaba el `param()` → `$Id` llegaba vacío al C#. Fix: parser que detecta `param(...)` (con whitespace y comentarios) y mete el prefix UTF-8 después.
  - `audio.ts`: el código C# usaba `[PreserveSig]` pero ignoraba los HRESULT → siempre devolvía "OK" aunque la API fallara silenciosamente. Fix: chequeo HRESULT de cada `SetDefaultEndpoint` (Console/Multimedia/Communications), fallback a `IPolicyConfigVista` (IID `568b9108-...`) para builds Win10/11 con `E_NOINTERFACE`, y verificación post-set con `GetDefaultAudioEndpoint` para detectar drivers que aceptan la llamada sin aplicar el cambio.
  - Logs en `console.error` con prefix `[audio]` para diagnóstico.

### Changed
- **Refactor SRP de `electron/main/index.ts`**: 675 → ~95 líneas. Split en módulos cohesivos:
  - `configManager.ts` (load/save/backup)
  - `windowManager.ts` (creación de BrowserWindow + persistencia de bounds)
  - `trayManager.ts` (tray icon + global shortcuts + tray menu)
  - `electron/main/ipc/` (10 módulos por dominio: audio, media, macro, config, window, app, page, dialog, launcher, rgb, sensors)
- **Refactor SRP de `TitleBar.tsx`**: 748 → 430 líneas. `RGBSection` y `SensorsSection` extraídas a `src/components/settings/`.
- **Refactor SRP de `EditorB.tsx`**: arrays de datos (ACTION_TYPES, PRESETS, FOLDER_PRESETS, PRESET_CATEGORIES) movidos a `src/screens/editor/actionData.ts`.
- **Installer limpio**: `App.tsx` `PAGES_DEFAULT` reducido a 1 página vacía "Main" para que la app abra como instalación virgen sin presets precargados.
- **`.gitignore`**: excluye `resources/lhm/` (19MB de binarios bundleados de LibreHardwareMonitor).
- **`package.json`**: agrega `asarUnpack` para `node_modules/uiohook-napi/**` (binario nativo no puede ir dentro del asar).

### Internal
- Nueva dependencia: `uiohook-napi@^1.5.5` (NAPI estable, no requiere rebuild para Electron 33).
- `ButtonCell.tsx`: añadidos props `isSelected` y `onSelect` con check verde overlay; comparator de memo actualizado.
- `MainB.tsx`: estado `selectedIds: Set<string>`; se limpia al cambiar de página.

---

## [0.2.0] — 2026-04-30

### Added
- Registro automático de URL ACL para LibreHardwareMonitor (1 sola UAC).
- UI scale, temas claro/oscuro/sistema, widget buttons (clock/weather/now-playing/sensor), visibilidad condicional, swipe entre páginas, page export/import, timer triggers, execution feedback.
- Window snap, RGB presets, radio groups, soporte touch screen.

### Fixed
- Fullscreen: respeta `gridRows` correctamente.
- Toggle de widget de sensores funciona en sidebar y FullscreenB.
- Audio device fallback cuando COM call falla.
