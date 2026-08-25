# Catálogo de acciones

Toda acción es un objeto `ButtonAction` con `type` y los campos específicos a ese tipo. Las cadenas de un botón se ejecutan en orden por `runActionSequence` (`src/utils/actions.ts`).

Campos comunes opcionales para cada paso de una cadena:

| Campo | Tipo | Comportamiento |
|-------|------|---------------|
| `delayMs` | número | Espera N ms antes del paso (sobrescribe los 150 ms por defecto). |
| `onlyIfPrevOk` | bool | Salta el paso si el anterior falló. |
| `repeat` | número | Repite el paso N veces. |

Cualquier campo string que mencione "*acepta {variables}*" es interpolado en runtime con `config.state` antes de ejecutarse.

---

## Apps y archivos

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `app` | `appPath`, `appArgs?` | Lanza un ejecutable. Acepta `{variables}` en `appPath` y `appArgs`. |
| `web` | `url` | Abre URL en el navegador por defecto. |
| `shortcut` | `shortcutPath` | Abre un archivo o carpeta con la app asociada. |

## Sistema y media

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `script` | `script`, `scriptShell?` (`powershell`/`cmd`), `showOutput?` | Ejecuta script. Si `showOutput`, captura stdout y lo muestra en toast. |
| `audio-device` | `deviceId`, `deviceName?` | Cambia dispositivo de salida por defecto. |
| `volume-set` | `volumePercent` (0–100) | Establece volumen master a un porcentaje exacto. |
| `volume-up` / `volume-down` / `mute` | — | Teclas multimedia. |
| `media-play-pause` / `media-next` / `media-prev` | — | Control de medios. |
| `brightness` | `brightnessLevel` (0–100) | Controla brillo del monitor primario (vía WMI). |
| `kill-process` | `processName` | Cierra un proceso por nombre (ej. `notepad.exe`). |

## Atajos y texto

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `hotkey` | `hotkey` (ej. `Ctrl+Shift+M`) | Envía combinación de teclas a la app activa. |
| `clipboard` | `clipboardText` | Copia texto al portapapeles. Acepta variables. |
| `type-text` | `typeText` | Escribe texto automáticamente en la app activa. Acepta variables. |
| `notify` | `notifyTitle?`, `notifyBody?` | Notificación nativa de Windows. Acepta variables. |

## Variables (estado global)

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `set-var` | `varName`, `varValue` | Asigna un valor a la variable. `varValue` admite interpolación de otras variables. |
| `incr-var` | `varName`, `varDelta` | Suma `varDelta` (entero, puede ser negativo) al valor numérico actual. |

Las variables se leen como `{nombre}` en cualquier campo de tipo string en otras acciones.

## Web y voz

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `webhook` | `webhookUrl`, `webhookMethod?` (default `POST`), `webhookHeaders?` (JSON string), `webhookBody?` | HTTP request genérico. Headers y body aceptan `{variables}`. |
| `tts` | `ttsText` | Reproduce el texto en voz alta (Windows SpeechSynthesizer vía PowerShell). Acepta variables. |
| `region-capture` | — | Abre la herramienta nativa de captura de región (Win+Shift+S). El recorte queda en el portapapeles. |

## Subir y bajar

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `adjust` | `adjustTarget` (`brightness`/`volume`), `adjustDelta` | Sube o baja **desde donde esté**, en vez de fijar un número. La rueda del ratón sobre la celda también funciona: arriba suma, abajo resta. Un `adjustDelta` negativo hace que la pulsación baje. |

## RGB

Requieren OpenRGB — ver [Sensores y RGB](Sensores-y-RGB).

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `rgb-color` | `rgbDeviceId?`, `rgbColor` | Pinta un color sólido. Sin dispositivo, en todos. |
| `rgb-mode` | `rgbDeviceId?`, `rgbMode`, `rgbColor?` | Cambia el modo o efecto del dispositivo (Direct, Breathing, Rainbow…). El color solo se aplica en los modos que lo usan. |
| `rgb-profile` | `rgbProfileId` | Aplica un perfil RGB guardado desde el gestor. |
| `rgb-preset` | `rgbPresetId` | Aplica uno de los 18 presets incluidos. Cada preset prueba varios modos hasta dar con uno compatible con el dispositivo. |

## Ventanas

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `window-snap` | `snapPosition`, `snapProcessName?` | Coloca y redimensiona una ventana: mitades, cuartos, maximizar, centrar o restaurar. Sin nombre de proceso, actúa sobre la ventana que esté en primer plano al ejecutarse. |

## Control de flujo

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `branch` | `branchVar`, `branchOp`, `branchValue`, `branchThen`, `branchElse?` | Compara una variable y ejecuta una rama u otra. Operadores: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `empty`, `not-empty`. |
| `countdown` | `timerDelay` (ms), `timerActions` | Espera y luego ejecuta una sub-secuencia. |

## Media extendido

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `media-shuffle` | — | Alterna la reproducción aleatoria del reproductor activo. |
| `media-repeat` | — | Cicla el modo de repetición: ninguno → lista → pista. |

Los dos necesitan una sesión de medios activa en Windows.

## Macros

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `macro` | `macroSteps`, `macroRepeat?` | Reproduce una secuencia grabada o escrita de teclas, clics, movimientos y pausas. Ver [Atajos y macros](Atajos-y-Macros). |

## Carpeta (sub-deck)

| Tipo | Campos | Descripción |
|------|--------|-------------|
| `folder` | `folderButtons` (lista de hasta 12 sub-botones) | Al ejecutarse abre un overlay con los sub-botones. Cada sub-botón es a su vez una acción simple. |

## Toggle

Cualquier acción no `folder` puede marcarse como **toggle**. El botón mantiene un estado runtime (encendido/apagado) y opcionalmente puede definir `actionToggleOff` con una acción distinta para cuando se apaga. Si `actionToggleOff` está vacío, repite la misma acción.

## Disparadores externos

Independientemente del tipo, un botón puede tener:

- `globalHotkey`: combinación de teclas registrada a nivel SO (ej. `Ctrl+Alt+1`). Funciona aunque VirtualDeck esté en background.
- `inTrayMenu`: aparece en el menú contextual del tray.

Ambos ejecutan la cadena del botón mediante el canal IPC `button:trigger`. Los interruptores, las variables y los demás efectos se aplican igual que con un clic en la cuadrícula.
