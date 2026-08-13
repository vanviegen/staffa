import A from "aberdeen";
import * as route from "aberdeen/route";
import * as S from "staffa";
import * as icons from "staffa/icons";

// The demo is served statically from the repo root, so every screen lives under
// /demo/ — route keys simply carry that prefix (there is no base-path option, and
// none is needed). `/demo` itself has no route, which is exactly what makes it a
// skipped prefix when a deep link's stack is derived.
// Links are intercepted by the routed shell itself, so no interceptLinks() here.
if (route.current.path === "/demo") route.current.path = "/demo/form";

const $user = A.proxy({
	name: "Frank",
	email: "",
	bio: "",
	remember: true,
	newsletter: false,
	country: "",
	language: "",
	tags: ["aberdeen", "ui"],
});

const knownTags = ["aberdeen", "ui", "ux", "reactive", "typescript", "css"];
const knownLanguages = ["TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "C#", "C++"];


// Default brand palette for the demo. A.cssVars writes a `:root` custom-property
// block that Aberdeen emits *after* the library's own styles, so it cleanly
// overrides Staffa's --s-primary (and everything derived from it) at equal
// specificity. Transient — not persisted.
A.cssVars["s-primary"] = "#00a884";

// Scoped (generated-class) styling for the swatch row, so it stays out of the
// global and `s-` namespaces.
const colorPickerStyle = A.insertCss({
	"&": "display:flex align-items:center gap:$1",
	"input[type=color]": "w:1.9rem h:1.9rem p:0 border: 1px solid $s-faint; r:$s-radius bg:transparent cursor:pointer",
	"input[type=color]::-webkit-color-swatch-wrapper": "padding:2px",
	"input[type=color]::-webkit-color-swatch": "border:0 border-radius: calc($s-radius - 3px)",
	"input[type=color]::-moz-color-swatch": "border:0 border-radius: calc($s-radius - 3px)",
});

// A labelled row used inside the header's collapsed display-settings popover:
// label on the left, control on the right.
const dispRowStyle = A.insertCss({
	"&": "display:flex align-items:center justify-content:space-between gap:$3; padding: 0.35em 0.5em;",
});

// Each icon cell is a real link into `/demo/icons/[name]`, which opens the icon's
// detail as a panel: a column beside the gallery on a wide screen, a pushed
// screen on a phone. Inheriting the colour and dropping the underline keep it
// looking like the plain tile it was. Declared up here (like the icon data
// below) so an initial mount straight onto an icons route can use it.
const iconCellStyle = A.insertCss({
	"&": "text-decoration:none fg:inherit cursor:pointer",
	"&[aria-current=page]": "outline: 2px solid $s-primary; outline-offset:-2px",
});

// ─── Icon data ───────────────────────────────────────────────────────────────

// Every export of `staffa/icons` is a draw-function, except `setDefaults`. Grab
// them by name so we can count the full set, power the live search box, and look
// up whichever icon a `/demo/icons/[name]` panel asks for. Declared up here (not
// beside the icons page) so the initial synchronous mount — which may land
// straight on an icons route — doesn't hit their temporal dead zone.
const allIcons = Object.entries(icons).filter(
	([name, fn]) => typeof fn === "function" && name !== "setDefaults",
) as [string, (opts?: icons.IconOptions) => void][];
const iconByName = Object.fromEntries(allIcons) as Record<string, (opts?: icons.IconOptions) => void>;

// A hand-picked subset for the gallery, in a sensible reading order.
const showcaseIcons = [
	"house", "search", "settings", "user", "users", "bell", "mail", "calendar",
	"clock", "heart", "star", "bookmark", "tag", "flag", "camera", "image",
	"music", "video", "globe", "cloud", "sun", "moon", "zap", "rocket", "gift",
	"coffee", "code", "terminal", "database", "download", "upload", "copy",
	"pencil", "trash2", "filter", "eye",
];

// ─── Shell ───────────────────────────────────────────────────────────────────

const $navPosition = A.proxy("left") as {value: "left" | "right" | "button"};
// Live shell options that the demo's own pages can flip. The S.main() call below
// reads them inside a reactive scope, so a change redraws the shell in place (the
// panel stack itself is rebuilt from the URL, columns and all).
const $shell = A.proxy({ stacking: true });
A(() => {
	S.main({
		// The brand sits in a gradient-text header, which sets `color:transparent`;
		// give the icon an explicit colour so its `currentColor` stroke stays visible.
		icon: () => icons.sparkles({ color: "var(--s-primary)" }),
		title: "Staffa",
		subtitle: "components for Aberdeen",
		nav: {
			button: { attrs: ".small" },
			items: [
				{ label: "Form",     icon: icons.clipboardList,      href: "/demo/form"     },
				{ label: "Buttons",  icon: icons.mousePointerClick,  href: "/demo/buttons"  },
				{ label: "Tabs",     icon: icons.folders,            href: "/demo/tabs"     },
				{ label: "Overlays", icon: icons.bell,               href: "/demo/overlays" },
				{ label: "Surfaces", icon: icons.palette,            href: "/demo/surfaces" },
				{ label: "Content",  icon: icons.fileText,           href: "/demo/content"  },
				{ label: "Icons",    icon: icons.shapes,             href: "/demo/icons"    },
				{ label: "Panels",   icon: icons.layers,             href: "/demo/panels"   },
				{ separator: true },
				{ label: "Staffa docs", icon: icons.arrowUpRight, href: "https://wildloop.dev/projects/staffa/", target: "_blank" },
				{ label: "Aberdeen docs", icon: icons.arrowUpRight, href: "https://wildloop.dev/projects/aberdeen/", target: "_blank" },
			],
		},
		navPosition: $navPosition.value,
		// Keep the header uncluttered by tucking the display controls behind a
		// single configure button. The popover lays them out as labelled rows.
		menu: () => S.menuButton({
			button: { icon: icons.sliders, ariaLabel: "Display settings", attrs: ".neutral .small" },
			dropdownAttrs: "min-width:15rem",
			items: [() => {
				const row = (label: string, draw: () => void) => {
					A("label", dispRowStyle, () => {
						A("span fg:$s-muted font-size:0.9em #", label);
						draw();
					});
				};
				row("Navigation", () => S.buttonChooser({
					options: { left: icons.panelLeft, right: icons.panelRight, button: icons.menu },
					bind: $navPosition,
					attrs: ".small",
				}));
				row("Primary colour", drawColorPickers);
				row("Theme", drawThemeChooser);
			}],
		}),
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		// Flipped from the Panels playground: with stacking off, only the top panel
		// is ever shown — never a second column, however wide the screen.
		stacking: $shell.stacking,
		// Every demo page is a panel. Most keep the default `layout: "medium"`
		// (filling the standard content area); the icons gallery, the icon detail
		// and the Panels playground are `"small"`, which is what lets two of them
		// sit side by side (or stack, on a phone). `/demo/panels/large` shows the
		// shell growing to the window's edges.
		routes: {
			"/demo/form":                    ($page) => { $page.title = "Form";     drawForm(); },
			"/demo/form/guard":              drawGuardDemo,
			"/demo/buttons":                 ($page) => { $page.title = "Buttons";  drawButtons(); },
			"/demo/tabs":                    ($page) => { $page.title = "Tabs";     drawTabsPage(); },
			"/demo/overlays":                ($page) => { $page.title = "Overlays"; drawOverlays(); },
			"/demo/surfaces":                ($page) => { $page.title = "Surfaces"; drawSurfaces(); },
			"/demo/content":                 ($page) => { $page.title = "Content";  drawContent(); },
			"/demo/icons":                   ($page) => { $page.title = "Icons"; $page.layout = "small"; drawIcons(); },
			"/demo/icons/[name]":            drawIconDetail,
			"/demo/panels":                  drawPanelsPlayground,
			"/demo/panels/item/[id=integer]": drawItemPanel,
			"/demo/panels/a":                ($page) => drawSmallPanel($page, "A", "b"),
			"/demo/panels/b":                ($page) => drawSmallPanel($page, "B", "a"),
			"/demo/panels/medium":           drawMediumPanel,
			"/demo/panels/large":            drawLargePanel,
		},
		notFound: ($page) => {
			S.box({
				header: "Not found",
				content: () => {
					A("p mt:0 #", `There is no page at ${$page.path}.`);
					A("a href=/demo/form #Back to the demo");
				},
			});
		},
	});
});

// ─── Theme chooser ───────────────────────────────────────────────────────────


/**
 * A swatch that re-skins the brand's primary colour live, bound straight to
 * A.cssVars so a pick updates the `:root` token — and thus the whole theme,
 * since every surface tint derives from it — reactively. Transient: nothing
 * persisted, a reload restores the default.
 */
function drawColorPickers() {
	// Object syntax (not the string mini-language) so the spaces in the aria-labels
	// don't get split into stray tokens — which would break the `bind`.
	A("div", colorPickerStyle, () => {
		A("input type=color", { "aria-label": "Primary colour", bind: A.ref(A.cssVars, "s-primary") }, () => {
			S.addTooltip({ tip: "Primary colour" });
		});
	});
}

function drawThemeChooser() {
	const initial = S.getDarkMode(true) === true ? "dark" : S.getDarkMode(true) === false ? "light" : "auto";
	const $mode = A.proxy({ value: initial });
	A(() => S.setDarkMode($mode.value === "dark" ? true : $mode.value === "light" ? false : undefined));
	S.buttonChooser({
		options: { light: () => icons.sun(), auto: "Auto", dark: () => icons.moon() },
		bind: $mode,
		attrs: ".small",
	});
}

// Custom accent surface used in the surfaces demo page: set --s-bg (the fill) and
// --s-text (the ink); the subtle gradient and the rest of the tokens follow.
A.insertGlobalCss({".s-s.brand-orange": "--s-bg:#ef6b00 --s-text:#fff"});

// ─── Pages ───────────────────────────────────────────────────────────────────

function drawForm() {
	const $layout = A.proxy("grid") as { value: "stacked" | "grid" };
	S.box({
		header: "Account",
		content: () => {
			S.form({
				get layout() { return $layout.value; },
				content: () => {
					S.select({ label: "Form layout", options: ["stacked", "grid"], bind: $layout });
					S.textline({ label: "Name", name: "name", required: true, bind: A.ref($user, "name") });
					S.textline({
						label: "Email",
						name: "email",
						type: "email",
						placeholder: "you@example.com",
						help: "We never share it.",
						bind: A.ref($user, "email"),
					});
					S.select({
						label: "Country",
						name: "country",
						options: ["Belgium", "Netherlands", "Germany", "France", "Spain"],
						bind: A.ref($user, "country"),
						placeholder: "Pick one…",
					});
					S.autocomplete({
						label: "Language",
						name: "language",
						options: knownLanguages,
						bind: A.ref($user, "language"),
						placeholder: "Type to search…",
						help: "Filtered by what you type.",
					});
					S.autocomplete({
						label: "Tags",
						name: "tags",
						multi: true,
						allowCustom: true,
						options: knownTags,
						bind: A.ref($user, "tags"),
						help: "Type to filter; Enter adds custom tags.",
						attrs: ".s-wide",
					});
					S.textarea({
						label: "Bio",
						name: "bio",
						rows: 3,
						placeholder: "Tell us about yourself",
						bind: A.ref($user, "bio"),
						attrs: ".s-wide",
					});
					S.checkbox({ label: "Remember me", name: "remember", bind: A.ref($user, "remember") });
					S.checkbox({ label: "Subscribe to the newsletter", name: "newsletter", bind: A.ref($user, "newsletter") });
				},
				actions: () => {
					S.button({ content: "Cancel", attrs: ".neutral" });
					S.button({ content: "Save", type: "submit" });
				},
				submit: (data) => {
					S.dialog({
						header: "Submitted data",
						allowCancel: true,
						content: (close) => {
							A("pre", () => A("#", JSON.stringify(data, null, 2)));
							A("div display:flex gap:$2 justify-content:flex-end", () => {
								S.button({ content: "Close", click: close });
							});
						},
					});
				},
			});
		},
	});

	S.box({
		header: "Live state",
		content: () => A.dump($user),
	});
}

/**
 * A panel that refuses to go away the first time you try to close it —
 * `$page.requestClose` is what an app would hook a dirty-check up to. It sits at
 * `/demo/form/guard`, so it stacks on top of the form page (a deep link derives
 * that two-panel stack from the route table).
 */
function drawGuardDemo($page: S.Page) {
	$page.title = "Close guard";
	const $guard = A.proxy({ armed: true });
	// Escape, this box's ✕, browser back and S.panels.close() all await this.
	$page.requestClose = async () => {
		if (!$guard.armed) return true;
		$guard.armed = false;   // As if the user had cancelled the "discard?" prompt.
		return false;
	};

	S.box({
		header: "Close guard",
		close: true,
		content: () => {
			A("p mt:0 rich='This panel has a `requestClose`, which is where you would put a *discard unsaved changes?* prompt.'");
			A(() => {
				A("p mb:0 #", $guard.armed
					? "The first close attempt (Escape, the ✕ or browser back) will be refused."
					: "The guard has been used up — the next close attempt goes through.");
			});
		},
	});
}

// ─── Panels playground ───────────────────────────────────────────────────────

/**
 * The stacking playground: a `"small"` panel whose links and buttons push
 * further panels, so you can watch columns arrive, crowd one another out, and
 * come back. It sits at `/demo/panels`, and everything it pushes lives under
 * that path — so a deep link derives the same columns a click here would have
 * produced.
 */
function drawPanelsPlayground($page: S.Page) {
	$page.title = "Panels";
	$page.layout = "small";

	S.box({
		header: "Push a panel",
		content: () => {
			A("p mt:0 rich='A `\"small\"` panel takes half the content area (when the screen is wide enough for two columns), the default `\"medium\"` fills it, and a `\"large\"` grows the whole page to the window’s edges. A lone small leaves its other half open — exactly where the next small lands — and when the window fits more columns than the standard page holds, the page stretches to fit them.'");
			A("div display:flex flex-direction:column gap:$1 align-items:flex-start", () => {
				A("a href=/demo/panels/a #Push small A");
				A("a href=/demo/panels/medium #Push a medium panel");
				A("a href=/demo/panels/large #Push a large panel");
				A("a href=/demo/form/guard #Push the close-guard panel");
			});
			A("div display:flex gap:$2 flex-wrap:wrap mt:$3", () => {
				S.button({
					content: "S.panels.push()",
					attrs: ".neutral",
					click: () => S.panels.push("/demo/panels/b"),
				});
			});
		},
	});

	S.box({ header: "The stack", content: drawStackList });

	S.box({
		header: "Typed route params",
		content: () => {
			A("p mt:0 rich='A `[id=integer]` route key gives the handler a real `number`. Only spellings that survive a round trip back to the same URL match, so `/item/007` is not a route at all and falls through to `notFound`.'");
			A("div display:flex flex-direction:column gap:$1 align-items:flex-start", () => {
				A("a href=/demo/panels/item/42 #Open item 42");
				A("a href=/demo/panels/item/007 #Try item 007 (no match)");
			});
		},
	});

	S.box({
		header: "Stacking",
		content: () => {
			A("p mt:0 rich='With `stacking: false` only the top panel is shown, however wide the screen — Escape, the browser’s back button, in-app links and the panels’ own ✕ buttons all still work the same.'");
			S.checkbox({ label: "Show as many columns as fit", bind: A.ref($shell, "stacking") });
		},
	});
}

/**
 * A panel behind an `[id=integer]` route key: `$page.params.id` is typed (and
 * really is) a `number`, not a string that looks like one.
 */
function drawItemPanel($page: S.Page<{ id: number }>) {
	const { id } = $page.params;
	$page.title = `Item ${id}`;
	$page.layout = "small";

	S.box({
		header: `Item ${id}`,
		close: true,
		content: () => {
			A("p mt:0 #", `params.id is ${typeof id} ${id}, so id + 1 is ${id + 1}.`);
			A("a href=/demo/panels #Back to the playground");
		},
	});
}

/** A live rendering of `S.panels.stack`, in its own scope so only it redraws. */
function drawStackList() {
	A("ol m:0 padding-left:1.3em", () => {
		A(() => {
			for (const path of S.panels.stack) A("li", () => A("code #", path));
		});
	});
}

/**
 * One of the two interchangeable small columns, `/demo/panels/a` and `/b`.
 * Both close themselves two ways — the box's ✕ and a Cancel button on
 * `$page.close()` — and both keep working while another column sits on top of
 * them, where closing splices this one column out and leaves the rest alone.
 */
function drawSmallPanel($page: S.Page, name: string, other: string) {
	$page.title = `Small ${name}`;
	$page.layout = "small";

	S.box({
		header: `Small ${name}`,
		close: true,
		content: () => {
			A("p mt:0 #", `A "small" panel: half the content area, leaving room for one more beside it. On a phone it fills the screen.`);
			A("p rich='The ✕ closes *this* column — even when it isn’t the top one, in which case it is spliced out and the columns on its right stay put.'");
			A("div display:flex flex-direction:column gap:$1 align-items:flex-start", () => {
				A("a href=", `/demo/panels/${other}`, "#", `Push small ${other.toUpperCase()}`);
				A("a href=/demo/panels/medium #Push a medium panel");
				A("a href=/demo/panels #Back to the playground");
			});
		},
		// The other half of "pages close themselves": a plain button on $page.close().
		footer: () => S.button({ content: "Cancel", attrs: ".neutral", click: () => void $page.close() }),
	});

	S.box({ header: "The stack", content: drawStackList });
}

/** A default-size (`"medium"`) panel, which always fills the whole content area. */
function drawMediumPanel($page: S.Page) {
	$page.title = "Medium";

	S.box({
		header: "A medium panel",
		close: true,
		content: () => {
			A("p mt:0 rich='This panel takes the default `layout: \"medium\"`: it fills the standard content area exactly, so nothing beside it is ever blank. Anything beneath it is crowded out, and comes back when this one closes.'");
			A("a href=/demo/panels #Back to the playground");
		},
		footer: () => S.button({ content: "Cancel", attrs: ".neutral", click: () => void $page.close() }),
	});

	S.box({ header: "The stack", content: drawStackList });
}

/** A `"large"` panel: the whole page grows to the window's edges while it's up. */
function drawLargePanel($page: S.Page) {
	$page.title = "Large";
	$page.layout = "large";

	S.box({
		header: "A large panel",
		close: true,
		content: () => {
			A("p mt:0 rich='A `\"large\"` panel takes as much room as the window has: while it is up, the whole page — top bar, content and footer — stretches to the screen edges instead of the standard 1280px, and settles back when it closes. For dense screens like boards and wide tables.'");
			A("a href=/demo/panels #Back to the playground");
		},
		footer: () => S.button({ content: "Cancel", attrs: ".neutral", click: () => void $page.close() }),
	});

	S.box({ header: "The stack", content: drawStackList });
}

function drawButtons() {
	// Accent roles carry the three variants; `.neutral` is the neutral button.
	const roles = ["primary", "danger", "success", "warning", "link"];
	const variants = ["filled", "tonal", "outlined"];

	S.box({
		header: "Variants & sizes",
		contentAttrs: "display:flex flex-direction:column gap:$3",
		content: () => {
			for (const variant of variants) {
				A("div display:grid gap:$2 grid-template-columns: 5rem 1fr;", () => {
					A("div text-align:right fg: $s-muted; text=", variant);
					A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
						for (const role of roles) {
							S.button({ content: role, attrs: `.${role} .${variant}` });
						}
						S.button({ content: "disabled", attrs: `.primary .${variant}`, disabled: true });
					});
				});
			}

			A("div display:grid gap:$2 grid-template-columns: 5rem 1fr;", () => {
				A("div text-align:right fg: $s-muted; #neutral");
				A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
					S.button({ content: "neutral", attrs: ".neutral" });
					S.button({ content: "disabled", attrs: ".neutral", disabled: true });
				});
			});

			A("div display:grid gap:$2 align-items:center grid-template-columns: 5rem 1fr;", () => {
				A("div text-align:right fg: $s-muted; #sizes");
				A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
					S.button({ content: "Small", attrs: ".small" });
					S.button({ content: "Medium" });
					S.button({ content: "Large", attrs: ".large" });
				});
			});
		},
	});

	S.box({
		header: "Grouped buttons",
		contentAttrs: "display:flex flex-direction:column gap:$3",
		content: () => {
			A("h4 mt:0 #Segmented group (attached)");
			S.buttonGroup({
				buttons: [
					{ content: "Day",   attrs: ".neutral" },
					{ content: "Week",  attrs: ".danger .tonal" },
					{ content: "Month" },
				],
			});

			A("h4 mt:0 #Spaced group");
			S.buttonGroup({
				layout: "spaced",
				buttons: [
					{ content: "Delete",   attrs: ".danger .outlined" },
					{ content: "Disabled", disabled: true },
					{ content: "Save" },
				],
			});
		},
	});
}

