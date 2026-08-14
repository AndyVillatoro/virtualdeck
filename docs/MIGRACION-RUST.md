# Migración a Rust nativo — Plan maestro

> **Documento vivo.** Es la fuente de verdad de la migración. Si retomás el proyecto
> (vos u otro LLM/editor) después de meses, **leé este archivo primero** y luego
> [CLAUDE.md](../CLAUDE.md) y [ARQUITECTURA.md](ARQUITECTURA.md).
>
> Estado: **Fase 0 — preparación**. Rama: `rewrite/rust`. Última actualización: 2026-08-14.

---

## 1. Por qué migrar

VirtualDeck 0.5.1 funciona, pero su arquitectura tiene un costo estructural:

| Problema hoy | Causa raíz |
|---|---|
| Instalador de ~90 MB, ~200 MB de RAM en reposo | Runtime de Electron + Chromium + Node |
| Latencia de 150–400 ms en cada operación de audio/media | Cada llamada **spawnea un `powershell.exe`** nuevo |
| Los bugs más caros del proyecto (audio silencioso, SMTC nulo, `param()` roto) | Toda la capa nativa pasa por **PowerShell + C# embebido en strings** |
| Cachés artificiales (audio 30 s, media 4 s, sensores 1.5 s) | Existen solo para **esconder la latencia de PowerShell** |
| Bugs de encoding con tildes/ñ | `chcp 65001` + parser de `param()` hecho a mano |

En Rust nativo, **toda esa capa desaparece**: COM y WinRT se llaman en proceso, con
tipos verificados en compilación, en microsegundos en vez de cientos de milisegundos.

### Qué se elimina por completo

- ✂️ **PowerShell** — 100% de los scripts (`ps-helpers.ts` y sus 12 consumidores)
- ✂️ **Node.js + Electron + Chromium** — no hay runtime embebido
- ✂️ **WebView** — y con él: el hack `disableHardwareAcceleration()` (monitores virtuales),
  el "DPI nudge" de ±1px, y el protocolo custom `vd://` para imágenes
- ✂️ **Encoder PNG hecho a mano** para el ícono de bandeja (`trayManager.makeTrayIcon`)
- ✂️ **`uiohook-napi`** (módulo nativo N-API) y **`electron-updater`**

**Objetivo medible**: instalador < 20 MB, RAM en reposo < 60 MB, latencia de acciones < 10 ms.

---

## 2. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| **Alcance** | Rust nativo total (backend **y** UI) | Decisión del usuario. Elimina WebView por completo. |
| **Framework UI** | **egui + winit directo** (no `eframe`) | La estética dot-matrix son rectángulos dibujados → el `Painter` de egui es ideal. Modo inmediato hace triviales drag&drop, multi-select y menús contextuales. **winit directo** porque `eframe` no permite integrar bien `tray-icon` + `global-hotkey` (necesitan control del event loop) y VirtualDeck vive en la bandeja. Licencia MIT/Apache, sin condiciones. |
| **Repo** | Rama larga `rewrite/rust` en el mismo repo | Conserva historial, issues, releases y continuidad del auto-updater. `main` sigue recibiendo hotfixes 0.5.x hasta que la rama alcance paridad → sale como **v1.0.0**. |
| **Features** | Paridad + limpiar deuda técnica | Portar lo que existe, aprovechando para eliminar código muerto y rarezas. **Nada de features nuevas hasta alcanzar paridad.** |
| **Secuencia** | Core primero, UI después | El core no depende de la UI → se valida con tests + CLI antes de dibujar un píxel. Aísla el riesgo técnico real (COM/WinRT/hooks) al principio. |

### Alternativas descartadas

- **Tauri** (backend Rust + UI React): más rápido (3-5 semanas) y conserva los 14k LOC de UI,
  pero mantiene el WebView. Descartado por decisión explícita del usuario.
- **Slint**: licencia royalty-free válida para apps propietarias *con atribución visible*,
  DSL declarativo más cercano a React. Descartado: el render píxel-art custom es más incómodo
  y suma un DSL nuevo que aprender.
