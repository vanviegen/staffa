import { defineConfig } from "shotest";

export default defineConfig({
	use: {
		baseURL: "http://localhost:25841/demo/",
		screenshot: "off", // ShoTest captures its own screenshots
		viewport: { width: 1280, height: 900 },
	},
	timeout: 15000,
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
