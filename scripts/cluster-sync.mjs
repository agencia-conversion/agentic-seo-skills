#!/usr/bin/env node
// CLI wrapper for the cluster-sync engine. Delegates to dist/commands/cluster-sync.js.
// Run `npm run build` first; this wrapper exits with a clear error if the build is missing.

import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const distEntry = resolve(pluginRoot, "dist", "commands", "cluster-sync.js");

if (!existsSync(distEntry)) {
  console.error(
    "Build artifact missing: dist/commands/cluster-sync.js. Run `npm run build` first.",
  );
  process.exit(2);
}

const require = createRequire(import.meta.url);
const mod = require(distEntry);
const code = await mod.runCli(process.argv.slice(2));
process.exit(code);
