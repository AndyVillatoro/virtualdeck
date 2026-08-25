# Atajos y macros

Dos formas de que un botón escriba en el teclado: enviar **una combinación** o
reproducir **una secuencia grabada**.

---

## Atajos de teclado dentro de VirtualDeck

| Atajo | Acción |
|---|---|
| `Ctrl+K` | Buscar cualquier botón |
| `Ctrl+Z` | Deshacer el último cambio |
| `1` … `8` | Ir a la página N |
| `Esc` | Cerrar lo que esté abierto: búsqueda, editor, pantalla completa |
| `Ctrl+clic` | Seleccionar varios botones |
| `Ctrl+V` | Con el editor abierto: pegar una imagen del portapapeles como fondo |

---

## Enviar una combinación

La acción **Atajo de teclado** manda una combinación a la ventana que esté en
primer plano. Se escribe como se lee: `Ctrl+C`, `Alt+Tab`, `Ctrl+Shift+Esc`,
`Win+D`.

VirtualDeck quita el foco de su propia ventana antes de enviarla, para que
llegue a la aplicación con la que se estaba trabajando y no a sí mismo.

---

## Atajo global del sistema

En el paso **Configurar** de cualquier botón, la sección *DISPARADORES
EXTERNOS* permite asignarle una combinación del sistema, por ejemplo
`Ctrl+Alt+1`. Funciona esté VirtualDeck a la vista o escondido en la bandeja.

En esa misma sección, **mostrar en el menú de la bandeja** añade el botón al
menú del icono de la bandeja, como acción rápida.

Un botón disparado por cualquiera de estas dos vías hace **exactamente lo
mismo** que si se pulsara con el ratón: respeta el interruptor, el grupo, la
secuencia de acciones y las variables.

---

## Macros

Una macro es una lista de pasos: teclas, clics, movimientos del ratón, rueda y
pausas.

### Grabarla

El botón **GRABAR** del editor captura el teclado y el ratón de todo el sistema
hasta que se pulsa **DETENER**.

- Los modificadores se graban con la tecla: pulsar `Ctrl+C` deja un solo paso,
  `Ctrl+C`, no dos.
- **Los clics sobre la ventana de VirtualDeck no se graban.** Son los del
  grabador, no los de la macro. Por eso, si solo se hace clic aquí dentro, la
  grabación sale vacía y lo dice.
- Las pausas entre pulsaciones se conservan tal como se hicieron.

### Escribirla o retocarla a mano

Cada paso se puede editar, reordenar y borrar. Los tipos son:

| Paso | Qué hace |
|---|---|
| **Tecla** | Una tecla suelta: `a`, `5`, `{ENTER}`, `{F5}` |
| **Combinación** | Con modificadores: `Ctrl+C`, `Alt+Tab` |
| **Texto** | Escribe una cadena entera |
| **Clic ratón** | En unas coordenadas de pantalla, con botón izquierdo, derecho o central |
| **Mover ratón** | Lleva el cursor a unas coordenadas |
| **Scroll** | Rueda arriba o abajo |
| **Pausa** | Espera los milisegundos indicados |

Las teclas con nombre van entre llaves: `{ENTER}`, `{TAB}`, `{ESC}`,
`{BACKSPACE}`, `{DELETE}`, `{UP}`, `{DOWN}`, `{LEFT}`, `{RIGHT}`, `{HOME}`,
`{END}`, `{PGUP}`, `{PGDN}` y `{F1}` a `{F24}`.

### Repetir

El campo **repetir** ejecuta la macro entera N veces seguidas.

---

## Cuándo usar cada cosa

- Una combinación que ya existe en otro programa → **Atajo de teclado**.
- Una secuencia de varios pasos, con esperas o con el ratón → **Macro**.
- Lanzar algo que no es teclado (un programa, una web, un script) → la acción
  correspondiente; ver [Acciones](Referencia-de-Acciones).
