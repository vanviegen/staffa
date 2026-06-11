/**
 * Staffa — a small, opinionated component library for the
 * {@link https://aberdeenjs.org | Aberdeen} reactive UI library.
 *
 * Import the default `S` object and call its component functions:
 *
 * ```ts
 * import * as S from "staffa";
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
 *         actions: () => S.button({ content: "Sign in", type: "submit" }),
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
export { setDarkMode, getDarkMode } from "./theme.js";
export { autocomplete, type AutocompleteOptions, type AutocompleteOptionInput } from "./components/autocomplete.js";
export { box, type BoxOptions } from "./components/box.js";
export { button, type ButtonOptions } from "./components/button.js";
export { buttonChooser, type ButtonChooserOptions } from "./components/buttonChooser.js";
export { buttonGroup, type ButtonGroupOptions } from "./components/buttonGroup.js";
export { checkbox, type CheckboxOptions } from "./components/checkbox.js";
export { form, type FormOptions } from "./components/form.js";
export { main, type MainOptions } from "./components/main.js";
export { menuButton, showFloatingMenu, type MenuOptions, type MenuEntry, type MenuItem, type MenuSeparator, type FloatingMenuOptions } from "./components/menu.js";
export { dialog, alert, confirm, prompt, type DialogOptions } from "./components/dialog.js";
export { select, type SelectOptions, type SelectOptionInput } from "./components/select.js";
export { tabs, type Tab, type TabsOptions } from "./components/tabs.js";
export { textarea, type TextareaOptions } from "./components/textarea.js";
export { textline, type TextlineOptions, type TextlineType } from "./components/textline.js";
export { toast, type ToastOptions } from "./components/toast.js";
export { addTooltip, type TooltipOptions } from "./components/tooltip.js";
export type { FieldOptions } from "./components/field.js";

// Re-export theming and shared types for advanced use.
export type {ContentOptions, Bindable, Slot, Attributes} from "./core.js";

