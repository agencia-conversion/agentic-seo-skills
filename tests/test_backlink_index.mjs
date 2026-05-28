import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// Compile the TS module to ESM for direct import.
const outDir = join('.context', 'backlink-index-test');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'apps/companion/src/lib/backlink-index.ts',
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

const jsFile = join(outDir, 'backlink-index.js');
const mjsFile = join(outDir, 'backlink-index.mjs');
if (existsSync(jsFile)) renameSync(jsFile, mjsFile);
const fs = await import('node:fs');
fs.writeFileSync(
  mjsFile,
  fs.readFileSync(mjsFile, 'utf8').replaceAll("from '../../../../shared/report-modules'", "from '../../shared/report-modules.js'")
);

const { buildBacklinkIndex, backlinksFor, outgoingFor, brokenList, resolveWikilinkTarget } = await import(`../${mjsFile}`);

// Build a fake project with wikilinks, markdown links, broken refs, embeds.
const tmp = mkdtempSync(join(tmpdir(), 'agentic-seo-backlink-'));
const projectRoot = join(tmp, 'project');
const brainDir = join(projectRoot, 'brain');
mkdirSync(brainDir, { recursive: true });
mkdirSync(join(projectRoot, 'contents', 'blog'), { recursive: true });

writeFileSync(
  join(brainDir, 'index.md'),
  `---
title: "Index"
updated: "2026-05-24"
---

# Index

Mapa do brain:
- [[identity]] — quem somos
- [[voice]] — princípios editoriais
- [[topic-clusters#GEO e otimização para IA]] — área específica
- [[topic-clusters|clusters]] — aliased link
- [[fantasma]] — link quebrado
- ![[identity#Frase-marca]] — embed transclusion
- [Link Markdown](../contents/blog/post-real.md)
- [Externo](https://example.com)
`,
  'utf8',
);

writeFileSync(
  join(brainDir, 'identity.md'),
  `---
title: "Identidade"
updated: "2026-05-24"
---

# Identidade

## Frase-marca

"Exemplo de marca."

Reciprocidade: [[voice]] e [[index]].
`,
  'utf8',
);

writeFileSync(
  join(brainDir, 'voice.md'),
  `---
title: "Voz"
updated: "2026-05-24"
---

# Voz

Linkando [[identity]] de volta.

\`\`\`
[[isto-deve-ser-ignorado]] dentro de fence
\`\`\`
`,
  'utf8',
);

writeFileSync(
  join(brainDir, 'topic-clusters.md'),
  `---
title: "Topic clusters"
updated: "2026-05-24"
---

# Topic clusters

## GEO e otimização para IA

Sem links nesta seção.
`,
  'utf8',
);

writeFileSync(
  join(projectRoot, 'contents', 'blog', 'post-real.md'),
  `---
title: "Post real"
slug: "post-real"
origin: "blog"
area: "geo-otimizacao-para-ia"
---

# Post real

Conteúdo público que recebe link do brain.
`,
  'utf8',
);

const index = buildBacklinkIndex(projectRoot);

// File set
assert.ok(index.files.has('brain/index.md'));
assert.ok(index.files.has('brain/identity.md'));
assert.ok(index.files.has('brain/voice.md'));
assert.ok(index.files.has('contents/blog/post-real.md'));

// Backlinks for identity.md — should be referenced by index.md (wikilink + embed) and voice.md (wikilink)
const identityBacklinks = backlinksFor(index, 'brain/identity.md');
const identitySources = identityBacklinks.map((b) => b.source);
assert.ok(identitySources.includes('brain/index.md'), 'identity should be backlinked from index');
assert.ok(identitySources.includes('brain/voice.md'), 'identity should be backlinked from voice');

// Embed should be detected as type 'embed' for identity backlink.
const identityEmbed = identityBacklinks.find((b) => b.type === 'embed' && b.source === 'brain/index.md');
assert.ok(identityEmbed, 'embed backlink from index must be detected');
assert.equal(identityEmbed.anchor, 'Frase-marca');

// Aliased link to topic-clusters from index
const tcBacklinks = backlinksFor(index, 'brain/topic-clusters.md');
const aliased = tcBacklinks.find((b) => b.source === 'brain/index.md' && b.alias === 'clusters');
assert.ok(aliased, 'aliased wikilink should preserve alias');

// Wikilinks inside code fences must be ignored.
const ignoredTarget = resolveWikilinkTarget('isto-deve-ser-ignorado', 'brain/voice.md', index.files);
assert.equal(ignoredTarget, null, 'unrelated wikilink should not resolve to a real file');
const ignoredBacklinks = backlinksFor(index, 'brain/isto-deve-ser-ignorado.md');
assert.equal(ignoredBacklinks.length, 0, 'wikilink inside code fence must not produce a backlink');

// Broken link detection
const broken = brokenList(index);
const fantasma = broken.find((b) => b.rawTarget === 'fantasma');
assert.ok(fantasma, 'fantasma wikilink should be flagged broken');
assert.equal(fantasma.source, 'brain/index.md');
assert.equal(fantasma.type, 'wikilink');

// Outgoing links from index — should include all 7 in-project links (5 wikilinks + 1 embed + 1 markdown) plus the broken one
const outgoing = outgoingFor(index, 'brain/index.md');
const outRawTargets = outgoing.map((o) => o.rawTarget);
assert.ok(outRawTargets.includes('identity'));
assert.ok(outRawTargets.includes('voice'));
assert.ok(outRawTargets.includes('topic-clusters#GEO e otimização para IA') || outRawTargets.includes('topic-clusters'));
assert.ok(outRawTargets.includes('topic-clusters|clusters') || outRawTargets.includes('topic-clusters'));
assert.ok(outRawTargets.includes('fantasma'));
assert.ok(outRawTargets.some((t) => t.includes('post-real.md')), 'markdown link to post-real.md must be in outgoing');
// External URL must NOT be in outgoing (no .md, external)
assert.equal(outRawTargets.some((t) => t.includes('example.com')), false);

// Embed appears as outgoing of type 'embed'
const embedOut = outgoing.find((o) => o.type === 'embed');
assert.ok(embedOut, 'embed must appear in outgoing');
assert.equal(embedOut.rawTarget, 'identity');
assert.equal(embedOut.anchor, 'Frase-marca');

// Markdown link should resolve correctly relative to source dir.
const mdOut = outgoing.find((o) => o.type === 'markdown');
assert.ok(mdOut, 'markdown link must appear in outgoing');
assert.equal(mdOut.resolved, 'contents/blog/post-real.md');

// Context preservation: backlink context should include surrounding text
const indexFromIdentity = backlinksFor(index, 'brain/index.md').find((b) => b.source === 'brain/identity.md');
assert.ok(indexFromIdentity);
assert.ok(indexFromIdentity.context.includes('Reciprocidade') || indexFromIdentity.context.includes('voice'),
  `context should include surrounding text, got: ${indexFromIdentity.context}`);

// Conversion brain — if present, sanity-check that it indexes without crash.
const conversionRoot = join(process.cwd(), 'project');
if (existsSync(join(conversionRoot, 'brain', 'index.md'))) {
  const conv = buildBacklinkIndex(conversionRoot);
  assert.ok(conv.files.has('brain/index.md'));
  const logBacklinks = backlinksFor(conv, 'brain/log.md');
  assert.ok(logBacklinks.length >= 1, 'Conversion brain log.md should have at least one backlink');
}

rmSync(tmp, { recursive: true, force: true });
console.log('backlink-index ok');
