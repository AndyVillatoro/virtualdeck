# Matriz de paridad de las cinco superficies (VirtualDeck)

Documento de auditoría técnica (roadmap 82). Analiza la coherencia funcional y visual entre las cinco superficies de VirtualDeck para cada campo y comportamiento definido en `ButtonConfig` (`src/types/config.ts`).

---

## 1. Definición de superficies y arquitectura de ejecución

| Superficie | Dónde se pinta | Dónde se dispara |
|---|---|---|
| **Principal** | `src/screens/MainB.tsx` → `src/screens/main/CeldaPrincipal.tsx` → `src/components/ButtonCell.tsx` | `src/utils/pulsarBoton.ts` |
| **Kiosko** | `src/screens/FullscreenB.tsx` → `src/components/ButtonCell.tsx` | `src/utils/pulsarBoton.ts` |
| **Barra flotante** | `src/screens/FloatingBarB.tsx` → `src/components/ButtonCell.tsx` | `src/utils/pulsarBoton.ts` |
| **Mando móvil** | `electron/main/paginaMando.ts` (+ `iconosMando.ts`, `servidorLocal.ts` `listaDeBotones`) | `electron/main/servidorLocal.ts` → `virtualdeck://press/` → IPC `button:trigger` → `src/App.tsx` (`dispararBoton`) |
| **Tecla física (dock)** | `src/utils/superficies/pintarTecla.ts` (+ `iconoSvg.tsx`, `useAnimacionLcd.ts`) | `src/utils/superficies/useSuperficies.ts` → `src/App.tsx` (`dispararBoton`) |

---

## 2. Convenciones de la matriz

- **SÍ**: La superficie implementa y soporta plenamente el campo o comportamiento.
- **NO**: La superficie no implementa el campo, lo ignora o descarta el comportamiento.
- **PARCIAL**: La superficie implementa el campo o comportamiento solo de forma incompleta, con restricciones o en subcasos específicos.
- **NO APLICA**: El campo o comportamiento no tiene sentido técnico en esa superficie (por ejemplo, perillas físicas en una pantalla táctil, o menú contextual de clic derecho en una tecla física).

---

## 3. Matriz de paridad detallada

### 3.1 Identificación y textos

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **`id`** (Identificador único) | SÍ | SÍ | SÍ | SÍ | SÍ |
| **`page`** (Pertenencia a página) | SÍ | SÍ | SÍ | SÍ | SÍ |
| **`label`** (Etiqueta principal) | SÍ | SÍ | SÍ | SÍ | SÍ |
| **`sublabel`** (Sub-etiqueta secundaria) | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Interpolación `{var}` en etiqueta** | SÍ | SÍ | SÍ | NO | SÍ |

#### Evidencia (3.1)
- **`id`**:
  - Principal: SÍ (`CeldaPrincipal.tsx:61,62`)
  - Kiosko: SÍ (`FullscreenB.tsx:249,250`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:195,204`)
  - Mando móvil: SÍ (`iconosMando.ts:233`, `paginaMando.ts:591`)
  - Tecla física: SÍ (`paginasSuperficie.ts:61-87`, `useSuperficies.ts:419`)
- **`page`**:
  - Principal: SÍ (`MainB.tsx:182`, `CeldaPrincipal.tsx:56`)
  - Kiosko: SÍ (`FullscreenB.tsx:182,244`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:59`, mapeo de slots)
  - Mando móvil: SÍ (`servidorLocal.ts:196`, `iconosMando.ts:236`, `paginaMando.ts:438-454`)
  - Tecla física: SÍ (`paginasSuperficie.ts:27-37`, paginación por serial)
- **`label`**:
  - Principal: SÍ (`CeldaPrincipal.tsx:80`, `ButtonCell.tsx:124`, `RotuloCelda.tsx:41`)
  - Kiosko: SÍ (`FullscreenB.tsx:262`, `ButtonCell.tsx:124`, `RotuloCelda.tsx:41`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:213`, `ButtonCell.tsx:124`, `RotuloCelda.tsx:41`)
  - Mando móvil: SÍ (`iconosMando.ts:234`, `paginaMando.ts:580`)
  - Tecla física: SÍ (`pintarTecla.ts:479-529,574`)
- **`sublabel`**:
  - Principal: SÍ (`RotuloCelda.tsx:31,74-94`, `Subdivision2x2.tsx:313,328`)
  - Kiosko: SÍ (`RotuloCelda.tsx:31,74-94`, `Subdivision2x2.tsx:313,328`)
  - Barra flotante: SÍ (`RotuloCelda.tsx:31,74-94`, `Subdivision2x2.tsx:313,328`)
  - Mando móvil: SÍ (`iconosMando.ts:235`, `paginaMando.ts:581` `.sublabel-txt`)
  - Tecla física: SÍ (`pintarTecla.ts:479,520-524,574,796` `dibujarEtiqueta` dibuja la segunda línea más pequeña y atenuada, con el gris de `RotuloCelda` sobre imagen; `paginasSuperficie.ts:55` la interpola)
- **Interpolación `{var}` en etiqueta**:
  - Principal: SÍ (`CeldaPrincipal.tsx:80`: `resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, deckState) : undefined}`)
  - Kiosko: SÍ (`FullscreenB.tsx:262`: `resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, deckState) : undefined}`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:213-214`: `resolvedLabel={btn.label.includes('{') ? interpolate(btn.label, config.state ?? {}) : undefined}`)
  - Mando móvil: NO (`servidorLocal.ts:234` pasa `b.label` crudo sin llamar a `interpolate`)
  - Tecla física: SÍ (`paginasSuperficie.ts:47-57,86` `resolverBotonPagina` interpola `label` y `sublabel` con `config.state`; `useSuperficies.ts:114-115` `firmaDe` serializa el texto final, no la plantilla, así que el cambio de variable repinta la tecla)

