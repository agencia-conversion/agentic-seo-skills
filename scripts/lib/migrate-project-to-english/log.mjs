// Rewrite line-leading list items in brain/log.md. Conservative: only rewrites at the
// start of list items (`- key:`) and the value of `type:` lines.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEY_RENAMES = {
  tipo: "type",
  aprovador: "approver",
  aprovado_em: "approved_at",
  escopo: "scope",
  decisao: "decision",
  evidencia: "evidence",
  notas: "notes",
};
const TYPE_VALUES = {
  decisao: "decision",
  aprovacao: "approval",
  errata: "correction",
  ingestao: "ingestion",
  publicacao: "publication",
  prova: "evidence",
};

export function rewriteBrainLog(ctx) {
  const path = join(ctx.root, "brain", "log.md");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  const next = transform(text);
  if (next !== text) {
    atomicWrite(path, next, ctx);
    ctx.log.push({ kind: "rewrite", detail: path });
  }
}

export function transform(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    lines[i] = rewriteLine(lines[i]);
  }
  return lines.join("\n");
}

function rewriteLine(line) {
  const match = line.match(/^(\s*-\s+)([a-z_]+)(\s*:\s*)(.*)$/);
  if (!match) return line;
  const [, lead, key, sep, rest] = match;
  const newKey = KEY_RENAMES[key] || key;
  let newRest = rest;
  if (newKey === "type") {
    const value = rest.trim();
    if (TYPE_VALUES[value]) {
      newRest = rest.replace(value, TYPE_VALUES[value]);
    }
  }
  return `${lead}${newKey}${sep}${newRest}`;
}

function atomicWrite(path, contents, ctx) {
  if (ctx.dryRun) return;
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, contents, "utf8");
  renameSync(tmp, path);
}
