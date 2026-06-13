import A from "aberdeen";
import * as route from "aberdeen/route";
import * as S from "staffa";
import * as icons from "staffa/icons";

// Enable PWA-style local link interception.
route.interceptLinks();

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
// overrides Staffa's --s-primary / --s-secondary (and everything derived from
// them) at equal specificity. Transient — not persisted.
A.cssVars["s-primary"] = "#89eb47";
A.cssVars["s-secondary"] = "#ecf000";

// Scoped (generated-class) styling for the swatch row, so it stays out of the
// global and `s-` namespaces.
const colorPickerStyle = A.insertCss({
	"&": "display:flex align-items:center gap:$1",
	"input[type=color]": "w:1.9rem h:1.9rem p:0 border: 1px solid $s-border-strong; r:$s-radius bg:transparent cursor:pointer",
	"input[type=color]::-webkit-color-swatch-wrapper": "padding:2px",
	"input[type=color]::-webkit-color-swatch": "border:0 border-radius: calc($s-radius - 3px)",
	"input[type=color]::-moz-color-swatch": "border:0 border-radius: calc($s-radius - 3px)",
});

// ─── Shell ───────────────────────────────────────────────────────────────────

const $navPosition = A.proxy("left") as {value: "left" | "right" | "button"};
A(() => {
	S.main({
		// The brand sits in a gradient-text header, which sets `color:transparent`;
		// give the icon an explicit colour so its `currentColor` stroke stays visible.
		icon: () => icons.sparkles({ color: "var(--s-primary)" }),
		title: "Staffa",
		subtitle: "components for Aberdeen",
		maxWidth: "1280px",
		nav: {
			button: { attrs: ".small" },
			items: [
				{ label: "Form",     icon: icons.clipboardList,      href: "?menu=form"     },
				{ label: "Buttons",  icon: icons.mousePointerClick,  href: "?menu=buttons"  },
				{ label: "Tabs",     icon: icons.folders,            href: "?menu=tabs"     },
				{ label: "Overlays", icon: icons.bell,               href: "?menu=overlays" },
				{ label: "Surfaces", icon: icons.palette,            href: "?menu=surfaces" },
				{ label: "Content",  icon: icons.fileText,           href: "?menu=content"  },
				{ label: "Icons",    icon: icons.shapes,             href: "?menu=icons"    },
				{ separator: true },
				{ label: "Aberdeen docs", icon: icons.arrowUpRight, href: "https://aberdeenjs.org", target: "_blank" },
			],
		},
		navPosition: $navPosition.value,
		menu: () => {
				S.buttonChooser({
					options: { left: icons.panelLeft, right: icons.panelRight, button: icons.menu },
					bind: $navPosition,
					attrs: ".small",
				});
				drawColorPickers();
				drawThemeChooser();
		},
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		content: () => {
			A(() => {
				const page = route.current.search.menu;
				if (page === "buttons") drawButtons();
				else if (page === "tabs") drawTabsPage();
				else if (page === "overlays") drawOverlays();
				else if (page === "surfaces") drawSurfaces();
				else if (page === "content") drawContent();
				else if (page === "icons") drawIcons();
				else if (page === "form") drawForm();
				else route.current.search.menu = "form";
			});
		},
	});
});

// ─── Theme chooser ───────────────────────────────────────────────────────────


/**
 * Two swatches that re-skin the brand's primary/secondary colours live, bound
 * straight to A.cssVars so a pick updates the `:root` token — and thus the whole
 * theme — reactively. Transient: nothing persisted, a reload restores defaults.
 */
