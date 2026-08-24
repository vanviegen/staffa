import { test, expect, screenshot, type Page } from "shotest";

// Click-through of every page of the Staffa demo. ShoTest screenshots each
// wrapped action, so these double as a visual baseline for the whole library.

test("form: fill out, submit, switch layout", async ({ page }) => {
	await page.goto("./");

	page.describe("Fill out the account form");
	// Not exact: the required marker makes the label text "Name*".
	await page.getByLabel("Name").fill("Ada Lovelace");
	await page.getByLabel("Email").fill("ada@example.com");
	await page.getByLabel("Country").selectOption("Netherlands");

	page.describe("Autocomplete: type ahead, pick from the dropdown");
	await page.getByLabel("Language").fill("Type");
	await page.getByRole("option", { name: "TypeScript" }).click();

	page.describe("Multi-autocomplete: add a tag as a chip");
	await page.getByLabel("Tags").fill("css");
	await page.getByRole("option", { name: "css", exact: true }).click();

	await page.getByLabel("Bio").fill("Wrote the first program.");
	await page.getByLabel("Subscribe to the newsletter").check();

	page.describe("Submit, and check the echoed data");
	await page.getByRole("button", { name: "Save" }).click();
	await page.getByText("Submitted data").waitFor();
	await expect(page.locator("pre")).toContainText("ada@example.com");
	await page.getByRole("button", { name: "Close" }).click();

	page.describe("Switch the form to the stacked layout");
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

	page.describe("Click through the URL-linked tabs");
	await page.getByRole("tab", { name: "Details" }).click();
	await expect(page).toHaveURL(/tab=details/);
	await page.getByRole("tab", { name: "History" }).click();
	await expect(page.getByText("The History tab.")).toBeVisible();
	await expect(page.getByRole("tab", { name: "Disabled" })).toBeDisabled();

	page.describe("Narrow the window until the second strip overflows, and scroll it by button");
	// The ‹/› buttons are the affordance a bare scroll area lacks.
	await page.setViewportSize({ width: 640, height: 900 });
	const strip = page.locator(".s-tabbar").last();
	// Only the "scroll right" button is up at rest: there's nothing to the left yet.
	await expect(strip).toHaveClass(/s-can-right/);
	await expect(strip).not.toHaveClass(/s-can-left/);

	await strip.locator(".s-strip-btn-right").click({ force: true });
	await expect(strip).toHaveClass(/s-can-left/);

	// A tab that was off the end is now in reach; selecting it keeps it in view.
	await page.getByRole("tab", { name: "Tab 9", exact: true }).click();
	await expect(page.getByText("Content for tab 9.")).toBeVisible();

	page.describe("The same scroll strip on its own, holding plain chips");
	// (Scoped to a box: the stack up in the bar is a `.s-strip` too.)
	const chips = page.locator(".s-box .s-strip:not(.s-tabbar)");
	await expect(chips).toHaveClass(/s-can-right/);
	await expect(chips).not.toHaveClass(/s-can-left/);
	await chips.locator(".s-strip-btn-right").click({ force: true });
	await expect(chips).toHaveClass(/s-can-left/);
	await expect(chips.getByRole("button", { name: "Archive" })).toBeVisible();
});

