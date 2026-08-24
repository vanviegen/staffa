import { defineConfig } from "shotest";

export default defineConfig({
	use: {
		baseURL: "http://localhost:25841/demo/",
		screenshot: "off", // ShoTest captures its own screenshots
		viewport: { width: 1280, height: 900 },
	},
	// Each test walks one long session, so several run to 10-14 s (the overlays
	// one also reloads mid-run, to clear auto-dismissing toasts before its dialog
	// steps). Give them comfortable headroom.
	timeout: 30000,
	workers: 1,
	webServer: [
		{
			// Serve the project root, so /demo/index.html can resolve /dist and
			// /node_modules through its import map. Run `npm run build` first.
			// `-P` is http-server's fallback proxy: the demo's routed URLs
			// (/demo/icons/heart, ...) are 404s on disk, so they're served the demo
			// page instead — the SPA fallback deep links and reloads need.
			command: 'exec npx http-server -p 25841 -s -P "http://localhost:25841/demo/index.html?"',
			port: 25841,
			reuseExistingServer: true,
		},
	],
});
