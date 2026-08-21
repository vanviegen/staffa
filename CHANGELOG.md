# Changelog

## 0.13.0

- **Breadcrumbs no longer truncate at a fixed width.** A crumb now shows its full title whenever the bar has room, and is only ellipsised under real pressure — the *longest* crumbs give way first, equalising, while short ones keep every character. Once every long crumb is down to a small floor the strip scrolls sideways, as before.
- The top bar's trailing slot (the app `menu`, or a panel's promoted `actions` on a narrow shell) now holds its natural width while the breadcrumbs shrink, instead of being squeezed along with them. A genuinely wide slot (a search box) still shrinks once the titles hit their floor.
- The top bar and footer no longer stretch along when the columns grow past the standard 1280px page (a `maxWidth: "screen"` panel, or extra columns fitting a wide window): the chrome now holds the standard width while only the columns grow.

## 0.12.0

- **`match` on menu and nav items** claims pages beyond the item's own `href` — a path prefix, or a `(path) => boolean`. While a claimed page is open, the item is highlighted and its branches stay unfolded, cold deep links included.
- **`columns` and `linkNavigation` are live**: change them on a proxied options object (or via a getter) and the shell adapts in place, panels keeping their state.
- Fixed: menu fold state is now kept across remounts, so the phone nav no longer opens with every branch collapsed after visiting a page the menu doesn't hold.
- Fixed: a screen inside a submenu now yields the top bar's second line to the `subtitle`, like top-level nav screens do.
- Fixed: dismissed menus and the phone nav turn `visibility: hidden` once their exit animation ends, so assistive technology no longer sees them while they linger. (Aberdeen ≥ 1.22.0 also removes them from the DOM at that moment.)

## 0.11.0

- **Breaking:** `S.main`'s `stacking` option is renamed **`columns`**: pass `columns: "single"` where you had `stacking: false`, and nothing where you had `stacking: true` (the default, `"auto"`, shows as many columns as fit). Same behaviour, clearer name — it only ever controlled how many columns you *see*.
- **`linkNavigation`** on `S.main` sets what a link without a `data-panel` attribute does: `"push"` (the default), `"replace"`, or `"open"`. Set `"open"` for a conventional app where every click replaces the content rather than stacking on it.
- **`home: null`** leaves the app's name and logo unlinked, for a `title` or `logo` slot holding interactive content of its own.
- Fixed: a link among a panel's `actions` behaved differently by shell width — on a narrow shell (actions promoted into the top bar) it replaced the whole stack instead of opening on top of its panel. It now builds on the panel that declared it at every width.
- Fixed: a wide top-bar `menu` (a search box, say) could squeeze the title and breadcrumbs down to nothing, letting the crumb strip's scroll buttons escape over the ☰. The titles now keep a minimum width, and the menu shrinks past that point instead.
- Fixed: navigating to a page a nav/menu tree doesn't contain folded all of its branches up. The fold state is now left as it was.

## 0.10.1

Fixed: menu links (in `S.menu()`, `S.menuButton()` dropdowns, context menus and the `S.main()` nav sidebar) now open their target as its own panel stack, the way a nav item does, instead of pushing it on top of the panel the menu happens to sit in. Floating menus and the sidebar already behaved this way; an inline `S.menu()` drawn inside a panel didn't. Add `attrs: "data-panel=push"` to an item that should stack instead.

## 0.10.0

**Breaking.** The routed half of `S.main()` — panels, their navigation, the top bar — was reworked from the ground up: breadcrumbs instead of back buttons, panels declaring `title`/`actions` chrome the shell places, pinnable panels, and `$panel.unsaved` (replacing `requestClose`) parking unsaved panels instead of vetoing navigation. Any app built on `routes` needs reworking to match; the README describes the new model.

Also breaking, outside that rework:

- **`S.main`**: the `icon` option is renamed `logo`, and `navPosition: "button"` is gone — the nav collapses by shell width alone. `nav.button` now customizes an icon button, so only `icon`, `ariaLabel` and `attrs` apply.
- **`S.box`**: `close` only takes a function now; `close: true` (close the containing panel) is gone — pass `() => $panel.close()` yourself.
- **`S.panels` and the `Page` type are gone**: routed `S.main()` returns the `PanelStack`, and each route handler gets its own `$panel` (a `Panel`).

