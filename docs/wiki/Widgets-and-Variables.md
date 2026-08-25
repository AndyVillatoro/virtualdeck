# Widgets and variables

Instead of its icon, a button can show **live data**. It is still a button: it
runs its action when pressed, like any other.

Pick it in the editor's **Style** step, under *WIDGET*.

---

## The six widgets

| Widget | What it shows | Configuration |
|---|---|---|
| **Clock** | Time and date, in the chosen language | None |
| **Weather** | Temperature and sky conditions | Location detected by IP |
| **Now playing** | Title and artist of whatever is playing | None |
| **Sensor** | A hardware reading | Sensor, suffix and warning thresholds |
| **Variable** | A variable's value | Name, prefix and suffix |
| **Currency** | A conversion between two currencies | Amount, source and target currency |

**Now playing** cannot be combined with the "switch audio device" action: the
widget would cover the device name, which is exactly what that button needs to
show. The editor prevents it.

**Sensor** needs LibreHardwareMonitor running — see
[Sensors & RGB](Sensors-and-RGB).

**Currency** uses a rate that refreshes once a day and is cached locally, so the
button keeps showing the last known rate even with no connection. 166
currencies.

---

## Variables

A variable is a named value that survives closing the app. Write it in any
action field between braces: `{name}`.

Two actions change them:

- **Set variable** — stores a value, either a literal or another variable.
- **Add to variable** — adds to or subtracts from a numeric variable.

A third one fills them by itself: the **Script** action, with the *store the
output in a variable* checkbox.

Interpolation happens at run time, in **every** text field of an action: a URL,
a program's arguments, a webhook body, a notification's text or the text read
aloud.

### A counter

1. A button with **Add to variable**, variable `pomodoros`, value `1`.
2. On the same button, under Style, the **Variable** widget pointing at
   `pomodoros`, with the suffix ` today`.

Every press bumps the count and the button itself shows it.

### Chaining

A button can carry several actions in order. Combined with variables:

```
Add to variable   pomodoros +1
Notification      "That's {pomodoros} pomodoros today"
```

### Deciding on a value

The **If / Else** action compares a variable against a value and runs one
branch or the other. Useful for a button that cycles through three states
rather than two.

---

## Toggles

A button marked as a **toggle** alternates between on and off, and can carry a
different action for each side. The state is stored, so it survives restarting,
and **it is the same across all three screens**: main, fullscreen and the
floating bar.

Give it a **group** and only one button of that group can be on at a time:
turning one on turns the others off. That is how you represent "active mode"
with several buttons.
