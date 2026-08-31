# Sensors (LibreHardwareMonitor)

VirtualDeck integrates **LibreHardwareMonitor (LHM)** to show your hardware's
temperatures, loads and speeds (CPU, GPU, motherboard, RAM, storage) in the
sidebar and in the left panel of fullscreen mode.

**LHM is not bundled**: you install it separately, like OpenRGB. It was removed
from the package because it writes its configuration next to its own executable,
which prevents packaging the app for the Microsoft Store, where the install
directory is read-only.

After installing it there is **one step you cannot skip**: LHM ships with its web
server switched off. Open it and enable **Options → Remote Web Server → Run**, on
port 8085. Without that, VirtualDeck receives no data.

---

## Settings

Open the title bar → **SENSORS (LIBRE HARDWARE MONITOR)** section:

| Option | What it does |
|---|---|
| **ENABLED** | Turns sensor reading on, polling every 5 s. |
| **SHOW SENSOR WIDGET** | Shows or hides the sensor cards in the sidebar and in fullscreen. On by default. |
| **START LHM WITH VIRTUALDECK** | Starts LHM when VirtualDeck launches, using the path below. |
| **START LHM AS ADMINISTRATOR (UAC)** | Launches LHM elevated. **Required** if the web server on port 8085 does not answer without admin rights. |
| **LHM PATH** | Path to `LibreHardwareMonitor.exe`. Auto-detected if installed in a common folder. |
| **HOST / PORT** | LHM's web server endpoint (default `127.0.0.1:8085`). |
| **VISIBLE CATEGORIES** | Filters which kinds of hardware are shown. |

---

## Why it sometimes needs administrator rights

LHM exposes its sensor tree at `http://127.0.0.1:8085/data.json` using .NET's
**`HttpListener`**. On Windows that API needs either **administrator
privileges** or a **URL ACL reservation** registered with the system. Without
one of the two, the web server starts but cannot bind the port, and VirtualDeck
never receives any data.

Three ways around it:

1. **Turn on "START LHM AS ADMINISTRATOR"** — simplest, but a UAC prompt on
   every launch.
2. **Register the URL ACL reservation once** — no further UAC prompts after
   that. The **REGISTER URL ACL** button in the title bar → SENSORS asks for one
   UAC confirmation and leaves the reservation permanently. You can then turn
   "START LHM AS ADMINISTRATOR" back off.

   The manual equivalent, in an elevated PowerShell:
   ```powershell
   netsh http add urlacl url=http://+:8085/ user=Everyone
   ```
3. **Run VirtualDeck as administrator** — LHM inherits the privileges.

---

## Diagnostics

- The title bar → SENSORS section shows the state:
  - `● LHM` green = connected and reading.
  - `○ OFFLINE` amber = enabled, but the web server is not answering.
  - `○ DISABLED` grey = the integration is turned off.
- **TEST** checks the endpoint without starting anything.
- **START LHM** starts it and retries the check for up to 12 s, because LHM's
  first launch is slow.

If there is still no answer after 12 s, the message suggests running as
administrator.

---

## Hiding the widget

If you would rather not see the sensor cards in the interface but still need
the readings available for [sensor actions](Actions-Reference), turn
**SHOW SENSOR WIDGET** off. The cards disappear from the sidebar and from the
fullscreen left panel, but the readings stay available to any button that uses
them.

---

## RGB (OpenRGB)

RGB settings live on their own screen — the **RGB** button in the top bar — not
here. VirtualDeck connects to the **OpenRGB** SDK to apply colours, modes and
profiles to compatible devices. OpenRGB must be running with its SDK server
enabled.

VirtualDeck can start it for you: set the path to `OpenRGB.exe` in the settings
panel (⚙ → RGB section) and it will be launched in `--server` mode, without a
window.

### Presets

18 built-in presets. There is no animation engine behind them: each preset
carries a colour and a list of modes to try, from the most specific to the most
generic, until it finds one the device actually supports. That is why the same
preset can look slightly different on two devices.

### Profiles

The RGB manager can save the current state of every device as a **profile**,
and a button can apply it with the `rgb-profile` action. One profile can also be
marked to apply automatically when VirtualDeck starts — useful because a Direct
mode's colour is not stored anywhere and is lost when the machine powers down.
