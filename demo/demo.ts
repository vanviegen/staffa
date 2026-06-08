import A from "aberdeen";
import { current, interceptLinks } from "aberdeen/route";
import S from "staffa";
import type { SurfaceRole, Variant } from "staffa";

// Enable PWA-style local link interception.
interceptLinks();

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

// ─── Shell ───────────────────────────────────────────────────────────────────

A.mount(document.body, () => {
	S.main({
		icon: "✦",
		title: "Staffa",
		subtitle: "components for Aberdeen",
		maxWidth: "52rem",
		nav: {
			button: { attrs: ".small" },
			items: [
				{ label: "Form",     icon: () => A("span aria-hidden=true #📋"), href: "?menu=form"     },
				{ label: "Buttons",  icon: () => A("span aria-hidden=true #🔘"), href: "?menu=buttons"  },
				{ label: "Tabs",     icon: () => A("span aria-hidden=true #🗂"), href: "?menu=tabs"     },
				{ label: "Overlays", icon: () => A("span aria-hidden=true #🔔"), href: "?menu=overlays" },
				{ label: "Surfaces", icon: () => A("span aria-hidden=true #🎨"), href: "?menu=surfaces" },
				{ label: "Content",  icon: () => A("span aria-hidden=true #📝"), href: "?menu=content"  },
				{ separator: true },
				{ label: "Aberdeen docs", icon: () => A("span aria-hidden=true #↗"), href: "https://aberdeenjs.org", target: "_blank" },
			],
		},
		navPosition: "left",
		menu: () => drawThemeChooser(),
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		content: () => {
			A(() => {
				const page = current.search.menu;
				if (page === "buttons")       drawButtons();
				else if (page === "tabs")     drawTabsPage();
				else if (page === "overlays") drawOverlays();
				else if (page === "surfaces") drawSurfaces();
				else if (page === "content")  drawContent();
				else                          drawForm();
			});
		},
	});
});

// ─── Theme chooser ───────────────────────────────────────────────────────────

