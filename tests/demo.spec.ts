import { test, expect, type Page } from "shotest";

// Click-through of every page of the Staffa demo. ShoTest screenshots each
// wrapped action, so these double as a visual baseline for the whole library.

test("form: fill out, submit, switch layout", async ({ page }) => {
	await page.goto("./");

	// Not exact: the required marker makes the label text "Name*".
	await page.getByLabel("Name").fill("Ada Lovelace");
	await page.getByLabel("Email").fill("ada@example.com");
	await page.getByLabel("Country").selectOption("Netherlands");

	// Autocomplete: type-ahead, pick from the dropdown.
	await page.getByLabel("Language").fill("Type");
	await page.getByRole("option", { name: "TypeScript" }).click();

	// Multi-autocomplete: add a known tag from the dropdown.
	await page.getByLabel("Tags").fill("css");
	await page.getByRole("option", { name: "css", exact: true }).click();

	await page.getByLabel("Bio").fill("Wrote the first program.");
	await page.getByLabel("Subscribe to the newsletter").check();

	await page.getByRole("button", { name: "Save" }).click();
	await page.getByText("Submitted data").waitFor();
	await expect(page.locator("pre")).toContainText("ada@example.com");
	await page.getByRole("button", { name: "Close" }).click();

	// Switch the form to the stacked layout.
	await page.getByLabel("Form layout").selectOption("stacked");
});

test("buttons: variants, sizes and groups", async ({ page }) => {
	await page.goto("./");
	await page.getByRole("link", { name: "Buttons" }).click();
	await page.getByText("Variants & sizes").waitFor();

	// Hover the signature primary button so the lift/glow is captured.
	await page.getByRole("button", { name: "primary" }).first().hover();
	await page.getByRole("button", { name: "Month" }).click();
});

test("tabs: URL-linked and scrollable strip", async ({ page }) => {
	await page.goto("./tabs");
	await page.getByText("URL-linked tabs").waitFor();

	await page.getByRole("tab", { name: "Details" }).click();
	await expect(page).toHaveURL(/tab=details/);
	await page.getByRole("tab", { name: "History" }).click();
	await expect(page.getByText("The History tab.")).toBeVisible();
	await expect(page.getByRole("tab", { name: "Disabled" })).toBeDisabled();

	// The second strip has more tabs than fit, so it scrolls. Narrow the window
	// until it does even at demo width, and step through it with the ✕/› buttons
	// the strip grows for exactly this — the affordance a bare scroll area lacks.
	await page.setViewportSize({ width: 640, height: 900 });
	const strip = page.locator(".s-tabbar").last();
	// Only the "scroll right" button is up at rest: there's nothing to the left yet.
	await expect(strip).toHaveClass(/s-can-right/);
	await expect(strip).not.toHaveClass(/s-can-left/);

	await strip.locator(".s-tabscroll-right").click({ force: true });
	await expect(strip).toHaveClass(/s-can-left/);

	// A tab that was off the end is now in reach; selecting it keeps it in view.
	await page.getByRole("tab", { name: "Tab 9", exact: true }).click();
	await expect(page.getByText("Content for tab 9.")).toBeVisible();
});

