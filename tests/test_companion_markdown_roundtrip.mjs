import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const outDir = join(".context", "markdown-test");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "tsc",
    "apps/companion/src/lib/markdown.ts",
    "apps/companion/src/lib/inline-markdown.ts",
    "--target",
    "ES2022",
    "--module",
    "ES2022",
    "--moduleResolution",
    "bundler",
    "--outDir",
    outDir,
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { encoding: "utf8" },
);
assert.equal(compiled.status, 0, compiled.stderr || compiled.stdout);

const jsFile = join(outDir, "lib", "markdown.js");
const mjsFile = join(outDir, "lib", "markdown.mjs");
if (existsSync(jsFile)) renameSync(jsFile, mjsFile);
const inlineJs = join(outDir, "lib", "inline-markdown.js");
const inlineMjs = join(outDir, "lib", "inline-markdown.mjs");
if (existsSync(inlineJs)) renameSync(inlineJs, inlineMjs);
const dataJsFile = join(outDir, "features", "editor", "report-block-data.js");
const dataMjsFile = join(outDir, "features", "editor", "report-block-data.mjs");
if (existsSync(dataJsFile)) renameSync(dataJsFile, dataMjsFile);
const markdownSource = readFileSync(mjsFile, "utf8")
  .replace("../features/editor/report-block-data.js", "../features/editor/report-block-data.mjs")
  .replace("../features/editor/report-block-data", "../features/editor/report-block-data.mjs")
  .replace(/from ['"]\.\/inline-markdown(?:\.js)?['"]/, 'from "./inline-markdown.mjs"');
writeFileSync(mjsFile, markdownSource);

const { markdownToDoc, docToMarkdown } = await import(`../${mjsFile}`);
const seenTargets = [];
const resolver = {
  findPageId(target) {
    seenTargets.push(target);
    const clean = target.toLowerCase();
    if (clean === "voz") return "brain/voz.md";
    if (clean === "editorial") return "brain/editorial.md";
    return null;
  },
  labelForPageId(id) {
    if (id === "brain/voz.md") return "voz";
    if (id === "brain/editorial.md") return "editorial";
    return id;
  },
};

const markdown = `# Título

Conteúdo com acentuação: página, análise e aprovação. Veja [[voz]], [[voz|tom editorial]], [[editorial#SEO estratégico]] e [[editorial#SEO estratégico|SEO estratégico]].

Inline: link para [conversion](https://conversion.com.br/), código \`gap\` inline, **negrito** e *itálico*.

Evidência: ver [cases](sources/conversion-com-br/cases.html) e dump bruto.

URL nua: https://conversion.com.br/blog/backlinks/ vira link automaticamente.

| A | B |
|---|---|
| 1 | 2 |

<!-- comentário preservado -->

> [!warning] Atenção
> Este é um aviso editorial.

> [!tip]
> Dica curta sem título.

![[voz]]

![[editorial#SEO estratégico|área SEO]]

\`\`\`mermaid
flowchart TD
  A[Marca] --> B[Voz]
\`\`\`

\`\`\`agentic-query
version: 1
from: "conteudos/blog"
where:
  status: "draft"
sort: updated desc
limit: 10
\`\`\`

\`\`\`agentic-kpis
version: 1
items:
  - label: Score
    value: 88/100
\`\`\`

\`\`\`agentic-chart
{ "title": "Score", "data": { "labels": ["ok"], "datasets": [{ "data": [88] }] } }
\`\`\`

\`\`\`agentic-table
version: 1
columns:
  - key: a
    label: A
rows:
  - a: "1"
\`\`\`
`;

const doc = markdownToDoc(markdown, resolver);
assert.equal(doc.type, "doc");
const serializedDoc = JSON.stringify(doc);
assert.match(serializedDoc, /pageMention/);
assert.match(serializedDoc, /"anchor":"SEO estratégico"/);
assert.equal(seenTargets.includes("editorial#SEO estratégico"), false);
assert.match(JSON.stringify(doc), /rawMarkdown/);
assert.match(JSON.stringify(doc), /reportBlock/);
assert.match(JSON.stringify(doc), /"type":"table"/);
assert.match(JSON.stringify(doc), /"agenticReport":true/);
assert.match(JSON.stringify(doc), /"hidden":true/);
// M2: callout, embed, mermaid nodes
assert.match(JSON.stringify(doc), /"type":"callout"/);
assert.match(JSON.stringify(doc), /"calloutType":"warning"/);
assert.match(JSON.stringify(doc), /"title":"Atenção"/);
assert.match(JSON.stringify(doc), /"calloutType":"tip"/);
assert.match(JSON.stringify(doc), /"type":"pageEmbed"/);
assert.match(JSON.stringify(doc), /"type":"mermaid"/);
assert.match(JSON.stringify(doc), /flowchart TD/);
// M3: agentic-query node
assert.match(JSON.stringify(doc), /"type":"agenticQuery"/);
assert.match(JSON.stringify(doc), /from: \\"conteudos\/blog\\"/);

const out = docToMarkdown(doc, resolver);
assert.match(out, /página, análise e aprovação/);
assert.match(out, /\[\[voz\]\]/);
assert.match(out, /\[\[voz\|tom editorial\]\]/);
assert.match(out, /\[\[editorial#SEO estratégico\]\]/);
assert.match(out, /\[\[editorial#SEO estratégico\|SEO estratégico\]\]/);
assert.match(out, /\[conversion\]\(https:\/\/conversion\.com\.br\/\)/);
assert.match(out, /`gap`/);
assert.match(out, /\*\*negrito\*\*/);
assert.match(out, /\*itálico\*/);
assert.match(out, /\[cases\]\(sources\/conversion-com-br\/cases\.html\)/);
assert.match(out, /https:\/\/conversion\.com\.br\/blog\/backlinks\/ vira link automaticamente/);
const autolinkNode = doc.content
  .flatMap((block) => block.content || [])
  .find((node) => node.text && node.text.startsWith('https://conversion.com.br/blog/backlinks'));
assert.ok(autolinkNode, 'autolink node should exist');
assert.ok((autolinkNode.marks || []).some((m) => m.type === 'link' && m.attrs.href.startsWith('https://conversion.com.br/blog/backlinks')), 'autolink should have link mark');
const docJson = JSON.stringify(doc);
assert.match(docJson, /"type":"link"/);
assert.match(docJson, /"type":"code"/);
assert.match(docJson, /"type":"bold"/);
assert.match(docJson, /"type":"italic"/);
assert.match(out, /\| A \| B \|/);
assert.match(out, /<!-- comentário preservado -->/);
assert.match(out, /```agentic-kpis/);
assert.match(out, /```agentic-chart/);
assert.match(out, /```agentic-table/);
assert.match(out, /version: 1/);
assert.match(out, /items:/);
assert.match(out, /"title": "Score"/);
// M2: callout, embed, mermaid serialization
assert.match(out, /> \[!warning\] Atenção/);
assert.match(out, /> Este é um aviso editorial\./);
assert.match(out, /> \[!tip\]/);
assert.match(out, /!\[\[voz\]\]/);
assert.match(out, /!\[\[editorial#SEO estratégico\|área SEO\]\]/);
assert.match(out, /```mermaid/);
assert.match(out, /flowchart TD/);
// M3: agentic-query serialization
assert.match(out, /```agentic-query/);
assert.match(out, /from: "conteudos\/blog"/);

const reportBlockSource = readFileSync("apps/companion/src/features/editor/report-block-extension.tsx", "utf8");
const editorExtensionSource = readFileSync("apps/companion/src/features/editor/editor-extensions.ts", "utf8");
const editorPanelSource = readFileSync("apps/companion/src/features/editor/editor-panel.tsx", "utf8");
const reportTableMenuSource = readFileSync("apps/companion/src/features/editor/report-table-menu.tsx", "utf8");
const companionPackage = readFileSync("apps/companion/package.json", "utf8");
assert.equal(existsSync("apps/companion/src/features/editor/report-table-editor.tsx"), false);
assert.doesNotMatch(reportBlockSource, /ReportTableEditor/);
assert.doesNotMatch(reportBlockSource + reportTableMenuSource, /overflow-x-auto/);
assert.match(editorExtensionSource, /@tiptap\/extension-table/);
assert.match(editorExtensionSource, /TableKit/);
assert.match(editorExtensionSource, /AgenticTable/);
assert.match(editorPanelSource, /@tiptap\/react/);
assert.match(editorPanelSource, /@tiptap\/react\/menus/);
assert.doesNotMatch(editorExtensionSource + editorPanelSource + companionPackage, /novel/);
assert.match(reportTableMenuSource, /addRowBefore/);
assert.match(reportTableMenuSource, /addColumnAfter/);
assert.match(reportTableMenuSource, /deleteColumn/);
assert.match(reportTableMenuSource, /Recalcular/);

const reportBlockDataSource = readFileSync("apps/companion/src/features/editor/report-block-data.ts", "utf8");
assert.match(reportBlockDataSource, /YAML\.parse/);
assert.match(reportBlockDataSource, /JSON\.parse/);
assert.match(reportBlockDataSource, /calculateScoreFromTable/);

const pageWidthSource = readFileSync("apps/companion/src/features/workspace/page-width.ts", "utf8");
assert.match(pageWidthSource, /REPORT_DIR_NAME/);
assert.match(pageWidthSource, /return 'lg'/);

const globalCssSource = readFileSync("apps/companion/src/app/globals.css", "utf8");
assert.doesNotMatch(globalCssSource, /left:\s*-76px/);

console.log("companion markdown roundtrip ok");
