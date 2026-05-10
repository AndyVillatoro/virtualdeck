# VirtualDeck — Notas para Claude

Stream Deck alternativo para Windows. Electron + React + TypeScript + Vite.

## 📚 Documentos relacionados (leer antes de empezar)

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Workflow de desarrollo: branches, commits, PRs, convenciones técnicas, notas para LLMs.
- **[RELEASE.md](RELEASE.md)** — Pasos exactos para sacar versión nueva (bump, CHANGELOG, tag, build, GitHub release).
- **[CHANGELOG.md](CHANGELOG.md)** — Historial cronológico de versiones (Keep a Changelog).
- **package.json** → campo `version`: source of truth de la versión actual.

**Antes de cualquier cambio**: corré `npx tsc --noEmit`. Cero errores antes y después.

## Stack
- **Electron 33** (main: `electron/main/index.ts`, preload: `electron/preload/index.ts`)
- **React 18 + Vite 5** (renderer en `src/`)
- **electron-vite** como builder, **electron-builder** para empaquetado
- **openrgb-sdk** para integración RGB

## Estructura clave
- `build/` — app icon (`icon.ico`, `icon.png`, `icon.svg`) generado por `scripts/generate-icon.js`
- `scripts/generate-icon.js` — renderiza icono dot-matrix SVG → PNG → ICO (requiere `sharp`)
- `src/screens/` — pantallas: `MainB`, `EditorB`, `FullscreenB`, `RGBManagerB`, `WallpaperB`
- `src/screens/editor/` — sub-módulos del editor: `actionData.ts` (datos puros), `MacroEditor.tsx`
- `src/components/ButtonCell.tsx` — celda de botón configurable (drag, long-press, multi-select)
- `src/utils/actions.ts` — ejecución de acciones (audio-device, app, url, webhook, tts, macro, etc.)
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
- `src/components/settings/` — componentes de settings extraídos de TitleBar: RGBSection, SensorsSection

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
- **Audio cache**: `audioIpc.ts` cachea la lista de dispositivos 30 s. Invalida automáticamente al cambiar dispositivo default. Pasar `force=true` para forzar refresco.
- **Multi-select**: Ctrl+clic en celdas para seleccionar múltiples botones. La barra de bulk-ops flota sobre la grilla. `selectedIds` se limpia al cambiar de página.
- **Shuffle/repeat SMTC**: usan `TryChangeShuffleActiveAsync` / `TryChangeAutoRepeatModeAsync` de Windows.Media.Control. Requieren que haya una sesión SMTC activa.
- **Macro**: grabación global via `uiohook-napi` (N-API — no requiere rebuild para Electron 33). Reproducción via un único script PowerShell generado dinámicamente (SendKeys + user32.dll mouse_event). El `.node` binario se desempaqueta fuera del asar (`asarUnpack` en package.json).
- **Accent presets**: `ACCENT_PRESETS` en `design.ts` — 10 colores predefinidos. El color libre via `<input type="color">` sigue disponible.
- **Tema claro/oscuro/sistema**: ya soportado desde `ThemeProvider` en `src/utils/theme.tsx`. Selector en TitleBar → ⚙ → TEMA.
- **PowerShell `param()`**: `runPS` (en `ps-helpers.ts`) detecta si el script empieza con `param(...)` y, en ese caso, inserta el prefix UTF-8 DESPUÉS del bloque param. PowerShell exige que `param()` sea la primera sentencia del script — meterle `chcp 65001` arriba lo rompe silenciosamente. Si modificás `runPS`, mantené ese parser.
- **Audio device switching**: `audio.ts` chequea HRESULT por cada `SetDefaultEndpoint` (3 roles: Console/Multimedia/Communications). Si `IPolicyConfig` falla con `E_NOINTERFACE`, prueba `IPolicyConfigVista` (IID `568b9108-44bf-40b4-9006-86afe5b5a620`). Después de setear, vuelve a consultar `GetDefaultAudioEndpoint` para verificar que el cambio se aplicó (algunos drivers aceptan la llamada sin aplicarla). Logs en `console.error` con prefix `[audio]`.

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
Ver **[RELEASE.md](RELEASE.md)**. Resumen:
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
