import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bootstrapBrainFiles,
  buildProjectTree,
  createProjectFile,
  deleteProjectFile,
  listProjectContents,
  listProjectWorkbench,
  readProjectSettings,
  readProjectFile,
  readProjectLog,
  saveProjectFile,
  updateProjectSettings,
  validateProjectFileRel,
} from "../scripts/lib/project-browser-files.mjs";

const emptyTmp = mkdtempSync(join(tmpdir(), "agentic-seo-browser-empty-"));
const emptyProjectRoot = join(emptyTmp, "project");
mkdirSync(emptyProjectRoot, { recursive: true });
const emptyTree = buildProjectTree({ projectRoot: emptyProjectRoot });
assert.equal(emptyTree.ok, true);
assert.equal(emptyTree.hasFiles, false);
assert.equal(emptyTree.hasBrain, false);
assert.equal(emptyTree.canBootstrapBrain, true);

const bootstrapped = bootstrapBrainFiles({ projectRoot: emptyProjectRoot });
assert.equal(bootstrapped.ok, true);
assert.equal(bootstrapped.created.length, 8);
assert.ok(existsSync(join(emptyProjectRoot, "brain", "index.md")));
assert.ok(readFileSync(join(emptyProjectRoot, "brain", "index.md"), "utf8").includes('title: "Agentic SEO"'));
assert.match(readFileSync(join(emptyProjectRoot, "brain", "log.md"), "utf8"), /Brain criado no Companion/);
const bootstrappedTree = buildProjectTree({ projectRoot: emptyProjectRoot });
assert.equal(bootstrappedTree.hasFiles, true);
assert.equal(bootstrappedTree.hasBrain, true);
assert.equal(bootstrappedTree.canBootstrapBrain, false);
assert.deepEqual(bootstrapBrainFiles({ projectRoot: emptyProjectRoot }), { ok: false, reason: "brain-already-exists" });
rmSync(emptyTmp, { recursive: true, force: true });

const tmp = mkdtempSync(join(tmpdir(), "agentic-seo-browser-"));
const projectRoot = join(tmp, "project");
const brain = join(projectRoot, "brain");
mkdirSync(brain, { recursive: true });
mkdirSync(join(projectRoot, "conteudos", "blog"), { recursive: true });
mkdirSync(join(projectRoot, "conteudos", "linkedin"), { recursive: true });
mkdirSync(join(projectRoot, "clusters", "seo-agentico"), { recursive: true });
mkdirSync(join(projectRoot, "workbench", "drafts"), { recursive: true });
mkdirSync(join(projectRoot, "analyses", "technical-seo", "run-1"), { recursive: true });
mkdirSync(join(projectRoot, ".agentic-seo"), { recursive: true });
writeFileSync(join(projectRoot, ".agentic-seo", "project.json"), JSON.stringify({ name: "Projeto Teste" }), "utf8");

