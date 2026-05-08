import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { setFrontmatterValue } = await import("../dist/seo-brain.js");

const dir = mkdtempSync(join(tmpdir(), "seo-brain-fm-"));
const page = join(dir, "index.md");
writeFileSync(
  page,
  `---
title: "Resumo do projeto"
updated: "2026-05-04"
sources:
  - sources/manual/brief.md
  - sources/manual/interview.md
---

# Resumo do projeto
`,
  "utf8",
);

setFrontmatterValue(page, {
  updated: '"2026-05-07"',
});

const updated = readFileSync(page, "utf8");
assert.ok(updated.includes('title: "Resumo do projeto"'));
assert.ok(updated.includes('updated: "2026-05-07"'));
assert.ok(updated.includes("sources:\n  - sources/manual/brief.md\n  - sources/manual/interview.md"));

console.log("frontmatter ok");
