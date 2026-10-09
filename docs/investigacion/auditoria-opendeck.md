# Auditoría OpenDeck — hardware, plugins y capacidades diferenciales

Informe de solo lectura sobre el repo clonado en
`C:\Users\andyf\code proyects\_referencias\OpenDeck` (Tauri 2 + Rust + SvelteKit).
Cubre el ítem 115 del roadmap («Compatibilidad multi-dock y revisión de OpenDeck»).

- Commit observado: `ca78774` (2026-10-03, clon superficial, árbol limpio).
- Versión auditada: v2.14.0. Fecha del análisis: 2026-10-09.
- **Licencia: OpenDeck es GPL-3.0.** Este informe describe conductas, formatos y
  flujos para reimplementar desde cero; no se transcribe su código ni debe
  reutilizarse en VirtualDeck.
- Informe previo relacionado: `_referencias/informes/opendeck.md` (2026-10-03,
  protocolo del host de plugins en detalle). Este documento no lo repite: lo
  referencia y se centra en hardware, SDK/distribución, comparativa y roadmap.

---

## 1. Dispositivos y hardware soportados

### 1.1 Conclusión: solo Elgato nativo

`README.md:10`: solo el hardware de Elgato está soportado oficialmente; el resto
va por plugins. El historial lo confirma:
`src-tauri/bundle/opendeck.metainfo.xml` (v2.5.0): los dispositivos no-Elgato
dejaron de funcionar de serie y pasaron a plugin de soporte; (v2.4.4): última
versión con Mirabox. **Loupedeck (Live, Live S, CT), Razer Stream Controller,
AVerMedia: cero menciones en el código.** Tacto (móvil como deck) solo existe
como plugin externo (`us.rivul.tacto`, `src/components/PluginManager.svelte:385-404`).

### 1.2 Driver y registro central

No hay directorio de drivers por fabricante. Hay un único driver:

- `src-tauri/src/elgato.rs` (287 líneas): mapa `ELGATO_DEVICES`
  (id → conexión), `initialise_devices()`, `init()`, `update_image`,
  `clear_screen`, `set_brightness`, `reset_devices`.
- Registro global que ven frontend y plugins: `DEVICES` (`DashMap<String,
  DeviceInfo>`) en `src-tauri/src/shared.rs:48`, con
  `DeviceInfo { rows, columns, encoders, touchpoints, infobars, type }`.
- La tabla de modelos vive en el crate externo `elgato-streamdeck 0.13.2`
  (`src-tauri/Cargo.toml:23`): `VID 0x0fd9`, `enum Kind` con 16 variantes,
  `from_vid_pid()`, y por modelo `key_count / row_count / column_count /
  encoder_count / touchpoint_count / lcd_strip_size / key_image_format /
  lcd_image_format`. OpenDeck solo mapea cada `Kind` a su `type` numérico del
  SDK (`elgato.rs:149-157`) y genera el id `sd-{serial}`.

### 1.3 Lista completa de modelos

VID siempre `0x0fd9`. `type` = el número que los plugins ven en el SDK.

| Modelo comercial | PID | `type` | Capacidad |
|---|---|---|---|
| Stream Deck Original | `0060` | 0 | 15 teclas LCD 5×3 |
| Original V2 | `006d` | 0 | 15 teclas 5×3 |
| MK.2 | `0080` | 0 | 15 teclas 5×3 |
| MK.2 Scissor | `00a5` | 0 | 15 teclas, interruptores de tijera |
| MK.2 Module | `00b9` | 0 | 15 teclas, variante de integración |
| Mini | `0063` | 1 | 6 teclas 2×3 |
| Mini MK.2 | `0090` | 1 | 6 teclas 2×3 |
| Mini Discord ed. | `00b3` | 1 | 6 teclas 2×3 |
| Mini MK.2 Module | `00b8` | 1 | 6 teclas 2×3 |
| XL | `006c` | 2 | 32 teclas 4×8 |
| XL V2 | `008f` | 2 | 32 teclas 4×8 |
| XL V2 Module | `00ba` | 2 | 32 teclas 4×8 |
| Pedal | `0086` | 5 | 3 pedales 1×3, sin pantalla (`is_visual() == false`) |
| Plus | `0084` | 7 | 8 teclas 2×4 + 4 diales pulsables + tira táctil LCD 800×100 |
| Neo | `009a` | 9 | 8 teclas 2×4 + 2 touchpoints LED RGB + 1 infobar 248×58 |
| Plus XL | `00c6` | 13 | 36 teclas 4×9 + 6 diales + tira vertical 100×1200 |

