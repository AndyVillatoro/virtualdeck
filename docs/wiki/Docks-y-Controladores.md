# Docks y controladores físicos

> [English version](Docks-and-Controllers)

VirtualDeck habla con controladores físicos tipo Stream Deck: el **Stream Dock
N3** de Mirabox/Ajazz está verificado con hardware real; la tabla de modelos
incluye otros 12 Mirabox/Ajazz (con insignia *experimental*) y la familia
Elgato está pendiente.

## Detección y páginas

- Cada dock que se conecta aparece en la pantalla **Dispositivos** y se gestiona
  en su propia sección.
- Un dock es una **página del deck marcada con su serial**: el editor, deshacer
  e importar/exportar sirven sin cambios. Esas páginas no salen en la pantalla
  principal ni en kiosko.
- Un mismo dock puede tener **varias páginas**, cada una vinculada a una app.
  La que muestra es la activa: cambia sola cuando la app vinculada pasa al
  primer plano, o se elige a mano. La página elegida a mano es la base: una app
  con página vinculada la sustituye mientras está delante y al irse se vuelve a
  la base.

## Controles

- **Teclas LCD**: muestran etiqueta, glifo, imagen o **widget** en vivo (reloj,
  clima, reproducción, sensor, variable), con la misma fuente de datos que la
  pantalla principal. Un botón con *mantener pulsado* espera a que sueltes o a
  500 ms; el resto dispara al bajar.
- **Botones ciegos**: disparan su acción al pulsar.
- **Perillas**: cada una tiene tres huecos (girar a la izquierda, pulsar, girar
  a la derecha). Las presets rellenan los tres en un solo deshacer. **Perilla
  multimodo**: pulsar cambia de modo y cada modo tiene sus acciones; al cambiar
  de página vuelve al primero.
- **Acción `page-nav`**: siguiente/anterior/primera página, `cycle` para dar la
  vuelta; desde un dock navega sus páginas y desde el deck, las del deck. Los
  botones de navegación de los presets quedan fijos en todas las páginas.

## Presets

En el inspector de **Dispositivos** hay presets listos por control
(multimedia, volumen, zoom, pestañas, escritorios virtuales…), cada uno con su
explicación en palabras del tipo «GIRO IZQ · DESHACER · CTRL + Z».

## Perfiles completos

En el inspector de **Dispositivos**, cuando no hay ningún control elegido, hay
tres perfiles que rellenan **todos** los controles de la página de una vez:

- **Multimedia**: volumen, reproducción y brillo en las perillas; mute, play,
  siguiente, anterior y mute de la app activa en las teclas.
- **Streaming**: mute y sordo de Discord, volumen de Discord y de la app
  activa, mute del sistema, recorte y multitarea.
- **Productividad**: pestañas, deshacer/rehacer y escritorios virtuales en las
  perillas; portapapeles, ventanas, multitarea y escritorio en las teclas.

Se ofrecen con confirmación y al aceptar **sustituyen los botones de esa
página**; los 18 huecos de la página del N3 quedan configurados en un solo
deshacer. Solo cuadran con un modelo de 6 teclas, 3 botones y 3 perillas.

## Brillo

El brillo de las teclas se cambia en vivo sin guardar; al soltar el deslizador
queda guardado en la configuración del dispositivo.
