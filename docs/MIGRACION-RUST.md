# Migración a Rust nativo — Plan maestro

> **Documento vivo.** Es la fuente de verdad de la migración. Si retomás el proyecto
> (vos u otro LLM/editor) después de meses, **leé este archivo primero** y luego
> [CLAUDE.md](../CLAUDE.md) y [ARQUITECTURA.md](ARQUITECTURA.md).
>
> Estado: **Fase 1 completa. Fase 2 arrancada** — el spike de entrada de texto
> pasa, así que la elección de egui + winit se sostiene.
> Rama: `rewrite/rust`. Última actualización: 2026-08-15.

---

## 0. Retomar acá (resumen de 30 segundos)

```bash
git checkout rewrite/rust
export PATH="$HOME/.cargo/bin:$PATH"        # o abrir una terminal nueva
cargo test --workspace -- --test-threads=1  # 132 tests, deben dar todos verde
cargo run -p vd-cli -- run list             # botones ejecutables de tu config real
cargo run -p vd-cli -- help                 # ver qué se puede ejercitar ya
```

**Dónde quedó**: el núcleo (`vd-core`) tiene 9 módulos funcionando y verificados
contra hardware real. No existe UI todavía — eso es la Fase 2.

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

**Lo próximo, concreto**: portar la primera pantalla real (`MainB`: rejilla de
botones desde el `deck-config.json`, con clic que dispara `actions::run_sequence`).
Los dos riesgos de la Fase 2 ya están descartados: la entrada de texto funciona y
el renderer está elegido (**wgpu**, decidido midiendo).

Queda pendiente pasar el spike de texto **a mano** para cubrir el IME de verdad:
`cargo run -p vd-app --bin spike_texto -- manual`.

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
| IME real (chino/japonés, panel de emoji) | ⬜ pendiente de probar a mano |

**Tres cosas se aprendieron por el camino**, y ninguna se habría visto leyendo
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

### ✅ Fase 2 — renderer: wgpu, decidido midiendo

La duda era wgpu contra glow, y la premisa de partida era que wgpu sería
demasiado pesado para un instalador por debajo de 20 MB. **La premisa era falsa.**

Se montaron los dos backends dibujando **la misma escena** —una rejilla de 5×3
botones con glifos dot-matrix, 525 círculos por fotograma— y se midió:

| Backend | Binario en release | Ritmo |
|---|---|---|
| glow (OpenGL / WGL) | 2,56 MB | 144 fps |
| wgpu (Direct3D 12) | 4,77 MB | 144 fps |

Empate en rendimiento (los dos limitados por vsync) y 2,2 MB de diferencia sobre
un presupuesto de 20 MB. El tamaño, que parecía el factor decisivo, resultó no
serlo. **Decide la robustez**: con D3D12 hay respaldo por software —verificado,
`Microsoft Basic Render Driver`— cuando no hay GPU utilizable: sesión remota,
máquina virtual o driver roto. OpenGL en Windows no tiene equivalente fiable;
sin drivers del fabricante cae a una implementación 1.1 que no sirve. Ese riesgo
es real para este proyecto: la versión Electron ya arrastraba un
`disableHardwareAcceleration()` por problemas con monitores virtuales.

Como argumento secundario, el código de wgpu es bastante más simple: comparar
`spike_render_wgpu.rs` con `spike_render_glow.rs` lo deja claro, y glutin obliga
a elegir el formato de píxel antes de que la ventana exista del todo.

Los dos backends quedan en el repositorio tras features de cargo, para poder
repetir la medición si cambia alguna premisa.

**Dos tropiezos que valen como aviso:**

- `egui-wgpu 0.32` exige **wgpu 25**, no la última. Fijar la 27 arrastra un
  `naga` incompatible y el error que sale —`String: WriteColor no satisfecho`,
  dentro de `naga`— no se parece en nada a la causa.
- `wgpu::Limits::downlevel_defaults()` topa las texturas en **2048 px**. Cualquier
  pantalla moderna con escalado ya pide más, y la superficie falla al
  configurarse. Hay que usar los límites del adaptador real.

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
