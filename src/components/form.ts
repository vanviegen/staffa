import A from "aberdeen";
import { type Content, type ContentOptions, type Styling } from "../core.js";

/** Options for {@link form}. */
export interface FormOptions extends ContentOptions {
	/**
	 * Submit handler. The native event is passed and `preventDefault()` is called
	 * automatically, so you can drive submission from your own state.
	 */
	submit?: (event: SubmitEvent) => void;
	/**
	 * Layout of fields. `"stacked"` (default) is a single column; `"grid"` packs
	 * fields into a responsive multi-column grid. A field can span the full grid
	 * width by adding the `.S_wide` class (e.g. `root: ".S_wide"`).
	 */
	layout?: "stacked" | "grid";
	/** Aberdeen attr/style string for the action bar. */
	actionsInner?: Styling;
	/** Footer actions (typically a {@link import("./buttonGroup").buttonGroup} or buttons). */
	actions?: Content;
}

A.insertGlobalCss({
	".S_form": {
		"&": "display:flex flex-direction:column gap:$3",
		"&.S_grid": "display:grid grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap:$3",
		"&.S_grid > .S_wide, &.S_grid > footer": "grid-column: 1 / -1;",
		"> footer": "display:flex align-items:center gap:$2 flex-wrap:wrap margin-top:$1",
	},
});

/**
 * An opinionated `<form>` wrapper that lays its fields out consistently — a clean
 * single column by default, or a responsive grid — and provides a standard
 * action bar.
 *
 * Field components ({@link import("./textline").textline} et al.) drop straight
 * in as {@link ContentOptions.content}. Submission is wired so the browser's
 * native validation runs, but the page never reloads.
 *
 * @example
 * ```ts
 * S.form({
 *   submit: () => save(),
 *   content: () => {
 *     S.textline({ label: "Name", required: true, bind: A.ref($u, "name") });
 *     S.textline({ label: "Email", type: "email", bind: A.ref($u, "email") });
 *   },
 *   actions: () => S.button({ text: "Save", type: "submit" }),
 * });
 * ```
 */
export function form(opts: FormOptions | Content = {}): void {
	const o: FormOptions = typeof opts === "function" ? { content: opts } : opts;
	const cls = o.layout === "grid" ? ".S_grid" : "";

	A(`form.S_form${cls}`, o.root, o.inner, () => {
		A("submit=", (event: SubmitEvent) => {
			event.preventDefault();
			o.submit?.(event);
		});

		if (o.content) o.content();

		// Own scope so toggling actions doesn't recreate the fields above.
		A(() => {
			if (o.actions) A("footer", o.actionsInner, () => o.actions?.());
		});
	});
}
