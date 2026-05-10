# Contribuyendo a VirtualDeck

Este documento explica el flujo de desarrollo y release. Está pensado para que cualquier persona (o agente LLM) pueda retomar el proyecto sin contexto previo y mantener el changelog y versionado correctamente.

---

## 📋 Resumen rápido

- **Stack**: Electron 33 + React 18 + TypeScript 5 + Vite 5
- **Plataforma target**: Windows 10/11 x64
- **Versionado**: [SemVer](https://semver.org/lang/es/)
- **Changelog**: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) (sin scope obligatorio)
- **Branch principal**: `main` (producción) — todo cambio entra vía PR

Antes de tocar código:
1. Leé `CLAUDE.md` (notas técnicas y arquitectura).
2. Mirá `CHANGELOG.md` para entender qué se hizo recientemente.
3. Este documento (`CONTRIBUTING.md`) explica el flujo de cambio.

---

## 🌳 Estructura del proyecto

```
virtualdeck/
├── electron/
│   ├── main/                  # Proceso principal Electron (Node)
│   │   ├── index.ts           # Bootstrap (~95 lns) — solo orquestación
│   │   ├── audio.ts           # COM IPolicyConfig para cambiar default device
│   │   ├── media.ts           # SMTC: nowPlaying, control, shuffle, repeat
│   │   ├── macro.ts           # uiohook-napi grabador + PS playback
│   │   ├── rgb.ts             # OpenRGB SDK
│   │   ├── launcher.ts        # apps/scripts/hotkeys/clipboard/etc.
│   │   ├── sensors.ts         # LibreHardwareMonitor HTTP polling
│   │   ├── weather.ts         # Open-Meteo
│   │   ├── ps-helpers.ts      # runPS — wrapper de PowerShell con UTF-8
│   │   ├── configManager.ts   # load/save/backup config JSON
│   │   ├── windowManager.ts   # BrowserWindow + bounds persistence
│   │   ├── trayManager.ts     # tray + global shortcuts
│   │   └── ipc/               # 10+ módulos: 1 archivo por dominio IPC
│   └── preload/index.ts       # contextBridge — API expuesta al renderer
├── src/                       # Renderer (React)
│   ├── App.tsx                # Root + estado global de config
│   ├── design.ts              # Tokens VD/VD_LIGHT, ACCENT_PRESETS
│   ├── types.ts               # Todos los tipos compartidos
│   ├── screens/               # MainB, EditorB, FullscreenB, RGBManagerB, WallpaperB
│   │   └── editor/            # actionData.ts, MacroEditor.tsx
│   ├── components/            # ButtonCell, TitleBar, etc.
│   │   └── settings/          # RGBSection, SensorsSection, settingHelpers
│   └── utils/                 # actions, theme, sound, sensors hook, etc.
├── scripts/
│   ├── dev.js                 # arranca electron-vite dev
│   └── generate-icon.js       # genera build/icon.{ico,png,svg}
├── resources/lhm/             # Bundle de LibreHardwareMonitor (gitignored, 19MB)
├── build/                     # Iconos generados (gitignored)
├── dist/                      # Output de electron-builder (gitignored)
├── out/                       # Output de electron-vite (gitignored)
├── package.json               # Versión, deps, config de electron-builder
├── CHANGELOG.md               # Historial cronológico de versiones
├── CLAUDE.md                  # Guía técnica del codebase (notas profundas)
└── CONTRIBUTING.md            # ← este archivo
```

---

## 🔄 Workflow de cambio (paso a paso)

### 1. Empezar trabajo nuevo

```bash
# Sincronizar con remoto
git checkout main
git pull origin main

# Crear rama con prefijo según tipo de cambio
git checkout -b feat/nombre-corto-de-la-feature
# o:
git checkout -b fix/descripcion-del-bug
# o:
git checkout -b chore/refactor-x
```

**Convención de prefijos**:

| Prefijo | Para qué |
|---|---|
| `feat/` | Feature nueva |
| `fix/` | Bug fix |
| `chore/` | Refactor, deps, build, sin cambio de comportamiento |
| `docs/` | Solo documentación |
| `perf/` | Mejora de performance sin cambio funcional |

### 2. Hacer cambios

