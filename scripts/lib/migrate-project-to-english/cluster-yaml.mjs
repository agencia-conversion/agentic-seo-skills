// Rewrite cluster.yaml + draft.yaml keys + role values using YAML.parseDocument so
// comments and structure are preserved.
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "yaml";

const TOP_LEVEL_RENAMES = {
  nome: "name",
  tese: "thesis",
  area_nome: "area_name",
  pilar: "pillar",
  satelite_overrides: "satellite_overrides",
};
const STATS_RENAMES = { publicados: "published", planejados: "planned" };
const ROLE_VALUES = { pilar: "pillar", satelite: "satellite" };

export function rewriteClusterYamls(ctx) {
  const clustersDir = join(ctx.root, "clusters");
  if (!existsSync(clustersDir)) return;
  for (const slug of readdirSync(clustersDir)) {
    const dir = join(clustersDir, slug);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of ["cluster.yaml", "draft.yaml"]) {
      const path = join(dir, file);
      if (existsSync(path)) rewriteOne(path, ctx);
    }
  }
}

function rewriteOne(path, ctx) {
  const text = readFileSync(path, "utf8");
  const doc = parseDocument(text);
  const map = doc.contents;
  if (!map || !map.items) return;
  let changed = false;
  changed = renameTopLevel(map, path) || changed;
  changed = renameStats(map, path) || changed;
  changed = renameRolesInPlannedSatellites(map) || changed;
  if (!changed) return;
  const next = doc.toString();
  if (next !== text) {
    atomicWrite(path, next, ctx);
    ctx.log.push({ kind: "rewrite", detail: path });
  }
}

function renameTopLevel(map, path) {
  let changed = false;
  for (const [from, to] of Object.entries(TOP_LEVEL_RENAMES)) {
    if (!map.has(from)) continue;
    const fromItem = map.items.find((i) => keyOf(i) === from);
    if (map.has(to)) {
      const fromValue = serializeNode(fromItem.value);
      const toValue = serializeNode(map.items.find((i) => keyOf(i) === to).value);
      if (fromValue === toValue) {
        map.items = map.items.filter((i) => keyOf(i) !== from);
        changed = true;
        continue;
      }
      throw new Error(`Cannot rename ${from}→${to} in ${path}: target key already present with different value.`);
    }
    if (fromItem) {
      fromItem.key.value = to;
      changed = true;
    }
  }
  return changed;
}

function renameStats(map, path) {
  const stats = map.get("stats");
  if (!stats || !stats.items) return false;
  let changed = false;
  for (const [from, to] of Object.entries(STATS_RENAMES)) {
    if (!stats.has || !stats.has(from)) continue;
    const fromItem = stats.items.find((i) => keyOf(i) === from);
    if (stats.has(to)) {
      const fromValue = serializeNode(fromItem.value);
      const toValue = serializeNode(stats.items.find((i) => keyOf(i) === to).value);
      if (fromValue === toValue) {
        stats.items = stats.items.filter((i) => keyOf(i) !== from);
        changed = true;
        continue;
      }
      throw new Error(`Cannot rename stats.${from}→stats.${to} in ${path}: target key already present with different value.`);
    }
    if (fromItem) {
      fromItem.key.value = to;
      changed = true;
    }
  }
  return changed;
}

function serializeNode(node) {
  if (node === undefined || node === null) return "";
  if (typeof node === "object" && "value" in node) return JSON.stringify(node.value ?? null);
  return JSON.stringify(node);
}

function renameRolesInPlannedSatellites(map) {
  const ps = map.get("planned_satellites");
  if (!ps || !ps.items) return false;
  let changed = false;
  for (const entry of ps.items) {
    if (!entry || !entry.items) continue;
    const papelItem = entry.items.find((i) => keyOf(i) === "papel");
    if (papelItem) {
      papelItem.key.value = "role";
      changed = true;
    }
    const roleItem = entry.items.find((i) => keyOf(i) === "role");
    if (roleItem && roleItem.value && ROLE_VALUES[roleItem.value.value]) {
      roleItem.value.value = ROLE_VALUES[roleItem.value.value];
      changed = true;
    }
  }
  return changed;
}

function keyOf(item) {
  return item && item.key ? item.key.value : null;
}

function atomicWrite(path, contents, ctx) {
  if (ctx.dryRun) return;
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, contents, "utf8");
  renameSync(tmp, path);
}
