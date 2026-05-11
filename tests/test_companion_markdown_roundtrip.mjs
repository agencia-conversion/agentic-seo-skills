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
const resolver = {
  findPageId(target) {
    return target === "voz" || target === "Voz" ? "brain/voz.md" : null;
  },
  labelForPageId(id) {
    return id === "brain/voz.md" ? "voz" : id;
  },
};

const markdown = `# Título

Conteúdo com acentuação: página, análise e aprovação. Veja [[voz]].

| A | B |
|---|---|
| 1 | 2 |

<!-- comentário preservado -->
`;

const doc = markdownToDoc(markdown, resolver);
assert.equal(doc.type, "doc");
assert.match(JSON.stringify(doc), /pageMention/);
assert.match(JSON.stringify(doc), /rawMarkdown/);

const out = docToMarkdown(doc, resolver);
assert.match(out, /página, análise e aprovação/);
assert.match(out, /\[\[voz\]\]/);
assert.match(out, /\| A \| B \|/);
assert.match(out, /<!-- comentário preservado -->/);

console.log("companion markdown roundtrip ok");