test("overlays: toasts, tooltips, menus and dialogs", async ({ page }) => {
	await page.goto("./overlays");
	await page.getByText("Toast notifications").waitFor();

	page.describe("Fire two toasts; they stack at the bottom");
	await page.getByRole("button", { name: "Success" }).click();
	await page.getByText("Your changes have been saved.").waitFor();
	await page.getByRole("button", { name: "Danger" }).click();
	await page.getByText("Something went wrong.").waitFor();

	page.describe("Show a tooltip on hover");
	await page.getByRole("button", { name: "Rich tip" }).hover();
	await page.getByText("in tips").waitFor();
	// Move off and let the tooltip fully disappear before moving on: its hide is a
	// 100 ms wall-clock timer, so otherwise it can still be lingering in the menu
	// screenshots below (notably under load).
	await page.mouse.move(0, 0);
	await page.waitForSelector(".s-tt-tip", { state: "detached" });

	page.describe("Open the Actions menu, pick an item");
	await page.getByRole("button", { name: "Actions" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByText("Edit clicked").waitFor();

	page.describe("Right-click the box for its context menu");
	await page.getByText("Right-click (or long-press)").click({ button: "right" });
	await page.getByRole("button", { name: "Copy", exact: true }).click();
	await page.getByText("Copied!").waitFor();

	// The toasts fired above auto-dismiss on a wall clock (6 s), so by the time the
	// dialog steps below run they're mid-expiry — present in some screenshots and
	// gone in others depending on machine speed. Reload to a clean slate so the
	// dialog screenshots are deterministic (no stray toasts straddling them).
	await page.reload();
	await page.getByText("Toast notifications").waitFor();

	page.describe("Run the alert(), confirm() and prompt() shortcuts");
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

	page.describe("Stack a dialog inside a dialog, closing them inside-out");
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

test("menu: a submenu tree unfolds along the current selection", async ({ page }) => {
	await page.goto("./overlays");
	await page.getByText("Inline menu with submenus").waitFor();

	const tree = page.locator(".s-menu-inline");
	// Branches are native <details>; their rows stay mounted but hidden while
	// folded, so no branch content shows before anything under it is current.
	await expect(tree.getByRole("link", { name: "Apple" })).toBeHidden();

	page.describe("Click the Fruit branch: it selects its first leaf, which unfolds it");
	await tree.locator("summary", { hasText: "Fruit" }).click();
	await expect(page).toHaveURL(/pick=apple/);
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: apple");
	await expect(tree.getByRole("link", { name: "Apple" })).toBeVisible();
	await expect(tree.getByRole("link", { name: "Apple" })).toHaveAttribute("aria-current", "page");

	page.describe("Click nested Citrus: both levels stay unfolded");
	await tree.locator("summary", { hasText: "Citrus" }).click();
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: lemon");
	await expect(tree.getByRole("link", { name: "Lime" })).toBeVisible();
	await expect(tree.getByRole("link", { name: "Banana" })).toBeVisible();

	page.describe("Pick under Vegetables: the Fruit branch folds back up");
	await tree.locator("summary", { hasText: "Vegetables" }).click();
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: carrot");
	await expect(tree.getByRole("link", { name: "Apple" })).toBeHidden();
	await expect(tree.getByRole("link", { name: "Carrot" })).toHaveAttribute("aria-current", "page");
});

test("menu: a page the menu doesn't hold leaves its folds alone", async ({ page }) => {
	await page.goto("./overlays");
	await page.getByText("Inline menu with submenus").waitFor();
	// Narrow, so the lone open panel still writes a crumb (to right-click below).
	await page.setViewportSize({ width: 480, height: 800 });

	page.describe("Unfold the tree two levels deep");
	const tree = page.locator(".s-menu-inline");
	await tree.locator("summary", { hasText: "Fruit" }).click();
	await tree.locator("summary", { hasText: "Citrus" }).click();
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: lemon");

	page.describe("Pin the Overlays panel, so navigating elsewhere parks it — alive");
	await page.locator(".s-crumb", { hasText: "Overlays" }).click({ button: "right" });
	await page.locator(".s-menu-list").getByRole("button", { name: "Pin" }).click();
	page.describe("Navigate to Surfaces through the phone nav");
	await page.locator(".s-nav-trigger button").click();
	// Surfaces sits inside the nav's folded Styling branch: the branch click
	// unfolds it (selecting its first leaf, without dismissing the nav), and
	// picking the leaf is what hands over.
	await page.locator(".s-nav-page summary", { hasText: "Styling" }).click();
	await page.locator(".s-nav-page").getByRole("link", { name: "Surfaces" }).click();
	await expect(page).toHaveURL(/\/demo\/surfaces$/);

	page.describe("No page in the tree is current now — the folds must stay as they were");
	await expect(tree.locator("details").first()).toHaveAttribute("open", /./);
	await expect(tree.locator("details details")).toHaveAttribute("open", /./);
	await expect(tree.locator("details").last()).not.toHaveAttribute("open", /./);
});

test("nav: the phone nav remembers its folds while you're off the map", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./content");
	await page.getByText("Prose & flow content").waitFor();

	page.describe("Open the nav: the Styling branch holds the current page, so it arrives unfolded");
	await page.getByRole("button", { name: "Open navigation" }).click();
	// `:not(...-off)`: a dismissed nav page lingers in the DOM (hidden) for a
	// couple of seconds before Aberdeen removes it — target the live one.
	const navPage = page.locator(".s-nav-page:not(.s-nav-page-off)");
	await expect(navPage.getByRole("link", { name: "Content" })).toHaveAttribute("aria-current", "page");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(navPage).toHaveCount(0);

	page.describe("Wander off the menu's map: this page has no row (and no match) anywhere");
	await page.getByRole("link", { name: "edge-to-edge list" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/rows$/);

	page.describe("Reopen the nav: the menu mounts afresh, but the folds are remembered");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(navPage.getByRole("link", { name: "Content" })).toBeVisible();
	await expect(navPage.getByRole("link", { name: "Surfaces" })).toBeVisible();
});

test("nav: match lets an item claim pages beyond its own href", async ({ page }) => {
	await page.goto("./icons/heart");
	await expect(page.locator(".s-crumb")).toHaveText(["Icons", "heart"]);
	// The icon detail page has no nav row of its own; the gallery's row claims
	// it via `match`, so the sidebar still says where you are — on a cold deep
	// link, which no amount of fold-state keeping could cover.
	await expect(page.locator(".s-nav-panel").getByRole("link", { name: "Icons" }))
		.toHaveAttribute("aria-current", "page");
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

	page.describe("Open the nav: a full page over the content, the ☰ becoming an ✕");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(page.locator(".s-nav-page:not(.s-nav-page-off)")).toHaveCount(1);

	page.describe("Pick an item: the nav hands over to that screen");
	await page.getByRole("link", { name: "Overlays" }).click();
	await page.getByText("Toast notifications").waitFor();

	page.describe("Reopen, and dismiss with the ✕: the content stays as it was");
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

/**
 * Wait until the sidebar's current (`aria-current=page`) row sits fully inside
 * the sidebar's scrollport — i.e. the reveal scroll has landed. (waitForFunction
 * isn't wrapped by ShoTest, so this adds no screenshot of its own.)
 */
function navRevealsCurrent(page: Page) {
	return page.waitForFunction(() => {
		const nav = document.querySelector(".s-nav-panel");
		const item = nav?.querySelector("[aria-current=page]");
		if (!nav || !item) return false;
		const n = nav.getBoundingClientRect(), i = item.getBoundingClientRect();
		return i.top >= n.top && i.bottom <= n.bottom;
	});
}

test("nav: navigating scrolls an off-screen sidebar item into view", async ({ page }) => {
	// A window too short for the whole nav, so the sidebar overflows and scrolls.
	// (Still wider than 640px, so the nav stays a sidebar.)
	await page.setViewportSize({ width: 900, height: 320 });
	await page.goto("./buttons");
	await page.getByText("Variants & sizes").waitFor();

	const nav = page.locator(".s-nav-panel");
	const panelsItem = nav.getByRole("link", { name: "Panels" });

	page.describe("The Panels row starts out below the sidebar's fold");
	const navBox = (await nav.boundingBox())!;
	const itemBox = (await panelsItem.boundingBox())!;
	expect(itemBox.y + itemBox.height).toBeGreaterThan(navBox.y + navBox.height);

	// Navigate from the page's own content, an `<a role=button>` (`S.button`
	// with `href`) — not the sidebar's own row, whose click Playwright would
	// scroll into view itself, muddying whether the reveal was ours. The
	// explicit `role=button` overrides the implicit link role, so it's an
	// accessible "button", not a "link".
	page.describe("Navigate there from the page's own content");
	await page.getByRole("button", { name: "Open the Panels demo" }).click();
	await page.getByText("Push a panel").waitFor();

	// The sidebar scrolled down to reveal the now-current row.
	await expect(panelsItem).toHaveAttribute("aria-current", "page");
	await navRevealsCurrent(page);
	expect(await nav.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

	page.describe("The app's name leads home: the highlight and the scroll follow back up");
	await page.locator("header .s-title").click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await navRevealsCurrent(page);

	page.describe("A cold deep link arrives with the sidebar already scrolled to its row");
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await navRevealsCurrent(page);
	expect(await nav.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
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

	// With no page left to dismiss, a second Escape falls through to the nav jump.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();
});

// ─── Routed stack ──────────────────────────────────────────────────────

// A page that's on its way out lingers in the DOM for the length of its exit
// animation, and one that's scrolled off-canvas to the left is marked `inert`.
const livePanels = ".s-panel:not(.s-panel-closing)";
const visiblePanels = ".s-panel:not(.s-panel-closing):not([inert])";

/** The deepest page that isn't on its way out — where "the current screen" is. */
function topPanel(page: Page) {
	return page.locator(livePanels).last();
}

/** The current page's scroll area — the page's own content. */
function panelBody(page: Page) {
	return topPanel(page).locator(":scope > .s-content");
}

/**
 * The live page whose content matches `text`. A `RegExp` rather than a string,
 * because a string match is case-insensitive and "Small A" would then also hit
 * the navigation grid's "Small A" links.
 */
function panelWith(page: Page, text: RegExp) {
	return page.locator(livePanels, { hasText: text });
}

/**
 * Drive the stack box's navigator inside `panel`: pick the target page, set
 * whether to navigate from that very panel (its own `open`) or through the
 * stack's methods (which build on the current panel), and fire one of the
 * three navigations.
 */
async function stackNav(panel: ReturnType<typeof topPanel>, name: string, how: "push" | "replace" | "open", fromHere = true) {
	const box = panel.locator(".s-box", { hasText: "The stack" });
	await box.getByLabel("Navigation").selectOption(how);
	await box.getByLabel("Page").selectOption({ label: name });
	await box.getByLabel("Origin").selectOption(fromHere ? "here" : "stack");
	await box.getByRole("button", { name: "Go" }).click();
}

/** The leftmost open panel — the playground, in the tests that start there. */
function firstPanel(page: Page) {
	return page.locator(livePanels).first();
}

test("panels: a phone pushes and pops one screen at a time", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();

	page.describe("Tap an icon: its detail pushes over the gallery, which stays mounted off-canvas");
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/heart$/);
	await page.getByText('import { heart }').waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(1);

	page.describe("The screen's declared title and actions both sit in the bar — no column chrome");
	await expect(page.locator(".s-panel-actions")).toHaveCount(0);
	await expect(page.locator(".s-crumb").last()).toHaveText("heart");
	await expect(page.locator("header").getByRole("button", { name: "Next" })).toBeVisible();

	page.describe("Going back is the crumbs' job: no back button, and the ☰ keeps its corner");
	await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
	await page.locator(".s-crumb", { hasText: "Icons" }).click();
	await expect(page).toHaveURL(/\/demo\/icons$/);
	await page.getByText("Gallery").waitFor();
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();

	page.describe("The browser's back button does exactly the same");
	await page.getByRole("link", { name: "star", exact: true }).click();
	await page.getByText("import { star }").waitFor();
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/icons$/);
	// Wait for the gallery to actually show. The URL flips as soon as the
	// traversal lands — before the shell has reacted — and the visible-panel
	// count is 1 on both sides of a goBack, so neither expect here pins the
	// *new* state; without this wait the screenshot races the reveal pass.
	await page.getByText("Gallery").waitFor();
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
	// The medium gallery and the small detail add up to exactly the content
	// area, so they pair up as two columns on any ordinary desktop width.
	// /demo/icons matches a route, so it becomes the page beneath
	// /demo/icons/heart (while /demo, which has no route, is skipped).
	await page.goto("./icons/heart");
	await page.getByText("Gallery").waitFor();
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	// The current page's `$panel.title` prefixes the shell's own title.
	await expect(page).toHaveTitle("heart · Staffa");

	page.describe("A click in the gallery replaces the detail rather than stacking a third");
	await page.getByRole("link", { name: "star", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/star$/);
	await page.getByText("import { star }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// `data-panel=replace` paging swaps the detail in place — still no third column.
	// The pager is the detail's `actions`, which on a wide shell the shell draws in
	// that column's own chrome. (Scoped to the current page: the one being replaced
	// lingers while it fades. The pagers are `S.button({ href })`s → `<a role=button>`.)
	page.describe("The Next pager (data-panel=replace) swaps the detail in place");
	await topPanel(page).getByRole("button", { name: "Next" }).click();
	await page.getByText("import { bookmark }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("A reload reproduces both columns from the history entry");
	await page.reload();
	await page.getByText("Gallery").waitFor();
	await page.getByText("import { bookmark }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
});

test("panels: a link to an already-open panel goes back to it", async ({ page }) => {
	await page.goto("./panels/medium");
	// Not the box header: the playground beneath holds a "Push a medium panel" link
	// that a substring match would also hit.
	await page.getByText("two of the shell").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("A push to the already-open playground goes back to it; the medium page closes");
	await stackNav(panelWith(page, /two of the shell/), "Playground", "push");
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);
	// The playground is the current page again, so its title takes over.
	await expect(page).toHaveTitle("Panels · Staffa");

	page.describe("The browser's back button brings the closed column back");
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/panels\/medium$/);
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page).toHaveTitle("Medium · Staffa");
});

test("panels: a crumb goes back to its panel, closing what was stacked on it", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(panelWith(page, /Small A is a/), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);

	// `shell.panels` holds the live Panel objects and `shell.currentPanelIndex`
	// the cursor into them, so the box reading them redraws as the stack grows.
	const stackList = page.getByTestId("stack-list").first();
	await expect(stackList.locator("li")).toHaveText([
		"/demo/panels", "/demo/panels/a", "/demo/panels/b ← current",
	]);

	page.describe("The first crumb goes back to the playground; A and B close behind it");
	await page.locator(".s-crumb", { hasText: "Panels" }).click();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);
	await expect(stackList.locator("li")).toHaveText(["/demo/panels ← current"]);

	page.describe("Browser back and forward replay the arrangements");
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/panels\/b$/);
	await expect(page.locator(livePanels)).toHaveCount(3);
	await page.goForward();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(livePanels)).toHaveCount(1);

	page.describe("A reload restores the arrangement");
	await page.reload();
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);
});

test("panels: crumbs only shorten under pressure, longest first", async ({ page }) => {
	// Three long-titled pages; the cold link derives all four columns (the
	// playground beneath them) from the path.
	await page.goto("./panels/long/detail/deeper");
	await page.getByText("Back to the playground").waitFor();

	const crumbs = page.locator(".s-crumb");
	const widths = () => crumbs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
	const clipped = () =>
		crumbs.evaluateAll((els) => els.map((el) => el.scrollWidth > Math.ceil(el.getBoundingClientRect().width)));

	page.describe("Room to spare: every title shows in full, however long");
	await expect(crumbs).toHaveCount(4);
	await expect(crumbs.last()).toHaveText("Appendix C: methodology, data sources and the small print");
	expect(await clipped()).toEqual([false, false, false, false]);
	await screenshot(page, "crumbs-roomy");

	page.describe("A narrower window: the long crumbs equalise; 'Panels' keeps every character");
	await page.setViewportSize({ width: 800, height: 900 });
	await expect.poll(clipped).toEqual([false, true, true, true]);
	const w = await widths();
	// Water-filling: the crumbs that gave way all end at the same width.
	expect(Math.max(w[1], w[2], w[3]) - Math.min(w[1], w[2], w[3])).toBeLessThan(2);
	await screenshot(page, "crumbs-equalised");

	page.describe("Narrower still: long crumbs bottom out at 4rem, and the strip scrolls");
	await page.setViewportSize({ width: 360, height: 800 });
	await expect(page.locator(".s-crumbs.s-can-left, .s-crumbs.s-can-right")).toHaveCount(1);
	await expect.poll(widths).toEqual([
		expect.closeTo(w[0], 0), // untouched
		expect.closeTo(64, 0), expect.closeTo(64, 0), expect.closeTo(64, 0), // the 4rem floor
	]);
	await screenshot(page, "crumbs-floored-scrolling");
});

test("panels: a large page takes three columns, and the shell holds still", async ({ page }) => {
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("./panels/large");
	await page.getByText("three of the shell").waitFor();

	page.describe("The page is three of the shell's columns; the bars are the shell, as ever");
	const region = (await page.locator(".s-panels").boundingBox())!;
	const panelW = (await topPanel(page).boundingBox())!.width;
	const headerBar = (await page.locator("header .s-bar").boundingBox())!;
	const footerBar = (await page.locator("footer .s-bar").boundingBox())!;
	// 1600 window − 200 sidebar = 1400 of content area: three columns of 466⅔.
	expect(region.width).toBeCloseTo(1400, 0);
	expect(panelW).toBeCloseTo(1400, 0);
	expect(headerBar.width).toBeCloseTo(1600, 0);
	expect(footerBar.width).toBeCloseTo(1600, 0);
	await screenshot(page, "large-panel-fills-area");
});

test("panels: a pinned panel survives navigation elsewhere, but not its own close", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();

	page.describe("Pin Small A from its crumb's context menu");
	await page.locator(".s-crumb", { hasText: "Small A" }).click({ button: "right" });
	await page.getByRole("button", { name: "Pin", exact: true }).click();
	await expect(page.locator(".s-crumb-pin")).toHaveCount(1);

	page.describe("Open a new page elsewhere: the pinned panel rides along beneath it");
	await page.locator(".s-crumb", { hasText: "Panels" }).click();
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Medium", "push");
	await expect(page).toHaveURL(/\/demo\/panels\/medium$/);
	await page.getByText("two of the shell").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(".s-crumb")).toHaveCount(3);
	await expect(page.locator(".s-crumb-pin")).toHaveCount(1);

	page.describe("A reload keeps the pin");
	await page.reload();
	await page.getByText("two of the shell").waitFor();
	await expect(page.locator(".s-crumb-pin")).toHaveCount(1);

	page.describe("An explicit Close from the crumb menu still takes the pinned page out");
	await page.locator(".s-crumb", { hasText: "Small A" }).click({ button: "right" });
	await page.getByRole("button", { name: "Close", exact: true }).click();
	await expect(page.locator(".s-crumb")).toHaveCount(2);
	await expect(page.locator(".s-crumb-pin")).toHaveCount(0);
	await expect(page).toHaveURL(/\/demo\/panels\/medium$/);
});

