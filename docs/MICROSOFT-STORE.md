# Publicar en la Microsoft Store

Guía de trabajo para llevar VirtualDeck a la Store como **Win32 empaquetada en
MSIX con `runFullTrust`**. Incluye el texto literal de las notas para el
revisor, que es lo que decide si esto sale a la primera.

> **Antes de nada, confirmá una cosa en Partner Center**: la Store también
> acepta instaladores **`.exe`/`.msi` sin empaquetar**. Si esa vía no exige
> certificado de firma propio, es preferible — no se pierde nada y no hay
> conversión. Todo este documento asume que sí lo exige y que por eso se va a
> MSIX, donde **Microsoft firma el paquete**.

---

## 1. Estado y decisiones tomadas

| Asunto | Decisión |
|---|---|
| Cambiar dispositivo de audio (`IPolicyConfig`) | **Se mantiene.** Se defiende en la revisión; ver §4. |
| Grabador de macros | **Se mantiene.** Cumple los requisitos de divulgación; si lo rechazan, se quita entonces. |
| Migrar la configuración de instalaciones anteriores | **No se hace.** Solo hay instalaciones del propio autor. |
| Distribución | **Doble**: NSIS en GitHub (completa) + MSIX en la Store. |

---

## 2. Qué hay que cambiar en el código

Ninguna de estas cosas afecta a la versión de GitHub: van todas detrás de una
condición por variante de compilación.

### 2.1 Desactivar la actualización automática — **obligatorio**

La Store actualiza ella, y `electron-updater` intentaría escribir en el
directorio de instalación, que en MSIX es de **solo lectura**.

`electron/main/ipc/updateIpc.ts` ya carga el módulo de forma dinámica y tolera
que no exista, así que basta con no cargarlo en la variante de la Store.

### 2.2 Arranque con Windows — **obligatorio**

`app.setLoginItemSettings()` escribe en `HKCU\...\Run`. En MSIX esa escritura se
**virtualiza y Windows no la lee**: el arranque automático no ocurriría, y sin
ningún error visible.

El equivalente es una extensión del manifiesto:

```xml
<Extensions>
  <desktop:Extension Category="windows.startupTask"
                     Executable="VirtualDeck.exe"
                     EntryPoint="Windows.FullTrustApplication">
    <desktop:StartupTask TaskId="VirtualDeckStartup"
                         Enabled="false"
                         DisplayName="VirtualDeck" />
  </desktop:Extension>
</Extensions>
```

Ojo: la extensión **no admite argumentos**, así que la marca `--oculto` que hoy
hace que arranque en la bandeja hay que resolverla de otra forma — por ejemplo,
detectando el arranque por StartupTask, o guardando la intención en la
configuración.

### 2.3 LibreHardwareMonitor — **resuelto, ya no es un riesgo**

Era el mayor riesgo de esta lista: `resources/lhm/` iba dentro del paquete y LHM
**escribe su configuración junto a su propio `.exe`**, cosa que en MSIX es
imposible porque el directorio de instalación es de solo lectura. Los sensores
habrían dejado de funcionar y no se podía saber leyendo código.

**Se quitó del empaquetado.** LHM pasa a instalarlo el usuario, igual que
OpenRGB.

El instalador baja de **87,6 a 80,2 MB**. Bastante menos de lo que sugieren los
19 MB de la carpeta: dentro del instalador va comprimida, así que el ahorro real
son 7,4 MB. Se midió compilando, porque restar tamaños en crudo da un número
que no es.

Lo que había que compensar: la copia empaquetada traía el servidor web ya
activado, y una instalación propia lo trae apagado. La interfaz lo explica y
enlaza la descarga, en vez de limitarse a no funcionar.

### 2.4 Dónde vive la configuración — **no requiere trabajo**

