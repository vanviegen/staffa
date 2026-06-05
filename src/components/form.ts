import A from "aberdeen";
import { type Content, type ContentOptions, type Styling } from "../core.js";

/** Options for {@link form}. */
export interface FormOptions extends ContentOptions {
	/**
	 * Submit handler. Called with collected form data (keyed by each field's
	 * `name`) and the original event. `preventDefault()` is already called.
	 * Multi-value fields (e.g. multi-select) produce a `string[]`.
	 */
	submit?: (data: Record<string, string | string[]>, event: SubmitEvent) => void;
	/**
	 * Layout of fields. `"stacked"` (default) is a single column; `"grid"` packs
	 * fields into a responsive multi-column grid. A field can span the full grid
	 * width by adding the `.s-wide` class (e.g. `root: ".s-wide"`).
	 */
	layout?: "stacked" | "grid";
	/** Aberdeen attr/style string for the action bar. */
	actionsInner?: Styling;
	/** Footer actions (typically a {@link import("./buttonGroup").buttonGroup} or buttons). */
	actions?: Content;
}

A.insertGlobalCss({
	".s-form": {
		"&": "display:flex flex-direction:column gap:$3",
		"&.grid": "display:grid grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap:$3",
		"&.grid > .s-wide, &.grid > footer": "grid-column: 1 / -1;",
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

	A(`form.s-form`, o.root, o.inner, () => {
		// Toggle grid class in its own scope so changing layout doesn't recreate
		// the fields (which would lose focus / input state).
		A(() => {
			A(".grid=", o.layout === 'grid');
		});

		A("submit=", (event: SubmitEvent) => {
			event.preventDefault();
			if (o.submit) {
				const fd = new FormData(event.target as HTMLFormElement);
				const data: Record<string, string | string[]> = {};
				for (const key of new Set(fd.keys())) {
					const vals = fd.getAll(key) as string[];
					data[key] = vals.length === 1 ? vals[0]! : vals;
				}
				o.submit(data, event);
			}
		});

		if (o.content) o.content();

		// Own scope so toggling actions doesn't recreate the fields above.
		A(() => {
			if (o.actions) A("footer", o.actionsInner, () => o.actions?.());
		});
	});
}