test("panels: an unsaved panel parks instead of closing", async ({ page }) => {
	await page.goto("./form/guard");
	await page.getByText("Type something below").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("Dirty the draft: a ● appears on the crumb and the tab title");
	await page.getByLabel("Draft").fill("precious");
	await expect(page.locator(".s-crumb-unsaved")).toHaveCount(1);
	await expect(page).toHaveTitle("• Unsaved demo · Staffa");

	page.describe("Escape can't close it: it parks the page instead, work and all");
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(".s-panel-parked")).toHaveCount(1);
	await expect(page).toHaveTitle(/^• /);

	page.describe("The crumb menu can't close it either: Close is greyed out");
	await page.locator(".s-crumb", { hasText: "Unsaved demo" }).click({ button: "right" });
	await expect(page.getByRole("button", { name: "Close", exact: true }))
		.toHaveAttribute("aria-disabled", "true");
	await page.keyboard.press("Escape"); // dismiss the menu

	page.describe("Return via the crumb and Save: the flag clears, the close goes through");
	await page.locator(".s-crumb", { hasText: "Unsaved demo" }).click();
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
});

test("panels: closing the tab with unsaved work asks, and staying shows the panel", async ({ page }) => {
	await page.goto("./form/guard");
	await page.getByText("Type something below").waitFor();
	await page.getByLabel("Draft").fill("precious");
	await page.keyboard.press("Escape"); // park it out of sight
	await expect(page).toHaveURL(/\/demo\/form$/);

	page.describe("Closing the tab runs into the browser's are-you-sure");
	const dialog = page.waitForEvent("dialog");
	void page.close({ runBeforeUnload: true });
	expect((await dialog).type()).toBe("beforeunload");
	await (await dialog).dismiss();

	page.describe("Staying brings the page that held the tab back on screen");
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);
	await expect(page.getByLabel("Draft")).toHaveValue("precious");
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

test("panels: browser back keeps an unsaved panel, parked", async ({ page }) => {
	// The unsaved page is *pushed*, so there is a history entry beneath it —
	// from before the page existed — for the browser's back button to head for.
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Unsaved changes", "push");
	await page.getByLabel("Draft").fill("precious");

	page.describe("Browser back keeps the unsaved page anyway, parked with its ●");
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(".s-panel-parked")).toHaveCount(1);
	await expect(page.locator(".s-crumb-unsaved")).toHaveCount(1);

	page.describe("Its crumb brings it back, draft intact");
	await page.locator(".s-crumb", { hasText: "Unsaved demo" }).click();
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);
	await expect(page.getByLabel("Draft")).toHaveValue("precious");
});

