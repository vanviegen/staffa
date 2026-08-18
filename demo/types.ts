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
		"/icons/[name]": ($panel) => {
			assert<Exact<typeof $panel.params.name, string>>();
			assert<Exact<typeof $panel.path, string>>();
			// @ts-expect-error — `bogus` isn't a param of this route.
			$panel.params.bogus;
		},
		// ...an `=integer` one is a number, and both are inferred from the same key.
		"/projects/[projectId]/tasks/[taskId=integer]": ($panel) => {
			assert<Exact<typeof $panel.params.projectId, string>>();
			assert<Exact<typeof $panel.params.taskId, number>>();
		},
		// A trailing `[...rest]` collects the rest of the path as one raw string.
		"/files/[...path]": ($panel) => {
			assert<Exact<typeof $panel.params.path, string>>();
		},
		// Brackets only count when they are the whole segment.
		"/v[1]beta": ($panel) => {
			// @ts-expect-error — a literal segment, not a param.
			$panel.params.anything;
		},
		// An unknown matcher types as `never`, so using the param is an error.
		// (The route key itself throws at mount time.)
		"/x/[id=bogus]": ($panel) => {
			assert<Exact<typeof $panel.params.id, never>>();
		},
		// A route without params has no params at all.
		"/settings": ($panel) => {
			// @ts-expect-error — nothing to destructure here.
			$panel.params.anything;
			$panel.maxWidth = "half";
			$panel.maxWidth = "screen";
			// @ts-expect-error — the only three bounds there are.
			$panel.maxWidth = "third";
		},
		// The chrome a page declares, which the shell then places.
		"/chrome": ($panel) => {
			$panel.title = "Chrome";
			$panel.actions = () => {};
			$panel.actions = "some **rich** text";
			// @ts-expect-error — retired: the breadcrumbs are every page's way out.
			$panel.closeable = false;
			// The shell's own facts about the page: readable, never assignable.
			assert<Exact<typeof $panel.width, number>>();
			assert<Exact<typeof $panel.visible, boolean>>();
			// @ts-expect-error — the shell resolves the width; the page asks with maxWidth.
			$panel.width = 400;
			// @ts-expect-error — likewise for whether the page is on screen.
			$panel.visible = false;
		},
	},
	notFound: ($panel) => {
		assert<Exact<typeof $panel.path, string>>();
		// @ts-expect-error — an unmatched path carries no params.
		$panel.params.anything;
	},
	// `ancestors` is keyed by the same templates, and types each entry's params
	// from its own key — so it never has to take the path apart again.
	ancestors: {
		"/projects/[projectId]/tasks/[taskId=integer]": (params, path) => {
			assert<Exact<typeof params.projectId, string>>();
			assert<Exact<typeof params.taskId, number>>();
			assert<Exact<typeof path, string>>();
			return [`/projects/${params.projectId}`];
		},
		// Saying nothing leaves the path to the parent-path derivation.
		"/icons/[name]": () => undefined,
	},
	stacking: false,
});

// A key that isn't in the route table is a typo, and typos are type errors.
// The directive sits on the call rather than the key: with `main()` overloaded
// on whether `routes` is present, a bad key fails overload resolution, and TS
// reports that against the call.
// @ts-expect-error — no such route: "/projekts/[id]".
S.main({
	routes: { "/projects/[id]": () => {} },
	ancestors: { "/projekts/[id]": () => [] },
});

// A plain, non-routed shell keeps inferring exactly as it always did.
S.main({
	title: "Plain",
	maxWidth: "48rem",
	logo: "✦",
	// Outside routed mode nothing competes for the line under the app's name, so
	// a tagline there simply always shows.
	subtitle: "a tagline",
	content: () => {},
});

// The nav is a sidebar on one side or the other, collapsing to a ☰ when the shell
// is narrow. The always-a-button mode is retired, so that "narrow" and "the nav
// is collapsed" stay one and the same thing.
S.main({
	nav: { items: [] },
	navPosition: "right",
	content: () => {},
});
S.main({
	nav: { items: [] },
	// @ts-expect-error — no such nav position.
	navPosition: "button",
	content: () => {},
});

// The stack `S.main()` hands back in routed mode, and what it can do.
export function useStack(shell: S.PanelStack): void {
	void shell.pushPanel("/projects/7");
	void shell.replacePanel("/projects/8");
	void shell.openPanelStack("/thread/8", ["/mailbox/2"]);
	void shell.closePanel();
	// Every navigation settles asynchronously, and every method says whether
	// it landed — closing and opening alike.
	assert<Exact<ReturnType<typeof shell.pushPanel>, Promise<boolean>>>();
	assert<Exact<ReturnType<typeof shell.replacePanel>, Promise<boolean>>>();
	assert<Exact<ReturnType<typeof shell.openPanelStack>, Promise<boolean>>>();
	assert<Exact<ReturnType<typeof shell.closePanel>, Promise<boolean>>>();
	// With a path: that panel, spliced out when it isn't the top one.
	void shell.closePanel("/projects/7");
	// The stack's type is its documented surface and nothing else: the class
	// behind it (crumbs, columns, the commit pipeline) is not API.
	// @ts-expect-error — not part of the PanelStack interface.
	shell.drawCrumbs;
	// @ts-expect-error — neither is this.
	shell.navigate;
	// The panels themselves, not a copy of their paths — so they can be written
	// through, which is the only way to pin one from outside its own handler.
	assert<Exact<typeof shell.panels, readonly S.Panel[]>>();
	assert<Exact<typeof shell.currentPanelIndex, number>>();
	assert<Exact<typeof shell.currentPanel, S.Panel | undefined>>();
	if (shell.panels[0]) shell.panels[0].pinned = true;
	// Read-only to the app, even from out here.
	// @ts-expect-error — `path` is read-only.
	shell.panels[0].path = "/nope";
}

// Routed mode hands the stack back; a plain shell has none to hand back.
export function returnTypes(): void {
	const routed = S.main({ routes: { "/projects/[id]": () => {} } });
	assert<Exact<typeof routed, S.PanelStack>>();
	const plain = S.main({ title: "Plain", content: () => {} });
	assert<Exact<typeof plain, void>>();
}

// An explicitly typed handler, for apps that draw their pages in named functions.
export function drawTask($panel: S.Panel<{ projectId: string; taskId: number }>): void {
	assert<Exact<typeof $panel.params.taskId, number>>();
	$panel.title = `Task ${$panel.params.taskId}`;
	$panel.unsaved = true;
	// @ts-expect-error — requestClose is gone; `unsaved` replaced it.
	$panel.requestClose = async () => true;
	// The shell draws this page's way out, but a page can still close itself.
	assert<Exact<ReturnType<typeof $panel.close>, Promise<boolean>>>();
	// @ts-expect-error — a box's ✕ is plain furniture now: it takes a callback,
	// and no longer closes the page it happens to sit in.
	S.box({ header: "Task", close: true, content: () => {} });
	S.box({ close: () => void $panel.close(), content: () => {} });
}
