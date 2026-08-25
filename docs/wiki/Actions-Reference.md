# Action catalogue

Every action is a `ButtonAction` object with a `type` and the fields specific to
that type. A button's chain runs in order (`runActionSequence` in
`src/utils/actions.ts`).

Optional fields available on each step of a chain:

| Field | Type | Behaviour |
|---|---|---|
| `delayMs` | number | Wait N ms before this step (overrides the 150 ms default). |
| `onlyIfPrevOk` | bool | Skip this step if the previous one failed. |
| `repeat` | number | Repeat this step N times. |

Any string field described as *accepts {variables}* is interpolated with
`config.state` right before it runs.

---

## Apps and files

| Type | Fields | Description |
|---|---|---|
| `app` | `appPath`, `appArgs?` | Launches an executable. Accepts `{variables}` in both fields. |
| `web` | `url` | Opens a URL in the default browser. |
| `shortcut` | `shortcutPath` | Opens a file or folder with its associated app. |

## System and media

| Type | Fields | Description |
|---|---|---|
| `script` | `script`, `scriptShell?` (`powershell`/`cmd`), `showOutput?`, `captureToVar?` | Runs a script. Can show stdout in a toast and/or store it in a variable. |
| `audio-device` | `deviceId`, `deviceName?` | Switches the default output device. |
| `volume-set` | `volumePercent` (0–100) | Sets the master volume to an exact percentage. |
| `volume-up` / `volume-down` / `mute` | — | Media keys. |
| `media-play-pause` / `media-next` / `media-prev` | — | Playback control. |
| `media-shuffle` | — | Toggles shuffle on the active player. |
| `media-repeat` | — | Cycles the repeat mode: none → list → track. |
| `brightness` | `brightnessLevel` (0–100) | Sets the primary monitor's brightness via WMI. |
| `kill-process` | `processName` | Closes a process by name, e.g. `notepad.exe`. |

`media-shuffle` and `media-repeat` need an active Windows media session.

## Step up and down

| Type | Fields | Description |
|---|---|---|
| `adjust` | `adjustTarget` (`brightness`/`volume`), `adjustDelta` | Moves the value **from wherever it is**, instead of setting a number. The mouse wheel over the cell works too: up adds, down subtracts. A negative `adjustDelta` makes the press go down. |

## Keystrokes and text

| Type | Fields | Description |
|---|---|---|
| `hotkey` | `hotkey`, e.g. `Ctrl+Shift+M` | Sends a key combination to the foreground app. |
| `macro` | `macroSteps`, `macroRepeat?` | Replays a recorded or hand-written sequence of keys, clicks, movements and pauses. See [Shortcuts & Macros](Shortcuts-and-Macros). |
| `clipboard` | `clipboardText` | Copies text to the clipboard. Accepts variables. |
| `type-text` | `typeText` | Types text into the foreground app. Accepts variables. |
| `notify` | `notifyTitle?`, `notifyBody?` | Native Windows notification. Accepts variables. |

## Variables (global state)

| Type | Fields | Description |
|---|---|---|
| `set-var` | `varName`, `varValue` | Assigns a value. `varValue` may reference other variables. |
| `incr-var` | `varName`, `varDelta` | Adds `varDelta` (integer, may be negative) to the current numeric value. |

Variables are read as `{name}` in any string field of any other action.

## Web and voice

| Type | Fields | Description |
|---|---|---|
| `webhook` | `webhookUrl`, `webhookMethod?` (default `POST`), `webhookHeaders?` (JSON string), `webhookBody?` | Generic HTTP request. Headers and body accept `{variables}`. |
| `tts` | `ttsText` | Reads the text aloud. Accepts variables. |
| `region-capture` | — | Opens the native region-capture tool (`Win+Shift+S`). The clip lands in the clipboard. |

## RGB

These need OpenRGB — see [Sensors & RGB](Sensors-and-RGB).

| Type | Fields | Description |
|---|---|---|
| `rgb-color` | `rgbDeviceId?`, `rgbColor` | Paints a solid colour. With no device, all of them. |
| `rgb-mode` | `rgbDeviceId?`, `rgbMode`, `rgbColor?` | Changes the device's mode or effect (Direct, Breathing, Rainbow…). The colour only applies to modes that use one. |
| `rgb-profile` | `rgbProfileId` | Applies an RGB profile saved from the manager. |
| `rgb-preset` | `rgbPresetId` | Applies one of the 18 built-in presets. Each preset tries several modes until it finds one the device supports. |

## Windows

| Type | Fields | Description |
|---|---|---|
| `window-snap` | `snapPosition`, `snapProcessName?` | Positions and resizes a window: halves, quarters, maximise, centre or restore. With no process name it acts on whatever is in the foreground when it runs. |

## Flow control

| Type | Fields | Description |
|---|---|---|
| `branch` | `branchVar`, `branchOp`, `branchValue`, `branchThen`, `branchElse?` | Compares a variable and runs one branch or the other. Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `empty`, `not-empty`. |
| `countdown` | `timerDelay` (ms), `timerActions` | Waits, then runs a sub-sequence. |

## Folder (sub-deck)

| Type | Fields | Description |
|---|---|---|
| `folder` | `folderButtons` (up to 12 sub-buttons) | Opens an overlay with the sub-buttons. Each one is itself a simple action. |

## Toggle

Any non-`folder` action can be marked as a **toggle**. The button keeps an
on/off state and can define `actionToggleOff` with a different action for
turning off; if it is empty, the same action repeats.

The state is stored and **shared across all three screens** — main, fullscreen
and the floating bar — and survives restarting.

Give a toggle a `radioGroup` and only one button of that group can be on at a
time: turning one on turns the others off.

## External triggers

Regardless of type, a button can have:

- `globalHotkey`: a key combination registered with the OS, e.g. `Ctrl+Alt+1`.
  Works whether VirtualDeck is visible or in the tray.
- `inTrayMenu`: shows up in the tray icon's context menu.
- `timerTriggerAt`: fires at a given time of day.
- a sensor threshold: fires when a reading crosses a value.

All of them run the button's chain exactly like a mouse click does — toggles,
radio groups, variables and script output included.
