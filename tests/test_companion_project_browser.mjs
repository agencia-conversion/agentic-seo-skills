import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildProjectTree,
  createProjectFile,
  readProjectFile,
  readProjectLog,
  saveProjectFile,
  validateProjectFileRel,
} from "../scripts/lib/project-browser-files.mjs";

const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-browser-"));
const projectRoot = join(tmp, "project");
const brain = join(projectRoot, "brain");
mkdirSync(brain, { recursive: true });
mkdirSync(join(projectRoot, "conteudos", "blog"), { recursive: true });
mkdirSync(join(projectRoot, "workbench", "drafts"), { recursive: true });
mkdirSync(join(projectRoot, ".agentic-seo"), { recursive: true });
writeFileSync(join(projectRoot, ".agentic-seo", "project.json"), JSON.stringify({ name: "Projeto Teste" }), "utf8");

writeFileSync(
  join(brain, "voz.md"),
  `---
title: "Tom de Voz"
updated: "2026-05-07"
---

# Voz

Conteúdo com acentuação: página, análise, aprovação.
`,
  "utf8",
);
writeFileSync(
  join(brain, "log.md"),
  `---
title: "Log"
updated: "2026-05-07"
---

# Log

## 2026-05-07 - Projeto criado

- tipo: decisao
- escopo: index
- decisao: Projeto criado.
- evidencia: index
- aprovador: agent
`,
  "utf8",
);
writeFileSync(
  join(projectRoot, "conteudos", "blog", "post-teste.md"),
  `---
title: "Post Teste"
slug: "post-teste"
published_at: ""
source_url: ""
origem: "blog"
area: "seo"
---

# Post

Conteúdo público.
`,
  "utf8",
);
writeFileSync(
  join(projectRoot, "workbench", "drafts", "ideia.md"),
  `---
title: "Ideia"
updated: "2026-05-07"
---

Rascunho.
`,
  "utf8",
);

assert.deepEqual(validateProjectFileRel("../AGENTS.md").ok, false);
assert.deepEqual(validateProjectFileRel("brain/../../AGENTS.md").ok, false);
assert.deepEqual(validateProjectFileRel("brain/voz.md").ok, true);
assert.deepEqual(validateProjectFileRel("conteudos/blog/post-teste.md").ok, true);
assert.deepEqual(validateProjectFileRel("workbench/drafts/ideia.md").ok, true);
assert.deepEqual(validateProjectFileRel("workbench/../brain/voz.md").ok, false);
assert.deepEqual(validateProjectFileRel("brain/log.md", { write: true }), { ok: false, reason: "read-only-log" });

const tree = buildProjectTree({ projectRoot });
assert.equal(tree.ok, true);
assert.equal(tree.project.name, "Projeto Teste");
const vozSummary = tree.sections[0].items.find((item) => item.path === "brain/voz.md");
assert.equal(vozSummary.title, "Tom de Voz");
assert.equal(vozSummary.requiresApproval, true);
assert.ok(tree.sections.find((section) => section.id === "conteudos").items.some((item) => item.path === "conteudos/blog/post-teste.md"));
assert.equal(tree.sections.some((section) => section.id === "workbench"), false);

writeFileSync(join(projectRoot, ".agentic-seo", "project.json"), JSON.stringify({ name: "Conversion" }), "utf8");
const conversionTree = buildProjectTree({ projectRoot });
assert.equal(conversionTree.project.icon, null);

const file = readProjectFile({ projectRoot, fileRel: "brain/voz.md" });
assert.equal(file.ok, true);
assert.equal(file.title, "Tom de Voz");
assert.match(file.body, /página, análise, aprovação/);

const logBeforeUi = readFileSync(join(brain, "log.md"), "utf8");
const uiSaved = saveProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  ui: { icon: "✨", cover: "https://example.com/capa.png" },
});
assert.equal(uiSaved.ok, true);
assert.equal(uiSaved.uiSaved, true);
assert.equal(readFileSync(join(brain, "log.md"), "utf8"), logBeforeUi);
assert.doesNotMatch(readFileSync(join(brain, "voz.md"), "utf8"), /capa\.png/);
const uiFile = readProjectFile({ projectRoot, fileRel: "brain/voz.md" });
assert.equal(uiFile.icon, "✨");
assert.equal(uiFile.cover, "https://example.com/capa.png");
const uiTreeItem = buildProjectTree({ projectRoot }).sections[0].items.find((item) => item.path === "brain/voz.md");
assert.equal(uiTreeItem.icon, "✨");
assert.equal(uiTreeItem.cover, "https://example.com/capa.png");

