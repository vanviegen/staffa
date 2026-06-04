import A from "aberdeen";
import S, { setTheme } from "skye";
import type { ButtonColor, ButtonVariant } from "skye";

// Try a custom accent to show theming (setTheme is imported for this):
// setTheme({ sPrimary: "#28c4a0", sPrimaryFg: "#08110d" });

const $user = A.proxy({
	name: "Frank",
	email: "",
	bio: "",
	remember: true,
	newsletter: false,
	country: "",
	tags: ["aberdeen", "ui"],
});

const knownTags = ["aberdeen", "ui", "ux", "reactive", "typescript", "css"];

A.mount(document.body, () => {
	S.main({
		icon: "✦",
		title: "Skye",
		subtitle: "components for Aberdeen",
		maxWidth: "52rem",
		menu: () => {
			S.button({ text: "Docs", variant: "outlined", href: "https://aberdeenjs.org" });
			S.button({ text: "New" });
		},
		footer: () => A("span rich='Built with **Skye** · © 2026'"),
		content: () => {
			S.tabs({
				tabs: [
					{ label: "Form", content: drawForm },
					{ label: "Buttons", content: drawButtons },
					{
						label: "About",
						content: () =>
							A(
								"p rich='Skye is a tiny, opinionated component set for [Aberdeen](https://aberdeenjs.org). Toggle your OS dark mode — it ships dark by default.'",
							),
					},
				],
			});
		},
	});
});

function drawForm() {
	const mode = A.proxy("stacked") as {value: "stacked" | "grid"};
	S.box({
		header: "Account",
		content: () => {
			S.form({
				layout: mode.value,
				content: () => {
					S.autocomplete({label: "Form mode", options: ["stacked", "grid"], bind: mode});
					S.textline({ label: "Name", required: true, bind: A.ref($user, "name") });
					S.textline({
						label: "Email",
						type: "email",
						placeholder: "you@example.com",
						help: "We never share it.",
						bind: A.ref($user, "email"),
					});
					S.autocomplete({
						label: "Country",
						options: ["Belgium", "Netherlands", "Germany", "France", "Spain"],
						bind: A.ref($user, "country"),
						placeholder: "Pick one…",
					});
					S.autocomplete({
						label: "Tags",
						multi: true,
						allowCustom: true,
						options: knownTags,
						bind: A.ref($user, "tags"),
						help: "Type to filter; Enter adds custom tags.",
						root: ".S_wide",
					});
					S.textarea({
						label: "Bio",
						rows: 3,
						placeholder: "Tell us about yourself",
						bind: A.ref($user, "bio"),
						root: ".S_wide",
					});
					S.checkbox({ label: "Remember me", bind: A.ref($user, "remember") });
					S.checkbox({ label: "Subscribe to the newsletter", bind: A.ref($user, "newsletter") });
				},
				actions: () => {
					S.button({ text: "Save", type: "submit" });
					S.button({ text: "Cancel", variant: "tonal", color: "neutral" });
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
	});
}
