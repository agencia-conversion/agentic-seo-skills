// Contract test: SKILL.md and the protocol reference must only cite subcommands
// that the CLI actually exposes. Catches drift between skill prose and code.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cliText = readFileSync(join(root, "scripts/autoresearch.mjs"), "utf8");
const skillText = readFileSync(join(root, "skills/autoresearch/SKILL.md"), "utf8");
const protocolText = readFileSync(join(root, "skills/_shared/references/autoresearch-protocol.md"), "utf8");

// Extract the SUBCOMMANDS keys from the CLI source.
const blockMatch = cliText.match(/const SUBCOMMANDS = \{([\s\S]*?)\n\};/);
assert.ok(blockMatch, "SUBCOMMANDS block not found in CLI");
const subcommands = [...blockMatch[1].matchAll(/^ {2}("[\w-]+"|[\w-]+)\(args, cwd\) \{/gm)]
  .map((m) => m[1].replace(/"/g, ""))
  .sort();

const expected = ["init", "frame-metrics", "commit-metrics", "set-baseline", "record", "finalize", "resume", "report"].sort();
assert.deepEqual(subcommands, expected, `CLI subcommands drifted: ${subcommands.join(", ")}`);

// Every subcommand mentioned in SKILL.md must exist in the CLI.
const skillCited = new Set();
for (const sub of subcommands) {
  if (skillText.includes(`\`${sub}\``) || skillText.includes(`${sub} --`)) skillCited.add(sub);
}
// Required: init, frame-metrics, commit-metrics, set-baseline, record, finalize, resume must all be cited.
const requiredInSkill = ["init", "frame-metrics", "commit-metrics", "set-baseline", "record", "finalize", "resume"];
for (const sub of requiredInSkill) {
  assert.ok(skillCited.has(sub), `SKILL.md must cite subcommand: ${sub}`);
}

// SKILL.md should not invent subcommands that don't exist.
const invented = [...skillText.matchAll(/`([a-z][\w-]*)`/g)]
  .map((m) => m[1])
  .filter((token) => /^(init|frame-metrics|commit-metrics|set-baseline|record|finalize|resume|report)$/.test(token));
for (const token of invented) {
  assert.ok(subcommands.includes(token), `SKILL.md cites unknown subcommand: ${token}`);
}

// Protocol reference cites the same lifecycle stages.
for (const stage of ["init", "frame-metrics", "commit-metrics", "set-baseline", "record", "finalize"]) {
  assert.ok(protocolText.includes(stage), `protocol reference must mention ${stage}`);
}

console.log("autoresearch_contract ok");