- **iced**: arquitectura Elm limpia, pero documentación con huecos y más ceremonia para
  dibujo custom e integración de tray/hotkeys.

---

## 3. Arquitectura destino

Workspace Cargo con separación estricta core/UI. **El core no conoce la UI.**

```
virtualdeck/
├── Cargo.toml                    # workspace
├── crates/
│   ├── vd-core/                  # ── FASE 1 — sin dependencias de UI ──
│   │   ├── src/
│   │   │   ├── lib.rs
│   │   │   ├── config/           # DeckConfig, migraciones v1→v4, backups
│   │   │   ├── audio/            # IPolicyConfig / IMMDeviceEnumerator (COM)
│   │   │   ├── media/            # SMTC (WinRT) + fallback por títulos de ventana
│   │   │   ├── macro/            # grabación (hooks) + reproducción (SendInput)
│   │   │   ├── rgb/              # cliente OpenRGB (TCP)
│   │   │   ├── sensors/          # LHM vía HTTP
│   │   │   ├── launcher/         # apps, scripts, hotkeys, brillo, volumen, snap
│   │   │   ├── weather/          # geo-IP + Open-Meteo
│   │   │   ├── actions/          # motor de ejecución (runActionSequence, branch, interpolate)
│   │   │   └── log/              # log rotativo
│   │   └── tests/                # tests de integración por módulo
│   ├── vd-cli/                   # ── FASE 1 — binario de validación ──
│   │   └── src/main.rs           # `vd-cli audio list`, `vd-cli media now`, etc.
│   └── vd-app/                   # ── FASE 2 — UI egui + winit ──
│       ├── src/
│       │   ├── main.rs           # event loop winit + tray + hotkeys globales
│       │   ├── ui/               # screens: deck, editor, rgb, fullscreen, wallpaper
│       │   ├── widgets/          # ButtonCell, DotText, Glyph57, BrandIcon
│       │   ├── theme.rs          # tokens VD (port de design.ts)
│       │   └── i18n/             # ES/EN (port de i18n.tsx)
│       └── assets/               # iconos, fuentes
├── docs/                         # se conserva
└── electron/  src/               # ⚠️ se eliminan al alcanzar paridad
```

### Mapa de equivalencias

