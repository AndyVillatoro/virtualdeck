# Matriz de paridad de las cinco superficies (VirtualDeck)

**La fuente es `scripts/paridad.json`.** Este documento se rehace a partir de él (última regeneración: 2026-10-06) y no decide paridad por su cuenta: la paridad se declara en el JSON, `scripts/check-paridad.mjs` la verifica en cada `npm run check` y, si una tabla y el JSON se separan, manda el JSON. Estado hoy: **38 campos, 30 en las tres superficies, 19 no-aplica y 0 huecos**.

Documento de auditoría técnica (roadmap 82). Cubre la coherencia funcional y visual entre las cinco superficies de VirtualDeck para cada campo de `ButtonConfig` (`src/types/config.ts`).

---

## 1. Definición de superficies y arquitectura de ejecución

`paridad.json` agrupa las cinco superficies en tres grupos: `pantallas` (Principal, Kiosko y Barra flotante, que comparten la celda), `movil` (mando móvil) y `dock` (tecla física LCD).

| Superficie | Grupo en `paridad.json` | Dónde se pinta | Dónde se dispara |
|---|---|---|---|
| **Principal** | `pantallas` | `src/screens/MainB.tsx` → `src/screens/main/CeldaPrincipal.tsx` → `src/components/ButtonCell.tsx` | `src/utils/pulsarBoton.ts` |
| **Kiosko** | `pantallas` | `src/screens/FullscreenB.tsx` → `src/components/ButtonCell.tsx` | `src/utils/pulsarBoton.ts` |
| **Barra flotante** | `pantallas` | `src/screens/FloatingBarB.tsx` → `src/components/ButtonCell.tsx` | `src/utils/pulsarBoton.ts` |
| **Mando móvil** | `movil` | `electron/main/paginaMando.ts` (+ `iconosMando.ts`, `servidorLocal.ts` `listaDeBotones`) | `electron/main/servidorLocal.ts` → `virtualdeck://press/` → IPC `button:trigger` → `src/App.tsx` (`dispararBoton`) |
| **Tecla física (dock)** | `dock` | `src/utils/superficies/pintarTecla.ts` (+ `iconoSvg.tsx`, `useAnimacionLcd.ts`) | `src/utils/superficies/useSuperficies.ts` → `src/App.tsx` (`dispararBoton`) |

---

## 2. Convenciones de la matriz

Cada campo lleva un valor por grupo. Los valores posibles son solo los tres que acepta el guardián:

- **SÍ**: la superficie implementa y soporta plenamente el campo.
- **NO APLICA**: el campo no tiene sentido técnico en esa superficie (perillas físicas en una pantalla, disparos de fondo a nivel de app). Siempre trae `nota` que lo explica.
- **HUECO**: el campo falta en esa superficie; trae `nota` y el guardián lo lista como aviso. Hoy no hay ninguno.

Cuando una superficie consume el campo a través de un ayudante que vive fuera de sus archivos, la entrada lo declara con `via: { grupo: [rutas] }` y sigue siendo un `si` verificado: esas rutas se suman a la búsqueda del guardián. Así se evita un `no-aplica` que diría algo falso.

---

## 3. Matriz de paridad detallada

Las nueve tablas cubren los 38 campos de primer nivel de `ButtonConfig`, con el valor por grupo y, debajo, la `nota` de `paridad.json` cuando la hay. La evidencia de cada `si` no se copia aquí como archivo:línea (se queda vieja): la comprueba `check-paridad.mjs` en cada `npm run check` por acceso de propiedad en los archivos del grupo (más los de `via`). Los comportamientos derivados que no son campos (el icono automático por acción, la interpolación `{var}`, el sonido de pulsación, la carpeta `folder`) no tienen fila: `paridad.json` solo cubre los campos de `ButtonConfig`.

### 3.1 Identificación y textos

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`id`** — identificador único | SÍ | SÍ | SÍ |
| **`page`** — página a la que pertenece | SÍ | SÍ | SÍ |
| **`label`** — etiqueta principal (admite `{var}`) | SÍ | SÍ | SÍ |
| **`sublabel`** — subetiqueta | SÍ | SÍ | SÍ |

### 3.2 Colores y estilos

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`bgColor`** — color de fondo | SÍ | SÍ | SÍ |
| **`fgColor`** — color de texto e icono | SÍ | SÍ | SÍ |

