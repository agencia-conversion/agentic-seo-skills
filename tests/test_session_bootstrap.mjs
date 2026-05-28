import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-bootstrap-"));
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
  assert.match(specific.additionalContext, /Agentic SEO carregado/);
  assert.match(specific.additionalContext, /\/agentic-seo:agentic-seo/);
  assert.match(specific.additionalContext, /AGENTS\.md/);
  assert.match(specific.additionalContext, /report_md/);
  assert.match(specific.additionalContext, /artifact_path/);
  assert.match(specific.additionalContext, /companion_path/);
  assert.match(specific.additionalContext, /companion_slug/);
  assert.match(specific.additionalContext, /browser_prompt/);
  assert.match(specific.additionalContext, /Posso abrir o Web Companion para você ver a análise\?/);
  assert.match(specific.additionalContext, /Posso abrir o Web Companion para você revisar esta entrega\?/);
  assert.match(specific.additionalContext, /content-seo/);
  assert.match(specific.additionalContext, /content-import/);
  assert.match(specific.additionalContext, /brain-keeper/);
  assert.match(specific.additionalContext, /spec-driven/);
  assert.match(specific.additionalContext, /project\/analyses\//);
  assert.match(specific.additionalContext, /humanos primeiro/);
  assert.match(specific.additionalContext, /project\/\.agentic-seo\/project\.json\.language/);
  assert.match(specific.additionalContext, /JSON bruto/);
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