test("panels: a whole-stack replacement still keeps the unsaved panel", async ({ page }) => {
	await page.goto("./form/guard");
	await page.getByText("Type something below").waitFor();
	await page.getByLabel("Draft").fill("precious");
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("An origin-less link replaces the whole stack — only the unsaved page rides along");
	// A link outside any page derives its target's whole stack. The derived one
	// shares nothing with the open stack: the (saved) form page closes with the
	// rest, while the unsaved page can't be closed by anything, and parks.
	await page.evaluate(() => {
		const a = document.createElement("a");
		a.href = "/demo/panels/a/nowhere";
		a.textContent = "Somewhere else";
		a.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99";
		document.body.appendChild(a);
	});
	await page.getByRole("link", { name: "Somewhere else" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a\/nowhere$/);
	await page.getByText("There is no page at /demo/panels/a/nowhere.").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(4);
	await expect(page.locator(".s-panel-parked")).toHaveCount(1);
	await expect(page.locator(".s-crumb-unsaved")).toHaveCount(1);
	await expect(page).toHaveTitle(/^• /);
});

test("panels: the columns on screen are centred in the content area", async ({ page }) => {
	// 1280 window − 200 sidebar = 1080 of content area, which divides into three
	// columns of 360 — the narrowest whole number that keeps each one at 360+.
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	// The room left either side of the run of columns, and their widths.
	const run = () => page.locator(".s-panels").evaluate((region) => {
		const area = region.getBoundingClientRect();
		const cols = [...region.querySelectorAll(".s-panel:not(.s-panel-closing):not([inert])")]
			.map((el) => el.getBoundingClientRect())
			.sort((a, b) => a.left - b.left);
		return {
			gaps: [Math.round(cols[0].left - area.left), Math.round(area.right - cols[cols.length - 1].right)],
			widths: cols.map((c) => Math.round(c.width)),
		};
	});

	page.describe("The lone medium playground: two thirds of the area, centred in it");
	await expect.poll(run).toEqual({ gaps: [180, 180], widths: [720] });

	page.describe("A small column beside it fills the area exactly");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await expect.poll(run).toEqual({ gaps: [0, 0], widths: [720, 360] });

	page.describe("A third crowds the playground out; the two smalls recentre");
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect.poll(run).toEqual({ gaps: [180, 180], widths: [360, 360] });
});

test("panels: the sidebar and the content area tile the window, whatever is open", async ({ page }) => {
	// Uncapped, the shell *is* the window: the sidebar takes its `navWidth` and
	// the content area takes the rest. Neither depends on what's open, which is
	// the whole point — the chrome never moves while columns come and go.
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	const shell = async () => {
		const nav = (await page.locator(".s-nav-panel").boundingBox())!;
		const sep = (await page.locator(".s-nav-sep").boundingBox())!;
		const area = (await page.locator(".s-panels").boundingBox())!;
		const bar = (await page.locator("header .s-bar").boundingBox())!;
		return { nav: nav.width + sep.width, area: area.width, bar: bar.width, navX: Math.round(nav.x) };
	};

	page.describe("The sidebar, its hairline and the content area tile the window exactly");
	expect(await shell()).toEqual({ nav: 200, area: 1400, bar: 1600, navX: 0 });

	page.describe("Two more columns later, not one of those figures has moved");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	expect(await shell()).toEqual({ nav: 200, area: 1400, bar: 1600, navX: 0 });
});

test("panels: a link builds on its own panel, a stack method on the current one", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A"]);

	page.describe("A from-here push in the playground replaces Small A instead of stacking on it");
	// Small A is the current panel; the navigator sits in the playground column
	// beside it, and `$panel.open` builds on *that* panel — so Small A closes.
	await stackNav(firstPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small B"]);

	page.describe("The stack-method cell builds on the current panel instead");
	// Back to [Panels, Small A] first, via the grid again.
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	// stack.pushPanel builds on the *current* panel — Small A — so Small B lands
	// on top of it: three crumbs, nothing closed. That difference is why a
	// list's click handler wants the panel's own `open` instead.
	await stackNav(firstPanel(page), "Small B", "push", false);
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);
});

