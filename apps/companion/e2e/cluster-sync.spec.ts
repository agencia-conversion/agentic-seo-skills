import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const PATH_TO_CONTENT = 'conteudos/blog/sample-satellite.md';
const SECOND_CLUSTER = 'second-cluster';

test.describe('cluster-sync end-to-end', () => {
  test('GET /api/project/cluster-list returns sample cluster', async ({ request }) => {
    const res = await request.get(`/api/project/cluster-list?token=${TEST_TOKEN}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.clusters)).toBe(true);
    const slugs = body.clusters.map((c: { slug: string }) => c.slug);
    expect(slugs).toContain('sample-cluster');
  });

  test('POST /api/project/file triggers cluster-sync hook', async ({ request }) => {
    const get = await request.get(
      `/api/project/file?path=${encodeURIComponent(PATH_TO_CONTENT)}&token=${TEST_TOKEN}`,
    );
    expect(get.ok()).toBeTruthy();
    const before = await get.json();
    expect(before.ok).toBe(true);

    const nextFm = {
      ...before.frontmatter,
      title: before.title,
      clusters: ['sample-cluster'],
    };

    const post = await request.post(`/api/project/file?token=${TEST_TOKEN}`, {
      data: {
        path: PATH_TO_CONTENT,
        hash: before.hash,
        title: before.title,
        body: before.body,
        frontmatter: nextFm,
        syncWait: true,
      },
    });
    expect(post.ok()).toBeTruthy();
    const result = await post.json();
    expect(result.ok).toBe(true);
    expect(result.clusterSync).toBeTruthy();
    expect(result.clusterSync.ran).toBe(true);
    expect(result.clusterSync.changedFiles).toEqual(expect.arrayContaining([
      expect.stringContaining('brain/topic-clusters/sample-cluster.md'),
    ]));
  });

  test('subpage materialized table contains both contents after sync', async ({ request }) => {
    const res = await request.get(
      `/api/project/file?path=${encodeURIComponent('brain/topic-clusters/sample-cluster.md')}&token=${TEST_TOKEN}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.body).toContain('BEGIN cluster-content-table:auto:v1:do-not-edit');
    expect(body.body).toContain('END cluster-content-table:auto');
    expect(body.body).toContain('sample-pilar');
    expect(body.body).toContain('sample-satellite');
  });

  test('index page reflects sample cluster with contents', async ({ request }) => {
    const res = await request.get(
      `/api/project/file?path=${encodeURIComponent('brain/topic-clusters.md')}&token=${TEST_TOKEN}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.body).toContain('BEGIN cluster-index-table:auto:v1:do-not-edit');
    expect(body.body).toContain('Sample Cluster');
  });

  test('companion home renders without server error', async ({ page }) => {
    const response = await page.goto(`/?token=${TEST_TOKEN}`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'e2e/screenshots/home.png', fullPage: false });
  });

  test('GET /api/project/cluster/[slug] returns rich rows', async ({ request }) => {
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.cluster.slug).toBe('sample-cluster');
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBeGreaterThanOrEqual(2);
    const pilar = body.rows.find((r: { papel: string }) => r.papel === 'pilar');
    expect(pilar).toBeTruthy();
    expect(pilar.conteudo.kind).toBe('published');
  });

  test('cluster page renders ClusterTableView with rich UI', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(node.locator('[data-cluster-add-row], [data-testid="cluster-add-row"]').first()).toBeVisible();
    await expect(node).toContainText('Sample Pilar');
    await expect(node).toContainText('Sample Satellite');
    await page.screenshot({ path: 'e2e/screenshots/cluster-table-view.png', fullPage: false });
  });

  test('inline edit keyword via EditableCell persists to API', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const targetRow = node.locator('[data-cluster-row="sample-satellite"]');
    await targetRow.waitFor({ state: 'visible' });
    const keywordCell = targetRow.getByRole('button', { name: 'Keyword', exact: true });
    await keywordCell.click();
    const input = targetRow.locator('input[type="text"], input:not([type])').first();
    await input.fill('keyword editada');
    await input.press('Enter');
    await page.waitForTimeout(1500);
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    const body = await res.json();
    const row = body.rows.find((r: { slug: string }) => r.slug === 'sample-satellite');
    expect(row.keyword).toContain('keyword editada');
  });

  test('papel toggle promotes satellite to pilar via PATCH', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const satelliteRow = node.locator('[data-cluster-row="sample-satellite"]');
    await satelliteRow.waitFor({ state: 'visible' });
    const papelBtn = satelliteRow.locator('button:has-text("Satélite")').first();
    await papelBtn.click();
    await page.waitForTimeout(1500);
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    const body = await res.json();
    expect(body.cluster.pilar_slug).toBe('sample-satellite');
  });

  test('adding a planned satellite via inline row appears after refetch', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const initialRows = await node.locator('[data-cluster-row]').count();
    await node.getByRole('button', { name: 'Novo conteúdo' }).click();
    const ghost = node.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 5_000 });
    await ghost.fill('Teste de adição inline');
    await ghost.press('Enter');
    await page.waitForTimeout(1_500);
    const finalRows = await node.locator('[data-cluster-row]').count();
    expect(finalRows).toBeGreaterThan(initialRows);
    await expect(node).toContainText('teste-de-adicao-inline');
  });

  test('selecting rows + Copy button writes TSV to clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard API only reliable in chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const checkboxes = node.locator('[data-cluster-row] input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    const copyBtn = node.locator('[data-testid="cluster-copy-selected"]');
    await copyBtn.click();
    await page.locator('[data-testid="cluster-paste-status"]').waitFor({ state: 'visible', timeout: 5_000 });
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('Papel');
    expect(clipboard).toContain('Conteúdo');
    expect(clipboard.split('\n').length).toBeGreaterThanOrEqual(3);
  });

  test('clicking a row title opens the content modal', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await node.getByRole('button', { name: 'Sample Pilar', exact: true }).click();
    const modal = page.locator('text=Abrir página').first();
    await modal.waitFor({ state: 'visible', timeout: 5_000 });
    await page.screenshot({ path: 'e2e/screenshots/cluster-content-modal.png', fullPage: false });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await expect(modal).toBeHidden({ timeout: 5_000 });
  });
});
