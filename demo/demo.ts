import A from "aberdeen";
import S from "staffa";
import type { ButtonColor, ButtonVariant } from "staffa";

// Try a custom accent to show theming, e.g.:
// S.darkTheme.sPrimary = "#28c4a0"; S.darkTheme.sPrimaryFg = "#08110d";

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
			drawAccentPicker();
			S.button({ text: "Docs", variant: "outlined", href: "https://aberdeenjs.org" });
			S.button({ text: "New" });
		},
		footer: () => A("span rich='Built with **Staffa** · © 2026'"),
		content: () => {
			S.tabs({
				tabs: [
					{ label: "Form", content: drawForm },
					{ label: "Buttons", content: drawButtons },
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

// A segmented light / auto / dark control. The active segment is highlighted
// reactively: clicking one calls S.setDarkMode, which re-runs this scope via
// getDarkMode(true) (true = report "auto" as undefined rather than resolving it).
function drawAccentPicker() {
	const $accent = A.proxy({ value: A.peek(S.getDarkMode() ? S.darkTheme : S.lightTheme, 'sPrimary') });
	A(() => {
		(S.getDarkMode() ? S.darkTheme : S.lightTheme).sPrimary = $accent.value;
	});
	A(`input type=color cursor:pointer title="Accent color" bind=`, $accent);
}

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
				variant: m.value === active ? "filled" : "outlined",
				color: m.value === active ? "primary" : "neutral",
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
				// Getter: $layout.value is read inside the form's own reactive scope,
				// so the box's content scope doesn't subscribe and won't recreate
				// all fields when the layout changes.
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
						root: ".S_wide",
					});
					S.textarea({
						label: "Bio",
						name: "bio",
						rows: 3,
						placeholder: "Tell us about yourself",
						bind: A.ref($user, "bio"),
						root: ".S_wide",
					});
					S.checkbox({ label: "Remember me", name: "remember", bind: A.ref($user, "remember") });
					S.checkbox({ label: "Subscribe to the newsletter", name: "newsletter", bind: A.ref($user, "newsletter") });
				},
				actions: () => {
					S.button({ text: "Save", type: "submit" });
					S.button({ text: "Cancel", variant: "tonal", color: "neutral" });
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

	// Live state, to show reactivity.
	S.box({
		header: "Live state",
		root: "mt:$3",
		content: () => A.dump($user),
	});
}

function drawButtons() {
	// Typed as the library's literal-union types, so the IDE checks the values
	// below and autocompletes them.
	const variants: ButtonVariant[] = ["filled", "tonal", "outlined"];
	const colors: ButtonColor[] = ["primary", "neutral", "danger", "success"];

	A("div display:flex flex-direction:column gap:$3", () => {
		for (const variant of variants) {
			A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
				A("code w:5rem text=", variant);
				for (const color of colors) {
					S.button({ text: color, variant, color });
				}
				// Disabled example for this variant.
				S.button({ text: "disabled", variant, disabled: true });
			});
		}

		// `color` also accepts any CSS colour: a hex/rgb literal or a `$var`
		// reference to a theme custom property.
		A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
			A("code w:5rem #custom");
			S.button({ text: "#ef6b00", color: "#ef6b00" });
			S.button({ text: "$sWarning", color: "$sWarning" });
			S.button({ text: "tonal teal", color: "#13a89e", variant: "tonal" });
		});

		A("div display:flex gap:$2 flex-wrap:wrap align-items:center", () => {
			A("code w:5rem #sizes");
			S.button({ text: "Small", size: "sm" });
			S.button({ text: "Medium" });
			S.button({ text: "Large", size: "lg" });
		});

		A("h4 mb:0 #Segmented group (attached)");
		S.buttonGroup({
			buttons: [
				{ text: "Day", variant: "outlined", color: "neutral" },
				{ text: "Week", variant: "tonal", color: "danger" },
				{ text: "Month" },
			],
		});

		A("h4 mb:0 #Spaced group");
		S.buttonGroup({
			layout: "spaced",
			buttons: [
				{ text: "Save" },
				{ text: "Delete", variant: "outlined", color: "danger" },
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
			S.button({ text: "confirm()", variant: "tonal", color: "neutral", click: async () => {
				const ok = await S.confirm("Delete this item?");
				$result.value = `confirm → ${ok}`;
			}});
			S.button({ text: "prompt()", variant: "outlined", click: async () => {
				const name = await S.prompt("Enter your name:", "Alice");
				$result.value = name === null ? "prompt → cancelled" : `prompt → "${name}"`;
			}});
			A(() => { if ($result.value) A("code #", $result.value); });
		});
	});
}
