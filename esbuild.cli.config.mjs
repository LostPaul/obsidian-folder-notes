import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

esbuild.build({
	entryPoints: ["./src/cli/folder-notes.ts"],
	bundle: true,
	platform: "node",
	format: "cjs",
	target: "node16",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	outfile: "dist/folder-notes-cli.cjs",
	external: [...builtins, ...builtins.map((name) => `node:${name}`)],
	banner: {
		js: "#!/usr/bin/env node",
	},
}).catch(() => process.exit(1));