| Hoy (Electron/TS) | Destino (Rust) |
|---|---|
| PowerShell + C# `IPolicyConfig` | `windows` crate + [`com-policy-config`](https://crates.io/crates/com-policy-config) |
| PowerShell + WinRT reflection (SMTC) | `windows::Media::Control` (nativo, `.get()` en vez del hack `AsTask`) |
| `uiohook-napi` (grabar macros) | [`rdev`](https://crates.io/crates/rdev) (`listen`) o `SetWindowsHookEx` directo |
| PowerShell `SendKeys` + `mouse_event` | `rdev::simulate` / `enigo` / `SendInput` nativo |
| `openrgb-sdk` (npm) | [`openrgb2`](https://crates.io/crates/openrgb2) (protocolo v4/v5) |
| `fetch` → LHM `data.json` | `reqwest` + `serde_json` |
| Electron `Tray` + `Menu` | [`tray-icon`](https://crates.io/crates/tray-icon) (equipo Tauri) |
| Electron `globalShortcut` | [`global-hotkey`](https://crates.io/crates/global-hotkey) (equipo Tauri) |
| Electron `dialog` | [`rfd`](https://crates.io/crates/rfd) (Rusty File Dialogs) |
| Electron `Notification` | `notify-rust` o `windows::UI::Notifications` |
| `electron-updater` | [`self_update`](https://crates.io/crates/self_update) contra GitHub Releases |
| `BrowserWindow` frameless | `winit` con `with_decorations(false)` |
| Protocolo `vd://` para imágenes | ❌ innecesario — se leen del disco directo |
| React + inline styles | egui (modo inmediato) + `theme.rs` |
| `i18n.tsx` | `vd-app/src/i18n/` (mismo esquema de claves) |

---

## 4. Fases

Cada fase termina en un entregable verificable. **No se avanza sin la anterior verde.**

### Fase 0 — Preparación (prerrequisito del usuario)

- [x] Instalar **Rust** (`rustup`) → ✅ **rustc/cargo 1.97.1**, toolchain
      `stable-x86_64-pc-windows-msvc`, en `C:\Users\andyf\.cargo\bin`
- [ ] 🔴 Instalar **Visual Studio Build Tools** con el workload "Desarrollo para escritorio con C++"
      — **es lo único que falta**. Provee el `link.exe` de MSVC que exige el target
      `x86_64-pc-windows-msvc`. Sin él **no compila absolutamente nada**: hasta los build
      scripts de `serde`/`thiserror` necesitan linkear.
      ```
      winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
      ```
- [ ] ⚠️ **Cuidado**: `C:\Program Files\Git\usr\bin\link.exe` puede tapar al `link.exe` de MSVC
      en el PATH y romper el build. Si `cargo build` falla con errores de linker, asegurate de
      que el de MSVC aparezca primero (o usá la "Developer Command Prompt for VS").
- [ ] Verificar de punta a punta: `cargo check --workspace`, `cargo clippy --workspace
      --all-targets -- -D warnings` y `cargo test --workspace` en verde.

> **Nota sobre el PATH**: si instalás algo mientras hay una terminal abierta, esa terminal
> no ve el PATH nuevo. Rust quedó invisible por eso hasta que se agregó
> `%USERPROFILE%\.cargo\bin` manualmente. Abrí una terminal nueva después de instalar.

### Fase 1 — `vd-core` (el corazón, ~4-6 semanas)

Orden deliberado: **primero lo más riesgoso**, para que un fracaso aparezca temprano.

| # | Módulo | Por qué en esta posición | Verificación |
|---|---|---|---|
| 1.1 | **Scaffold** workspace + CI | Base | `cargo build` y `cargo test` verdes |
| 1.2 | **`config`** | Todo lo demás lo consume | Tests: carga los `deck-config.json` reales de v0.5.1 y migra v1→v4 sin pérdida |
| 1.3 | **`audio`** | 🔴 **Máximo riesgo** — COM `IPolicyConfig` no documentado | `vd-cli audio list` / `set <id>` cambia el dispositivo real |
| 1.4 | **`media`** | 🔴 Alto riesgo — WinRT async | `vd-cli media now` muestra la canción y la carátula |
| 1.5 | **`macro`** | 🟡 Hooks globales | Grabar y reproducir una macro idéntica a la de v0.5.1 |
| 1.6 | **`launcher`** | 🟡 user32 + WMI | Apps, hotkeys, brillo, volumen, snap, procesos |
| 1.7 | **`rgb`** | 🟡 Protocolo binario | Conecta a OpenRGB y aplica color/modo/perfil |
| 1.8 | **`sensors`** | 🟢 HTTP simple | Lee LHM y devuelve la lista |
| 1.9 | **`weather`** + **`log`** | 🟢 Trivial | — |
| 1.10 | **`actions`** | Motor que orquesta todo | Tests de `interpolate`, `branch`, secuencias, toggle |

**Entregable de fase**: `vd-cli` puede ejecutar **cualquier acción** del `deck-config.json`
real sin abrir una sola ventana. Ese es el criterio de "el core está listo".

### Fase 2 — `vd-app` UI nativa (~6-10 semanas)

| # | Componente | Notas |
|---|---|---|
| 2.1 | Event loop `winit` + ventana frameless + bandeja + hotkeys globales | Valida la integración que descartó `eframe` |
| 2.2 | `theme.rs` + primitivas dot-matrix (`DotText`, `Glyph57`, `BrandIcon`) | La firma visual; el `Painter` de egui |
| 2.3 | Pantalla **Deck** (grilla, drag&drop, multi-select, menú contextual, long-press) | El grueso del uso diario |
| 2.4 | **Editor** de botones | El más grande (2.007 LOC hoy) — dividir en sub-módulos desde el inicio |
| 2.5 | **Fullscreen** / kiosko | |
| 2.6 | **RGB Manager** | 819 LOC hoy |
| 2.7 | **Wallpaper**, ajustes, Ayuda/Acerca de, onboarding, hints | |
| 2.8 | **i18n** ES/EN | Portar claves existentes tal cual |

### Fase 3 — Paridad, empaquetado y v1.0.0

- [ ] Checklist de paridad funcional contra v0.5.1 (una fila por acción y pantalla)
- [ ] Instalador (WiX/MSI o NSIS) + auto-update contra GitHub Releases
- [ ] Migración de config: la v1.0 debe leer el `deck-config.json` de un usuario 0.5.x **sin tocar nada**
- [ ] Eliminar `electron/`, `src/`, `package.json` y dependencias de Node
- [ ] Actualizar CLAUDE.md, ARQUITECTURA.md, CONTRIBUTING.md, RELEASE.md
- [ ] Merge a `main` → **v1.0.0**

---

## 5. Superficie a portar

**74 comandos IPC + 4 eventos fire-and-forget + 3 push events.** Detalle por módulo:

| Módulo | Comandos | Push events |
|---|---|---|
| `config` | 7 (incluye `weather:get`) | — |
| `audio` | 2 | — |
| `media` | 5 | — |
| `launcher` | 14 | — |
| `dialog` | 4 | — |
| `app` | 6 | — |
| `page` | 2 | — |
| `rgb` | 15 | `rgb:devicesChanged` |
| `sensors` | 9 | — |
| `macro` | 4 | — |
| `log` | 4 | — |
| `update` | 2 | `update:status` |
| `window` | 4 (`.on`) | `button:trigger` |

En Rust nativo **no hay IPC**: estos comandos se vuelven funciones públicas de `vd-core`,
y los push events se vuelven canales (`crossbeam` / `tokio::sync::broadcast`) que la UI
consume en su loop.

---

## 6. Riesgos y mitigaciones

Ordenados por severidad. Los números entre paréntesis son del inventario del backend.

### 🔴 Críticos

1. **`IPolicyConfig` es una interfaz COM no documentada** (3).
   El orden de la vtable debe coincidir byte a byte. El código actual carga **dos**
   definiciones (`IPolicyConfig` + `IPolicyConfigVista`) porque confundir el IID con el
   CLSID causaba `E_NOINTERFACE`, y **verifica** que el cambio se aplicó porque algunos
   drivers devuelven `S_OK` sin aplicarlo.
   → *Mitigación*: usar `com-policy-config` (ya resuelto por terceros) pero **conservar la
   verificación post-set y el fallback a Vista**. Portar los IIDs desde `audio.ts` tal cual.
   Es el ítem 1.3 de la Fase 1 precisamente para descubrir problemas temprano.

2. **Calidad de entrada de texto en egui** (riesgo nuevo, no está en el inventario).
   El editor tiene decenas de campos de texto y la app es en español (tildes, ñ, IME).
   egui es más débil que un WebView acá.
   → *Mitigación*: **spike obligatorio en Fase 2.1** — probar acentos, ñ, portapapeles,
   selección y undo en un `TextEdit` antes de portar el editor. Si falla, evaluar Slint
   solo para el editor o widgets custom.

3. **Volumen de trabajo**: ~17k LOC, 3-6 meses en solitario.
   → *Mitigación*: la separación core/UI permite **parar en cualquier fase** con algo útil;
   `main` sigue vivo en 0.5.x mientras tanto.

### 🟡 Medios

4. **WinRT async en SMTC** (4). En Rust es `.get()` — el hack de reflexión de PS desaparece.
   *El riesgo se reduce, no aumenta.*
5. **Hack de robo de foco** (5): `win.blur()` + 80 ms antes de `SendKeys` para que la tecla
   llegue a la app anterior. Hay que reproducirlo con `winit` (probablemente
   `set_focus`/`ShowWindow` + delay equivalente).
6. **UAC** (7): `spawnLHM(elevated)` y `registerUrlAcl` lanzan `Start-Process -Verb RunAs`.
   En Rust: `ShellExecuteW` con verbo `runas`. Conservar el caso especial **exit code 1223
   = usuario canceló**.
7. **Esperas por sleep** (8): LHM 2000/3500 ms, OpenRGB 1200 ms, update 8000 ms.
   → Oportunidad de limpieza: reemplazar por *polling con backoff* real.
8. **Rarezas de OpenRGB** (16): `speedMin` es el **más rápido** (valor invertido),
   ramas por `colorMode`, cadena Direct→Static→Custom, `deviceId < 0` = todos.
   → Portar con tests; es fácil romperlo en silencio.
9. **Scraping de títulos de ventana** (6): regex multi-idioma para Spotify/YouTube/VLC,
   normaliza NBSP/ZWSP. → **Portar literal**, con tests de las cadenas conocidas.
   Usar variantes `W` de user32 para no reintroducir bugs de encoding.

### 🟢 Bajos / desaparecen solos

10. `disableHardwareAcceleration` (10), DPI nudge (11), protocolo `vd://` (13),
    encoder PNG del tray (9), truco `Function('m', …)` del updater (14)
    → **todos innecesarios sin Chromium.**
11. `config:save` tiene efectos colaterales (20): re-registra hotkeys, reconstruye el tray
    y reconfigura sensores. → En Rust, modelarlo explícito (evento `ConfigChanged`) en vez
    de escondido dentro del setter.

### Decisión pendiente: LibreHardwareMonitor

Hoy se empaqueta LHM (~19 MB, .NET) como binario externo y se habla con él por HTTP.
Con un instalador objetivo de < 20 MB, **LHM solo pesa más que toda la app nueva**.

Opciones para evaluar en Fase 1.8:
- **A)** Seguir empaquetándolo (paridad garantizada, +19 MB, sigue necesitando UAC)
- **B)** Leer sensores nativamente en Rust (`sysinfo` + WMI/LibreHardwareMonitorLib vía FFI) —
  menos peso y sin UAC, pero **menos sensores** (temperaturas de CPU/GPU requieren driver kernel)
- **C)** Híbrido: nativo por defecto, LHM opcional como descarga aparte para sensores avanzados

*Recomendación preliminar*: **C**, alineado con cómo ya se trata OpenRGB (descarga aparte).

---

## 7. Convenciones del código Rust

- **Edición 2021**, `rustfmt` por defecto, `clippy` sin warnings (`-D warnings` en CI).
- `vd-core` **no depende de egui/winit** — se compila y testea sin UI.
- Errores con `thiserror` en el core y `anyhow` en los binarios.
- Nada de `unwrap()` en rutas de producción; todo lo que sea COM va en módulos
  `unsafe` acotados y documentados.
- Todo COM/WinRT se encapsula tras una API segura y `Send`-safe.
- El texto de UI **nunca** se escribe literal: siempre clave i18n (mismo esquema que hoy).
- Comentarios en español, como el resto del proyecto.

---

## 8. Verificación

**Por módulo (Fase 1)**: cada módulo entra con tests. `vd-cli` ejerce el módulo contra
hardware real (audio cambia de verdad, la macro se reproduce de verdad).

**De paridad (Fase 3)**: checklist con una fila por cada acción de `ActionType` y por
cada pantalla, verificada lado a lado contra un VirtualDeck 0.5.1 instalado.

**De regresión de config**: tomar un `deck-config.json` real de 0.5.x, abrirlo con v1.0
y confirmar que se ve y se comporta idéntico. Es el contrato con los usuarios existentes.

---

## 9. Estado actual

| Fase | Estado |
|---|---|
| 0 — Preparación (toolchain) | ✅ **Completa** — Rust 1.97.1 + MSVC Build Tools 14.44 |
| 1.1 — Scaffold workspace | ✅ Completa |
| 1.2 — `config` | ✅ **Completa** — modelo, migraciones v1→v4, backups |
| 1.3 — `audio` | ✅ **Completa** — COM nativo, verificado cambiando el dispositivo real |
| 1.4 — `media` | ✅ **Completa** — SMTC nativo, verificado leyendo y controlando reproducción real |
| 1.5 — `macro` | 🔜 **Siguiente** |
| 1.6 `launcher` … 1.10 `actions` | ⬜ No iniciadas |
| 2 — `vd-app` (UI) | ⬜ No iniciada |
| 3 — Paridad + v1.0.0 | ⬜ No iniciada |

### Lo verificado hasta ahora

- `cargo check` / `clippy -D warnings` / `cargo fmt --check` / `cargo test`: **todo en verde**.
- **30 tests**, incluido el que más importa:
  `crates/vd-core/tests/round_trip_config_real.rs` carga el `deck-config.json`
  **real** de la máquina, lo migra, lo vuelve a serializar y verifica campo por
  campo que no se perdió nada. Es el contrato con los usuarios de 0.5.x.
  Si no hay instalación previa, el test se salta en vez de fallar.
- `vd-cli config` lee el deck real y lo resume (páginas, grillas, acciones en uso).
- **`vd-cli audio set` cambió el dispositivo real y la verificación post-set lo
  confirmó** — el riesgo 🔴 #1 del plan (`IPolicyConfig` no documentado) está
  despejado. Sin PowerShell de por medio.
- **`vd-cli media now` leyó la reproducción real** (título, artista, estado,
  origen y carátula PNG) y `media play-pause` pausó y reanudó de verdad.

### 🎉 El riesgo más grande de la migración quedó despejado

`IPolicyConfig` era el ítem que podía hundir el proyecto y por eso se puso primero.
Resultado: **funciona**, y con mejor diagnóstico que la versión Electron.

- El vtable declarado en `audio/policy_config.rs` coincide con el del crate
  `com-policy-config` (validación cruzada independiente) y con el de `audio.ts`.
- Solo se tipa `SetDefaultEndpoint`; los demás slots son punteros opacos. Menos
  superficie para equivocarse y el layout igual queda correcto.
- Los tres errores históricos están corregidos de forma explícita: se chequea el
  `HRESULT` de **cada rol**, hay fallback automático a `IPolicyConfigVista`, y se
  **verifica** con `GetDefaultAudioEndpoint` que el cambio se haya aplicado.
- Hay un test que fija los tres GUID: si alguien los toca sin querer, falla el
  test en vez de romperse en silencio.

### Comandos de trabajo

```bash
cargo check --workspace
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo run -p vd-cli -- config              # resumen del deck real
cargo run -p vd-cli -- paths               # rutas de datos
cargo run -p vd-cli -- backups             # backups existentes
cargo run -p vd-cli -- audio list          # dispositivos de salida
cargo run -p vd-cli -- audio set "Arctis"  # cambia el predeterminado (id o nombre parcial)
cargo run -p vd-cli -- media now           # que se esta reproduciendo
cargo run -p vd-cli -- media play-pause    # tambien: next, prev, stop, shuffle, repeat
cargo run -p vd-cli -- media diagnose      # estado de SMTC sesion por sesion
```

> Si `cargo` no aparece en la terminal, agregá `%USERPROFILE%\.cargo\bin` al PATH
> o abrí una terminal nueva.

**Próximo paso concreto**: **1.5 `macro`** — portar `electron/main/macro.ts`.
Grabación de teclado/ratón con `rdev` (reemplaza `uiohook-napi`) y reproducción con
`SendInput` nativo (reemplaza el script de PowerShell que se generaba en cada
ejecución con `SendKeys` + `user32.dll mouse_event`).
Ojo con el hack de robo de foco: hoy se hace `win.blur()` + 80 ms antes de enviar
teclas para que lleguen a la app anterior. Hay que reproducirlo.
Objetivo: `vd-cli macro record` y `vd-cli macro play <archivo>`.

### Nota de diseño: la carátula ya no es un data-URL

La versión Electron devolvía la portada como `data:image/png;base64,...` porque tenía
que meterla en un `<img>` del WebView. En Rust se devuelven **bytes crudos + mime**:
egui consume bytes directamente, así que se ahorra codificar y decodificar base64 en
cada tick de refresco. Es parte del "limpiar deuda técnica" acordado.

Mientras tanto `main` sigue en 0.5.1 y puede recibir hotfixes.