En MSIX las escrituras a AppData se redirigen a
`%LOCALAPPDATA%\Packages\<PackageFamilyName>\LocalCache\Roaming\`. Una
instalación de la Store empieza, por tanto, con la configuración vacía.

Se ha decidido **no migrar**. Es una instalación nueva y se reconfigura.

---

## 3. Cómo se compila

`electron-builder` trae el target `appx`. En `package.json`, dentro de `build`:

```json
"appx": {
  "applicationId": "VirtualDeck",
  "identityName": "<el que asigne Partner Center>",
  "publisher": "<CN=... tal cual lo dé Partner Center>",
  "publisherDisplayName": "<nombre público>",
  "displayName": "VirtualDeck",
  "backgroundColor": "#0f0f0f",
  "showNameOnTiles": true,
  "languages": ["es-ES", "en-US"]
}
```

`identityName` y `publisher` **tienen que salir literalmente de Partner Center**;
inventarlos hace que la Store rechace el paquete sin explicar por qué.

**Ya están puestos** (2026-09-05), tal cual los dio Partner Center:
`CubeCode.VirtualDeck`, `CN=93305558-E31B-4038-90C7-98609F235071`, `CubeCode`.
Comprobados dentro del `.appx` generado, no solo en `package.json`.

### Los iconos: sin `build/appx/` el paquete sale con los de Microsoft

Si no existe esa carpeta, electron-builder mete **sus propias imágenes de
ejemplo** (`SampleAppx.150x150.png` y compañía) y **no dice nada**: el paquete se
construye limpio y la aplicación aparece en el menú de inicio con un icono
generico. Se vio leyendo el `mapping.txt` que genera, no por ningún aviso.

`npm run build:appx-icons` los deriva del mismo `build/icon.png` que usa todo lo
demás, sobre `#0f0f0f` — los mosaicos de Windows no son transparentes, y un PNG
con alfa saldría sobre el color de acento del usuario.

### `makeappx.exe` no arranca — el empaquetado falla con `spawn UNKNOWN`

electron-builder 24 trae su propio `makeappx.exe` de 2018, y en Windows 11
(26200) **no arranca**. El error que enseña es solo `spawn UNKNOWN`; el motivo
de verdad está en el registro de eventos de Windows, en `SideBySide`:

> No se encontró el ensamblado dependiente
> `Microsoft.Windows.Build.Appx.AppxPackaging.dll`

La carpeta del vendor trae los `.manifest` de esos ensamblados privados **sin las
DLL que describen**. No es la caché corrupta: se borró entera, se volvió a bajar
y falla igual. Tampoco es Smart App Control.

El apaño, comprobado: dejar que electron-builder prepare el montaje —hasta ahí
llega bien— y empaquetar con el `makeappx.exe` del **SDK de Windows**, que sí
funciona:

**Desde PowerShell, no desde Git Bash.** Git Bash convierte `/f` y `/p` en rutas
y `makeappx` contesta `Unknown command line option: "F:/"`, que parece un error
de sintaxis y no lo es.

```powershell
npm run build:store   # falla al final; deja dist\__appx-x64\ preparado
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\makeappx.exe" `
    pack /f "dist\__appx-x64\mapping.txt" /p "dist\VirtualDeck-X.Y.Z.appx" /o
```

Antes de subirlo, abrir el manifiesto que quedo montado
(`dist\__appx-x64\AppxManifest.xml`) y comprobar cuatro cosas: son las que se
pierden en silencio y no se notan hasta tener la aplicacion instalada.

| Que | Se busca en el manifiesto |
|---|---|
| La version | `Version="X.Y.Z.0"` |
| El enlace `virtualdeck://` | `windows.protocol` |
| El arranque escondido | `windows.startupTask` y `--oculto` |
| Los iconos propios | que los PNG salgan de `build/appx/`, no `SampleAppx` |

Hay que llamarlo **por su ruta del SDK**: copiado a otra carpeta falla igual.
Resultado comprobado el 2026-09-05: 116,5 MB, 121 entradas, el núcleo nativo
dentro (`app/resources/app.asar.unpacked/native/vd-core.node`) y los 7 iconos.

Para probar en local hace falta **firmar con un certificado autofirmado** e
instalarlo como raíz de confianza. Solo para sideload: el paquete que se sube a
la Store lo firma Microsoft.

