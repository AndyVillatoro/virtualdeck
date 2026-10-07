# Store and gallery

> [Versión en español](Tienda)

VirtualDeck can fetch decks, pages and profiles made by others from a static
catalog on GitHub.

## Open the store

Settings (gear) → **GALLERY** → **OPEN STORE**. It opens in its own window (`#tienda`) with
search by name/author/text, filters by type (profile/page), target app and
tags, and cards with the author's notes.

## Before installing: the risk notice

A profile is not data: it is code that will run when you press a button.
Before installing you see, uncut: how many buttons it brings, every program
it launches, every script it runs (full text), the global hotkeys it will
register and what runs on its own (timers, sensors). Install with judgment:
it is like downloading a program.

## Installing

- In the store, pick the profile or page and press install. Global hotkeys
  that clash with yours are dropped and you're told how many. An installed
  page can inherit its target app's auto-profile.
- Outside the store, under **GALLERY** you paste a `manifest.json` URL and the
  same happens: list, risk card and import.
- Everything imported lands **as a profile or loose page**, never as
  configuration: your current deck is untouched, and to try it you load it
  by hand. The previous state is covered by the backup system.

## Badges

Each entry carries a version and origin (`origen`). The store shows
**INSTALLED** and **UPDATE → vX** when the published one is newer than yours.

## Public repo

The project catalog (`virtualdeck-gallery`) has 4 profiles in v1 format
(essential, streaming, work, rgb). To publish your own, follow
[`docs/galeria.md`](https://github.com/AndyVillatoro/virtualdeck/blob/main/docs/galeria.md).
