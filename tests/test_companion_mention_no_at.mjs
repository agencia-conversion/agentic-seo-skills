import assert from 'node:assert/strict';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const outDir = join('.context', 'mention-no-at');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'apps/companion/src/features/editor/mention-hydration.ts',
    '--target',
    'ES2022',
    '--module',
    'ES2022',
    '--moduleResolution',
    'bundler',
    '--outDir',
    outDir,
    '--skipLibCheck',
    '--esModuleInterop',
  ],
  { encoding: 'utf8' }
);
assert.equal(compiled.status, 0, compiled.stderr || compiled.stdout);

const jsCandidates = [
  join(outDir, 'features', 'editor', 'mention-hydration.js'),
  join(outDir, 'mention-hydration.js'),
];
const jsFile = jsCandidates.find((candidate) => existsSync(candidate));
assert.ok(jsFile, `tsc output missing in ${outDir}`);
const mjsFile = jsFile.replace(/\.js$/, '.mjs');
renameSync(jsFile, mjsFile);
const { resolveMentionHydration } = await import(`../${mjsFile}`);

const pages = [
  { id: 'brain/voice.md', title: 'Tom de Voz', icon: '🎙️', slug: 'voice' },
];

const ok = resolveMentionHydration('brain/voice.md', pages);
assert.equal(ok.text, '🎙️ Tom de Voz', 'mention should render icon + title without @');
assert.ok(!ok.text.includes('@'));

const alias = resolveMentionHydration('brain/voice.md', pages, 'tom editorial');
assert.equal(alias.text, '🎙️ tom editorial');
assert.ok(!alias.text.includes('@'));

const anchor = resolveMentionHydration('brain/voice.md', pages, null, 'Princípios');
assert.equal(anchor.text, '🎙️ Princípios');
assert.ok(!anchor.text.includes('@'));

const noPageId = resolveMentionHydration(null, pages);
assert.ok(!noPageId.text.includes('@'));

console.log('companion mention no @ ok');
