import { defineConfig } from "shotest";

export default defineConfig({
	use: {
		baseURL: "http://localhost:25841/demo/",
		screenshot: "off", // ShoTest captures its own screenshots
		viewport: { width: 1280, height: 900 },
	},
	// The overlays test now reloads mid-run (to clear auto-dismissing toasts before
	// the dialog steps); with its many wrapped, screenshotted steps that lands it
	// around 15 s, so give every test comfortable headroom.
	timeout: 30000,
	workers: 1,
	webServer: [
		{
			// Serve the project root, so /demo/index.html can resolve ../dist and
			// ../node_modules through its import map. Run `npm run build` first.
			command: "exec npx http-server -p 25841 -s",
			port: 25841,
			reuseExistingServer: true,
		},
	],
});
