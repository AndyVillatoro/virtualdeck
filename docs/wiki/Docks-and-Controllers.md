# Docks and physical controllers

> [Versión en español](Docks-y-Controladores)

VirtualDeck talks to Stream Deck-style physical controllers: the **Stream Dock
N3** from Mirabox/Ajazz is verified with real hardware, the model table lists
another 12 Mirabox/Ajazz units (marked *experimental*), and the Elgato family
is still pending.

## Detection and pages

- Every dock you plug in shows up on the **Devices** screen and is managed in
  its own section.
- A dock **is a deck page tagged with its serial**: the editor, undo and
  import/export work unchanged. Those pages don't show up on the main screen or
  in kiosk mode.
- One dock can hold **several pages**, each linked to an app. The active one is
  what the device shows: it switches by itself when its linked app comes to the
  foreground, or you pick it by hand. The manually chosen page is the base: an
  app with a linked page replaces it while it is in front and goes back to the
  base when it leaves.

## Controls

- **LCD keys**: show a label, glyph, image or **live widget** (clock, weather,
  now playing, sensor, variable), from the same data source as the main
  screen. A button with *hold* waits for release or 500 ms; the rest fire on
  press.
- **Blank buttons**: fire their action on press.
- **Knobs**: each has three slots (turn left, press, turn right). Presets fill
  all three in a single undo. **Multi-mode knob**: pressing switches modes and
  each mode has its own actions; switching pages resets to the first mode.
- **`page-nav` action**: next/previous/first page, `cycle` to wrap around;
  from a dock it navigates the dock's pages, from the deck, the deck's.
  Preset navigation buttons stay pinned on every page.

## Presets

In the **Devices** inspector there are ready-made presets per control
(multimedia, volume, zoom, tabs, virtual desktops…), each with a plain-words
explanation like "TURN LEFT · UNDO · CTRL + Z".

## Brightness

Key brightness changes live without saving; it lands in the device settings
when you release the slider.