Eventos de entrada que el driver traduce (`elgato.rs:211-232`): `ButtonDown/Up`,
`TouchPointDown/Up` (se presentan como teclas tras `key_count`),
`EncoderTwist/Down/Up`, `TouchScreenPress/LongPress` (la tira se trocea en
segmentos de 200 px; coordenadas empaquetadas como `(x/200, x%200, y)`).

### 1.4 Protocolos

- **USB/HID y nada más**: crate `hidapi 2.6`, conexión por
  `list_devices_async`/`connect`, lectura en bucle con timeout de 100 ms y
  re-escaneo de dispositivos cada 10 s (`main.rs:196-199`). Sin `rusb`, sin
  WebUSB/WebHID, sin serie, sin red nativa.
- **Linux**: reglas udev propias (`src-tauri/bundle/40-streamdeck.rules`, 16
  PIDs, `MODE 0660 TAG uaccess`) más script instalador.
- **Frontend ↔ backend**: comandos Tauri (`invoke_handler!` en `main.rs:72-109`:
  `get_devices`, `update_image`, `profiles::*`, `settings::*`…); la imagen se
  sube como canvas JPEG en data-URL (`src/lib/rendererHelper.ts:179`).
- **Backend ↔ plugins**: WebSocket local + HTTP en `PORT_BASE` dinámico desde
  57116 (detalle en el informe previo).
- **Hardware de terceros vía plugins**: `manifest.device_namespace` reserva los
  2 primeros caracteres del id de dispositivo (`DEVICE_NAMESPACES`,
  `plugins/mod.rs:36`); `register_device` valida el prefijo y el host rutea
  `setImage`/`setBrightness` al plugin dueño en vez de al driver Elgato. La
  opción `disableelgato` cede incluso el prefijo `sd` a una implementación
  alternativa (`elgato.rs:249-256`).

### 1.5 Formatos de imagen por modelo

Conversión en el crate upstream (`resize` triangular, rotación/espejo por
formato, BMP o JPEG q90); OpenDeck añade rotaciones 90/180/270, escritura de
diales por ventanas de 200 px y `resize_exact(248, 58)` para la infobar.

| Familia | Tecla | LCD / tira |
|---|---|---|
| Original | BMP 72×72 | — |
| Original V2 / MK.2 / Scissor / Module | JPEG 72×72 | — |
| Mini (todas) | BMP 80×80, rotado 90° | — |
| XL (todas) y teclas del Neo | JPEG 96×96 | Neo: JPEG 248×58 rotado 180° |
| Plus | JPEG 120×120 | JPEG 800×100 |
| Plus XL | JPEG 120×120, rotado 270° | JPEG 100×1200, rotado 270° |
| Pedal | sin imagen | — |

---

## 2. Arquitectura de plugins y SDK

El protocolo (eventos, registro, ciclo `keyDown`/`setImage`/…) está documentado
en `_referencias/informes/opendeck.md` §§3-6 y sigue vigente en este commit. Aquí
solo el resumen operativo más lo que aquel informe no cubría (SDK, distribución,
dispositivos virtuales).

### 2.1 Manifiesto

