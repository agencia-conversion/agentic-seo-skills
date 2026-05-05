import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "seo-brain");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-reject-project-"));
const env = { ...process.env, SEO_BRAIN_PROJECT_DIR: join(tmp, "project") };

const result = spawnSync(bin, ["wiki-lint", "--project", "legacy"], {
  cwd: root,
  encoding: "utf8",
  env,
});

assert.equal(result.status, 1);
assert.match(result.stderr, /--project is no longer supported/);

rmSync(tmp, { recursive: true, force: true });
console.log("cli rejects project flag ok");
