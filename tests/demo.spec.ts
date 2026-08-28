import { test, expect, screenshot, suppressScreenshots, type Page } from "shotest";

// Click-through of every page of the Staffa demo. ShoTest screenshots each
// wrapped action, so these double as a visual baseline for the whole library.
// Each test walks one continuous session, so behaviours that share a starting
// state are proved in one pass rather than one page load each.

// ─── Shared helpers ──────────────────────────────────────────────────────────

// A page that's on its way out lingers in the DOM for the length of its exit
// animation, and one that's scrolled off-canvas to the left is marked `inert`.
const livePanels = ".s-panel:not(.s-panel-closing)";
const visiblePanels = ".s-panel:not(.s-panel-closing):not([inert])";

/** The deepest page that isn't on its way out — where "the current screen" is. */
function topPanel(page: Page) {
	return page.locator(livePanels).last();
}

/** The leftmost open panel — the playground, in the tests that start there. */
function firstPanel(page: Page) {
	return page.locator(livePanels).first();
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

/** A row of the floating menu that is actually showing (a closed one lingers). */
function menuItem(page: Page, name: string) {
	return page.locator(".s-menu-list:not(.hidden)").getByRole("button", { name, exact: true });
}

/**
 * Drive the stack box's navigator inside `panel`: pick the target page, set
 * whether to navigate from that very panel (its own `open`) or through the
 * stack's methods (which build on the current panel), and fire one of the
 * three navigations. Aiming the three dropdowns is setup, so it takes no
 * screenshots; the Go click — where the behaviour happens — does.
 */
async function stackNav(panel: ReturnType<typeof topPanel>, name: string, how: "push" | "replace" | "open", fromHere = true) {
	const box = panel.locator(".s-box", { hasText: "The stack" });
	await suppressScreenshots(`Aim the navigator at ${name} — ${how}, ${fromHere ? "from this panel" : "via the stack"}`, async () => {
		await box.getByLabel("Navigation").selectOption(how);
		await box.getByLabel("Page").selectOption({ label: name });
		await box.getByLabel("Origin").selectOption(fromHere ? "here" : "stack");
	});
	await box.getByRole("button", { name: "Go" }).click();
}

/**
 * Pick `option` in the display-settings popover's `row` chooser. Routine setup
 * — the popover itself is screenshotted where it *is* the subject, in the pages
 * test — so this takes none.
 */
function chooseSetting(page: Page, row: string, option: string) {
	return suppressScreenshots(`Set ${row} to ${option} in the display settings`, async () => {
		await page.getByRole("button", { name: "Display settings" }).click();
		await settleMenu(page);
		await page.locator(".s-menu-list:not(.hidden) label", { hasText: row })
			.getByRole("button", { name: option, exact: true }).click();
		await page.keyboard.press("Escape");
	});
}

/**
 * A floating menu/popover fades in via a `.hidden` → opaque transition.
 * Playwright's visibility (and ShoTest's waitFor) ignores opacity, so a page
 * that is technically "visible" can still be mid-fade. (waitForFunction isn't
 * wrapped by ShoTest, so this adds no screenshot of its own.)
 */
function settleMenu(page: Page) {
	return page.waitForFunction(() => {
		// A closed popover lingers in the DOM (`.hidden`, inert) for ~2s before
		// Aberdeen removes it, so look for the one that is actually showing.
		const menus = [...document.querySelectorAll(".s-menu-list")];
		return menus.some((m) => !m.classList.contains("hidden") && getComputedStyle(m).opacity === "1");
	});
}

/**
 * Wait until the sidebar's current (`aria-current=page`) row sits fully inside
 * the sidebar's scrollport — i.e. the reveal scroll has landed.
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

// ─── Components ──────────────────────────────────────────────────────────────

test("form: fields, submission, and the chrome moving around it", async ({ page }) => {
	await page.goto("./form");
	await page.getByText("Account").waitFor();

	// Wide: the brand with the tagline under it — the sidebar already shows the
	// Form item highlighted, so the stack would only be repeating it.
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator("header .s-subtitle")).toBeVisible();

	page.describe("Fill out the account form");
	// Not exact: the required marker makes the label text "Name*".
	await page.getByLabel("Name").fill("Ada Lovelace");
	await page.getByLabel("Email").fill("ada@example.com");
	await page.getByLabel("Country").selectOption("Netherlands");

	page.describe("Autocomplete: Escape dismisses only the open list, then falls through to the nav");
	const language = page.getByLabel("Language");
	await language.fill("Type");
	await expect(page.getByRole("option", { name: "TypeScript" })).toBeVisible();
	// The first Escape is consumed by the open list — it closes, and focus stays
	// in the input instead of jumping to the nav. (waitForSelector: ShoTest's
	// wrapped expect can't assert on absent elements.)
	await page.keyboard.press("Escape");
	await page.waitForSelector("ul[role=listbox]", { state: "detached" });
	await expect(language).toBeFocused();
	// With no list left to dismiss, a second Escape falls through to the nav
	// jump, landing on the sidebar's current (active) item.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();

	page.describe("Type ahead again, and pick from the dropdown");
	await language.fill("Type");
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

	page.describe("Mark the column's body node and scroll it, then cross the narrow threshold");
	const body = panelBody(page);
	await body.evaluate((el) => { el.dataset.probe = "same-node"; el.scrollTop = 120; });
	await page.setViewportSize({ width: 480, height: 800 });
	// The nav is behind the ☰ now, so the crumb is the only thing naming the
	// screen and it takes the tagline's line — but the body is the same node, at
	// the same scroll, holding the same text.
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator(".s-crumb")).toHaveText(["Form"]);
	await expect(page.locator("header .s-subtitle")).toHaveCount(0);
	expect(await body.evaluate((el) => el.dataset.probe)).toBe("same-node");
	expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
	await expect(page.getByLabel("Bio")).toHaveValue("Wrote the first program.");

	page.describe("Widen it again: the tagline returns, and the body never moved");
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(page.locator("header .s-subtitle")).toBeVisible();
	expect(await body.evaluate((el) => el.dataset.probe)).toBe("same-node");
	await expect(page.getByLabel("Bio")).toHaveValue("Wrote the first program.");
});

test("pages: buttons, prose, icons and surfaces — then the same in the dark", async ({ page }) => {
	await page.goto("./buttons");
	await page.getByText("Variants & sizes").waitFor();
	// Hover the signature primary button so the lift/glow is captured.
	await page.getByRole("button", { name: "primary" }).first().hover();
	await page.getByRole("button", { name: "Month" }).click();

	page.describe("A button's key: shown in its tooltip, pressed from anywhere");
	await page.getByRole("button", { name: "Bookmark" }).scrollIntoViewIfNeeded();
	await page.getByRole("button", { name: "Send" }).hover();
	// An icon button's tip names it as well as its key; a labelled one just the key.
	await page.getByText("Send · Ctrl+Enter").waitFor();
	await page.mouse.move(0, 0);
	await page.waitForSelector(".s-tt-tip", { state: "detached" });

	page.describe("Arrowing down the nav says which row it lands on");
	await page.getByRole("link", { name: "Buttons" }).click();
	await page.keyboard.press("ArrowDown");
	await expect(page.locator(".s-nav-panel :focus")).toHaveText("Tabs");

	// A focused link keeps Enter, modified or not: that is the keyboard's own
	// open-in-a-new-tab. Neither the shell (which would have routed it) nor the
	// button's shortcut may take it — so nothing is published here.
	await page.keyboard.press("Control+Enter");

	page.describe("? is honest about it: the Send button's Ctrl+Enter is not listed while a link keeps it");
	await page.keyboard.press("Shift+Slash");
	const help = page.locator(".s-dialog", { hasText: "Keyboard shortcuts" });
	await expect(help.locator(".s-keyhelp > div", { hasText: "Bookmark" })).toBeVisible();
	expect(await help.locator(".s-keyhelp > div", { hasText: "Send" }).count()).toBe(0);
	await page.keyboard.press("Shift+Slash");
	await page.waitForSelector(".s-keyhelp", { state: "detached" });

	page.describe("From the text field, though, Ctrl+Enter is the button's");
	await page.getByPlaceholder(/Say something/).fill("Ship it");
	await page.keyboard.press("Control+Enter");
	await page.getByText("Sent: Ship it").waitFor();
	// Modified keys reach a shortcut from inside a field too.
	await page.keyboard.press("Control+b");
	await page.getByText("Bookmarked!").waitFor();
	// One toast per press: the Ctrl+Enter the nav row kept sent nothing.
	await expect(page.locator(".s-toast")).toHaveCount(2);

	page.describe("? lists what's bound — but from a field it is just typing");
	const field = page.getByPlaceholder(/Say something/);
	await field.press("Shift+Slash");
	await expect(field).toHaveValue(/\?$/);
	expect(await page.locator(".s-dialog").count()).toBe(0);

	page.describe("mod+? reaches the overview even from inside the field");
	await field.press("Control+Shift+Slash");
	// Buttons list under their label, a hand-bound key under its description.
	await expect(help.locator(".s-keyhelp > div", { hasText: "Bookmark" }).locator("kbd")).toHaveText("Ctrl+B");
	await expect(help.locator(".s-keyhelp > div", { hasText: "accent colour" }).locator("kbd")).toHaveText("Ctrl+.");
	// The shell's Escape shows too, described as what it would do right now.
	await expect(help.locator(".s-keyhelp > div", { hasText: "navigation" }).locator("kbd")).toHaveText("Esc");

	page.describe("The same combination again toggles it closed");
	await field.press("Control+Shift+Slash");
	await page.waitForSelector(".s-keyhelp", { state: "detached" });

	page.describe("Prose rhythm and heading scale");
	await page.goto("./content");
	await page.getByText("Prose & flow content").waitFor();
	await page.getByText("Heading scale").scrollIntoViewIfNeeded();

	page.describe("The icon gallery, and its filter");
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();
	await page.getByLabel(/Filter all/).fill("arrow");
	await page.getByText(/\d+ matches/).waitFor();

	page.describe("Surfaces: levels, roles, variants and nesting");
	await page.goto("./surfaces");
	await page.getByText("Accent surfaces & variants").waitFor();
	// A submenu leaf's screen, alone in the stack and highlighted inside its
	// unfolded branch: a crumb would only repeat it, so the tagline keeps the
	// bar's second line — exactly as a top-level nav item's screen does.
	await expect(page.locator(".s-nav-panel [aria-current=page]")).toHaveText("Surfaces");
	await expect(page.locator("header .s-subtitle")).toHaveText("components for Aberdeen");
	await expect(page.locator(".s-crumb")).toHaveCount(0);
	await page.getByText("Custom accent surface").scrollIntoViewIfNeeded();

	page.describe("The display settings live behind the header's configure button");
	await page.getByRole("button", { name: "Display settings" }).click();
	await page.getByText("Navigation").waitFor();
	await page.getByText("Primary colour").waitFor();
	await page.getByText("Theme").waitFor();
	await settleMenu(page);
	// The popover holds custom content, not menu items; opening it should still
	// move focus to the first focusable control inside.
	await expect(page.locator(".s-menu-list :focus")).toHaveCount(1);

	page.describe("A pick inside the popover drives the live theme");
	await page.getByRole("button", { name: "dark" }).click();
	await page.keyboard.press("Escape");

	// Sidebar links rather than goto: the theme is transient, so a reload loses it.
	page.describe("Walk on through the pages in the dark");
	await page.getByRole("link", { name: "Buttons" }).click();
	await page.getByText("Variants & sizes").waitFor();
	await page.getByRole("link", { name: "Form" }).click();
	await page.getByText("Account").waitFor();
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

test("overlays: toasts, tooltips, menus, dialogs and an inline menu tree", async ({ page }) => {
	await page.goto("./overlays");
	await page.getByText("Toast notifications").waitFor();

	page.describe("Fire two toasts; they stack at the bottom");
	await page.getByRole("button", { name: "Success" }).click();
	await page.getByText("Your changes have been saved.").waitFor();
	await page.getByRole("button", { name: "Danger" }).click();
	await page.getByText("Something went wrong.").waitFor();

	// Dismissed by hand once shown: their 6 s auto-expiry is wall-clock, so a
	// toast left to expire straddles later captures — present in some runs,
	// gone in others, depending on machine speed.
	page.describe("Each × dismisses its toast");
	await page.locator(".s-toast", { hasText: "saved" }).getByRole("button", { name: "Dismiss" }).click();
	await page.locator(".s-toast", { hasText: "wrong" }).getByRole("button", { name: "Dismiss" }).click();
	await expect(page.locator(".s-toast")).toHaveCount(0);

	page.describe("Show a tooltip on hover");
	await page.getByRole("button", { name: "Rich tip" }).hover();
	await page.getByText("in tips").waitFor();
	// Move off and let the tooltip fully disappear before moving on: its hide is a
	// 100 ms wall-clock timer, so otherwise it can still be lingering in the menu
	// screenshots below (notably under load).
	await page.mouse.move(0, 0);
	await page.waitForSelector(".s-tt-tip", { state: "detached" });

	page.describe("A nav row's tooltip tells its key too, under its own tip");
	await page.locator(".s-nav-panel").getByRole("link", { name: "Overlays" }).hover();
	const navTip = page.locator(".s-tt-tip");
	await expect(navTip).toContainText("Toasts, tooltips, menus and dialogs");
	// The key a dropdown row would print beside its label, behind a hairline...
	await expect(navTip.locator("kbd")).toHaveText("Ctrl+K");
	await expect(navTip.locator("hr")).toHaveCount(1);
	// ...leaving the resting row clean.
	expect(await page.locator(".s-nav-panel .s-menu-key").count()).toBe(0);
	await page.mouse.move(0, 0);
	await page.waitForSelector(".s-tt-tip", { state: "detached" });

	page.describe("Open the Actions menu, pick an item");
	await page.getByRole("button", { name: "Actions" }).click();
	// The hint is `aria-hidden`, so the row is still named by its label alone.
	await expect(menuItem(page, "Edit").locator(".s-menu-key")).toHaveText("Ctrl+E");
	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByText("Edit clicked").waitFor();

	page.describe("The same rows answer their keys with the menu shut");
	await page.keyboard.press("Control+d");
	await page.getByText("Duplicated").waitFor();
	await page.keyboard.press("Control+Shift+A");
	await page.getByText("Archived").waitFor();

	page.describe("So does a context menu's, without the right-click that shows it");
	await page.keyboard.press("F2");
	await page.getByText("Renaming…").waitFor();

	page.describe("Right-click the box for its context menu");
	await page.getByText("Right-click (or long-press)").click({ button: "right" });
	await page.getByRole("button", { name: "Copy", exact: true }).click();
	await page.getByText("Copied!").waitFor();

	// The toasts fired above auto-dismiss on a wall clock (6 s), so by the time the
	// dialog steps below run they're mid-expiry — present in some screenshots and
	// gone in others depending on machine speed. Reload to a clean slate so the
	// dialog screenshots are deterministic. (A reload takes no screenshot itself.)
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

	page.describe("Stack a dialog inside a dialog; Escape peels them inside-out");
	await page.getByRole("button", { name: "dialog in dialog" }).click();
	await page.getByText("This is the primary dialog.").waitFor();
	// The modal silences the page's shortcuts: the menu's Ctrl+D raises no toast.
	await page.keyboard.press("Control+d");
	expect(await page.locator(".s-toast").count()).toBe(0);

	page.describe("? over a modal lists only what works right now");
	await page.keyboard.press("Shift+Slash");
	// The dialog's own Esc and button, innermost first, then the global overview
	// key — the page's silenced shortcuts don't show.
	await expect(page.locator(".s-keyhelp > div")).toHaveText([/Close this dialog/, /Open secondary/, /This overview/]);

	page.describe("A key pressed on the open overview closes it and still lands");
	await page.keyboard.press("Control+o");
	await page.waitForSelector(".s-keyhelp", { state: "detached" });
	await page.getByText("Smaller than primary.").waitFor();
	// Escape dismisses only the top-most dialog; the primary one stays up.
	await page.keyboard.press("Escape");
	await page.waitForSelector('text="Smaller than primary."', { state: "detached" });
	await expect(page.locator(".s-dialog", { hasText: "Primary dialog" })).toBeVisible();
	// A second Escape dismisses the primary dialog too.
	await page.keyboard.press("Escape");
	await page.waitForSelector('text="Primary dialog"', { state: "detached" });

	page.describe("The inline menu's branches stay folded until something under them is current");
	const tree = page.locator(".s-menu-inline");
	// Branches are native <details>; their rows stay mounted but hidden while
	// folded, so no branch content shows before anything under it is current.
	await expect(tree.getByRole("link", { name: "Apple" })).toBeHidden();

	page.describe("Lemon's key picks it from two folds down, unfolding the branches above it");
	await page.keyboard.press("l");
	await expect(page).toHaveURL(/pick=lemon/);
	await expect(tree.getByRole("link", { name: "Lemon" })).toHaveAttribute("aria-current", "page");

	page.describe("Click the Fruit branch: it selects its first leaf, which unfolds it");
	await tree.locator("summary", { hasText: "Fruit" }).click();
	await expect(page).toHaveURL(/pick=apple/);
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: apple");
	await expect(tree.getByRole("link", { name: "Apple" })).toHaveAttribute("aria-current", "page");

	page.describe("Pick under Vegetables: the Fruit branch folds back up");
	await tree.locator("summary", { hasText: "Vegetables" }).click();
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: carrot");
	await expect(tree.getByRole("link", { name: "Apple" })).toBeHidden();
	await expect(tree.getByRole("link", { name: "Carrot" })).toHaveAttribute("aria-current", "page");

	page.describe("Unfold Fruit again, then nested Citrus: both levels stay unfolded");
	await tree.locator("summary", { hasText: "Fruit" }).click();
	await tree.locator("summary", { hasText: "Citrus" }).click();
	await expect(page.locator(".s-menu-picked")).toHaveText("Picked: lemon");
	await expect(tree.getByRole("link", { name: "Lime" })).toBeVisible();
	await expect(tree.getByRole("link", { name: "Banana" })).toBeVisible();

	page.describe("An inline row's key is told in a tooltip, not beside its label");
	await tree.getByRole("link", { name: "Lemon" }).hover();
	await expect(page.locator(".s-tt-tip")).toHaveText("L");
	await page.mouse.move(0, 0);
	await page.waitForSelector(".s-tt-tip", { state: "detached" });

	page.describe("Pin the Overlays page, so navigating elsewhere parks it — alive");
	// Narrow, so the lone open page still writes a crumb (to right-click below).
	await page.setViewportSize({ width: 480, height: 800 });
	await page.locator(".s-crumb", { hasText: "Overlays" }).click({ button: "right" });
	await menuItem(page, "Pin").click();

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

// ─── Navigation ──────────────────────────────────────────────────────────────

test("nav: a narrow shell's full-page nav opens, hands over and remembers its folds", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./content");
	await page.getByText("Prose & flow content").waitFor();

	// `:not(...-off)`: a dismissed nav page lingers in the DOM (hidden) for a
	// couple of seconds before Aberdeen removes it — target the live one.
	const openNav = page.locator(".s-nav-page:not(.s-nav-page-off)");

	page.describe("Escape opens the nav as a full page, the current item focused in its unfolded branch");
	await page.keyboard.press("Escape");
	await expect(openNav).toHaveCount(1);
	await expect(openNav.getByRole("link", { name: "Content" })).toBeFocused();
	await expect(openNav.getByRole("link", { name: "Content" })).toHaveAttribute("aria-current", "page");

	page.describe("Escape again closes it, handing focus back to the ☰");
	await page.keyboard.press("Escape");
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();

	page.describe("And a third reopens it, ignoring the page still sliding out");
	await page.keyboard.press("Escape");
	await expect(openNav).toHaveCount(1);

	page.describe("Pick an item: the nav hands over to that screen");
	await openNav.getByRole("link", { name: "Overlays" }).click();
	await page.getByText("Toast notifications").waitFor();
	await expect(openNav).toHaveCount(0);

	page.describe("Reopen, and dismiss with the ✕: the content stays as it was");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(openNav).toHaveCount(1);
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(openNav).toHaveCount(0);
	await page.getByText("Toast notifications").waitFor();

	page.describe("Wander off the menu's map: this page has no row (and no match) anywhere");
	await page.goto("./content");
	await page.getByText("Prose & flow content").waitFor();
	await page.getByRole("link", { name: "edge-to-edge list" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/rows$/);

	page.describe("Reopen the nav: the menu mounts afresh, but the folds are remembered");
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(openNav.getByRole("link", { name: "Content" })).toBeVisible();
	await expect(openNav.getByRole("link", { name: "Surfaces" })).toBeVisible();

	page.describe("Enter on an item navigates *and* closes the page, returning focus to the trigger");
	await openNav.getByRole("link", { name: "Buttons" }).focus();
	await page.keyboard.press("Enter");
	await page.getByText("Variants & sizes").waitFor();
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
});

test("nav: the sidebar claims deep links, scrolls to them, and leads home", async ({ page }) => {
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
	// explicit `role=button` overrides the implicit link role.
	page.describe("Navigate there from the page's own content; the sidebar scrolls the row into view");
	await page.getByRole("button", { name: "Open the Panels demo" }).click();
	await page.getByText("Push a panel").waitFor();
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

	page.describe("An icon detail has no row of its own; the gallery's `match` claims it");
	// On a cold deep link, which no amount of fold-state keeping could cover.
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("./icons/heart");
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Icons", "heart"]);
	await expect(nav.getByRole("link", { name: "Icons" })).toHaveAttribute("aria-current", "page");

	page.describe("From a stack without home, the app's name opens it like a nav item would");
	await page.locator("header .s-title").click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
	// A lone nav-item screen, so the line under the name is the tagline's again.
	await expect(page.locator(".s-crumb")).toHaveCount(0);
	await expect(page.locator("header .s-subtitle")).toBeVisible();

	page.describe("With home already in the stack, the logo goes back to it, closing what sat on top");
	await page.goto("./form/guard");
	await page.getByText("Type something below").waitFor();
	await page.getByRole("link", { name: "Home" }).click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
	await expect(page.locator("header .s-subtitle")).toBeVisible();
});

// ─── Routed stack ────────────────────────────────────────────────────────────

test("panels: columns tile the area, centre in it, and crowd one another out", async ({ page }) => {
	// 1280 window − 200 sidebar = 1080 of content area, which divides into two
	// columns of 540 — the fewest that keeps each one within the 540 cap.
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
	// Uncapped, the shell *is* the window: the sidebar takes its `navWidth` and
	// the content area the rest. Neither depends on what's open, which is the
	// whole point — the chrome never moves while columns come and go.
	const shell = async () => {
		const nav = (await page.locator(".s-nav-panel").boundingBox())!;
		const sep = (await page.locator(".s-nav-sep").boundingBox())!;
		const area = (await page.locator(".s-panels").boundingBox())!;
		const bar = (await page.locator("header .s-bar").boundingBox())!;
		return { nav: nav.width + sep.width, area: area.width, bar: bar.width, navX: Math.round(nav.x) };
	};

	page.describe("A lone actions-less page: the bar is all the app's, and no strip is drawn");
	await expect(page.locator(".s-panel-actions")).toHaveCount(0);
	await expect(page.locator("header .s-logo")).toBeVisible();
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	// The line under the name is the tagline's: the one open page is the Panels
	// nav item's own screen, which the sidebar is already showing highlighted,
	// so a crumb reading "Panels" would add nothing.
	await expect(page.locator(".s-nav-panel [aria-current=page]")).toHaveText("Panels");
	await expect(page.locator("header .s-subtitle")).toHaveText("components for Aberdeen");
	await expect(page.locator(".s-crumb")).toHaveCount(0);
	// The medium playground: two columns, which here is the whole area.
	await expect.poll(run).toEqual({ gaps: [0, 0], widths: [1080] });

	page.describe("Push a page with actions: its column gets a quiet strip, and the stack takes the bar's line");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	const stripA = topPanel(page).locator(".s-panel-actions");
	await expect(stripA).toHaveCount(1);
	await expect(stripA.getByRole("button", { name: "Share" })).toBeVisible();
	// No title in the strip (that's the crumb's job) and no close (the crumbs again).
	await expect(stripA).not.toContainText("Small A");
	// The bar hasn't budged; the stack has grown by one, and taken the tagline's line.
	await expect(page.locator("header .s-title")).toHaveText("Staffa");
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A"]);
	await expect(page.locator("header .s-subtitle")).toHaveCount(0);
	// The medium playground can't fit beside it, so the small centres alone.
	await expect.poll(run).toEqual({ gaps: [270, 270], widths: [540] });

	page.describe("Push B: the two smalls pair up and tile the area exactly");
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	await expect.poll(run).toEqual({ gaps: [0, 0], widths: [540, 540] });
	// Everything in a column is the page's own content, and the bold crumbs are
	// exactly the panels on screen: the crowded-out playground reads muted.
	await expect(topPanel(page).locator(".s-box header").first()).toContainText("Small B");
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);
	await expect(page.locator(".s-crumb.s-crumb-on")).toHaveText(["Small A", "Small B"]);
	// `shell.panels` holds the live Panel objects and `shell.currentPanelIndex`
	// the cursor into them, so the box reading them redraws as the stack grows.
	const stackList = page.getByTestId("stack-list").first();
	await expect(stackList.locator("li")).toHaveText([
		"/demo/panels", "/demo/panels/a", "/demo/panels/b ← current",
	]);

	page.describe("Widen the window: the sidebar, its hairline and the content area tile it exactly");
	await page.setViewportSize({ width: 1600, height: 900 });
	expect(await shell()).toEqual({ nav: 200, area: 1400, bar: 1600, navX: 0 });

	page.describe("Two quick Escapes peel two columns — and not one of those figures moves");
	// Back to back, with no time for the first to land: closing travels through
	// the browser's history, and the second Escape must aim at the stack the
	// first one is heading for rather than the one still on screen.
	// (page.evaluate isn't wrapped by ShoTest, so this adds no screenshot.)
	await page.evaluate(() => {
		const escape = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		escape();
		escape();
	});
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
	await expect(stackList.locator("li")).toHaveText(["/demo/panels ← current"]);
	// A lone nav-item screen again, so the tagline gets its line back.
	await expect(page.locator(".s-crumb")).toHaveCount(0);
	await expect(page.locator("header .s-subtitle")).toHaveText("components for Aberdeen");
	expect(await shell()).toEqual({ nav: 200, area: 1400, bar: 1600, navX: 0 });

	page.describe("A large page takes three columns; the bars are the shell's, as ever");
	await page.goto("./panels/large");
	await page.getByText("three of the shell").waitFor();
	// 1600 window − 200 sidebar = 1400 of content area: three columns of 466⅔.
	expect((await page.locator(".s-panels").boundingBox())!.width).toBeCloseTo(1400, 0);
	expect((await topPanel(page).boundingBox())!.width).toBeCloseTo(1400, 0);
	expect((await page.locator("header .s-bar").boundingBox())!.width).toBeCloseTo(1600, 0);
	expect((await page.locator("footer .s-bar").boundingBox())!.width).toBeCloseTo(1600, 0);
	await screenshot(page, "large-panel-fills-area");

	page.describe("Crumbs, with room to spare: every title shows in full, however long");
	// Three long-titled pages; the cold link derives all four columns (the
	// playground beneath them) from the path.
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("./panels/long/detail/deeper");
	await page.getByText("Back to the playground").waitFor();
	const crumbs = page.locator(".s-crumb");
	const widths = () => crumbs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
	const clipped = () =>
		crumbs.evaluateAll((els) => els.map((el) => el.scrollWidth > Math.ceil(el.getBoundingClientRect().width)));
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

test("panels: the three navigations, pinning, and the crumb menu", async ({ page }) => {
	// A three-column area (1820 − 200 sidebar = 1620 = 3 × 540), so the medium
	// playground keeps its navigator on screen beside one small page.
	await page.setViewportSize({ width: 1820, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();

	page.describe("A push from the playground opens Small A on top of it");
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
	// Back to [Panels, Small A] first.
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	// stack.pushPanel builds on the *current* panel — Small A — so Small B lands
	// on top of it: three crumbs, nothing closed. That difference is why a
	// list's click handler wants the panel's own `open` instead.
	await stackNav(firstPanel(page), "Small B", "push", false);
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);

	page.describe("Right-click Small A's crumb: a real link, so the browser's own entries lead the menu");
	await page.locator(".s-crumb", { hasText: "Small A" }).click({ button: "right" });
	await expect(menuItem(page, "Open in new tab")).toBeVisible();
	await menuItem(page, "Pin").click();
	await expect(page.locator(".s-crumb-pin")).toHaveCount(1);

	page.describe("Click the first crumb: B closes, and the pinned A parks past the page you land on");
	await page.locator(".s-crumb", { hasText: "Panels" }).click();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A"]);
	await expect(page.locator(".s-panel-parked")).toHaveCount(1);

	page.describe("Its crumb brings it back");
	await page.locator(".s-crumb", { hasText: "Small A" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a$/);
	await expect(page.locator(".s-panel-parked")).toHaveCount(0);

	page.describe("Open a page elsewhere: the pinned panel rides along beneath it");
	await stackNav(firstPanel(page), "Medium", "push");
	await expect(page).toHaveURL(/\/demo\/panels\/medium$/);
	await page.getByText("two of the shell").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Medium"]);
	await expect(page.locator(".s-crumb-pin")).toHaveCount(1);

	page.describe("A reload restores the whole arrangement, pin and all");
	await page.reload();
	await page.getByText("two of the shell").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);
	await expect(page.locator(".s-crumb-pin")).toHaveCount(1);

	page.describe("An explicit Close from the crumb menu still takes the pinned page out — a splice");
	await page.locator(".s-crumb", { hasText: "Small A" }).click({ button: "right" });
	await menuItem(page, "Close").click();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Medium"]);
	await expect(page.locator(".s-crumb-pin")).toHaveCount(0);
	// The current panel didn't move, so neither did the URL.
	await expect(page).toHaveURL(/\/demo\/panels\/medium$/);
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("A push to the already-open playground goes back to it; the medium page closes");
	await stackNav(panelWith(page, /two of the shell/), "Playground", "push");
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);
	// The playground is the current page again, so its title takes over.
	await expect(page).toHaveTitle("Panels · Staffa");

	page.describe("Browser back and forward replay the arrangements");
	await page.goBack();
	await expect(page).toHaveURL(/\/demo\/panels\/medium$/);
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page).toHaveTitle("Medium · Staffa");
	await page.goForward();
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await expect(page.locator(livePanels)).toHaveCount(1);
});

test("panels: closing splices a column out, reveals what it hid, and recycles what reopens", async ({ page }) => {
	// At 1820 the area is 1620: the medium playground (1080) plus one small (540)
	// fill it exactly, so a third column crowds one out.
	await page.setViewportSize({ width: 1820, height: 900 });
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
	await panelWith(page, /Small A is a/).getByRole("button", { name: "Delete" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/b$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	// (A plain count: ShoTest's wrapped expect can't assert on absent elements.)
	expect(await page.locator(livePanels, { hasText: /Small A is a/ }).count()).toBe(0);
	// Dismiss the "Deleted" toast: left to its 6 s wall-clock expiry it straddles
	// later captures, present in some runs and gone in others.
	await page.locator(".s-toast").getByRole("button", { name: "Dismiss" }).click();
	await expect(page.locator(".s-toast")).toHaveCount(0);

	page.describe("The splice is a history entry, so browser back undoes it");
	await page.goBack();
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(3);

	page.describe("Closing the *top* column frees the room the crowded-out one needs");
	// By name, not `topPanel`: a column the back button restored lands last in
	// the DOM rather than in stack order.
	await panelWith(page, /Small B is a/).getByRole("button", { name: "Delete" }).click();
	await expect(page).toHaveURL(/\/demo\/panels\/a$/);
	await page.getByText("Push a panel").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	await page.locator(".s-toast").getByRole("button", { name: "Dismiss" }).click();
	await expect(page.locator(".s-toast")).toHaveCount(0);

	page.describe("Widen past all three columns, so the playground's navigator stays usable");
	await page.setViewportSize({ width: 1920, height: 900 });
	await stackNav(topPanel(page), "Small B", "push");
	await panelWith(page, /Small B is a/).waitFor();
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Small A", "Small B"]);
	// Mark Small B's element, to prove the panel moves rather than being rebuilt.
	await panelWith(page, /Small B is a/).evaluate((el) => { (el as HTMLElement).dataset.probe = "kept"; });

	page.describe("Replace from the playground, aiming at the already-open Small B");
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

	page.describe("A closing page is torn down at once; only its element lingers, fading");
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Sizing & lifecycle", "push");
	await panelWith(page, /is sized before its draw/).waitFor();
	// The page's `A.clean` hooks run when it closes, while its own element is
	// still on screen playing the fade — not when the animation is over.
	await page.keyboard.press("Escape");
	await expect(page.getByText("torn down while still fading out")).toBeVisible();

	page.describe("A page that sets no title lends its first line to the crumb, and closes itself");
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

test("panels: an unsaved page parks rather than closing, by any route", async ({ page }) => {
	await page.goto("./form/guard");
	await page.getByText("Type something below").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("Dirty the draft: a ● appears on the crumb and in the tab title");
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
	await expect(menuItem(page, "Close")).toHaveAttribute("aria-disabled", "true");
	await page.keyboard.press("Escape"); // dismiss the menu

	page.describe("Closing the tab runs into the browser's are-you-sure");
	const dialog = page.waitForEvent("dialog");
	void page.close({ runBeforeUnload: true });
	expect((await dialog).type()).toBe("beforeunload");
	await (await dialog).dismiss();

	page.describe("Staying brings the page that held the tab back on screen; Save lets it close");
	await expect(page).toHaveURL(/\/demo\/form\/guard$/);
	await expect(page.getByLabel("Draft")).toHaveValue("precious");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page).toHaveURL(/\/demo\/form$/);
	await expect(page.locator(livePanels)).toHaveCount(1);

	page.describe("Pushed onto the playground, the browser's back button parks it too");
	// The unsaved page is *pushed*, so there is a history entry beneath it —
	// from before the page existed — for the browser's back button to head for.
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await stackNav(firstPanel(page), "Unsaved changes", "push");
	await page.getByLabel("Draft").fill("precious");
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

	page.describe("An origin-less link replaces the whole stack — only the unsaved page rides along");
	// A link outside any page derives its target's whole stack. The derived one
	// shares nothing with what was open: the (saved) pages close with the rest,
	// while the unsaved page can't be closed by anything, and parks.
	// (page.evaluate isn't wrapped by ShoTest, so this adds no screenshot.)
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

test("panels: a page is sized before it draws, and the shell resizes around it", async ({ page }) => {
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

	page.describe("The page knew its real width while it drew, and has not been drawn a second time");
	const column = topPanel(page);
	const full = (await column.boundingBox())!;
	expect(Math.abs(Number(await page.getByTestId("page-width").textContent()) - full.width)).toBeLessThan(1.5);

	page.describe("Asking for a small column reflows it in place — never redrawn");
	// The playground beside it no longer has to give way, so it slides back in.
	await column.getByRole("button", { name: "small" }).click();
	await expect(page.locator(visiblePanels)).toHaveCount(2);
	const narrowed = (await column.boundingBox())!.width;
	expect(narrowed).toBeLessThan(full.width * 0.7);
	await expect(page.getByTestId("live-draws")).toHaveText("1");
	expect(Math.abs(Number(await page.getByTestId("page-width").textContent()) - narrowed)).toBeLessThan(1.5);

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
	// The columns reflow in place too: 880 of area is two columns of 440, and
	// the small page took its new one without being drawn a second time.
	await expect(page.getByTestId("page-width")).toHaveText("440");
	await expect(page.getByTestId("live-draws")).toHaveText("1");
	await page.keyboard.press("Escape"); // dismiss the popover

	page.describe("A nav item arriving redraws the sidebar, not the columns");
	// The shell's item list is a proxy array; adding to (or removing from) it
	// must not resubscribe — and so rebuild — the shell around the open columns.
	await page.getByLabel("Add a Scratch nav item").check();
	await expect(page.locator(".s-nav-panel").getByRole("link", { name: "Scratch" })).toBeVisible();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.getByTestId("live-draws")).toHaveText("1");
	await page.getByLabel("Add a Scratch nav item").uncheck();
	await expect(page.locator(".s-nav-panel").getByRole("link", { name: "Scratch" })).toHaveCount(0);
	await expect(page.getByTestId("live-draws")).toHaveText("1");

	page.describe("Put the Scratch row back: a custom slot the shell can't see into");
	await page.getByLabel("Add a Scratch nav item").check();
	// Back to the bottom of the stack, on a narrow shell where the nav is a full
	// page over the content.
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/panels$/);
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

test("panels: deep links derive their columns, and the link default governs bare links", async ({ page }) => {
	// The medium gallery and the small detail need a three-column area (1820 −
	// 200 sidebar = 1620 = 3 × 540) to pair up as two columns.
	// /demo/icons matches a route, so it becomes the page beneath
	// /demo/icons/heart (while /demo, which has no route, is skipped).
	await page.setViewportSize({ width: 1820, height: 900 });
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

	page.describe("The Next pager (data-panel=replace) swaps the detail in place");
	// The pager is the detail's `actions`, which on a wide shell the shell draws
	// in that column's own chrome. (Scoped to the current page: the one being
	// replaced lingers while it fades. The pagers are `S.button({ href })`s.)
	await topPanel(page).getByRole("button", { name: "Next" }).click();
	await page.getByText("import { bookmark }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("A reload reproduces both columns from the history entry");
	await page.reload();
	await page.getByText("Gallery").waitFor();
	await page.getByText("import { bookmark }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("linkNavigation=replace: a bare link swaps the panel it sits in for its target");
	// The icons gallery is full of bare links (no `data-panel`), which is exactly
	// what the setting governs. The chooser lives in the header's display-settings
	// popover, so it can be reached from any page — the panel a bare link then
	// swaps out included.
	await chooseSetting(page, "Links", "replace");
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/heart$/);
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(1);

	page.describe("linkNavigation=open: a bare link behaves like a nav item, deriving a fresh stack");
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();
	await chooseSetting(page, "Links", "open");
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await page.getByText("import { heart }").waitFor();
	// The gallery survived (the derived stack holds it); a second bare link from
	// it derives afresh, so the heart detail closes rather than stacking.
	await page.getByRole("link", { name: "star", exact: true }).click();
	await page.getByText("import { star }").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(".s-crumb")).toHaveText(["Icons", "star"]);

	page.describe("columns=single shows only the current page, however much room there is");
	await page.goto("./panels");
	await page.getByText("Push a panel").waitFor();
	await chooseSetting(page, "Columns", "single");
	await stackNav(firstPanel(page), "Small A", "push");
	await panelWith(page, /Small A is a/).waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(1);
	// Its "small" ask still holds — the ceiling is a promise, single mode or not.
	expect((await page.locator(visiblePanels).boundingBox())!.width).toBeCloseTo(540, 0);

	page.describe("Escape still pops the stack, at any width");
	await page.setViewportSize({ width: 480, height: 800 });
	await page.keyboard.press("Escape");
	await expect(page).toHaveURL(/\/demo\/panels$/);
	await page.getByText("Push a panel").waitFor();

	page.describe("An [id=integer] route hands the handler a real number, not a look-alike string");
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto("./panels/item/42");
	await page.getByText("params.id is number 42, so id + 1 is 43.").waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);

	page.describe("A data-panel=open link gives its target its own stack");
	// A plain link from the item would stack the thread on top of it, three
	// columns deep. `open` leaves the item behind instead and asks `ancestors`
	// what belongs under the thread — the playground — so this lands on exactly
	// the columns a cold link to /demo/thread/8 would open.
	await panelWith(page, /params.id is number 42/)
		.getByRole("link", { name: "Open a thread, on its own stack" }).click();
	await expect(page).toHaveURL(/\/demo\/thread\/8$/);
	await page.getByRole("heading", { name: "Thread 8" }).waitFor();
	await expect(page.locator(livePanels)).toHaveCount(2);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Thread 8"]);

	page.describe("\"007\" would be a second URL for the same record, so no route claims it at all");
	await page.goto("./panels/item/007");
	await page.getByText("There is no page at /demo/panels/item/007.").waitFor();

	page.describe("A cold flat URL gets the ancestors the app names for it");
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

test("panels: a phone shows one screen at a time, its chrome all in the bar", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./icons");
	await page.getByText("Gallery").waitFor();

	page.describe("Tap an icon: its detail pushes over the gallery, which stays mounted off-canvas");
	await page.getByRole("link", { name: "heart", exact: true }).click();
	await expect(page).toHaveURL(/\/demo\/icons\/heart$/);
	await page.getByText("import { heart }").waitFor();
	await expect(page.locator(visiblePanels)).toHaveCount(1);
	// The screen's declared title and actions both sit in the bar — no column
	// chrome — and going back is the crumbs' job: no back button, and the ☰
	// keeps its corner.
	await expect(page.locator(".s-panel-actions")).toHaveCount(0);
	await expect(page.locator(".s-crumb").last()).toHaveText("heart");
	await expect(page.locator("header").getByRole("button", { name: "Next" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();

	page.describe("A crumb goes back to the gallery");
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

	page.describe("Escape pops a page, and only then opens the nav");
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

	page.describe("One bar holds it all: ☰, the stack, and the screen's actions");
	await page.goto("./panels/b");
	await panelWith(page, /Small B is a/).waitFor();
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

	page.describe("An action link promoted into the bar still builds on its own panel");
	// The panel's actions move into the top bar, outside its own column — but a
	// link among them is still that panel's chrome, so it opens its target on top
	// of the panel, not as a fresh origin-less stack without it.
	await page.goto("./thread/8");
	await panelWith(page, /A flat URL/).waitFor();
	await page.locator("header .s-menu").getByRole("button", { name: "Next thread" }).click();
	await expect(page).toHaveURL(/\/demo\/thread\/9$/);
	await expect(page.locator(".s-crumb")).toHaveText(["Panels", "Thread 8", "Thread 9"]);
});