test("overlays: toasts, tooltips, menus and dialogs", async ({ page }) => {
	await page.goto("./overlays");
	await page.getByText("Toast notifications").waitFor();

	// Toasts: fire two; they stack at the bottom.
	await page.getByRole("button", { name: "Success" }).click();
	await page.getByText("Your changes have been saved.").waitFor();
	await page.getByRole("button", { name: "Danger" }).click();
	await page.getByText("Something went wrong.").waitFor();

	// Tooltip on hover.
	await page.getByRole("button", { name: "Rich tip" }).hover();
	await page.getByText("in tips").waitFor();
	// Move off and let the tooltip fully disappear before moving on: its hide is a
	// 100 ms wall-clock timer, so otherwise it can still be lingering in the menu
	// screenshots below (notably under load).
	await page.mouse.move(0, 0);
	await page.waitForSelector(".s-tt-tip", { state: "detached" });

	// Action menu: open, pick an item, see the confirming toast.
	await page.getByRole("button", { name: "Actions" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByText("Edit clicked").waitFor();

	// Context menu: right-click the panel, pick an item.
	await page.getByText("Right-click (or long-press)").click({ button: "right" });
	await page.getByRole("button", { name: "Copy", exact: true }).click();
	await page.getByText("Copied!").waitFor();

	// The toasts fired above auto-dismiss on a wall clock (6 s), so by the time the
	// dialog steps below run they're mid-expiry — present in some screenshots and
	// gone in others depending on machine speed. Reload to a clean slate so the
	// dialog screenshots are deterministic (no stray toasts straddling them).
	await page.reload();
	await page.getByText("Toast notifications").waitFor();

	// alert() / confirm() / prompt()
	await page.getByRole("button", { name: "alert()" }).click();
	await page.getByText("File saved successfully.").waitFor();
	await page.getByRole("button", { name: "OK" }).click();
	// Wait out the dialog's fade-out: its OK button lingers in the DOM during
	// the destroy transition and would make the next "OK" locator ambiguous.
	// (waitForSelector, as ShoTest's waitFor wrapper can't handle "detached".)
	await page.waitForSelector('text="File saved successfully."', { state: "detached" });

	await page.getByRole("button", { name: "confirm()" }).click();
	await page.getByText("Delete this item?").waitFor();
	await page.getByRole("button", { name: "OK" }).click();
	await expect(page.getByText("confirm → true")).toBeVisible();
	await page.waitForSelector('text="Delete this item?"', { state: "detached" });

	await page.getByRole("button", { name: "prompt()" }).click();
	await page.getByRole("textbox").last().fill("Grace");
	await page.getByRole("button", { name: "OK" }).click();
	await expect(page.getByText('prompt → "Grace"')).toBeVisible();

	// Nested dialogs stack correctly.
	await page.getByRole("button", { name: "dialog in dialog" }).click();
	await page.getByRole("button", { name: "Open secondary" }).click();
	await page.getByText("Smaller than primary.").waitFor();
	const secondary = page.locator(".s-dialog", { hasText: "Secondary dialog" });
	await secondary.getByRole("button", { name: "Close" }).click();
	await page.waitForSelector('text="Smaller than primary."', { state: "detached" });
	const primary = page.locator(".s-dialog", { hasText: "Primary dialog" });
	await primary.getByRole("button", { name: "Close" }).click();
});

test("dialogs: Escape closes only the top-most dialog", async ({ page }) => {
	await page.goto("./overlays");
	await page.getByRole("button", { name: "dialog in dialog" }).click();
	await page.getByRole("button", { name: "Open secondary" }).click();
	await page.getByText("Smaller than primary.").waitFor();

	// Escape dismisses the secondary dialog; the primary one stays up.
	await page.keyboard.press("Escape");
	await page.waitForSelector('text="Smaller than primary."', { state: "detached" });
	await expect(page.locator(".s-dialog", { hasText: "Primary dialog" })).toBeVisible();

	// A second Escape dismisses the primary dialog too.
	await page.keyboard.press("Escape");
	await page.waitForSelector('text="Primary dialog"', { state: "detached" });
});

test("surfaces: levels, roles, variants and nesting", async ({ page }) => {
	await page.goto("./surfaces");
	await page.getByText("Accent surfaces & variants").waitFor();
	// Scroll the custom-surface demo into view for its own screenshot.
	await page.getByText("Custom accent surface").scrollIntoViewIfNeeded();
});

test("content: prose rhythm and heading scale", async ({ page }) => {
	await page.goto("./content");
	await page.getByText("Prose & flow content").waitFor();
	await page.getByText("Heading scale").scrollIntoViewIfNeeded();
});

test("icons: gallery, sizing and search", async ({ page }) => {
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();
	await page.getByLabel(/Filter all/).fill("arrow");
	await page.getByText(/\d+ matches/).waitFor();
});

test("header: display settings live in a configure popover", async ({ page }) => {
	await page.goto("./");
	await page.getByText("Account").waitFor();

	// The nav/colour/theme controls are tucked behind the header's configure button.
	await page.getByRole("button", { name: "Display settings" }).click();
	await page.getByText("Navigation").waitFor();
	await page.getByText("Primary colour").waitFor();
	await page.getByText("Theme").waitFor();
	await settleMenu(page);

	// A pick inside the popover drives the live theme.
	await page.getByRole("button", { name: "dark" }).click();
});

test("menu: dropdown autofocuses its first focusable control", async ({ page }) => {
	await page.goto("./");
	await page.getByText("Account").waitFor();
	// The settings dropdown holds custom content (no menu items); opening it should
	// still move focus to the first focusable control inside it.
	await page.getByRole("button", { name: "Display settings" }).click();
	await page.getByText("Navigation").waitFor();
	await settleMenu(page);
	const focused = page.locator(".s-menu-list :focus");
	await expect(focused).toHaveCount(1);
});

test("dark mode: surfaces and buttons", async ({ page }) => {
	await page.goto("./surfaces");
	await page.getByText("Surfaces & Variants").waitFor();
	// The theme switch lives in the header's configure popover.
	await page.getByRole("button", { name: "Display settings" }).click();
	await settleMenu(page);
	await page.getByRole("button", { name: "dark" }).click();
	await page.getByRole("link", { name: "Buttons" }).click();
	await page.getByText("Variants & sizes").waitFor();
	await page.getByRole("link", { name: "Form" }).click();
	await page.getByText("Account").waitFor();
});

test("nav: Escape from the content moves focus to the current sidebar item", async ({ page }) => {
	await page.goto("./form");
	await page.getByText("Account").waitFor();
	// Escape on a fresh load (focus on <body>) should land on the sidebar's current
	// (active) item, shown with the primary-ring focus highlight.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();
});

test("nav: narrow screens get a full-page nav instead of a dropdown", async ({ page }) => {
	// Narrow the shell so the sidebar collapses to a hamburger.
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./form");
	await page.getByText("Account").waitFor();

	// The nav takes over the whole content area, and the hamburger becomes an ✕.
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(page.locator(".s-nav-page:not(.s-nav-page-off)")).toHaveCount(1);

	// Picking an item hands over to that screen.
	await page.getByRole("link", { name: "Overlays" }).click();
	await page.getByText("Toast notifications").waitFor();

	// Reopening and dismissing with the ✕ leaves the content as it was.
	await page.getByRole("button", { name: "Open navigation" }).click();
	await page.getByRole("button", { name: "Open navigation" }).click();
	await page.getByText("Toast notifications").waitFor();
});

test("nav: Escape opens the full-page nav and Enter on an item closes it", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./form");
	await page.getByText("Account").waitFor();

	// Escape opens the nav page with the current item ("Form") focused.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();

	// Activating a link with Enter navigates *and* closes the page, returning focus
	// to the trigger.
	await page.getByRole("link", { name: "Buttons" }).focus();
	await page.keyboard.press("Enter");
	await page.getByText("Variants & sizes").waitFor();
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
});

test("nav: the full-page nav reopens right after closing", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./form");
	await page.getByText("Account").waitFor();
	// Match only an *open* page — a just-closed one lingers in the DOM, parked off
	// to the left, while its slide-out plays.
	const openNav = page.locator(".s-nav-page:not(.s-nav-page-off)");

	await page.keyboard.press("Escape"); // open
	await expect(openNav).toHaveCount(1);
	await page.keyboard.press("Escape"); // close — focus returns to the trigger
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
	await page.keyboard.press("Escape"); // reopen, ignoring the sliding-out page
	await expect(openNav).toHaveCount(1);
});

