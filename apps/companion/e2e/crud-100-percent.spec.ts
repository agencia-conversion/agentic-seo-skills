import { test, expect, type Page } from '@playwright/test';
import { cpSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// CRUD 100% spec: validates every user-facing operation on the cluster
// table after Bug 1 + Bug 2 fixes.
//   Bug 1 — inline CTA creates a PUBLISHED content (title preserved,
//           clickable link), not a planned-satellite placeholder.
//   Bug 2 — double-click on a published row's title enters edit mode
//           reliably (event.detail-based).
//   Plus  — single-click debounce, row-cell click navigation, cell
//           edits persist across all 3 surfaces, and a sync test.

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const PILLAR_PATH = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);

function readFrontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`no frontmatter in ${path}`);
  return (parseYaml(match[1]) as Record<string, unknown>) || {};
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

async function openClusterPage(page: Page) {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
  const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  return table;
}

test.describe.configure({ mode: 'serial' });

test.describe('CRUD 100% — full functional contract', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => resetFixture());

  test('1. inline CTA creates published content with title preserved + cluster linked', async ({
    page,
  }) => {
    const table = await openClusterPage(page);
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Meu Novo Conteúdo');
    await ghost.press('Enter');

    // Disk: file created with title verbatim + cluster linked.
    const newPath = join(PROJECT_ROOT, 'contents', 'blog', 'meu-novo-conteudo.md');
    await expect.poll(() => existsSync(newPath), { timeout: 8_000 }).toBe(true);
    const fm = readFrontmatter(newPath);
    expect(fm.title).toBe('Meu Novo Conteúdo');
    expect(fm.slug).toBe('meu-novo-conteudo');
    expect(fm.origin).toBe('blog');
    expect(Array.isArray(fm.clusters) && (fm.clusters as string[]).includes(CLUSTER_SLUG)).toBe(
      true,
    );
    // keyword stays empty (no carry-over from title).
    expect(fm.keyword == null || fm.keyword === '').toBe(true);

    // UI: row appears with title as a CLICKABLE LINK (not italic slug).
    const row = table.locator('[data-cluster-row="meu-novo-conteudo"]');
    await expect(row).toBeVisible({ timeout: 8_000 });
    expect(await row.getAttribute('data-cluster-row-kind')).toBe('published');
    const titleLink = row.getByRole('link', { name: 'Meu Novo Conteúdo' });
    await expect(titleLink).toBeVisible();
  });

  test('2. double-click on published title enters edit mode + persists rename', async ({
    page,
  }) => {
    const table = await openClusterPage(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const titleLink = row.getByRole('link', { name: /Sample Pilar/ }).first();
    // Double-click via playwright dblclick — exercises the same `click`
    // event with detail===2 that real browsers produce.
    await titleLink.dblclick();

    const titleInput = row.locator('[data-testid="content-title-input"]');
    await expect(titleInput).toBeVisible({ timeout: 3_000 });
    await titleInput.fill('Título Renomeado');
    await titleInput.press('Enter');

    await expect
      .poll(() => readFrontmatter(PILLAR_PATH).title, { timeout: 8_000 })
      .toBe('Título Renomeado');

    // UI shows the new title in the same row (after refetch).
    await expect(row).toContainText('Título Renomeado', { timeout: 8_000 });
  });

  test('3. single-click on title navigates after debounce', async ({ page }) => {
    const table = await openClusterPage(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const titleLink = row.getByRole('link', { name: /Sample Pilar/ }).first();
    await titleLink.click();

    await page.waitForURL(/contents-blog-sample-pilar/, { timeout: 5_000 });
  });

  test('4. row click (non-interactive cell) navigates immediately', async ({ page }) => {
    const table = await openClusterPage(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    // Click the "Atualizado" cell (last td, no interactive child).
    await row.locator('td').last().click();
    await page.waitForURL(/contents-blog-sample-pilar/, { timeout: 5_000 });
  });

  test('5a. inline keyword edit persists across reload', async ({ page }) => {
    const table = await openClusterPage(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const keywordCell = row.getByRole('button').filter({ hasText: /sample pilar/i }).first();
    await keywordCell.click();
    const input = row.locator('input[type="text"], input:not([type])').first();
    await input.fill('keyword-100-percent');
    await input.press('Enter');
    await expect
      .poll(() => readFrontmatter(PILLAR_PATH).keyword, { timeout: 8_000 })
      .toBe('keyword-100-percent');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`)).toContainText(
      'keyword-100-percent',
      { timeout: 8_000 },
    );
  });

  test('5b. inline intent edit persists across reload', async ({ page }) => {
    const table = await openClusterPage(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const intentTrigger = row.locator('button').filter({ hasText: 'Informacional' }).first();
    await intentTrigger.click();
    await page.getByRole('button', { name: 'Comparativo', exact: true }).first().click();
    await expect
      .poll(() => readFrontmatter(PILLAR_PATH).intent, { timeout: 8_000 })
      .toBe('comparative');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`)).toContainText(
      'Comparativo',
      { timeout: 8_000 },
    );
  });

  test('5c. inline editorial_status edit persists across reload', async ({ page }) => {
    const table = await openClusterPage(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const statusTrigger = row.locator('button').filter({ hasText: 'Publicado' }).first();
    await statusTrigger.click();
    await page.getByRole('button', { name: 'Em revisão', exact: true }).first().click();
    const readStatusOverride = () => {
      const yamlPath = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');
      const parsed = parseYaml(readFileSync(yamlPath, 'utf8')) as {
        satellite_overrides?: Record<string, { editorial_status?: string }>;
      };
      return parsed.satellite_overrides?.[PILLAR_SLUG]?.editorial_status;
    };
    await expect.poll(readStatusOverride, { timeout: 8_000 }).toBe('in-review');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`)).toContainText(
      'Em revisão',
      { timeout: 8_000 },
    );
  });

  test('6. cross-view sync — create on cluster page appears on /contents', async ({ page }) => {
    await openClusterPage(page);
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Sync Test Item');
    await ghost.press('Enter');

    await expect
      .poll(
        () => existsSync(join(PROJECT_ROOT, 'contents', 'blog', 'sync-test-item.md')),
        { timeout: 8_000 },
      )
      .toBe(true);

    // Navigate to /contents — row must show up without a manual reload.
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    const listRow = page
      .locator('[data-cluster-table="all"]')
      .locator('[data-cluster-row="sync-test-item"]');
    await expect(listRow).toBeVisible({ timeout: 10_000 });
    await expect(listRow).toContainText('Sync Test Item');
  });

  test('7. cross-view sync — edit keyword on /contents reflects on cluster page', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');

    const listRow = page
      .locator('[data-cluster-table="all"]')
      .locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await listRow.waitFor({ state: 'visible', timeout: 10_000 });

    const keywordCell = listRow
      .getByRole('button')
      .filter({ hasText: /sample pilar/i })
      .first();
    await keywordCell.click();
    const input = listRow.locator('input[type="text"], input:not([type])').first();
    await input.fill('sync-from-list');
    await input.press('Enter');

    await expect
      .poll(() => readFrontmatter(PILLAR_PATH).keyword, { timeout: 8_000 })
      .toBe('sync-from-list');

    // Navigate to cluster page → row reflects new keyword.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const clusterRow = page
      .locator(`[data-cluster-table="${CLUSTER_SLUG}"]`)
      .locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(clusterRow).toContainText('sync-from-list', { timeout: 8_000 });
  });
});
