# Plugins propios de VirtualDeck

Seis plugins HTML del protocolo de Stream Deck que instala el gestor
(`electron/main/plugins/`) y que la tienda ofrece con un clic. Sin dependencias:
cada paquete es su carpeta y tres o cuatro archivos.

| Plugin | UUID | Qué hace |
|---|---|---|
| Cronometro | `com.virtualdeck.cronometro` | Pulsación corta arranca o pausa; larga (700 ms) reinicia. |
| Temporizador pomodoro | `com.virtualdeck.temporizador-pomodoro` | 25 de foco y 5 de pausa, ajustables en su Property Inspector; encadena la pausa. |
| Contador | `com.virtualdeck.contador` | Suma uno por pulsación, la larga lo reinicia, y el valor se guarda en los ajustes del botón. |
| Reloj mundial | `com.virtualdeck.reloj-mundial` | La hora de la zona IANA que se elija en su Property Inspector, con su desfase con UTC. |
| Dado | `com.virtualdeck.dado` | Tira un d6 (con puntos) o un d20 (con la matriz de números). |
| Fecha | `com.virtualdeck.fecha` | Día, mes y semana ISO del año. No necesita ajustes. |

## Cómo está cada paquete

```
com.virtualdeck.<nombre>.sdPlugin/
  manifest.json      Name, Description, Author, Version, UUID, CodePath, Icon,
                     CategoryIcon, Actions, OS, SDKVersion 2
  <code>.html        el plugin: el script de este paquete, nada mas
  pi.html            Property Inspector (solo pomodoro y reloj)
  sdk.js             el puente del protocolo (identico en los seis)
  punto.js           la matriz 5×7 y el SVG de puntos (identico en los seis)
  icon.png           128×128, generado desde el catálogo DOT del proyecto
```

`sdk.js` y `punto.js` son copias: un paquete tiene que poder instalarse solo,
como los de Elgato. Si se tocan, se copian a los seis
(`Copy-Item ...\sdk.js` a cada carpeta) y se vuelve a empaquetar.

## Estética

Fondo OLED `#070809`, acento `#FF3B30`, puntos `#d7dade` y apagados `#2b3038`.
Cero emojis y nada de unicode: cada número o letra es una matriz de puntos 5×7
(`punto.js`) y sale como `data:image/svg+xml;base64`, que es lo único que
`resolverImagenVisual` acepta en `setImage`.

## Empaquetar

```
npm run build:plugins
```

Genera `icon.png` en cada paquete (desde `src/data/iconosDot/acciones.json`),
rellena el `CategoryIcon` del manifiesto y escribe
`dist/<uuid>.streamDeckPlugin` —un ZIP con la carpeta `.sdPlugin` dentro, que es
lo que acepta `extraerZipSeguro`—. Luego calcula el sha256 de cada uno y anade
las entradas `kind: 'plugin'` a `docs/galeria-ejemplo/manifest.json`.

Sin dependencias nuevas: el ZIP se escribe a mano con `zlib.deflateRawSync`
(`yauzl` solo lee) y el PNG con `zlib.deflateSync`, como
`scripts/generate-companion-icons.mjs`.

## Pruebas

Las tres pasan por lo mismo que pasa en la app, sin Electron:

```
npx tsx docs/galeria-ejemplo/plugins/pruebas/probar-zip.ts
npx tsx docs/galeria-ejemplo/plugins/pruebas/probar-manifiesto.ts
npx tsx docs/galeria-ejemplo/plugins/pruebas/probar-protocolo.ts
```

- **probar-zip**: cada ZIP por `extraerZipSeguro` + `leerManifiesto` (los dos
  módulos son puros en disco, no necesitan Electron), el sha256 contra el
  manifiesto de la galería y las imágenes por `resolverImagenVisual`.
- **probar-manifiesto**: el manifiesto de la galería por el cargador de verdad
  (`manifiesto()` y `resumirRiesgoPlugin` de `electron/main/integraciones/galeria.ts`), con
  `net.fetch` sustituido por el fichero local. Comprueba que ve **6** entradas
  `kind: 'plugin'` con su sha256 y su uuid, que el sha256 es el del ZIP de
  verdad y que los dos perfiles de antes siguen ahí.
- **probar-protocolo**: levanta el anfitrión de verdad (`crearAnfitrion`) y le
  mete el código real de cada plugin en un contexto de `node:vm` con un
  `WebSocket` de puente: registro, `willAppear`, teclas cortas y largas,
  `setTitle`/`setImage`/`setSettings`. Comprueba el glifo pintado contando los
  `<circle>` de la imagen (la cara del dado son sus puntos; el día, sus
  dígitos). `VD_TEST_VERBOSE=1` enseña el registro del anfitrión.

Lo que **no** cubren: el Property Inspector (necesita la ventana real de
Electron) y el encadenado de fases del pomodoro (son 25 minutos).

## Notas para quien siga

- **`dist/` está en el `.gitignore` de la raíz.** Los ZIP tienen que versionarse
  (la tienda los baja de `raw.githubusercontent.com`), así que esta carpeta lleva
  un `.gitignore` propio con `!dist/`. Si algún día dejara de funcionar, el
  arreglo es una excepción en el de la raíz.
- **Las entradas van dentro de `profiles`**, con `kind: 'plugin'`: es la única
  lista que lee el cargador (`galeria.ts:170` hace `j.profiles`), y
  `sanearEntrada` ya distingue `plugin` de `page` y de perfil. Una clave
  `plugins` propia sería un manifiesto que la tienda no ve. Sin `sha256` y sin
  `uuid` una entrada de plugin ni se lista (`traeRespaldoPlugin`).
- **`sha256` de los ZIP cambia** con cualquier retoque: hay que volver a
  correr `npm run build:plugins` para que el manifiesto no mienta.