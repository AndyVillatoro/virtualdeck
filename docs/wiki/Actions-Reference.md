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
| `script` | `script`, `scriptShell?` (`powershell`/`cmd`), `showOutput?`, `captureToVar?` | Runs a script. Can show stdout in a toast and/or store it in a variable. Both interpreters accept multiple lines and accented text. |
| `audio-device` | `deviceId`, `deviceName?`, `audioMode?` (`fixed`/`cycle-all`/`cycle-list`), `excludedDeviceIds?`, `audioCandidates?` (with per-candidate `label`/`icon`/`iconoPuntos`/`fgColor`/`bgColor`) | Switches the default output device. With `fixed` (or no mode) it picks the given output; with `cycle-all` it moves to the next active output in alphabetical order skipping `excludedDeviceIds`; with `cycle-list` it cycles `audioCandidates` in order skipping disconnected ones. Reactive icon and sublabel: they show the active system output (CASCO/MONIT/USB/ALTAV heuristic when there is no custom icon; the candidate label wins in `cycle-list`), and cycle buttons pulse with `onda`. The active mark follows the real system output: it does not combine with `isToggle`. |
| `volume-set` | `volumePercent` (0–100) | Sets the master volume to an exact percentage. |
| `app-volume` | `appVolumeTarget?` (empty = active app), `appVolumeMode` (`adjust`/`set`/`mute`), `appVolumeDelta?` (±, for `adjust`), `appVolumeLevel?` (0–100, for `set`) | Raises, lowers, sets or mutes the volume of one app (what the Volume Mixer shows). If the app has no open sound, the button fails with that notice. Needs the native core; no fallback without it. |
| `volume-up` / `volume-down` / `mute` | — | Media keys. |
| `media-play-pause` / `media-next` / `media-prev` | — | Playback control. |
| `brightness` | `brightnessLevel` (0–100) | Sets the primary monitor's brightness via WMI. |
| `kill-process` | `processName` | Closes a process by name, e.g. `notepad.exe`. |

## Keystrokes and text

| Type | Fields | Description |
|---|---|---|
| `hotkey` | `hotkey`, e.g. `Ctrl+Shift+M` | Sends a key combination to the foreground app. |
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
| `remote` | `remoteHost`, `remoteToken`, `remoteButton?`, `remotePage?` | Presses a button on **another** VirtualDeck on the network. The token is the other machine's (its settings → local server), which must have it on with LAN access allowed. Plain HTTP, no encryption. |
| `mobile-remote` | `mobileRemoteAction?` (`pair-code`/`toggle-server`/`open-web`) | Controls the local mobile remote web server: generates a 6-digit pairing code, toggles the server on/off, or opens the remote interface in the browser. |
| `tts` | `ttsText` | Reads the text aloud. Accepts variables. |
| `region-capture` | — | Opens the native region-capture tool (`Win+Shift+S`). The clip lands in the clipboard. |

## Step up and down

| Type | Fields | Description |
|---|---|---|
| `adjust` | `adjustTarget` (`brightness`/`volume`), `adjustDelta` | Moves the value **from wherever it is**, instead of setting a number. The mouse wheel over the cell works too: up adds, down subtracts. A negative `adjustDelta` makes the press go down. |

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
| `window-cycle` | `windowCycle?` (`next`, `prev`; default `next`) | Brings the next or previous window forward in a stable per-process order — not the most-recently-used order of `Alt+Tab`, where "next" changes every time. Needs the native core (`npm run build:native`); without it the button fails with an error instead of doing nothing. |

## Flow control

| Type | Fields | Description |
|---|---|---|
| `branch` | `branchVar`, `branchOp`, `branchValue`, `branchThen`, `branchElse?` | Compares a variable and runs one branch or the other. Operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `empty`, `not-empty`. |
| `countdown` | `timerDelay` (ms), `timerActions` | Waits, then runs a sub-sequence. Pick the action in the editor’s **WHEN DONE** field; without it the button waits and does nothing. Up to one hour. |
| `cycle` | `cycleSteps` (list of `{ id, label?, sublabel?, icon?, iconoPuntos?, fgColor?, bgColor?, action }`) | Rotates between several steps on each press. The button shows the current step’s label/sublabel/icon/colours (index stored in `state['__cycle_<id>']`), runs its `action`, and advances to the next. A step cannot contain another `cycle`. |

