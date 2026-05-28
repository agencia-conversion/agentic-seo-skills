import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const outDir = join('.context', 'agentic-query-test');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'apps/companion/src/lib/agentic-query.ts',
    'apps/companion/src/lib/project-files.ts',
    'apps/companion/src/lib/brain-templates.ts',
    '--target', 'ES2022',
    '--module', 'ES2022',
    '--moduleResolution', 'bundler',
    '--outDir', outDir,
    '--skipLibCheck',
    '--esModuleInterop',
  ],
  { encoding: 'utf8' },
);
assert.equal(compiled.status, 0, compiled.stderr || compiled.stdout);

for (const name of ['agentic-query', 'project-files', 'brain-templates']) {
  const js = join(outDir, `${name}.js`);
  const mjs = join(outDir, `${name}.mjs`);
  if (existsSync(js)) renameSync(js, mjs);
}
// Stub for `auto-block-watcher` — the watcher uses chokidar which is not
// available in this test pipeline. The test only exercises pure read/write of
// brain pages, so noop stubs suffice.
writeFileSync(
  join(outDir, 'auto-block-watcher.mjs'),
  `export function ensureWatcherStarted() {}
export function silenceWrite() {}
`,
);
const fs = await import('node:fs');
function patchSharedImport(file) {
  fs.writeFileSync(
    file,
    fs
      .readFileSync(file, 'utf8')
      .replaceAll("from '../../../../shared/report-modules'", "from '../../shared/report-modules.js'")
      .replaceAll("from '../../../../shared/locale.mjs'", "from '../../shared/locale.mjs'")
  );
}
patchSharedImport(join(outDir, 'agentic-query.mjs'));
patchSharedImport(join(outDir, 'project-files.mjs'));
fs.writeFileSync(
  join(outDir, 'agentic-query.mjs'),
  fs
    .readFileSync(join(outDir, 'agentic-query.mjs'), 'utf8')
    .replace("from './project-files'", "from './project-files.mjs'")
);
fs.writeFileSync(
  join(outDir, 'project-files.mjs'),
  fs
    .readFileSync(join(outDir, 'project-files.mjs'), 'utf8')
    .replace("from './brain-templates'", "from './brain-templates.mjs'")
    .replace("from './auto-block-watcher'", "from './auto-block-watcher.mjs'")
);

const { parseQuerySource, executeQuery } = await import(`../${outDir}/agentic-query.mjs`);

// Parser
const parsed = parseQuerySource(`
version: 1
from: "contents/blog"
where:
  area: "geo"
  status: "!published"
sort: updated desc
limit: 5
columns: [title, area, status]
render: table
`);
assert.equal(parsed.errors.length, 0);
assert.equal(parsed.query.from, 'contents/blog');
assert.deepEqual(parsed.query.where, { area: 'geo', status: '!published' });
assert.equal(parsed.query.sort, 'updated desc');
assert.equal(parsed.query.limit, 5);
assert.deepEqual(parsed.query.columns, ['title', 'area', 'status']);

const bad = parseQuerySource('not: valid: yaml: : :');
assert.ok(bad.errors.length > 0);

// Build fixture project
const tmp = mkdtempSync(join(tmpdir(), 'agentic-seo-query-'));
const projectRoot = join(tmp, 'project');
mkdirSync(join(projectRoot, 'contents', 'blog'), { recursive: true });
mkdirSync(join(projectRoot, 'brain'), { recursive: true });

writeFileSync(
  join(projectRoot, 'contents', 'blog', 'a-published.md'),
  `---
title: "GEO em e-commerce"
slug: "geo-ecommerce"
origin: "blog"
area: "geo"
status: "published"
updated: "2026-04-10"
---

Body A.
`,
  'utf8',
);
writeFileSync(
  join(projectRoot, 'contents', 'blog', 'b-draft.md'),
  `---
title: "GEO para EdTech"
slug: "geo-edtech"
origin: "blog"
area: "geo"
status: "draft"
updated: "2026-05-20"
---

Body B.
`,
  'utf8',
);
writeFileSync(
  join(projectRoot, 'contents', 'blog', 'c-other-area.md'),
  `---
title: "SEO técnico"
slug: "seo-tecnico"
origin: "blog"
area: "seo-tecnico"
status: "draft"
updated: "2026-05-22"
---

Body C.
`,
  'utf8',
);

// where area=geo, status != published → only b-draft (1 result)
const r1 = executeQuery(
  `
version: 1
from: "contents/blog"
where:
  area: "geo"
  status: "!published"
`,
  projectRoot
);
assert.equal(r1.ok, true);
assert.equal(r1.total, 1);
assert.equal(r1.items[0].path, 'contents/blog/b-draft.md');

// from contents/blog → 3 results, sorted by updated desc
const r2 = executeQuery(
  `
version: 1
from: "contents/blog"
sort: updated desc
`,
  projectRoot
);
assert.equal(r2.total, 3);
assert.equal(r2.items[0].path, 'contents/blog/c-other-area.md', 'newest first');

// limit
const r3 = executeQuery(
  `
version: 1
from: "contents/blog"
limit: 2
`,
  projectRoot
);
assert.equal(r3.items.length, 2);
assert.equal(r3.limited, true);

// Invalid YAML
const r4 = executeQuery(': : : invalid', projectRoot);
assert.equal(r4.ok, false);
assert.ok(r4.errors && r4.errors.length);

// Path escape attempt
const r5 = executeQuery(
  `
version: 1
from: "../../etc"
`,
  projectRoot
);
assert.equal(r5.total, 0, 'must not escape project root');

rmSync(tmp, { recursive: true, force: true });
console.log('agentic-query ok');
