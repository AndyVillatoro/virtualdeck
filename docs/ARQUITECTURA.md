# Mapa de arquitectura — VirtualDeck

> Mapa organizacional del código bajo el principio de **responsabilidad única (SRP)**:
> cada módulo/clase/feature aparece con *una* frase que describe de qué es responsable.
> Si un archivo necesita más de una frase, es candidato a dividirse.
>
> Este documento es el **índice maestro** para el roadmap de mejoras: cada apartado
> de [ROADMAP.md](ROADMAP.md) referencia una entrada de acá.
>
> Mantener al día: al agregar/mover un módulo, actualizar su fila. Convención de
> estado SRP: ✅ responsabilidad clara · 🟡 hace de más (dividir) · 🔴 acoplado.

Stack: **Electron 33 + React 18 + Vite 5 + TypeScript**. Dos procesos:
`electron/` (main, Node) y `src/` (renderer, navegador). Puente: `electron/preload`.

> 🔒 **Las capas de este mapa se verifican automáticamente** con `npm run lint:arch`
> (dependency-cruiser, config en `.dependency-cruiser.cjs`). Romper un límite (un ciclo,
> main importando renderer, un componente importando una pantalla, etc.) es **error**.

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
| `tienda.ts` | Ventana `#tienda`: abrir/enfocar/cerrar + reavisar config a la tienda. | ✅ |
| `sensors.ts` | Consultar LibreHardwareMonitor (HTTP) + registrar URL ACL. | ✅ |
| `ps-helpers.ts` | Ejecutar PowerShell con prefijo UTF-8 (parser de `param()`). | ✅ |

### IPC por dominio (`electron/main/ipc/`)
Cada archivo registra los handlers de **un** dominio. Responsabilidad: traducir
mensajes IPC ↔ módulo correspondiente. Sin lógica de negocio propia.

`audioIpc` · `mediaIpc` · `macroIpc` · `configIpc` · `windowIpc` · `appIpc` ·
`pageIpc` · `dialogIpc` · `launcherIpc` · `rgbIpc` · `sensorsIpc` · `logIpc` · `updateIpc` ·
`floatingBarIpc` · `tiendaIpc` (puentes tienda→principal: `tienda:import`/`resultado`; eventos `tienda:apply`/`hecho`)

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
| `MainB.tsx` | Grilla principal: compone barra, rejilla, paneles y overlays; la ejecución, los atajos y cada pieza viven en `main/`. | ✅ |
| `EditorB.tsx` | Editor de un botón: posee el estado y arma cabecera, pasos y formulario con piezas de `editor/`. | ✅ |
| `FullscreenB.tsx` | Modo panel a pantalla completa (tablet/monitor dedicado). | ✅ |
| `WallpaperB.tsx` | Elegir el fondo del deck. | ✅ |
| `RGBManagerB.tsx` | Configurar perfiles y dispositivos RGB. | 🟡 (760 líneas) |
| `editor/actionData.ts` | Datos puros del editor (tipos de acción, presets). | ✅ |
| `editor/MacroEditor.tsx` | Editor manual de pasos de macro. | ✅ |
| `editor/botonConfigurado.ts` | Dice si un botón cuenta como configurado (función pura). | ✅ |
| `editor/CabeceraEditorB.tsx` | Cabecera del editor: título y selector de modo 1×1/2×2. | ✅ |
| `editor/FranjaPasosEditorB.tsx` | Franja de pasos 01–03 o aviso de modo 2×2 (+`STEPS`). | ✅ |
| `editor/FormularioPasoEditorB.tsx` | Cuadrantes 2×2 o el paso 0/1/2 del formulario. | ✅ |
| `main/atajosSeleccion.ts` | Atajos de selección múltiple (hook + resolutor puro). | ✅ |
| `main/BarraSuperiorMain.tsx` | `TitleBar` de la principal con su cableado de config. | ✅ |
| `main/AvisosContextuales.tsx` | Hints contextuales (uno a la vez, descartables). | ✅ |
| `main/PanelesMusica.tsx` | Panel de música lateral (una instancia por lado). | ✅ |
| `main/CeldaPrincipal.tsx` | Una celda de la rejilla principal con su cableado. | ✅ |
| `TiendaB.tsx` | Raíz de la ventana `#tienda`: carga config y delega en `tienda/`. | ✅ |
| `tienda/ContenidoTienda.tsx` | Manifiesto, selección, ficha e instalación (pide, no aplica). | ✅ |
| `tienda/BarraTienda.tsx` | Buscador + filtros por tipo/app/etiqueta. | ✅ |
| `tienda/ListaTienda.tsx` | Filas con insignia INSTALADO / UPDATE. | ✅ |
| `tienda/FichaTienda.tsx` | Nota del autor + ficha de riesgo + botones de instalar. | ✅ |
| `tienda/tiendaUtils.ts` | Estados, filtros e instalados desde config (puro). | ✅ |

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
| `tiendaAplicar.ts` | Validar y aplicar un pedido de la tienda (puro + callbacks). | ✅ |
| `galeriaComun.ts` | Versiones semver + manifiesto oficial (compartido galería/tienda). | ✅ |

---

## 6. Datos y diseño

| Módulo | Responsabilidad única | SRP |
|--------|----------------------|-----|
| `src/design.ts` | Tokens (color, radius, shadow, glifos). Fuente de verdad visual. | ✅ |
| `src/types.ts` | Tipos compartidos renderer↔main. | ✅ |
| `src/data/links.ts` | Enlaces externos (repo, docs, donaciones). | ✅ |
| `src/components/settings/SoporteSection.tsx` | El apartado «Apoyar el proyecto» de los ajustes. | ✅ |
| `src/data/brandIcons.ts` | Catálogo de íconos de marca. | ✅ |
| `src/data/brandIconTypes.ts` | Tipos y geometría liviana del pack (sin los bitmaps). | ✅ |
| `src/utils/catalogoMarcas.ts` | Carga diferida del catálogo (`import()` + hook reactivo). | ✅ |

---

## Cómo se conecta una acción (flujo de referencia)

1. Usuario hace clic en `ButtonCell` → `MainB` llama `executeAction` (`utils/actions.ts`).
2. `actions.ts` interpola variables y, según el tipo, invoca `window.electronAPI.<dominio>`.
3. El preload reenvía por IPC → `ipc/<dominio>Ipc.ts` → módulo del main (`audio`/`media`/`launcher`/…).
4. El módulo ejecuta (PowerShell/WinRT/SDK) y devuelve resultado; los errores van a `logger`.
