import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-statusline-"));
const env = { ...process.env, CLAUDE_PLUGIN_DATA: tmp };
const input = JSON.stringify({ workspace: { project_dir: "/tmp/projeto-seo" } });

function run() {
  return execFileSync("node", ["scripts/statusline.mjs"], {
    cwd: root,
    env,
    input,
    encoding: "utf8",
  });
}

try {
  assert.equal(run(), "Agentic SEO: não carregado | projeto-seo\n");
  mkdirSync(tmp, { recursive: true });
  writeFileSync(join(tmp, "session-status.json"), JSON.stringify({ loaded: true }), "utf8");
  assert.equal(run(), "Agentic SEO: carregado | projeto-seo\n");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("statusline ok");
