# VirtualDeck — Guía de usuario

Stream Deck virtual para Windows. Botones configurables que disparan apps, atajos, scripts, audio y más, con todo viviendo en una matriz de puntos retro-tech.

---

## Conceptos básicos

- **Páginas**: hasta 8, cada una con su propia cuadrícula, de 3 a 6 columnas y hasta 8 filas (clic derecho sobre la pestaña).
- **Botones**: cada celda dispara una *acción* (o una cadena de acciones).
- **Perfiles**: copias completas del deck (páginas, botones, color de acento y fondo) que se pueden guardar y restaurar.
- **Variables**: estado global persistente (`{nombre}`) interpolable en cualquier campo de acción.

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+K` | Búsqueda global de botones |
| `Ctrl+Z` | Deshacer último cambio |
| `1` … `9` | Saltar a la página N (hasta las que existan) |
| `Esc` | Salir de modal / fullscreen / kiosko |
| Botón ⤢ | Modo pantalla completa |

## Editar un botón

1. Clic en una celda vacía (configurar) o ✎ en una celda con acción (editar).
2. **PRESETS**: botones prearmados por categoría.
3. **ACCIÓN**: escoge el tipo, agrupado por familias y con buscador; puedes encadenar varias acciones con «añadir otra acción después».
4. **APARIENCIA**: etiqueta, subtítulo, color de fondo y de texto, y el icono (AUTOMÁTICO / CATÁLOGO / DIBUJO PROPIO / IMAGEN-GIF; el catálogo tiene grupos y búsqueda en español).
5. **COMPORTAMIENTO**: dos estados, mantener pulsado, fijo en todas las páginas, disparadores (atajo, hora con días, sensor) y visibilidad condicional.
6. **AVANZADO**: subdivisión 2×2 de la celda, con catálogo por cuadrante.

**Tip — Pegar imagen**: dentro del editor, `Ctrl+V` con una imagen en el portapapeles la aplica directamente como fondo del botón.

## Drag & drop

- **Reordenar dentro de la página**: arrastrar un botón sobre otro los intercambia.
- **Mover a otra página**: arrastrar un botón sobre la pestaña destino. Mantén `Shift` mientras sueltas para *copiar* en lugar de mover.
- **Reordenar pestañas**: arrastrar la pestaña de página.

## Variables y plantillas

Tres acciones manipulan el estado global:

- **Var: Asignar** (`set-var`) — guarda un valor (literal o `{otraVar}`).
- **Var: Sumar** (`incr-var`) — suma o resta a una variable numérica.

Cualquier campo de acción (URL, args, body de webhook, texto a leer en TTS…) reemplaza `{variable}` por su valor en runtime. Casos típicos:

```
incr-var counter +1
notify "Llevas {counter} pomodoros hoy"
```

## Disparadores externos

En la sección **COMPORTAMIENTO** del editor:

- **Hotkey global del SO**: ej. `Ctrl+Alt+1`. Funciona aunque VirtualDeck esté en background.
- **Mostrar en tray**: el botón aparece en el menú contextual del icono de bandeja.
- También: disparo por **hora** (con días de la semana) y por **umbral de sensor**.

## Modo kiosko

En fullscreen, el botón "🔒 KIOSKO" oculta toda la UI no esencial. ESC pide un PIN de 4 dígitos para salir. El PIN se establece la primera vez y se persiste.

## Backups

Cada vez que guardas, VirtualDeck conserva los últimos **5 backups** en `%APPDATA%\virtualdeck\backups\` (con cooldown de 5 min entre backups consecutivos). Útil si imports algo malo o eliminas un perfil por accidente.

## Sonido al press

Cuatro perfiles seleccionables: **Click mecánico**, **Tick**, **Thud** y **Silencio**. Toggle `SONIDO AL PRESIONAR` en el menú Ajustes. El timbre se previsualiza al elegirlo.

## Wallpaper

Botón `FONDO` en la barra superior. Variantes incluidas: sólido, gradiente, dot-grid, scanlines, **CRT** (con flicker), **mesh técnico**, neón, grid azul.