function drawTabsPage() {
	S.box({
		header: "URL-linked tabs",
		content: () => {
			A("p rich='The active tab is stored in `?tab=` — tab state survives a reload and the back button.'");
			A("div mt:$2", () => {
				// Bind the tab selection to the `tab` search param.
				S.tabs({
					bind: A.ref(route.current.search, 'tab'),
					tabs: [
						{
							id: "overview",
							label: "Overview",
							content: () => {
								A("p rich='The **Overview** tab.'");
								A("small rich='Change tab — the URL updates. Hit the browser back button — the previous tab is restored.'");
							},
						},
						{ id: "details",  label: "Details",  content: () => A("p rich='The **Details** tab. Note the URL changed to `?tab=details`.'") },
						{ id: "history",  label: "History",  content: () => A("p rich='The **History** tab.'") },
						{ id: "disabled", label: "Disabled", disabled: true, content: () => A("p #Not reachable.") },
					],
				});
			});
		},
	});

	S.box({
		header: "Many tabs — scrollable strip",
		content: () => {
			S.tabs({
				tabs: Array.from({ length: 12 }, (_, i) => ({
					label: `Tab ${i + 1}`,
					content: () => A("p mt:0 #", `Content for tab ${i + 1}.`),
				})),
			});
		},
	});
}