test("autocomplete: Escape dismisses only the open list, not the panel beneath", async ({ page }) => {
	await page.goto("./form");
	await page.getByText("Account").waitFor();

	const input = page.getByLabel("Language");
	await input.fill("Type");
	await expect(page.getByRole("option", { name: "TypeScript" })).toBeVisible();

	// The first Escape is consumed by the open list — it closes, and focus stays
	// in the input instead of jumping to the nav. (waitForSelector: ShoTest's
	// wrapped expect can't assert on absent elements.)
	await page.keyboard.press("Escape");
	await page.waitForSelector("ul[role=listbox]", { state: "detached" });
	await expect(input).toBeFocused();

	// With no panel left to dismiss, a second Escape falls through to the nav jump.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();
});

// ─── Routed panel stack ──────────────────────────────────────────────────────

// A panel that's on its way out lingers in the DOM for the length of its exit
// animation, and one that's scrolled off-canvas to the left is marked `inert`.
const livePanels = ".s-panel:not(.s-panel-closing)";
const visiblePanels = ".s-panel:not(.s-panel-closing):not([inert])";

/** The deepest panel that isn't on its way out — where "the current screen" is. */
function topPanel(page: Page) {
	return page.locator(livePanels).last();
}

/**
 * The live panel whose content matches `text`. Used instead of a `getByText` on
 * a box header, because a header with `close: true` also holds its ✕ — and a
 * case-insensitive substring match on "Small A" would hit "Push small A" links.
 */