test("panels: replace and open recycle a panel that is already open", async ({ page }) => {
	// Wide enough for all three columns, so the playground's navigator stays usable.
	await page.setViewportSize({ width: 1920, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);

	page.describe("Replace from the playground, aiming at the already-open Small B");
	// Mark Small B's element, to prove the panel moves rather than being rebuilt.
	await panelWith(page, /Small B is a/).evaluate((el) => { (el as HTMLElement).dataset.probe = "kept"; });
	// Replace semantics from the playground: everything in its place goes, and
	// Small B — already open — moves into the one remaining slot, alive.
	await stackNav(firstPanel(page), "Small B", "replace");
	await expect(page.locator(".s-crumb")).toHaveText(["Small B"]);
	await expect(page.locator(livePanels)).toHaveCount(1);
	expect(await page.locator(livePanels).evaluate((el) => (el as HTMLElement).dataset.probe)).toBe("kept");

	page.describe("Browser back restores the arrangement — Small B still the same element");
	await page.goBack();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);
	expect(await panelWith(page, /Small B is a/).evaluate((el) => (el as HTMLElement).dataset.probe)).toBe("kept");
});

test("panels: a panel closes itself while another column sits on top of it", async ({ page }) => {
	// At 1280 the area is 1080: the medium playground (720) plus one small (360)
	// fill it exactly, so a third column crowds one out.
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	page.describe("Stack playground → A → B; the playground is crowded out");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(visiblePanels)).toHaveCount(2);

	page.describe("Delete A — not the top page — and it is spliced out from under B");
	// `$panel.close()` on a mid-stack page: B keeps its state and the URL, and
	// the playground is revealed in the room A gave up.
	const smallA = page.locator(livePanels, { hasText: /Small A is a/ });
	await smallA.getByRole("button", { name: "Delete" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/b$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	// (A plain count: ShoTest's wrapped expect can't assert on absent elements.)
	expect(await page.locator(livePanels, { hasText: /Small A is a/ }).count()).toBe(0);

	page.describe("The splice is a history entry, so browser back undoes it");
	await page.goBack();
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
});

test("panels: closing the top column reveals the one crowded out beneath it", async ({ page }) => {
	// At 1280 the medium playground plus one small fill the area, so the third
	// column crowds the playground out.
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	// Three panels, room for two: the playground is hidden beneath the run.
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(visiblePanels)).toHaveCount(2);

	// Closing the current page frees the room the hidden column needs, and it fades
	// back in at the left edge.
	await topPanel(page).getByRole("button", { name: "Delete" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
});

test("panels: linkNavigation sets what a link without data-panel does", async ({ page }) => {
	// The icons gallery is full of bare links (no `data-panel`), which is
	// exactly what the setting governs.
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();
	// The chooser lives in the header's display-settings popover, so it can be
	// reached from any page — the panel a bare link then swaps out included.
	const chooseLinks = async (mode: string) => {
		await page.getByRole("button", { name: "Display settings" }).click();
		await settleMenu(page);
		await page.locator(".s-menu-list:not(.hidden) label", { hasText: "Links" }).getByRole("button", { name: mode, exact: true }).click();
		await page.keyboard.press("Escape");
	};

	page.describe("linkNavigation=replace: a bare link swaps the panel it sits in for its target");
	await chooseLinks("replace");
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/heart$/);
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);

	page.describe("linkNavigation=open: a bare link behaves like a nav item, deriving a fresh stack");
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();
	await chooseLinks("open");
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await page.getByText("import { heart }").waitFor();
	// The gallery survived (the derived stack holds it); a second bare link
	// from it derives afresh, so the heart detail closes rather than stacking.
	await page.getByRole("link", { name: "star", exact: true }).click();
	await page.getByText("import { star }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(".s-crumb")).toHaveText(["Icons", "star"]);
});

test("panels: columns single keeps a single column at any width", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	page.describe("Choose a single column, up in the display-settings popover");
	await page.getByRole("button", { name: "Display settings" }).click();
	await settleMenu(page);
	await page.locator(".s-menu-list:not(.hidden) label", { hasText: "Columns" }).getByRole("button", { name: "single", exact: true }).click();
	await page.keyboard.press("Escape");

	page.describe("Only the current page shows now, however much room there is");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(1);
	// Its "small" ask still holds — the ceiling is a promise, single mode or not.
	expect((await page.locator(visiblePanels).boundingBox())!.width).toBeCloseTo(360, 0);

	page.describe("Escape still pops the stack, at any width");
	await page.setViewportSize({ width: 480, height: 800 });
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
});

