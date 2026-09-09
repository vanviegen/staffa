import A from "aberdeen";
import { type ContentOptions, type Attributes, type Slot, drawSlot } from "../core.js";

/** Options for {@link form}. */
export interface FormOptions extends ContentOptions {
	/**
	 * Submit handler. Called with collected form data (keyed by each field's
	 * `name`) and the original event. `preventDefault()` is already called.
	 * Multi-value fields (e.g. multi-select) produce a `string[]`.
	 *
	 * **Return a promise and the form goes *busy* until it settles**: its submit
	 * buttons show a spinner and stop responding, and a second submit (Enter
	 * included) is ignored — so a slow save runs once, however impatient the user.
	 */
	submit?: (data: Record<string, string | string[]>, event: SubmitEvent) => unknown;
	/**
	 * Layout of fields. `"stacked"` (default) is a single column; `"grid"` packs
	 * fields into a responsive multi-column grid. A field can span the full grid
	 * width by adding the `.s-wide` class (e.g. `attrs: ".s-wide"`).
	 */
	layout?: "stacked" | "grid";
	/** Aberdeen attr/style string for the action bar. */
	actionsAttrs?: Attributes;
	/** Footer actions (typically a {@link import("./buttonGroup").buttonGroup} or buttons). */
	actions?: Slot;
}

A.insertGlobalCss({
	".s-form": {
		"&": "display:flex flex-direction:column gap:$3",
		"&.grid": "display:grid grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap:$3",
		"&.grid > .s-wide, &.grid > footer": "grid-column: 1 / -1;",
		"> footer": "display:flex align-items:center justify-content:flex-end gap:$2 flex-wrap:wrap margin-top:$1",
	},
});

/**
 * An opinionated `<form>` wrapper: fields in a single column by default, or a
 * responsive grid, plus a standard action bar. Field components
 * ({@link import("./textline").textline} et al.) drop straight in as
 * {@link ContentOptions.content}; the browser's native validation runs on submit,
 * but the page never reloads.
 *
 * @example
 * ```ts
 * const $user = A.proxy({name: "Darth", email: "d.vader@example.com"});
 * S.form({
 *   submit: () => save(),
 *   content: () => {
 *     S.textline({ label: "Name", required: true, bind: A.ref($user, "name") });
 *     S.textline({ label: "Email", type: "email", bind: A.ref($user, "email") });
 *   },
 *   actions: () => S.button({ content: "Save", type: "submit" }),
 * });
 * ```
 */
export function form(opts: FormOptions | Slot = {}): void {
	const o: FormOptions = typeof opts === "string" || typeof opts === "function" ? { content: opts } : opts;

	// Raised while an asynchronous `submit` is still running; the CSS in button.ts
	// turns the form's submit buttons into spinners off it.
	const $busy = A.proxy({ value: false });

	A(`form.s-form`, o.attrs, () => {
		// Own scope, so a layout change doesn't recreate the fields (losing focus/input state).
		A(() => {
			A(".grid=", o.layout === 'grid');
		});
		// Likewise: going busy must not redraw the fields being submitted.
		A(() => {
			if ($busy.value) A(".s-busy aria-busy=true");
		});

		A("submit=", (event: SubmitEvent) => {
			event.preventDefault();
			if (o.submit && !$busy.value) {
				const fd = new FormData(event.target as HTMLFormElement);
				const data: Record<string, string | string[]> = {};
				for (const key of new Set(fd.keys())) {
					const vals = fd.getAll(key) as string[];
					data[key] = vals.length === 1 ? vals[0]! : vals;
				}
				const result = o.submit(data, event) as PromiseLike<unknown> | undefined;
				if (result && typeof result.then === "function") {
					$busy.value = true;
					const done = () => { $busy.value = false; };
					// Rethrown from a promise nobody handles, so the error still
					// reaches the console the way an unawaited one would.
					Promise.resolve(result).then(done, (err) => { done(); throw err; });
				}
			}
		});

		drawSlot(o.content);

		// Own scope so toggling actions doesn't recreate the fields above.
		A(() => {
			if (o.actions) A("footer", o.actionsAttrs, () => drawSlot(o.actions));
		});
	});
}