function panelWith(page: Page, text: RegExp) {
	return page.locator(livePanels, { hasText: text });
}

test("panels: a phone pushes and pops one screen at a time", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();

	// Tapping an icon pushes its detail; the gallery stays mounted, off-canvas.
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/heart$/);
	await page.getByText('import { heart }').waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(1);

	// The shell draws no back chrome at all: the detail's own ✕ (S.box's `close`
	// option) is the way back, on a phone exactly as on a wide screen.
	await topPanel(page).getByRole("button", { name: "Close" }).click();
	await expect(page).toHaveURL(/\/demo\/icons$/);
	await page.getByText("Gallery").waitFor();

	// The browser's back button does exactly the same thing.
	await page.getByRole("link", { name: "star", exact: true }).click();
	await page.getByText("import { star }").waitFor();
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/icons$/);
	await expect(page.locator(visiblePanels)).toHaveCount(1);
});

test("panels: Escape pops a panel, and only then opens the nav", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	// A deep link with no history beneath it: the stack is derived from the route
	// table, and closing falls back to replacing the entry.
	await page.goto("./icons/heart");
	await page.getByText("import { heart }").waitFor();

	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/icons$/);
	await page.getByText("Gallery").waitFor();

	// At the stack root there's nothing left to close, so Escape falls through to
	// the existing "jump to the nav" behaviour.
	await page.keyboard.press("Escape");
	await expect(page.locator(".s-nav-page:not(.s-nav-page-off)")).toHaveCount(1);
});

