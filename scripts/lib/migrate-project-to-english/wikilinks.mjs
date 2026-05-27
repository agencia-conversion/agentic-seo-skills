// Rewrite Obsidian wikilinks + relative content paths inside brain/**/*.md.
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const WIKILINK_RENAMES = {
  identidade: "identity",
  voz: "voice",
  tecnologia: "technology",
  revisao: "review",
  produtos: "products",
};

export function rewriteBrainWikilinks(ctx) {
  const brainDir = join(ctx.root, "brain");
  if (!existsSync(brainDir)) return;
  for (const file of walk(brainDir)) {
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
  let next = text;
  next = rewriteWikilinks(next);
  next = rewriteContentPaths(next);
  if (next !== text) {
    atomicWrite(path, next, ctx);
    ctx.log.push({ kind: "rewrite", detail: path });
  }
}

export function rewriteWikilinks(text) {
  return text.replace(/\[\[([^\]|#]+)(#[^\]|]+)?(\|[^\]]+)?\]\]/g, (full, target, anchor = "", label = "") => {
    const t = target.trim();
    if (WIKILINK_RENAMES[t]) {
      return `[[${WIKILINK_RENAMES[t]}${anchor}${label}]]`;
    }
    return full;
  });
}

export function rewriteContentPaths(text) {
  // Markdown links + raw paths inside fences: only rewrite /conteudos/ and /outros/ within paths.
  let out = text;
  out = out.replace(/(\.\.\/)+conteudos\//g, (m) => m.replace("conteudos/", "contents/"));
  // /outros/ in path context (between slashes or path edges, after contents)
  out = out.replace(/\/contents\/outros\//g, "/contents/other/");
  return out;
}

function atomicWrite(path, contents, ctx) {
  if (ctx.dryRun) return;
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, contents, "utf8");
  renameSync(tmp, path);
}
