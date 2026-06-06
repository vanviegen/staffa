import A from "aberdeen";
import S from "staffa";
import type { SurfaceRole, Variant } from "staffa";

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

const $tab = A.proxy({ value: "form" });

const knownTags = ["aberdeen", "ui", "ux", "reactive", "typescript", "css"];
const knownLanguages = ["TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "C#", "C++"];

A.mount(document.body, () => {
	S.main({
		icon: "✦",
		title: "Staffa",
		subtitle: "components for Aberdeen",
		maxWidth: "52rem",
		nav: {
			trigger: { size: "sm" },
			items: [
				{ label: "Form",     icon: () => A("span aria-hidden=true #📋"), click: () => { $tab.value = "form";     } },
				{ label: "Buttons",  icon: () => A("span aria-hidden=true #🔘"), click: () => { $tab.value = "buttons";  } },
				{ label: "Overlays", icon: () => A("span aria-hidden=true #🔔"), click: () => { $tab.value = "overlays"; } },
				{ label: "Surfaces", icon: () => A("span aria-hidden=true #🎨"), click: () => { $tab.value = "surfaces"; } },
				{ separator: true },
				{ label: "Aberdeen", icon: () => A("span aria-hidden=true #↗"), href: "https://aberdeenjs.org", target: "_blank" },
			],
		},
		navPosition: "left",
		menu: () => {
			drawThemeChooser();
			S.button({ text: "Docs", attrs: ".neutral .outlined", href: "https://aberdeenjs.org" });
		},
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		content: () => {
			S.tabs({
				bind: $tab,
				tabs: [
					{ id: "form",     label: "Form",     content: drawForm     },
					{ id: "buttons",  label: "Buttons",  content: drawButtons  },
					{ id: "overlays", label: "Overlays", content: drawOverlays },
					{ id: "surfaces", label: "Surfaces", content: drawSurfaces },
					{
						id: "about",
						label: "About",
						content: () =>
							A(
								"p rich='Staffa is a tiny, opinionated component set for [Aberdeen](https://aberdeenjs.org). Toggle your OS dark mode — it ships dark by default.'",
							),
					},
				],
			});
		},
	});
});

function drawThemeChooser() {
	const initial = S.getDarkMode(true) === true ? "dark" : S.getDarkMode(true) === false ? "light" : "auto";
	const $mode = A.proxy<{ value: string | null }>({ value: initial });
	A(() => S.setDarkMode($mode.value === "dark" ? true : $mode.value === "light" ? false : undefined));
	S.buttonChooser({
		options: { light: "☀", auto: "Auto", dark: "☾" },
		bind: $mode,
		size: "sm",
	});
}

function drawForm() {
	const $layout = A.proxy("grid") as {value: "stacked" | "grid"};
	S.box({
		header: "Account",
		content: () => {
			S.form({
				get layout() { return $layout.value; },
				content: () => {
					S.select({label: "Form layout", options: ["stacked", "grid"], bind: $layout});
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
		attrs: "mt:$3",
		content: () => A.dump($user),
	});
}

function drawButtons() {
	const roles: SurfaceRole[] = ["primary", "neutral", "danger", "success"];
	const variants: Variant[] = ["filled", "tonal", "outlined"];

	A("div display:flex flex-direction:column gap:$3", () => {
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
			S.button({ text: "Small", size: "sm" });
			S.button({ text: "Medium" });
			S.button({ text: "Large", size: "lg" });
		});

		A("h4 mb:0 #Segmented group (attached)");
		S.buttonGroup({
			buttons: [
				{ text: "Day", attrs: ".neutral .outlined" },
				{ text: "Week", attrs: ".danger .tonal" },
				{ text: "Month" },
			],
		});

		A("h4 mb:0 #Spaced group");
		S.buttonGroup({
			layout: "spaced",
			buttons: [
				{ text: "Save" },
				{ text: "Delete", attrs: ".danger .outlined" },
				{ text: "Disabled", disabled: true },
			],
		});

		A("h4 mb:0 #Dialog shortcuts");
		const $result = A.proxy({ value: "" });
		A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
			S.button({ text: "alert()", click: async () => {
				await S.alert("File saved successfully.");
				$result.value = "alert: dismissed";
			}});
			S.button({ text: "confirm()", attrs: ".neutral .tonal", click: async () => {
				const ok = await S.confirm("Delete this item?");
				$result.value = `confirm → ${ok}`;
			}});
			S.button({ text: "prompt()", attrs: ".neutral .outlined", click: async () => {
				const name = await S.prompt("Enter your name:", "Alice");
				$result.value = name === null ? "prompt → cancelled" : `prompt → "${name}"`;
			}});
			A(() => { if ($result.value) A("code #", $result.value); });
		});
		A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
			S.button({ text: "dialog in dialog", attrs: ".warning .outlined", click: () => {
				S.dialog({
					header: "Primary dialog",
					allowCancel: true,
					attrs: "max-width:22rem",
					content: (closeOuter) => {
						A("p #This is the primary dialog. It should be both wider and higher than the secondary dialog.");
						A("p #That allows us to see that there is a backdrop between the two dialogs.")
						S.button({ text: "Open secondary", click: () => {
							S.dialog({
								header: "Secondary dialog",
								allowCancel: true,
								attrs: "max-width:36rem min-height:14rem",
								content: (closeInner) => {
									A("p #Smaller than primary.");
									S.button({ text: "Close", click: closeInner });
								},
							});
						}});
						S.button({ text: "Close", attrs: ".neutral .outlined", click: closeOuter });
					},
				});
			}});
			S.button({ text: "dialog with surface style", click: () => {
				S.dialog({
					header: "Title",
					content: () => A("#Content..."),
					attrs: ".warning"
				})
			}});
		});
	});
}

