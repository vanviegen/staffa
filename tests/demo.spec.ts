import { test, expect } from "shotest";

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
	await page.goto("./?menu=tabs");
	await page.getByText("URL-linked tabs").waitFor();

	await page.getByRole("tab", { name: "Details" }).click();
	await expect(page).toHaveURL(/tab=details/);
	await page.getByRole("tab", { name: "History" }).click();
	await expect(page.getByText("The History tab.")).toBeVisible();
	await expect(page.getByRole("tab", { name: "Disabled" })).toBeDisabled();

	// The second tab strip scrolls; activate a late tab.
	await page.getByRole("tab", { name: "Tab 9", exact: true }).click();
	await expect(page.getByText("Content for tab 9.")).toBeVisible();
});

test("overlays: toasts, tooltips, menus and dialogs", async ({ page }) => {
	await page.goto("./?menu=overlays");
	await page.getByText("Toast notifications").waitFor();

	// Toasts: fire two; they stack at the bottom.
	await page.getByRole("button", { name: "Success" }).click();
	await page.getByText("Your changes have been saved.").waitFor();
	await page.getByRole("button", { name: "Danger" }).click();
	await page.getByText("Something went wrong.").waitFor();

	// Tooltip on hover.
	await page.getByRole("button", { name: "Rich tip" }).hover();
	await page.getByText("in tips").waitFor();

	// Action menu: open, pick an item, see the confirming toast.
	await page.getByRole("button", { name: "Actions" }).click();
	await page.getByRole("button", { name: "Edit" }).click();
	await page.getByText("Edit clicked").waitFor();

	// Context menu: right-click the panel, pick an item.
	await page.getByText("Right-click (or long-press)").click({ button: "right" });
	await page.getByRole("button", { name: "Copy", exact: true }).click();
	await page.getByText("Copied!").waitFor();

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

test("surfaces: levels, roles, variants and nesting", async ({ page }) => {
	await page.goto("./?menu=surfaces");
	await page.getByText("Accent surfaces & variants").waitFor();
	// Scroll the custom-surface demo into view for its own screenshot.
	await page.getByText("Custom accent surface").scrollIntoViewIfNeeded();
});

test("content: prose rhythm and heading scale", async ({ page }) => {
	await page.goto("./?menu=content");
	await page.getByText("Prose & flow content").waitFor();
	await page.getByText("Heading scale").scrollIntoViewIfNeeded();
});

test("icons: gallery, sizing and search", async ({ page }) => {
	await page.goto("./?menu=icons");
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
	const focused = page.locator(".s-menu-list :focus");
	await expect(focused).toHaveCount(1);
});

test("dark mode: surfaces and buttons", async ({ page }) => {
	await page.goto("./?menu=surfaces");
	await page.getByText("Surfaces & Variants").waitFor();
	// The theme switch lives in the header's configure popover.
	await page.getByRole("button", { name: "Display settings" }).click();
	await page.getByRole("button", { name: "dark" }).click();
	await page.getByRole("link", { name: "Buttons" }).click();
	await page.getByText("Variants & sizes").waitFor();
	await page.getByRole("link", { name: "Form" }).click();
	await page.getByText("Account").waitFor();
});

test("nav: Escape from the content moves focus to the current sidebar item", async ({ page }) => {
	await page.goto("./?menu=form");
	await page.getByText("Account").waitFor();
	// Escape on a fresh load (focus on <body>) should land on the sidebar's current
	// (active) item, shown with the primary-ring focus highlight.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();
});

test("nav: Escape opens the dropdown and Enter on an item closes it", async ({ page }) => {
	// Narrow the shell so the sidebar collapses to a hamburger dropdown.
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./?menu=form");
	await page.getByText("Account").waitFor();

	// Escape opens the dropdown with the current item ("Form") focused.
	await page.keyboard.press("Escape");
	await expect(page.getByRole("link", { name: "Form" })).toBeFocused();

	// Activating a link with Enter navigates *and* closes the popup, returning focus
	// to the trigger (closeFloating focuses the anchor).
	await page.getByRole("link", { name: "Buttons" }).focus();
	await page.keyboard.press("Enter");
	await page.getByText("Variants & sizes").waitFor();
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
});

test("nav: the dropdown reopens right after closing", async ({ page }) => {
	await page.setViewportSize({ width: 480, height: 800 });
	await page.goto("./?menu=form");
	await page.getByText("Account").waitFor();
	// Match only an *open* panel — a just-closed one lingers in the DOM (hidden)
	// while its fade-out transition plays.
	const openMenu = page.locator(".s-menu-list:not(.hidden)");

	await page.keyboard.press("Escape"); // open
	await expect(openMenu).toHaveCount(1);
	await page.keyboard.press("Escape"); // close — focus returns to the trigger
	await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
	await page.keyboard.press("Escape"); // reopen, ignoring the fading-out panel
	await expect(openMenu).toHaveCount(1);
});