### 3.3 Iconos y gráficos

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`icon`** — glifo DOT 8×8 | SÍ | SÍ | SÍ |
| **`iconoPuntos`** — icono 16×16 del catálogo | SÍ | SÍ | SÍ |
| **`customGlyph57`** — glifo propio 5×7 | SÍ | SÍ | SÍ |
| **`imageData`** — imagen estática o GIF | SÍ | SÍ | SÍ |
| **`brandIcon`** — marca del catálogo | SÍ | SÍ | SÍ |
| **`brandIconAlwaysAnimate`** — marca siempre animada | SÍ | SÍ | NO APLICA |
| **`brandIconCustomBitmap`** — bitmap propio de la marca | SÍ | SÍ | SÍ |
| **`brandIconCustomColor`** — color propio de la marca | SÍ | SÍ | SÍ |
| **`brandIconCustomPalette`** — paleta propia de la marca | SÍ | SÍ | SÍ |

**Notas de `paridad.json`:**

- **`brandIcon`** — Móvil: `botonAMando` resuelve bitmap/color/paleta con `src/comun/marcaSvg.ts` y manda el SVG autónomo como data URI; `paginaMando.ts` lo pinta de fondo (`img.marca-img`).
- **`brandIconAlwaysAnimate`** — Móvil: la marca viaja animada con el interruptor encendido o `brandIconAlwaysAnimate`, como `CapasDeFondo`. Dock: no aplica, la tecla pinta la marca estática (`dibujarMarca` en `pintarTecla.ts`) y no hay animación de marcas en el LCD.

### 3.4 Animación y efectos

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`animacion`** — efecto de puntos del icono y cuándo | SÍ | SÍ | SÍ |
| **`efectoPulsar`** — efecto al pulsar | SÍ | SÍ | SÍ |

### 3.5 Widgets en tiempo real

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`widget`** — tipo de widget (`clock`, `weather`, `now-playing`, `sensor`, `variable`, `currency`, `slider`) | SÍ | SÍ | SÍ |
| **`currencyWidget`** — configuración del widget de divisa | SÍ | SÍ | SÍ |
| **`varWidget`** — configuración del widget de variable | SÍ | SÍ | SÍ |
| **`sensorWidget`** — configuración del widget de sensor | SÍ | SÍ | SÍ |
| **`sliderWidget`** — configuración del deslizador | SÍ | SÍ | NO APLICA |

**Notas de `paridad.json`:**

- **`sliderWidget`** — Dock: no aplica, la tecla LCD no tiene entrada táctil continua; el ajuste en hardware va por perillas (`modosPerilla`) y botones `adjust`.

### 3.6 Acciones y estados

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`action`** — acción principal | SÍ | SÍ | SÍ |
| **`actions`** — cadena de acciones | SÍ | SÍ | SÍ |
| **`isToggle`** — dos estados | SÍ | SÍ | SÍ |
| **`actionToggleOff`** — acción al apagar | SÍ | SÍ | SÍ |
| **`aspectoEncendido`** — aspecto del botón encendido | SÍ | SÍ | SÍ |
| **`radioGroup`** — grupo radio | SÍ | SÍ | SÍ |

**Notas de `paridad.json`:**

- **`actions`** — Vía en móvil: `src/utils/pulsarBoton.ts`. Móvil: el teléfono solo manda el id a `/api/press` y `App` lo dispara con `pulsarBoton`, igual que las otras superficies.
- **`actionToggleOff`** — Vía en móvil: `src/utils/pulsarBoton.ts`; misma razón que `actions`.
- **`aspectoEncendido`** — Vía en pantallas: `src/components/dot480/animacionPuntos.ts`.
- **`radioGroup`** — Vía en móvil: `src/utils/pulsarBoton.ts`; misma razón que `actions`.

### 3.7 Organización y disposición

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`fijo`** — botón fijo entre páginas | SÍ | SÍ | SÍ |
| **`subButtons`** — mosaico 2×2 | SÍ | SÍ | SÍ |

**Notas de `paridad.json`:**

- **`fijo`** — Vía en dock: `src/utils/botonesFijos.ts` resuelve el botón fijo en cada página del dispositivo.

### 3.8 Visibilidad, disparadores y pulsación larga

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`visibleIf`** — visibilidad condicional (app o sensor) | SÍ | SÍ | SÍ |
| **`longPressAction`** — mantener pulsado | SÍ | SÍ | SÍ |
| **`globalHotkey`** — atajo global del SO | NO APLICA | NO APLICA | NO APLICA |
| **`inTrayMenu`** — menú de la bandeja | NO APLICA | NO APLICA | NO APLICA |
| **`timerTriggerAt`** — alarma por hora | NO APLICA | NO APLICA | NO APLICA |
| **`timerTriggerDias`** — días de la alarma por hora | NO APLICA | NO APLICA | NO APLICA |
| **`sensorTrigger`** — umbral de sensor | NO APLICA | NO APLICA | NO APLICA |

**Notas de `paridad.json`:**

