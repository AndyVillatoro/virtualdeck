# VirtualDeck — Notas para Claude

Stream Deck alternativo para Windows. Electron + React + TypeScript + Vite.

## Stack
- **Electron 33** (main: `electron/main/index.ts`, preload: `electron/preload/index.ts`)
- **React 18 + Vite 5** (renderer en `src/`)
- **electron-vite** como builder, **electron-builder** para empaquetado
- **openrgb-sdk** para integración RGB

## Estructura clave
- `build/` — app icon (`icon.ico`, `icon.png`, `icon.svg`) generado por `scripts/generate-icon.js`
- `scripts/generate-icon.js` — renderiza icono dot-matrix SVG → PNG → ICO (requiere `sharp`)
- `src/screens/` — pantallas: `MainB`, `EditorB`, `FullscreenB`, `RGBManagerB`, `WallpaperB`
- `src/components/ButtonCell.tsx` — celda de botón configurable (drag, long-press, render)
- `src/utils/actions.ts` — ejecución de acciones (audio-device, app, url, webhook, tts, etc.)
- `src/utils/nowPlaying.tsx` — hook que consulta media session via PowerShell
- `electron/main/audio.ts` — control de dispositivos de audio (PowerShell + C# IPolicyConfig)
- `electron/main/media.ts` — info de reproducción actual (PowerShell)
- `electron/main/rgb.ts` — control RGB vía OpenRGB SDK
- `electron/main/launcher.ts` — ejecutar apps/scripts
- `electron/main/index.ts` — bootstrap, IPC, persistencia config

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
