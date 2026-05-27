// Directory + file renames. Each move is skipped when source absent or target present.
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

// Order matters: rename parent dir first, then sub-paths inside the new name.
// (`contents/outros` → `contents/other` must run AFTER `conteudos` → `contents`.)
export function renamePlan(root) {
  return [
    { from: join(root, "conteudos"), to: join(root, "contents"), kind: "dir" },
    { from: join(root, "contents", "outros"), to: join(root, "contents", "other"), kind: "dir" },
    { from: join(root, "brain", "identidade.md"), to: join(root, "brain", "identity.md"), kind: "file" },
    { from: join(root, "brain", "voz.md"), to: join(root, "brain", "voice.md"), kind: "file" },
    { from: join(root, "brain", "tecnologia.md"), to: join(root, "brain", "technology.md"), kind: "file" },
    { from: join(root, "brain", "revisao.md"), to: join(root, "brain", "review.md"), kind: "file" },
    { from: join(root, "brain", "produtos.md"), to: join(root, "brain", "products.md"), kind: "file" },
    { from: join(root, "brain", "identidade"), to: join(root, "brain", "identity"), kind: "dir" },
    { from: join(root, "brain", "voz"), to: join(root, "brain", "voice"), kind: "dir" },
    { from: join(root, "brain", "tecnologia"), to: join(root, "brain", "technology"), kind: "dir" },
    { from: join(root, "brain", "revisao"), to: join(root, "brain", "review"), kind: "dir" },
    { from: join(root, "brain", "produtos"), to: join(root, "brain", "products"), kind: "dir" },
  ];
}

export function applyRenames(plan, ctx) {
  for (const r of plan) {
    // In dry-run, parent renames don't actually move the dir, so a nested rename like
    // `contents/outros → contents/other` won't see its source yet. Probe the legacy parent path too.
    const sourceExists = existsSync(r.from) || (ctx.dryRun && existsSync(legacySource(r.from, ctx.root)));
    if (!sourceExists) continue;
    if (!ctx.dryRun && existsSync(r.to)) {
      throw new Error(`Cannot rename ${r.from} → ${r.to}: target already exists.`);
    }
    if (!ctx.dryRun) renameSync(r.from, r.to);
    ctx.log.push({ kind: "rename", detail: `${r.from} → ${r.to}` });
  }
  warnIfEditorialLeft(ctx);
}

function legacySource(target, root) {
  // Reverse-map known dir renames so dry-run can detect nested sources under legacy parents.
  return target.replace(`${root}/contents/`, `${root}/conteudos/`);
}

function warnIfEditorialLeft(ctx) {
  const path = join(ctx.root, "brain", "editorial.md");
  if (existsSync(path)) {
    console.warn(`WARN: ${path} still exists — leaving untouched (humans may have authored it).`);
  }
}