function drawOverlays() {
	A("div display:flex flex-direction:column gap:$3", () => {

		// ── Toast ──────────────────────────────────────────────────────────────
		S.box({
			header: "Toast notifications",
			content: () => {
				A("p m:0 fg:$s-fg-muted font-size:0.9em #Click a button to fire a toast.");
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
						click: () => S.toast({ title: "Error", message: "Something went wrong. Please try again.", type: "danger" }),
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
				A("p m:0 fg:$s-fg-muted font-size:0.9em #Hover or focus the buttons to see the tips.");
				A("div display:flex gap:$4 flex-wrap:wrap align-items:center mt:$2", () => {
					S.tooltip({
						tip: "Appears above (default)",
						content: () => S.button({ text: "Top", attrs: ".neutral .outlined" }),
					});
					S.tooltip({
						placement: "bottom",
						tip: "Appears below",
						content: () => S.button({ text: "Bottom", attrs: ".neutral .outlined" }),
					});
					S.tooltip({
						placement: "left",
						tip: "Appears to the left",
						content: () => S.button({ text: "Left", attrs: ".neutral .outlined" }),
					});
					S.tooltip({
						placement: "right",
						tip: "Appears to the right",
						content: () => S.button({ text: "Right", attrs: ".neutral .outlined" }),
					});
					S.tooltip({
						tip: "Supports **bold** and `code` in tips",
						content: () => S.button({ text: "Rich tip", attrs: ".neutral .outlined" }),
					});
					S.tooltip({
						tip: "Still describes why it's disabled",
						content: () => S.button({ text: "Disabled", disabled: true }),
					});
				});
			},
		});

		// ── Menu ───────────────────────────────────────────────────────────────
		S.box({
			header: "Action menus",
			content: () => {
				A("p m:0 fg:$s-fg-muted font-size:0.9em #Portal-rendered dropdown — never clipped. Full keyboard nav: arrows, Enter, Escape.");
				A("div display:flex gap:$3 flex-wrap:wrap align-items:center mt:$2", () => {

					S.menu({
						trigger: { text: "Actions", attrs: ".neutral .outlined" },
						items: [
							{ label: "Edit",      icon: () => A("span aria-hidden=true #✎"), click: () => S.toast({ message: "Edit clicked",      type: "success" }) },
							{ label: "Duplicate",  icon: () => A("span aria-hidden=true #⎘"), click: () => S.toast({ message: "Duplicated",        type: "neutral" }) },
							{ separator: true },
							{ label: "Archive",    icon: () => A("span aria-hidden=true #📦"), click: () => S.toast({ message: "Archived",          type: "warning" }) },
							{ label: "Delete",     icon: () => A("span aria-hidden=true #🗑"), attrs: "fg:$s-danger", click: () => S.toast({ message: "Deleted!", type: "danger" }) },
						],
					});

					S.menu({
						trigger: { text: "With link & disabled", attrs: ".neutral .tonal" },
						items: [
							{ label: "View docs", href: "https://aberdeenjs.org", target: "_blank" },
							{ label: "Share",     click: () => S.toast({ message: "Link copied!", type: "success" }) },
							{ separator: true },
							{ label: "Restricted action", disabled: true },
						],
					});

					S.tooltip({
						tip: "Default ☰ icon trigger",
						content: () => S.menu({
							items: [
								{ label: "Option A", click: () => S.toast({ message: "Option A" }) },
								{ label: "Option B", click: () => S.toast({ message: "Option B" }) },
							],
						}),
					});
				});
			},
		});

	});
}

function drawSurfaces() {
	const levels = ["base", "panel", "raised"];
	const roles = ["neutral", "primary", "danger", "success", "warning"];

	A("div display:flex flex-direction:column gap:$3", () => {

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
	});
}
