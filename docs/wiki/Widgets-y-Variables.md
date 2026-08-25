# Widgets y variables

Un botón puede, en vez de mostrar su icono, mostrar **un dato en vivo**. Sigue
siendo un botón: se pulsa y ejecuta su acción igual que cualquier otro.

Se elige en el paso **Estilo** del editor, en el desplegable *WIDGET*.

---

## Los seis widgets

| Widget | Qué muestra | Configuración |
|---|---|---|
| **Reloj** | Hora y fecha, en el idioma elegido | Ninguna |
| **Clima** | Temperatura y estado del cielo | Se detecta la ubicación por IP |
| **Reproduciendo** | Título y artista de lo que suena | Ninguna |
| **Sensor** | La lectura de un sensor del equipo | Sensor, sufijo y umbrales de aviso |
| **Variable** | El valor de una variable | Nombre, prefijo y sufijo |
| **Divisas** | Conversión entre dos monedas | Cantidad, moneda de origen y de destino |

**Reproduciendo** no se puede combinar con la acción «cambiar dispositivo de
audio»: el widget taparía el nombre del dispositivo, que es justo lo que ese
botón necesita enseñar. El editor lo impide.

**Sensor** necesita LibreHardwareMonitor en marcha — ver
[Sensores y RGB](Sensores-y-RGB).

**Divisas** se apoya en una tasa que se actualiza una vez al día y se guarda en
el equipo, así que el botón sigue mostrando la última tasa conocida aunque no
haya conexión. Son 166 monedas.

---

## Variables

Una variable es un dato con nombre que sobrevive a cerrar la aplicación. Se
escribe en cualquier campo de acción entre llaves: `{nombre}`.

Dos acciones las cambian:

- **Var: Asignar** — guarda un valor, que puede ser literal u otra variable.
- **Var: Sumar** — suma o resta a una variable numérica.

Y una tercera las llena sola: la acción **Script**, con la casilla *guardar la
salida en una variable*.

La interpolación ocurre en el momento de ejecutar, en **todos** los campos de
texto de una acción: la URL de una web, los argumentos de un programa, el
cuerpo de un webhook, el texto de una notificación o el que se lee en voz alta.

### Un contador

1. Un botón con la acción **Var: Sumar**, variable `pomodoros`, valor `1`.
2. Al mismo botón, en Estilo, se le pone el widget **Variable** apuntando a
   `pomodoros`, con el sufijo ` hoy`.

Cada pulsación sube la cuenta y el propio botón la muestra.

### Encadenar

Un botón puede llevar varias acciones en orden. Combinado con variables:

```
Var: Sumar     pomodoros +1
Notificación   "Llevas {pomodoros} pomodoros hoy"
```

### Decidir según el valor

La acción **Si / Si no** compara una variable con un valor y ejecuta una rama u
otra. Sirve para hacer un botón que alterne entre tres estados, por ejemplo, en
vez de dos.

---

## Interruptores

Un botón marcado como **interruptor** alterna entre encendido y apagado, y
puede tener una acción distinta para cada lado. El estado se guarda, así que
sobrevive a cerrar la aplicación, y **es el mismo en las tres pantallas**: la
principal, el modo de pantalla completa y la barra flotante.

Si además se le da un **grupo**, solo un botón del grupo puede estar encendido
a la vez: al encender uno, los demás del grupo se apagan solos. Es la forma de
representar «modo activo» con varios botones.
