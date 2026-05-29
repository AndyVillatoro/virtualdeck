# VirtualDeck — Guía de usuario

Stream Deck virtual para Windows. Botones configurables que disparan apps, atajos, scripts, audio y más, con todo viviendo en una matriz de puntos retro-tech.

---

## Conceptos básicos

- **Páginas**: hasta 8, cada una con grilla 3×3 o 4×4 (clic derecho sobre la pestaña).
- **Botones**: cada celda dispara una *acción* (o una cadena de acciones).
- **Perfiles**: snapshots completos de tu deck (páginas + botones + acento) que puedes guardar y restaurar.
- **Variables**: estado global persistente (`{nombre}`) interpolable en cualquier campo de acción.

## Atajos de teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+K` | Búsqueda global de botones |
| `Ctrl+Z` | Deshacer último cambio |
| `1` … `8` | Saltar a página N |
| `Esc` | Salir de modal / fullscreen / kiosko |
| `F11` o botón ⤢ | Modo pantalla completa |

## Editar un botón

1. Clic en una celda vacía (configurar) o ✎ en una celda con acción (editar).
2. **Paso 1 · Acción**: escoge el tipo. Atajo, app, web, script, hotkey, webhook, TTS…
3. **Paso 2 · Configurar**: completa los campos específicos.
4. **Paso 3 · Estilo**: label, sublabel, icono (emoji, brand icon o glifo 5×7 propio), color de fondo y de texto.

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

En la sección "DISPARADORES EXTERNOS" del paso CONFIGURAR:

- **Hotkey global del SO**: ej. `Ctrl+Alt+1`. Funciona aunque VirtualDeck esté en background.
- **Mostrar en tray**: el botón aparece en el menú contextual del icono de bandeja.

## Modo kiosko

En fullscreen, el botón "🔒 KIOSKO" oculta toda la UI no esencial. ESC pide un PIN de 4 dígitos para salir. El PIN se establece la primera vez y se persiste.

## Backups

Cada vez que guardas, VirtualDeck conserva los últimos **5 backups** en `%APPDATA%\virtualdeck\backups\` (con cooldown de 5 min entre backups consecutivos). Útil si imports algo malo o eliminas un perfil por accidente.

## Sonido al press

Cuatro perfiles seleccionables: **Click mecánico**, **Tick**, **Thud** y **Silencio**. Toggle `SONIDO AL PRESIONAR` en el menú ⚙. El timbre se previsualiza al elegirlo.

## Wallpaper

Botón `FONDO` en la barra superior. Variantes incluidas: sólido, gradiente, dot-grid, scanlines, **CRT** (con flicker), **mesh técnico**, neón, grid azul.
