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
  assert.equal(json.next_handoff_command, undefined);
  assert.deepEqual(
    {
      type: json.next_action.type,
      handoff: json.next_action.handoff,
      user_instruction: json.next_action.user_instruction,
    },
    {
      type: "browser-handoff",
      handoff: "approve-briefing",
      user_instruction: "Revise e aprove o briefing na página local aberta pelo agente.",
    },
  );
  assert.equal(json.next_action.project_root, projectDir);
  assert.ok(json.next_action.brief.endsWith("seo-sem-serp.brief.json"));
}

rmSync(tmp, { recursive: true, force: true }); console.log("content seo process ok");