function drawThemeChooser() {
	const initial = S.getDarkMode(true) === true ? "dark" : S.getDarkMode(true) === false ? "light" : "auto";
	const $mode = A.proxy<{ value: string | null }>({ value: initial });
	A(() => S.setDarkMode($mode.value === "dark" ? true : $mode.value === "light" ? false : undefined));
	S.buttonChooser({
		options: { light: "☀", auto: "Auto", dark: "☾" },
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
					S.button({ text: "Save", type: "submit" });
					S.button({ text: "Cancel", attrs: ".neutral .tonal" });
				},
				submit: (data) => {
					S.dialog({
						header: "Submitted data",
						allowCancel: true,
						content: (close) => {
							A("pre", () => A("#", JSON.stringify(data, null, 2)));
							A("div display:flex gap:$2 justify-content:flex-end", () => {
								S.button({ text: "Close", click: close });
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
	const roles: SurfaceRole[] = ["primary", "neutral", "danger", "success"];
	const variants: Variant[] = ["filled", "tonal", "outlined"];

	S.box({
		header: "Variants & sizes",
		contentAttrs: "display:flex flex-direction:column gap:$3",
		content: () => {
			for (const variant of variants) {
				A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
					A("div text-align:right w:5rem text=", variant);
					for (const role of roles) {
						S.button({ text: role, attrs: `.${role} .${variant}` });
					}
					S.button({ text: "disabled", attrs: `.primary .${variant}`, disabled: true });
				});
			}

			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				A("div text-align:right w:5rem #sizes");
				S.button({ text: "Small", attrs: ".small" });
				S.button({ text: "Medium" });
				S.button({ text: "Large", attrs: ".large" });
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
					{ text: "Day",   attrs: ".neutral .outlined" },
					{ text: "Week",  attrs: ".danger .tonal" },
					{ text: "Month" },
				],
			});

			A("h4 mt:0 #Spaced group");
			S.buttonGroup({
				layout: "spaced",
				buttons: [
					{ text: "Save" },
					{ text: "Delete",   attrs: ".danger .outlined" },
					{ text: "Disabled", disabled: true },
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
				// Reading current.search inside the scope tracks it reactively;
				// writing current.search replaces the URL in-place (no history push).
				const tabBind = {
					get value() { return current.search.tab ?? ""; },
					set value(v: string) { current.search = { ...current.search, tab: v }; },
				};
				S.tabs({
					bind: tabBind,
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
					text: "Neutral",
					attrs: ".neutral .outlined",
					click: () => S.toast({ message: "A neutral notification." }),
				});
				S.button({
					text: "Success",
					attrs: ".success .tonal",
					click: () => S.toast({ title: "Saved!", message: "Your changes have been saved.", type: "success" }),
				});
				S.button({
					text: "Warning",
					attrs: ".warning .tonal",
					click: () => S.toast({ title: "Watch out", message: "This action cannot be undone.", type: "warning" }),
				});
				S.button({
					text: "Danger",
					attrs: ".danger .tonal",
					click: () => S.toast({ title: "Error", message: "Something went wrong.", type: "danger" }),
				});
				S.button({
					text: "Persistent",
					attrs: ".neutral .outlined",
					click: () => {
						const dismiss = S.toast({ title: "In progress", message: "Dismiss manually or wait 8 s.", duration: 0 });
						setTimeout(dismiss, 8000);
					},
				});
				S.button({
					text: "No close button",
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
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Appears above (default)" });            S.button({ text: "Top",      attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "bottom", tip: "Appears below" }); S.button({ text: "Bottom",   attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "left",   tip: "Appears to the left" }); S.button({ text: "Left", attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ placement: "right",  tip: "Appears to the right" }); S.button({ text: "Right", attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Supports **bold** and `code` in tips" }); S.button({ text: "Rich tip", attrs: ".neutral .outlined" }); });
				A("span display:inline-flex", () => { S.addTooltip({ tip: "Still describes why it's disabled" });    S.button({ text: "Disabled", disabled: true }); });
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
					button: { text: "Actions", attrs: ".neutral .outlined" },
					items: [
						{ label: "Edit",      icon: () => A("span aria-hidden=true #✎"), click: () => S.toast({ message: "Edit clicked",   type: "success" }) },
						{ label: "Duplicate", icon: () => A("span aria-hidden=true #⎘"), click: () => S.toast({ message: "Duplicated",     type: "neutral" }) },
						{ separator: true },
						{ label: "Archive",   icon: () => A("span aria-hidden=true #📦"), click: () => S.toast({ message: "Archived", type: "warning" }) },
						{ label: "Delete",    icon: () => A("span aria-hidden=true #🗑"), attrs: "fg:$s-danger", click: () => S.toast({ message: "Deleted!", type: "danger" }) },
					],
				});

				S.menuButton({
					button: { text: "With link & disabled", attrs: ".neutral .tonal" },
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
		},
	});

	// ── Dialog ─────────────────────────────────────────────────────────────
	S.box({
		header: "Dialogs",
		content: () => {
			const $result = A.proxy({ value: "" });
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				S.button({
					text: "alert()", click: async () => {
						await S.alert("File saved successfully.");
						$result.value = "alert: dismissed";
					},
				});
				S.button({
					text: "confirm()", attrs: ".neutral .tonal", click: async () => {
						const ok = await S.confirm("Delete this item?");
						$result.value = `confirm → ${ok}`;
					},
				});
				S.button({
					text: "prompt()", attrs: ".neutral .outlined", click: async () => {
						const name = await S.prompt("Enter your name:", "Alice");
						$result.value = name === null ? "prompt → cancelled" : `prompt → "${name}"`;
					},
				});
				A(() => { if ($result.value) A("code #", $result.value); });
			});

			A("div display:flex gap:$2 flex-wrap:wrap align-items:center mt:$2", () => {
				S.button({
					text: "dialog in dialog", attrs: ".warning .outlined", click: () => {
						S.dialog({
							header: "Primary dialog",
							allowCancel: true,
							attrs: "max-width:22rem",
							content: (closeOuter) => {
								A("p #This is the primary dialog.");
								A("p #It should be wider and higher than the secondary.");
								S.button({
									text: "Open secondary", click: () => {
										S.dialog({
											header: "Secondary dialog",
											allowCancel: true,
											attrs: "max-width:36rem min-height:14rem",
											content: (closeInner) => {
												A("p #Smaller than primary.");
												S.button({ text: "Close", click: closeInner });
											},
										});
									},
								});
								S.button({ text: "Close", attrs: ".neutral .outlined", click: closeOuter });
							},
						});
					},
				});
				S.button({
					text: "dialog with surface style", click: () => {
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
	const roles = ["neutral", "primary", "danger", "success", "warning"];


	S.box({
		header: "Surfaces (shown filled)",
		content: () => {
			A("div display:flex flex-direction:column gap:$1", () => {
				for (const name of [...levels, ...roles]) {
					A(`div.s-s.${name} padding: $2 $3; r: $s-radius; display:flex gap:$3 align-items:baseline`, () => {
						A(`code min-width:6.5rem font-size:0.8em #.${name}`);
						A(`span fg: $s-fg-muted; font-size:0.85em #muted`);
						A(`span fg: $s-fg-faint; font-size:0.85em #faint`);
						A(`a href=# font-size:0.85em #link`);
						A(`span fg: $s-accent; font-weight:600 font-size:0.85em #accent`);
						A(`span padding: 0.15em 0.4em; r:4px border: 1px solid $s-border; font-size:0.8em #border`);
					});
				}
			});
		},
	});

	S.box({
		header: "Variants: filled, tonal, outlined",
		content: () => {
			A("div display:flex flex-direction:column gap:$2", () => {
				for (const name of roles) {
					A("div display:flex gap:$2 align-items:stretch", () => {
						A(`span min-width:4.5rem fg: $s-fg-muted; font-size:0.85em display:flex align-items:center #.${name}`);
						for (const variant of ["filled", "tonal", "outlined"]) {
							A(`div.s-s.${name}.${variant} padding: $2 $3; r: $s-radius; border: 1px solid $s-border; flex:1 text-align:center`, () => {
								A(`code font-size:0.8em #${variant}`);
							});
						}
					});
				}
			});
		},
	});

	S.box({
		header: "Nesting — tokens resolve to the nearest surface",
		content: () => {
			A("div.s-s.primary padding: $3; r: $s-radius;", () => {
				A("p mt:0 mb:$2 display:flex gap:$2 align-items:center", () => {
					A("code font-size:0.9em #.primary —");
					A("span fg: $s-fg-muted; #muted ·");
					A("a href=# #link");
				});
				A("div.s-s.panel padding: $2 $3; r: $s-radius;", () => {
					A("p m:0 display:flex gap:$2 align-items:center", () => {
						A("code font-size:0.9em #.panel inside .primary —");
						A("span fg: $s-fg-muted; #muted ·");
						A("a href=# #link");
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
