# Migración a Rust nativo — Plan maestro

> **Documento vivo.** Es la fuente de verdad de la migración. Si retomás el proyecto
> (vos u otro LLM/editor) después de meses, **leé este archivo primero** y luego
> [CLAUDE.md](../CLAUDE.md) y [ARQUITECTURA.md](ARQUITECTURA.md).
>
> Estado: **Fase 1 completa. Fase 2 en marcha** — la aplicación abre, ejecuta
> acciones, vive en la bandeja y responde a atajos globales. Falta el editor.
> Rama: `rewrite/rust`. Última actualización: 2026-08-15.

---

## 0. Retomar acá (resumen de 30 segundos)

```bash
git checkout rewrite/rust
export PATH="$HOME/.cargo/bin:$PATH"        # o abrir una terminal nueva
cargo test --workspace -- --test-threads=1  # 149 tests, deben dar todos verde
cargo run                                   # abre la aplicacion
cargo run -p vd-cli -- run list             # botones ejecutables de tu config real
cargo run -p vd-cli -- help                 # ver qué se puede ejercitar ya
```

**Dónde quedó**: el núcleo (`vd-core`) está completo y verificado contra hardware
real. La interfaz (`vd-app`) ya abre y funciona; falta el editor.

| Módulo | Estado | Verificado con |
|---|---|---|
| `config` | ✅ | Round-trip del `deck-config.json` real, sin perder campos |
| `audio` | ✅ | Cambió el dispositivo predeterminado de verdad |
| `media` | ✅ | Leyó y controló la reproducción real (SMTC) |
| `macro` | ✅ | Grabó y reprodujo, test automático que se inyecta a sí mismo |
| `launcher` | ✅ | 14/14 comandos; brillo aplicado a 2 pantallas |
| `rgb` | 🟡 | Lee el controlador Aura; **escribir colores NO funciona** |
| `sensors` | ✅ | 38 sensores reales: i5-13600KF (20 hilos) + RTX 4080 completa |
| `net` | ✅ | HTTP/HTTPS sobre WinHTTP; test con servidor local |
| `weather` + `log` | ✅ | Clima real por geo-IP; log con acentos y ñ intactos |
| `actions` | ✅ | Ejecutó un botón real de la config y cambió el audio en 21 ms |

**Lo próximo, concreto**: perfiles, y las acciones que el editor aún no cubre
(ramas, cuentas atrás, RGB). El **instalador** queda para el final, por decisión
del usuario.

El editor ya cubre todo lo que se usa a diario; solo quedan fuera las ramas, las
cuentas atrás, las carpetas y el RGB, que necesitan interfaz propia.

La rejilla ya está completa como interacción: clic, pulsación larga, interruptores
y arrastrar para reordenar.

Ya funciona: `cargo run` abre la rejilla con la configuración real y los iconos
de marca, ejecuta acciones al hacer clic, **permite editar y guardar botones**,
vive en la bandeja del sistema y responde a atajos globales.

El spike de texto está cerrado: acentos, ñ, teclas muertas, IME y pegado, todo
verificado. Se puede volver a pasar cuando se actualice egui o winit:
`cargo run -p vd-app --bin spike_texto`.

**Lo que quedó abierto y por qué**:
- **Aura USB (escritura)**: falta capturar tráfico USB de Armoury Crate con
  USBPcap + Wireshark. No seguir por ensayo y error — ya costó dejar el RGB del
  usuario apagado una vez. Detalle en la sección de RGB.
- **GPU RGB**: `NvAPI_I2CWrite`, ni empezado.

**Cosas que NO hay que romper** (todas con tests que las fijan):
- El report ID de Aura es `0xEC`, no `0x00`.
- Los IIDs COM de `IPolicyConfig` — cambiarlos rompe el audio en silencio.
- El round-trip de config: cualquier campo nuevo necesita su sitio en el modelo
  o el `extra` con `serde(flatten)` que lo preserva.
- Los regex del parser de títulos de ventana: parecen simplificables y no lo son.
- Los prefijos de ID de sensor (`/native/…`, `/nvml/…`): los botones guardan el ID
  del sensor en la config. Si un ID nativo pudiera coincidir con uno de LHM, un
  widget ya configurado pasaría a mostrar otra magnitud sin avisar.
- La espera de reintento de LHM: sin ella, tener el nivel 2 activado y LHM cerrado
  cuesta 2,6 s por refresco y deja la interfaz a tirones.
- En `net`, las cadenas anchas atadas a variables antes de pasarlas como `PCWSTR`:
  escribirlas en línea funciona hoy por las reglas de vida de los temporales, pero
  cualquier refactor las convierte en punteros colgantes.
- La feature `clipboard` de `egui-winit`: sin ella egui **ignora Ctrl+V en
  silencio** y no se puede pegar en ningún campo de la aplicación.

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

**Objetivo medible**: instalador < 20 MB, RAM en reposo < 140 MB, latencia de acciones < 10 ms.

**Medido en la Fase 2**, con la aplicación ya funcionando:

| Objetivo | Meta | Real | |
|---|---|---|---|
| Binario | — | 3,18 MB | holgado |
| RAM en reposo | < 140 MB | 128 MB | se cumple. La meta original era 60 MB y se **corrigio al medir**: 121 MB son la pila grafica y solo 7 MB el codigo propio |
| Latencia de una acción | < 10 ms | 21 ms (cambiar dispositivo de audio) | cerca; eran 150–400 ms con PowerShell |

La memoria es lo único claramente fuera de meta y **sigue abierto**. Ver la
sección del renderer.

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
│   │   │   ├── sensors/          # nativo (sysinfo + NVML) + LHM opcional
│   │   │   ├── net/              # cliente HTTP/HTTPS sobre WinHTTP
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
| 1.8 | **`sensors`** | 🟢 Dos niveles | Lee CPU/RAM/disco/red y GPU sin nada instalado; LHM opcional |
| 1.9 | **`weather`** + **`log`** | 🟢 Trivial | Clima real por geo-IP; log releído con acentos intactos |
| 1.10 | **`actions`** | Motor que orquesta todo | `vd-cli run <id>` ejecuta un botón real del deck-config |

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

### 🔬 Investigado: quitar la dependencia de LHM y OpenRGB

> Pedido explícito del usuario: que sensores y RGB funcionen **sin descargar nada
> aparte**, porque hoy eso limita el uso, consume más recursos y da problemas al
> iniciar con Windows. Investigado en agosto 2026; esto define las Fases 1.7 y 1.8.

#### El límite duro: temperaturas y RGB de placa necesitan driver de kernel

No es pereza de LHM: leer la temperatura del **paquete de CPU**, los **voltajes** y
los **headers de ventiladores** exige leer registros MSR y del chipset, y Windows
reserva eso a código en anillo 0. Por eso LHM instala `LibreHardwareMonitor.sys`
(basado en **WinRing0**) y pide UAC. El mismo driver lo usan MSI Afterburner,
FanControl y **el propio OpenRGB**.

