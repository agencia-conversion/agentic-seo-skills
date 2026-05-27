import { test, expect } from '@playwright/test';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug regression: renaming a cluster must propagate the new name to every
// surface that displays it — the brain subpage frontmatter title (which
// drives the sidebar label and editor heading) and the materialized index
// table in brain/topic-clusters.md (the "Clusters ativos" block).
//
// Bidirectional contract: editing cluster.yaml externally (Obsidian, VS Code)
// must also flow back into the brain subpage via the chokidar watcher +
// cluster-sync.

const CLUSTER_SLUG = 'sample-cluster';
const CLUSTER_YAML_PATH = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');
const SUBPAGE_PATH = join(PROJECT_ROOT, 'brain', 'topic-clusters', `${CLUSTER_SLUG}.md`);
const INDEX_PATH = join(PROJECT_ROOT, 'brain', 'topic-clusters.md');

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function readFmTitle(path: string): string {
  const text = readFileSync(path, 'utf8');
  const m = text.match(FM_RE);
  if (!m) throw new Error(`no frontmatter in ${path}`);
  const fm = (parseYaml(m[1]) as Record<string, unknown>) || {};
  return String(fm.title || '').trim();
}

function readYamlName(path: string): string {
  const data = parseYaml(readFileSync(path, 'utf8')) as Record<string, unknown>;
  return String(data?.name || '').trim();
}

function writeYamlName(path: string, name: string) {
  const data = parseYaml(readFileSync(path, 'utf8')) as Record<string, unknown>;
  data.name = name;
  writeFileSync(path, stringifyYaml(data, { lineWidth: 0 }), 'utf8');
}

test.beforeEach(async ({ request }) => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
  // Boot the watcher so external-edit test below works. Wait long enough
  // for the fixture-reset write-silence (SILENCE_TTL_MS=1500ms, refreshed
  // by the post-spawn re-silencing in runClusterSyncHook) to expire so the
  // external edit below is not absorbed by the silence guard.
  await request.get(`/api/project/tree?token=${TEST_TOKEN}`);
  await new Promise((r) => setTimeout(r, 2_500));
});

test.afterAll(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

test('rename via API propagates to brain subpage frontmatter title + index table', async ({ request }) => {
  // Baseline.
  expect(readYamlName(CLUSTER_YAML_PATH)).toBe('Sample Cluster');
  expect(readFmTitle(SUBPAGE_PATH)).toBe('Sample Cluster');

  const patch = await request.patch(
    `/api/project/cluster/${CLUSTER_SLUG}?token=${TEST_TOKEN}`,
    { data: { name: 'Sample Renamed', syncWait: true } },
  );
  expect(patch.ok()).toBeTruthy();
  const body = await patch.json();
  expect(body.ok).toBe(true);

  // 1) cluster.yaml updated.
  expect(readYamlName(CLUSTER_YAML_PATH)).toBe('Sample Renamed');

  // 2) brain subpage frontmatter title updated.
  await expect
    .poll(() => readFmTitle(SUBPAGE_PATH), { timeout: 5_000, intervals: [200, 300, 500] })
    .toBe('Sample Renamed');

  // 3) materialized index table references new name.
  await expect
    .poll(() => readFileSync(INDEX_PATH, 'utf8'), { timeout: 5_000, intervals: [200, 300, 500] })
    .toContain('Sample Renamed');
});

test('rename via kebab UI propagates to sidebar label', async ({ page }) => {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
  await page.waitForLoadState('domcontentloaded');
  await page
    .getByRole('link', { name: 'Sample Cluster', exact: true })
    .waitFor({ timeout: 10_000 });

  await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
  await page.locator(`[data-testid="cluster-action-rename"]`).click();
  const input = page.locator('table tbody input:not([type="checkbox"])').first();
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.fill('Sidebar Renamed');
  await input.press('Enter');

  // Sidebar reads brain subpage frontmatter title → must show new name.
  // The sidebar tree is rendered inside <aside>; the entry for the cluster
  // subpage shows the brain frontmatter title as its visible label.
  await expect
    .poll(
      async () => readFmTitle(SUBPAGE_PATH),
      { timeout: 8_000, intervals: [200, 300, 500] },
    )
    .toBe('Sidebar Renamed');
  // Reload to force the sidebar to re-fetch the tree (refreshProjectTree is
  // already called after rename, but the test is more robust with a fresh
  // navigation).
  await page.reload();
  const sidebar = page.locator('aside').first();
  await expect(sidebar.getByText('Sidebar Renamed', { exact: false })).toBeVisible({ timeout: 10_000 });
});

test('external markdown edit to cluster.yaml.name flows into brain subpage title', async () => {
  // Poll the baseline: if a prior spec's reset is still settling through the
  // watcher pipeline, give it a moment before asserting the external edit.
  await expect
    .poll(() => readFmTitle(SUBPAGE_PATH), { timeout: 6_000, intervals: [200, 500, 1000] })
    .toBe('Sample Cluster');

  writeYamlName(CLUSTER_YAML_PATH, 'External Renamed');

  // Wait for chokidar to detect + cluster-sync to materialize the new title
  // in the subpage frontmatter. The retry budget tolerates the
  // SILENCE_TTL_MS window when contention from earlier specs is still
  // settling.
  await expect
    .poll(() => readFmTitle(SUBPAGE_PATH), {
      timeout: 12_000,
      intervals: [300, 500, 700, 1000, 1500],
    })
    .toBe('External Renamed');

  // Index table also picks up the new name.
  await expect
    .poll(() => readFileSync(INDEX_PATH, 'utf8'), {
      timeout: 8_000,
      intervals: [300, 500, 700, 1000],
    })
    .toContain('External Renamed');
});

test('rename with empty/whitespace-only name leaves files unchanged', async ({ request }) => {
  const baselineYaml = readFileSync(CLUSTER_YAML_PATH, 'utf8');
  const baselineSubpage = readFileSync(SUBPAGE_PATH, 'utf8');

  for (const candidate of ['', '   ']) {
    const patch = await request.patch(
      `/api/project/cluster/${CLUSTER_SLUG}?token=${TEST_TOKEN}`,
      { data: { name: candidate, syncWait: true } },
    );
    // The current updateCluster silently drops empty values for fields like
    // name, so the response stays ok but no rename happens. Either way, the
    // invariant is "no broken state on disk".
    const body = await patch.json();
    if (body.ok) {
      expect(readYamlName(CLUSTER_YAML_PATH)).toBe('Sample Cluster');
      expect(readFmTitle(SUBPAGE_PATH)).toBe('Sample Cluster');
    } else {
      expect(readFileSync(CLUSTER_YAML_PATH, 'utf8')).toBe(baselineYaml);
      expect(readFileSync(SUBPAGE_PATH, 'utf8')).toBe(baselineSubpage);
    }
  }
});
