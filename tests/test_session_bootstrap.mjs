import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-bootstrap-"));
const env = { ...process.env, CLAUDE_PLUGIN_DATA: tmp };
const input = {
  session_id: "sess-123",
  cwd: root,
  source: "resume",
  dataforseo_password: "secret-value",
};

try {
  const output = execFileSync("node", ["scripts/session-bootstrap.mjs"], {
    cwd: root,
    env,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  const parsed = JSON.parse(output);
  const specific = parsed.hookSpecificOutput;
  assert.equal(specific.hookEventName, "SessionStart");
  assert.match(specific.additionalContext, /SEO Brain carregado/);
  assert.match(specific.additionalContext, /\/seo-brain:seo-brain/);
  assert.match(specific.additionalContext, /AGENTS\.md/);
  assert.doesNotMatch(specific.additionalContext, /secret-value/);

  const marker = JSON.parse(readFileSync(join(tmp, "session-status.json"), "utf8"));
  assert.equal(marker.loaded, true);
  assert.equal(marker.session_id, "sess-123");
  assert.equal(marker.source, "resume");
  assert.equal(marker.cwd, root);
  assert.ok(marker.loaded_at);
  assert.equal(marker.dataforseo_password, undefined);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("session bootstrap ok");
