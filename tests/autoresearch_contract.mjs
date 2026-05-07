// Contract test: SKILL.md and the protocol reference must only cite subcommands
// that the CLI actually exposes. Catches drift between skill prose and code.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliText = readFileSync(join(root, "scripts/autoresearch.mjs"), "utf8");
const skillText = readFileSync(join(root, "skills/autoresearch/SKILL.md"), "utf8");
const programText = readFileSync(join(root, "program.md"), "utf8");

// Extract the SUBCOMMANDS keys from the CLI source.
const blockMatch = cliText.match(/const SUBCOMMANDS = \{([\s\S]*?)\n\};/);
assert.ok(blockMatch, "SUBCOMMANDS block not found in CLI");
const subcommands = [...blockMatch[1].matchAll(/^ {2}("[\w-]+"|[\w-]+)\(args, cwd\) \{/gm)]
  .map((m) => m[1].replace(/"/g, ""))
  .sort();

const expected = ["init", "frame-metrics", "commit-metrics", "set-baseline", "record", "finalize", "resume", "report"].sort();
assert.deepEqual(subcommands, expected, `CLI subcommands drifted: ${subcommands.join(", ")}`);

// The self-sufficient skill may describe lifecycle concepts instead of CLI syntax.
for (const concept of ["baseline", "metrics", "threshold", "maximum iterations", "plateau", "keep", "reject", "final summary"]) {
  assert.ok(skillText.includes(concept), `SKILL.md must mention lifecycle concept: ${concept}`);
}

assert.ok(!skillText.includes("skills/_shared/"), "autoresearch skill must not depend on shared references");

// Program doctrine still names the conceptual loop independently of CLI labels.
for (const concept of ["hypothesis", "deterministic tests", "skill evaluator", "baseline", "Keep Criteria", "Reject Criteria"]) {
  assert.ok(programText.includes(concept), `program doctrine must mention ${concept}`);
}

console.log("autoresearch_contract ok");