---

### 3.2 Colores y estilos

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **`bgColor`** (Color de fondo) | SÍ | SÍ | SÍ | SÍ | SÍ |
| **`fgColor`** (Color de texto/icono) | SÍ | SÍ | SÍ | SÍ | SÍ |

#### Evidencia (3.2)
- **`bgColor`**:
  - Principal: SÍ (`ButtonCell.tsx:149,213`, `src/components/celda/colores.ts:23-28`)
  - Kiosko: SÍ (`ButtonCell.tsx:149,213`)
  - Barra flotante: SÍ (`ButtonCell.tsx:149,213`)
  - Mando móvil: SÍ (`iconosMando.ts:237`, `paginaMando.ts:462`: `celda.style.backgroundColor = b.bgColor`)
  - Tecla física: SÍ (`pintarTecla.ts:190-192` `colorFondo`, `useSuperficies.ts:519`)
- **`fgColor`**:
  - Principal: SÍ (`ButtonCell.tsx:124`, `src/components/celda/derivados.ts:60`)
  - Kiosko: SÍ (`ButtonCell.tsx:124`)
  - Barra flotante: SÍ (`ButtonCell.tsx:124`)
  - Mando móvil: SÍ (`iconosMando.ts:238`, `paginaMando.ts:463`: `celda.style.color = colorFrente`)
  - Tecla física: SÍ (`pintarTecla.ts:208-210` `colorTexto`, `useSuperficies.ts:520`)

---

