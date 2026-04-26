# VirtualDeck — Sistema de diseño

> Documento generado por la skill `interface-design` tras la pasada de convergencia.
> Es la fuente de verdad para sesiones futuras: cualquier cambio visual debe respetar lo aquí descrito.

---

## Dirección y sensación

VirtualDeck es un *streamdeck virtual*: un panel de botones físicos reinterpretado en software. La sensación es **hardware retro-tech bajo cristal**: oscuro, plano, con una firma de matriz de puntos que evoca un display LED industrial. No es "limpio y moderno" — es **denso, técnico, deliberadamente low-fi en la tipografía de identidad**.

Adjetivos guía: **plano, oscuro, denso, deliberado**. No hay calidez, no hay glass-morphism, no hay degradados decorativos.

---

## Firma del producto

**Matriz de puntos 5×7** (`GLYPHS_5x7` + componentes `DotLabel` / `DotText`). Es lo único que NO se puede sustituir. Aparece en etiquetas de sección (`SISTEMA`, `CLIMA`, `REPRODUCIENDO`, `PERFILES`...), en el monitor cuando había uno, y donde haga falta señalar identidad. Si dudas si usar dots o `VD.mono`: **dots para etiquetas de sección, mono para datos**.

El tablero de glifos vive en `src/design.ts` y está hand-authored. Si necesitas un nuevo carácter, agrégalo allí — no inventes glifos en runtime.

---

## Tokens (`src/design.ts` → `VD`)

### Superficies (escala de elevación)
```
bg              #0f0f0f   canvas raíz
surface         #191919   sidebar, flyouts, modales base
elevated        #222222   tarjetas, inputs, botones por defecto
elevatedHover   #272727   step de hover entre elevated y overlay
overlay         #2b2b2b   pressed / overlays semitransparentes
```
Los saltos son ~2-5 puntos de luminosidad. La jerarquía se siente, no se ve.

### Bordes
```
border         #2e2e2e   separación estándar
borderStrong   #3c3c3c   énfasis (modales, focus)
```
Borde sutil siempre. Si el borde grita, está mal.

### Texto
```
text       #dcdcdc   primario (no #fff — el blanco puro nunca aparece)
textDim    #888888   secundario (datos, metadata)
textMuted  #555555   terciario (etiquetas de sección, deshabilitado)
```

### Acentos y semánticos
```
accent     #4a8ef0   acento principal (configurable por usuario, expuesto en CSS var --vd-accent)
accentBg   rgba(74,142,240,0.12)   acento traslúcido para selección
success    #4caf7d
warning    #d4a234
danger     #d95f5f
violet     #a78bfa   único color decorativo extra (preset opcional)
```

### Presets de acento (`ACCENT_PRESETS`)
`[accent, success, warning, violet, danger]` — todos derivados de tokens. **No agregues hex sueltos al picker.** El usuario tiene `<input type="color">` para cualquier color libre.

### Tipografía
```
font   "Inter", system-ui, sans-serif        UI general
mono   "JetBrains Mono", ui-monospace        datos, etiquetas técnicas, valores
dots   "DotGothic16", monospace              respaldo cuando no se usa GLYPHS_5x7
```

### Geometría
```
radius.sm   2px   inputs, badges, botones pequeños
radius.md   3px   tarjetas pequeñas, perfiles, brand-icons internos
radius.lg   4px   celdas de botón, modales, context menus
```
Sharper-than-friendly: 4px es el máximo. Nunca pongas radios grandes — rompe la sensación técnica.

### Profundidad (sombras)
```
shadow.menu    0 8px 24px rgba(0,0,0,0.7)    flyouts, dropdowns, context menus
shadow.modal   0 16px 48px rgba(0,0,0,0.85)  modales bloqueantes, editores
```
**Estrategia de profundidad: bordes + sombra plana.** No mezclar con glass/blur. No agregar más niveles.

