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

	// Hover the signature gradient button so the lift/glow is captured.
	await page.getByRole("button", { name: "gradient" }).first().hover();
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
	await page.getByText("Surfaces & Variants").waitFor();
	// Scroll the nesting demo into view for its own screenshot.
	await page.getByText("Nesting — tokens resolve").scrollIntoViewIfNeeded();
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

test("dark mode: surfaces and buttons", async ({ page }) => {
	await page.goto("./?menu=surfaces");
	await page.getByText("Surfaces & Variants").waitFor();
	await page.getByRole("button", { name: "dark" }).click();
	await page.getByRole("link", { name: "Buttons" }).click();
	await page.getByText("Variants & sizes").waitFor();
	await page.getByRole("link", { name: "Form" }).click();
	await page.getByText("Account").waitFor();
});