function drawOverlays() {

	// ── Toast ──────────────────────────────────────────────────────────────
	S.box({
		header: "Toast notifications",
		content: () => {
			A("p m:0 fg:$s-muted font-size:0.9em #Click to fire a toast. Each dismisses independently.");
			A("div display:flex gap:$2 flex-wrap:wrap mt:$2", () => {
				S.button({
					content: "Neutral",
					attrs: ".neutral",
					click: () => S.toast({ message: "A neutral notification." }),
				});
				S.button({
					content: "Success",
					attrs: ".success .tonal",
					click: () => S.toast({ title: "Saved!", message: "Your changes have been saved.", type: "success" }),
				});
				S.button({
					content: "Warning",
					attrs: ".warning .tonal",
					click: () => S.toast({ title: "Watch out", message: "This action cannot be undone.", type: "warning" }),
				});
				S.button({
					content: "Danger",
					attrs: ".danger .tonal",
					click: () => S.toast({ title: "Error", message: "Something went wrong.", type: "danger" }),
				});
				S.button({
					content: "Persistent",
					attrs: ".neutral",
					click: () => {
						const dismiss = S.toast({ title: "In progress", message: "Dismiss manually or wait 8 s.", duration: 0 });
						setTimeout(dismiss, 8000);
					},
				});
				S.button({
					content: "No close button",
					attrs: ".neutral",
					click: () => S.toast({ message: "Auto-dismisses in 2 s.", duration: 2000, dismissible: false }),
				});
			});
		},
	});

	// ── Tooltip ────────────────────────────────────────────────────────────
	S.box({
		header: "Tooltips",
		content: () => {
			A("p m:0 fg:$s-muted font-size:0.9em #Portal-rendered — never clipped. Hover or focus the buttons to see the tips.");
			A("div display:flex gap:$4 flex-wrap:wrap align-items:center mt:$2", () => {
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Appears above (default)" });            S.button({ content: "Top",      attrs: ".neutral" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "bottom", tip: "Appears below" }); S.button({ content: "Bottom",   attrs: ".neutral" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "left",   tip: "Appears to the left" }); S.button({ content: "Left", attrs: ".neutral" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "right",  tip: "Appears to the right" }); S.button({ content: "Right", attrs: ".neutral" }); });
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Supports **bold** and `code` in tips" }); S.button({ content: "Rich tip", attrs: ".neutral" }); });
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Still describes why it's disabled" });    S.button({ content: "Disabled", disabled: true }); });
			});
		},
	});

	// ── Menu ───────────────────────────────────────────────────────────────
	S.box({
		header: "Action menus",
		content: () => {
			A("p m:0 fg:$s-muted font-size:0.9em #Portal-rendered — never clipped. Full keyboard nav: arrows, Enter, Escape.");
			A("div display:flex gap:$3 flex-wrap:wrap align-items:center mt:$2", () => {
				S.menuButton({
					button: { content: "Actions", attrs: ".neutral" },
					items: [
						{ label: "Edit",      icon: icons.pencil,  click: () => S.toast({ message: "Edit clicked",   type: "success" }) },
						{ label: "Duplicate", icon: icons.copy,    click: () => S.toast({ message: "Duplicated",     type: "neutral" }) },
						{ separator: true },
						{ label: "Archive",   icon: icons.archive, click: () => S.toast({ message: "Archived", type: "warning" }) },
						{ label: "Delete",    icon: icons.trash2,  attrs: "fg:$s-danger", click: () => S.toast({ message: "Deleted!", type: "danger" }) },
					],
				});

				S.menuButton({
					button: { content: "With link & disabled", attrs: ".neutral" },
					items: [
						{ label: "View docs", href: "https://aberdeenjs.org", target: "_blank" },
						{ label: "Share", click: () => S.toast({ message: "Link copied!", type: "success" }) },
						{ separator: true },
						{ label: "Restricted action", disabled: true },
					],
				});

				A("span display:inline-flex", () => {
					S.addTooltip({ tip: "Default ☰ icon trigger" });
					S.menuButton({
						items: [
							{ label: "Option A", click: () => S.toast({ message: "Option A" }) },
							{ label: "Option B", click: () => S.toast({ message: "Option B" }) },
						],
					});
				});
			});

			// addContextMenu replaces the browser menu on the current element.
			A("div.s-s.neutral mt:$3 padding:$3 text-align:center user-select:none fg:$s-muted", () => {
				A("#Right-click (or long-press) here for a context menu.");
				S.addContextMenu({
					items: [
						{ label: "Cut",   icon: icons.scissors,       click: () => S.toast({ message: "Cut!", type: "warning" }) },
						{ label: "Copy",  icon: icons.copy,           click: () => S.toast({ message: "Copied!", type: "success" }) },
						{ label: "Paste", icon: icons.clipboardPaste, disabled: true },
					],
				});
			});
		},
	});

	// ── Dialog ─────────────────────────────────────────────────────────────
	S.box({
		header: "Dialogs",
		content: () => {
			const $result = A.proxy({ value: "" });
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				S.button({
					content: "alert()", click: async () => {
						await S.alert("File saved successfully.");
						$result.value = "alert: dismissed";
					},
				});
				S.button({
					content: "confirm()", attrs: ".neutral", click: async () => {
						const ok = await S.confirm("Delete this item?");
						$result.value = `confirm → ${ok}`;
					},
				});
				S.button({
					content: "prompt()", attrs: ".neutral", click: async () => {
						const name = await S.prompt("Enter your name:", "Alice");
						$result.value = name === null ? "prompt → cancelled" : `prompt → "${name}"`;
					},
				});
				A(() => { if ($result.value) A("code #", $result.value); });
			});

			A("div display:flex gap:$2 flex-wrap:wrap align-items:center mt:$2", () => {
				S.button({
					content: "dialog in dialog", attrs: ".warning .outlined", click: () => {
						S.dialog({
							header: "Primary dialog",
							allowCancel: true,
							attrs: "max-width:22rem",
							content: (closeOuter) => {
								A("p #This is the primary dialog.");
								A("p #It should be wider and higher than the secondary.");
								S.button({
									content: "Open secondary", click: () => {
										S.dialog({
											header: "Secondary dialog",
											allowCancel: true,
											attrs: "max-width:36rem min-height:14rem",
											content: (closeInner) => {
												A("p #Smaller than primary.");
												S.button({ content: "Close", click: closeInner });
											},
										});
									},
								});
								S.button({ content: "Close", attrs: ".neutral", click: closeOuter });
							},
						});
					},
				});
				S.button({
					content: "dialog with surface style", click: () => {
						S.dialog({ header: "Title", content: () => A("#Content..."), attrs: ".warning" });
					},
				});
			});
		},
	});

}

