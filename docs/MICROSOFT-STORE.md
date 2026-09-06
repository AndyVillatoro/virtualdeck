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

```powershell
npm run build:store   # falla al final; deja dist\__appx-x64\ preparado
& "C:\Program Files (x86)\Windows Kitsin.0.26100.0d\makeappx.exe" `
    pack /f dist\__appx-x64\mapping.txt /p dist\VirtualDeck-X.Y.Z.appx /o
```

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
   download, generate or fetch code from anywhere, and there is no remote
   control surface.

OPTIONAL ELEVATION
   The hardware-sensor feature can start LibreHardwareMonitor, a separate
   open-source tool the user installs themselves (it is NOT bundled with this
   app), which needs administrator rights to read certain sensors. Elevation is requested through
   the standard Windows UAC prompt, only if the user enables that feature, and
   the app is fully functional without it.

The application collects no personal data whatsoever.
```

---

## 5. Ficha de la Store

| Campo | Qué poner |
|---|---|
| Categoría | Utilidades y herramientas |
| Política de privacidad | `https://andyvillatoro.github.io/virtualdeck/privacidad.html` — **obligatoria**, no se puede enviar sin ella |
| Clasificación por edad | Cuestionario IARC. No hay contenido sensible; sí hay que declarar que la app **accede a internet** (clima, divisas) |
| Idiomas | es-ES, en-US — la app está traducida a los dos |
| Capturas | Mínimo 1, recomendable 4-6: la rejilla, el editor, pantalla completa, el gestor RGB |
| Declaración de datos | «No recoge datos» — es cierto y hay que sostenerlo |

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