**🚩 Hallazgo crítico para la tienda**: Microsoft Defender ya marca a **WinRing0
como driver vulnerable** (tiene CVEs conocidos). Empaquetar LHM en una app que
aspira a Microsoft Store es un riesgo concreto de certificación y de que Defender
la señale. **Esto refuerza mucho la decisión de no depender de LHM.**

#### Lo que SÍ se puede hacer nativo, sin instalar nada y sin admin

| Dato | Cómo | Requiere |
|---|---|---|
| Uso de CPU, RAM, disco, red | [`sysinfo`](https://crates.io/crates/sysinfo) | nada |
| Lista y uso por proceso | `sysinfo` | nada |
| **GPU NVIDIA completa** (temp, uso, ventilador, VRAM, potencia, reloj) | [`nvml-wrapper`](https://crates.io/crates/nvml-wrapper) | nada — **NVML viene con el driver NVIDIA** y se carga dinámicamente, así que degrada solo si no hay GPU NVIDIA |
| Uso de GPU (cualquier fabricante) | Contadores de rendimiento de Windows (`GPU Engine`) | nada |
| Temperatura de SSD/HDD | SMART por `DeviceIoControl` | a veces admin |
| Temp. de CPU, voltajes, ventiladores de placa | ❌ | driver de kernel |

#### Decisión: backends por niveles (Fase 1.8)

```
Nivel 1 — NATIVO (por defecto, sin instalar nada, sin UAC, arranca siempre)
          sysinfo + NVML + contadores de Windows
Nivel 2 — AVANZADO (opcional, el usuario lo elige)
          LHM externo, si ya lo tiene o lo quiere instalar
```

El widget de sensores muestra lo que haya. Si no hay Nivel 2, no aparecen temperatura
de CPU ni ventiladores — **se pierden features, que es exactamente el intercambio que
el usuario aceptó**. A cambio: cero descargas, cero UAC, cero problemas al arrancar
con Windows, y muchísimo menos consumo (hoy LHM es un proceso .NET entero haciendo
polling).

#### RGB (Fase 1.7): mismo esquema, pero con más matices

- Muchos periféricos (teclados, ratones, headsets) son **HID puro** y se pueden
  manejar con [`hidapi`](https://crates.io/crates/hidapi) sin app externa y sin admin.
  El problema es que **cada fabricante tiene su protocolo propio**: OpenRGB es
  básicamente un repositorio de cientos de drivers de dispositivo. Reimplementar
  todo es inviable; un subconjunto de los más comunes, sí.
- El RGB de **placa madre y RAM** va por SMBus → vuelve a necesitar driver de kernel.
  Ahí no hay salida nativa.
- **Legal**: OpenRGB es GPLv2, así que no se puede enlazar dentro de una app
  propietaria. Los *protocolos* no son copyrightables (reimplementarlos es legal),
  pero copiar su código no.

**Decisión**: mismo esquema de dos niveles. Nivel 1 = HID directo para un conjunto
acotado de dispositivos; Nivel 2 = cliente OpenRGB opcional para quien ya lo use y
quiera cobertura total.

#### ✅ Verificado contra el hardware real del usuario

En vez de suponer, se escribió `vd-cli rgb scan` (enumera HID filtrando por
fabricantes RGB conocidos) y se corrió en la máquina. Resultado:

```
ASUS — AURA LED Controller     VID:PID 0B05:19AF   interfaz 2
SteelSeries — Arctis Nova Pro Wireless  1038:12E0
Logitech — USB Receiver        046D:C548
```

**El `0B05:19AF` es el controlador Aura por USB**, no por SMBus. Desde la generación
X570, ASUS unificó en un solo controlador USB el RGB de placa, las cabeceras 12V RGB
y **las cabeceras ARGB**. Es un dispositivo conocido y soportado por OpenRGB.

Consecuencia para este equipo (Z690 ROG Strix + AIO DeepCool de 3 ventiladores con
bomba iluminada + set de 3 ventiladores + 3 frontales de gabinete + RTX 4080 Zotac):

| Hardware | Vía | ¿Nativo sin driver? |
|---|---|---|
| RGB de la placa | Aura USB (HID) | ✅ sí |
| AIO DeepCool, set de ventiladores, frontales del gabinete | cabeceras ARGB → mismo Aura USB | ✅ sí |
| RTX 4080 Zotac (Spectra) | I2C del GPU vía **NvAPI_I2CWrite** | ✅ sí — NVAPI es una DLL de usuario que trae el driver NVIDIA |
| Arctis Nova Pro | HID propio | ✅ sí |

**No apareció ningún VID de DeepCool (0x3633)**, lo que confirma que la iluminación
del AIO va por las cabeceras ARGB de la placa y no por un controlador USB propio.

**Conclusión**: para este equipo el Nivel 1 nativo cubriría *todo*, sin driver de
kernel, sin UAC y sin instalar OpenRGB. Es un resultado mucho mejor de lo previsto.
El Nivel 2 (OpenRGB opcional) queda solo para usuarios con hardware que sí dependa
de SMBus (placas viejas, RAM iluminada).

> ⚠️ Ojo: implementar el protocolo Aura USB es trabajo real (paquetes HID de 65
> bytes, modos directo/efecto, mapeo de zonas). Se puede **reimplementar
> legalmente** — los protocolos no son copyrightables — pero **no se puede copiar
> código de OpenRGB**, que es GPLv2. La referencia a usar es la documentación del
> wiki de OpenRGB, no su código fuente.

#### Consecuencia para el plan

La opción **C** que estaba planteada abajo queda **confirmada como decisión**, y con
un argumento nuevo y más fuerte del que se tenía: no es solo tamaño del instalador,
es que el driver que exige LHM está marcado como vulnerable por Defender.

### Decisión tomada: LibreHardwareMonitor deja de empaquetarse

> **Resuelto en la Fase 1.8** (opción C). Antes se empaquetaba LHM (~19 MB de .NET)
> y la app lo lanzaba sola, a veces pidiendo UAC. Con un instalador objetivo de
> < 20 MB, LHM solo pesaba más que toda la aplicación nueva.

Lo implementado:

- **Nivel 1, siempre activo**: `sysinfo` (CPU, memoria, discos, red) + NVML (GPU
  NVIDIA). Sin instalar nada, sin UAC, sin procesos externos.
- **Nivel 2, desactivado por defecto**: LHM externo, solo si el usuario ya lo tiene
  y lo activa a mano. No se empaqueta, no se lanza el proceso y no se registran
  reservas de URL con `netsh` — todo eso existía para sostener el empaquetado.

**La sorpresa fue cuánto cubre el nivel 1.** Se esperaba perder toda la telemetría
térmica, pero NVML da temperatura, ventiladores, consumo y relojes de la GPU sin
driver de kernel. Verificado en la RTX 4080: 42 °C, 32 W, 2505 MHz. Funciona porque
`nvml.dll` ya viene con el driver de NVIDIA y se carga dinámicamente en runtime.

**Lo que se pierde sin nivel 2**, y no hay forma de evitarlo: temperatura del
paquete de CPU, voltajes y ventiladores de la placa. Se leen por MSR y SMBus, que
exigen anillo 0. Es el intercambio que se aceptó explícitamente.

Para GPU AMD/Intel no hay equivalente igual de cómodo a NVML; ahí el nivel 2 sigue
aportando bastante más.

---

## 7. Convenciones del código Rust

### Los tests no le cambian el equipo a quien compila

Regla dura, aprendida por las malas **tres veces**: **`cargo test` no puede dejar
la máquina distinta de como la encontró.**

1. Un test de brillo llamaba a `set_brightness(500)` —que se recorta a 100— sin
   restaurar nada, así que cada compilación le ponía los monitores al máximo a
   quien estuviera trabajando.
2. Otro sobrescribía el portapapeles y borraba lo que el usuario tuviera copiado.
3. Un tercero usaba `ActionType::Mute` como acción de ejemplo "inofensiva" para
   probar la pulsación larga. **Silencia el sistema de verdad**, y como la tecla
   multimedia *alterna*, un número impar de ejecuciones dejaba el equipo mudo.

Los tres los reportó el usuario, no los tests. El patrón común es elegir una
llamada real por parecer barata o inocua **sin mirar qué hace en el sistema**.
Antes de usar una acción en un test, la pregunta es: ¿qué cambia fuera del
proceso? Si la respuesta no es "nada", no vale.

Del tercer incidente salió algo útil: `launcher::is_muted()` y `set_muted()`.
Restaurar el silencio exigía **leer** el estado, porque la tecla multimedia solo
alterna y alternar a ciegas es el mismo error otra vez.

Cómo se escriben en su lugar:

1. **Extraer la parte pura y probar esa.** El test del brillo comprobaba el
   recorte al rango; eso ahora es una función sin efectos y el test no toca
   ninguna pantalla.
2. **Si hace falta tocar el hardware**: guardar el estado, actuar, restaurar, y
   marcar el test `#[ignore]` con el motivo. Se ejecuta a propósito, no de paso.
3. **Leer de vuelta lo que se escribió.** El test del portapapeles guarda lo que
   hubiera, escribe, **verifica leyendo** y restaura. Salió más fuerte que antes:
   ahora comprueba el camino UTF-16 completo y no solo que la llamada no falle.

Excepción consciente: el test de macros inyecta **F13**, una tecla que existe en
el teclado extendido pero que ningún programa usa. Es entrada real, pero no
cambia nada ni interfiere con lo que estés haciendo.

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
| 1.5 — `macro` | ✅ **Completa** — hooks + SendInput, verificado grabando y reproduciendo |
| 1.6 — `launcher` | ✅ **Completa** — los 14 comandos, brillo incluido |
| 1.7 — `rgb` | 🟡 **Lectura sí, escritura no** — ver abajo |
| 1.8 — `sensors` | ✅ **Completa** — nivel 1 nativo + LHM opcional; LHM ya no se empaqueta |
| 1.9 — `weather` + `log` | ✅ **Completa** — incluye `net`, cliente HTTP sobre WinHTTP |
| 1.10 — `actions` | ✅ **Completa** — verificado ejecutando un botón real |
| **Fase 1** | ✅ **COMPLETA** |
| 2 — `vd-app` (UI egui) | ⬜ No iniciada |
| 3 — Paridad + v1.0.0 | ⬜ No iniciada |

### Deuda técnica anotada

| Qué | Dónde | Por qué importa |
|---|---|---|
| Robo de foco antes de macros/hotkeys | `macros`, a resolver en `vd-app` | Sin esto, una macro se escribe a sí misma |
| Escritura Aura USB | `rgb::aura` | Necesita captura USB, no más ensayo y error |
| GPU RGB (`NvAPI_I2CWrite`) | sin empezar | Único RGB del equipo que no pasa por Aura |
| Sensores de placa (temp. de CPU, voltajes, ventiladores) | `sensors`, solo con nivel 2 | Sin LHM no hay forma: exigen anillo 0. Decisión tomada y asumida |
| 2 — `vd-app` (UI) | ⬜ No iniciada |
| 3 — Paridad + v1.0.0 | ⬜ No iniciada |

### Lo verificado hasta ahora

- `cargo check` / `clippy -D warnings` / `cargo fmt --check` / `cargo test`: **todo en verde**.
- **63 tests**, incluido el que más importa:
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
- **Macros validadas de punta a punta sin intervención humana**: el test
  `macro_ida_y_vuelta.rs` arranca el grabador, **inyecta** una tecla con
  `SendInput` y verifica que el hook global la capturó. Ejercita grabación y
  reproducción a la vez. Usa **F13–F24**, teclas que Windows entiende pero que
  ninguna aplicación escucha, así no interfiere con lo que el usuario tenga
  abierto.

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
cargo run -p vd-cli -- macro record 5      # graba 5 s a macro.json
cargo run -p vd-cli -- macro play macro.json 3   # reproduce tras 3 s de espera
```

> Los tests de macro instalan hooks globales, que son un recurso de todo el
> sistema. Corré la suite con `--test-threads=1` si ves resultados raros.

> Si `cargo` no aparece en la terminal, agregá `%USERPROFILE%\.cargo\bin` al PATH
> o abrí una terminal nueva.

### 🟡 Aura USB: se lee, no se escribe (y por qué)

**Lo que funciona.** Comunicación establecida con el controlador `0B05:19AF` de la
Z690 ROG Strix: responde firmware `AULA3-AR32-0215` y entrega su tabla de
configuración de 60 bytes. Tres cosas hicieron falta para llegar:

1. **El report ID es `0xEC`, no `0x00`.** En las tablas del wiki el offset `0x00`
   vale `0xEC`: ese byte *es* el report ID. Leerlo como relleno corre el paquete un
   byte y Windows rechaza con `ERROR_INVALID_PARAMETER`.
2. Este controlador **no soporta feature reports** (los declara con longitud 0).
   Va por `write` + `read_timeout`.
3. Hay que enumerar **todas** las colecciones HID, no filtrar por interfaz, y
   consultar las longitudes reales con `HidP_GetCaps` en vez de asumirlas.

**Lo que NO funciona: escribir colores.** El controlador acepta los paquetes y
entra en modo directo — se nota porque deja de mostrar su efecto — pero los colores
no llegan al búfer y **la iluminación queda apagada**. Se probaron dos variantes de
cabecera (la literal del wiki `EC 36 <canal> FF 00`, y una con desplazamiento y
cantidad en los bytes 3 y 4). Ninguna sirvió.

**Causa raíz: falta documentación.** El wiki de OpenRGB cubre los controladores por
**SMBus** y dice explícitamente que los de **USB no están cubiertos**. Lo poco
documentado del lado USB alcanzó para leer, no para escribir.

#### Cómo cerrarlo cuando se retome

La vía correcta es **capturar el tráfico USB real** de Armoury Crate con USBPcap +
Wireshark mientras cambia las luces, y leer de ahí la secuencia. Es legítimo y es
como se documentan estos protocolos. Lo que **no** se puede es copiar código de
OpenRGB (GPLv2); reimplementar a partir de una captura propia, sí.

#### Lección de método

Se probó a ciegas sobre hardware del usuario y el costo fue dejarle el RGB apagado
(se recupera reiniciando: el controlador recarga su perfil desde flash). **Para la
próxima: capturar primero, escribir después.** Ensayo y error contra un dispositivo
sin documentación no es un método aceptable cuando hay un usuario mirando.

**Próximo paso concreto**: pasar a **1.8 `sensors`**, que está bien entendido, no
tiene riesgo para el hardware y aporta valor inmediato (`sysinfo` + NVML para la
RTX 4080). Volver a Aura cuando haya una captura USB que analizar.

### ✅ Brillo: mejor que el original

Se completó, y **de paso se arregló una limitación de la versión Electron**. Windows
expone el brillo por dos APIs distintas y ninguna sirve para los dos casos:

| Tipo de pantalla | API |
|---|---|
| Panel interno (portátiles) | WMI `WmiMonitorBrightnessMethods` |
| Monitor externo (escritorio) | **DDC/CI** por `dxva2.dll` |

La versión Electron implementaba **solo WMI**, así que la acción de brillo
sencillamente no hacía nada en un equipo de escritorio. Ahora se intentan los dos.
Verificado en la máquina del usuario: leyó 49 %, aplicó 65 % a **2 pantallas** y
restauró — todo por DDC/CI, que antes no existía.

### ✅ Sensores: se cae la dependencia de LibreHardwareMonitor

38 sensores leídos en el equipo del usuario **sin instalar nada**: i5-13600KF con
sus 20 hilos, 32 GB de RAM, disco C:, red, y la RTX 4080 entera — temperatura,
ventiladores, consumo, VRAM y relojes.

Lo que había que averiguar era cuánto se perdía al soltar LHM. La respuesta fue
"mucho menos de lo esperado": **NVML cubre la GPU completa sin driver de kernel**,
porque `nvml.dll` ya viene con el driver de NVIDIA. Lo único que queda del otro
lado de la línea es lo que se lee por MSR/SMBus —temperatura del paquete de CPU,
voltajes, ventiladores de placa—, que sigue exigiendo anillo 0 y ahora es un
añadido opcional en vez de un requisito.

**Bug encontrado de paso.** Con el nivel 2 activado pero LHM cerrado —el estado por
defecto de cualquiera que lo desinstale— cada refresco pagaba un intento de conexión
fallido: 2,6 s medidos, con el widget pidiendo uno por segundo. La interfaz habría
ido a tirones por un servicio opcional que ni siquiera está instalado. La versión
Electron tenía el mismo problema, tapado por su caché de 1,5 s. Resuelto con una
espera de reintento de 15 s, fijada por un test que mide el tiempo real de 20
refrescos seguidos.

Detalle que importa para la compatibilidad: los botones ya configurados guardan el
ID del sensor. Los IDs de LHM se respetan tal cual y los nativos usan prefijos
propios (`/native/…`, `/nvml/…`), con un test que verifica que no puedan chocar.

### ✅ Clima y registro: HTTPS sin pila TLS

`weather` y `log` eran los dos módulos triviales de la fase, pero el clima trajo
una decisión que no lo era: **necesita HTTPS**, y en Rust eso normalmente significa
arrastrar `rustls` con su proveedor criptográfico y un paquete de certificados
raíz, o `native-tls`. Cualquiera de los dos pesa más que varios módulos del núcleo
juntos, con un objetivo de instalador por debajo de 20 MB.

La salida fue **WinHTTP**, que ya venía declarada en el crate `windows` del que el
proyecto depende. Cero bytes añadidos, cero dependencias nuevas, y dos ventajas que
no se buscaban: usa el almacén de certificados de Windows —así que funciona detrás
de proxies corporativos que inspeccionan tráfico, donde un paquete de raíces
embebido fallaría— y respeta la configuración de proxy del sistema sin código extra.

De paso, el cliente de LHM se migró a WinHTTP y **`ureq` salió del proyecto**: ocho
dependencias menos y una sola pila HTTP en vez de dos.

Esa migración destapó un hueco: el camino de éxito del cliente de LHM **no tenía
ningún test**. Solo se probaban el parseo y el fallo de conexión, así que cambiar de
pila HTTP se estaba haciendo a ciegas. Ahora hay un test que levanta un servidor en
un puerto efímero y sirve un `/data.json` real. El primer intento de ese test pasó
*por la razón equivocada* —el caso del HTTP 500 daba verde porque la conexión
fallaba, no porque el 500 se detectara—, así que ahora exige que el mensaje de error
nombre el código.

Verificado en vivo: clima real por geo-IP en 966 ms, y el registro releído con
acentos y ñ intactos, que es exactamente lo que la versión con PowerShell rompía.

### ✅ Motor de acciones: Fase 1 cerrada

El criterio de "Fase 1 terminada" era que el núcleo pudiera ejecutar cualquier
acción de un `deck-config.json` real sin abrir una ventana. Cumplido: `vd-cli run
0-1` leyó la configuración del usuario, ejecutó el botón de cambio de dispositivo
de audio y **cambió la salida del sistema en 21 ms** — frente a los 150–400 ms que
costaba la misma operación lanzando un `powershell.exe`.

**Acciones que el núcleo no ejecuta, a propósito.** Abrir una carpeta de botones,
mostrar una notificación, capturar una región o leer texto en voz alta tienen su
efecto *en la interfaz*. El motor las reconoce y devuelve `Outcome::ForUi` en vez
de fingir que las ejecutó o de tratarlas como error. La distinción importa: una
acción de interfaz **no interrumpe** una secuencia, un fallo real sí.

**Tope de anidamiento.** Una configuración puede tener ramas que se llaman entre
sí en ciclo. Sin límite, eso desbordaría la pila y tumbaría la aplicación entera;
ahora corta a los 10 niveles con un mensaje que explica la causa probable.

**Bug encontrado por un test.** El sustituidor de variables se comía la llave de
apertura de un JSON de forma golosa: en `{"saludo": "{nombre}"}` saltaba hasta el
primer `}` y la variable de dentro nunca se sustituía. Los webhooks con cuerpo JSON
—que es el caso normal— habrían enviado la plantilla sin rellenar. El test estaba
escrito antes de ver el fallo, no después.

**`run dry`** muestra qué haría un botón sin ejecutarlo. No es un adorno: la
configuración del usuario tiene un botón que apaga el equipo a los 30 segundos, y
hace falta poder inspeccionarlo sin dispararlo.

### ✅ Fase 2 — spike de entrada de texto: superado

Era el riesgo declarado de la Fase 2: si egui no manejara bien el español, toda la
elección de framework se caía. Se probó **antes** de portar ninguna pantalla.

El spike abre una ventana, se trae el primer plano y se inyecta el texto con el
mismo `SendInput` del módulo de macros, así que recorre la cadena real: Windows →
winit → egui-winit → `TextEdit`.

| Caso | Resultado |
|---|---|
| `áéíóú ñÑ ¿¡ üÜ €` por teclado | ✅ llega intacto |
| Emoji (par suplente UTF-16) pegado con Ctrl+V | ✅ llega intacto |
| Emoji tecleado carácter a carácter | ❌ winit entrega `text: None` |
| Panel de emoji de Windows (IME) | ✅ llega como un solo punto de código |
| Teclas muertas (`´` + `a` → `á`) | ✅ el driver compone; llega `U+00E1` |

**El spike está cerrado: todos los casos pasan.**

**El IME funciona, y era la incógnita real.** Probado a mano con el panel de emoji
de Windows (`Win + .`): el carácter llega como **un solo punto de código**
(`U+1F602`), no como las dos mitades sueltas que winit sí entrega mal cuando el
mismo emoji viaja por teclado. Es decir, la composición por IME se maneja por una
ruta distinta y correcta. La ñ también se confirmó a mano (`U+00F1`).

**Las teclas muertas también componen.** `´` seguido de `a` llega como `U+00E1`,
un solo carácter. winit reporta `Dead(Some('´'))` sin texto y después
`Character("á")`, que es exactamente el comportamiento correcto.

Ese caso está automatizado: pulsa teclas **físicas** con `VkKeyScanW` +
`SendInput`, no `KEYEVENTF_UNICODE`. Inyectar el carácter ya formado salta por
encima del driver de teclado y no probaría la composición, que es justo el punto.

Una primera prueba manual dio el acento y la vocal por separado y no se pudo
reproducir después, ni a mano ni en automático. Se deja anotado por si reaparece,
pero el comportamiento verificado —dos vías independientes— es que compone.

Detalle útil para futuras pruebas: **Bloq Mayús afecta al caso de teclas físicas
pero no a la inyección Unicode**, así que el resultado puede salir en mayúscula sin
que eso signifique nada. El spike lo detecta y juzga la composición, no la caja.
Con `VD_SPIKE_DIAG=1` imprime los eventos de teclado e IME que recibe winit, que es
lo que distingue "no llegó" de "llegó transformado".

**Tres cosas más se aprendieron por el camino**, y ninguna se habría visto leyendo
documentación:

1. **`egui-winit` necesita la feature `clipboard`.** Se había puesto
   `default-features = false` por reflejo, y eso hace que egui **ignore Ctrl+V en
   silencio**. Sin el spike, esto habría aparecido como un bug de usuario meses
   después.
2. **Los pares suplentes no sobreviven al teclado.** `SendInput` manda un emoji
   como dos mitades UTF-16 y winit las entrega con `text: None`, porque ninguna
   mitad es un carácter por sí sola. No importa en la práctica —los emojis se
   pegan, no se teclean— pero conviene saberlo antes de perseguirlo como bug.
3. **Ganar el primer plano necesita dos intentos.** El primero, justo tras crear
   la ventana, siempre falla porque el sistema aún no la considera lista. Eso
   costó varias iteraciones de diagnóstico y parecía la restricción de foco de
   Windows cuando era simple impaciencia.

De paso salió `launcher::force_foreground`, que hace la maniobra de
`AttachThreadInput` necesaria para que Windows acepte el cambio de primer plano.
Es la otra cara de la deuda del robo de foco: las dos necesitan las mismas
primitivas.

### ✅ Fase 2 — renderer: **glow**, tras corregir una decisión mal medida

Esta sección cuenta dos cosas: la elección final y **el error de método que la
retrasó**, porque lo segundo importa más.

**Primera decisión: wgpu.** Se montaron los dos backends dibujando la misma
escena —rejilla de 5×3 con glifos dot-matrix, 525 círculos por fotograma— y se
midió tamaño de binario y fotogramas por segundo. glow pesaba 2,2 MB menos y
empataban en rendimiento; como 2,2 MB sobre un presupuesto de 20 MB se pagan sin
problema, decidió la robustez: wgpu tiene respaldo por software (WARP) cuando no
hay GPU utilizable, y OpenGL en Windows no.

**El error: no se midió la memoria**, que es un objetivo declarado del proyecto
(< 60 MB en reposo) y la mitad de la justificación de toda la migración. Se
midieron dos de los tres criterios y se decidió como si estuvieran los tres.

Al medirla, la decisión se dio vuelta:

| Backend | Binario | Fotogramas | Residente | Privados |
|---|---|---|---|---|
| glow (OpenGL / WGL) | 2,56 MB | 144 fps | **121 MB** | 215 MB |
| wgpu (Direct3D 12) | 4,76 MB | 144 fps | 170 MB | 454 MB |

Con wgpu la aplicación se plantaba en ~170 MB, prácticamente lo mismo que los
~200 MB de Electron. Se cambió a **glow** por defecto, dejando wgpu tras la
feature `render-wgpu` por si aparecen usuarios a los que OpenGL no les arranca.

**Un segundo error, en la propia medición.** La primera cifra de glow fue 65 MB
y no se reproduce: salía de mirar el proceso **demasiado pronto**, antes de que
el contexto gráfico y el atlas de fuentes terminaran de inicializarse. Repetida
con el mismo binario y dejando pasar unos segundos, da 121 MB. Queda anotado en
`spike_render.rs` para que nadie vuelva a creerse una lectura temprana.

**Estado real del objetivo**: la aplicación completa con glow está en **128 MB
residentes** contra una meta de 60 MB. Mejor que Electron, pero **el objetivo no
se cumple**.

Se midió por capas para saber de dónde sale (`spike_ventana` abre una ventana de
winit y nada más):

| Capa | Residente | Privados |
|---|---|---|
| Ventana pelada de winit | **15 MB** | 2,5 MB |
| + contexto OpenGL + egui | 121 MB | 215 MB |
| Aplicación completa | 128 MB | 249 MB |

El reparto es claro y algo incómodo: **la pila gráfica pone ~105 MB** y todo el
código propio —pantallas, 68 iconos, bandeja, atajos, configuración— suma 7 MB
encima. No hay nada que optimizar en el lado de la aplicación; el coste es del
driver de vídeo, que se mapea y compromete memoria por su cuenta.

**Decisión tomada: se aceptan los ~128 MB y el objetivo pasa de 60 a 140 MB.**

La meta de 60 MB se fijó antes de tener nada que medir, y resultó inalcanzable
por una razón ajena al proyecto: **el suelo de una ventana con aceleración
gráfica en Windows ya son ~120 MB**, casi todo del driver de vídeo. Bajar de ahí
exigiría renunciar a la GPU y escribir un rasterizador por CPU para las mallas de
egui (`softbuffer`), porque egui no trae backend de CPU. Es mucho trabajo y
riesgo para ahorrar memoria que, en un equipo de escritorio, no escasea.

Con el objetivo corregido, **las tres metas se cumplen**: 3,18 MB de binario,
128 MB en reposo (36 % menos que Electron) y 21 ms por acción frente a 150–400 ms.

Si algún día importara, el camino está identificado: renderizar por CPU. Queda
anotado, no descartado.

Se comprobó también, y resultó **falso**, que los límites amplios pedidos a wgpu
(`adaptador.limits()`) explicaran su consumo: cambiarlos a un perfil conservador
no movió la aguja.

Los dos backends viven ahora en `src/render/` con la misma interfaz, y los dos
spikes se unificaron en uno solo: el mismo código de medición para ambos es lo
que hace la comparación honesta.

**Dos tropiezos más, que valen como aviso:**

- `egui-wgpu 0.32` exige **wgpu 25**, no la última. Fijar la 27 arrastra un
  `naga` incompatible y el error que sale —`String: WriteColor no satisfecho`,
  dentro de `naga`— no se parece en nada a la causa.
- `wgpu::Limits::downlevel_defaults()` topa las texturas en **2048 px**. Cualquier
  pantalla moderna con escalado ya pide más, y la superficie falla al
  configurarse.

### ✅ Fase 2 — primera pantalla: la rejilla ejecuta acciones

`cargo run -p vd-app` abre la ventana, lee el `deck-config.json` real y al pulsar
un botón ejecuta su acción. Verificado con la configuración del usuario: 2
páginas, 8 botones.

**Lo único de riesgo real en esta capa era el hilo.** Una acción puede tardar —un
script, un webhook con un servidor lento, una cuenta atrás de treinta segundos— y
ejecutarla en el hilo de la interfaz congelaría la ventana entera: el usuario no
podría ni cambiar de página ni cerrar la aplicación. Cada pulsación se manda a un
hilo aparte y el resultado vuelve por un canal, que es el **único** punto donde el
estado se toca desde fuera del hilo de la interfaz.

Eso está cubierto por tests que no necesitan ventana: que el resultado vuelva del
hilo de fondo, que un botón no se dispare dos veces si se pulsa rápido —sin esa
guarda serían dos webhooks— y que un botón sin configurar no lance nada.

El bucle usa `ControlFlow::Poll` y no `Wait` justamente por esto: hay trabajo que
llega de fuera del bucle de eventos, y con `Wait` la ventana no se redibujaría
hasta que el usuario la tocara.

**Los iconos de marca ya se dibujan.** Se priorizaron mirando la configuración
real en vez de por intuición: 6 de los 8 botones usan `brandIcon`, así que era lo
que más cambiaba lo que se ve.

Resultó mucho más barato de lo previsto. Se había anotado como "hay que cargar y
cachear texturas", pero **no son imágenes**: la versión Electron los define como
mapas de 17×17 caracteres y los renderiza a SVG. Aquí son 289 círculos por icono
dibujados con el `Painter`, sin archivos, sin decodificar PNG y sin texturas de
GPU. Los datos se extrajeron ejecutando el propio `brandIcons.ts` con Node, no
reescribiéndolos a mano, y se empotran en el binario (31 KB).

**Un test destapó un fallo que ya existía en la versión publicada**: tres iconos
—`docker`, `asana` y `crunchyroll`— tenían filas de ancho equivocado (19, 18 y 16
caracteres en vez de 17). En Electron eso desplaza el dibujo sin dar ningún error,
y `docker` es uno de los botones del deck del desarrollador. Se corrigieron
respetando la intención visible del autor: recortar por el centro conserva la
simetría, rellenar por la derecha añade solo apagados. **Sigue estando mal en
`main`.**

Lo que **aún no** hace la pantalla: los iconos de lucide (`icon`, 1 botón),
imágenes de fondo, pulsación larga, toggle y arrastrar para reordenar.

### ✅ Fase 2 — bandeja y atajos globales: la decisión de winit se confirma

Se portó antes que funciones más vistosas por un motivo concreto: **era el
riesgo de arquitectura que quedaba**. La elección de winit directo en vez de
`eframe` se justificó diciendo que `tray-icon` y `global-hotkey` necesitan que su
cola de eventos se bombee desde el bucle principal, algo que `eframe` no permite.
Si eso no hubiera encajado, la decisión habría estado mal y cuanto antes se supiera,
mejor.

Encajó. Las dos bibliotecas publican en canales globales propios y se sondean en
`about_to_wait`, una vez por vuelta del bucle. Son cuatro líneas.

Lo que hay ahora:

- **Icono de bandeja** con menú (Mostrar / Ocultar / Salir). Clic izquierdo
  alterna la ventana; el derecho abre el menú. El icono se **dibuja en código**
  como una rejilla de puntos con antialiasing, en vez de empotrar un PNG: no hay
  decodificador ni archivo que pueda faltar, y encaja con la estética del
  proyecto.
- **Cerrar la ventana ya no cierra la aplicación**, que es como se comporta un
  deck. Con una salvedad: si la bandeja no se pudo crear, cerrar sí sale —
  esconder una ventana sin forma de recuperarla sería perder la aplicación.
- **Atajos globales** leídos de la configuración. Un atajo que ya tenga otra
  aplicación falla al registrarse; eso **no** impide que los demás funcionen, y el
  motivo se guarda para poder decirlo. Un atajo mudo sin explicación es de lo más
  desconcertante que le puede pasar a un usuario.
- Escondida, la ventana **deja de pedir fotogramas**: seguir dibujando a 144 fps
  para nadie gastaría GPU sin motivo.

Detalle del formato: la configuración guarda los atajos con los nombres de
Electron (`CommandOrControl+Shift+P`) y la biblioteca de Rust espera los suyos.
La traducción tiene un test que **no compara cadenas**, sino que comprueba que lo
traducido lo parsee de verdad `global-hotkey`; y otro que registra un atajo real
en Windows y lo libera, porque el parseo puede estar bien y el registro fallar.

### ✅ Fase 2 — editor de botones

El botón **Editar** de la cabecera cambia lo que hace un clic en la rejilla: en
vez de ejecutar el botón, lo abre en un panel lateral. Los huecos vacíos también
se vuelven pulsables y marcados con un `+`, que es como se crea un botón nuevo.

Se edita apariencia (etiqueta, segunda línea, icono de entre los 68 del paquete,
colores de fondo y texto) y acción: 21 tipos, cada uno mostrando **solo sus
campos**. Enseñarlos todos a la vez fue lo que hizo ilegible el editor de la
versión Electron.

**Antes de escribir nada se arregló cómo se guarda.** `config::save` usaba
`fs::write` directo sobre el archivo que contiene toda la configuración del
usuario: si el proceso muriera a mitad —corte de luz, cierre forzado, disco
lleno— quedaría truncado y con él se irían todos sus botones. Ahora escribe a un
temporal en la misma carpeta y renombra encima, que es atómico para quien lea el
archivo: o ve la versión vieja entera, o la nueva entera, nunca media.

Otras dos decisiones que importan:

- **El editor trabaja sobre una copia**, y solo la vuelca a la configuración al
  guardar. Salirse del editor no deja cambios a medias.
- **Aplicar en memoria y escribir en disco están separados** (`aplicar_borrador` /
  `guardar_borrador`). No es un capricho de diseño: así la lógica de
  reemplazar-o-añadir se puede probar sin que un test le machaque la
  configuración real a quien compile el proyecto.
- Si el guardado en disco falla, **se dice**. El cambio sigue en memoria pero no
  en disco, y alguien podría cerrar creyendo que quedó guardado.

**Pulsación larga y botones interruptores** ya funcionan en la rejilla. La larga
se dibuja como un aro de puntos que se va completando mientras se mantiene
pulsado, para que se vea que está pasando algo; medio segundo, igual que la
versión Electron. Un botón sin acción larga trata la pulsación sostenida como un
clic normal en vez de no hacer nada.

Un detalle del interruptor que parece un descuido y no lo es: **el estado cambia
aunque la acción falle**, y vive en memoria, no en la configuración. Si dependiera
del éxito de la acción, un interruptor sin acción de apagado se quedaría encendido
para siempre; y guardarlo en disco escribiría el `deck-config.json` en cada
pulsación.

**Arrastrar para reordenar** funciona en modo edición. Tres decisiones:

- **Solo en edición.** En uso normal, un arrastre accidental sobre un botón
  reordenaría el deck sin querer.
- **Se intercambia el contenido, no los identificadores.** En esta configuración
  el id codifica la posición (`0-4` es la quinta casilla de la primera página),
  así que mover los ids rompería esa correspondencia y dejaría la rejilla
  inconsistente con el archivo. Hay un test que lo fija.
- **El estado de un interruptor viaja con el botón**, no con la casilla. Si se
  quedara en la casilla, mover un interruptor encendido lo apagaría y encendería
  al que ocupara su sitio.

El intercambio se aplica **al soltar**, no mientras se arrastra: mover en vivo
haría que la rejilla bailara bajo el puntero. Y se guarda en disco enseguida,
porque reordenar es un cambio que el usuario espera que persista sin pulsar nada.

### ✅ Fase 2 — widgets en la rejilla

Un botón con widget sigue siendo un botón —se pulsa y ejecuta su acción— pero en
vez de un texto fijo muestra algo vivo: **reloj, clima, sensor, reproducción o el
valor de una variable**. Todos se apoyan en módulos del núcleo ya verificados.

**Un hilo aparte los sondea**, y no es ceremonia: un refresco de sensores son
~9 ms, y hacerlo en cada fotograma limitaría la interfaz a unos 110 fps por sí
solo; el clima es una petición HTTP que puede tardar segundos. Cada dato tiene su
periodo —sensores 1 s, reproducción 3 s, clima 15 min— y la interfaz siempre
dibuja lo último que llegó, sin esperar a nadie.

Cuando un dato falta se **dice** («sin clima», «no disponible») en vez de dejar el
botón en blanco o mostrar un cero engañoso. Un sensor puede no existir porque
viene de otro equipo o porque es de LHM y el nivel 2 está apagado.

**Bug encontrado al probarlo**: `ButtonConfig::is_empty()` no miraba el widget, así
que un botón que solo tiene un reloj —sin etiqueta ni acción— se consideraba vacío
y la rejilla lo dibujaba como un hueco. Corregido en el núcleo.

**Los widgets ya se configuran desde el editor.** El selector de sensor ofrece
los que **están dando lecturas ahora mismo**, con su hardware delante
(«NVIDIA GeForce RTX 4080 · Temperatura»), en vez de pedir un identificador que
nadie se sabe de memoria. Si el botón tiene guardado un sensor que aquí no
existe —porque viene de otro equipo o es de LHM con el nivel 2 apagado— se
muestra su id y se dice que no está disponible, en vez de aparecer vacío.

Los umbrales son opcionales de verdad: una casilla decide si existen, porque
«sin umbral» y «umbral en cero» son cosas distintas.

### ✅ Fase 2 — secuencias y macros en el editor

Eran las dos últimas cosas que obligaban a editar el `deck-config.json` a mano.

**Secuencias**: cada paso se dibuja en su propio marco, con sus campos y sus
opciones —esperar, repetir, y «solo si el paso anterior fue bien»—. La condición
no se ofrece en el primer paso, porque no tiene anterior.

Un detalle de compatibilidad que importa: un botón con **una sola** acción se
sigue guardando como `action`, no como una lista de uno. Convertir todos los
botones a lista cambiaría el archivo de todos los usuarios sin ninguna razón. La
conversión ocurre solo al añadir un segundo paso, y se deshace al quitarlo.

**Macros**: se graban desde el editor con el mismo hook global del núcleo. Tres
decisiones:

- **Tope de 60 segundos.** La grabación instala un hook de teclado de todo el
  sistema; dejarlo activo porque alguien se olvidó de pararlo es a la vez consumo
  inútil y algo que nadie quiere corriendo sin darse cuenta. El botón muestra la
  cuenta atrás.
- **Los pasos van al borrador, no a la configuración.** Se puede descartar como
  cualquier otro cambio del editor.
- **Si se cambia de botón mientras se graba, la grabación se descarta y se dice.**
  Aplicar los pasos a otro botón sería peor que perderlos.

Al ofrecer `Macro` en la lista de tipos, un test empezó a fallar: usaba
precisamente ese tipo como ejemplo de «no editable». Falló por el motivo correcto
y se actualizó.

### ✅ Fase 2 — gestión de páginas

Crear, renombrar, redimensionar y borrar, en modo edición y debajo de la rejilla,
para que un cambio de tamaño se vea al momento sobre los botones reales.

**Lo delicado es borrar**, y por un motivo que no se ve: el número de página vive
en **dos sitios** —el campo `page` y el propio id del botón (`3-7`)—. Borrar una
página obliga a renumerar las siguientes en ambos, o quedan botones apuntando a
páginas que ya no existen. Hay un test que recorre todos los botones comprobando
que el prefijo del id coincide con su `page`.

No se deja borrar la última página: sin ninguna no habría nada que mostrar **ni
forma de crear la primera**.

**De paso, un hueco real**: `DeckConfig` no tenía constructor. `load()` devuelve
`None` cuando no hay archivo, así que una instalación limpia se quedaba mostrando
«no hay configuración» para siempre, sin forma de crear la primera. Ahora arranca
con un deck de 4×4 vacío y usable, que se escribe a disco al primer cambio.

Con una salvedad importante: eso pasa **solo** cuando no hay archivo. Si el
archivo existe pero está corrupto, la configuración queda en `None` y se muestra
el error, en vez de sustituirla por una vacía —que al primer guardado machacaría
un archivo que quizá solo tiene una coma de más y es recuperable a mano—.

### ✅ Fase 2 — ajustes

Ventana flotante con acento (10 predefinidos más color libre), tema, idioma,
sensores, arranque con Windows y diagnóstico.

Dos detalles que no son cosméticos:

- **La casilla de arranque lee el registro, no la configuración.** Alguien pudo
  quitarlo desde el Administrador de tareas, y la casilla tiene que reflejar la
  realidad y no lo que creemos haber dejado.
- **El bloque de sensores dice cuántos hay sin instalar nada** antes de ofrecer
  LibreHardwareMonitor. El nivel 2 suena a requisito y no lo es; sin ese texto,
  alguien podría instalar un programa entero para algo que ya funciona.

El arranque usa la clave `Run` del **usuario**, no la de la máquina, así que no
pide permisos de administrador. Tiene test de ida y vuelta —activa, comprueba y
restaura— marcado `#[ignore]`, porque escribe en el registro.

### ✅ Fase 2 — traducción (español / inglés)

Se hizo porque el selector de idioma recién añadido **no hacía nada**, y el propio
usuario tenía inglés configurado mientras veía una interfaz en español. Un ajuste
que no hace nada es peor que no tenerlo.

**El español es el idioma fuente**: los literales del código están en español y
`t()` los traduce al inglés. No hay claves abstractas tipo `boton.guardar`, que
obligan a saltar a otro archivo para saber qué dice una pantalla.

**El problema de ese enfoque, y su solución.** Con una tabla en vez de un `struct`
de campos, olvidar una traducción no da error de compilación. Por eso hay un test
que lee **el propio código fuente** de las pantallas con `include_str!`, busca
cada `t("…")` y comprueba que esté en la tabla. Se verificó que funciona metiendo
una cadena inventada a propósito: el test la señaló con archivo y texto exacto.

**Ese auditor tuvo dos puntos ciegos, y los dos dejaron pasar algo real.** Buscaba
`t("` pegado, así que no veía las llamadas que rustfmt parte en varias líneas; y no
resolvía la **continuación de línea** de Rust (una barra al final de línea que se
come el salto y el sangrado), con lo que comparaba contra un texto que en tiempo
de ejecución no existe. Con los dos arreglados destapó una cadena sin traducir que
llevaba ahí desde la pantalla de ajustes.

La lección no es sobre i18n: **una herramienta de auditoría en verde no prueba que
audite**. Hay que romperla a propósito para saber que mira.

Otros dos tests cubren lo que un descuido silencioso rompería: que no haya claves
repetidas —una taparía a la otra— y que **los marcadores coincidan** entre los dos
idiomas, porque perder un `{e}` al traducir dejaría el mensaje sin el dato.

`format!` exige un literal, así que las cadenas con marcadores usan `tf()`, que
traduce y sustituye en tiempo de ejecución. Los marcadores llevan **nombre**
(`{e}`, `{n}`) y no posición, porque el orden de las palabras cambia entre
idiomas y `{}` posicional se prestaría a barajarlos sin darse cuenta.

El cambio de idioma **se aplica al momento**, sin reiniciar.

### ✅ Fase 2 — carpetas (sub-decks)

Un botón puede contener otros. Es lo que hace que un deck escale más allá de las
casillas de una página, y era la última acción «de interfaz» sin implementar.

Decisiones:

- **Se dibuja encima de todo**, no dentro de la rejilla. Una carpeta es un
  contexto temporal; dejar la rejilla de fondo accesible invitaría a pulsar cosas
  de las dos a la vez.
- **Se cierra al pulsar un botón de dentro**, porque una carpeta es un menú y no
  una pantalla donde uno se queda. Escape también la cierra.
- **La rejilla se ajusta al número de botones.** Una carpeta de tres no debería
  verse como una página casi vacía.

Los botones de dentro son `FolderButton`, no `ButtonConfig`: no tienen id, ni
página, ni widget, ni atajo global. Es una limitación heredada del modelo de la
versión Electron y **se respeta tal cual**, porque cambiarla obligaría a migrar
el archivo de todos los usuarios. Como no tienen id, para la guarda de «no
ejecutar dos veces a la vez» se les deriva uno de su etiqueta.

Se editan desde el mismo panel, sin abrir otro nivel: son pocos campos y
anidar paneles sería peor.

Lo que el editor **aún no** cubre: ramas, cuentas atrás y RGB. Esos tipos no se ofrecen en la lista —ofrecerlos sin su interfaz dejaría
botones a medio configurar— pero sí se **muestran** si un botón ya los tiene, para
que se vea qué hay configurado aunque no se pueda cambiar desde aquí.

### ⚠️ Deuda pendiente: el robo de foco

Una macro (y un hotkey, y type-text) le escribe a **la ventana enfocada**. Si
VirtualDeck tiene el foco, se escribe a sí mismo. Hoy Electron hace `win.blur()` +
80 ms antes de enviar. `vd-core` **no puede resolverlo solo** porque no conoce la
ventana: queda como responsabilidad explícita de `vd-app` (Fase 2.1) llamar a algo
tipo `ceder_foco()` antes de invocar `macros::play`. Está documentado en el módulo
para que no se pase por alto al construir la UI.

### Nota de diseño: la carátula ya no es un data-URL

La versión Electron devolvía la portada como `data:image/png;base64,...` porque tenía
que meterla en un `<img>` del WebView. En Rust se devuelven **bytes crudos + mime**:
egui consume bytes directamente, así que se ahorra codificar y decodificar base64 en
cada tick de refresco. Es parte del "limpiar deuda técnica" acordado.

Mientras tanto `main` sigue en 0.5.1 y puede recibir hotfixes.
