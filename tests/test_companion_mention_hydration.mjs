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
    id: 'brain/voz.md',
    title: 'Voz',
    icon: '🧠',
    slug: 'brain-voz',
  },
];

const resolved = resolveMentionHydration('brain/voz.md', pages);
assert.equal(resolved.text, '🧠 @Voz');
assert.equal(resolved.broken, false);
assert.equal(resolved.slug, 'brain-voz');

const aliased = resolveMentionHydration('brain/voz.md', pages, 'tom editorial');
assert.equal(aliased.text, '🧠 @tom editorial');
assert.equal(aliased.broken, false);

const missing = resolveMentionHydration('brain/inexistente.md', pages);
assert.equal(missing.text, '@removed');
assert.equal(missing.broken, true);
assert.equal(missing.slug, null);

const unknown = resolveMentionHydration(null, pages);
assert.equal(unknown.text, '@unknown');
assert.equal(unknown.broken, true);

console.log('companion mention hydration ok');