function drawContent() {

	// A run of plain semantic elements — exactly what a markdown-to-HTML
	// renderer emits, or what you'd reach for in your own UI. Staffa gives these
	// a light vertical rhythm and typography by default, no wrapper required.
	S.box({
		header: "Prose & flow content",
		content: () => {
			A("p rich=", "These are plain `<h2>`, `<p>`, `<ul>`, `<table>` and friends — styled by default. Spacing only ever appears *between* siblings, so the first line sits flush with the top of its container.'");

			A("h2 #Vertical rhythm");
			A("p #Every block has its top margin stripped and re-added only when it isn't the first child. That keeps content flush against its container while still separating consecutive blocks.");
			A("p #A second paragraph, to show the gap between two of them.");

			A("h3 #Lists");
			A("p #Markers and indentation are preserved; items are gently spaced:");
			A("ul", () => {
				A("li #First item");
				A("li", () => {
					A("#Second item, with a nested list:");
					A("ul", () => {
						A("li #Nested lists are pulled tight");
						A("li #…rather than inheriting the full block margin");
					});
				});
				A("li #Third item");
			});
			A("ol", () => {
				A("li #Ordered lists work the same way");
				A("li #Second step");
			});

			A("h3 #Blockquote");
			A("blockquote rich='A quiet left rule and muted ink — and it still gets a proper gap above and below.'");

			A("h3 #Tables");
			A("table", () => {
				A("thead", () => A("tr", () => {
					A("th #Element");
					A("th #Browser default");
					A("th #Staffa");
				}));
				A("tbody", () => {
					const rows: [string, string, string][] = [
						["<p>", "margin: 1em 0", "top-margin between siblings only"],
						["<h2>", "bold, large, big margins", "tuned scale, flush leading"],
						["<ul>", "bullets + 40px indent", "bullets + 1.5em indent"],
						["<table>", "unstyled", "collapsed borders, header rule"],
					];
					for (const [el, before, after] of rows) {
						A("tr", () => { A("td", () => A("code #", el)); A("td #", before); A("td #", after); });
					}
				});
			});

			A("hr");
			A("p rich='An `<hr>` participates in the same rhythm — symmetric space above and below, no doubled margins.'");
		},
	});

	// Bare, unstyled native form controls — no Staffa components, no classes. The
	// CSS reset alone gives them sane proportions and the surface's accent colour
	// (so sliders, checkboxes and progress track the brand instead of browser blue).
	S.box({
		header: "Native form controls",
		content: () => {
			A("p rich='These are raw `<input>`, `<select>`, `<textarea>` and friends — *no* Staffa components. The reset borrows the surface colours and accent, keeping things unsurprising.'");

			A("div display:flex flex-direction:column gap:$3 max-width:24rem", () => {
				A("input type=text placeholder=Plain text input");
				A("input type=email value=test@example.com");

				A("select", () => {
					A("option #Native select");
					A("option #Second option");
					A("option #Third option");
				});

				A("textarea rows=3 #A bare textarea, with the same bordered box as the inputs.");

				A("label display:flex align-items:center gap:$2", () => {
					A("input type=checkbox checked=true");
					A("#Checkbox (brand accent-color)");
				});
				A("label display:flex align-items:center gap:$2", () => {
					A("input type=radio name=demo-radio checked=true");
					A("#Radio one");
				});
				A("label display:flex align-items:center gap:$2", () => {
					A("input type=radio name=demo-radio");
					A("#Radio two");
				});

				A("label display:flex flex-direction:column gap:$1", () => {
					A("span #Range slider");
					A("input type=range min=0 max=100 value=65");
				});

				A("progress max=100 value=60 width:100%");

				A("fieldset", () => {
					A("legend #Fieldset");
					A("p mt:0 rich='A quiet group box — `<fieldset>` and `<legend>` get a hairline border and tidy spacing.'");
				});
			});
		},
	});

	// The heading scale, shown together.
	S.box({
		header: "Heading scale",
		content: () => {
			A("h1 #Heading 1");
			A("h2 #Heading 2");
			A("h3 #Heading 3");
			A("h4 #Heading 4");
			A("h5 #Heading 5");
			A("h6 #Heading 6");
		},
	});

}

