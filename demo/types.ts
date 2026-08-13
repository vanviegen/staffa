/**
 * Type-level assertions for the routed `S.main()` API. Nothing in here is meant
 * to run — the file exists so `npm run typecheck` fails the moment route-key
 * param inference regresses.
 */
import * as S from "staffa";

/** True only when `A` and `B` are exactly the same type. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Fails to compile unless the assertion type is `true`. */
function assert<_T extends true>(): void {}

S.main({
	routes: {
		// A plain `[param]` is a string...
		"/icons/[name]": ($page) => {
			assert<Exact<typeof $page.params.name, string>>();
			assert<Exact<typeof $page.path, string>>();
			// @ts-expect-error — `bogus` isn't a param of this route.
			$page.params.bogus;
		},
		// ...an `=integer` one is a number, and both are inferred from the same key.
		"/projects/[projectId]/tasks/[taskId=integer]": ($page) => {
			assert<Exact<typeof $page.params.projectId, string>>();
			assert<Exact<typeof $page.params.taskId, number>>();
		},
		// A trailing `[...rest]` collects the rest of the path as one raw string.
		"/files/[...path]": ($page) => {
			assert<Exact<typeof $page.params.path, string>>();
		},
		// Brackets only count when they are the whole segment.
		"/v[1]beta": ($page) => {
			// @ts-expect-error — a literal segment, not a param.
			$page.params.anything;
		},
		// An unknown matcher types as `never`, so using the param is an error.
		// (The route key itself throws at mount time.)
		"/x/[id=bogus]": ($page) => {
			assert<Exact<typeof $page.params.id, never>>();
		},
		// A route without params has no params at all.
		"/settings": ($page) => {
			// @ts-expect-error — nothing to destructure here.
			$page.params.anything;
			$page.layout = "small";
			$page.layout = "large";
			// @ts-expect-error — the only three layouts there are.
			$page.layout = "third";
		},
	},
	notFound: ($page) => {
		assert<Exact<typeof $page.path, string>>();
		// @ts-expect-error — an unmatched path carries no params.
		$page.params.anything;
	},
	stacking: false,
});

// A plain, non-routed shell keeps inferring exactly as it always did.
S.main({
	title: "Plain",
	maxWidth: "48rem",
	content: () => {},
});

// The programmatic helpers.
export function useHelpers(): void {
	S.panels.push("/projects/7");
	S.panels.replace("/projects/8");
	void S.panels.close();
	// With a path: that panel, spliced out when it isn't the top one.
	assert<Exact<ReturnType<typeof S.panels.close>, Promise<boolean>>>();
	void S.panels.close("/projects/7");
	assert<Exact<typeof S.panels.stack, readonly string[]>>();
}

// An explicitly typed handler, for apps that draw their pages in named functions.
export function drawTask($page: S.Page<{ projectId: string; taskId: number }>): void {
	assert<Exact<typeof $page.params.taskId, number>>();
	$page.title = `Task ${$page.params.taskId}`;
	$page.requestClose = async () => true;
	// A page closes itself; the shell has no close chrome of its own.
	assert<Exact<ReturnType<typeof $page.close>, Promise<boolean>>>();
	S.box({ header: "Task", close: true, content: () => {} });
	S.box({ close: () => void $page.close(), content: () => {} });
}
