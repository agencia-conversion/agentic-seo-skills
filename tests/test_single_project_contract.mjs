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
];

function files(path) {
  const full = join(root, path);
  const stat = statSync(full);
  if (stat.isFile()) return [full];
  return readdirSync(full).flatMap((entry) => files(join(path, entry)));
}

const findings = [];
for (const file of roots.flatMap(files)) {
  const text = readFileSync(file, "utf8");
  for (const token of banned) {
    if (text.includes(token)) findings.push(`${file.replace(root + "/", "")}: ${token}`);
  }
}

assert.deepEqual(findings, []);
console.log("single project contract ok");