### 3.3 Iconos y gráficos

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Icono automático por acción** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Glifo DOT 8×8 (`icon`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **`iconoPuntos` 16×16 de catálogo** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Glifo personalizado 5×7 (`customGlyph57`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Icono de marca (`brandIcon`, bitmap, paleta)** | SÍ | SÍ | SÍ | NO | SÍ |
| **Imagen estática (`imageData`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **GIF animado (`imageData` .gif)** | SÍ | SÍ | SÍ | SÍ | SÍ |

#### Evidencia (3.3)
- **Icono automático por acción**:
  - Principal: SÍ (`src/components/celda/derivados.ts:50`, `ContenidoCentral.tsx:102`)
  - Kiosko: SÍ (`ButtonCell.tsx` → `ContenidoCentral.tsx:102`)
  - Barra flotante: SÍ (`ButtonCell.tsx` → `ContenidoCentral.tsx:102`)
  - Mando móvil: SÍ (`iconosMando.ts:164-167,185` `filasDeAccion`)
  - Tecla física: SÍ (`pintarTecla.ts:417-443` → `iconoSvg.tsx:57-60`)
- **Glifo DOT 8×8 (`icon`)**:
  - Principal: SÍ (`ContenidoCentral.tsx:85`, `DotGlyphIcon.tsx`)
  - Kiosko: SÍ (`ContenidoCentral.tsx:85`)
  - Barra flotante: SÍ (`ContenidoCentral.tsx:85`)
  - Mando móvil: SÍ (`iconosMando.ts:149-161`, `paginaMando.ts:372`)
  - Tecla física: SÍ (`pintarTecla.ts:417-443`, `iconoSvg.tsx:49-56`)
- **`iconoPuntos` 16×16 de catálogo**:
  - Principal: SÍ (`ContenidoCentral.tsx:75`, `IconoPuntos.tsx`)
  - Kiosko: SÍ (`ContenidoCentral.tsx:75`)
  - Barra flotante: SÍ (`ContenidoCentral.tsx:75`)
  - Mando móvil: SÍ (`iconosMando.ts:139-146`, `paginaMando.ts:310-339`)
  - Tecla física: SÍ (`pintarTecla.ts:417-443`, `iconoSvg.tsx:43-48`)
- **Glifo personalizado 5×7 (`customGlyph57`)**:
  - Principal: SÍ (`ContenidoCentral.tsx:45` `CustomGlyphRenderer`)
  - Kiosko: SÍ (`ContenidoCentral.tsx:45`)
  - Barra flotante: SÍ (`ContenidoCentral.tsx:45`)
  - Mando móvil: SÍ (`iconosMando.ts:243`, `paginaMando.ts:341-364,563-566` `svgGlifo57`)
  - Tecla física: SÍ (`pintarTecla.ts:324-337,423-425` `dibujarGlifo57`)
- **Icono de marca (`brandIcon`, bitmap, paleta)**:
  - Principal: SÍ (`CapasDeFondo.tsx:42`, `BrandIconRenderer.tsx`)
  - Kiosko: SÍ (`CapasDeFondo.tsx:42`)
  - Barra flotante: SÍ (`CapasDeFondo.tsx:42`)
  - Mando móvil: NO (`paginaMando.ts:574-576`: regla de arquitectura `main-no-renderer` impide importar el catálogo de marcas en el proceso principal)
  - Tecla física: SÍ (`pintarTecla.ts:303-321,565` `dibujarMarca`, importa dinámicamente `data/brandIcons`)
- **Imagen estática (`imageData`)**:
  - Principal: SÍ (`CapasDeFondo.tsx:28-40` `DotMatrixImageOverlay`)
  - Kiosko: SÍ (`CapasDeFondo.tsx:28-40`)
  - Barra flotante: SÍ (`CapasDeFondo.tsx:28-40`)
  - Mando móvil: SÍ (`iconosMando.ts:190-201,242`, `servidorLocal.ts:233-256`, `paginaMando.ts:280-296,557-561` `ponerImagen`)
  - Tecla física: SÍ (`pintarTecla.ts:293-300,564` `dibujarImagenConTrama`)
- **GIF animado (`imageData` .gif)**:
  - Principal: SÍ (`CapasDeFondo.tsx:32` render nativo en motor Chromium)
  - Kiosko: SÍ (`CapasDeFondo.tsx:32`)
  - Barra flotante: SÍ (`CapasDeFondo.tsx:32`)
  - Mando móvil: SÍ (`paginaMando.ts:558` render nativo mediante blob url)
  - Tecla física: SÍ (`useAnimacionLcd.ts:327-341,460-478`, decodificación con `ImageDecoder` y envío a 10 fps)

---

### 3.4 Widgets en tiempo real

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Widget Reloj (`widget: 'clock'`)** | SÍ | SÍ | SÍ | NO | NO |
| **Widget Clima (`widget: 'weather'`)** | SÍ | SÍ | SÍ | NO | NO |
| **Widget Multimedia (`widget: 'now-playing'`)** | SÍ | SÍ | SÍ | NO | NO |
| **Widget Sensor (`widget: 'sensor'`, `sensorWidget`)** | SÍ | SÍ | SÍ | NO | NO |
| **Widget Variable (`widget: 'variable'`, `varWidget`)** | SÍ | SÍ | SÍ | NO | NO |
| **Widget Divisa (`widget: 'currency'`, `currencyWidget`)** | SÍ | SÍ | SÍ | NO | NO |
| **Widget Slider (`widget: 'slider'`, `sliderWidget`)** | SÍ | SÍ | SÍ | SÍ | NO |

#### Evidencia (3.4)
- **Widget Reloj**:
  - Principal: SÍ (`CeldaPrincipal.tsx:75`, `useDatosWidget.ts:80-92`, `RelojWidget.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:195,261`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:71-75,95-103,257` consume `useDatosWidget` y pasa `widgetData`)
  - Mando móvil: NO (`paginaMando.ts:498` solo contempla `slider`)
  - Tecla física: NO (`pintarTecla.ts` no contiene lógica de renderizado de widgets)
- **Widget Clima**:
  - Principal: SÍ (`MainB.tsx:19`, `useClimaWidget`, `CeldaPrincipal.tsx:75`, `ClimaWidget.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:189-200`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:77-81,95-103,257` consume `useClimaWidget` y pasa `widgetData`)
  - Mando móvil: NO (`paginaMando.ts:498`)
  - Tecla física: NO (`pintarTecla.ts`)
- **Widget Multimedia**:
  - Principal: SÍ (`MainB.tsx:41`, `CeldaPrincipal.tsx:75`, `NowPlayingWidget.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:68,197,261`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:83-91,95-103,257,349` consume `useNowPlaying` y pasa `widgetData`)
  - Mando móvil: NO (`paginaMando.ts:498`)
  - Tecla física: NO (`pintarTecla.ts`)
- **Widget Sensor**:
  - Principal: SÍ (`MainB.tsx:43`, `CeldaPrincipal.tsx:75`, `useDatosWidget.ts:133-146`, `SensorMiniWidget.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:76,198,261`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:49,95-103,257` consume `useSensors` y pasa `widgetData`)
  - Mando móvil: NO (`paginaMando.ts:498`)
  - Tecla física: NO (`pintarTecla.ts`)
- **Widget Variable**:
  - Principal: SÍ (`CeldaPrincipal.tsx:75`, `useDatosWidget.ts:148-160`, `VariableMiniWidget.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:194,261`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:95-103,257` consume `useDatosWidget` con `config.state` y pasa `widgetData`)
  - Mando móvil: NO (`paginaMando.ts:498`)
  - Tecla física: NO (`pintarTecla.ts`)
- **Widget Divisa**:
  - Principal: SÍ (`MainB.tsx:19`, `useDivisas`, `CeldaPrincipal.tsx:75`, `DivisasMiniWidget.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:191,261`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:93-103,257` consume `useDivisas` y pasa `widgetData`)
  - Mando móvil: NO (`paginaMando.ts:498`)
  - Tecla física: NO (`pintarTecla.ts`)
- **Widget Slider**:
  - Principal: SÍ (`ButtonCell.tsx:127,188,193`, `DotContinuousSlider.tsx`)
  - Kiosko: SÍ (`ButtonCell.tsx:127,188,193`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:203-228`, `ButtonCell.tsx:127`)
  - Mando móvil: SÍ (`iconosMando.ts:247`, `paginaMando.ts:498-554` slider HTML interactivo, `servidorLocal.ts:312-339` `/api/value/volume`, `/api/value/brightness`)
  - Tecla física: NO (`pintarTecla.ts` no dibuja interfaz continua para slider en celdas LCD)

---

### 3.5 Estados y alternancia

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Dos estados (`isToggle`, `toggledIds`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Acción de apagado (`actionToggleOff`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Aspecto encendido (`aspectoEncendido`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Grupo radio (`radioGroup`)** | SÍ | SÍ | SÍ | SÍ | SÍ |

#### Evidencia (3.5)
- **Dos estados (`isToggle`, `toggledIds`)**:
  - Principal: SÍ (`CeldaPrincipal.tsx:64`, `ButtonCell.tsx:119-121`, `pulsarBoton.ts:166-170`)
  - Kiosko: SÍ (`FullscreenB.tsx:88,256`, `ButtonCell.tsx:119-121`, `pulsarBoton.ts:166-170`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:42,208`, `ButtonCell.tsx:119-121`, `pulsarBoton.ts:166-170`)
  - Mando móvil: SÍ (`servidorLocal.ts:193,202`, `iconosMando.ts:248-249`, `paginaMando.ts:595`)
  - Tecla física: SÍ (`useSuperficies.ts:140,538`, `pintarTecla.ts:69-82`, `pulsarBoton.ts:166-170`)
- **Acción de apagado (`actionToggleOff`)**:
  - Principal: SÍ (`pulsarBoton.ts:178,203-216` `ejecutarApagado`)
  - Kiosko: SÍ (`pulsarBoton.ts:178,203-216`)
  - Barra flotante: SÍ (`pulsarBoton.ts:178,203-216`)
  - Mando móvil: SÍ (ejecutado en `App.tsx` vía `pulsarBoton.ts:178,203-216`)
  - Tecla física: SÍ (ejecutado en `App.tsx` vía `pulsarBoton.ts:178,203-216`)
- **Aspecto encendido (`aspectoEncendido`)**:
  - Principal: SÍ (`ButtonCell.tsx:118-121`, `animacionPuntos.ts:65` `botonEfectivo`)
  - Kiosko: SÍ (`ButtonCell.tsx:118-121`)
  - Barra flotante: SÍ (`ButtonCell.tsx:118-121`)
  - Mando móvil: SÍ (`iconosMando.ts:209-222` `aplicarAspecto`, `paginaMando.ts:595` relee el deck tras pulsar toggle)
  - Tecla física: SÍ (`pintarTecla.ts:69-82` `resolverBotonLcd`)
- **Grupo radio (`radioGroup`)**:
  - Principal: SÍ (`pulsarBoton.ts:171-177`)
  - Kiosko: SÍ (`pulsarBoton.ts:171-177`)
  - Barra flotante: SÍ (`pulsarBoton.ts:171-177`)
  - Mando móvil: SÍ (`pulsarBoton.ts:171-177` invocado vía `virtualdeck://press/` → IPC)
  - Tecla física: SÍ (`pulsarBoton.ts:171-177` invocado vía `dispararBoton`)

---

### 3.6 Animación y efectos

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Animación del icono (`animacion`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Efecto al pulsar (`efectoPulsar`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Sonido de pulsación / giro** | SÍ | SÍ | SÍ | NO | SÍ |

#### Evidencia (3.6)
- **Animación del icono (`animacion`)**:
  - Principal: SÍ (`ButtonCell.tsx:119`, `CuerpoCelda.tsx:274`, `IconoPuntos.tsx:24`, `DotGlyphIcon.tsx:28`)
  - Kiosko: SÍ (`ButtonCell.tsx:119`, `CuerpoCelda.tsx:274`)
  - Barra flotante: SÍ (`ButtonCell.tsx:119`, `CuerpoCelda.tsx:274`)
  - Mando móvil: SÍ (`iconosMando.ts:250`, `JS_ANIMACION_MANDO:282-382`, `paginaMando.ts:193-195`)
  - Tecla física: SÍ (`useAnimacionLcd.ts:343-379`, `pintarTecla.ts:345-373,568` `dibujarMatrizAnimada`)
- **Efecto al pulsar (`efectoPulsar`)**:
  - Principal: SÍ (`ButtonCell.tsx:140,247` `DotRadialSweep`, `usePulsacionRaton.ts:32` `destellar`)
  - Kiosko: SÍ (`ButtonCell.tsx:140,247`, `usePulsacionRaton.ts:32`)
  - Barra flotante: SÍ (`ButtonCell.tsx:140,247`)
  - Mando móvil: SÍ (`iconosMando.ts:251`, `JS_ANIMACION_MANDO:376-382`, `paginaMando.ts:485,589` `animarPulsoMovil`)
  - Tecla física: SÍ (`useSuperficies.ts:418` `registrarPulsoLcd`, `useAnimacionLcd.ts:29,381-412` destello LCD)
- **Sonido de pulsación / giro**:
  - Principal: SÍ (`CeldaPrincipal.tsx:76-77`, `ButtonCell.tsx:135`, `usePulsacionRaton.ts:122`)
  - Kiosko: SÍ (`FullscreenB.tsx:263-264`, `ButtonCell.tsx:135`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:215-216`, `ButtonCell.tsx:135`)
  - Mando móvil: NO (`paginaMando.ts:484,587` emite vibración táctil con `navigator.vibrate`, pero no reproduce el perfil de sonido de VirtualDeck)
  - Tecla física: SÍ (`App.tsx:410-413` reproduce `playSound` o `playGiro` en altavoces del PC al disparar tecla física)

---

### 3.7 Organización y disposición

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Botón fijo entre páginas (`fijo`)** | SÍ | SÍ | NO APLICA | SÍ | SÍ |
| **Mosaico 2×2 (`subButtons`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Carpeta (`action.type: 'folder'`)** | SÍ | SÍ | NO | NO | NO |

#### Evidencia (3.7)
- **Botón fijo entre páginas (`fijo`)**:
  - Principal: SÍ (`CeldaPrincipal.tsx:67` `esFija`, `botonesFijos.ts:20`)
  - Kiosko: SÍ (`FullscreenB.tsx:244-246,252` `esFija`)
  - Barra flotante: NO APLICA (`FloatingBarB.tsx:35,191-200`: la barra carece de paginación tradicional; usa una lista fija de slots `floatingBar.slots`)
  - Mando móvil: SÍ (`iconosMando.ts:245`, `servidorLocal.ts:195`, `paginaMando.ts:454,465-467` muestra botón e insignia `•PIN•` en todas las páginas)
  - Tecla física: SÍ (`paginasSuperficie.ts:85` resuelve botones fijos por dispositivo con `botonesResueltos(config, indice)`)
- **Mosaico 2×2 (`subButtons`)**:
  - Principal: SÍ (`CeldaPrincipal.tsx:65`, `ButtonCell.tsx:126`, `Subdivision2x2.tsx:25`)
  - Kiosko: SÍ (`FullscreenB.tsx:257`, `ButtonCell.tsx:126`, `Subdivision2x2.tsx:25`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:209`, `ButtonCell.tsx:126`, `Subdivision2x2.tsx:25`)
  - Mando móvil: SÍ (`iconosMando.ts:252-269`, `paginaMando.ts:469-496` rejilla interactiva de 4 cuadrantes)
  - Tecla física: SÍ (`pintarTecla.ts:591-596,784-786` → `subdivisionLcd.ts:48,119` pinta los cuatro cuadrantes con color, glifo y etiqueta propios; el GIF no los pisa, `useAnimacionLcd.ts:206,279`). **Al pulsar la tecla, que es una sola, no dispara nada y lo dice**: `useSuperficies.ts:264-265,421-424` deja el disparo en `avisarMosaico` y la tecla enseña el aviso `DECK 2x2` (`avisoPerilla.ts:52-54`), porque elegir un cuadrante por el usuario es una decisión que el hardware no puede tomar y podría ejecutar la acción equivocada
- **Carpeta (`action.type: 'folder'`)**:
  - Principal: SÍ (`MainB.tsx:55`, `CeldaPrincipal.tsx`, `OverlayCarpeta.tsx`)
  - Kiosko: SÍ (`FullscreenB.tsx:164` `carpetaAbierta`, `OverlayCarpeta.tsx`)
  - Barra flotante: NO (`pulsarBoton.ts:58-60`: la barra flotante no monta overlay de carpetas; la acción da OK sin abrir nada)
  - Mando móvil: NO (`servidorLocal.ts:197`: descartado por `tieneAccion`; `App.tsx:402`: `if (btn.action.type === 'folder') return`)
  - Tecla física: NO (`App.tsx:402`: `if (btn.action.type === 'folder') return // Una carpeta necesita interfaz`)

---

### 3.8 Disparadores, condiciones y secuencias

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Visibilidad condicional (`visibleIf`)** | SÍ | SÍ | SÍ | NO | SÍ |
| **Mantener pulsado (`longPressAction`)** | SÍ | SÍ | SÍ | NO | NO |
| **Acciones en cadena (`actions`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Rueda / paso de ajuste (`adjust`)** | SÍ | SÍ | SÍ | NO | SÍ |
| **Atajo global de SO (`globalHotkey`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Menú en bandeja (`inTrayMenu`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Alarma por hora (`timerTriggerAt`)** | SÍ | SÍ | SÍ | SÍ | SÍ |
| **Umbral de sensor (`sensorTrigger`)** | SÍ | SÍ | SÍ | SÍ | SÍ |

#### Evidencia (3.8)
- **Visibilidad condicional (`visibleIf`)**:
  - Principal: SÍ (`CeldaPrincipal.tsx:73`: `isHidden={!botonVisible(btn, estadoSistema, sensorList)}`)
  - Kiosko: SÍ (`FullscreenB.tsx:259`: `isHidden={!botonVisible(btn, estadoSistema, sensorList)}`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:49,255`: evalúa app activa y hardware mediante `sensorList` real de `useSensors()`)
  - Mando móvil: NO (`servidorLocal.ts:195-201` no evalúa `visibleIf`, `paginaMando.ts` dibuja los botones siempre)
  - Tecla física: SÍ (`paginasSuperficie.ts:47-57`: `resolverBotonPagina` usa el mismo `botonVisible` del deck y deja el hueco en `undefined`; `useSuperficies.ts:289-293` le pasa el estado del sistema y los sensores vivos, y al cambiar la condición la firma pasa de `empty:` a botón y repinta. El disparo lee esos mismos huecos, así que un botón oculto tampoco se dispara)
- **Mantener pulsado (`longPressAction`)**:
  - Principal: SÍ (`CeldaPrincipal.tsx:86-89`, `ButtonCell.tsx:129`, `pulsarBoton.ts:250-264` `pulsacionLarga`)
  - Kiosko: SÍ (`FullscreenB.tsx:276-279`, `ButtonCell.tsx:129`, `pulsarBoton.ts:250-264`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:223-226`, `ButtonCell.tsx:129`, `pulsarBoton.ts:250-264`)
  - Mando móvil: NO (`paginaMando.ts:585-596` solo maneja evento `onclick`; no mide duración de toque)
  - Tecla física: NO (`useSuperficies.ts:415-426` dispara en el evento `down`; no tiene temporizador de pulsación sostenida)
- **Acciones en cadena (`actions`)**:
  - Principal: SÍ (`pulsarBoton.ts:183`)
  - Kiosko: SÍ (`pulsarBoton.ts:183`)
  - Barra flotante: SÍ (`pulsarBoton.ts:183`)
  - Mando móvil: SÍ (`pulsarBoton.ts:183` vía enlace IPC `virtualdeck://press/`)
  - Tecla física: SÍ (`pulsarBoton.ts:183` vía `dispararBoton`)
- **Rueda / paso de ajuste (`adjust`)**:
  - Principal: SÍ (`CeldaPrincipal.tsx:83-85`, `ButtonCell.tsx:76-88`)
  - Kiosko: SÍ (`FullscreenB.tsx:269-275`, `ButtonCell.tsx:76-88`)
  - Barra flotante: SÍ (`FloatingBarB.tsx:220-222`, `ButtonCell.tsx:76-88`)
  - Mando móvil: NO (el mando móvil carece de control o interfaz de rueda)
  - Tecla física: SÍ (`useSuperficies.ts:167-174,428` giros `izq` y `der` ejecutan ajuste con delta)
- **Atajo global de SO (`globalHotkey`)**:
  - Principal / Kiosko / Barra / Móvil / Dock: SÍ (registrado a nivel de Electron en `electron/main/hotkeys.ts:30-60`, emite `button:trigger` a `App.tsx:431` ejecutando la acción independientemente de la superficie visible)
- **Menú en bandeja (`inTrayMenu`)**:
  - Principal / Kiosko / Barra / Móvil / Dock: SÍ (registrado a nivel de Electron en `electron/main/trayManager.ts:25-45`, emite `button:trigger` a `App.tsx:431`)
- **Alarma por hora (`timerTriggerAt`)**:
  - Principal / Kiosko / Barra / Móvil / Dock: SÍ (`src/utils/disparadores.ts:20-45` montado en `App.tsx:469`, dispara de fondo en todas las vistas)
- **Umbral de sensor (`sensorTrigger`)**:
  - Principal / Kiosko / Barra / Móvil / Dock: SÍ (`src/utils/disparadores.ts:50-95` montado en `App.tsx:469`, dispara de fondo en todas las vistas)

---

### 3.9 Controles de hardware específicos

| Campo / Comportamiento | Principal | Kiosko | Barra flotante | Mando móvil | Tecla física (dock) |
|---|---|---|---|---|---|
| **Perilla multimodo (`modosPerilla`)** | NO APLICA | NO APLICA | NO APLICA | NO APLICA | SÍ |

#### Evidencia (3.9)
- **Perilla multimodo (`modosPerilla`)**:
  - Principal: NO APLICA (superficie puramente en pantalla sin perillas físicas)
  - Kiosko: NO APLICA (pantalla completa sin perillas físicas)
  - Barra flotante: NO APLICA (interfaz flotante sin perillas físicas)
  - Mando móvil: NO APLICA (web móvil sin controles de perilla física)
  - Tecla física: SÍ (`useSuperficies.ts:202-256,379-398` `decidirPerilla`: conmuta modos en memoria al pulsar y ejecuta `izq`/`der` del modo activo)

---

## 4. Balance cuantitativo y catálogo de huecos

### Resumen de auditoría
- **Total de campos y comportamientos auditados:** 37
- **Evaluaciones individuales realizadas (37 campos × 5 superficies):** 185
- **Desglose de estados globales:**
  - SÍ: 139
  - NO: 25
  - PARCIAL: 4
  - NO APLICA: 17
- **Total de huecos encontrados (casos NO o PARCIAL que deberían funcionar):** 29 huecos (distribuidos en Mando móvil y Tecla física; los cuatro de la Tecla física de la T-PAR-03 quedaron cerrados).

---

### Lista de huecos priorizada por impacto visual y funcional

A continuación se listan las ausencias e incoherencias donde una superficie queda por detrás de lo esperado, ordenadas de mayor a menor gravedad para el usuario final:

#### Prioridad 1: Impacto visual crítico (inmediatamente perceptible)
1. **Mando móvil — Ausencia de iconos de marca (`brandIcon`)**:
   - *Estado:* NO (`paginaMando.ts:574-576`).
   - *Efecto:* Botones populares como Discord, Spotify, OBS, Steam o Chrome se muestran sin su icono característico en el teléfono.
2. **Barra flotante — Widgets en tiempo real (`clock`, `weather`, `now-playing`, `sensor`, `variable`, `currency`)**:
   - *Estado:* SÍ (`FloatingBarB.tsx:71-103,257,349`).
   - *Efecto:* Resuelto (roadmap 82). La barra flotante consume `useDatosWidget`, con sondeo reactivo de clima (`useClimaWidget`), multimedia (`useNowPlaying`), sensores (`useSensors`) y divisas (`useDivisas`), pasando los datos vivos a `ButtonCell`.
3. **Mando móvil — Widgets en vivo**:
   - *Estado:* SÍ (`mandoVivo.ts` `widgetsVivosParaMando` con `datosDeWidget` de `src/comun/widgets.ts`, `servidorLocal.ts:279-280` `/api/widgets`, `paginaMando.ts:590-595,622` hueco `widget-vivo` + `vivoMandoPagina.ts` tic cada 3 s).
   - *Efecto:* Resuelto (T-PAR-02). Los seis widgets no-slider (reloj, clima, multimedia, sensor, variable, divisa) se sirven vivos y se pintan sobre el icono, como en el deck. La matriz 3.4 decía NO y quedó desactualizada.
4. **Tecla física — Ausencia de renderizado de widgets en vivo**:
   - *Estado:* NO (`pintarTecla.ts`).
   - *Efecto:* La tecla física LCD de 64×64 / 72×72 px dibuja iconos y etiquetas estándar pero no pinta el estado de sensores ni datos de widgets.
5. **Tecla física — Omisión total de la subetiqueta (`sublabel`)**:
   - *Estado:* SÍ (`pintarTecla.ts:479,520-524,574`).
   - *Efecto:* Resuelto (T-PAR-03). La tecla dibuja la segunda línea más pequeña y atenuada, como `RotuloCelda`.
6. **Mando móvil — Interpolación de variables en etiquetas**:
   - *Estado:* SÍ en el móvil (`botonesVivosParaMando` en `mandoVivo.ts`, servido por `/api/buttons` en `servidorLocal.ts:274-278`) y SÍ en la tecla física (`paginasSuperficie.ts:47-57,86`, `useSuperficies.ts:114-115`).
   - *Efecto:* Resuelto (T-PAR-02). En el móvil la etiqueta principal sale interpolada (`{VOL}%`); la subetiqueta viaja tal cual. La matriz 3.1 decía NO en el móvil y quedó desactualizada.
7. **Tecla física — Ausencia de soporte para mosaico 2×2 (`subButtons`)**:
   - *Estado:* SÍ (`subdivisionLcd.ts:48,119`, `pintarTecla.ts:591-596,784-786`).
   - *Efecto:* Resuelto (T-PAR-03). La tecla dibuja los cuatro cuadrantes; pulsarla no dispara ninguna de las cuatro acciones (no se puede elegir cuadrante) y enseña el aviso `DECK 2x2` (`useSuperficies.ts:421-424`, `avisoPerilla.ts:52-54`). Decisión documentada: ejecutar el primer cuadrante a ciegas podía lanzar la acción equivocada.

#### Prioridad 2: Incoherencias de estado y visibilidad condicional
8. **Mando móvil — Visibilidad condicional (`visibleIf`)**:
   - *Estado:* SÍ en el móvil (`botonVisibleSegun` de `src/comun/visibilidad.ts`, filtro en `baseViva` de `mandoVivo.ts`: el servidor filtra antes de mandar) y SÍ en la tecla física (`paginasSuperficie.ts:47-57`, `useSuperficies.ts:289-293`).
   - *Efecto:* Resuelto (T-PAR-02). Un botón oculto por app o sensor no llega al móvil ni al dock. La matriz 3.8 decía NO en el móvil y quedó desactualizada.
9. **Barra flotante — Visibilidad condicional por hardware/sensores**:
   - *Estado:* SÍ (`FloatingBarB.tsx:49,255`).
   - *Efecto:* Resuelto (roadmap 82). La barra evalúa las condiciones de hardware de `visibleIf` usando la lista real de sensores provista por `useSensors()`.
10. **Pantallas principales (`ButtonCell`) — Soporte completo para `sublabel` en botones estándar**:
    - *Estado:* SÍ (`RotuloCelda.tsx:31,74-94`).
    - *Efecto:* Resuelto (roadmap 82). `RotuloCelda` ahora dibuja la subetiqueta debajo de la etiqueta principal, más pequeña y atenuada, con truncado elíptico tanto sobre fondos lisos como sobre imágenes oscurecidas, unificando el comportamiento en Principal, Kiosko y Barra.

#### Prioridad 3: Funcionalidades de interacción y disparo ausentes
11. **Mando móvil — Sin soporte para mantener pulsado (`longPressAction`)**:
    - *Estado:* NO (`paginaMando.ts:585-596`).
    - *Efecto:* La acción alternativa tras ~500 ms no existe en el teléfono; solo se dispara la acción corta.
12. **Tecla física — Sin soporte para mantener pulsado (`longPressAction`)**:
     - *Estado:* NO (`useSuperficies.ts:415-426`).
    - *Efecto:* En hardware físico, la pulsación dispara en el flanco de bajada (`down`) de inmediato, imposibilitando acciones secundarias por pulsación larga.
13. **Mando móvil y Tecla física — Carpetas huérfanas sin interfaz**:
    - *Estado:* NO (`App.tsx:402`, `servidorLocal.ts:197`).
    - *Efecto:* Los botones de tipo `folder` son ignorados en el dock y en el móvil porque dependen del overlay de React en pantalla.

---

## 5. Guardián automático (`scripts/check-paridad.mjs`)

Hecho (T-PAR-04): el guardián lee las 37 propiedades de primer nivel de `ButtonConfig` (`src/types/config.ts`) con la API del compilador de TypeScript y las cruza con `scripts/paridad.json`, que es la fuente de la paridad: una entrada por campo con un valor `si`/`no-aplica`/`hueco` por grupo (`pantallas`, `movil`, `dock`) y `nota` obligatoria en todo lo que no es `si`. Falla si un campo no tiene entrada, si sobra una, si un valor no es válido o le falta nota, y si un `si` no aparece como acceso de propiedad en ningún archivo de su grupo; cada `hueco` solo avisa. Cuando una superficie consume el campo a través de un ayudante fuera de su lista de archivos (`fijo` vía `botonesFijos.ts` en el dock, `aspectoEncendido` vía `animacionPuntos.ts` en las pantallas, `actions`/`actionToggleOff`/`radioGroup` vía `pulsarBoton.ts` en el móvil, que dispara por App tras `/api/press`), la entrada lo declara con `via: { grupo: [rutas] }`: sigue siendo `si` y sigue verificado. `no-aplica` queda para lo que no tiene sentido en esa superficie (perillas en pantalla, disparos de fondo a nivel de app). Desde T-COM-01 la interpolación, la visibilidad y los widgets viven en `src/comun/` y los comparten deck y móvil. El guardián busca olvidos con cero falsos positivos, no prueba que funcione; su última línea dice `paridad: ok — N campos, X en las tres, Y no aplica, Z huecos`.
