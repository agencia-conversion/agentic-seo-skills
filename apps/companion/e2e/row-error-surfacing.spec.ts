import { test, expect } from '@playwright/test';
import { cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Phase 6 — verify backend `reason:` codes surface as localized toast text
// via formatRowError. Each test induces a known failure mode through the
// public API, then asserts the response payload carries the canonical reason
// code that the UI mapping consumes. UI rendering is asserted in the final
// test by triggering a failing edit through the editable cluster table and
// checking the toast DOM.

const SAMPLE_CLUSTER = 'sample-cluster';

test.describe('row-error surfacing — backend reason codes', () => {
  // Other specs mutate role/intent/status without restoring; reset the fixture
  // so the active-pillar / planned-entry assertions run against canonical state.
  test.beforeAll(() => {
    rmSync(PROJECT_ROOT, { recursive: true, force: true });
    cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
    const sync = spawnSync(
      'node',
      [join(PLUGIN_ROOT, 'scripts', 'cluster-sync.mjs'), `--root=${PROJECT_ROOT}`],
      { encoding: 'utf8' },
    );
    expect(sync.status, sync.stderr || sync.stdout).toBe(0);
  });
  test('unknown cluster returns cluster-not-found', async ({ request }) => {
    const res = await request.get(`/api/project/cluster/does-not-exist?token=${TEST_TOKEN}`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('cluster-not-found');
  });

  test('PATCH row with invalid field returns invalid-field', async ({ request }) => {
    const res = await request.patch(
      `/api/project/cluster/${SAMPLE_CLUSTER}/row/sample-pilar?token=${TEST_TOKEN}`,
      { data: { field: 'frobnicate', value: 'x', kind: 'published' } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('invalid-field');
  });

  test('PATCH planned row missing in cluster returns planned-entry-not-found', async ({ request }) => {
    const res = await request.patch(
      `/api/project/cluster/${SAMPLE_CLUSTER}/row/never-planned-slug?token=${TEST_TOKEN}`,
      { data: { field: 'keyword', value: 'oops', kind: 'planned' } },
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('planned-entry-not-found');
  });

  test('PATCH content metadata with invalid field returns invalid-field', async ({ request }) => {
    const res = await request.patch(
      `/api/project/content/sample-pilar/metadata?token=${TEST_TOKEN}`,
      { data: { field: 'frobnicate', value: 'x' } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('invalid-field');
  });

  test('PATCH content/clusters demoting active cluster pillar returns active-pillar-required', async ({ request }) => {
    const res = await request.patch(
      `/api/project/content/sample-pilar/clusters?token=${TEST_TOKEN}`,
      { data: { cluster_slug: SAMPLE_CLUSTER, role: 'satellite' } },
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('active-pillar-required');
  });

  test('POST satellite with empty slug returns invalid-slug', async ({ request }) => {
    const res = await request.post(
      `/api/project/cluster/${SAMPLE_CLUSTER}/satellite?token=${TEST_TOKEN}`,
      { data: { slug: '', keyword: 'something' } },
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('invalid-slug');
  });

  test('PATCH content metadata for unknown slug returns content-not-found', async ({ request }) => {
    const res = await request.patch(
      `/api/project/content/no-such-content/metadata?token=${TEST_TOKEN}`,
      { data: { field: 'keyword', value: 'x' } },
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe('content-not-found');
  });

  test('cluster table surfaces localized reason in toast on failed inline edit', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const pillarRow = node.locator('[data-cluster-row="sample-pilar"]');
    await pillarRow.waitFor({ state: 'visible' });

    // Intercept the metadata PATCH and force a backend-style content-not-found
    // failure so the UI must render the mapped reason text.
    await page.route('**/api/project/content/**/metadata*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, reason: 'content-not-found' }),
      });
    });

    const keywordCell = pillarRow.getByRole('button', { name: /sample pilar/i });
    await keywordCell.click();
    const input = pillarRow.locator('input[type="text"], input:not([type])').first();
    await input.fill('forced-failure-keyword');
    await input.press('Enter');

    const toast = page.getByText(/Conte[uú]do n[aã]o encontrado|Content not found/);
    await toast.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(toast).toBeVisible();
  });
});