function drawSurfaces() {
	const accentRoles = ["primary", "danger", "success", "warning", "link"];

	// A token sampler: every contextual foreground colour shown on the current surface.
	function drawTokenRow(label: string) {
		A("div display:flex gap:$3 align-items:baseline flex-wrap:wrap font-size:0.85em", () => {
			A("div flex-shrink:0 min-width:9rem #", label);
			A("span #text");
			A("span fg: $s-muted; #muted");
			A("a href=# #link");
			A("span fg: $s-accent; font-weight:500 #accent");
			A("span padding: 0.15em 0.4em; r:4px; border: 1px solid $s-faint; font-size:0.8em #faint border");
		});
	}

	// Drawn directly on the page content (NOT in a box) so the first row really is
	// the page surface (`:root`), with each nested `.neutral` one shade deeper.
	A("h2 mt:0 #Neutral surfaces — shade steps with depth");
	A("p mt:0 mb:$3 fg:$s-muted font-size:0.9em rich='`.s-s.neutral` needs no level name: the page (`:root`), then each nested `.neutral`, steps through the neutral shades automatically (capped). Tokens resolve to the nearest surface.'");
	drawTokenRow(":root (page)");
	A("div.s-s.neutral padding: $2 $3; mt:$2", () => {
		drawTokenRow(".neutral");
		A("div.s-s.neutral padding: $2 $3; mt:$2", () => {
			drawTokenRow(".neutral .neutral");
			A("div.s-s.neutral padding: $2 $3; mt:$2", () => {
				drawTokenRow(".neutral ³ (capped)");
			});
		});
	});

	S.box({
		attrs: "mt:$3",
		header: "Accent surfaces & variants",
		content: () => {
			A("p mt:0 mb:$2 fg:$s-muted font-size:0.9em rich='Bright fill, white ink, a subtle auto-gradient. `.tonal` and `.outlined` recolour the ink instead of the fill. `.link` is the link-coloured surface.'");
			A("div display:flex flex-direction:column gap:$2", () => {
				for (const name of accentRoles) {
					A("div display:flex flex-direction:column gap:$1", () => {
						for (const variant of ["", "tonal", "outlined"]) {
							const cls = variant ? `div.s-s.${name}.${variant}` : `div.s-s.${name}`;
							const label = variant ? `.${name}.${variant}` : `.${name}`;
							A(`${cls} padding: $2 $3;`, () => drawTokenRow(label));
						}
					});
				}
			});
		},
	});

	S.box({
		header: "Nested inside an accent surface is forced filled",
		content: () => {
			A("p mt:0 mb:$2 fg:$s-muted font-size:0.9em rich='A `.tonal`/`.outlined` body would bleed into the vivid parent, so surfaces nested inside an accent surface always render filled.'");
			A("div.s-s.primary padding:$3 display:flex flex-direction:column gap:$2", () => {
				A("div.s-s.neutral padding: $2 $3;", () => drawTokenRow("a .neutral island"));
				A("div.s-s.danger.tonal padding: $2 $3;", () => drawTokenRow(".danger.tonal → filled"));
			});
		},
	});

	S.box({
		header: "Using surface tokens in your own widgets",
		content: () => {
			A("pre mt:0 mb:$2", () => A("#",
`// Register styles once — tokens resolve to whatever surface wraps the widget:
A.insertGlobalCss({
  ".my-card": "bg:$s-bg fg:$s-text border: 1px solid $s-faint; r:$s-radius p:$3",
  ".my-card .note": "fg:$s-muted",
  ".my-card a": "color:$s-link",
});

// Wrap content in any surface — all children adapt automatically:
A("div.s-s.neutral", () => {
  A("div.my-card", () => { /* neutral card */ });
});
A("div.s-s.primary", () => {
  A("div.my-card", () => { /* tokens adapt to the primary fill */ });
});`
			));
		},
	});

	S.box({
		header: "Custom accent surface",
		content: () => {
			A("pre mt:0 mb:$2", () => A("#",
`// Just set the background (and ink); the gradient + variants follow:
A.insertGlobalCss({".s-s.brand-orange": "--s-bg:#ef6b00 --s-text:#fff"});

S.button({ content: "Click me", attrs: ".brand-orange" });`
			));
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				S.button({ content: "Filled",   attrs: ".brand-orange" });
				S.button({ content: "Tonal",    attrs: ".brand-orange .tonal" });
				S.button({ content: "Outlined", attrs: ".brand-orange .outlined" });
			});
		},
	});

	S.box({
		header: "Elevation",
		content: () => {
			A("p mt:0 mb:$3 fg:$s-muted font-size:0.9em rich='Neutral surfaces carry a hairline border on their own. Add `.shadow` or `.extra-shadow` to lift them, or `.no-shadow` to drop a component default (here, a button glow).'");
			A("div display:flex gap:$3 flex-wrap:wrap", () => {
				for (const [label, cls] of [["border only", ""], [".shadow", ".shadow"], [".extra-shadow", ".extra-shadow"]] as const) {
					A(`div.s-s.link${cls} padding:$3 r:$s-radius-lg min-width:8rem text-align:center`, () => A("#", label));
				}
			});
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center mt:$3", () => {
				S.button({ content: "Default glow" });
				S.button({ content: "No shadow", attrs: ".no-shadow" });
			});
		},
	});
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function drawIconCell(name: string, fn: (opts?: icons.IconOptions) => void) {
	A("a.s-s.neutral display:flex flex-direction:column align-items:center justify-content:center gap:$1 padding:$2 text-align:center",
		iconCellStyle, "href=", `/demo/icons/${name}`, () => {
		A(() => { if (route.matchCurrent(`/demo/icons/${name}`)) A("aria-current=page"); });
		S.addTooltip({ tip: name });
		fn({ size: 26 });
		A("small fg:$s-muted font-size:0.7em overflow:hidden text-overflow:ellipsis white-space:nowrap max-width:100% text=", name);
	});
}

