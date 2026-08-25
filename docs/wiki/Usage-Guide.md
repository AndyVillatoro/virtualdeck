# VirtualDeck — Usage guide

A software Stream Deck for Windows. Configurable buttons that launch apps,
shortcuts, scripts, audio changes and more, all rendered in a retro dot-matrix
look.

---

## Core concepts

- **Pages**: up to 8, each with its own grid — 3 to 6 columns and up to 8 rows
  (right-click the tab).
- **Buttons**: every cell runs an *action*, or a chain of them.
- **Profiles**: full snapshots of the deck (pages, buttons, accent colour and
  wallpaper) that you can save and restore.
- **Variables**: persistent global state, written as `{name}` in any action
  field.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` | Global button search |
| `Ctrl+Z` | Undo the last change |
| `1` … `8` | Jump to page N (as many as exist) |
| `Esc` | Close whatever is open: search, editor, fullscreen |
| ⤢ button | Fullscreen mode |

## Editing a button

1. Click an empty cell to set it up, or ✎ on a configured one to edit it.
2. **Step 1 · Action**: pick the type — app, website, shortcut, script,
   hotkey, webhook, text-to-speech and so on.
3. **Step 2 · Configure**: fill in the fields for that type.
4. **Step 3 · Style**: label, sublabel, icon (emoji, brand icon or your own
   5×7 glyph), background and text colour.

**Tip — paste an image**: with the editor open, `Ctrl+V` applies an image from
the clipboard directly as the button background.

## Drag and drop

- **Reorder within a page**: drag one button onto another to swap them.
- **Move to another page**: drag a button onto the target tab. Hold `Shift`
  while dropping to *copy* instead of move.
- **Reorder tabs**: drag the page tab.
- **With a touchscreen**: press and hold a button to start dragging it.

## Multiple selection

`Ctrl+click` selects several buttons. A toolbar appears over the grid to clear
them or move them to another page in one step — a single undo brings them all
back.

## External triggers

In the *EXTERNAL TRIGGERS* section of the Configure step:

- **Global OS hotkey**: e.g. `Ctrl+Alt+1`. Works whether VirtualDeck is visible
  or tucked away in the tray.
- **Show in tray menu**: the button shows up in the tray icon's context menu.
- **Fire at a given time**, or **when a sensor crosses a threshold**.

A button fired any of these ways does exactly what a mouse click does.

## Kiosk mode

In fullscreen, the "🔒 KIOSK" button hides all non-essential UI. `Esc` then
asks for a 4-digit PIN to leave. The PIN is set the first time and remembered.

## Floating bar

A slim column of tiles that floats above everything else, for the buttons you
use most. Its tiles behave exactly like deck buttons — including toggle state,
which is shared between the two.

## Backups

Every save keeps the last **5 backups** in `%APPDATA%\virtualdeck\backups\`,
with a 5-minute cooldown between consecutive ones. Useful if you import
something wrong or delete a profile by accident.

## Press sound

Four selectable timbres: **mechanical click**, **tick**, **thud** and
**silent**. Toggle it under ⚙. The timbre is previewed as you pick it.

## Wallpaper

The `WALLPAPER` button in the top bar. Included variants: solid, gradient,
dot-grid, scanlines, **CRT** (with flicker), **technical mesh**, neon and blue
grid.
