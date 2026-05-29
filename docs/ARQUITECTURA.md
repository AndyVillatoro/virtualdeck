# Mapa de arquitectura — VirtualDeck

> Mapa organizacional del código bajo el principio de **responsabilidad única (SRP)**:
> cada módulo/clase/feature aparece con *una* frase que describe de qué es responsable.
> Si un archivo necesita más de una frase, es candidato a dividirse.
>
> Este documento es el **índice maestro** para el roadmap de mejoras: cada apartado
> de [ROADMAP-MEJORAS.md](ROADMAP-MEJORAS.md) referencia una entrada de acá.
>
> Mantener al día: al agregar/mover un módulo, actualizar su fila. Convención de
> estado SRP: ✅ responsabilidad clara · 🟡 hace de más (dividir) · 🔴 acoplado.

Stack: **Electron 33 + React 18 + Vite 5 + TypeScript**. Dos procesos:
`electron/` (main, Node) y `src/` (renderer, navegador). Puente: `electron/preload`.

---

## 1. Proceso principal (`electron/main/`)

Node.js con acceso al SO. No conoce React. Expone todo vía IPC.

| Módulo | Responsabilidad única | SRP |
|--------|----------------------|-----|
| `index.ts` | Bootstrap: crear app, ventana y registrar IPC. ~95 líneas. | ✅ |
| `configManager.ts` | Cargar / guardar / respaldar la configuración en `userData`. | ✅ |
| `windowManager.ts` | Crear `BrowserWindow` y persistir su tamaño/posición. | ✅ |
| `trayManager.ts` | Ícono de bandeja, menú contextual y atajos globales. | ✅ |
| `logger.ts` | Log rotativo en `userData/logs` (512KB, 1 backup). | ✅ |
| `audio.ts` | Cambiar dispositivo de audio por defecto (PowerShell + C# IPolicyConfig). | ✅ |
| `media.ts` | Leer/controlar la reproducción actual vía SMTC (WinRT). | ✅ |
| `macro.ts` | Grabar macros (uiohook-napi) y reproducirlas (PowerShell). | ✅ |
| `rgb.ts` | Control RGB vía OpenRGB SDK. | ✅ |
| `launcher.ts` | Ejecutar apps / scripts / abrir URLs y carpetas. | ✅ |
| `sensors.ts` | Consultar LibreHardwareMonitor (HTTP) + registrar URL ACL. | ✅ |
| `ps-helpers.ts` | Ejecutar PowerShell con prefijo UTF-8 (parser de `param()`). | ✅ |

### IPC por dominio (`electron/main/ipc/`)
Cada archivo registra los handlers de **un** dominio. Responsabilidad: traducir
mensajes IPC ↔ módulo correspondiente. Sin lógica de negocio propia.

`audioIpc` · `mediaIpc` · `macroIpc` · `configIpc` · `windowIpc` · `appIpc` ·
`pageIpc` · `dialogIpc` · `launcherIpc` · `rgbIpc` · `sensorsIpc` · `logIpc` · `updateIpc`

---

## 2. Puente (`electron/preload/`)

| Módulo | Responsabilidad única | SRP |
|--------|----------------------|-----|
| `index.ts` | Exponer `window.electronAPI` tipado al renderer (contextBridge). | ✅ |

---

## 3. Renderer — pantallas (`src/screens/`)

Cada pantalla es una vista de pantalla completa conmutada por `App`.

| Pantalla | Responsabilidad única | SRP |
|----------|----------------------|-----|
| `MainB.tsx` | Grilla principal: render de botones, ejecución, widgets, toasts, hints. | 🟡 (grande; candidato a extraer sub-componentes) |
| `EditorB.tsx` | Editor de un botón: acción, estilo, ícono, widget, disparadores. | 🟡 (1900+ líneas; dividir por sección) |
| `FullscreenB.tsx` | Modo panel a pantalla completa (tablet/monitor dedicado). | ✅ |
| `WallpaperB.tsx` | Elegir el fondo del deck. | ✅ |
| `RGBManagerB.tsx` | Configurar perfiles y dispositivos RGB. | 🟡 (760 líneas) |
| `editor/actionData.ts` | Datos puros del editor (tipos de acción, presets). | ✅ |
| `editor/MacroEditor.tsx` | Editor manual de pasos de macro. | ✅ |

---

## 4. Renderer — componentes (`src/components/`)

| Componente | Responsabilidad única | SRP |
|------------|----------------------|-----|
| `TitleBar.tsx` | Barra superior: acciones, settings flyout, ayuda. | 🟡 (settings hace de más) |
| `ButtonCell.tsx` | Una celda de botón (drag, long-press, multi-select, widget). | ✅ |
| `Onboarding.tsx` | Tutorial inicial de primera ejecución. | ✅ |
| `Hint.tsx` | Mensaje flotante contextual descartable. | ✅ |
| `SearchOverlay.tsx` | Búsqueda global de botones (Ctrl+K). | ✅ |
| `DotText.tsx` / `DotLabel.tsx` | Tipografía dot-matrix de identidad. | ✅ |
| `Wallpaper.tsx` | Render del fondo elegido. | ✅ |
| `WeatherWidget.tsx` | Widget de clima (Open-Meteo). | ✅ |
| `SensorPanel.tsx` | Tarjetas/agrupación de sensores. | ✅ |
| `VDIcon.tsx` | Wrapper de íconos (lucide-react). | ✅ |
| `BrandIconPicker` / `BrandIconEditor` / `BrandIconDisplay` | Íconos de marca: elegir / dibujar / mostrar. | ✅ |
| `settings/RGBSection` · `settings/SensorsSection` | Secciones extraídas de TitleBar. | ✅ |
| `help/HelpAboutPanel.tsx` | Panel Ayuda y Acerca de. | ✅ |

---

## 5. Renderer — lógica y utilidades (`src/utils/`)

| Módulo | Responsabilidad única | SRP |
|--------|----------------------|-----|
| `actions.ts` | Ejecutar una acción de botón + interpolación `{var}`. | 🟡 (muchos tipos; ok por ahora) |
| `theme.tsx` | Proveer tokens de tema (claro/oscuro/sistema). | ✅ |
| `i18n.tsx` | Proveer traducción ES/EN (`useT`, diccionarios). | ✅ |
| `nowPlaying.tsx` | Polling centralizado de la reproducción actual. | ✅ |
| `sensors.ts` | Hook de sensores + evaluación de condiciones. | ✅ |
| `sound.ts` | Reproducir el sonido al presionar. | ✅ |
| `logger.ts` | Bridge de errores del renderer → log del main. | ✅ |
| `bugReport.ts` | Armar el issue de GitHub pre-llenado. | ✅ |
| `configMigration.ts` | Versionar/migrar/validar la config. | ✅ |

---

## 6. Datos y diseño

| Módulo | Responsabilidad única | SRP |
|--------|----------------------|-----|
| `src/design.ts` | Tokens (color, radius, shadow, glifos). Fuente de verdad visual. | ✅ |
| `src/types.ts` | Tipos compartidos renderer↔main. | ✅ |
| `src/data/links.ts` | Enlaces externos (repo, docs, donaciones). | ✅ |
| `src/data/brandIcons.ts` | Catálogo de íconos de marca. | ✅ |

---

## Cómo se conecta una acción (flujo de referencia)

1. Usuario hace clic en `ButtonCell` → `MainB` llama `executeAction` (`utils/actions.ts`).
2. `actions.ts` interpola variables y, según el tipo, invoca `window.electronAPI.<dominio>`.
3. El preload reenvía por IPC → `ipc/<dominio>Ipc.ts` → módulo del main (`audio`/`media`/`launcher`/…).
4. El módulo ejecuta (PowerShell/WinRT/SDK) y devuelve resultado; los errores van a `logger`.
