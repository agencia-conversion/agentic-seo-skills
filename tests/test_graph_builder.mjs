import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const outDir = join('.context', 'graph-builder-test');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'apps/companion/src/lib/graph-builder.ts',
    'apps/companion/src/lib/backlink-index.ts',
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

for (const name of ['graph-builder', 'backlink-index', 'project-files', 'brain-templates']) {
  const js = join(outDir, `${name}.js`);
  const mjs = join(outDir, `${name}.mjs`);
  if (existsSync(js)) renameSync(js, mjs);
}
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
for (const name of ['graph-builder', 'backlink-index', 'project-files']) {
  patchSharedImport(join(outDir, `${name}.mjs`));
}
fs.writeFileSync(
  join(outDir, 'graph-builder.mjs'),
  fs
    .readFileSync(join(outDir, 'graph-builder.mjs'), 'utf8')
    .replace("from './backlink-index'", "from './backlink-index.mjs'")
    .replace("from './project-files'", "from './project-files.mjs'")
);
fs.writeFileSync(
  join(outDir, 'project-files.mjs'),
  fs
    .readFileSync(join(outDir, 'project-files.mjs'), 'utf8')
    .replace("from './brain-templates'", "from './brain-templates.mjs'")
);
fs.writeFileSync(
  join(outDir, 'backlink-index.mjs'),
  fs.readFileSync(join(outDir, 'backlink-index.mjs'), 'utf8')
);

const { buildGraph } = await import(`../${outDir}/graph-builder.mjs`);

// Build fixture
const tmp = mkdtempSync(join(tmpdir(), 'agentic-seo-graph-'));
const projectRoot = join(tmp, 'project');
const brain = join(projectRoot, 'brain');
mkdirSync(brain, { recursive: true });
mkdirSync(join(projectRoot, 'contents', 'blog'), { recursive: true });

writeFileSync(
  join(brain, 'index.md'),
  `---
title: "Index"
updated: "2026-05-24"
---

# Index

- [[identity]]
- [[voice]]
- [[fantasma]]
`,
  'utf8',
);
writeFileSync(
  join(brain, 'identity.md'),
  `---
title: "Identidade"
updated: "2026-05-24"
---

# Identidade

Linka [[voice]].
`,
  'utf8',
);
writeFileSync(
  join(brain, 'voice.md'),
  `---
title: "Voz"
updated: "2026-05-24"
---

# Voz

Sem links aqui.
`,
  'utf8',
);
writeFileSync(
  join(projectRoot, 'contents', 'blog', 'post.md'),
  `---
title: "Post"
slug: "post"
origin: "blog"
---

# Post

Body.
`,
  'utf8',
);

const graph = buildGraph(projectRoot);

// 4 real files + 1 broken target = 5 nodes
assert.equal(graph.nodes.length, 5);

const indexNode = graph.nodes.find((n) => n.id === 'brain/index.md');
assert.ok(indexNode);
assert.equal(indexNode.section, 'brain');
assert.equal(indexNode.outgoingCount, 3);

const voiceNode = graph.nodes.find((n) => n.id === 'brain/voice.md');
assert.ok(voiceNode);
assert.equal(voiceNode.incomingCount, 2, 'voice referenced from index and identity');

const brokenNode = graph.nodes.find((n) => n.broken);
assert.ok(brokenNode);
assert.match(brokenNode.id, /__broken__\/fantasma/);

// Edges: 2 from index (identity, voice) + 1 broken + 1 from identity (voice) = 4
assert.equal(graph.edges.length, 4);
assert.equal(graph.totalBroken, 1);

const brokenEdges = graph.edges.filter((e) => e.broken);
assert.equal(brokenEdges.length, 1);
assert.equal(brokenEdges[0].source, 'brain/index.md');

const sections = graph.sections.map((s) => s.id).sort();
assert.deepEqual(sections, ['brain', 'contents', 'other'].sort());

rmSync(tmp, { recursive: true, force: true });
console.log('graph-builder ok');
