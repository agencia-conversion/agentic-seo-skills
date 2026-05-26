import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const roots = [
  "README.md",
  "AGENTS.md",
  "CHANGELOG.md",
  "program.md",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  ".gitignore",
  "agents",
  "docs",
  "skills",
  "templates",
];
const banned = [
  "projects/[",
  "projects/<",
  "projects/",
  "--project",
  "project slug",
  "project-slug",
  "project_slug",
  "multi-project",
  "Multi-Project",
  "default_projects_dir",
  "project/reports/",
  "reports/technical-seo/",
  "../reports/",
];

// Files that legitimately reference workspace-mirror or historical specs.
// Excluding them keeps the "single project" contract enforced for new code
// while allowing existing meta-docs and operational paths.
const EXCLUDED = new Set([
  "docs/project-persistence.md",        // documents the Conductor mirror path (multi-workspace by design)
  "docs/refactor-status.md",            // meta-doc that discusses past contract migrations
  "docs/specs/topic-clusters-iteracao-3.md", // historical internal spec referencing test names
]);

function files(path) {
  const full = join(root, path);
  const stat = statSync(full);
  if (stat.isFile()) return [full];
  return readdirSync(full).flatMap((entry) => files(join(path, entry)));
}

const findings = [];
for (const file of roots.flatMap(files)) {
  const rel = file.replace(root + "/", "");
  if (EXCLUDED.has(rel)) continue;
  const text = readFileSync(file, "utf8");
  for (const token of banned) {
    if (text.includes(token)) findings.push(`${rel}: ${token}`);
  }
}

assert.deepEqual(findings, []);
console.log("single project contract ok");