test("panels: a panel is sized before it draws, and resizes without redrawing", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Sizing & lifecycle", "push");
	await panelWith(page, /is sized before its draw/).waitFor();

	page.describe("The panel already knew its real width while it drew");
	const column = topPanel(page);
	const full = (await column.boundingBox())!;
	const drawnWidth = Number(await page.getByTestId("page-width").textContent());
	expect(Math.abs(drawnWidth - full.width)).toBeLessThan(1.5);
	await expect(page.getByTestId("live-draws")).toHaveText("1");

	page.describe("Asking for a small column reflows it in place — never redrawn");
	await column.getByRole("button", { name: "small" }).click();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	const narrowed = (await column.boundingBox())!.width;
	expect(narrowed).toBeLessThan(full.width * 0.7);
	await expect(page.getByTestId("live-draws")).toHaveText("1");
	expect(Math.abs(Number(await page.getByTestId("page-width").textContent()) - narrowed)).toBeLessThan(1.5);
});

test("panels: the width sliders resize the shell in place, chrome and all", async ({ page }) => {
	// `navWidth` and `maxWidth` are live, so the demo hands them to the shell
	// through getters and drives them from two sliders in the display-settings
	// popover. The cap holds the sidebar, the columns and both bars to one
	// width, so the chrome can't drift away from the content.
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Sizing & lifecycle", "push");
	await panelWith(page, /is sized before its draw/).waitFor();
	await expect(page.getByTestId("live-draws")).toHaveText("1");

	const shell = async () => {
		const nav = (await page.locator(".s-nav-panel").boundingBox())!;
		const sep = (await page.locator(".s-nav-sep").boundingBox())!;
		const area = (await page.locator(".s-panels").boundingBox())!;
		const bar = (await page.locator("header .s-bar").boundingBox())!;
		return { nav: nav.width + sep.width, area: area.width, bar: bar.width, left: Math.round(nav.x) };
	};
	// The demo's cap is 1920, so at this width the shell simply fills the window.
	expect(await shell()).toEqual({ nav: 200, area: 1400, bar: 1600, left: 0 });

	page.describe("Open the display settings: a slider each for the sidebar and the cap");
	await page.getByRole("button", { name: "Display settings" }).click();
	const sliders = page.locator("input[type=range]");
	await expect(sliders).toHaveCount(2);

	page.describe("A wider sidebar takes its room from the content area beside it");
	await sliders.nth(0).fill("320");
	await expect.poll(async () => (await shell()).nav).toBe(320);
	expect(await shell()).toEqual({ nav: 320, area: 1280, bar: 1600, left: 0 });

	page.describe("Capping the shell narrows sidebar, columns and bars alike — and centres the lot");
	await sliders.nth(1).fill("1200");
	await expect.poll(async () => (await shell()).bar).toBe(1200);
	expect(await shell()).toEqual({ nav: 320, area: 880, bar: 1200, left: 200 });
	// Panels reflow in place: the one on screen has its new width, and has not
	// been drawn a second time.
	await expect(page.getByTestId("page-width")).toHaveText("880");
	await expect(page.getByTestId("live-draws")).toHaveText("1");
});

test("panels: a closing panel is torn down at once, and only its element lingers", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Sizing & lifecycle", "push");
	await panelWith(page, /is sized before its draw/).waitFor();

	// The page's `A.clean` hooks run when it closes, while its own element is
	// still on screen playing the fade — not when the animation is over.
	await page.keyboard.press("Escape");
	await expect(page.getByText("torn down while still fading out")).toBeVisible();
});

test("panels: a nav item arriving redraws the sidebar, not the columns", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Sizing & lifecycle", "push");
	await panelWith(page, /is sized before its draw/).waitFor();

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

test("panels: two quick Escapes peel two columns", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);

	// Back to back, with no time for the first to land: closing travels through
	// the browser's history, and the second Escape must aim at the stack the
	// first one is heading for rather than the one still on screen.
	await page.evaluate(() => {
		const escape = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		escape();
		escape();
	});
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
});

test("panels: a cold flat URL gets the ancestors the app names for it", async ({ page }) => {
	// Nothing in /demo/thread/7 says where it belongs, and no prefix of it is a
	// route — so the shell asks the app, which puts the playground underneath.
	await page.goto("./thread/7");
	await page.getByRole("heading", { name: "Thread 7" }).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(livePanels).first()).toContainText("Push a panel");

	page.describe("So Escape has somewhere to go, as if you had walked here");
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(livePanels)).toHaveCount(1);

	page.describe("openPanelStack() builds the same arrangement from code");
	await stackNav(firstPanel(page), "Thread 8", "open", false);
	await page.getByRole("heading", { name: "Thread 8" }).waitFor();
	await expect(page).toHaveURL(/\/demo\/thread\/8$/);
	await expect(page.locator(livePanels)).toHaveCount(2);
});