const contentFile = readProjectFile({ projectRoot, fileRel: "conteudos/blog/post-teste.md" });
const contentSaved = saveProjectFile({
  projectRoot,
  fileRel: "conteudos/blog/post-teste.md",
  expectedHash: contentFile.hash,
  title: "Post Teste Revisado",
  body: contentFile.body,
  frontmatter: { ...contentFile.frontmatter, title: "Post Teste Revisado", area: "seo-tecnico" },
  frontmatterRaw:
    'title: "Post Teste Revisado"\nslug: "post-teste"\npublished_at: ""\nsource_url: ""\norigem: "blog"\narea: "seo-tecnico"',
});
assert.equal(contentSaved.ok, true);
const contentText = readFileSync(join(projectRoot, "conteudos", "blog", "post-teste.md"), "utf8");
assert.match(contentText, /title: "Post Teste Revisado"/);
assert.match(contentText, /area: "seo-tecnico"/);

writeFileSync(join(brain, "voz.md"), readFileSync(join(brain, "voz.md"), "utf8") + "\nMudança externa.\n", "utf8");
const stale = saveProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  expectedHash: file.hash,
  title: "Tom de Voz",
  body: "# Voz\n\nTexto novo.",
  approver: "Diego Ivo",
});
assert.equal(stale.ok, false);
assert.equal(stale.reason, "file-modified");
assert.match(readFileSync(join(brain, "voz.md"), "utf8"), /Mudança externa/);

const fresh = readProjectFile({ projectRoot, fileRel: "brain/voz.md" });
const missingApprover = saveProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  expectedHash: fresh.hash,
  title: "Tom de Voz",
  body: "# Voz\n\nTexto novo com conteúdo e evidência.",
});
assert.deepEqual({ ok: missingApprover.ok, reason: missingApprover.reason }, { ok: false, reason: "missing-approver" });

const saved = saveProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  expectedHash: fresh.hash,
  title: "Tom de Voz Revisado",
  body: "# Voz\n\nTexto novo com conteúdo e evidência.",
  approver: "Diego Ivo",
  notes: "aprovado no companion",
});
assert.equal(saved.ok, true);
assert.equal(saved.requiresApproval, true);
const savedText = readFileSync(join(brain, "voz.md"), "utf8");
assert.match(savedText, /title: "Tom de Voz Revisado"/);
assert.match(savedText, /updated: "\d{4}-\d{2}-\d{2}"/);
assert.match(savedText, /Texto novo com conteúdo e evidência/);

const logText = readFileSync(join(brain, "log.md"), "utf8");
assert.match(logText, /- tipo: aprovacao/);
assert.match(logText, /- escopo: brain\/voz\.md/);
assert.match(logText, /- aprovador: Diego Ivo/);
assert.match(logText, /- notas: aprovado no companion/);

const logSave = saveProjectFile({
  projectRoot,
  fileRel: "brain/log.md",
  expectedHash: readProjectFile({ projectRoot, fileRel: "brain/log.md" }).hash,
  title: "Log",
  body: "# Log\n",
  approver: "Diego Ivo",
});
assert.deepEqual({ ok: logSave.ok, reason: logSave.reason }, { ok: false, reason: "read-only-log" });

const log = readProjectLog({ projectRoot });
assert.equal(log.ok, true);
assert.ok(log.readOnly);
assert.ok(log.entries.length >= 2);

const created = createProjectFile({ projectRoot, kind: "workbench", title: "Página de trabalho" });
assert.equal(created.ok, true);
assert.match(created.path, /^workbench\/companion\/pagina-de-trabalho.*\.md$/);
assert.match(readFileSync(join(projectRoot, created.path), "utf8"), /Página de trabalho/);

rmSync(tmp, { recursive: true, force: true });
console.log("companion project-browser ok");