test("panels: a deep link derives its columns, and links replace the top one", async ({ page }) => {
	// The gallery and the detail are both "small", so they pair up as two columns
	// on any ordinary desktop width.
	// /demo/icons matches a route, so it becomes the panel beneath
	// /demo/icons/heart (while /demo, which has no route, is skipped).
	await page.goto("./icons/heart");
	await page.getByText("Gallery").waitFor();
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	// The top panel's `$page.title` prefixes the shell's own title.
	await expect(page).toHaveTitle("heart · Staffa");

	// A click inside the gallery panel truncates everything above *that* panel
	// before pushing, so the detail is replaced rather than stacked.
	await page.getByRole("link", { name: "star", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/star$/);
	await page.getByText("import { star }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// `data-panel=replace` paging swaps the detail in place — still no third column.
	// (Scoped to the top panel: the one being replaced lingers while it fades.)
	// The pagers are `S.button({ href })`s, so they're `<a role=button>`.
	await topPanel(page).getByRole("button", { name: "Next" }).click();
	await page.getByText("import { bookmark }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// The stack lives in the history entry, so a reload reproduces both columns.
	await page.reload();
	await page.getByText("Gallery").waitFor();
	await page.getByText("import { bookmark }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
});

test("panels: a link to an already-open panel returns to it", async ({ page }) => {
	await page.goto("./panels/medium");
	// Not the box header: the playground beneath holds a "Push a medium panel" link
	// that a substring match would also hit.
	await page.getByText("it fills the standard content area").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// /demo/panels is already the panel beneath, so this closes down to it instead
	// of opening a duplicate.
	await topPanel(page).getByRole("link", { name: "Back to the playground" }).click();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);
	// The playground is top-most again, so its title takes over.
	await expect(page).toHaveTitle("Panels · Staffa");
});

test("panels: a close guard vetoes the first attempt", async ({ page }) => {
	await page.goto("./form/guard");
	await page.getByText("The first close attempt").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// The guard refuses the first close...
	await page.keyboard.press("Escape");
	await expect(page.getByText("The guard has been used up")).toBeVisible();
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);

	// ...and lets the second one through.
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
});

test("panels: an [id=integer] route only matches spellings that round-trip", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Typed route params").waitFor();

	// The handler receives a real number, not a string that looks like one.
	await page.getByRole("link", { name: "Open item 42" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/item\/42$/);
	await page.getByText("params.id is number 42, so id + 1 is 43.").waitFor();

	// "007" would be a second URL for the same record, so it isn't a match at
	// all: no route claims it, and it lands in notFound.
	await page.goto("./panels/item/007");
	await page.getByText("There is no page at /demo/panels/item/007.").waitFor();
});

test("panels: a vetoed browser back travels forward again", async ({ page }) => {
	// Build real history: the guard panel is *pushed*, so there is an entry
	// beneath it for the browser's back button to head for.
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await page.getByRole("link", { name: "Push the close-guard panel" }).click();
	await page.getByText("The first close attempt").waitFor();

	// The guard refuses: the router travels the history right back, so the URL
	// and the panels end up exactly where they were.
	await page.goBack();
	await expect(page.getByText("The guard has been used up")).toBeVisible();
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);
	await expect(page.locator(livePanels)).toHaveCount(2);

	// Used up, the next back pops the guard panel like any other.
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
});

test("panels: an origin-less link asks every removed panel's guard", async ({ page }) => {
	await page.goto("./form/guard");
	await page.getByText("The first close attempt").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// A link outside any panel (a nav item, a link in a dialog) derives its
	// target's whole stack. Here the derived stack — /demo/panels, /demo/panels/a
	// and the unrouted path on top — shares nothing with the open one, so *both*
	// open panels are removed, and both must pass their close guards: the guarded
	// panel's depth doesn't line up with any depth of the new stack, which is
	// exactly the shape that used to slip past the guards.
	await page.evaluate(() => {
		const a = document.createElement("a");
		a.href = "/demo/panels/a/nowhere";
		a.textContent = "Somewhere else";
		a.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99";
		document.body.appendChild(a);
	});
	await page.getByRole("link", { name: "Somewhere else" }).click();

	// The guard vetoes: nothing navigated, nothing closed.
	await expect(page.getByText("The guard has been used up")).toBeVisible();
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);
	await expect(page.locator(livePanels)).toHaveCount(2);

	// Used up, the second attempt goes through to the derived stack.
	await page.getByRole("link", { name: "Somewhere else" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a\/nowhere$/);
	await page.getByText("There is no page at /demo/panels/a/nowhere.").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
});

test("panels: a small starts at half width, and the next lands in its open room", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	// A lone "small" is half the content area, left-aligned, its other half open.
	const playground = page.locator(livePanels).first();
	const before = (await playground.boundingBox())!;
	const region = (await page.locator(".s-panels").boundingBox())!;
	expect(before.width).toBeLessThan(region.width * 0.6);
	expect(before.x).toBeCloseTo(region.x, 1);

	// The next small lands in exactly that open room: nothing on screen moves or
	// resizes — widths depend only on the window, never on what else is open.
	await page.getByRole("link", { name: "Push small A" }).click();
	await panelWith(page, /Small A/).waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	expect(await playground.boundingBox()).toEqual(before);
});

