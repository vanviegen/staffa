import A from "aberdeen";
import { type BaseOptions, type Bindable, type Slot, type Styling, drawSlot, uniqueId } from "../core.js";

/**
 * Options shared by all *form field* components (textline, textarea, checkbox,
 * autocomplete, ...).
 *
 * Fields share a consistent vertical layout: an optional label, the control
 * itself, and optional help/error text below it. {@link form} relies on this
 * shared structure to align groups of fields.
 */
export interface FieldOptions extends BaseOptions {
	/** Visible label, associated with the control via `for`/`id` for a11y. */
	label?: Slot;
	/** Helper text shown beneath the control. */
	help?: Slot;
	/**
	 * Error message shown beneath the control. When set, the control is marked
	 * `aria-invalid` and styled accordingly. May be reactive.
	 */
	error?: string;
	/** Disables the control. */
	disabled?: boolean;
	/** Marks the field required (adds a `*` and the `aria-required` attribute). */
	required?: boolean;
	/** The `name` attribute, for native form submission. */
	name?: string;
	/** Explicit id for the control; auto-generated when omitted. */
	id?: string;
	/** Aberdeen attr/style string applied to the control element itself. */
	control?: Styling;
}

A.insertGlobalCss({
	".S_field": {
		"&": "display:flex flex-direction:column gap:$1",
		"> label": "font-weight:600 font-size:0.9em fg:$sFg user-select:none",
	},
	// Shared, reusable bits (also used by checkbox & autocomplete).
	".S_req": "fg:$sDanger margin-left:2px",
	".S_help": "font-size:0.82em fg:$sFgMuted",
	".S_error": "font-size:0.82em fg:$sDanger",
	// Shared look for text-like controls.
	".S_input": {
		"&": "w:100% bg:$sSurface fg:$sFg border: 1px solid $sBorder; r:$sRadius padding: 0.55em 0.7em; transition: border-color 0.15s, box-shadow 0.15s;",
		"&:hover:not(:disabled)": "border-color:$sBorderStrong",
		"&:focus-visible": "border-color:$sPrimary box-shadow: 0 0 0 3px $sFocus; outline:none",
		"&:disabled": "opacity:0.6 cursor:not-allowed",
		"&[aria-invalid=true]": "border-color:$sDanger",
	},
});

/**
 * Render the standard field chrome (label + control + help/error) around a
 * caller-supplied control.
 *
 * Each piece is read inside its own small reactive scope, so e.g. flipping
 * `error` on a proxied options object only re-renders the error line — not the
 * control.
 *
 * @param opts The field options.
 * @param drawControl Receives the resolved `id` and the live "invalid" getter,
 *   and must draw the actual control element (using class `S_input` where
 *   appropriate, and passing `opts.control` as an arg for caller styling).
 */
export function drawField(
	opts: FieldOptions,
	drawControl: (id: string, isInvalid: () => boolean) => void,
): void {
	const id = opts.id ?? uniqueId("field");
	const isInvalid = () => !!opts.error;

	A("div.S_field", opts.root, () => {
		A(() => {
			if (opts.label != null) {
				A(`label for=${id}`, () => {
					drawSlot(opts.label);
					if (opts.required) A("span.S_req aria-hidden=true #*");
				});
			}
		});

		drawControl(id, isInvalid);

		A(() => {
			if (opts.help != null && !opts.error) A("div.S_help", () => drawSlot(opts.help));
		});
		A(() => {
			if (opts.error) A("div.S_error role=alert #", opts.error);
		});
	});
}

/**
 * Apply the shared, reactive control attributes (`id`, `name`, `disabled`,
 * `required`, `aria-invalid`, `bind`) to the current element. The dynamic ones
 * each get their own scope so the control element is never recreated.
 */
export function applyControlAttrs(
	opts: FieldOptions,
	id: string,
	isInvalid: () => boolean,
	bind?: Bindable<unknown>,
): void {
	A(`id=${id}`);
	if (opts.name) A(`name=${opts.name}`);
	A(() => {
		if (opts.disabled) A("disabled=true");
	});
	A(() => {
		if (opts.required) A("aria-required=true");
	});
	A(() => A("aria-invalid=", isInvalid() ? "true" : "false"));
	if (bind) A("bind=", bind);
}
