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

// A row in the edge-to-edge list page. The hover wash reaches both edges of the
// column, which is the whole point of that screen: with `A("p:0")` on the body
// there is no padding for it to stop at.
const rowStyle = A.insertCss({
	"&": "padding: $2 $3; border-top: 1px solid $s-faint; cursor:pointer transition: background 0.12s;",
	"&:hover": "background: color-mix(in srgb, $s-accent 10%, transparent)",
});

// A labelled row used inside the header's collapsed display-settings popover:
// label on the left, control on the right.
const dispRowStyle = A.insertCss({
	"&": "display:flex align-items:center justify-content:space-between gap:$3; padding: 0.35em 0.5em;",
});

// Each icon cell is a real link into `/demo/icons/[name]`, which opens the icon's
// detail as a page: a column beside the gallery on a wide screen, a pushed
// screen on a phone. It's the bare glyph — no box and no caption, so a screenful
// reads as an icon *set* rather than as a table; the name is a hover away in the
// tooltip and a click away in the detail. Declared up here (like the icon data
// below) so an initial mount straight onto an icons route can use it.
const iconCellStyle = A.insertCss({
	"&": "display:flex align-items:center justify-content:center aspect-ratio:1 r:$s-radius " +
		"text-decoration:none fg:$s-text cursor:pointer transition: color 0.12s, background 0.12s;",
	"&:hover": "fg:$s-accent background: color-mix(in srgb, $s-accent 10%, transparent)",
	"&[aria-current=page]": "fg:$s-accent background: color-mix(in srgb, $s-accent 16%, transparent)",
});

// ─── Icon data ───────────────────────────────────────────────────────────────

// Every export of `staffa/icons` is a draw-function, except `setDefaults`. Grab
// them by name so we can count the full set, power the live search box, and look
// up whichever icon a `/demo/icons/[name]` page asks for. Declared up here (not
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

const $navPosition = A.proxy("left") as {value: "left" | "right"};
// Live shell settings the demo's own pages flip. `manyColumns` is read by the
// S.main() call below, inside a reactive scope, so a change redraws the shell in
// place (the stack itself is rebuilt from the URL, columns and all).
// `extraNavItem` is just the state of the checkbox that adds a nav item, which
// mutates the item list below instead — deliberately *not* the whole shell.
const $shell = A.proxy({
	columns: "auto" as "auto" | "single" | undefined,
	linkNavigation: "push" as "push" | "replace" | "open" | undefined,
	extraNavItem: false,
});

// The page-lifecycle demo's state. Declared up here (like the icon data below)
// because the S.main() call is evaluated as this module loads, and an initial
// mount straight onto /demo/panels draws the playground there and then.
/** What `drawLivePanel` notes about itself, shown back in the playground. */
const $pageLog = A.proxy([] as string[]);
/** How often `drawLivePanel` has run, so it can show that it *hasn't* run again. */
let liveDraws = 0;

// The nav items as a *proxy* array, which the pages playground adds one to at
// runtime. The shell reads it in the sidebar's own scope, so an item arriving
// redraws the sidebar and nothing else — the open columns keep their place and
// their state.
const $navItems = A.proxy<S.MenuEntry[]>([
	{ label: "Form",     icon: icons.clipboardList,      href: "/demo/form"     },
	{ label: "Buttons",  icon: icons.mousePointerClick,  href: "/demo/buttons"  },
	{ label: "Tabs",     icon: icons.folders,            href: "/demo/tabs"     },
	{ label: "Overlays", icon: icons.bell,               href: "/demo/overlays" },
	// A collapsing submenu: only the branch holding the current page stays
	// unfolded, and clicking the branch row selects its first leaf.
	{ label: "Styling",  icon: icons.palette, items: [
		{ label: "Surfaces", href: "/demo/surfaces" },
		{ label: "Content",  href: "/demo/content"  },
	]},
	// `match`: the gallery's row also claims the icon detail pages, which have
	// no row of their own — so the sidebar still says where you are.
	{ label: "Icons",    icon: icons.shapes,             href: "/demo/icons", match: "/demo/icons" },
	{ label: "Panels",   icon: icons.layers,             href: "/demo/panels"   },
	{ separator: true },
	{ label: "Staffa docs", icon: icons.arrowUpRight, href: "https://wildloop.dev/projects/staffa/", target: "_blank" },
	{ label: "Aberdeen docs", icon: icons.arrowUpRight, href: "https://wildloop.dev/projects/aberdeen/", target: "_blank" },
]);

