# Changelog

## 0.9.0

- **`S.closeNav()`** dismisses the collapsed navigation — the full page on a phone, the dropdown on a wider shell — for custom nav rows that act without navigating. A navigation now dismisses it (and any open menu) by itself, links in your own rows included.
- **A navigation made before the last one lands is no longer dropped.** Closing travels through browser history, so it takes a moment; a request arriving meanwhile used to aim at the stack still on screen, which is why two quick Escapes peeled one panel. They queue now, each aimed at the stack the one before it was heading for. A `requestClose` that says no clears what was queued behind it.
- **`ancestors`** says what to open beneath a path that arrives cold, for URLs that don't say where they belong (`/thread/[id]`, opened from a notification). It's keyed by path template like `routes`, so each entry's params are matched and typed from its own key.
- **`S.panels.open(path, beneath?)`** opens a whole arrangement of columns from code, the way a nav item does.

## 0.8.1

- **A closed panel is torn down at once.** Its `A.clean()` hooks used to wait out the exit animation, running some 450 ms late; now only the element lingers to play it.
- **A panel has its width before its draw function runs**, so anything measuring its own box gets a real one from the first frame instead of a zero-width one.
- **`$page.layout` is live.** Change it whenever you like and the column reflows in place, without being redrawn.
- **A reactive `nav.items` no longer rebuilds the shell.** The list is read in the sidebar's own scope, so an item arriving leaves the open panels — and their state — alone.

## 0.8.0

- **Panel-stack navigation.** Give `S.main()` a `routes` table instead of a `content` slot and it takes over navigation, showing as many screens side by side as comfortably fit — one at a time on a phone. See the README.

## 0.7

**Breaking.** The surface model was reduced to two families: **neutral** (`.neutral`) and **accent** (`.primary`/`.danger`/`.success`/`.warning`/`.link`). Apps that only use the high-level `S.*` components need no changes. Code that uses surface classes or tokens directly must update:

- **Surface levels gone.** Replace `.base`/`.panel`/`.raised`/`.neutral`/`.nest` with the single `.neutral` class.
- **`.secondary` and `.gradient` gone.** Drop any `s-secondary` colour override; there's no `s-secondary` anymore. The default button is now `.primary`.
- **Tokens renamed.** `--s-fg`→`--s-text`, `--s-fg-muted`→`--s-muted`, `--s-border`→`--s-faint`. Removed: `--s-fg-faint`, `--s-border-strong`, `--s-ink`, `--s-on-accent`, `--s-page`/`--s-panel`/`--s-raised`, `--s-neutral`, `--s-tint`, `--s-glow`, `--s-shadow`, `--s-gradient-surface`. A custom surface now sets `--s-bg`/`--s-text` (was the `--s-a`/`--s-b` anchors).
- **Borders and shadows moved onto surfaces.** Components no longer draw their own. If you relied on `S.box`/`S.dialog`/etc. elevation, it now comes from the surface; pass `.no-shadow` to drop it, or `.shadow`/`.extra-shadow` to add it on any surface.

## 0.6

Nothing breaking.

## 0.5

**Breaking.**

- Surfaces (`.s-s`) now apply `border-radius` and — for `.tonal` and `.outlined` — `border` automatically. Custom surfaces or components that set these manually may see doubled or conflicting styles; remove the manual declarations.
- `border:0` is now applied to `.s-btn` by default (overriding the browser's 2px button border). Custom button-like components that relied on the browser default should add an explicit border.

## 0.4

**Breaking.**

- There is no default export anymore: replace `import S from "staffa"` with `import * as S from "staffa"`.
- `S.button` no longer has a `text` option: use `content` instead (it accepts a string or a draw function).
- The `Content` type is gone: use `Slot` instead. The `Styling` type alias is now exported as `Attributes`.
- `S.buttonChooser` uses `undefined` instead of `null` for "nothing selected" (in `bind` and with `allowDeselect`).