/**
 * The detail panel for a single icon. Its links show off the three link
 * behaviours: `data-panel=replace` swaps this panel in place (prev/next paging),
 * a link to the already-open gallery *returns* to it rather than stacking a
 * duplicate, and the gallery's own cells push/replace from their own panel.
 */
function drawIconDetail($page: S.Page<{ name: string }>) {
	const name = $page.params.name;
	const fn = iconByName[name];
	$page.title = name;
	// A small column: on a wide enough screen it sits beside the (small) gallery.
	$page.layout = "small";

	S.box({
		header: name,
		// The shell draws no back chrome, so the page provides its own: this ✕ is the
		// way out of the detail on every screen size — a pop on a phone, and one
		// column less on a wide one.
		close: true,
		content: () => {
			if (!fn) {
				A("p m:0 fg:$s-muted #", `There is no icon called "${name}".`);
				return;
			}
			A("div display:flex justify-content:center padding:$3", () => fn({ size: 96, strokeWidth: 1.25 }));
			A("p mt:0 mb:$2 fg:$s-muted font-size:0.9em #Import just this one — a bundler tree-shakes the rest away:");
			A("pre m:0", () => A("#", `import { ${name} } from "staffa/icons";`));
		},
	});

	const list = showcaseIcons.includes(name) ? showcaseIcons : allIcons.map(([n]) => n);
	const at = list.indexOf(name);
	A("nav display:flex align-items:center justify-content:space-between gap:$2 mt:$3", () => {
		// `data-panel=replace`: paging swaps this panel instead of stacking a third.
		drawIconPager(list[(at - 1 + list.length) % list.length], "← Previous");
		// Already an open panel, so this closes back down to the gallery.
		A("a href=/demo/icons #All icons");
		drawIconPager(list[(at + 1) % list.length], "Next →");
	});
}

