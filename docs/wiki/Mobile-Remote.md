# Mobile remote

> [Versión en español](Mando-Movil)

VirtualDeck ships a local web server to use the deck from your phone. It is
**off by default**: enable it under Settings (gear) → **MOBILE REMOTE & WEB SERVER**.

## Pairing

1. Your phone and this PC must be on the same Wi-Fi network.
2. Open the address shown in the settings in the phone's browser (network
   name / mDNS works too).
3. Press **GET PAIRING CODE** and type the 6 digits on the phone screen
   (they expire in 5 minutes).

Open the port in Windows Firewall from the same setting when the rule is
missing. With the LAN toggle off, it only answers this computer.

## What you see on the phone

- The deck's buttons, with the **user's theme and accent**, and their **live
  widgets** (clock, weather, now playing, sensor, variable) — the same data
  source as the main screen. Dock pages are excluded.
- **Hold**: 500 ms runs the button's hold action (tap and hold are unified).
  By direct address: `virtualdeck://press/<id>?largo=1` (`?largo=1` runs the
  long-press action).

## API and security

The token goes in the `X-VD-Token` header, not in the address. Routes:
`/api/ping`, `/api/buttons`, `/api/press/<id>`, `/api/press?label=<label>`,
`/api/page/<n>`.

**The connection is not encrypted** (plain HTTP): anyone on the same network
with the token can press buttons, including ones that run scripts. Use a
trusted network and turn the server off when you don't need it.