---

## 4. Notas para el revisor

Este texto va en Partner Center, en **«Notes for certification»**. En inglés,
que es lo que lee el equipo de revisión. Está escrito para adelantarse a las tres
preguntas que este tipo de aplicación provoca.

```text
VirtualDeck is an open-source desktop automation utility ("software Stream
Deck"): a grid of user-configured buttons that launch apps, send keyboard
shortcuts, run scripts, switch the audio output device and control media
playback. Source code: https://github.com/AndyVillatoro/virtualdeck
Privacy policy: https://andyvillatoro.github.io/virtualdeck/privacidad.html

The app is packaged as a full-trust Win32 application (runFullTrust). Three
aspects may need context:

1. GLOBAL KEYBOARD AND MOUSE CAPTURE (macro recorder)
   The app can record macros — sequences of keystrokes and clicks that the user
   replays later. Recording is:
   - Started ONLY by the user pressing an explicit "RECORD" button in the macro
     editor. There is no other code path that enables capture, and no way to
     start it automatically, on a schedule or remotely.
   - Visibly indicated: a blinking "REC" indicator is shown for the entire
     duration.
   - Stopped by the user pressing "STOP".
   - Stored as the steps of that macro, in the user's local configuration file.
     Every step is listed, editable and deletable in the UI.
   - NEVER transmitted. The application has no telemetry, no analytics, no
     accounts and no server of any kind. Captured input does not leave the
     device.
   To verify: open any button's editor, choose the "Macro" action, and observe
   that no capture occurs until RECORD is pressed.

2. CHANGING THE DEFAULT AUDIO OUTPUT DEVICE
   One of the button action types switches the system's default audio endpoint —
   the same operation a user performs in Settings > System > Sound, or from the
   volume flyout.
   Windows exposes no public API for this. The documented MMDevice API can
   enumerate endpoints but cannot set the default one. The only available
   mechanism is the IPolicyConfig COM interface, which is what the Windows shell
   itself uses and what every third-party audio switcher relies on.
   This is used strictly to apply a user preference, in direct response to the
   user pressing a button they configured for that purpose. It does not
   circumvent any security boundary, does not require elevation, does not affect
   other applications' data, and changes nothing a user could not change through
   Settings.
   If the certification team considers this unacceptable, we will remove this
   single action type from the Store build; the rest of the application does not
   depend on it.

3. RUNNING USER-PROVIDED PROGRAMS AND SCRIPTS
   Buttons can launch executables and run PowerShell/CMD scripts, because that is
   the purpose of the product: automating what the user already does manually.
   Only commands the user typed into the editor are executed. The app does not
   download, generate or execute code fetched from anywhere.

4. OPTIONAL LOCAL HTTP SERVER (off by default)
   The user can enable a small HTTP server so their phone, a .bat file or a home
   automation system can press buttons remotely. It is worth stating plainly
   what this is, because it is the one feature that opens a listening socket:
   - It is DISABLED by default and never turns itself on.
   - It binds to 127.0.0.1 unless the user explicitly allows the local network.
   - Every endpoint except a liveness ping requires a 24-byte random token sent
     in a custom header, compared in constant time. Requests carrying any
     Origin header are rejected, and the Host header is checked, so a web page
     cannot reach it via DNS rebinding.
   - The phone pairs with a 6-digit code that expires in 5 minutes and allows
     5 attempts.
   - It serves only the app's own remote-control page and the button API. It is
     not a general-purpose web server and exposes no files.
   The endpoints it exposes press buttons the same user already configured, so
   it grants no capability the user does not already have locally.

OPTIONAL ELEVATION
   The hardware-sensor feature can start LibreHardwareMonitor, a separate
   open-source tool the user installs themselves (it is NOT bundled with this
   app), which needs administrator rights to read certain sensors. Elevation is requested through
   the standard Windows UAC prompt, only if the user enables that feature, and
   the app is fully functional without it.

DONATION LINKS (third-party purchase API disclosure, policy 10.8.2)
   Settings contains two links that open the user's browser at ko-fi.com and
   paypal.me so they can donate voluntarily. Nothing is sold, nothing is
   unlocked, and no digital goods or services are given in return; the
   application is fully functional and identical whether or not anyone donates.
   No payment or financial information is ever entered into or handled by the
   app. We are declaring this here as the use of a secure third-party purchase
   API, per policy 10.8.2.

The application collects no personal data whatsoever.
```

