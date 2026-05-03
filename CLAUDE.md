# VirtualDeck — Notas para Claude

Stream Deck alternativo para Windows. Electron + React + TypeScript + Vite.

## Stack
- **Electron 33** (main: `electron/main/index.ts`, preload: `electron/preload/index.ts`)
- **React 18 + Vite 5** (renderer en `src/`)
- **electron-vite** como builder, **electron-builder** para empaquetado
- **openrgb-sdk** para integración RGB

## Estructura clave
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
- `npm run build:win` — empaquetar Windows (actualmente solo `--dir`, no instalador)

## Convenciones
- Estilos inline con tema desde `src/utils/theme.tsx` (`useTheme()` → `VD`)
- Iconos: lucide-react via `src/components/VDIcon.tsx`, fuentes brand en `src/data/brandIcons.ts`
- Persistencia de config en `userData` (Electron) como JSON UTF-8
- Estilo: respuestas cortas y directas; preguntar si no se sabe; dar opciones cuando aplique

## Issues conocidos / contexto reciente
- PowerShell ejecutado desde `audio.ts` y `media.ts` no fuerza UTF-8 en stdout → nombres con tildes/ñ se corrompen (raíz del bug "?" en caracteres especiales).
- Botones configurables: el título se renderiza centrado debajo del icono (line ~350 de `ButtonCell.tsx`).
- Modo `audio-device` no debería usar el widget `now-playing`; verificar interpolación de label.