A(() => {
	S.main({
		// The brand sits in a gradient-text header, which sets `color:transparent`;
		// give the mark an explicit colour so its `currentColor` stroke stays visible.
		// A narrow shell displaces it with the ☰.
		logo: () => icons.sparkles({ color: "var(--s-primary)" }),
		title: "Staffa",
		// The tagline only has the bar's second line while the stack has nothing
		// to add: one page open, and that page one of the nav's own screens. Push
		// anything on top — or narrow the shell until the nav is a ☰ — and the
		// breadcrumbs take the line back.
		subtitle: "components for Aberdeen",
		// Where the name and logo above lead. The demo has no "/" route (it is
		// served under /demo), so its home is the same screen a fresh visit lands on.
		home: "/demo/form",
		nav: { items: $navItems },
		navPosition: $navPosition.value,
		// Keep the header uncluttered by tucking the display controls behind a
		// single configure button. The popover lays them out as labelled rows.
		menu: () => S.iconButton({
			icon: icons.sliders,
			ariaLabel: "Display settings",
			click: (e) => S.showFloatingMenu({
				anchor: e.currentTarget as HTMLElement,
				dropdownAttrs: "min-width:15rem",
					items: [() => {
					const row = (label: string, draw: () => void) => {
						A("label", dispRowStyle, () => {
							A("span fg:$s-muted font-size:0.9em #", label);
							draw();
						});
					};
					row("Navigation", () => S.buttonChooser({
						options: { left: icons.panelLeft, right: icons.panelRight },
						bind: $navPosition,
						attrs: ".small",
					}));
					// The routed shell's own knobs, reachable from every page — so
					// their interplay with submenus, threads etc. can be tried live.
					row("Columns", () => S.buttonChooser({
						options: { auto: "auto", single: "single" },
						bind: A.ref($shell, "columns"),
						attrs: ".small",
					}));
					row("Links", () => S.buttonChooser({
						options: { push: "push", replace: "replace", open: "open" },
						bind: A.ref($shell, "linkNavigation"),
						attrs: ".small",
					}));
					row("Primary colour", drawColorPickers);
					row("Theme", drawThemeChooser);
				}],
			}),
		}),
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		// Flipped from the display-settings popover. Getters, so the shell's own
		// small scopes are all that re-run on a change: the columns relayout in
		// place and the next click picks up the link default — the stack is not
		// rebuilt, and the open panels keep their state.
		get columns() { return $shell.columns; },
		get linkNavigation() { return $shell.linkNavigation; },
		// Most demo pages keep the default `maxWidth: "full"` (filling the
		// standard content area); the icons gallery, the icon detail and the
		// Panels playground are `"half"`, which is what lets two of them sit side
		// by side (or stack, on a phone). `/demo/panels/large` shows the shell
		// growing to the window's edges.
		routes: {
			"/demo/form":                    ($panel) => { $panel.title = "Form";     drawForm(); },
			"/demo/form/guard":              drawGuardDemo,
			"/demo/buttons":                 ($panel) => { $panel.title = "Buttons";  drawButtons(); },
			"/demo/tabs":                    ($panel) => { $panel.title = "Tabs";     drawTabsPage(); },
			"/demo/overlays":                ($panel) => { $panel.title = "Overlays"; drawOverlays(); },
			"/demo/surfaces":                ($panel) => { $panel.title = "Surfaces"; drawSurfaces(); },
			"/demo/content":                 ($panel) => { $panel.title = "Content";  drawContent(); },
			"/demo/icons":                   ($panel) => { $panel.title = "Icons"; $panel.maxWidth = "half"; drawIcons(); },
			"/demo/icons/[name]":            drawIconDetail,
			"/demo/panels":                  drawPanelsPlayground,
			"/demo/panels/live":             drawLivePanel,
			"/demo/panels/item/[id=integer]": drawItemPanel,
			"/demo/panels/a":                ($panel) => drawSmallPanel($panel, "A", "b"),
			"/demo/panels/b":                ($panel) => drawSmallPanel($panel, "B", "a"),
			"/demo/panels/rows":             drawRowsPanel,
			"/demo/panels/untitled":         drawUntitledPanel,
			"/demo/panels/medium":           drawMediumPanel,
			"/demo/panels/large":            drawLargePanel,
			// Reached by URL (tests, mostly): a chain of long-titled pages showing
			// how the crumbs share a bar that is too tight for all of them.
			"/demo/panels/long":             ($panel) => drawLongTitledPanel($panel, "Quarterly financial projections for the northern region", "/demo/panels/long/detail"),
			"/demo/panels/long/detail":      ($panel) => drawLongTitledPanel($panel, "Task 42: fix the flux capacitor before the demo", "/demo/panels/long/detail/deeper"),
			"/demo/panels/long/detail/deeper": ($panel) => drawLongTitledPanel($panel, "Appendix C: methodology, data sources and the small print"),
			// A deliberately *flat* URL: neither /demo nor /demo/thread is a route,
			// so there is no prefix to walk and nothing would open beneath it. What
			// belongs there is `ancestors`' job, below.
			"/demo/thread/[id=integer]":     drawThreadPanel,
		},
		// Where a path that arrives cold — a shared link, a notification — belongs
		// when it can't say so itself. `/demo/thread/7` has no routed prefix to
		// walk, so without this it would open as a lone column with no way back;
		// with it, the playground opens underneath, exactly as if you had walked
		// there. Keyed like a route, so `id` arrives matched and typed (a number
		// here) instead of being parsed back out of the path. Every other route is
		// left to the prefix derivation by simply not being listed.
		ancestors: {
			"/demo/thread/[id=integer]": ({ id }) => [id > 100 ? "/demo/panels/a" : "/demo/panels"],
		},
		notFound: ($panel) => {
			S.box({
				header: "Not found",
				content: () => {
					A("p mt:0 #", `There is no page at ${$panel.path}.`);
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
 * A page with a dirty check — `$panel.unsaved` is all it takes. While the
 * draft below is non-empty, nothing closes this page: Escape and navigation
 * *park* it (watch the ● in its crumb and the tab title), the crumb menu's
 * Close greys out, it survives even the browser's back button, and closing
 * the tab runs into the browser's are-you-sure. It sits at `/demo/form/guard`,
 * so it stacks on top of the form page (a deep link derives that two-page
 * stack from the route table).
 *
 * It also shows declared chrome in full: a `title` and `actions`, placed by the
 * shell (crumb and strip on a wide screen, top bar on a phone) — while the box
 * around the content is the page's own `S.box`, like any other content.
 */
function drawGuardDemo($panel: S.Panel) {
	$panel.title = "Unsaved demo";
	const $draft = A.proxy({ text: "" });
	// The dirty check: one reactive line.
	A(() => { $panel.unsaved = $draft.text !== "" || undefined; });
	// Save and Discard clear the flag *explicitly* before closing: the reactive
	// scope above reruns only after this handler, which would be too late.
	const finish = () => {
		$draft.text = "";
		$panel.unsaved = false;
		void $panel.close();
	};
	// What a form screen's verbs actually are. Not a second "close": the crumbs
	// already travel back.
	$panel.actions = () => {
		S.iconButton({
			icon: icons.trash2,
			ariaLabel: "Discard",
			attrs: "fg:$s-danger",
			click: () => { S.toast({ message: "Discarded.", type: "warning" }); finish(); },
		});
		S.iconButton({
			icon: icons.check,
			ariaLabel: "Save",
			click: () => { S.toast({ message: "Saved.", type: "success" }); finish(); },
		});
	};

	S.box({
		header: "Unsaved changes",
		content: () => {
			A("p mt:0 rich='Type something below and this panel marks itself `unsaved`: nothing closes it. Escape and navigation *park* it instead — note the ● in its crumb and in the tab’s title — and it even survives the browser’s back button. Save or Discard (up in the panel’s actions) to let it go.'");
			S.textline({ label: "Draft", bind: A.ref($draft, "text"), placeholder: "Type to make this panel unsaved…" });
		},
	});
}

// ─── Panels playground ───────────────────────────────────────────────────────

/**
 * The panels playground: a `"half"`-width page whose links and buttons push
 * further pages, so you can watch columns arrive, crowd one another out, and
 * come back. It sits at `/demo/panels`, and everything it pushes lives under
 * that path — so a deep link derives the same columns a click here would have
 * produced.
 */
function drawPanelsPlayground($panel: S.Panel) {
	$panel.title = "Panels";
	$panel.maxWidth = "half";
	// Deliberately bare: no `box` and no `actions`, and — as the bottom of the
	// stack — no way out either. So its column gets no strip at all, and on a
	// phone the bar reads `☰ · Pages · <the app's own menu>`.

	S.box({
		header: "Push a panel",
		content: () => {
			A("p mt:0 rich='A `maxWidth: \"half\"` page takes half the content area (when the screen is wide enough for two columns), the default `\"full\"` fills it, and `\"screen\"` grows the whole page to the window’s edges. A lone half leaves its other half open — exactly where the next one lands — and when the window fits more columns than the standard page holds, the page stretches to fit them.'");
			A("div display:flex flex-direction:column gap:$1 align-items:flex-start", () => {
				A("a href=/demo/panels/a #Push small A");
				A("a href=/demo/panels/medium #Push a medium panel");
				A("a href=/demo/panels/large #Push a large panel");
				A("a href=/demo/form/guard #Push the unsaved-changes panel");
				A("a href=/demo/panels/live #Push the sizing & lifecycle panel");
				A("a href=/demo/panels/rows #Push an edge-to-edge list");
				A("a href=/demo/panels/untitled #Push an untitled panel");
			});
			A("div display:flex gap:$2 flex-wrap:wrap mt:$3", () => {
				S.button({
					content: "stack.pushPanel()",
					attrs: ".neutral",
					click: () => $panel.stack.pushPanel("/demo/panels/b"),
				});
				// The other way in: a whole arrangement at once, for a screen whose
				// URL doesn't say where it belongs. Here the stack under it is spelled
				// out; `stack.openPanelStack("/demo/thread/8")` alone would ask the shell's
				// `ancestors` for it, which is what a cold link to the same path gets.
				S.button({
					content: "stack.openPanelStack()",
					attrs: ".neutral",
					click: () => $panel.stack.openPanelStack("/demo/thread/8", ["/demo/panels"]),
				});
			});
		},
	});

	S.box({
		header: "The stack",
		content: () => {
			A("p mt:0 rich='Click an earlier crumb up in the bar and the panels right of it stay open, parked past the viewport’s edge — their crumbs bring them back. Opening a new panel closes the parked ones, unless a panel is **pinned** (right-click its crumb).'");
			drawStackList($panel.stack);
		},
	});

	// Only once there is something to say — see `drawLivePanel`, which writes here
	// as it is torn down, from a page that is by then only an animation.
	A(() => {
		if (!$pageLog.length) return;
		S.box({
			header: "Panel lifecycle",
			content: () => A("ul m:0 padding-left:1.3em", () => {
				A(() => { for (const line of $pageLog) A("li #", line); });
			}),
		});
	});

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
		header: "Shell options",
		content: () => {
			A("p m:0 rich='The shell-wide knobs live in the display-settings popover, up in the top bar: `columns: \"single\"` shows only the current panel however wide the screen, and `linkNavigation` sets what a link without a `data-panel` attribute does — try the links above with `replace` or `open`.'");
		},
	});
}

/**
 * A screen whose body is a run of full-bleed rows. Nothing special is needed for
 * that: the draw function's current element *is* the padded body, so `A("p:0")`
 * on it takes the padding away and the rows reach the column's edges.
 *
 * It has `actions` but no `box`, which is the plain-column-with-a-strip case: on
 * a wide screen a bare strip holds the actions, and on a phone they take the
 * top bar's trailing slot.
 */
function drawRowsPanel($panel: S.Panel) {
	$panel.title = "Edge-to-edge rows";
	$panel.maxWidth = "half";
	// An `iconButton` opening a menu by hand, rather than `S.menuButton` — which
	// draws a full `S.button` — so this reads as chrome, not as a call to action.
	$panel.actions = () => S.iconButton({
		icon: icons.plus,
		ariaLabel: "Add",
		click: (e) => S.showFloatingMenu({
			anchor: e.currentTarget as HTMLElement,
			items: [
				{ label: "New row", click: () => S.toast({ message: "Not really." }) },
				{ label: "Import", click: () => S.toast({ message: "Nor this." }) },
			],
		}),
	});

	// The body itself: no padding, so the rows below are full-bleed.
	A("p:0");
	A("p m:$3 fg:$s-muted font-size:0.9em rich='`title` names the screen; it does not conjure a heading. An unboxed column that wants its name in the body writes it there, where it owns the typography.'");
	for (let i = 1; i <= 8; i++) {
		A("div", rowStyle, () => {
			A("span font-weight:500 #", `Row ${i}`);
			A("small display:block #Flush to both edges of the column.");
		});
	}
}

/**
 * A page that deliberately never sets `$panel.title`: the shell borrows the
 * first line of text in its body — the heading below — which is how the
 * breadcrumb up in the bar still manages to read "An untitled panel".
 */
function drawUntitledPanel($panel: S.Panel) {
	$panel.maxWidth = "half";

	A("h3 mt:0 mb:$2 #An untitled panel");
	A("p mt:0 rich='This page never set `$panel.title`. The crumb up in the bar (and `document.title`) borrowed this heading, being the body’s first line of text — good enough for a stack, though a page that cares says it itself.'");
	A("p mb:0", () => {
		S.button({ content: "Done", attrs: ".neutral .small", click: () => void $panel.close() });
	});
}

/**
 * Sizing and lifecycle in one column:
 *
 * - The page is already its final width when the handler runs, and says so in
 *   `$panel.width` — no measuring, no waiting a frame. (A handler that *assigns*
 *   `maxWidth` is drawn at the resolved new width; it is settled before the
 *   body draws.)
 * - `$panel.maxWidth` is live: picking another bound reflows this column (and
 *   slides whatever is beside it over) without redrawing it — the draw count
 *   below stays where it is, and `$panel.width` follows along.
 * - Adding a nav item mutates the shell's (proxied) item list. The sidebar
 *   redraws; the columns don't, so this page is not rebuilt either.
 * - Closing it tears it down there and then; the element only lingers to play
 *   its fade, which is exactly what the log line it leaves behind says.
 */
function drawLivePanel($panel: S.Panel) {
	$panel.title = "Sizing & lifecycle";
	// The default, spelled out so the size picker below has something selected.
	$panel.maxWidth = "full";

	// `A()` with no arguments is the element we're drawing into — the page's
	// content area, kept here only to prove below that a closed page is torn
	// down while its element is still on screen.
	const contentEl = A() as HTMLElement;
	const draws = ++liveDraws;

	A.clean(() => {
		// Still connected: the page's scope is gone the moment it closes, while
		// the element it drew hangs around for the length of the exit animation.
		$pageLog.push(contentEl.isConnected
			? `#${draws} torn down while still fading out`
			: `#${draws} torn down after it was gone`);
		if ($pageLog.length > 4) $pageLog.shift();
	});

	// The size picker lives in `actions`, so the shell puts it wherever there is
	// room for it: in this column's strip on a wide screen, in the top bar (where
	// it takes the app's own menu's place) on a phone.
	$panel.actions = () => S.buttonChooser({
		options: { half: "half", full: "full", screen: "screen" },
		bind: A.ref($panel, "maxWidth"),
		attrs: ".small",
	});

	S.box({
		header: "Sizing & lifecycle",
		content: () => {
			A("p mt:0 rich='A panel is sized *before* its draw function runs, so anything that needs the width — a chart, a virtualised list, a column count — has it from the first frame, without measuring.'");
			A("p m:0 #", "$panel.width is ");
			// Its own scope: `width` is live, so this line follows a reflow while
			// the page around it is never redrawn (see the draw count below).
			A(() => A("code data-testid=page-width #", String(Math.round($panel.width))));
			A("# px.");
			A("p mb:0 rich='Pick another bound in the chrome above: the column reflows, and whatever is beside it slides over. It is not redrawn, so nothing in it is rebuilt or loses its state.'");
			A("p mb:0 #Drawn ");
			A("code data-testid=live-draws #", String(draws));
			A("# time(s) since the page loaded.");
		},
	});

	S.box({
		header: "A live nav",
		content: () => {
			A("p mt:0 rich='The shell reads its `nav.items` inside the sidebar’s own scope, so adding one redraws the sidebar — and only the sidebar. The columns, this one included, stay exactly as they are.'");
			S.checkbox({
				label: "Add a Scratch nav item",
				bind: A.ref($shell, "extraNavItem"),
				change: () => {
					// A slot, not a `MenuItem`: custom content the shell can't reason
					// about, which is exactly what `S.closeNav()` is there for.
					// Just before the separator, wherever the list puts it.
					if ($shell.extraNavItem) $navItems.splice($navItems.findIndex((i) => typeof i === "object" && i != null && "separator" in i), 0, drawScratchNavRow);
					else $navItems.splice($navItems.findIndex((i) => typeof i === "function"), 1);
				},
			});
		},
	});
}

/**
 * A screen behind a *flat* URL — the shape a push notification or a shared link
 * lands on. Nothing in `/demo/thread/7` says which list it came out of, so the
 * shell's `ancestors` option is what puts the playground beneath it; without
 * that it would open alone, with nothing to close back to.
 */
function drawThreadPanel($panel: S.Panel<{ id: number }>) {
	const { id } = $panel.params;
	$panel.title = `Thread ${id}`;
	$panel.maxWidth = "half";
	// A *link* among the actions. On a narrow shell these are promoted into the
	// top bar, outside the panel's own column — but the link still builds on
	// this panel, exactly as it does at full width (see the chrome tests).
	$panel.actions = () => S.iconButton({
		href: `/demo/thread/${id + 1}`,
		icon: icons.chevronRight,
		ariaLabel: "Next thread",
	});

	// An unboxed screen that wants its name on show writes it in its own body: the
	// `title` above names the screen for `document.title` and the shell's chrome,
	// but it never conjures a heading here.
	A("h3 mt:0 #", `Thread ${id}`);
	A("p mt:0 rich='A flat URL: there is no `/demo/thread` screen to walk up to, so the shell asked the app what belongs underneath. Escape — or the breadcrumb up in the bar — goes back to it.'");
	A("a href=/demo/panels #Back to the playground");
}

/**
 * A custom nav row: a plain slot, so the shell knows nothing about what it
 * draws. The link still dismisses the nav, because *any* navigation does; the
 * button navigates nowhere, so it says so itself with `S.closeNav()`.
 */
function drawScratchNavRow() {
	A("div display:flex align-items:center gap:$2", () => {
		A("a.s-menu-item href=/demo/buttons flex:1 #Scratch");
		S.button({
			content: "Note",
			attrs: ".neutral .small",
			click: () => {
				S.closeNav();
				$pageLog.push("scratch action, no navigation");
				if ($pageLog.length > 4) $pageLog.shift();
			},
		});
	});
}

/**
 * A page behind an `[id=integer]` route key: `$panel.params.id` is typed (and
 * really is) a `number`, not a string that looks like one.
 */
function drawItemPanel($panel: S.Panel<{ id: number }>) {
	const { id } = $panel.params;
	$panel.title = `Item ${id}`;
	$panel.maxWidth = "half";

	S.box({
		header: `Item ${id}`,
		content: () => {
			A("p mt:0 #", `params.id is ${typeof id} ${id}, so id + 1 is ${id + 1}.`);
			A("p rich='A `data-panel=open` link leaves the panel it sits in behind and gives its target the stack `ancestors` asks for — the columns a cold link to it would open. For a link pointing somewhere else in the app, where this column isn’t the context to keep.'");
			A("div display:flex flex-direction:column gap:$1 align-items:flex-start", () => {
				// `data-panel=open`: this column drops out, and the thread arrives on
				// the playground, which is what `ancestors` puts beneath it.
				A("a href=/demo/thread/8 data-panel=open #Open a thread, on its own stack");
				A("a href=/demo/panels #Back to the playground");
			});
		},
	});
}

/**
 * A live rendering of `$panel.stack.panels` and `.currentPanelIndex`, in its
 * own scope so only it redraws. Panels after the current one are the ones parked
 * past the viewport's right edge — click their crumbs to bring them back.
 */
function drawStackList(stack: S.PanelStack) {
	A("ol m:0 padding-left:1.3em data-testid=stack-list", () => {
		A(() => {
			const current = stack.currentPanelIndex;
			stack.panels.forEach((panel, i) => {
				A("li", () => {
					A("code #", panel.path);
					if (i === current) A("span fg:$s-muted font-size:0.85em # ← current");
				});
			});
		});
	});
}

/**
 * The two interchangeable small columns, `/demo/panels/a` and `/b`. Each is
 * ordinary content — its own `S.box`es on the page ground — plus two
 * declarations: a `title` for the stack, and `actions` for the shell to place.
 *
 * Going back is the breadcrumbs' job; what a screen
 * carries itself is its own verbs. Delete here runs `$panel.close()`, which
 * keeps working while another column sits on top — closing then splices this
 * one column out of the stack and leaves the rest alone.
 */
function drawSmallPanel($panel: S.Panel, name: string, other: string) {
	$panel.title = `Small ${name}`;
	$panel.maxWidth = "half";
	$panel.actions = () => {
		S.iconButton({
			icon: icons.share2,
			ariaLabel: "Share",
			click: () => S.toast({ message: `Shared Small ${name}.` }),
		});
		S.iconButton({
			icon: icons.trash2,
			ariaLabel: "Delete",
			attrs: "fg:$s-danger",
			click: () => { S.toast({ message: `Deleted Small ${name}.`, type: "danger" }); void $panel.close(); },
		});
	};

	S.box({
		header: `Small ${name}`,
		content: () => {
			A("p mt:0 #", `Small ${name} is a "half"-width page: half the content area, leaving room for one more beside it. On a phone it fills the screen.`);
			A("p rich='Going back is the breadcrumbs’ job — click an earlier crumb up in the bar (or press Escape). Delete closes *this* column even when it isn’t the top one: it is spliced out and the columns on its right stay put.'");
			A("div display:flex flex-direction:column gap:$1 align-items:flex-start", () => {
				A("a href=", `/demo/panels/${other}`, "#", `Push small ${other.toUpperCase()}`);
				A("a href=/demo/panels/medium #Push a medium panel");
				A("a href=/demo/panels #Back to the playground");
			});
		},
	});

	S.box({ header: "The stack", content: () => drawStackList($panel.stack) });
}

/** A default-size (`"full"`) page, which always fills the whole content area. */
function drawMediumPanel($panel: S.Panel) {
	$panel.title = "Medium";
	$panel.actions = () => S.iconButton({
		icon: icons.share2,
		ariaLabel: "Share",
		click: () => S.toast({ message: "Shared." }),
	});

	A("p mt:0 rich='This page takes the default `maxWidth: \"full\"`: it fills the standard content area exactly, so nothing beside it is ever blank. Anything beneath it is crowded out, and comes back when this one closes.'");
	A("a href=/demo/panels #Back to the playground");

	S.box({ header: "The stack", content: () => drawStackList($panel.stack) });
}

/** A `"screen"` page: the whole page grows to the window's edges while it's up. */
function drawLargePanel($panel: S.Panel) {
	$panel.title = "Large";
	$panel.maxWidth = "screen";
	$panel.actions = () => S.iconButton({
		icon: icons.share2,
		ariaLabel: "Share",
		click: () => S.toast({ message: "Shared." }),
	});

	A("p mt:0 rich='A `maxWidth: \"screen\"` page takes as much room as the window has: while it is up, the columns stretch to the screen edges instead of the standard 1280px, and settle back when it closes — the top bar and footer hold the standard width throughout. For dense screens like boards and wide tables.'");
	A("a href=/demo/panels #Back to the playground");

	S.box({ header: "The stack", content: () => drawStackList($panel.stack) });
}

/**
 * Three chained pages with deliberately long titles, for trying (and visually
 * testing) how the breadcrumbs share a tight bar: with room to spare every
 * title shows in full, under pressure the longest crumbs are the first to
 * ellipsise — equalising, while short crumbs keep every character — and once
 * every long crumb is down to its 4rem floor the strip scrolls sideways.
 */
function drawLongTitledPanel($panel: S.Panel, title: string, deeper?: string) {
	$panel.title = title;
	$panel.maxWidth = "half";
	A("p mt:0 rich='This page declares a long `title`. Its crumb shows it in full while the bar has room, and is among the first to be shortened when it hasn’t: the longest crumbs always give way first.'");
	if (deeper) A("a href=", deeper, "#Push another long-titled panel");
	else A("a href=/demo/panels #Back to the playground");
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

			A("div display:grid gap:$2 align-items:center grid-template-columns: 5rem 1fr;", () => {
				A("div text-align:right fg: $s-muted; #href");
				A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
					// `href` renders an `<a role=button>` instead of a `<button>` — same
					// look, but a real link (open in new tab, copy link, ...).
					S.button({ content: "Open the Panels demo", href: "/demo/panels", attrs: ".neutral" });
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

	// The row the tab strip above is made of, on its own. The breadcrumb stack in
	// the top bar is the same component — which is the point: one behaviour for
	// every row of chrome that can outgrow its space.
	S.box({
		header: "S.scrollStrip — the row behind both",
		content: () => {
			A("p mt:0 rich='`S.tabs` puts its tab strip in one of these, and the breadcrumb stack up in the bar is another. It scrolls once its content outgrows it, hides its own scrollbar, and grows a ‹ / › over whichever end still has something to reach — so a mouse has something to click, not just a swipe target.'");
			S.scrollStrip({
				stripAttrs: "gap:$1 padding: 0.15em 0;",
				content: () => {
					for (const topic of [
						"All", "Design", "Engineering", "Marketing", "Research", "Support",
						"Operations", "Finance", "Legal", "People", "Security", "Archive",
					]) {
						S.button({ content: topic, attrs: ".neutral .small" });
					}
				},
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

	// ── Inline menu with a submenu tree ─────────────────────────────────────
	S.box({
		header: "Inline menu with submenus",
		content: () => {
			A("p m:0 fg:$s-muted font-size:0.9em rich='`S.menu` draws the same rows a dropdown or the nav sidebar uses, in place. An item with `items` of its own is a collapsible branch: clicking it selects its first leaf, and only the branch holding the current selection stays unfolded.'");
			// The leaves are ordinary links; here they pick a search param on this
			// very page, so the tree drives itself without leaving the screen.
			A("div max-width:16rem mt:$2", () => {
				S.menu({
					items: [
						{ label: "Nothing", href: "/demo/overlays" },
						{ label: "Fruit", items: [
							{ label: "Apple",  href: "/demo/overlays?pick=apple" },
							{ label: "Banana", href: "/demo/overlays?pick=banana" },
							{ label: "Citrus", items: [
								{ label: "Lemon", href: "/demo/overlays?pick=lemon" },
								{ label: "Lime",  href: "/demo/overlays?pick=lime" },
							]},
						]},
						{ label: "Vegetables", items: [
							{ label: "Carrot", href: "/demo/overlays?pick=carrot" },
							{ label: "Potato", href: "/demo/overlays?pick=potato" },
						]},
					],
				});
			});
			A("p.s-menu-picked mt:$2 mb:0 fg:$s-muted font-size:0.9em", () => {
				A(() => A("#", route.current.search.pick ? `Picked: ${route.current.search.pick}` : "Nothing picked."));
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
			A("p rich=", "These are plain `<h2>`, `<p>`, `<ul>`, `<table>` and friends — styled by default. Spacing only ever appears *between* siblings, so the first line sits flush with the top of its container. Links — like this [edge-to-edge list](/demo/panels/rows) — are ordinary `<a>`s, so the shell's navigation rules apply to prose too.");

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
	A("a", iconCellStyle, "href=", `/demo/icons/${name}`, () => {
		// With the caption gone the link has no text of its own, so name it explicitly
		// — for screen readers, and so `getByRole("link", { name })` still finds it.
		A("aria-label=", name);
		A(() => { if (route.matchCurrent(`/demo/icons/${name}`)) A("aria-current=page"); });
		S.addTooltip({ tip: name });
		fn({ size: 26 });
	});
}

/**
 * The detail page for a single icon: the icon's name as the `title`, the
 * pager as `actions`. The shell places both — crumb and strip beside the
 * gallery on a wide screen, crumb and bar-slot on a phone. Nothing here knows
 * which of the two it got.
 *
 * The pager buttons carry `data-panel=replace`, so stepping through icons swaps
 * this page in place instead of stacking a third one.
 */
function drawIconDetail($panel: S.Panel<{ name: string }>) {
	const name = $panel.params.name;
	const fn = iconByName[name];
	$panel.title = name;
	// A small column: on a wide enough screen it sits beside the (small) gallery.
	$panel.maxWidth = "half";

	const list = showcaseIcons.includes(name) ? showcaseIcons : allIcons.map(([n]) => n);
	const at = list.indexOf(name);
	$panel.actions = () => {
		drawIconPager(list[(at - 1 + list.length) % list.length], "Previous", icons.chevronLeft);
		drawIconPager(list[(at + 1) % list.length], "Next", icons.chevronRight);
	};

	if (!fn) {
		A("p m:0 fg:$s-muted #", `There is no icon called "${name}".`);
		return;
	}
	A("div display:flex justify-content:center padding:$3", () => fn({ size: 96, strokeWidth: 1.25 }));
	A("p mt:0 mb:$2 fg:$s-muted font-size:0.9em #Import just this one — a bundler tree-shakes the rest away:");
	A("pre m:0", () => A("#", `import { ${name} } from "staffa/icons";`));
}

function drawIconPager(name: string, label: string, icon: () => void) {
	// `data-panel=replace`: paging swaps this page instead of stacking a third.
	// An `iconButton` — chrome should look like chrome.
	S.iconButton({ href: `/demo/icons/${name}`, icon, ariaLabel: label, attrs: "data-panel=replace" });
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
			A("p m:0 mb:$2 fg:$s-muted font-size:0.9em rich='Each icon is a tree-shakable named export — `import { house } from \"staffa/icons\"` — that draws an inline `<svg>` into the current scope. Click one for its detail page.'");
			A("div display:grid gap:$1 grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));", () => {
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
				A("div display:grid gap:$1 grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));", () => {
					for (const [name, fn] of matches.slice(0, cap)) drawIconCell(name, fn);
				});
			});
		},
	});
}
