// Build-time code generator: turns the SVG files shipped by `lucide-static`
// into a single tree-shakable TypeScript module at `src/icons.ts`.
//
// For every `node_modules/lucide-static/icons/<name>.svg` we grab the markup
// *inside* the `<svg>` tag (the `<path>`/`<circle>`/… primitives) and emit a
// camelCased export that draws that icon into the DOM. The rendering logic
// itself lives in the hand-written `src/icons-helpers.ts`; this file only
// emits the (huge) list of `mk(...)` exports that reference it.
//
// Run via `npm run build:icons` (it also runs as part of `npm run build`).

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const iconsDir = join(root, "node_modules", "lucide-static", "icons");
const outFile = join(root, "src", "icons.ts");

// JS reserved words that can't be used as a binding name (e.g. lucide's
// `delete.svg` and `import.svg`). These get a leading underscore.
const RESERVED = new Set([
	"break", "case", "catch", "class", "const", "continue", "debugger", "default",
	"delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
	"function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
	"switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
	"let", "static", "yield", "await", "implements", "interface", "package", "private",
	"protected", "public",
]);

/** `phone-off` → `phoneOff`; guards against reserved words and a leading digit. */
function toCamelCase(name) {
	let id = name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
	if (/^[0-9]/.test(id) || RESERVED.has(id)) id = "_" + id;
	return id;
}

/** Extract the markup between `<svg …>` and `</svg>`, collapsed onto one line. */
function extractInner(svg) {
	const match = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i);
	if (!match) return null;
	return match[1]
		.replace(/\s+/g, " ")   // newlines + indentation → single spaces
		.replace(/>\s+</g, "><") // drop whitespace between sibling tags
		.trim();
}

/** Escape for embedding inside a single-quoted JS string literal. */
function escape(str) {
	return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const files = readdirSync(iconsDir)
	.filter((f) => f.endsWith(".svg"))
	.sort();

const exports = [];
const seen = new Set();
for (const file of files) {
	const inner = extractInner(readFileSync(join(iconsDir, file), "utf8"));
	if (!inner) {
		console.warn(`Skipping ${file}: no <svg> contents found`);
		continue;
	}
	const name = toCamelCase(file.slice(0, -".svg".length));
	// Some lucide files are legacy aliases that camelCase to a name we already
	// emitted (e.g. `arrow-down-01` → `arrowDown01`, aliasing `arrow-down-0-1`).
	// Files are processed in sorted order, so the first (canonical) one wins.
	if (seen.has(name)) {
		console.warn(`Skipping ${file}: name "${name}" already taken`);
		continue;
	}
	seen.add(name);
	exports.push(`export const ${name} = /*@__PURE__*/ mk('${escape(inner)}');`);
}

const header = `// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                                                                            ║
// ║   THIS FILE IS GENERATED — DO NOT EDIT.                                     ║
// ║                                                                            ║
// ║   It is produced from the \`lucide-static\` icon set by                      ║
// ║   \`scripts/generate-icons.mjs\` (run via \`npm run build:icons\`). Any edits   ║
// ║   you make here will be overwritten on the next build. To change an icon,  ║
// ║   change the generator instead. The rendering logic lives in the           ║
// ║   hand-written \`icons-helpers.ts\`.                                          ║
// ║                                                                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝

import { mk } from "./icons-helpers.js";

export type { IconCap, IconJoin, IconOptions, IconDefaults } from "./icons-helpers.js";
export { setDefaults } from "./icons-helpers.js";
`;

const banner = `// ─── Icons ${"─".repeat(67)}\n`;
writeFileSync(outFile, header + "\n" + banner + "\n" + exports.join("\n") + "\n");
console.log(`Wrote ${exports.length} icons to src/icons.ts`);