## Extended media

| Type | Fields | Description |
|---|---|---|
| `media-shuffle` | — | Toggles shuffle on the active player. |
| `media-repeat` | — | Cycles the repeat mode: none → list → track. |

Both need an active Windows media session.

## Macros

| Type | Fields | Description |
|---|---|---|
| `macro` | `macroSteps`, `macroRepeat?` | Replays a recorded or hand-written sequence of keys, clicks, movements and pauses. See [Shortcuts & Macros](Shortcuts-and-Macros). |

## Folder (sub-deck)

| Type | Fields | Description |
|---|---|---|
| `folder` | `folderButtons` (up to 12 sub-buttons) | Opens an overlay with the sub-buttons. Each one is itself a simple action. |

## Page navigation

| Type | Fields | Description |
|---|---|---|
| `page-nav` | `pageNav` (`next`, `prev`, `first`, `cycle`, `goto`), `pageNavTarget?` (page id) | Go to another page: the next one, the previous one, the first one, cycling forward with wrap-around, or a specific one by id. `next` and `prev` stop at the ends (no effect there). From a dock it moves between that dock's pages; from the deck, between the deck pages (dock pages excluded). |

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
- `timerTriggerAt`: fires at a given time of day. `timerTriggerDias` (a list of
  `Date.getDay()` numbers, 0 = Sunday … 6 = Saturday) limits it to those
  weekdays; empty or absent means every day.
- a sensor threshold: fires when a reading crosses a value.

Both run the button's action sequence via the `button:trigger` IPC channel.
Toggles, variables and other effects apply just as if clicked on the grid.

## Sequences and chained actions

A button can execute a sequence of actions (up to 8 additional steps). Each step features:

- `delayMs`: Delay (in ms) before running the step (default 150 ms between steps, or 0 ms if specified).
- `repeat`: Number of consecutive repetitions (1 to 99 times).
- Execution condition:
  - **ALWAYS**: Always runs when reached.
  - **ONLY IF OK** (`onlyIfPrevOk`): Runs only if the previous step succeeded.
  - **IF FAILED** (`onlyIfPrevFailed`): Runs only if the previous step failed (ideal for fallbacks or error alerts).
- **CONTINUE ON ERROR** (`continueOnError`): Allows subsequent steps in the sequence to continue even if this step fails.
- Visual reordering with step up and down controls in the editor.

## Third-party integrations (Discord & Spotify)

| Type | Fields | Description |
|---|---|---|
| `discord` | `discordAction` (`toggle-mute`, `toggle-deaf`, `mute`, `unmute`, `deaf`, `undeaf`) | Native voice control for Discord desktop via local Named Pipe (`\\.\pipe\discord-ipc-0..9`). Mute microphone or deafen audio with 0ms latency. |
| `spotify` | `spotifyAction` (`play-uri`, `transfer-playback`, `toggle-shuffle`, `toggle-repeat`), `spotifyUri?`, `spotifyDeviceId?` | Opens and plays playlists, tracks or albums directly in Spotify (supports `spotify:...` and `open.spotify.com` links), or transfers active playback via Spotify Web API. |


## Stream Deck plugins

| Type | Fields | Description |
|---|---|---|
| `plugin` | `plugin.pluginUuid`, `plugin.accionUuid`, `plugin.settings?` | Runs an action of a Stream Deck SDK plugin installed on this computer. When the button appears the plugin is told so, and pressing it gets the full key cycle (down, then up 60ms later). If the action ships a Property Inspector, the editor opens its window with the CONFIGURE button and whatever it saves there is kept in the `plugin.settings` of the button. The image and title the plugin sends replace the button ones in the cell. |

Plugins are installed and enabled in **Settings → Plugins**; an installed but disabled plugin cannot be picked. With none installed, the configuration step says so and says where to install them.

In this first version the cell is the only surface that shows the plugin image and title: dock keys and the mobile remote run its action but do not paint it.