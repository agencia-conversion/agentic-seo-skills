import assert from "node:assert/strict";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
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

const jsFile = join(outDir, "markdown.js");
const mjsFile = join(outDir, "markdown.mjs");
if (existsSync(jsFile)) renameSync(jsFile, mjsFile);

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

| A | B |
|---|---|
| 1 | 2 |

<!-- comentário preservado -->
`;

const doc = markdownToDoc(markdown, resolver);
assert.equal(doc.type, "doc");
const serializedDoc = JSON.stringify(doc);
assert.match(serializedDoc, /pageMention/);
assert.match(serializedDoc, /"anchor":"SEO estratégico"/);
assert.equal(seenTargets.includes("editorial#SEO estratégico"), false);
assert.match(JSON.stringify(doc), /rawMarkdown/);
assert.match(JSON.stringify(doc), /"hidden":true/);

const out = docToMarkdown(doc, resolver);
assert.match(out, /página, análise e aprovação/);
assert.match(out, /\[\[voz\]\]/);
assert.match(out, /\[\[voz\|tom editorial\]\]/);
assert.match(out, /\[\[editorial#SEO estratégico\]\]/);
assert.match(out, /\[\[editorial#SEO estratégico\|SEO estratégico\]\]/);
assert.match(out, /\| A \| B \|/);
assert.match(out, /<!-- comentário preservado -->/);

console.log("companion markdown roundtrip ok");