function drawColorPickers() {
	// Object syntax (not the string mini-language) so the spaces in the aria-labels
	// don't get split into stray tokens — which would break the `bind`.
	A("div", colorPickerStyle, () => {
		A("input type=color", { "aria-label": "Primary colour", bind: A.ref(A.cssVars, "s-primary") }, () => {
			S.addTooltip({ tip: "Primary colour" });
		});
		A("input type=color", { "aria-label": "Secondary colour", bind: A.ref(A.cssVars, "s-secondary") }, () => {
			S.addTooltip({ tip: "Secondary colour" });
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
					S.button({ content: "Cancel", attrs: ".neutral .tonal" });
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

function drawButtons() {
	const roles = ["gradient", "primary", "secondary", "neutral", "danger", "success"];
	const variants = ["filled", "tonal", "outlined"];

	S.box({
		header: "Variants & sizes",
		contentAttrs: "display:flex flex-direction:column gap:$3",
		content: () => {
			for (const variant of variants) {
				A("div display:grid gap:$2 grid-template-columns: 5rem 1fr;", () => {
					A("div text-align:right fg: $s-fg-muted; text=", variant);
					A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
						for (const role of roles) {
							S.button({ content: role, attrs: `.${role} .${variant}` });
						}
						S.button({ content: "disabled", attrs: `.primary .${variant}`, disabled: true });
					});
				});
			}

			A("div display:grid gap:$2 align-items:center grid-template-columns: 5rem 1fr;", () => {
				A("div text-align:right fg: $s-fg-muted; #sizes");
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
					{ content: "Day",   attrs: ".neutral .outlined" },
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
			A("p m:0 fg:$s-fg-muted font-size:0.9em #Click to fire a toast. Each dismisses independently.");
			A("div display:flex gap:$2 flex-wrap:wrap mt:$2", () => {
				S.button({
					content: "Neutral",
					attrs: ".neutral .outlined",
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
					attrs: ".neutral .outlined",
					click: () => {
						const dismiss = S.toast({ title: "In progress", message: "Dismiss manually or wait 8 s.", duration: 0 });
						setTimeout(dismiss, 8000);
					},
				});
				S.button({
					content: "No close button",
					attrs: ".neutral .outlined",
					click: () => S.toast({ message: "Auto-dismisses in 2 s.", duration: 2000, dismissible: false }),
				});
			});
		},
	});

	// ── Tooltip ────────────────────────────────────────────────────────────
	S.box({
		header: "Tooltips",
		content: () => {
			A("p m:0 fg:$s-fg-muted font-size:0.9em #Portal-rendered — never clipped. Hover or focus the buttons to see the tips.");
			A("div display:flex gap:$4 flex-wrap:wrap align-items:center mt:$2", () => {
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Appears above (default)" });            S.button({ content: "Top",      attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "bottom", tip: "Appears below" }); S.button({ content: "Bottom",   attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "left",   tip: "Appears to the left" }); S.button({ content: "Left", attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "right",  tip: "Appears to the right" }); S.button({ content: "Right", attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Supports **bold** and `code` in tips" }); S.button({ content: "Rich tip", attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Still describes why it's disabled" });    S.button({ content: "Disabled", disabled: true }); });
			});
		},
	});

	// ── Menu ───────────────────────────────────────────────────────────────
	S.box({
		header: "Action menus",
		content: () => {
			A("p m:0 fg:$s-fg-muted font-size:0.9em #Portal-rendered — never clipped. Full keyboard nav: arrows, Enter, Escape.");
			A("div display:flex gap:$3 flex-wrap:wrap align-items:center mt:$2", () => {
				S.menuButton({
					button: { content: "Actions", attrs: ".neutral .outlined" },
					items: [
						{ label: "Edit",      icon: icons.pencil,  click: () => S.toast({ message: "Edit clicked",   type: "success" }) },
						{ label: "Duplicate", icon: icons.copy,    click: () => S.toast({ message: "Duplicated",     type: "neutral" }) },
						{ separator: true },
						{ label: "Archive",   icon: icons.archive, click: () => S.toast({ message: "Archived", type: "warning" }) },
						{ label: "Delete",    icon: icons.trash2,  attrs: "fg:$s-danger", click: () => S.toast({ message: "Deleted!", type: "danger" }) },
					],
				});

				S.menuButton({
					button: { content: "With link & disabled", attrs: ".neutral .tonal" },
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
			A("div.s-s.panel.outlined mt:$3 r:$s-radius padding:$3 text-align:center user-select:none fg:$s-fg-muted", () => {
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
					content: "confirm()", attrs: ".neutral .tonal", click: async () => {
						const ok = await S.confirm("Delete this item?");
						$result.value = `confirm → ${ok}`;
					},
				});
				S.button({
					content: "prompt()", attrs: ".neutral .outlined", click: async () => {
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
								S.button({ content: "Close", attrs: ".neutral .outlined", click: closeOuter });
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
	const levels = ["base", "panel", "raised"];
	const accentRoles = ["primary", "secondary", "gradient", "danger", "success", "warning"];
	const $containing = A.proxy({ value: "panel" });

	function drawSurfaceRow(name: string, variant?: string) {
		const cls = variant ? `div.s-s.${name}.${variant}` : `div.s-s.${name}`;
		const label = variant ? `.${name}.${variant}` : `.${name}`;
		A(`${cls} padding: $2 $3; r: $s-radius;`, () => {
			A("div display:flex gap:$3 align-items:baseline flex-wrap:wrap font-size:0.85em", () => {
				A("div flex-shrink:0 min-width:9rem #", label);
				A("span #text");
				A("span fg: $s-fg-muted; #muted");
				A("span fg: $s-fg-faint; #faint");
				A("a href=# #link");
				A("span fg: $s-accent; font-weight:600 #accent");
				A("span padding: 0.15em 0.4em; r:4px; border: 1px solid $s-border; font-size:0.8em #border");
			});
		});
	}

	S.box({
		header: "Surfaces & Variants",
		content: () => {
			A("div mb:$3", () => {
				S.select({
					label: "Containing surface",
					options: [...levels, "neutral", ...accentRoles],
					bind: $containing,
				});
			});

			A(() => {
				A(`div.s-s.${$containing.value} padding: $3; r: $s-radius;`, () => {
					A("div display:flex flex-direction:column gap:$2", () => {
						// Levels + neutral: filled only (tonal/outlined not meaningful here)
						A("div display:flex flex-direction:column gap:$1", () => {
							for (const name of [...levels, "neutral"]) drawSurfaceRow(name);
						});
						// Accent roles: one row each for filled, tonal, outlined
						for (const name of accentRoles) {
							A("div display:flex flex-direction:column gap:$1", () => {
								drawSurfaceRow(name);
								drawSurfaceRow(name, "tonal");
								drawSurfaceRow(name, "outlined");
							});
						}
					});
				});
			});
		},
	});

	S.box({
		header: "Nesting — tokens resolve to the nearest surface",
		content: () => {
			A("div.s-s.primary padding:$3 r:$s-radius", () => {
				A("p mt:0 mb:$2 display:flex gap:$2 align-items:center", () => {
					A("code #code");
					A("span fg:$s-fg-muted #muted ·");
					A('a href="#" #link');
				});
				A("div.s-s.panel padding: $2 $3; r:$s-radius", () => {
					A("p m:0 display:flex gap:$2 align-items:center", () => {
						A("code #code");
						A("span fg:$s-fg-muted #muted ·");
						A('a href="#" #link');
					});
				});
			});
		},
	});

	S.box({
		header: "Using surface tokens in your own widgets",
		content: () => {
			A("pre mt:0 mb:$2", () => A("#",
`// Register styles once — tokens resolve to whatever surface wraps the widget:
A.insertGlobalCss({
  ".my-card": "bg:$s-bg fg:$s-fg border: 1px solid $s-border; r:$s-radius p:$3",
  ".my-card .note": "fg:$s-fg-muted",
  ".my-card a": "color:$s-link",
});

// Wrap content in any surface — all children adapt automatically:
A("div.s-s.primary", () => {
  A("div.my-card", () => { /* tokens adapt to primary fill */ });
});
A("div.s-s.danger.tonal", () => {
  A("div.my-card", () => { /* tokens adapt to danger tint */ });
});`
			));
			A("p m:0 fg: $s-fg-muted; font-size:0.9em rich='**Tip:** on filled accent surfaces `--s-link` and `--s-accent` fall back to the surface ink so they stay legible.'");
		},
	});
}

// ─── Icons ─────────────────────────────────────────────────────────────────────

function drawIconCell(name: string, fn: (opts?: icons.IconOptions) => void) {
	A("div.s-s.panel display:flex flex-direction:column align-items:center justify-content:center gap:$1 padding:$2 r:$s-radius text-align:center", () => {
		S.addTooltip({ tip: name });
		fn({ size: 26 });
		A("small fg:$s-fg-muted font-size:0.7em overflow:hidden text-overflow:ellipsis white-space:nowrap max-width:100% text=", name);
	});
}

function drawIconSample(label: string, draw: () => void) {
	A("div display:flex flex-direction:column align-items:center gap:$1 w:6rem text-align:center", () => {
		draw();
		A("small fg:$s-fg-muted font-size:0.72em #", label);
	});
}

function drawIcons() {
	// Every export of `staffa/icons` is a draw-function, except `setDefaults`. Grab
	// them by name so we can both count the full set and power the live search box.
	// Declared up here (not beside the icons page) so the initial synchronous mount
	// can call drawIcons() without hitting their temporal dead zone.
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

	S.box({
		header: "Gallery",
		content: () => {
			A("p m:0 mb:$2 fg:$s-fg-muted font-size:0.9em rich='Each icon is a tree-shakable named export — `import { house } from \"staffa/icons\"` — that draws an inline `<svg>` into the current scope. Hover for the name.'");
			A("div display:grid gap:$2 grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));", () => {
				for (const name of showcaseIcons) drawIconCell(name, iconByName[name]);
			});
		},
	});

	S.box({
		header: "Sizing",
		content: () => {
			A("p m:0 mb:$2 fg:$s-fg-muted font-size:0.9em rich='`size` accepts a number (px) or any CSS length. Pass `\"1em\"` to scale with the surrounding text.'");
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
			A("p mt:$3 mb:0 fg:$s-fg-muted font-size:0.9em rich='Stroke colour defaults to `currentColor`, so an icon inherits its text colour. `attrs` is an Aberdeen attr/style string applied straight to the `<svg>` — handy for transforms, opacity or a one-off `fg:`.'");
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
				S.button({ content: "Download", icon: icons.download, attrs: ".neutral .outlined" });
				S.button({ content: "Delete", icon: icons.trash2, attrs: ".danger .tonal" });
				S.button({ icon: icons.settings, ariaLabel: "Settings", attrs: ".neutral .outlined" });
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
				A("p m:0 mb:$2 fg:$s-fg-muted font-size:0.85em #",
					`${matches.length} match${matches.length === 1 ? "" : "es"}${matches.length > cap ? ` — showing the first ${cap}` : ""}`);
				A("div display:grid gap:$2 grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));", () => {
					for (const [name, fn] of matches.slice(0, cap)) drawIconCell(name, fn);
				});
			});
		},
	});
}
