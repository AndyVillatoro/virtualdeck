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

Ambos disparan la cadena del botón vía IPC `button:trigger`. Toggles, variables y demás efectos se aplican igual que un click en la grilla.
