import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const outDir = join(process.cwd(), '.context', 'mention-hydration-test');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  'npx',
  [
    'tsc',
    'apps/companion/src/features/editor/mention-hydration.ts',
    '--target',
    'ES2022',
    '--module',
    'commonjs',
    '--outDir',
    outDir,
    '--skipLibCheck',
    '--esModuleInterop',
  ],
  { stdio: 'inherit' }
);

const { resolveMentionHydration } = await import(`../.context/mention-hydration-test/mention-hydration.js`);

const pages = [
  {
    id: 'brain/voice.md',
    title: 'Tom de Voz',
    icon: '🧠',
    slug: 'brain-voice',
  },
  {
    id: 'brain/topic-clusters.md',
    title: 'Topic Clusters',
    icon: '🗂️',
    slug: 'brain-topic-clusters',
  },
];

const resolved = resolveMentionHydration('brain/voice.md', pages);
assert.equal(resolved.text, '🧠 Tom de Voz');
assert.equal(resolved.broken, false);
assert.equal(resolved.slug, 'brain-voice');
assert.equal(resolved.hash, '');

const aliased = resolveMentionHydration('brain/voice.md', pages, 'tom editorial');
assert.equal(aliased.text, '🧠 tom editorial');
assert.equal(aliased.broken, false);

const section = resolveMentionHydration('brain/topic-clusters.md', pages, null, 'SEO estratégico');
assert.equal(section.text, '🗂️ SEO estratégico');
assert.equal(section.broken, false);
assert.equal(section.slug, 'brain-topic-clusters');
assert.equal(section.hash, '#SEO%20estrat%C3%A9gico');

const sectionAlias = resolveMentionHydration('brain/topic-clusters.md', pages, 'área estratégica', 'SEO estratégico');
assert.equal(sectionAlias.text, '🗂️ área estratégica');
assert.equal(sectionAlias.hash, '#SEO%20estrat%C3%A9gico');

const missing = resolveMentionHydration('brain/inexistente.md', pages);
assert.equal(missing.text, 'removed');
assert.equal(missing.broken, true);
assert.equal(missing.slug, null);
assert.equal(missing.hash, '');

const unknown = resolveMentionHydration(null, pages);
assert.equal(unknown.text, 'unknown');
assert.equal(unknown.broken, true);

console.log('companion mention hydration ok');
