import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-install-statusline-"));
const settings = join(tmp, "settings.json");
const wrapperDir = join(tmp, "wrappers");
const data = join(tmp, "data");
  const env = {
  ...process.env,
  AGENTIC_SEO_CLAUDE_SETTINGS: settings,
  AGENTIC_SEO_STATUSLINE_DIR: wrapperDir,
  AGENTIC_SEO_PLUGIN_DATA: data,
  CLAUDE_PLUGIN_DATA: data,
};

function install(...args) {
  return JSON.parse(execFileSync("node", ["scripts/install-statusline.mjs", ...args], {
    cwd: root,
    env,
    encoding: "utf8",
  }));
}

try {
  const dry = install("--dry-run");
  assert.equal(dry.mode, "dry-run");
  assert.equal(existsSync(settings), false);

  const applied = install("--apply");
  const saved = JSON.parse(readFileSync(settings, "utf8"));
  assert.equal(applied.preserved_existing, false);
  assert.equal(saved.statusLine.command, join(wrapperDir, "statusline-wrapper.sh"));

  writeFileSync(settings, JSON.stringify({ statusLine: { type: "command", command: "printf 'OLD LINE\\n'" } }), "utf8");
  const preserved = install("--apply");
  assert.equal(preserved.preserved_existing, true);
  mkdirSync(data, { recursive: true });
  writeFileSync(join(data, "session-status.json"), JSON.stringify({ loaded: true }), "utf8");
  const line = execFileSync(join(wrapperDir, "statusline-wrapper.sh"), {
    env,
    input: JSON.stringify({ workspace: { project_dir: "/tmp/projeto" } }),
    encoding: "utf8",
  });
  assert.equal(line, "OLD LINE | Agentic SEO: carregado | projeto\n");

  const repeat = install("--apply");
  assert.equal(repeat.already_installed, true);
  const repeatedLine = execFileSync(join(wrapperDir, "statusline-wrapper.sh"), {
    env,
    input: JSON.stringify({ workspace: { project_dir: "/tmp/projeto" } }),
    encoding: "utf8",
  });
  assert.equal(repeatedLine, "OLD LINE | Agentic SEO: carregado | projeto\n");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("install statusline ok");
