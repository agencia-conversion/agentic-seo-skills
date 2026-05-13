import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "agentic-seo");
const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-reject-project-"));
const env = { ...process.env, AGENTIC_SEO_PROJECT_DIR: join(tmp, "project") };

const result = spawnSync(bin, ["brain-lint", "--project", "legacy"], {
  cwd: root,
  encoding: "utf8",
  env,
});

assert.equal(result.status, 1);
assert.match(result.stderr, /--project is no longer supported/);

for (const removedCommand of ["next-website-creator", "payload-cms"]) {
  const removed = spawnSync(bin, [removedCommand], {
    cwd: root,
    encoding: "utf8",
    env,
  });
  assert.equal(removed.status, 1);
  assert.match(removed.stderr, new RegExp(`Unknown command: ${removedCommand}`));
}

rmSync(tmp, { recursive: true, force: true });
console.log("cli command rejection ok");