test("panels: a data-panel=open link gives its target its own stack", async ({ page }) => {
	await page.goto("./panels/item/42");
	await panelWith(page, /params.id is number 42/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	// A plain link from the item would stack the thread on top of it, three
	// columns deep. `data-panel=open` leaves the item behind instead and asks
	// `ancestors` what belongs under the thread — the playground — so this lands
	// on exactly the columns a cold link to /demo/thread/8 would open.
	await panelWith(page, /params.id is number 42/)
		.getByRole("link", { name: "Open a thread, on its own stack" }).click();
	await expect(page).toHaveURL(/\/demo\/thread\/8$/);
	await page.getByRole("heading", { name: "Thread 8" }).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Thread 8"]);
});

test("nav: custom rows close the nav — on navigating, and on asking", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Sizing & lifecycle", "push");
	await panelWith(page, /is sized before its draw/).waitFor();
	page.describe("Add the Scratch nav row: a custom slot the shell can't see into");
	await page.getByLabel("Add a Scratch nav item").check();

	// Back to the bottom of the stack: a narrow shell gives the leading slot to the
	// ← as soon as there is a page to leave, so the ☰ is only there at the root.
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/panels$/);

	// On a narrow shell the nav is a full page over the content.
	await page.setViewportSize({ width: 480, height: 800 });
	const navPage = page.locator(".s-nav-page");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(navPage).toBeVisible();

	page.describe("Its button navigates nowhere, so it dismisses the nav itself (S.closeNav)");
	await navPage.getByRole("button", { name: "Note" }).click();
	await expect(navPage).toHaveCount(0);
	await expect(page).toHaveURL(/\/demo\/panels$/);

	page.describe("Its link is an ordinary link — a navigation sweeps the nav away by itself");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(navPage).toBeVisible();
	await navPage.getByRole("link", { name: "Scratch" }).click();
	await expect(page).toHaveURL(/\/demo\/buttons$/);
	await expect(navPage).toHaveCount(0);
});

// ─── Panel-declared chrome ───────────────────────────────────────────────────

test("chrome: a wide shell dresses each column, a narrow one promotes the top one", async ({ page }) => {
	// Two columns' worth of content area, so a third crowds the playground out.
	await page.setViewportSize({ width: 1100, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	page.describe("A lone actions-less page: the bar is all the app's, and no strip is drawn");
	await expect(page.locator(".s-panel-actions")).toHaveCount(0);
	// The bar is the app's — logo, brand-styled name, its own menu. The line
	// under the name is the tagline's here: the one open page is the Pages nav
	// item's own screen, which the sidebar is already showing highlighted, so a
	// crumb reading "Panels" would add nothing (see the tagline test below).
	await expect(page.locator("header .s-logo")).toBeVisible();
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator("header .s-subtitle")).toBeVisible();
	await expect(page.locator(".s-crumb")).toHaveCount(0);

	page.describe("Push a page with actions: its column gets a quiet strip — nothing more");
	// No title in the strip (that's the crumb's job) and no close (the crumbs again).
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	const stripA = topPanel(page).locator(".s-panel-actions");
	await expect(stripA).toHaveCount(1);
	await expect(stripA.getByRole("button", { name: "Share" })).toBeVisible();
	await expect(stripA).not.toContainText("Small A");
	// The bar hasn't budged; the stack has grown by one.
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A"]);

	page.describe("Push B: everything in a column is the page's own content; bold crumbs = visible columns");
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	await expect(topPanel(page).locator(".s-box header").first()).toContainText("Small B");
	// Three crumbs now, and the bold ones are exactly the panels on screen: the
	// crowded-out playground reads muted, A and B read bold.
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);
	await expect(page.locator(".s-crumb.s-crumb-on")).toHaveText(["Small A", "Small B"]);
});

test("chrome: a narrow shell puts the current panel's chrome in the bar", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./panels/b");
	await panelWith(page, /Small B is a/).waitFor();

	page.describe("One bar holds it all: ☰, the stack, and the screen's actions");
	await expect(page.locator(".s-panel-actions")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
	await expect(page.locator(".s-crumb.s-crumb-on")).toHaveText(["Small B"]);
	await expect(page.locator("header .s-menu").getByRole("button", { name: "Share" })).toBeVisible();
	// The app's name needn't stand aside for any of it — the crumbs already say
	// where you are — but the logo did, for the ☰.
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator("header .s-logo")).toHaveCount(0);

	page.describe("The page's top-level box goes full-bleed, as boxes do on a phone");
	const box = await topPanel(page).locator(".s-box").first().evaluate((el) => {
		const cs = getComputedStyle(el);
		const r = el.getBoundingClientRect();
		return { radius: cs.borderTopLeftRadius, flush: Math.round(r.left) === 0 };
	});
	expect(box).toEqual({ radius: "0px", flush: true });
});

test("chrome: an action link promoted into the bar still builds on its panel", async ({ page }) => {
	await page.goto("./thread/8");
	await panelWith(page, /A flat URL/).waitFor();
	// Narrow: the panel's actions move into the top bar, outside its own column
	// — but a link among them is still that panel's chrome, so it opens its
	// target on top of the panel, not as a fresh origin-less stack without it.
	await page.setViewportSize({ width: 480, height: 800 });
	await page.locator("header .s-menu").getByRole("button", { name: "Next thread" }).click();
	await expect(page).toHaveURL(/\/demo\/thread\/9$/);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Thread 8", "Thread 9"]);
});

test("chrome: a panel that sets no title lends its first line to the crumb", async ({ page }) => {
	await page.goto("./panels/untitled");
	await page.getByRole("heading", { name: "An untitled panel" }).waitFor();

	// The page never set `$panel.title`, so its crumb — and `document.title` —
	// borrowed the body's first line of text.
	await expect(page.locator(".s-crumb").last()).toHaveText("An untitled panel");
	await expect(page).toHaveTitle("An untitled panel · Staffa");

	// The page's own Done button closes it via $panel.close().
	await topPanel(page).getByRole("button", { name: "Done" }).click();
	await expect(page).toHaveURL(/\/demo\/panels$/);
});

