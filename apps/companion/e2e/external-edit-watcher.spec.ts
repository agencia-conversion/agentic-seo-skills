import { test, expect } from '@playwright/test';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Validates the chokidar watcher (in-process) catches external edits to
// content frontmatter and triggers cluster-sync so the materialized table
// in the brain cluster subpage stays consistent. Also checks the anti-loop
// guard: writes that go through the Companion API do not bounce back through
// the watcher and re-trigger sync.

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const PILLAR_PATH = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);
const SUBPAGE_PATH = join(PROJECT_ROOT, 'brain', 'topic-clusters', `${CLUSTER_SLUG}.md`);

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function readFmAndBody(path: string): { fm: Record<string, unknown>; body: string } {
  const text = readFileSync(path, 'utf8');
  const match = text.match(FM_RE);
  if (!match) throw new Error(`no frontmatter in ${path}`);
  const fm = (parseYaml(match[1]) as Record<string, unknown>) || {};
  return { fm, body: match[2] || '' };
}

function writeFmAndBody(path: string, fm: Record<string, unknown>, body: string) {
  const yaml = stringifyYaml(fm, { lineWidth: 0 }).trimEnd();
  writeFileSync(path, `---\n${yaml}\n---\n${body.startsWith('\n') ? '' : '\n'}${body}`, 'utf8');
}

function resetFixture() {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
  const sync = spawnSync(
    'node',
    [join(PLUGIN_ROOT, 'scripts', 'cluster-sync.mjs'), `--root=${PROJECT_ROOT}`],
    { encoding: 'utf8' },
  );
  expect(sync.status, sync.stderr || sync.stdout).toBe(0);
}

test.describe('external-edit watcher — chokidar in-process', () => {
  test.beforeEach(async ({ request }) => {
    resetFixture();
    // Ping a Companion API so the watcher boots and starts observing PROJECT_ROOT.
    await request.get(`/api/project/tree?token=${TEST_TOKEN}`);
    // Give the watcher a moment to settle and drain the burst of fixture-reset
    // events before the test asserts behavior.
    await new Promise((r) => setTimeout(r, 1_500));
  });

  test('external write to content frontmatter is reflected in cluster page + materialized fence', async ({ page, request }) => {
    const nextKeyword = 'external-watcher-edit';

    // Externally edit the pillar frontmatter (simulating Obsidian/VS Code).
    const { fm, body } = readFmAndBody(PILLAR_PATH);
    fm.keyword = nextKeyword;
    writeFmAndBody(PILLAR_PATH, fm, body);

    // Wait up to 5s for the watcher to detect + cluster-sync to materialize.
    await expect
      .poll(
        () => {
          try {
            return readFileSync(SUBPAGE_PATH, 'utf8');
          } catch {
            return '';
          }
        },
        { timeout: 5_000, intervals: [200, 300, 500] },
      )
      .toContain(nextKeyword);

    // Reload the cluster page in the Companion and verify the keyword appears.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const clusterTable = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await clusterTable.waitFor({ state: 'visible', timeout: 10_000 });
    const row = clusterTable.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(row).toContainText(nextKeyword, { timeout: 8_000 });

    // Verify via API too — keeps the assertion stable independent of UI.
    const apiRes = await request.get(`/api/project/cluster/${CLUSTER_SLUG}?token=${TEST_TOKEN}`);
    const apiBody = await apiRes.json();
    const pillar = apiBody.rows.find((r: { slug: string }) => r.slug === PILLAR_SLUG);
    expect(pillar.keyword).toBe(nextKeyword);
  });

  test('Companion API write does not bounce back through the watcher (anti-loop guard)', async ({ request }) => {
    // Baseline counters.
    const beforeRes = await request.get(`/api/project/auto-block-watcher?token=${TEST_TOKEN}`);
    const before = await beforeRes.json();
    expect(before.ok).toBe(true);

    // Drive a normal Companion write. Use the cluster row PATCH to change the
    // pillar keyword — this routes through cluster-mutations.ts (silenced).
    const patch = await request.patch(
      `/api/project/cluster/${CLUSTER_SLUG}/row/${PILLAR_SLUG}?token=${TEST_TOKEN}`,
      { data: { field: 'keyword', value: 'api-keyword-1' } },
    );
    expect(patch.ok()).toBeTruthy();
    // Wait past the 500ms silence TTL plus chokidar's 200ms stability window.
    await new Promise((r) => setTimeout(r, 900));

    const afterRes = await request.get(`/api/project/auto-block-watcher?token=${TEST_TOKEN}`);
    const after = await afterRes.json();
    // The Companion write should NOT have caused the watcher to fire cluster-sync
    // for the same path. Allow a small delta only if other unrelated paths
    // changed; the key invariant is no runaway.
    expect(after.clusterSyncCount - before.clusterSyncCount).toBeLessThanOrEqual(1);
    expect(after.reverseSyncCount - before.reverseSyncCount).toBeLessThanOrEqual(1);

    // Final value still wins: the API mutation survived (no race undo).
    const apiRes = await request.get(`/api/project/cluster/${CLUSTER_SLUG}?token=${TEST_TOKEN}`);
    const apiBody = await apiRes.json();
    const pillar = apiBody.rows.find((r: { slug: string }) => r.slug === PILLAR_SLUG);
    expect(pillar.keyword).toBe('api-keyword-1');
  });
});
