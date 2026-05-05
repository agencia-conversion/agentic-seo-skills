import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const bin = join(root, "bin", "seo-brain");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-process-"));
const projectDir = join(tmp, "project");

function run(args) {
  return spawnSync(bin, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, SEO_BRAIN_PROJECT_DIR: projectDir },
  });
}

run(["project-init", "Process Test"]);

{
  const res = run(["content-seo", "--topic", "SEO sem SERP", "--skip-data", "--skip-data-reason", "homepage only"]);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /--skip-data-confirmed/);
}

{
  const res = run(["content-seo", "--topic", "SEO sem SERP", "--skip-data", "--skip-data-confirmed", "--skip-data-reason", "usuario pediu sem SERP", "--brief-approval", "manual"]);
  assert.equal(res.status, 0, res.stderr);
  const json = JSON.parse(res.stdout);
  assert.equal(json.process_bypass.step, "seo-analysis");
  assert.equal(json.process_bypass.confirmed, true);
  assert.equal(json.draft_status, "briefing");
  assert.ok(json.next_handoff_command.includes("--project-root"));
}

rmSync(tmp, { recursive: true, force: true }); console.log("content seo process ok");