test("chrome: crossing the threshold moves the chrome, not the body", async ({ page }) => {
	await page.setViewportSize({ width: 1100, height: 800 });
	await page.goto("./form");
	await page.getByText("Account").waitFor();
	// Wide: the brand, with the tagline under it — the sidebar is showing the
	// Form item highlighted, so the stack would only be repeating it.
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator("header .s-subtitle")).toBeVisible();

	page.describe("Half-fill the form, and mark its body node");
	const body = panelBody(page);
	await page.getByLabel("Bio").fill("half typed");
	await body.evaluate((el) => { el.dataset.probe = "same-node"; el.scrollTop = 120; });

	page.describe("Narrow the shell: the crumbs take the tagline's line, the body untouched");
	await page.setViewportSize({ width: 480, height: 800 });
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator(".s-crumb")).toHaveText(["Form"]);
	await expect(page.locator("header .s-subtitle")).toHaveCount(0);
	expect(await body.evaluate((el) => el.dataset.probe)).toBe("same-node");
	expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
	await expect(page.getByLabel("Bio")).toHaveValue("half typed");

	page.describe("Widen it again: the tagline returns, and the body never moved");
	await page.setViewportSize({ width: 1100, height: 800 });
	await expect(page.locator("header .s-subtitle")).toBeVisible();
	expect(await body.evaluate((el) => el.dataset.probe)).toBe("same-node");
	await expect(page.getByLabel("Bio")).toHaveValue("half typed");
});

test("chrome: the tagline holds the second line only while the stack adds nothing", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	page.describe("A lone nav-item screen: a crumb would repeat the sidebar, so the tagline has the line");
	await expect(page.locator(".s-nav-panel [aria-current=page]")).toHaveText("Panels");
	await expect(page.locator("header .s-subtitle")).toHaveText("components for Aberdeen");
	await expect(page.locator(".s-crumb")).toHaveCount(0);

	page.describe("Push a page: the stack has something to say, and takes the line");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A"]);
	await expect(page.locator("header .s-subtitle")).toHaveCount(0);

	page.describe("Go back: Small A closes with it, so the lone screen hands the line back");
	await page.locator(".s-crumb", { hasText: "Panels" }).click();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(".s-crumb")).toHaveCount(0);
	await expect(page.locator("header .s-subtitle")).toHaveText("components for Aberdeen");

	page.describe("A narrow shell keeps the stack even for a lone nav-item screen");
	// The nav is behind the ☰ there, so the crumb is the only thing naming the
	// screen.
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./form");
	await page.getByText("Account").waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Form"]);
	await expect(page.locator("header .s-subtitle")).toHaveCount(0);
});

test("chrome: a submenu leaf's screen still yields the line to the tagline", async ({ page }) => {
	await page.goto("./surfaces");
	await page.getByText("Surfaces & Variants").waitFor();
	// One panel open and the sidebar highlighting it — inside its unfolded
	// branch — so a crumb would only repeat it: the tagline keeps the line,
	// exactly as it does for a top-level nav item's screen.
	await expect(page.locator(".s-nav-panel [aria-current=page]")).toHaveText("Surfaces");
	await expect(page.locator("header .s-subtitle")).toHaveText("components for Aberdeen");
	await expect(page.locator(".s-crumb")).toHaveCount(0);
});

// A floating menu/popover fades in via a `.hidden` → opaque transition. Playwright's
// visibility (and ShoTest's waitFor) ignores opacity, so a page that is technically
// "visible" can still be mid-fade — present in some screenshots and faded/absent in
// others. Wait for it to fully settle before the next screenshot. (waitForFunction
// isn't wrapped by ShoTest, so this adds no screenshot of its own.)
function settleMenu(page: Page) {
	return page.waitForFunction(() => {
		// A closed popover lingers in the DOM (`.hidden`, inert) for ~2s before
		// Aberdeen removes it, so look for the one that is actually showing.
		const menus = [...document.querySelectorAll(".s-menu-list")];
		return menus.some((m) => !m.classList.contains("hidden") && getComputedStyle(m).opacity === "1");
	});
}


// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

test("crumbs: going back keeps a pinned panel, parked past the one you land on", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);

	page.describe("Pin Small A, then click the first crumb: B closes, and the pinned A parks");
	await page.locator(".s-crumb", { hasText: "Small A" }).click({ button: "right" });
	await page.getByRole("button", { name: "Pin", exact: true }).click();
	await page.locator(".s-crumb", { hasText: "Panels" }).click();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A"]);
	await expect(page.locator(".s-panel-parked")).toHaveCount(1);

	page.describe("Its crumb brings it back");
	await page.locator(".s-crumb", { hasText: "Small A" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a$/);
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(".s-panel-parked")).toHaveCount(0);
});

test("crumbs: right-click offers Close, which splices one panel out", async ({ page }) => {
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();

	page.describe("Close the middle panel from its crumb's menu: a splice, the URL unmoved");
	await page.locator(".s-crumb", { hasText: "Small A" }).click({ button: "right" });
	// The menu stands on a link, so the browser's own entries lead it.
	await expect(page.locator(".s-menu-list").getByRole("button", { name: "Open in new tab" })).toBeVisible();
	await page.locator(".s-menu-list").getByRole("button", { name: "Close" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/b$/);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small B"]);
	await expect(page.locator(visiblePanels)).toHaveCount(2);
});

test("crumbs: the app's name and logo lead home", async ({ page }) => {
	// The demo's `home` is /demo/form. With the form open and a page pushed on
	// top of it, home is already in the stack — so the logo goes back to it,
	// closing the page that was stacked on top.
	await page.goto("./form/guard");
	await page.getByText("Type something below").waitFor();
	page.describe("Home is already in the stack, so the logo goes back to it");
	await page.getByRole("link", { name: "Home" }).click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
	// A lone nav-item screen again, so the tagline has the bar's second line.
	await expect(page.locator("header .s-subtitle")).toBeVisible();

	page.describe("From a stack without home, the app's name opens it like a nav item would");
	await page.goto("./icons/heart");
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Icons", "heart"]);
	await page.locator("header .s-title").click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
	// A lone nav-item screen, so the line under the name is the tagline's again.
	await expect(page.locator(".s-crumb")).toHaveCount(0);
	await expect(page.locator("header .s-subtitle")).toBeVisible();
});