### Matriz de puntos
```
dotIdle   rgba(220,220,220,0.04)   color del píxel apagado en DotText/DotLabel
```

---

## Reglas de uso

### Lo que NO se hace
- **No introducir hex sueltos.** Cada color trazado a `VD`. Si un color no encaja, primero pregunta si pertenece al sistema; si la respuesta es sí, agrégalo a `VD`.
- **No usar `#fff` ni `#000`.** Texto = `VD.text`. Negro = ausencia (rgba sobre fondos).
- **No mezclar estrategias de profundidad.** Bordes + sombra plana. Punto.
- **No multiplicar acentos.** Un solo `--vd-accent` controla la identidad. Los semánticos (success/warning/danger) significan estado, no decoración.
- **No usar radios > 4px.** Tampoco mezclar 3px y 4px en surfaces del mismo nivel.
- **No saltarte `DotLabel`/`DotText` en etiquetas de sección.** Es la firma.

### Lo que SÍ se hace
- Sidebar = mismo background que canvas + borde izquierdo (no color distinto).
- Inputs = `VD.elevated` con borde `VD.border` (más oscuro que el contenedor — son "inset", reciben contenido).
- Dropdowns = un nivel sobre el padre + sombra `menu`.
- Modales = `surface` + `borderStrong` + sombra `modal`.
- Datos numéricos en `VD.mono`. Etiquetas de sección con `DotLabel`.
- Hover = subir un step (`elevatedHover`); pressed = subir otro step (`overlay`).

---

## Componentes establecidos

### `ButtonCell` (celda del deck)
- `borderRadius: VD.radius.lg` (4px).
- Background sigue la cadena: `flash → toggle → drag → custom → pressed → hover → idle`.
- Borde: `VD.border` por defecto; `VD.borderStrong` en hover; `accent` en pressed/toggle/drag.
- Etiqueta: `VD.mono`, 9px, letterSpacing 1, uppercase, max 80px, truncada.
- Indicador de configurado: dot 5×5 con `accent`, opacity 0.7.

### `TitleBar`
- Altura 36px, `VD.surface`, fontSize 11 mono.
- Drag region nativa de Electron (`WebkitAppRegion: drag`); botones tienen `no-drag`.
- Flyout de settings: `VD.shadow.menu`, ancho 260, `radius.lg` solo en esquinas inferiores.

### Context menus
- Background `VD.surface` + `borderStrong` + `radius.lg` + `shadow.menu`.
- Items: padding `9px 14px`, `VD.mono` 11px, hover = `VD.elevated`, divisor `border`.

### Toggles
- Track 36×20, `radius: 10` (cápsula), `accent` cuando on / `elevated` cuando off.
- Knob 14×14 redondo, `VD.text`.

---

## Spacing

No hay base unit estricta declarada. La práctica observada:
- **Micro** (2-4px): gap de iconos, padding interno de badges.
- **Componente** (6-8px): gap entre celdas del grid, padding de items.
- **Sección** (10-16px): padding de sidebar, gap de bloques en flyouts.
- **Mayor** (20-24px): separación entre regiones distintas.

Si introduces nuevos valores, mantente dentro de la escala 2/4/6/8/10/12/14/16. No uses 5, 7, 11, 13, etc.

---

## Estados de interacción

Todo elemento interactivo tiene **default / hover / pressed / disabled** mínimo. Para celdas del deck además: `toggled`, `dragOver`, `flash` (post-ejecución 300ms).

Datos: estados `loading`, `empty`, `error` cuando aplique. La sidebar de música (`REPRODUCIENDO`) muestra "Sin reproducción activa" como empty state — sigue ese patrón.

---

## Cuándo actualizar este archivo

- Cuando un componente nuevo se use 2+ veces.
- Cuando una decisión visual se establezca como repetible.
- Cuando se introduzca un token nuevo.
- **No** documentar experimentos ni one-offs.
