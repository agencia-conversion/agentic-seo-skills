import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, renameSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const outDir = join('.context', 'source-route-test');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'tsc',
    'apps/companion/src/lib/source-files.ts',
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
  join(outDir, 'lib', 'source-files.js'),
  join(outDir, 'source-files.js'),
];
const jsFile = jsCandidates.find((candidate) => existsSync(candidate));
assert.ok(jsFile, `tsc output missing in ${outDir}`);
const mjsFile = jsFile.replace(/\.js$/, '.mjs');
renameSync(jsFile, mjsFile);
const { readProjectSource } = await import(`../${mjsFile}`);

const root = mkdtempSync(join(tmpdir(), 'agentic-source-route-'));
try {
  mkdirSync(join(root, 'sources', 'conversion-com-br'), { recursive: true });
  writeFileSync(join(root, 'sources', 'conversion-com-br', 'cases.html'), '<html><body>case</body></html>');
  mkdirSync(join(root, 'brain'), { recursive: true });
  writeFileSync(join(root, 'brain', 'index.md'), '# brain');

  const ok = readProjectSource(root, 'sources/conversion-com-br/cases.html');
  assert.equal(ok.ok, true);
  assert.equal(ok.contentType, 'text/html; charset=utf-8');
  assert.equal(ok.body.toString('utf8'), '<html><body>case</body></html>');

  const missingPath = readProjectSource(root, null);
  assert.equal(missingPath.ok, false);
  assert.equal(missingPath.status, 400);

  const traversal = readProjectSource(root, '../../etc/passwd');
  assert.equal(traversal.ok, false);
  assert.equal(traversal.status, 403);
  assert.equal(traversal.reason, 'invalid-path');

  const notASource = readProjectSource(root, 'brain/index.md');
  assert.equal(notASource.ok, false);
  assert.equal(notASource.status, 403);
  assert.equal(notASource.reason, 'not-a-source');

  const badExt = readProjectSource(root, 'sources/conversion-com-br/cases.exe');
  assert.equal(badExt.ok, false);
  assert.equal(badExt.status, 403);
  assert.equal(badExt.reason, 'unsupported-extension');

  const notFound = readProjectSource(root, 'sources/conversion-com-br/missing.html');
  assert.equal(notFound.ok, false);
  assert.equal(notFound.status, 404);

  const absolute = readProjectSource(root, '/etc/passwd');
  assert.equal(absolute.ok, false);

  console.log('companion source route ok');
} finally {
  rmSync(root, { recursive: true, force: true });
}
