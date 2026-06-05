import A from "aberdeen";
import S from "staffa";
import type { Look, SurfaceRole } from "staffa";

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

A.mount(document.body, () => {
	S.main({
		icon: "✦",
		title: "Staffa",
		subtitle: "components for Aberdeen",
		maxWidth: "52rem",
		menu: () => {
			drawThemeChooser();
			S.button({ text: "Docs", look: "neutral-outlined", href: "https://aberdeenjs.org" });
			S.button({ text: "New" });
		},
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		content: () => {
			S.tabs({
				tabs: [
					{ label: "Form", content: drawForm },
					{ label: "Buttons", content: drawButtons },
					{ label: "Surfaces", content: drawSurfaces },
					{
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
	const modes: Array<{ label: string; value: boolean | undefined; aria: string }> = [
		{ label: "☀", value: false, aria: "Light theme" },
		{ label: "Auto", value: undefined, aria: "Follow system theme" },
		{ label: "☾", value: true, aria: "Dark theme" },
	];
	A(() => {
		const active = S.getDarkMode(true);
		S.buttonGroup({
			buttons: modes.map((m) => ({
				text: m.label,
				ariaLabel: m.aria,
				size: "sm",
				look: (m.value === active ? "primary" : "neutral-outlined") as Look,
				click: () => S.setDarkMode(m.value),
			})),
		});
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
						root: ".s-wide",
					});
					S.textarea({
						label: "Bio",
						name: "bio",
						rows: 3,
						placeholder: "Tell us about yourself",
						bind: A.ref($user, "bio"),
						root: ".s-wide",
					});
					S.checkbox({ label: "Remember me", name: "remember", bind: A.ref($user, "remember") });
					S.checkbox({ label: "Subscribe to the newsletter", name: "newsletter", bind: A.ref($user, "newsletter") });
				},
				actions: () => {
					S.button({ text: "Save", type: "submit" });
					S.button({ text: "Cancel", look: "neutral-tonal" });
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
		root: "mt:$3",
		content: () => A.dump($user),
	});
}

function drawButtons() {
	const roles: SurfaceRole[] = ["primary", "neutral", "danger", "success"];
	const mods = ["", "-tonal", "-outlined"] as const;

	A("div display:flex flex-direction:column gap:$3", () => {
		for (const mod of mods) {
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				A("code w:5rem text=", mod || "filled");
				for (const role of roles) {
					S.button({ text: role, look: `${role}${mod}` as Look });
				}
				S.button({ text: "disabled", look: `primary${mod}` as Look, disabled: true });
			});
		}

		A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
			A("code w:5rem #sizes");
			S.button({ text: "Small", size: "sm" });
			S.button({ text: "Medium" });
			S.button({ text: "Large", size: "lg" });
		});

		A("h4 mb:0 #Segmented group (attached)");
		S.buttonGroup({
			buttons: [
				{ text: "Day", look: "neutral-outlined" },
				{ text: "Week", look: "danger-tonal" },
				{ text: "Month" },
			],
		});

		A("h4 mb:0 #Spaced group");
		S.buttonGroup({
			layout: "spaced",
			buttons: [
				{ text: "Save" },
				{ text: "Delete", look: "danger-outlined" },
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
			S.button({ text: "confirm()", look: "neutral-tonal", click: async () => {
				const ok = await S.confirm("Delete this item?");
				$result.value = `confirm → ${ok}`;
			}});
			S.button({ text: "prompt()", look: "neutral-outlined", click: async () => {
				const name = await S.prompt("Enter your name:", "Alice");
				$result.value = name === null ? "prompt → cancelled" : `prompt → "${name}"`;
			}});
			A(() => { if ($result.value) A("code #", $result.value); });
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
						A(`div.s-${name}.s-filled padding: $2 $3; r: $s-radius; display:flex gap:$3 align-items:baseline`, () => {
							A(`code min-width:6.5rem font-size:0.8em #.s-${name}`);
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
							A(`span min-width:4.5rem fg: $s-fg-muted; font-size:0.85em display:flex align-items:center #.s-${name}`);
							for (const variant of ["filled", "tonal", "outlined"]) {
								A(`div.s-${name}.s-${variant} padding: $2 $3; r: $s-radius; border: 1px solid $s-border; flex:1 text-align:center`, () => {
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
				A("div.s-primary.s-filled padding: $3; r: $s-radius;", () => {
					A("p mt:0 mb:$2 display:flex gap:$2 align-items:center", () => {
						A("code font-size:0.9em #.s-primary —");
						A("span fg: $s-fg-muted; #muted ·");
						A("a href=# #link");
					});
					A("div.s-panel.s-filled padding: $2 $3; r: $s-radius;", () => {
						A("p m:0 display:flex gap:$2 align-items:center", () => {
							A("code font-size:0.9em #.s-panel inside .s-primary —");
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
`/* A role/level class + a variant class set --s-bg, --s-fg and
   the derived tokens for the subtree. Reference them in CSS: */
.my-widget {
  background: $s-bg;
  color: $s-fg;
  border: 1px solid $s-border;
  border-radius: $s-radius;
}
.my-widget .note { color: $s-fg-muted; }

/* One-line context override — all children adapt: */
<div class="s-primary s-filled">  …filled accent…   </div>
<div class="s-danger s-tonal">    …soft warning…    </div>`
				));
				A("p m:0 fg: $s-fg-muted; font-size:0.9em rich='**Tip:** on filled accent surfaces, `--s-link` falls back to the surface ink so links stay legible.'");
			},
		});
	});
}
