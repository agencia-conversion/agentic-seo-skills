import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SCAN_ROOTS = ["templates", "skills", "docs"];
const SKIP_DIRS = new Set(["node_modules", ".git", ".context"]);
const FORBIDDEN_FRONTMATTER_KEYS = /^(pilar|papel|nome|tese|tipo|aprovador|origem|escopo|decisao|evidencia|notas|area_nome|satelite_overrides|aprovado_em)\s*:/m;
const FORBIDDEN_PATH_SUBSTRINGS = [
  "/conteudos/",
  "/outros/",
  "identidade.md",
  "voz.md",
  "tecnologia.md",
  "revisao.md",
  "produtos.md",
  "topic-clusters-iteracao-",
];
const ENGLISH_LOG_TYPES = new Set([
  "approval",
  "decision",
  "correction",
  "lint",
  "ingestion",
  "publication",
  "evidence",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function frontmatterBlock(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;
  return text.slice(4, end);
}

function agenticFences(text) {
  const out = [];
  const re = /```agentic-[a-z-]+\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
}

const allFiles = SCAN_ROOTS.flatMap((dir) => walk(join(ROOT, dir)));

for (const file of allFiles) {
  const rel = file.slice(ROOT.length + 1);
  for (const sub of FORBIDDEN_PATH_SUBSTRINGS) {
    assert.ok(!rel.includes(sub) && !rel.endsWith(sub.replace(/^\//, "")), `legacy path artifact: ${rel} matches ${sub}`);
  }
  if (!file.endsWith(".md")) continue;
  const text = readFileSync(file, "utf8");
  const fm = frontmatterBlock(text);
  if (fm) {
    assert.ok(!FORBIDDEN_FRONTMATTER_KEYS.test(fm), `frontmatter uses legacy Portuguese key in ${rel}:\n${fm}`);
  }
  for (const body of agenticFences(text)) {
    assert.ok(!FORBIDDEN_FRONTMATTER_KEYS.test(body), `agentic-* fence body uses legacy key in ${rel}`);
  }
}

// Brain log entries use English `type:` values.
const logTemplate = join(ROOT, "templates", "project", "brain", "log.md");
const logText = readFileSync(logTemplate, "utf8");
for (const match of logText.matchAll(/^-\s*type:\s*(\S+)/gm)) {
  assert.ok(ENGLISH_LOG_TYPES.has(match[1]), `log template uses non-English type: ${match[1]}`);
}

console.log("english schema invariants ok");