`manifest.json` por plugin (`plugins/manifest.rs`): `Name`, `Author`, `Version`,
`Icon` (resuelve `.svg` > `@2x.png` > `.png`), `Actions[]`, `OS[]`
(`windows`/`mac`/`linux`, decide el runtime), uno de `CodePath` /
`CodePathWin|Mac|Lin` / `CodePaths{triple: ruta}`. Opcionales: `Category`,
`PropertyInspectorPath`, `DeviceNamespace` (dispositivo virtual),
`ApplicationsToMonitor` (para `applicationDidLaunch/Terminate`),
`HasSettingsInterface`. Acepta `PascalCase` (Elgato) o `camelCase` y fusiona
`manifest.{windows|macos|linux}.json` por SO. Ejemplo real:
`plugins/com.amansprojects.starterpack.sdPlugin/assets/manifest.json`.
Cada acción declara `Controllers [Keypad|Encoder]`, `States[]` (imagen, título,
fuente, colores), `SupportedInMultiActions`, `VisibleInActionsList`,
`DisableAutomaticStates` y bloque `Encoder { Icon, StackColor,
TriggerDescription { Push, Rotate, Touch, LongTouch }, Background, Layout }`.

### 2.2 Runtime y ciclo de vida (sin sandbox)

El lanzador (`plugins/mod.rs:71-356`) elige runtime por extensión del `CodePath`:
`.html` → webview oculta de Tauri; `.js/.mjs/.cjs` → `node` ≥ 20; `.exe` en
Linux/macOS → `wine`; resto → binario nativo. Argumentos universales:
`-port -pluginUUID -registerEvent registerPlugin -info <JSON>`. Primer mensaje
por WebSocket: `registerPlugin` (o `registerPropertyInspector` para los PI).
**No hay sandbox ni permisos**: proceso hijo nativo con pleno acceso; solo
validación de contexto (un plugin solo toca instancias de su uuid), muerte con
el padre en Linux, ventana oculta en Windows, stdout a log por plugin y cola de
mensajes hasta el registro. Desactivar = matar el proceso o cerrar la webview.

### 2.3 SDK y distribución

- **SDK primario: crate Rust `openaction 2.6`** (docs en
  `openaction.amankhanna.me`): `register_action(X).await; run(args).await` con
  `impl Action { key_down / key_up / dial_down / dial_up / dial_rotate(ticks) }`
  más `set_title / set_image / …`. Sin CLI ni paquete npm propios.
- **Compatibilidad Elgato JS**: cualquier plugin/PI HTML que implemente
  `connectElgatoStreamDeckSocket(port, uuid, event, info, actionInfo)` funciona
  (OpenDeck prefiere `connectOpenActionSocket` si existe).
- **Empaquetado**: ZIP con carpeta `<uuid>.sdPlugin/` + `manifest.json` en raíz;
  acepta `.streamDeckPlugin`/`.zip`. El ejemplo se compila con script Deno
  (`copy assets` + `cargo install --target <triple>`).
- **Instalación**: desde URL (catálogo open-source en GitHub, archivo de la App
  Store de Elgato re-empaquetado, releases de GitHub, deep-link
  `openaction://plugins/message/<id>`) o archivo local; extrae a
  `<config>/plugins/<uuid>.sdPlugin` con rollback a `temp/` si falla. Gestión:
  listar, borrar, recargar, `reload_plugin` por CLI y auto-upgrade de builtins
  por semver.
- **Property Inspector**: HTML/CSS/JS sin framework impuesto; el host crea un
  `<iframe>` oculto por instancia servido por `tiny_http` en `PORT_BASE+2`, que
  inyecta el puente de conexión y shims de `window.open`/`fetch`. El PI abre su
  propio WebSocket y lee/escribe ajustes con `setSettings` / `didReceiveSettings`.
- Solo hay **un plugin embebido**: el Starter Pack (5 acciones: Run Command, Open
  URL, Simulate Input, Switch Profile, Device Brightness; todas Keypad+Encoder).
  Todo lo demás (OBS, Spotify, Discord…) vive fuera del repo.

---

## 3. Comparativa: OpenDeck frente a VirtualDeck

### 3.1 Lo que OpenDeck tiene y VirtualDeck aún no

1. **Host de plugins compatible con Elgato** (roadmap 60/83). OpenDeck ejecuta
   `.streamDeckPlugin` sin modificar (Node, HTML, nativo) con PI propio.
   VirtualDeck solo tiene el prototipo tras `VD_PLUGIN_PROTO` (fase 0 medida en
   T-PLG-00: 5 plugins reales se registran en 0,1-0,8 s); falta la decisión del
   dueño para el MVP. Es el diferencial mayor.
