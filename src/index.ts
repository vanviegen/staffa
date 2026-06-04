/**
 * Skye — a small, opinionated component library for the
 * {@link https://aberdeenjs.org | Aberdeen} reactive UI library.
 *
 * Import the default `S` object and call its component functions:
 *
 * ```ts
 * import S from "skye";
 *
 * S.main({
 *   title: "Hello",
 *   maxWidth: "48rem",
 *   content: () => {
 *     S.box({ header: "Login", content: () => {
 *       S.form({
 *         content: () => {
 *           S.textline({ label: "Email", type: "email", bind: A.ref($u, "email") });
 *           S.checkbox({ label: "Remember me", bind: A.ref($u, "remember") });
 *         },
 *         actions: () => S.button({ text: "Sign in", type: "submit" }),
 *       });
 *     }});
 *   },
 * });
 * ```
 *
 * Every component takes a single typed options object (see each function's
 * docs). The options object — or parts of it — may be an Aberdeen proxy, in
 * which case the component re-renders the affected parts in place when you
 * mutate it. See `AGENTS.md` for the design philosophy.
 */
import { initTheme } from "./theme.js";

import { autocomplete } from "./components/autocomplete.js";
import { box } from "./components/box.js";
import { button } from "./components/button.js";
import { buttonGroup } from "./components/buttonGroup.js";
import { checkbox } from "./components/checkbox.js";
import { form } from "./components/form.js";
import { main } from "./components/main.js";
import { tabs } from "./components/tabs.js";
import { textarea } from "./components/textarea.js";
import { textline } from "./components/textline.js";

// Install spacing vars, the default theme and the base stylesheet on import.
// Call `setTheme(...)` afterwards to customise.
initTheme();

/** The Skye component namespace. */
export const S = {
	main,
	box,
	form,
	textline,
	textarea,
	checkbox,
	tabs,
	button,
	buttonGroup,
	autocomplete,
};

export default S;

// Re-export theming and shared types for advanced use.
export { type Theme, defaultTheme, setTheme, initTheme } from "./theme.js";
export type {
	BaseOptions,
	ContentOptions,
	Bindable,
	Content,
	Slot,
	Styling,
} from "./core.js";
export { drawSlot, uniqueId } from "./core.js";

export type { FieldOptions } from "./components/field.js";
export type { MainOptions } from "./components/main.js";
export type { BoxOptions } from "./components/box.js";
export type { FormOptions } from "./components/form.js";
export type { TextlineOptions, TextlineType } from "./components/textline.js";
export type { TextareaOptions } from "./components/textarea.js";
export type { CheckboxOptions } from "./components/checkbox.js";
export type { Tab, TabsOptions } from "./components/tabs.js";
export type { ButtonOptions, ButtonVariant, ButtonColor } from "./components/button.js";
export type { ButtonGroupOptions } from "./components/buttonGroup.js";
export type { AutocompleteOptions, AutocompleteOptionInput } from "./components/autocomplete.js";