test("panels: the page stretches past 1280 when a third column fits", async ({ page }) => {
	// Wide enough for three small columns (~3×540 plus the sidebar).
	await page.setViewportSize({ width: 1920, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	// Alone (and even two-up) the shell is the standard centred 1280px page.
	const inner = page.locator(".s-body-inner");
	expect((await inner.boundingBox())!.width).toBeLessThanOrEqual(1280);

	// A third column genuinely fits, so the page stretches — centred — to hold
	// all three, bars included; each column keeps its window-given width.
	await page.getByRole("link", { name: "Push small A" }).click();
	await panelWith(page, /Small A/).waitFor();
	await topPanel(page).getByRole("link", { name: "Push small B" }).click();
	await panelWith(page, /Small B/).waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(3);
	expect((await inner.boundingBox())!.width).toBeGreaterThan(1600);

	// Closing the third settles the page back to the standard width.
	await topPanel(page).getByRole("button", { name: "Cancel" }).click();
	await page.waitForFunction(() =>
		document.querySelector(".s-body-inner")!.getBoundingClientRect().width <= 1280);
	await expect(page.locator(visiblePanels)).toHaveCount(2);
});

test("panels: a large panel grows the page to the window's edges", async ({ page }) => {
	// Wider than the standard 1280px page, so there's somewhere to grow to.
	await page.setViewportSize({ width: 1800, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	// The standard page: the body (and the bars) cap at 1280px, centred.
	const inner = page.locator(".s-body-inner");
	expect((await inner.boundingBox())!.width).toBeLessThanOrEqual(1280);

	// While a "large" is up, the whole page stretches to the screen edges...
	await page.getByRole("link", { name: "Push a large panel" }).click();
	await panelWith(page, /A large panel/).waitFor();
	expect((await inner.boundingBox())!.width).toBeGreaterThan(1700);

	// ...and settles back to the standard width when it closes.
	await topPanel(page).getByRole("button", { name: "Cancel" }).click();
	await page.getByText("Push a panel").waitFor();
	await page.waitForFunction(() =>
		document.querySelector(".s-body-inner")!.getBoundingClientRect().width <= 1280);
});

test("panels: a page closes itself while another column sits on top of it", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	// Stack up playground → A → B. Only two halves fit, so the playground is
	// crowded out from underneath and A and B sit two-up.
	await page.getByRole("link", { name: "Push small A" }).click();
	await panelWith(page, /Small A/).waitFor();
	await topPanel(page).getByRole("link", { name: "Push small B" }).click();
	await panelWith(page, /Small B/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(visiblePanels)).toHaveCount(2);

	// A's ✕ closes A — which is *not* the top panel, so it is spliced out of the
	// stack: B keeps its state and the URL (the top panel never moved), and the
	// playground is revealed in the room A gave up.
	const smallA = page.locator(livePanels, { hasText: /Small A/ });
	await smallA.getByRole("button", { name: "Close" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/b$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	// (A plain count: ShoTest's wrapped expect can't assert on absent elements.)
	expect(await page.locator(livePanels, { hasText: /Small A/ }).count()).toBe(0);

	// The splice is a history entry like any other, so back undoes it.
	await page.goBack();
	await panelWith(page, /Small A/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
});

test("panels: closing the top column reveals the one crowded out beneath it", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	await page.getByRole("link", { name: "Push small A" }).click();
	await panelWith(page, /Small A/).waitFor();
	await topPanel(page).getByRole("link", { name: "Push small B" }).click();
	await panelWith(page, /Small B/).waitFor();
	// Three panels, room for two: the playground is hidden beneath the run.
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(visiblePanels)).toHaveCount(2);

	// The top panel's own Cancel button ($page.close()) frees the room the hidden
	// column needs, and it fades back in at the left edge.
	await topPanel(page).getByRole("button", { name: "Cancel" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
});

test("panels: stacking off keeps a single column at any width", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	// The playground's own checkbox flips the shell's `stacking` option.
	await page.getByLabel("Show as many columns as fit").uncheck();

	// Only the top panel shows now, however much room there is.
	await page.getByRole("link", { name: "Push small A" }).click();
	await panelWith(page, /Small A/).waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(1);

	// Escape still pops the stack, at any width — with the page's own ✕ and the
	// browser's back button, that's the whole way back.
	await page.setViewportSize({ width: 480, height: 800 });
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
});

test("panels: a panel is sized before it draws, and resizes without redrawing", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await page.getByRole("link", { name: "Push the sizing & lifecycle panel" }).click();
	await panelWith(page, /Sizing & lifecycle/).waitFor();

	// The width the handler measured *while drawing* is the width the column
	// really has — not the zero-width box of a panel that hasn't been laid out.
	const panel = topPanel(page);
	const medium = (await panel.boundingBox())!;
	const drawnWidth = Number(await page.getByTestId("drawn-width").textContent());
	expect(Math.abs(drawnWidth - medium.width)).toBeLessThan(1.5);
	await expect(page.getByTestId("live-draws")).toHaveText("1");

	// Asking for another size reflows the column in place: it narrows to half the
	// content area, which frees the room the playground beneath needs — and the
	// panel itself is never redrawn.
	await panel.getByRole("button", { name: "small" }).click();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	expect((await panel.boundingBox())!.width).toBeLessThan(medium.width * 0.7);
	await expect(page.getByTestId("live-draws")).toHaveText("1");
});

test("panels: a closing panel is torn down at once, and only its element lingers", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await page.getByRole("link", { name: "Push the sizing & lifecycle panel" }).click();
	await panelWith(page, /Sizing & lifecycle/).waitFor();

	// The panel's `A.clean` hooks run when it closes, while its own element is
	// still on screen playing the fade — not when the animation is over.
	await topPanel(page).getByRole("button", { name: "Close" }).click();
	await expect(page.getByText("torn down while still fading out")).toBeVisible();
});

test("panels: a nav item arriving redraws the sidebar, not the columns", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await page.getByRole("link", { name: "Push the sizing & lifecycle panel" }).click();
	await panelWith(page, /Sizing & lifecycle/).waitFor();

	// The shell's item list is a proxy array; adding to it must not resubscribe
	// (and so rebuild) the shell around the open columns.
	await page.getByLabel("Add a Scratch nav item").check();
	await expect(page.locator(".s-nav-panel").getByRole("link", { name: "Scratch" })).toBeVisible();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.getByTestId("live-draws")).toHaveText("1");

	await page.getByLabel("Add a Scratch nav item").uncheck();
	await expect(page.locator(".s-nav-panel").getByRole("link", { name: "Scratch" })).toHaveCount(0);
	await expect(page.getByTestId("live-draws")).toHaveText("1");
});

// A floating menu/popover fades in via a `.hidden` → opaque transition. Playwright's
// visibility (and ShoTest's waitFor) ignores opacity, so a panel that is technically
// "visible" can still be mid-fade — present in some screenshots and faded/absent in
// others. Wait for it to fully settle before the next screenshot. (waitForFunction
// isn't wrapped by ShoTest, so this adds no screenshot of its own.)
function settleMenu(page: Page) {
	return page.waitForFunction(() => {
		const m = document.querySelector(".s-menu-list");
		return !!m && !m.classList.contains("hidden") && getComputedStyle(m).opacity === "1";
	});
}