2. **Familia Elgato completa** (roadmap 59): Plus (4 diales + tira 800×100), Neo
   (touchpoints + infobar), Pedal, Plus XL (6 diales + tira vertical). VirtualDeck
   tiene tabla Mirabox de 12 modelos y solo el N3 verificado.
3. **Dispositivos virtuales por plugin** (`DeviceNamespace`): terceros aportan
   hardware sin tocar el core. Idea portable: la tabla Mirabox de VirtualDeck
   podría exponerse por este protocolo en vez de crecer a mano.
4. **Dial stacks y layouts de encoder** (`$A0/$A1/$B1/$B2/$C1/$X1` + custom por
   fichero, `setFeedback`/`setFeedbackLayout` en vivo, `TriggerDescription`
   Push/Rotate/Touch/LongTouch por acción). VirtualDeck pinta iconos en teclas
   físicas y tiene sliders táctiles continuos, pero sin concepto de pila de
   funciones por perilla ni descripciones de gesto por acción.
5. **Esquema de deep-links** (`opendeck://`, además `openaction://` y
   `streamdeck://`): instalación de plugins por enlace y `didReceiveDeepLink`
   por plugin. VirtualDeck no tiene esquema propio (la tienda instala desde la
   app; atar a 105c).
6. **Sueño de dispositivos** (`device_sleep.rs` + `power_events.rs`): atenuado
   por inactividad configurable, al bloquear sesión, wake del Plus, teclas
   suprimidas dormido. VirtualDeck no atenúa docks por inactividad.
7. **Tienda triple de plugins** (catálogo open-source + archivo Elgato +
   fichero/URL) con detalle y logs por plugin. La tienda de VirtualDeck cubre
   perfiles (manifiesto v2 con icono/portada/capturas); la pestaña de plugins
   espera al MVP (105c).

### 3.2 Paridades (no son hueco)

- **Perfiles por app en foco**: OpenDeck vigila la ventana activa cada 250 ms
  (`application_watcher.rs`) con fallback `opendeck_default`. VirtualDeck ya
  tiene auto-perfiles (Bloque 7). Verificar equivalencia, no implementar.
- **Multi-acciones con retardos por hijo + Toggle Action**: OpenDeck secuencia
  `keyDown/Up` con `delays[]` y rota estados por pulsación. VirtualDeck cubre el
  caso con macros (`playMacro` en el núcleo) y `toggledIds`; solo faltaría la
  forma compuesta «un botón = secuencia con pausas» si se pide.
- **Backup/restore** (zip del config, escritura atómica `.temp`/`.bak`):
  VirtualDeck ya tiene backups y migraciones versionadas.
- **Brillo global y por dispositivo**: VirtualDeck lo fusiona en el driver y lo
  guarda al soltar; equivalente.
- **Widgets en vivo**: ninguno de los dos los trae de serie. OpenDeck lo deja a
  cada plugin (`setTitle`/`setImage` por polling propio); **VirtualDeck va por
  delante** (widgets propios: reloj, variable, sensores, clima compartido con
  la barra).
- **Disparadores/automatización**: OpenDeck solo tiene perfiles por app +
  eventos de lanzamiento. **VirtualDeck va por delante** (hora/días/sensor,
  `useDisparadores`).
- **Háptica**: OpenDeck no tiene (`haptic|vibrate` = 0 resultados). No es
  diferencial; no perseguir.
- **Grabadora de macros**: ninguno la tiene en el core.

### 3.3 Lo que VirtualDeck tiene y OpenDeck no (no ceder)

Mando móvil propio (OpenDeck delega en plugin Tacto), barra flotante, kiosko con
PIN, RGB vía OpenRGB, galería con ficha de riesgo (`resumirRiesgo`), panel de
música SMTC con vídeo de la ventana que suena, estética DOT/480, i18n ES/EN con
guardián, y 7 guardianes de `npm run check`. La tienda de perfiles con manifiesto
v2 no tiene equivalente.

---

## 4. Recomendaciones para VirtualDeck v0.15+

Ordenadas por valor/coste. Referencian ítems del roadmap.

