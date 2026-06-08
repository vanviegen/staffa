/**
 * Staffa — a small, opinionated component library for the
 * {@link https://aberdeenjs.org | Aberdeen} reactive UI library.
 *
 * Import the default `S` object and call its component functions:
 *
 * ```ts
 * import S from "staffa";
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
// Importing the theme module installs spacing vars, the reactive theme and the
// base stylesheet. Customise it from your app with A.insertGlobalCss (see
// theme.ts); toggle modes with setDarkMode / getDarkMode.
import { setDarkMode, getDarkMode } from "./theme.js";

import { autocomplete } from "./components/autocomplete.js";
import { box } from "./components/box.js";
import { button } from "./components/button.js";
import { buttonChooser } from "./components/buttonChooser.js";
import { buttonGroup } from "./components/buttonGroup.js";
import { checkbox } from "./components/checkbox.js";
import { form } from "./components/form.js";
import { main } from "./components/main.js";
import { menuButton, showFloatingMenu } from "./components/menu.js";
import { dialog, alert, confirm, prompt } from "./components/dialog.js";
import { select } from "./components/select.js";
import { tabs } from "./components/tabs.js";
import { textarea } from "./components/textarea.js";
import { textline } from "./components/textline.js";
import { toast } from "./components/toast.js";
import { addTooltip } from "./components/tooltip.js";

/** The Staffa component namespace. */
export const S = {
	main,
	box,
	dialog,
	alert,
	confirm,
	prompt,
	form,
	menuButton,
	showFloatingMenu,
	textline,
	textarea,
	checkbox,
	tabs,
	button,
	buttonChooser,
	buttonGroup,
	autocomplete,
	select,
	toast,
	addTooltip,
	setDarkMode,
	getDarkMode,
};

export default S;

// Re-export theming and shared types for advanced use.
export { setDarkMode, getDarkMode } from "./theme.js";
export type { SurfaceRole, Variant } from "./theme.js";
export type {
	ContentOptions,
	Bindable,
	Content,
	Slot,
	Attributes as Styling,
} from "./core.js";
export { drawSlot, uniqueId } from "./core.js";

export type { FieldOptions } from "./components/field.js";
export type { MainOptions } from "./components/main.js";
export type { MenuOptions, MenuEntry, MenuItem, MenuSeparator, FloatingMenuOptions } from "./components/menu.js";
export { drawMenu } from "./components/menu.js";
export type { ToastOptions } from "./components/toast.js";
export type { TooltipOptions } from "./components/tooltip.js";
export type { BoxOptions } from "./components/box.js";
export type { FormOptions } from "./components/form.js";
export type { TextlineOptions, TextlineType } from "./components/textline.js";
export type { TextareaOptions } from "./components/textarea.js";
export type { CheckboxOptions } from "./components/checkbox.js";
export type { Tab, TabsOptions } from "./components/tabs.js";
export type { ButtonOptions } from "./components/button.js";
export type { ButtonChooserOptions } from "./components/buttonChooser.js";
export type { ButtonGroupOptions } from "./components/buttonGroup.js";
export type { AutocompleteOptions, AutocompleteOptionInput } from "./components/autocomplete.js";
export type { SelectOptions, SelectOptionInput } from "./components/select.js";
export type { DialogOptions } from "./components/dialog.js";
