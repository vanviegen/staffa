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
const S = (await import("./dist/index.js")).default;

const $form = A.proxy({ name: "Frank", email: "", bio: "", remember: false, tags: ["ui"], country: "" });

A.mount(document.body, () => {
	S.main({
		icon: "✦",
		title: "Skye Smoke Test",
		subtitle: "rendering everything",
		maxWidth: "56rem",
		menu: () => S.button({ text: "New", size: "sm" }),
		footer: "© 2026",
		content: () => {
			S.box({
				header: "Account",
				footer: () => S.button({ text: "Footer button", variant: "text" }),
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
						actions: () => S.button({ text: "Save", type: "submit" }),
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
					{ text: "Day", variant: "outlined", color: "neutral" },
					{ text: "Week", variant: "outlined", color: "neutral" },
					{ text: "Month", variant: "outlined", color: "neutral" },
				],
			});

			["filled", "tonal", "outlined"].forEach((variant) => S.button({ text: variant, variant }));
			S.button({ text: "Custom", color: "#ef6b00" }); // non-semantic colour -> inline --c
			S.button({ text: "disabled", disabled: true });
			S.button("Shorthand string");
			S.box(() => A("p#Box shorthand content"));
		},
	});
});

// Regression: component CSS must survive switching away from and back to a tab.
// (insertGlobalCss registers cleanup on the current scope; inserting it inside a
// tab panel would delete the styles when the panel is torn down.)
const $tab = A.proxy("a");
A.mount(document.body, () => {
	S.tabs({
		bind: $tab,
		tabs: [
			{ id: "a", label: "A", content: () => S.box({ header: "Boxed", content: () => A("p#hi") }) },
			{ id: "b", label: "B", content: () => S.buttonGroup({ buttons: [{ text: "x" }, { text: "y" }] }) },
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
const $btn = A.proxy({ text: "Before", variant: "filled", root: "data-tag=t1" });
A.mount(document.body, () => S.button($btn));

// Flush Aberdeen's async queue.
A.runQueue?.();
await new Promise((r) => setTimeout(r, 50));
A.runQueue?.();

// Mutate proxied options and confirm reactive updates.
$btn.text = "After";
$btn.root = "data-tag=t2";
A.runQueue?.();
await new Promise((r) => setTimeout(r, 20));
A.runQueue?.();

const html = document.body.innerHTML;
const checks = {
	"top bar title": html.includes("Skye Smoke Test"),
	"framed content": html.includes("S_framed"),
	box: html.includes("S_box") && html.includes("<header"),
	"form grid": html.includes("grid"),
	textline: html.includes("S_input"),
	"field error": html.includes("Too young"),
	checkbox: html.includes('type="checkbox"'),
	tabs: html.includes('role="tablist"'),
	buttonGroup: html.includes("S_bgroup"),
	"button variants": html.includes("S_tonal") && html.includes("S_outlined"),
	"custom button colour": html.includes("--c") && html.includes("#ef6b00"),
	"disabled button": html.includes("disabled"),
	autocomplete: html.includes("S_control"),
	"multi chip": html.includes("S_chip"),
	"CSS survives tab switch": headCss.includes(".S_box") && headCss.includes(".S_bgroup") && headCss.includes(".S_btn"),
	"reactive text update": html.includes("After") && !html.includes("Before"),
	"reactive root update": html.includes('data-tag="t2"') && !html.includes('data-tag="t1"'),
};

let ok = true;
for (const [name, pass] of Object.entries(checks)) {
	console.log(`${pass ? "✓" : "✗"} ${name}`);
	if (!pass) ok = false;
}
console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
process.exit(ok ? 0 : 1);