1. **R1 — Elgato Plus primero (concreta el 59).** De la familia Elgato, el Plus
   es el diferencial real (diales + tira táctil; el resto son «más teclas»).
   Reutilizar la abstracción de perillas del N3; la tabla §1.5 da los formatos
   exactos (teclas JPEG 120×120, tira JPEG 800×100). Regla vigente: sin hardware,
   sin verificar.
2. **R2 — Decidir el MVP de plugins (60/83/105c).** El protocolo ya está medido
   (T-PLG-00) y este informe confirma que el modelo OpenDeck es reimplementable
   sin su código. Propuesta de alcance mínimo: runtimes Node + HTML, teclas,
   arrastrar el `.streamDeckPlugin`, PI en ventana propia, aviso de riesgo como
   la galería. Perillas y catálogo después.
3. **R3 — Dial stacks para las perillas del N3 (nuevo, barato, sin hardware
   nuevo).** Portar el concepto §3.1.4: cada perilla rota entre una pila
   (volumen → brillo → scroll…), pulsar cambia de capa o mutea, y cada acción
   declara qué gesto usa (Push/Rotate). Mostrar la capa activa en la UI junto a
   la perilla. Es la pieza de OpenDeck con más valor por línea.
4. **R4 — Dispositivos virtuales (nuevo, prepara el 60).** Definir el prefijo de
   id + `register_device`/`setImage`/`setBrightness` antes del MVP, de modo que
   futuros docks de terceros entren por plugin y la tabla Mirabox deje de crecer
   a mano.
5. **R5 — Verificar paridad de auto-perfiles (5 minutos).** Comparar el watcher
   de 250 ms + fallback de OpenDeck con los auto-perfiles del Bloque 7; anotar
   diferencias (¿perfil por defecto por dispositivo?) en vez de reimplementar.
6. **R6 — Sueño de docks (pequeño).** Atenuar/dormir el N3 por inactividad y al
   bloquear sesión, con wake al pulsar. Sin equivalente actual; coste bajo.
7. **R7 — Esquema `virtualdeck://` (atar a 105c).** Instalación de perfiles y
   (cuando exista) plugins por enlace, reutilizando la ficha de riesgo. Coste
   bajo, ganancia de distribución.
8. **R8 — Lo que NO hay que copiar.** Sin sandbox no hay MVP (OpenDeck no tiene;
   VirtualDeck sí tiene lógica de aviso de riesgo: extenderla a plugins según lo
   medido en el 83 — WS solo en 127.0.0.1, un proceso por plugin, HTML con
   sandbox, `.exe` con aviso reforzado). Sin Wine. Sin colores completos en
   imágenes de plugins salvo decisión del dueño (tensión con la estética DOT ya
   anotada en el 83).
9. **R9 — Hardware que no hay que perseguir.** Loupedeck, Razer y AVerMedia no
   los soporta ni OpenDeck (cero menciones); si algún día importan, que entren
   por R4, no por driver propio. Tiras táctiles continuas y Pedal: solo con
   hardware en mano.

---

## 5. Fuentes

- `src-tauri/src/elgato.rs`, `src-tauri/src/shared.rs`,
  `src-tauri/src/plugins/{mod,manifest,info_param,webserver}.rs`,
  `src-tauri/src/plugins/info_param.rs`, `src-tauri/src/events/{inbound,outbound}/`,
  `src-tauri/src/application_watcher.rs`, `src-tauri/src/{device_sleep,power_events}.rs`,
  `src-tauri/src/store/{mod,profiles}.rs`, `src-tauri/Cargo.toml`,
  `src-tauri/bundle/{opendeck.metainfo.xml,40-streamdeck.rules}`,
  `src/lib/{DeviceInfo,rendererHelper}.ts`, `src/lib/ports.ts`,
  `src/components/{PluginManager,PropertyInspectorView,DeviceView}.svelte`,
  `plugins/com.amansprojects.starterpack.sdPlugin/`, `README.md`, `AGENTS.md`.
- Upstream: crate `elgato-streamdeck 0.13.2` (`src/info.rs`, `src/images.rs`),
  crate `openaction 2.6`, crate `streamdeck-strip-render`.