---

## 5. Ficha de la Store

> Leído de la documentación oficial el 2026-09-07
> ([crear el envío](https://learn.microsoft.com/es-mx/windows/apps/publish/publish-your-app/msix/create-app-submission),
> [propiedades](https://learn.microsoft.com/es-mx/windows/apps/publish/publish-your-app/msix/enter-app-properties),
> [declaraciones](https://learn.microsoft.com/es-mx/windows/apps/publish/publish-your-app/msix/product-declarations),
> [imágenes](https://learn.microsoft.com/es-mx/windows/apps/publish/publish-your-app/msix/screenshots-and-images)).

### 5.1. Las seis secciones del envío, y qué es obligatorio

El envío se hace desde **Iniciar presentación** en la página de la aplicación.
No hay que seguir el orden; sí hay que completarlas todas. Partner Center marca
una sección como incompleta hasta que **todos** sus campos obligatorios estén,
aunque los paquetes individuales digan «validado».

| Sección | Obligatorio | Para VirtualDeck |
|---|---|---|
| **Precios y disponibilidad** | Mercados, audiencia, detectabilidad, calendario, precio base | Todos los mercados · pública · detectable · cuanto antes · **gratis** |
| **Propiedades** | Categoría · privacidad si toca | `Utilidades y herramientas` · la URL de privacidad **sí** hace falta (ver 5.3) |
| **Clasificaciones por edad** | Todas las preguntas | Cuestionario IARC, sin contenido sensible → 3+ |
| **Paquetes** | Al menos un paquete | El `.msix` de `npm run build:store` |
| **Descripciones de la Store** | Descripción · **al menos una captura** · logotipo | Ver 5.4 y 5.5 |
| **Opciones de envío** | Solo si se declaran funcionalidades restringidas | Aquí van las notas de §4 |

### 5.2. Declaraciones de producto — cuáles marcar

Tres vienen **marcadas de fábrica** y hay que revisarlas, no dejarlas por
inercia:

- *«permite compras sin usar el comercio de Microsoft»* — **marcar**, y decirlo
  también en las notas de certificación. Ver 5.2.1: hay enlaces de donación
  dentro de la aplicación y la política obliga a declararlo.
- *«instalable en unidades alternativas»* — dejar marcada, no estorba.
- *«Windows puede incluir sus datos en copias de OneDrive»* — dejar marcada: la
  configuración es un JSON pequeño y que se respalde solo es a favor del usuario.

### 5.2.1. Los enlaces de donación, y por qué hay que declararlos

La política 10.8.2 (versión 7.19, leída el 2026-09-07) dice, literal, que para
recibir **donaciones voluntarias** hay que usar «the Microsoft payment request
API or a secure third-party purchase API» — y que **si el usuario recibe algo a
cambio** (funciones extra, quitar anuncios) entonces **obliga** a la API de
compra de la Store.

Para VirtualDeck eso se traduce en dos reglas:

1. **La donación no puede dar nada a cambio.** Ni una función, ni un tema, ni
   quitar nada. Hoy es así y tiene que seguir siéndolo: en cuanto el botón de
   donar desbloquee algo, la vía de PayPal deja de estar permitida.
2. **Hay que declararlo en Partner Center.** La misma política: *«You must note
   the use of a secure third-party purchase API in Partner Center during the
   submission process.»* Se hace marcando la casilla de declaraciones y
   repitiéndolo en las notas de certificación, que no cuesta nada.

Lo que **no** hace falta es una cuenta de empresa: 10.8.3 solo la exige si el
producto **necesita** información financiera para funcionar. Un enlace que abre
el navegador no es eso.

**No marcar «probado para cumplir las directrices de accesibilidad».** Es una
promesa concreta —contraste 4.5:1, navegación completa por teclado, probado con
Narrador y alto contraste— y VirtualDeck no se ha probado así. Declararlo sin
haberlo hecho trae reseñas malas y es faltar a la verdad.

No aplican: IA generativa, lápiz y tinta, grabación de juego.

### 5.3. La política de privacidad, aunque no se recoja nada

La documentación dice que es obligatoria si la aplicación **accede, recopila o
transmite** información personal, y que **Microsoft puede exigirla igualmente
según las funcionalidades que declare el paquete** — y que si falta, la
certificación falla. VirtualDeck sale a internet (clima, divisas, galería), así
que se pone y no se discute:

`https://andyvillatoro.github.io/virtualdeck/privacidad.html` — ya está en pie.

### 5.4. Imágenes: los números exactos

| Recurso | Tamaño | ¿Obligatorio? |
|---|---|---|
| **Captura de escritorio** | **1366×768 o mayor**, PNG, hasta 50 MB | **Sí, al menos una.** Recomiendan 4-6 |
| **Icono de mosaico 1:1** | **300×300** PNG | Muy recomendado. Si no se sube, la Store usa el del paquete |
| Superhéroe 16:9 | 1920×1080 o 3840×2160 PNG | Opcional. Sin texto encima |
| Tráiler | MP4/MOV **1920×1080**, ≤2 GB, ≤60 s | Opcional, y pide miniatura PNG 1920×1080 aparte |

Reglas que afectan al diseño de las capturas:

- **Lo importante en los dos tercios de arriba.** El tercio inferior puede
  quedar tapado por superposiciones de la propia Store.
- **Sin logotipos ni mensajes de marketing encima.** Capturas, no carteles.
- Nada de contrastes extremos que estropeen el texto que la Store superpone.
- Hasta 10 capturas de escritorio. Se muestran en el orden en que se suban.
- **Las imágenes se suben por idioma, aunque sean las mismas.** Con ficha en
  español e inglés, hay que subirlas dos veces.

Las imágenes ya están hechas y **se vuelven a generar solas**: siete capturas a
1920×1080 y el mosaico de 300×300, en [`docs/prensa/`](prensa/README.md). Salen
de la aplicación corriendo (`node scripts/prensa/capturar.mjs`), no de un editor
de imágenes, así que después de cambiar la interfaz se rehacen en un comando en
vez de a mano. Ese README dice de dónde sale cada dato que se ve y lleva el
repaso de privacidad captura por captura.

### 5.4.1. Lo que se aprendio rellenando el formulario de verdad (2026-09-07)

Cosas que la documentacion no dice y el formulario no explica:

**«Propiedades: incompleta» sin decir por que.** La causa fue **Modo de
presentacion → PC**, marcado por error. Esa casilla significa «esta experiencia
esta disenada para una **visualizacion envolvente de Windows Mixed Reality**», no
«funciona en un PC». Al marcarla, Partner Center exige declarar el casco de
realidad mixta como hardware minimo o recomendado, y hasta que no lo haces la
seccion se queda incompleta. **Dejar las dos casillas sin marcar.**

**Familias de dispositivos: solo «Escritorio de Windows 10/11».** El manifiesto
declara `TargetDeviceFamily Name="Windows.Desktop"`, asi que en Xbox, Surface Hub
(«Equipo de Windows 10» en la traduccion) o HoloLens («Realidad Mixta») no se
puede instalar de ninguna manera. Marcarlas no anade alcance: promete
disponibilidad donde el paquete no entra.

**Subcategoria: ninguna.** «Utilidades y herramientas» solo tiene dos
—*Copia de seguridad y gestion* y *Administradores de archivos*— y ninguna
describe esto. La subcategoria es **opcional**; poner «Administradores de
archivos» seria mentir sobre lo que hace. Como categoria **secundaria**,
*Productividad* si encaja. Y en los ejemplos de la propia categoria aparece
«controles remotos», que es exactamente esto.

**«Compatible con la entrada de lapiz y tinta»: no marcar.** Es para
experiencias de entintado —anotar, dibujar a mano, Windows Ink—. Que un lapiz
funcione porque el sistema lo traduce a tacto no es lo que declara esa casilla.

**Requisitos del sistema: usar la columna «Recomendado», no «Minimo».** Lo que
se pone en minimo hace que la Store avise al cliente antes de descargar y le
**impida puntuar la aplicacion**. Lo recomendado no avisa.

**`runFullTrust` pide justificacion aparte, y el campo es corto.** Partner Center
detecta la capacidad restringida y abre un cuadro obligatorio en **Opciones de
envio → Funcionalidades restringidas**. Ahi **no cabe** el texto de \u00a74: se corta
alrededor de los 500 caracteres. Va la version breve de \u00a74.1; el texto largo va
en **Notas para la certificacion**, que en esa pagina es un enlace a
*informacion de pruebas adicional*, otra pagina distinta.

### 5.5. Resumen operativo

| Campo | Qué poner |
|---|---|
| Categoría | Utilidades y herramientas |
| Política de privacidad | `https://andyvillatoro.github.io/virtualdeck/privacidad.html` — **obligatoria**, no se puede enviar sin ella |
| Clasificación por edad | Cuestionario IARC. No hay contenido sensible; sí hay que declarar que la app **accede a internet** (clima, divisas) |
| Idiomas | es-ES, en-US — la app está traducida a los dos |
| Capturas | Mínimo 1, recomendable 4-6: la rejilla, el editor, pantalla completa, el gestor RGB |
| Declaración de datos | «No recoge datos» — es cierto y hay que sostenerlo |

---

## 4.1. `runFullTrust`: la version corta, para el cuadro de Partner Center

El cuadro de **Funcionalidades restringidas** corta alrededor de los 500
caracteres. Esta version cabe, y pone lo decisivo en la primera frase por si
acaso:

```text
VirtualDeck needs runFullTrust because every action it performs uses Win32 APIs unavailable to AppContainer apps: CreateProcess to launch the user's programs, SendInput for keyboard shortcuts and macros, PowerShell/CMD for the user's own scripts, and IPolicyConfig to switch the default audio device. Only commands the user typed into the editor are executed; nothing is downloaded or generated. Source: github.com/AndyVillatoro/virtualdeck
```

---

## 5.6. Donaciones desde Honduras

Comprobado el 2026-09-07, porque explica por qué «las otras opciones no
funcionan» y no es culpa de la configuración:

**Stripe no opera en Honduras.** En América Latina solo cubre Brasil y México
([stripe.com/global](https://stripe.com/global)). Y de ahí se cae todo lo demás
en cadena:

| Plataforma | Por qué no | ¿Sirve? |
|---|---|---|
| GitHub Sponsors | Exige Stripe Connect con la región de residencia **igual** a la del banco | No, salvo con *fiscal host* — y eso solo se elige **al registrarse**, no después |
| Ko-fi | Solo acepta Stripe o PayPal | Sí, **con PayPal** |
| Buy Me a Coffee | Igual | Sí, con PayPal |
| Patreon | Paga por **Payoneer** fuera de EE. UU., 190+ países | Sí |
| Microsoft Store | Paga por PayPal, ACH/SEPA o transferencia | Sí, PayPal llega en un día hábil |

Conclusión: **no falta una plataforma, falta Stripe.** PayPal y Payoneer son las
dos vías reales, y encima de ellas se puede poner la presentación que se quiera.

Recomendación, de menos a más trabajo:

1. **Ko-fi con PayPal.** Un enlace decente en vez de un botón de PayPal suelto,
   sin comisión de la plataforma, y el donante paga con tarjeta sin abrir cuenta.
   Media hora de trabajo.
2. **Payoneer**, si hace falta cobrar de sitios que no pagan por PayPal. Opera en
   Honduras. Es lo que destraba Patreon.
3. **Patreon** solo si se quiere algo recurrente. Para una utilidad gratuita
   suele rendir menos que un enlace de propina bien puesto.

Lo que **no** conviene: pelearse con GitHub Sponsors. No es un ajuste mal
puesto, es que el país no está.

---

## 6. Orden de trabajo recomendado

1. **Confirmar si la vía `.exe` sin empaquetar exige firma.** Decide si el resto
   hace falta.
2. Crear la cuenta (19 USD, individual) y reservar el nombre **VirtualDeck**.
   Reservar el nombre es gratis y bloquea que otro lo tome.
3. Sacar `identityName` y `publisher` de Partner Center.
4. Compilar un `appx` de prueba, firmarlo con certificado autofirmado e
   instalarlo.
5. Probar el resto con el paquete instalado. El riesgo de los sensores ya no
   existe: LHM se dejó fuera del paquete (§2.3).
6. Probar el arranque automático (§2.2) y que no aparezca el actualizador (§2.1).
7. Enviar, con las notas de §4 pegadas literalmente.

---

## 6.5. Lo que se comprobó con el paquete instalado (0.9.3)

Instalado de verdad, firmado con un certificado de prueba, y medido:

| Qué | Resultado |
|---|---|
| Identidad | `CubeCode.VirtualDeck` · `CN=93305558-…` · 0.9.3.0 |
| Argumento del arranque | El proceso recibe `--oculto`. `uap10:Parameters` **funciona** |
| Tarea de inicio | Registrada y habilitada (`State = 2`) tras el primer arranque |
| Enlace `virtualdeck://` | Registrado; invocarlo **arranca el paquete** con la URL |
| Actualizador | `update.check()` devuelve `status: 'store'` — desactivado de verdad |
| Configuración | **Aislada** en `%LOCALAPPDATA%\Packages\<familia>\LocalCache\Roamingirtualdeck`. La ruta que ve el proceso es la de siempre, pero Windows la redirige: la versión de la Store **no comparte** la configuración con la de GitHub |

Ojo con `Win32_StartupCommand`: devuelve valores **cacheados**. Aquí enseñó una
entrada del registro que ya no existía. Para el arranque automático hay que leer
la clave directamente.

**Lo único que falta por comprobar** es que la ventana no aparezca al iniciar
sesión. El argumento llega, y `windowManager` crea la ventana con
`show: !ARRANQUE_OCULTO`, pero eso solo se ve cerrando sesión y volviendo a
entrar.

---

## 7. Lo que ya está listo

- [x] Política de privacidad publicable y veraz (`docs/privacidad.html`),
      con el detalle del grabador de macros y de cada conexión de red.
- [x] Página de descarga (`docs/index.html`).
- [x] Notas para el revisor, en inglés (§4).
- [x] Target `appx` en `package.json`, con los valores reales de Partner Center.
- [x] Iconos del paquete (`build/appx/`, generados desde el icono del proyecto).
- [x] Un `.appx` construido y verificado por dentro.
- [x] Actualizador desactivado en la Store — **sin rama de compilación**: se mira
      `process.windowsStore` en ejecución, que Electron pone a `true` solo en el
      paquete MSIX. Con una variable de compilación habría dos builds y la
      posibilidad de publicar la equivocada. El botón «buscar actualizaciones»
      lo dice en vez de quedarse callado.
- [x] Extensión `windows.startupTask` en el manifiesto, **con el argumento**.
      `desktop:StartupTask` no acepta argumentos, pero el `desktop:Extension`
      que lo contiene sí: `uap10:Parameters`. Medido en una máquina real: el
      proceso recibe `--oculto` al iniciar sesión.
- [x] Enlace `virtualdeck://` declarado en el manifiesto. **Sin esto no
      existiría en la versión de la Store**: el registro que hace
      `setAsDefaultProtocolClient` está virtualizado dentro del paquete y
      Windows no lo mira. El punto 23 entero del roadmap dependía de ello.
- [x] LHM fuera del paquete — el riesgo de solo lectura desaparece.