Reglas básicas:
- **TypeScript estricto**: corré `npx tsc --noEmit` antes de commitear; cero errores.
- **Estilos**: inline con tokens de `useTheme()` desde `src/utils/theme.tsx`. No CSS files nuevos sin justificación.
- **Iconos**: `lucide-react` via `src/components/VDIcon.tsx`.
- **Persistencia**: cambios al schema de `DeckConfig` requieren migración en `src/utils/configMigration.ts` y bump de `CURRENT_CONFIG_VERSION`.
- **PowerShell**: si tu script usa `param(...)`, va al inicio (sin nada arriba). El parser de `ps-helpers.ts` se encarga del prefix UTF-8.

### 3. Probar

```bash
# Modo desarrollo (hot reload)
npm run dev

# Verificar que TypeScript compila
npx tsc --noEmit

# Build local de prueba (sin instalador)
npm run build

# Build completo del instalador (probarlo en máquina limpia)
npm run build:installer
```

### 4. Commitear

**Formato del mensaje de commit** ([Conventional Commits](https://www.conventionalcommits.org/)):

```
<tipo>(<scope opcional>): <descripción corta en imperativo>

<cuerpo opcional explicando el por qué>

<footer opcional con BREAKING CHANGE: o refs a issues>

Co-Authored-By: <si hubo asistente>
```

**Tipos válidos**:

| Tipo | Cuándo usar | Bump de versión |
|---|---|---|
| `feat` | Feature nueva visible al usuario | MINOR |
| `fix` | Bug fix visible al usuario | PATCH |
| `chore` | Refactor interno, deps, build | (sin bump si solo eso) |
| `docs` | Solo documentación | (sin bump) |
| `perf` | Mejora de performance | PATCH |
| `style` | Formato sin cambio de lógica | (sin bump) |
| `test` | Solo tests | (sin bump) |
| `BREAKING CHANGE:` en footer | Cambio incompatible | MAJOR |

**Ejemplos**:

```
feat: agregar acción macro con grabador y reproductor

Nuevo tipo de acción 'macro' que permite secuencias de teclas y clics.
- Grabador global via uiohook-napi (NAPI estable)
- Reproductor via PowerShell SendKeys + user32.dll mouse_event
- Editor con pasos editables: tecla, hotkey, texto, click, move, scroll, delay

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

```
fix(audio): chequear HRESULT + fallback IPolicyConfigVista

El cambio de dispositivo de audio fallaba silenciosamente porque el
codigo C# usaba [PreserveSig] pero ignoraba los HRESULT, y porque
algunas builds de Win10/11 requieren IPolicyConfigVista en lugar de
IPolicyConfig.
```

```
chore(release): bump 0.3.0 -> 0.4.0
```

**Reglas estrictas**:
- Mensaje en presente imperativo: "agregar X" no "agregado X" ni "agrega X".
- Línea 1 ≤ 72 caracteres.
- Cuerpo explicando **por qué**, no qué (el diff ya muestra el qué).
- Sin emojis en commits (sí en CHANGELOG si querés).
- Co-author si un asistente colaboró.

### 5. Push y crear PR

```bash
git push -u origin feat/nombre-corto-de-la-feature

# Con gh CLI:
gh pr create \
  --title "feat: agregar X" \
  --body "## Resumen\n...\n\n## Test plan\n- [ ] ..."

# O abrir la URL que GitHub te da al pushear
```

El body del PR debe tener:
1. **Resumen** (qué hace el PR)
2. **Cambios principales** (lista corta)
3. **Test plan** (checklist de cosas a verificar manualmente)
4. **Notas para el reviewer** (si las hay)

---

## 📦 Workflow de release (versionado)

Cada vez que haya un grupo de cambios listo para distribuir:

### Reglas de bump (SemVer pre-1.0)

Mientras esté en `0.x.y`:
- **MINOR** (`0.X.0`): cualquier feature nueva o breaking change menor.
- **PATCH** (`0.x.Y`): solo bug fixes y mejoras menores sin nueva funcionalidad.
- **MAJOR a 1.0.0**: cuando consideres que la app es "estable para distribución amplia".

Después de 1.0.0:
- **PATCH** (`1.x.Y`): bugfixes compatibles.
- **MINOR** (`1.X.0`): features nuevas compatibles.
- **MAJOR** (`X.0.0`): breaking changes (config schema, IPC API, etc.).

### Pasos para release nuevo

```bash
# Asumiendo estás en main, con todo mergeado
git checkout main
git pull origin main

# 1. Decidir el bump según los commits desde el último release:
#    git log v0.3.0..HEAD --oneline
#    Si hay 'feat:' → MINOR. Si solo 'fix:' → PATCH. Si 'BREAKING' → MAJOR.

# 2. Editar package.json — campo "version"
#    Ej: "version": "0.4.0"

# 3. Sincronizar package-lock.json
npm install --package-lock-only

# 4. Actualizar CHANGELOG.md (ver formato abajo)

# 5. Commit + tag
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): bump 0.3.0 -> 0.4.0"
git push

git tag -a v0.4.0 -m "VirtualDeck v0.4.0"
git push origin v0.4.0

# 6. Build del instalador (genera dist/VirtualDeck-Setup-0.4.0.exe)
npm run build:installer

# 7. Crear release en GitHub con el .exe adjunto
gh release create v0.4.0 \
  "dist/VirtualDeck-Setup-0.4.0.exe" \
  --title "VirtualDeck v0.4.0" \
  --notes-file <(sed -n '/## \[0.4.0\]/,/## \[/p' CHANGELOG.md | sed '$d')
# ↑ extrae solo la sección 0.4.0 del CHANGELOG como notas del release
```

---

## 📝 Formato del CHANGELOG.md

Sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) **estrictamente**.

### Estructura

```markdown
# Changelog

Todos los cambios notables...

## [Unreleased]

### Added
- Cambios pendientes que aún no salieron en release.

## [0.4.0] — 2026-06-15

### Added
- Feature nueva A.
- Feature nueva B.

### Changed
- Comportamiento existente modificado.

### Deprecated
- Cosas marcadas como obsoletas.

### Removed
- Features eliminadas.

### Fixed
- Bugs corregidos.

### Security
- Issues de seguridad parchados.

## [0.3.0] — 2026-05-10
...
```

### Reglas estrictas

1. **La versión más reciente va arriba**, debajo del header del archivo.
2. **Fecha en formato ISO**: `YYYY-MM-DD`.
3. **Versión entre corchetes**: `[0.4.0]`. Esto permite linkear con `[0.4.0]: https://github.com/.../tag/v0.4.0` al final si quieren.
4. **Categorías fijas** (en este orden cuando aplican): `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. No inventar nuevas. Una categoría adicional aceptada: `Internal` para refactors visibles solo para devs.
5. **Bullets descriptivos**, no genéricos. ❌ "fix bug" / ✅ "Fix audio device switching: chequea HRESULT + fallback IPolicyConfigVista".
6. **Linkear issues/PRs** cuando existan: `(#42)` al final de la entrada.
7. **Los emojis son opcionales** pero usalos solo para destacar items críticos: 🔥 = fix urgente, 🎉 = milestone.
8. **Mantener una sección `[Unreleased]`** opcional al tope para acumular cambios entre releases. Cuando hacés el release, renombrás `[Unreleased]` a `[X.Y.Z] — YYYY-MM-DD` y creás una nueva `[Unreleased]` vacía.

### Ejemplo completo de entry

```markdown
## [0.4.0] — 2026-06-15

### Added
- Soporte para macros con condicionales (#23).
- Widget de calendario en el sidebar.

### Fixed
- 🔥 Cambio de dispositivo de audio en Win11 24H2 (#31). El driver
  Realtek devolvía S_OK pero no aplicaba el cambio; ahora se verifica
  con `GetDefaultAudioEndpoint` post-set.

### Internal
- Migración de Vite 5 → Vite 6 (#28).
```

---

## 🛠 Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Modo desarrollo con hot reload (renderer) y restart automático (main) |
| `npm run build` | Compila renderer + main + preload a `out/` |
| `npm run build:win` | Empaqueta como `.exe` sin instalador (`dist/win-unpacked/`) |
| `npm run build:icon` | Regenera `build/icon.{ico,png,svg}` desde `scripts/generate-icon.js` |
| `npm run build:installer` | Build completo + NSIS installer en `dist/VirtualDeck-Setup-{version}.exe` |
| `npx tsc --noEmit` | TypeScript check sin generar archivos (rápido, ideal pre-commit) |

---

## 🔐 Convenciones técnicas críticas

### PowerShell + UTF-8
- `runPS()` (de `ps-helpers.ts`) prepende setup UTF-8 (`chcp 65001`).
- Si tu script usa `param(...)`, debe ser la primera sentencia. El parser detecta esto y mete el prefix después del `param()`.
- **Nunca** interpoles user input en el script body — usá `opts.args` y `param(...)`.
- **No usar BOM** en los `.ps1` que escribimos a tmp — rompe el parsing.

### COM Audio (IPolicyConfig)
- IID correcto de `IPolicyConfig` (Win 7+): `F8679F50-850A-41CF-9C72-430F290290C8`.
- IID de `IPolicyConfigVista` (fallback Win10/11): `568b9108-44bf-40b4-9006-86afe5b5a620`.
- CLSID de la coclass: `870AF99C-171D-4F9E-AF0D-E63DF40C2BC9`.
- Como `[PreserveSig]` está activo, los errores vuelven como `int` (HRESULT). **Siempre chequear**, nunca asumir éxito.
- Después de `SetDefaultEndpoint`, verificar con `GetDefaultAudioEndpoint` que el cambio se aplicó (algunos drivers aceptan sin aplicar).

### Persistencia de config
- `~/AppData/Roaming/virtualdeck/config.json` (Windows) — Electron `userData`.
- Backups rotativos en `~/AppData/Roaming/virtualdeck/backups/` (max 5, cooldown 5 min).
- Schema versionado en `DeckConfig.configVersion`. Cualquier cambio de schema requiere:
  1. Bump de `CURRENT_CONFIG_VERSION` en `src/utils/configMigration.ts`.
  2. Función de migración en `migrateConfig()`.
  3. Entry en `CHANGELOG.md` bajo `Changed` o `BREAKING CHANGE`.

### Native modules
- `uiohook-napi` para grabar macros — usa N-API estable, no requiere rebuild para Electron 33.
- `package.json` → `build.asarUnpack` debe incluir `node_modules/uiohook-napi/**` para que el `.node` quede fuera del asar.
- Si agregás otro native module, asegurate de:
  1. Agregarlo a `asarUnpack`.
  2. Verificar que tiene prebuilds para Electron 33 / Node 20+ N-API o agregar `electron-rebuild`.

---

## 🤖 Notas para agentes LLM

Si sos un agente AI retomando este proyecto, este es el contexto mínimo que necesitás:

1. **Lee primero**: `CLAUDE.md` (arquitectura), `CHANGELOG.md` (qué cambió recientemente), este `CONTRIBUTING.md` (cómo trabajar).
2. **Antes de cualquier cambio**: corré `npx tsc --noEmit` para confirmar que el árbol está limpio. Si no, hay trabajo previo sin terminar — preguntá al usuario antes de seguir.
3. **Antes de commitear**: confirmá que `npx tsc --noEmit` sigue pasando sin errores.
4. **Antes de release**:
   - Mirá `git log $(git describe --tags --abbrev=0)..HEAD --oneline` para ver commits desde el último tag.
   - Decidí el bump según los tipos de commit (feat → MINOR, fix → PATCH, BREAKING → MAJOR).
   - Actualizá `CHANGELOG.md` con una entrada nueva en el formato exacto descrito arriba.
   - Bumpea `package.json`, regenerá `package-lock.json`.
5. **Nunca**:
   - Commitees sin que TypeScript pase.
   - Bumpeés versión sin actualizar CHANGELOG.
   - Mezcles features + fixes + chore en un solo commit (separá por tipo).
   - Pushees `--force` a `main` o ramas que tengan PR abierto.
   - Saltees hooks (`--no-verify`) salvo que el usuario lo pida explícitamente.
6. **Para preguntas sobre el codebase**: usá `Grep`/`Glob`/`Read`. No asumas el shape de los datos — verificá en `src/types.ts`.
7. **Si el usuario pide algo ambiguo**: preguntá antes de implementar. Mejor 1 pregunta de aclaración que 30 minutos de trabajo en la dirección equivocada.
8. **Comandos pre-instalados que podés usar**:
   - `gh` (GitHub CLI): puede estar en `/c/Program Files/GitHub CLI/gh.exe` si no está en PATH. Auth ya está hecha.
   - `git`, `npm`, `npx`, `node`.
   - PowerShell vía Node child_process (no usar Bash de WSL para llamar PS).

---

## 🔗 Referencias

- [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
- [Semantic Versioning](https://semver.org/lang/es/)
- [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)
- [GitHub CLI](https://cli.github.com/manual/)
- [Electron docs](https://www.electronjs.org/docs/latest)
- [electron-builder](https://www.electron.build/)
