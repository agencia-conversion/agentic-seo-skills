import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const outDir = join('.context', 'tag-index-test');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'apps/companion/src/lib/tag-index.ts',
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

const jsFile = join(outDir, 'tag-index.js');
const mjsFile = join(outDir, 'tag-index.mjs');
if (existsSync(jsFile)) renameSync(jsFile, mjsFile);
const pfJs = join(outDir, 'project-files.js');
const pfMjs = join(outDir, 'project-files.mjs');
if (existsSync(pfJs)) renameSync(pfJs, pfMjs);
const btJs = join(outDir, 'brain-templates.js');
const btMjs = join(outDir, 'brain-templates.mjs');
if (existsSync(btJs)) renameSync(btJs, btMjs);
// Patch import in tag-index.mjs to use .mjs extension.
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
patchSharedImport(mjsFile);
patchSharedImport(pfMjs);
fs.writeFileSync(
  mjsFile,
  fs.readFileSync(mjsFile, 'utf8').replace("from './project-files'", "from './project-files.mjs'")
);
fs.writeFileSync(
  pfMjs,
  fs.readFileSync(pfMjs, 'utf8').replace("from './brain-templates'", "from './brain-templates.mjs'")
);

const { buildTagIndex, extractFrontmatterTags, extractInlineTags } = await import(`../${mjsFile}`);

// Unit checks on extractors
assert.deepEqual(extractFrontmatterTags(['SEO', ' geo ', 'a b']), ['seo', 'geo', 'ab']);
assert.deepEqual(extractFrontmatterTags('[a, b , "c"]'), ['a', 'b', 'c']);
assert.deepEqual(extractFrontmatterTags('a, b, c'), ['a', 'b', 'c']);
assert.deepEqual(extractFrontmatterTags('single'), ['single']);
assert.deepEqual(extractFrontmatterTags(''), []);
assert.deepEqual(extractFrontmatterTags(null), []);

const inline = extractInlineTags(`
Texto com #tag-um e #tag/dois.
# Heading com # não deve virar tag.
\`\`\`
#inside-fence ignorado
\`\`\`
Outra linha com #tag-um repetida.
`);
assert.deepEqual(inline.sort(), ['tag-um', 'tag-um', 'tag/dois'].sort());

// Integration: real fixture-style project
const tmp = mkdtempSync(join(tmpdir(), 'agentic-seo-tags-'));
const projectRoot = join(tmp, 'project');
const brain = join(projectRoot, 'brain');
mkdirSync(brain, { recursive: true });
mkdirSync(join(projectRoot, 'contents', 'blog'), { recursive: true });

writeFileSync(
  join(brain, 'identity.md'),
  `---
title: "Identidade"
updated: "2026-05-24"
tags:
  - exemplo
  - identidade-marca
---

# Identidade

Frase #exemplo inline.
`,
  'utf8',
);

writeFileSync(
  join(brain, 'voice.md'),
  `---
title: "Voz"
tags: [voz-editorial, exemplo]
---

# Voz

Tom #voz-editorial e #exemplo.
`,
  'utf8',
);

writeFileSync(
  join(projectRoot, 'contents', 'blog', 'post.md'),
  `---
title: "Post"
slug: "post"
origin: "blog"
tags: "geo, exemplo"
---

# Post

#exemplo inline.
`,
  'utf8',
);

const index = buildTagIndex(projectRoot);

// Tag 'exemplo' should appear in all 3 files
const exemplo = index.tags.find((t) => t.tag === 'exemplo');
assert.ok(exemplo, 'exemplo tag must exist');
assert.equal(exemplo.count, 3);
const exemploSources = exemplo.files.map((f) => f.source).sort();
assert.deepEqual(exemploSources, ['both', 'both', 'both']);

// Tag 'identidade-marca' only in identity.md frontmatter
const idMarca = index.tags.find((t) => t.tag === 'identidade-marca');
assert.ok(idMarca);
assert.equal(idMarca.count, 1);
assert.equal(idMarca.files[0].source, 'frontmatter');

// Tag 'geo' only in post.md frontmatter (comma-string form)
const geo = index.tags.find((t) => t.tag === 'geo');
assert.ok(geo);
assert.equal(geo.count, 1);

// Tags sorted by count desc, then alpha
const counts = index.tags.map((t) => t.count);
const sortedCounts = [...counts].sort((a, b) => b - a);
assert.deepEqual(counts, sortedCounts);

rmSync(tmp, { recursive: true, force: true });
console.log('tag-index ok');
