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
status: draft
pillar: wiki
owner: human
sources:
  - sources/manual/brief.md
  - sources/manual/interview.md
judgment_level: strategic
---

# Resumo do projeto
`,
  "utf8",
);

setFrontmatterValue(page, {
  status: "approved",
  approved_by: '"Diego"',
  approved_at: '"2026-05-04T12:00:00+00:00"',
});

const updated = readFileSync(page, "utf8");
assert.ok(updated.includes("status: approved"));
assert.ok(updated.includes('approved_by: "Diego"'));
assert.ok(updated.includes("sources:\n  - sources/manual/brief.md\n  - sources/manual/interview.md"));
assert.ok(updated.includes("judgment_level: strategic"));

console.log("frontmatter ok");