New:

- **Submenus**: a nav or menu item with `items` of its own becomes a collapsible tree branch; only the branch holding the current page stays unfolded. **`S.menu()`** draws such a menu in place, outside a dropdown or the shell's sidebar.
- **`S.iconButton()`**: a bare glyph in a square hit area.
- **`S.scrollStrip()`** — the horizontally scrolling row powering the tabs and breadcrumbs — and **`S.revealInStrip()`**.
- **`data-panel`** on a link picks its navigation: `push` (the default), `replace`, or `open`.
- **The nav sidebar follows its highlight**, scrolling the current item back into view.

Fixed: a disabled link-form `S.button`/`S.iconButton` was still keyboard-activatable; unsaved-work tab-close guarding no longer keeps the app out of the browser's back/forward cache.

## 0.9.0

- **`S.closeNav()`** dismisses the collapsed navigation, for custom nav rows that act without navigating. A navigation now dismisses it — and any open menu — by itself.
- **A navigation made before the last one lands is no longer dropped.** Requests queue, each aimed at the stack the one before it was heading for, so two quick Escapes peel two panels.
- **`ancestors`** says what to open beneath a path that arrives cold, for URLs that don't say where they belong. It's keyed by path template like `routes`, so each entry's params are matched and typed from its own key.
- **`S.panels.open(path, beneath?)`** opens a whole arrangement of columns from code, the way a nav item does.

## 0.8.1

- **A closed panel is torn down at once.** Its `A.clean()` hooks used to wait out the exit animation; now only the element lingers to play it.
- **A panel has its width before its draw function runs**, so anything measuring its own box gets a real one from the first frame.
- **`$page.layout` is live.** Change it whenever you like and the column reflows in place, without being redrawn.
- **A reactive `nav.items` no longer rebuilds the shell**, so an item arriving leaves the open panels — and their state — alone.

## 0.8.0

- **Panel-stack navigation.** Give `S.main()` a `routes` table instead of a `content` slot and it takes over navigation, showing as many screens side by side as comfortably fit — one at a time on a phone. See the README.

## 0.7

**Breaking.** The surface model was reduced to two families: **neutral** (`.neutral`) and **accent** (`.primary`/`.danger`/`.success`/`.warning`/`.link`). Apps that only use the high-level `S.*` components need no changes; code that touches surface classes or tokens directly must update.

- **Surface levels gone.** Replace `.base`/`.panel`/`.raised`/`.neutral`/`.nest` with the single `.neutral` class.
- **`.secondary` and `.gradient` gone.** Drop any `s-secondary` colour override. The default button is now `.primary`.
- **Tokens renamed.** `--s-fg` → `--s-text`, `--s-fg-muted` → `--s-muted`, `--s-border` → `--s-faint`. A custom surface now sets `--s-bg`/`--s-text`, where it used to set the `--s-a`/`--s-b` anchors.
- **Tokens removed:** `--s-fg-faint`, `--s-border-strong`, `--s-ink`, `--s-on-accent`, `--s-page`/`--s-panel`/`--s-raised`, `--s-neutral`, `--s-tint`, `--s-glow`, `--s-shadow`, `--s-gradient-surface`.
- **Borders and shadows moved onto surfaces.** Components no longer draw their own; elevation comes from the surface. Pass `.no-shadow` to drop it, or `.shadow`/`.extra-shadow` to add it on any surface.

## 0.6

Nothing breaking.

## 0.5

**Breaking.**

- **Surfaces (`.s-s`) apply their own `border-radius`** — and, for `.tonal` and `.outlined`, their own `border`. Remove any manual declarations, which would otherwise double up.
- **`.s-btn` gets `border:0` by default**, overriding the browser's 2px button border. Custom button-like components that relied on that default should set an explicit border.

## 0.4

**Breaking.**

- **No default export.** Replace `import S from "staffa"` with `import * as S from "staffa"`.
- **`S.button` has no `text` option.** Use `content`, which takes a string or a draw function.
- **The `Content` type is gone.** Use `Slot` instead. The `Styling` type alias is now exported as `Attributes`.
- **`S.buttonChooser` uses `undefined`** instead of `null` for "nothing selected", in `bind` and with `allowDeselect`.
