# VirtualDeck — Guía de desarrollo

Notas para contribuir o entender la arquitectura. La fuente de verdad del estilo visual es `.interface-design/system.md`.

---

## Stack

- **Electron 31** + **React 18** + **TypeScript**.
- Build: `electron-vite` (renderer y main comparten un único pipeline Vite).
- Empaquetado: `electron-builder --win --dir`.
- Estilo: tokens en `src/design.ts` (`VD.*`).
- Sin dependencias nativas (`node-gyp`) — todo Windows interop pasa por PowerShell on-demand.

## Estructura

```
electron/main/      Proceso principal (config, IPC, hotkeys, tray, audio, media, launcher)
electron/preload/   Bridge contextIsolated; expone `window.electronAPI`
src/                Renderer (React)
  App.tsx           Estado global del deck, undo, triggers externos
  screens/          Vistas (MainB, FullscreenB, EditorB, WallpaperB)
  components/       Reutilizables (ButtonCell, DotText, TitleBar, ...)
  utils/            actions, configMigration, sound, nowPlaying provider
  data/             brandIcons (catálogo)
  design.ts         Tokens VD + glifos GLYPHS_5x7
.interface-design/  system.md — fuente de verdad de diseño
docs/legacy/        Material de referencia (HTML de iconos, scripts viejos)
```

## Comandos

```
npm run dev        # electron-vite dev — hot reload
npm run build      # build production
npm run build:win  # empaqueta para Windows en out/ (--dir)
npx tsc --noEmit   # typecheck completo
```

## Convenciones de diseño

Lee `.interface-design/system.md` antes de escribir UI nueva. En resumen:

- Todo color trazable a `VD.*`. Nada de hex sueltos.
- `borderRadius` en escala `VD.radius.{sm,md,lg}` (máx 4px).
- Sombras solo `VD.shadow.menu` y `VD.shadow.modal`.
- Spacing en múltiplos de 4 (escala `VD.space`).
- Etiquetas de sección en `DotLabel`. Datos numéricos en `VD.mono`.
- Nada de `#fff` ni `#000` — usa `VD.text` y rgba sobre fondos.

## Schema del config

Definido en `src/types.ts`. El campo `configVersion` rige las migraciones — cualquier cambio de shape requiere:

1. Bump `CURRENT_CONFIG_VERSION` en `src/utils/configMigration.ts`.
2. Añadir un paso a `MIGRATIONS` (`{ from, to, apply }`).
3. Si el cambio invalida configs anteriores, validador (`validateConfig`) debe rechazarlos con un mensaje claro.

## Acciones

Cada `ButtonAction.type` se ejecuta en `src/utils/actions.ts:executeAction`. Para añadir una nueva:

1. Agrega el literal a `ActionType` en `types.ts`.
2. Agrega los campos opcionales que necesites en `ButtonAction`.
3. Añade el case en `executeAction` y devuelve `ActionResult` con `ok: true/false` y `error?` legible.
4. Registra el tipo en `ACTION_TYPES` de `EditorB.tsx` (label/icono/desc).
5. Añade el bloque de inputs en el paso CONFIGURAR de `EditorB.tsx`.
6. Añade el literal a `ACTION_TYPES` (Set) en `configMigration.ts:ACTION_TYPES`.

Ver `docs/acciones.md` para el catálogo actual.

## IPC

Los handlers viven en `electron/main/index.ts:registerIPC`. El bridge a renderer está en `electron/preload/index.ts`. Añadir un canal nuevo requiere actualizar:

1. Handler en `registerIPC` (lado main).
2. Wrapper en preload con tipos.
3. Tipo en `ElectronAPI` (`src/types.ts`).

## Disparadores externos

`button.globalHotkey` y `button.inTrayMenu` se aplican en `applyTriggerableConfig` (`electron/main/index.ts`) en cada `config:save`. El click externo dispara `button:trigger` IPC, que el renderer escucha en `App.tsx` y reenvía a `runActionSequence`.

## Polling de medios

Centralizado en `src/utils/nowPlaying.tsx` (provider montado en `App.tsx`). Ningún componente debe usar `api.media.nowPlaying` directamente — usa `useNowPlaying()`.

## Cosas a NO hacer

- No reintroducir polling pesado de sistema (`systeminformation`, polling < 5s).
- No agregar dependencias nativas (`node-gyp`).
- No multiplicar la paleta — agregar tokens, no hex sueltos.
- No romper la firma dot-matrix (5×7 en `GLYPHS_5x7` + `DotText`).