function drawIconPager(name: string, label: string) {
	A("a data-panel=replace", "href=", `/demo/icons/${name}`, "#", label);
}

function drawIconSample(label: string, draw: () => void) {
	A("div display:flex flex-direction:column align-items:center gap:$1 w:6rem text-align:center", () => {
		draw();
		A("small fg:$s-muted font-size:0.72em #", label);
	});
}

function drawIcons() {
	S.box({
		header: "Gallery",
		content: () => {
			A("p m:0 mb:$2 fg:$s-muted font-size:0.9em rich='Each icon is a tree-shakable named export — `import { house } from \"staffa/icons\"` — that draws an inline `<svg>` into the current scope. Click one for its detail panel.'");
			A("div display:grid gap:$2 grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));", () => {
				for (const name of showcaseIcons) drawIconCell(name, iconByName[name]);
			});
		},
	});

	S.box({
		header: "Sizing",
		content: () => {
			A("p m:0 mb:$2 fg:$s-muted font-size:0.9em rich='`size` accepts a number (px) or any CSS length. Pass `\"1em\"` to scale with the surrounding text.'");
			A("div display:flex gap:$3 align-items:flex-end flex-wrap:wrap", () => {
				for (const size of [16, 24, 32, 48, 64]) {
					drawIconSample(`${size}px`, () => icons.house({ size }));
				}
			});
			A("p mt:$3 mb:0 display:flex align-items:center gap:$1 flex-wrap:wrap", () => {
				A("span #Inline and sized to the font:");
				icons.mapPin({ size: "1em" });
				A("span #it flows with the line, scaling up to");
				A("span font-size:1.6em display:inline-flex align-items:center gap:$1", () => {
					icons.mapPin({ size: "1em" });
					A("span #1.6em");
				});
			});
		},
	});

	S.box({
		header: "Colour, stroke & line style",
		content: () => {
			A("div display:flex gap:$4 flex-wrap:wrap align-items:flex-start", () => {
				drawIconSample("default", () => icons.heart({ size: 32 }));
				drawIconSample("color", () => icons.heart({ size: 32, color: "var(--s-danger)" }));
				drawIconSample("strokeWidth: 1", () => icons.heart({ size: 32, strokeWidth: 1 }));
				drawIconSample("strokeWidth: 3", () => icons.heart({ size: 32, strokeWidth: 3 }));
				drawIconSample("cap/join: miter", () => icons.activity({ size: 32, strokeWidth: 4, cap: "butt", join: "miter" }));
				drawIconSample("cap/join: round", () => icons.activity({ size: 32, strokeWidth: 4, cap: "round", join: "round" }));
				drawIconSample("attrs", () => icons.star({ size: 32, attrs: "fg:gold transform:rotate(15deg)" }));
			});
			A("p mt:$3 mb:0 fg:$s-muted font-size:0.9em rich='Stroke colour defaults to `currentColor`, so an icon inherits its text colour. `attrs` is an Aberdeen attr/style string applied straight to the `<svg>` — handy for transforms, opacity or a one-off `fg:`.'");
			A("pre mt:$2 mb:0", () => A("#",
`// Shift the module-wide defaults once, at startup:
import { setDefaults } from "staffa/icons";
setDefaults({ size: "1.25em", strokeWidth: 1.5 });`));
		},
	});

	S.box({
		header: "In context",
		content: () => {
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				S.button({ content: "New", icon: icons.plus });
				S.button({ content: "Download", icon: icons.download, attrs: ".neutral" });
				S.button({ content: "Delete", icon: icons.trash2, attrs: ".danger .tonal" });
				S.button({ icon: icons.settings, ariaLabel: "Settings", attrs: ".neutral" });
			});
			A("p mt:$3 mb:0 rich='Buttons take an `icon` slot. Because icons stroke themselves in `currentColor`, they tint to match whatever surface or text wraps them — no per-button colour needed.'");
		},
	});

	S.box({
		header: "Search the full set",
		content: () => {
			const $q = A.proxy({ value: "" });
			S.textline({ label: `Filter all ${allIcons.length} icons`, placeholder: "e.g. arrow, chevron, file…", bind: $q });
			A("div mt:$2", () => {
				const q = $q.value.trim().toLowerCase();
				const matches = q ? allIcons.filter(([name]) => name.toLowerCase().includes(q)) : allIcons;
				const cap = 120;
				A("p m:0 mb:$2 fg:$s-muted font-size:0.85em #",
					`${matches.length} match${matches.length === 1 ? "" : "es"}${matches.length > cap ? ` — showing the first ${cap}` : ""}`);
				A("div display:grid gap:$2 grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));", () => {
					for (const [name, fn] of matches.slice(0, cap)) drawIconCell(name, fn);
				});
			});
		},
	});
}
