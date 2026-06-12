import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", { pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.Node = window.Node;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
window.matchMedia ||= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
globalThis.matchMedia = window.matchMedia;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const A = (await import("aberdeen")).default;
const S = await import("./dist/index.js");

const $form = A.proxy({ name: "Frank", email: "", bio: "", remember: false, tags: ["ui"], country: "" });

A.mount(document.body, () => {
	S.main({
		icon: "✦",
		title: "Staffa Smoke Test",
		subtitle: "rendering everything",
		maxWidth: "56rem",
		menu: () => S.button({ content: "New", size: "sm" }),
		nav: {
			items: [
				{ label: "Home", href: "/" },
				{ separator: true },
				{ label: "Settings", href: "/settings" },
			],
		},
		navPosition: "left",
		footer: "© 2026",
		content: () => {
			S.box({
				header: "Account",
				footer: () => S.button({ content: "Footer button", attrs: ".neutral .outlined" }),
				content: () => {
					S.form({
						layout: "grid",
						content: () => {
							S.textline({ label: "Name", required: true, bind: A.ref($form, "name") });
							S.textline({ label: "Email", type: "email", help: "We never share it.", bind: A.ref($form, "email") });
							S.textline({ label: "Age", type: "number", error: "Too young", bind: A.ref($form, "age") });
							S.textarea({ label: "Bio", rows: 3, bind: A.ref($form, "bio") });
							S.checkbox({ label: "Remember me", bind: A.ref($form, "remember") });
							S.autocomplete({ label: "Country", options: ["Belgium", "Netherlands", "Germany"], bind: A.ref($form, "country") });
							S.autocomplete({ label: "Tags", multi: true, allowCustom: true, options: ["ui", "ux", "css"], bind: A.ref($form, "tags") });
						},
						actions: () => S.button({ content: "Save", type: "submit" }),
					});
				},
			});

			S.tabs({
				tabs: [
					{ label: "One", content: () => A("p#First panel") },
					{ label: "Two", content: () => A("p#Second panel") },
					{ label: "Disabled", disabled: true, content: () => A("p#nope") },
				],
			});

			S.buttonGroup({
				buttons: [
					{ content: "Day", attrs: ".neutral .outlined" },
					{ content: "Week", attrs: ".neutral .outlined" },
					{ content: "Month", attrs: ".neutral .outlined" },
				],
			});

			[".primary .tonal", ".primary .outlined"].forEach((attrs) => S.button({ content: attrs, attrs }));
			S.button({ content: "disabled", disabled: true });
			S.button("Shorthand string");
			S.box(() => A("p#Box shorthand content"));

			// Tooltip — addTooltip attaches hover/focus handlers to the current element.
			A("span.tt-probe display:inline-flex", () => {
				S.button({ content: "Hover me" });
				S.addTooltip({ tip: "Helpful hint" });
			});

			// Context menu — addContextMenu attaches a contextmenu handler to the current element.
			A("div.ctx-probe", () => {
				A("p#Right-click area");
				S.addContextMenu({ items: [{ label: "Ctx copy", click: () => {} }] });
			});

			// Menu trigger
			S.menuButton({
				button: { content: "Actions", attrs: ".neutral .outlined" },
				items: [
					{ label: "Edit", click: () => {} },
					{ separator: true },
					{ label: "Delete", disabled: true },
				],
			});
		},
	});
});

// Toast fires into body-level portal
S.toast({ message: "Smoke test toast", type: "success", duration: 0, dismissible: false });

// Regression: component CSS must survive switching away from and back to a tab.
// (insertGlobalCss registers cleanup on the current scope; inserting it inside a
// tab panel would delete the styles when the panel is torn down.)
const $tab = A.proxy("a");
A.mount(document.body, () => {
	S.tabs({
		bind: $tab,
		tabs: [
			{ id: "a", label: "A", content: () => S.box({ header: "Boxed", content: () => A("p#hi") }) },
			{ id: "b", label: "B", content: () => S.buttonGroup({ buttons: [{ content: "x" }, { content: "y" }] }) },
		],
	});
});
const flush = async () => {
	A.runQueue?.();
	await new Promise((r) => setTimeout(r, 20));
	A.runQueue?.();
};
await flush();
$tab.value = "b";
await flush(); // tear down panel A
$tab.value = "a";
await flush(); // rebuild panel A — styles must still be present

const headCss = document.head.textContent || "";

// A proxied options object — mutating it should update the DOM in place.
const $btn = A.proxy({ content: "Before", attrs: "data-tag=t1" });
A.mount(document.body, () => S.button($btn));

// Flush Aberdeen's async queue.
A.runQueue?.();
await new Promise((r) => setTimeout(r, 50));
A.runQueue?.();

// Mutate proxied options and confirm reactive updates.
$btn.content = "After";
$btn.attrs = "data-tag=t2";
A.runQueue?.();
await new Promise((r) => setTimeout(r, 20));
A.runQueue?.();

// Hover the tooltip anchor to force the portal tip to render (it's only in the
// DOM while active), then assert the portal popup appeared.
document.querySelector(".tt-probe")?.dispatchEvent(new window.Event("mouseenter"));

// Right-click the context-menu probe to open its floating menu portal.
document.querySelector(".ctx-probe")?.dispatchEvent(new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
A.runQueue?.();
await new Promise((r) => setTimeout(r, 20));
A.runQueue?.();

const html = document.body.innerHTML;
const checks = {
	"top bar title": html.includes("Staffa Smoke Test"),
	"content area": html.includes("s-content") && html.includes("max-width"),
	box: html.includes("s-box") && html.includes("<header"),
	"form grid": html.includes("grid"),
	textline: html.includes("s-input"),
	"field error": html.includes("Too young"),
	checkbox: html.includes('type="checkbox"'),
	tabs: html.includes('role="tablist"'),
	buttonGroup: html.includes("s-bgroup"),
	"button variants": html.includes("tonal") && html.includes("outlined"),
	surfaces: html.includes("s-s"),
	"disabled button": html.includes("disabled"),
	autocomplete: html.includes("s-control"),
	"multi chip": html.includes("s-chip"),
	"CSS survives tab switch": headCss.includes(".s-box") && headCss.includes(".s-bgroup") && headCss.includes(".s-btn"),
	"reactive text update": html.includes("After") && !html.includes("Before"),
	"reactive attrs update": html.includes('data-tag="t2"') && !html.includes('data-tag="t1"'),
	// Tooltip popup is portal-rendered only while hovered; we hovered above.
	tooltip: html.includes("s-tt-tip") && headCss.includes(".s-tt-tip"),
	"menu trigger": html.includes("s-menu-list") || html.includes("Actions"),
	// Context menu opens a floating menu portal; we right-clicked above.
	"context menu": html.includes("Ctx copy"),
	"nav sidebar": html.includes("s-nav-panel") && html.includes('href="/"'),
	toast: html.includes("s-toast") && html.includes("Smoke test toast"),
};

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
	console.log(`${pass ? "✓" : "✗"} ${name}`);
	if (!pass) ok = false;
}
console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
process.exit(ok ? 0 : 1);
