# Shortcuts and macros

Two ways for a button to type: send **one combination**, or replay **a recorded
sequence**.

---

## Keyboard shortcuts inside VirtualDeck

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Find any button |
| `Ctrl+Z` | Undo the last change |
| `1` … `8` | Go to page N |
| `Esc` | Close whatever is open: search, editor, fullscreen |
| `Ctrl+click` | Select several buttons |
| `Ctrl+V` | With the editor open: paste an image from the clipboard as the background |

---

## Sending a combination

The **Hotkey** action sends a combination to whatever window is in the
foreground. Write it as you read it: `Ctrl+C`, `Alt+Tab`, `Ctrl+Shift+Esc`,
`Win+D`.

VirtualDeck drops focus from its own window first, so the keystroke reaches the
app you were working in rather than itself.

---

## Global OS hotkey

In any button's **Configure** step, the *EXTERNAL TRIGGERS* section lets you
assign a system-wide combination such as `Ctrl+Alt+1`. It works whether
VirtualDeck is on screen or hidden in the tray.

In that same section, **show in tray menu** adds the button to the tray icon's
menu as a quick action.

A button fired either way does **exactly** what a mouse click does: it respects
the toggle, the radio group, the action chain and the variables.

---

## `virtualdeck://` links

Anything that can open a URL can press a deck button: a desktop shortcut, a
Windows scheduled task, a `.bat` file, or another application.

| Link | What it does |
|---|---|
| `virtualdeck://press/<id>` | Presses the button with that id |
| `virtualdeck://press?label=Spotify` | Presses the first button with that label |
| `virtualdeck://page/2` | Switches to page 2 (the first one is 1) |
| `virtualdeck://show` | Brings the window to the front |

Label lookup **ignores case and accents**: `musica` finds a button named
"Música".

From a console or a `.bat`:

```bat
start "" "virtualdeck://press?label=Streaming Mode"
```

If VirtualDeck was not running, the link starts it and then runs the command.
If it was, the second copy closes itself and hands the command to the one
already running: **there is never more than one VirtualDeck at a time**.

A button triggered by a link does exactly the same as one pressed with the
mouse.

---

## Local server (HTTP)

For anything that already speaks HTTP — Home Assistant, a script on another
machine, another panel — there is a built-in server. **It ships disabled**:
turn it on in ⚙ → *LOCAL SERVER (HTTP)*, which also generates the token.

| Route | What it does |
|---|---|
| `GET /api/ping` | Checks it is alive. No token needed |
| `GET /api/buttons` | Lists buttons that have an action: id, label, page |
| `GET /api/press/<id>` | Presses that button |
| `GET /api/press?label=<label>` | Presses the first one with that label |
| `GET /api/page/<n>` | Switches page |

**The token goes in the `X-VD-Token` header, never in the address.** Any web
page you visit can cause a request to `127.0.0.1` just by embedding an image,
and if the token travelled in the URL, guessing it once would be enough. A
custom header forces the browser to ask permission first, and VirtualDeck does
not grant it.

```bash
curl -H "X-VD-Token: YOUR_TOKEN" http://127.0.0.1:8787/api/press/0-3
```

### The phone remote

The server also serves a page meant for a phone. With *ALLOW LOCAL NETWORK*
turned on:

1. In VirtualDeck, ⚙ → *LOCAL SERVER* → **PAIR PHONE**. A six-digit code and
   the address to type appear.
2. On the phone, open that address (`http://<ip>:8787`) and type the code.
3. The button grid shows up. Tapping one lights its border if the deck ran it,
   or turns it red if something failed.

Pairing **never puts the token in a link**: the phone types a short address and
the code crosses once. A link carrying the token would have stayed in the
browser history and in any screenshot. The code lasts five minutes, allows five
attempts, and is spent once it works.

To unpair a phone: **NEW TOKEN** in settings. Any paired phone will ask for a
code again next time.

### Opening it to the local network

With *ALLOW LOCAL NETWORK* off, the server only answers this computer. On, it
answers anyone on your network holding the token.

Be clear about what that means: **the connection is not encrypted** and a
button can run scripts. Fine for a home network; not for a shared or public
one.

---

## Macros

A macro is a list of steps: keys, clicks, mouse movements, wheel and pauses.

### Recording one

The editor's **RECORD** button captures the whole system's keyboard and mouse
until you press **STOP**.

- Modifiers are recorded with the key: pressing `Ctrl+C` leaves a single step,
  `Ctrl+C`, not two.
- **Clicks on the VirtualDeck window are not recorded.** Those belong to the
  recorder, not to the macro. So if you only click in here, the recording comes
  out empty — and it says so.
- Pauses between keystrokes are kept as you made them.

### Writing or editing one by hand

Every step can be edited, reordered and deleted. The types are:

| Step | What it does |
|---|---|
| **Key** | A single key: `a`, `5`, `{ENTER}`, `{F5}` |
| **Combination** | With modifiers: `Ctrl+C`, `Alt+Tab` |
| **Text** | Types a whole string |
| **Mouse click** | At screen coordinates, left, right or middle button |
| **Move mouse** | Sends the cursor to coordinates |
| **Scroll** | Wheel up or down |
| **Pause** | Waits the given milliseconds |

Named keys go in braces: `{ENTER}`, `{TAB}`, `{ESC}`, `{BACKSPACE}`,
`{DELETE}`, `{UP}`, `{DOWN}`, `{LEFT}`, `{RIGHT}`, `{HOME}`, `{END}`, `{PGUP}`,
`{PGDN}` and `{F1}` through `{F24}`.

### Repeating

The **repeat** field runs the whole macro N times in a row.

---

## Which one to use

- A combination that already exists in another program → **Hotkey**.
- A multi-step sequence, with waits or with the mouse → **Macro**.
- Launching something that is not keyboard input (a program, a website, a
  script) → the matching action; see [Actions](Actions-Reference).