writeFileSync(
  join(brain, "voz.md"),
  `---
title: "Tom de Voz"
updated: "2026-05-07"
---

# Tom de Voz

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
  join(projectRoot, "conteudos", "blog", "_template.md"),
  `---
title: "Template"
---

Não deve aparecer na tabela.
`,
  "utf8",
);
writeFileSync(
  join(projectRoot, "conteudos", "linkedin", "post-linkedin.md"),
  `---
title: "Post LinkedIn"
slug: "post-linkedin"
origem: "linkedin"
topic_cluster: "seo-agentico"
status: "draft"
---

Conteúdo para LinkedIn.
`,
  "utf8",
);
writeFileSync(
  join(projectRoot, "clusters", "seo-agentico", "cluster.json"),
  JSON.stringify({
    seed: "SEO agêntico",
    seed_slug: "seo-agentico",
    pillar: { title: "SEO agêntico", slug: "seo-agentico" },
    supporting_pages: [{ slug: "post-teste", title: "Post Teste" }],
  }, null, 2),
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
writeFileSync(
  join(projectRoot, "workbench", "drafts", "_template.md"),
  `---
title: "Template Workbench"
---

Não deve aparecer.
`,
  "utf8",
);
try {
  symlinkSync(join(brain, "voz.md"), join(projectRoot, "workbench", "drafts", "symlink.md"));
} catch {
  // Symlink creation can be unavailable in some restricted environments.
}
writeFileSync(
  join(projectRoot, "analyses", "technical-seo", "run-1", "report.md"),
  `---
title: "Análise técnico"
slug: "run-1"
report_type: "technical-seo"
generated_at: "2026-05-07T10:00:00Z"
status: "ready"
source_artifact: "audits/run-1/report.yaml"
summary: "Resumo técnico."
score: "88"
---

# Análise técnico

Conteúdo do análise.
`,
  "utf8",
);

assert.deepEqual(validateProjectFileRel("../AGENTS.md").ok, false);
assert.deepEqual(validateProjectFileRel("brain/../../AGENTS.md").ok, false);
assert.deepEqual(validateProjectFileRel("brain/voz.md").ok, true);
assert.deepEqual(validateProjectFileRel("conteudos/blog/post-teste.md").ok, true);
assert.deepEqual(validateProjectFileRel("workbench/drafts/ideia.md").ok, true);
assert.deepEqual(validateProjectFileRel("analyses/technical-seo/run-1/report.md").ok, true);
assert.deepEqual(validateProjectFileRel("analyses/technical-seo/run-1/report.md", { write: true }).ok, true);
assert.deepEqual(validateProjectFileRel("analyses/not-a-module/run-1/report.md").ok, false);
assert.deepEqual(validateProjectFileRel("workbench/../brain/voz.md").ok, false);
assert.deepEqual(validateProjectFileRel("brain/log.md", { write: true }), { ok: false, reason: "read-only-log" });

const tree = buildProjectTree({ projectRoot });
assert.equal(tree.ok, true);
assert.equal(tree.project.name, "Projeto Teste");
assert.equal(tree.hasFiles, true);
assert.equal(tree.hasBrain, true);
assert.equal(tree.canBootstrapBrain, false);
const vozSummary = tree.sections[0].items.find((item) => item.path === "brain/voz.md");
assert.equal(vozSummary.title, "Tom de Voz");
assert.equal(vozSummary.requiresApproval, false);
assert.ok(tree.sections.find((section) => section.id === "conteudos").items.some((item) => item.path === "conteudos/blog/post-teste.md"));
assert.equal(tree.sections.find((section) => section.id === "conteudos").items.some((item) => item.path.endsWith("_template.md")), false);
assert.ok(tree.sections.find((section) => section.id === "workbench").items.some((item) => item.path === "workbench/drafts/ideia.md"));

const contentIndex = listProjectContents({ projectRoot });
assert.equal(contentIndex.ok, true);
assert.equal(contentIndex.total, 2);
assert.equal(contentIndex.items.some((item) => item.path === "conteudos/blog/_template.md"), false);
assert.equal(contentIndex.items.find((item) => item.path === "conteudos/blog/post-teste.md").topic_cluster, "seo-agentico");
assert.equal(contentIndex.items.find((item) => item.path === "conteudos/linkedin/post-linkedin.md").topicClusterTitle, "SEO agêntico");
assert.equal(listProjectContents({ projectRoot, origin: "blog" }).total, 1);
assert.equal(listProjectContents({ projectRoot, topicCluster: "seo-agentico" }).total, 2);

const workbenchIndex = listProjectWorkbench({ projectRoot });
assert.equal(workbenchIndex.ok, true);
assert.equal(workbenchIndex.total, 1);
assert.equal(workbenchIndex.items[0].path, "workbench/drafts/ideia.md");
assert.equal(workbenchIndex.items[0].folder, "drafts");
assert.equal(workbenchIndex.items[0].frontmatter, 2);
assert.equal(workbenchIndex.items.some((item) => item.path.endsWith("_template.md")), false);
assert.equal(workbenchIndex.items.some((item) => item.path.endsWith("symlink.md")), false);
assert.equal(listProjectWorkbench({ projectRoot, query: "ideia" }).total, 1);
assert.equal(listProjectWorkbench({ projectRoot, query: "nao-existe" }).total, 0);

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
  body: "# Tom de Voz\n\nTexto novo.",
  approver: "Diego Ivo",
});
assert.equal(stale.ok, false);
assert.equal(stale.reason, "file-modified");
assert.match(readFileSync(join(brain, "voz.md"), "utf8"), /Mudança externa/);

const fresh = readProjectFile({ projectRoot, fileRel: "brain/voz.md" });
const savedWithoutApprover = saveProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  expectedHash: fresh.hash,
  title: "Tom de Voz",
  body: "# Tom de Voz\n\nTexto novo com conteúdo e evidência.",
});
assert.equal(savedWithoutApprover.ok, true);

const freshAfterAgentSave = readProjectFile({ projectRoot, fileRel: "brain/voz.md" });
const saved = saveProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  expectedHash: freshAfterAgentSave.hash,
  title: "Tom de Voz Revisado",
  body: "# Tom de Voz\n\nTexto novo com conteúdo e evidência.",
  approver: "Diego Ivo",
  notes: "aprovado no companion",
});
assert.equal(saved.ok, true);
assert.equal(saved.requiresApproval, false);
const savedText = readFileSync(join(brain, "voz.md"), "utf8");
assert.match(savedText, /title: "Tom de Voz Revisado"/);
assert.match(savedText, /updated: "\d{4}-\d{2}-\d{2}"/);
assert.match(savedText, /Texto novo com conteúdo e evidência/);

const logText = readFileSync(join(brain, "log.md"), "utf8");
assert.match(logText, /- tipo: decisao/);
assert.match(logText, /- escopo: brain\/voz\.md/);
assert.match(logText, /- aprovador: agent/);
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

const deleteLog = deleteProjectFile({
  projectRoot,
  fileRel: "brain/log.md",
  expectedHash: readProjectFile({ projectRoot, fileRel: "brain/log.md" }).hash,
});
assert.deepEqual({ ok: deleteLog.ok, reason: deleteLog.reason }, { ok: false, reason: "read-only-log" });

const log = readProjectLog({ projectRoot });
assert.equal(log.ok, true);
assert.ok(log.readOnly);
assert.ok(log.entries.length >= 2);

const reportFile = readProjectFile({ projectRoot, fileRel: "analyses/technical-seo/run-1/report.md" });
assert.equal(reportFile.ok, true);
assert.equal(reportFile.readOnly, false);
assert.doesNotMatch(reportFile.body, /^# Análise técnico/m);
assert.match(reportFile.body, /Conteúdo do análise/);
const reportSave = saveProjectFile({
  projectRoot,
  fileRel: "analyses/technical-seo/run-1/report.md",
  expectedHash: reportFile.hash,
  title: "Análise técnico editado",
  frontmatter: { ...reportFile.frontmatter, title: "Análise técnico editado" },
  body: "Análise editada para apresentação humana.\n",
});
assert.equal(reportSave.ok, true);
assert.equal(reportSave.logAppended, true);
const editedReport = readFileSync(join(projectRoot, "analyses", "technical-seo", "run-1", "report.md"), "utf8");
assert.match(editedReport, /title: "Análise técnico editado"/);
assert.match(editedReport, /edited_at: "\d{4}-\d{2}-\d{2}T/);
assert.match(readFileSync(join(brain, "log.md"), "utf8"), /Análise editada no Companion/);
const reportDelete = deleteProjectFile({
  projectRoot,
  fileRel: "analyses/technical-seo/run-1/report.md",
  expectedHash: reportSave.hash,
});
assert.deepEqual({ ok: reportDelete.ok, reason: reportDelete.reason }, { ok: false, reason: "report-delete-not-allowed" });

const settingsBefore = readProjectSettings({ projectRoot });
assert.equal(settingsBefore.ok, true);
assert.equal(settingsBefore.language, "pt-BR");
const settingsUpdated = updateProjectSettings({ projectRoot, language: "en" });
assert.equal(settingsUpdated.ok, true);
assert.equal(settingsUpdated.language, "en");
assert.equal(updateProjectSettings({ projectRoot, language: "es" }).reason, "invalid-language");

const created = createProjectFile({ projectRoot, kind: "workbench", title: "Página de trabalho" });
assert.equal(created.ok, true);
assert.match(created.path, /^workbench\/companion\/pagina-de-trabalho.*\.md$/);
assert.match(readFileSync(join(projectRoot, created.path), "utf8"), /Página de trabalho/);

const staleDelete = deleteProjectFile({
  projectRoot,
  fileRel: "conteudos/blog/post-teste.md",
  expectedHash: "stale",
});
assert.equal(staleDelete.ok, false);
assert.equal(staleDelete.reason, "file-modified");
const dirtyDelete = deleteProjectFile({
  projectRoot,
  fileRel: "conteudos/blog/post-teste.md",
  expectedHash: readProjectFile({ projectRoot, fileRel: "conteudos/blog/post-teste.md" }).hash,
  dirty: true,
});
assert.equal(dirtyDelete.ok, false);
assert.equal(dirtyDelete.reason, "dirty-file");
const contentDeleteTarget = readProjectFile({ projectRoot, fileRel: "conteudos/blog/post-teste.md" });
const deletedContent = deleteProjectFile({
  projectRoot,
  fileRel: "conteudos/blog/post-teste.md",
  expectedHash: contentDeleteTarget.hash,
});
assert.equal(deletedContent.ok, true);
assert.match(deletedContent.trashPath, /^\.agentic-seo\/trash\/.+\/conteudos\/blog\/post-teste\.md$/);
assert.equal(existsSync(join(projectRoot, "conteudos", "blog", "post-teste.md")), false);
assert.equal(existsSync(join(projectRoot, deletedContent.trashPath)), true);

const brainDeleteTarget = readProjectFile({ projectRoot, fileRel: "brain/voz.md" });
const deletedBrain = deleteProjectFile({
  projectRoot,
  fileRel: "brain/voz.md",
  expectedHash: brainDeleteTarget.hash,
});
assert.equal(deletedBrain.ok, true);
assert.equal(existsSync(join(projectRoot, "brain", "voz.md")), false);
assert.match(readFileSync(join(projectRoot, "brain", "log.md"), "utf8"), /brain\/voz\.md movido para a lixeira do Companion Web/);

rmSync(tmp, { recursive: true, force: true });
console.log("companion project-browser ok");
