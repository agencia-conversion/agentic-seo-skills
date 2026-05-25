#!/usr/bin/env node
import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const projectDir = path.join(root, "project");
const args = new Set(process.argv.slice(2));
const command = process.argv.slice(2).find((arg) => !arg.startsWith("--")) || "status";
const quiet = args.has("--quiet");

function git(...argv) {
  const result = spawnSync("git", argv, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function slugify(value) {
  const base = String(value || root)
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const hash = createHash("sha1").update(String(value || root)).digest("hex").slice(0, 8);
  return `${base || "local"}-${hash}`;
}

function storeRoot() {
  return path.resolve(
    process.env.AGENTIC_SEO_PERSIST_ROOT ||
      path.join(homedir(), "Library", "Application Support", "Agentic SEO", "projects"),
  );
}

function storeDir() {
  const remote = git("config", "--get", "remote.origin.url") || git("rev-parse", "--show-toplevel") || root;
  return path.join(storeRoot(), slugify(remote), "project");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function hasProjectContent(dir) {
  if (!fs.existsSync(dir)) return false;
  const entries = fs.readdirSync(dir).filter((name) => name !== ".gitkeep" && name !== ".DS_Store");
  return entries.length > 0;
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(child);
    else count += 1;
  }
  return count;
}

function latestMtimeMs(dir) {
  if (!fs.existsSync(dir)) return null;
  let latest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const child = path.join(dir, entry.name);
    const stat = fs.statSync(child);
    latest = Math.max(latest, stat.mtimeMs);
    if (entry.isDirectory()) latest = Math.max(latest, latestMtimeMs(child) || 0);
  }
  return latest || null;
}

function latestMtime(dir) {
  const ms = latestMtimeMs(dir);
  return ms ? new Date(ms).toISOString() : null;
}

function backup(dir, label) {
  if (!hasProjectContent(dir)) return null;
  const backupDir = path.join(path.dirname(storeDir()), "backups", `${new Date().toISOString().replace(/[:.]/g, "-")}-${label}`);
  ensureDir(path.dirname(backupDir));
  fs.cpSync(dir, backupDir, { recursive: true, force: true, errorOnExist: false });
  return backupDir;
}

function mirror(src, dest) {
  if (!hasProjectContent(src)) throw new Error(`No project content found at ${src}`);
  ensureDir(path.dirname(dest));
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true, force: true, errorOnExist: false });
}

function writeHook(name) {
  const hooksDir = git("rev-parse", "--git-path", "hooks");
  if (!hooksDir) throw new Error("Could not resolve .git/hooks path.");
  ensureDir(hooksDir);
  const hook = path.join(hooksDir, name);
  const body = `#!/usr/bin/env sh\n# Installed by scripts/project-sync.mjs.\nROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"\nnode "$ROOT/scripts/project-sync.mjs" restore --quiet >/dev/null 2>&1 || true\n`;
  fs.writeFileSync(hook, body, { mode: 0o755 });
  fs.chmodSync(hook, 0o755);
  return hook;
}

function result(extra = {}) {
  return {
    ok: true,
    command,
    workspace_project: projectDir,
    persistent_project: storeDir(),
    workspace_files: countFiles(projectDir),
    persistent_files: countFiles(storeDir()),
    workspace_latest: latestMtime(projectDir),
    persistent_latest: latestMtime(storeDir()),
    ...extra,
  };
}

function print(data) {
  if (!quiet) process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

try {
  if (command === "status") {
    print(result({ workspace_has_project: hasProjectContent(projectDir), persistent_has_project: hasProjectContent(storeDir()) }));
  } else if (command === "save" || command === "push") {
    const previous = backup(storeDir(), "persistent-before-save");
    mirror(projectDir, storeDir());
    print(result({ saved: true, backup: previous }));
  } else if (command === "restore" || command === "pull") {
    if (!hasProjectContent(storeDir())) {
      print(result({ restored: false, reason: "persistent project not found" }));
    } else {
      const previous = backup(projectDir, "workspace-before-restore");
      mirror(storeDir(), projectDir);
      print(result({ restored: true, backup: previous }));
    }
  } else if (command === "install-hooks") {
    print(result({ hooks: [writeHook("post-checkout"), writeHook("post-merge")] }));
  } else {
    throw new Error(`Unknown command: ${command}. Use status, save, restore, or install-hooks.`);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
