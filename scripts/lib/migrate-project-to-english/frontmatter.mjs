// Rewrite frontmatter keys + role values in every .md under contents/.
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEY_RENAMES = { origem: "origin", papel: "role" };
const ROLE_VALUES = { pilar: "pillar", satelite: "satellite" };

export function rewriteContentFrontmatter(ctx) {
  const dir = join(ctx.root, "contents");
  if (!existsSync(dir)) return;
  for (const file of walk(dir)) {
    if (!file.endsWith(".md")) continue;
    rewriteOne(file, ctx);
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function rewriteOne(path, ctx) {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("---\n")) return;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return;
  const fm = text.slice(4, end);
  const newFm = transform(fm);
  if (newFm === fm) return;
  const next = `---\n${newFm}\n---${text.slice(end + 4)}`;
  atomicWrite(path, next, ctx);
  ctx.log.push({ kind: "rewrite", detail: path });
}

export function transform(fm) {
  const lines = fm.split("\n");
  let inRoleBlock = false;
  let roleIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (m) {
      const indent = m[1].length;
      const key = m[2];
      if (inRoleBlock && indent <= roleIndent) {
        inRoleBlock = false;
        roleIndent = -1;
      }
      if (indent === 0 && KEY_RENAMES[key]) {
        const newKey = KEY_RENAMES[key];
        lines[i] = line.replace(`${key}:`, `${newKey}:`);
        if (newKey === "role") {
          inRoleBlock = true;
          roleIndent = indent;
        }
      } else if (inRoleBlock && indent > roleIndent) {
        // `<cluster-slug>: pilar|satelite` — rewrite value only
        const value = m[3].trim();
        if (ROLE_VALUES[value]) {
          lines[i] = line.replace(new RegExp(`:\\s*${value}\\s*$`), `: ${ROLE_VALUES[value]}`);
        }
      }
    } else if (inRoleBlock && line.trim() === "") {
      // blank line continues the block; ignore
    } else if (inRoleBlock && !/^\s/.test(line)) {
      inRoleBlock = false;
    }
  }
  return lines.join("\n");
}

function atomicWrite(path, contents, ctx) {
  if (ctx.dryRun) return;
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, contents, "utf8");
  renameSync(tmp, path);
}