- **`globalHotkey`** — Disparo a nivel de app, no de superficie: se registra en `electron/main` (`trayManager.ts:122-134`) y emite `button:trigger`; ninguna superficie lo implementa por separado.
- **`inTrayMenu`** — Menú de la bandeja a nivel de app (`trayManager.ts:145`); ninguna superficie lo implementa por separado.
- **`timerTriggerAt`** — Disparo de fondo a nivel de app (`src/utils/useDisparadores.ts:102-104`, montado en `App`); ninguna superficie lo implementa por separado.
- **`timerTriggerDias`** — Filtro de días del disparo por hora, en el mismo efecto de fondo (`src/utils/useDisparadores.ts:105`, montado en `App`); ninguna superficie lo implementa por separado.
- **`sensorTrigger`** — Disparo de fondo a nivel de app (`src/utils/useDisparadores.ts:105`, montado en `App`); ninguna superficie lo implementa por separado.

### 3.9 Controles de hardware específicos

| Campo | Pantallas | Móvil | Dock |
|---|---|---|---|
| **`modosPerilla`** — perilla multimodo | NO APLICA | NO APLICA | SÍ |

**Notas de `paridad.json`:**

- **`modosPerilla`** — Pantallas y móvil: no aplica, solo el dock tiene perillas físicas (`decidirPerilla` en `useSuperficies.ts:202-256`).

---

## 4. Balance cuantitativo e historia

### Estado actual (2026-10-06)

- Campos de `ButtonConfig`: **38**.
- Evaluaciones (38 campos × 3 grupos): **114**.
- SÍ: **95** (pantallas 32, móvil 32, dock 31).
- NO APLICA: **19** (pantallas 6, móvil 6, dock 7).
- HUECO: **0**.
- Campos que llegan a las tres superficies a la vez: **30**.

### Huecos cerrados (historia)

La auditoría original (T-DOC-01, 2026-10-05) midió 37 campos × 5 superficies con 43 huecos (125 sí, 35 no, 8 parcial, 17 no aplica); los cierres la bajaron a 0. Una línea por tarea:

- 2026-10-05 · T-PAR-01 — Barra flotante: widgets con datos vivos y `visibleIf` por hardware; `sublabel` en las pantallas.
- 2026-10-05 · T-PAR-02 — Móvil: interpolación `{var}`, `visibleIf` y widgets vivos (lógica compartida en `src/comun/`, T-COM-01).
- 2026-10-05 · T-PAR-03 — Tecla física: `sublabel` y mosaico 2×2 (`subButtons`).
- 2026-10-05 · T-PAR-05 — Tecla física: `widget` y sus datos vivos en el LCD.
- 2026-10-05 · T-PAR-06 — Móvil: mantener pulsado (`longPressAction`).
- 2026-10-05 · T-PAR-07 — Dock: mantener pulsado en teclas y botones.
- 2026-10-05 · T-PAR-08 — Móvil: iconos de marca (`brandIcon` y sus variantes).
- 2026-10-06 · roadmap 88 (T-REV-08) — `timerTriggerDias` nace como `no-aplica` en las tres, como los demás disparos de fondo: no fue un hueco.

El guardián pasó por `37 campos, 21 en las tres, 16 no aplica, 11 huecos` → `37/30/16/5` (solo marcas en el móvil) → `37/30/16/0` y hoy es `38/30/19/0`.

---

## 5. Guardián automático (`scripts/check-paridad.mjs`)

Hecho (T-PAR-04, 2026-10-05): el guardián lee las 38 propiedades de primer nivel de `ButtonConfig` (`src/types/config.ts`) con la API del compilador de TypeScript y las cruza con `scripts/paridad.json`, que es la fuente de la paridad: una entrada por campo con un valor `si`/`no-aplica`/`hueco` por grupo (`pantallas`, `movil`, `dock`) y `nota` obligatoria en todo lo que no es `si`. Falla si un campo no tiene entrada, si sobra una, si un valor no es válido o le falta nota, y si un `si` no aparece como acceso de propiedad en ningún archivo de su grupo; cada `hueco` solo avisa. Cuando una superficie consume el campo a través de un ayudante fuera de su lista de archivos (`fijo` vía `botonesFijos.ts` en el dock, `aspectoEncendido` vía `animacionPuntos.ts` en las pantallas, `actions`/`actionToggleOff`/`radioGroup` vía `pulsarBoton.ts` en el móvil, que dispara por App tras `/api/press`), la entrada lo declara con `via: { grupo: [rutas] }`: sigue siendo `si` y sigue verificado. `no-aplica` queda para lo que no tiene sentido en esa superficie (perillas en pantalla, disparos de fondo a nivel de app). Desde T-COM-01 la interpolación, la visibilidad y los widgets viven en `src/comun/` y los comparten deck y móvil. El guardián busca olvidos con cero falsos positivos, no prueba que funcione; su última línea dice `paridad: ok — N campos, X en las tres, Y no aplica, Z huecos` y hoy es `paridad: ok — 38 campos, 30 en las tres, 19 no aplica, 0 huecos`.
