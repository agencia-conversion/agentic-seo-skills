import { test, expect, type Page } from '@playwright/test';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bulk ops + trash + open-after-create.
//  1. Inline-created row navigates to its single page on click (Bug 1 fix:
//     workspace pages tree refreshes on syncBus content:changed so the new
//     slug becomes routable immediately).
//  2. Bulk delete trashes selected rows to project/Trash/<stamp>-<origin>-<slug>.md.
//  3. Bulk duplicate creates <slug>-copia[-N].md with title " (cópia)" suffix.
//  4. Both /contents-<cluster> and /brain-topic-clusters-<cluster> expose the
//     same column set + bulk toolbar.
//  5. scripts/restore-from-trash.mjs round-trips a file back to contents/.

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const SATELLITE_SLUG = 'sample-satellite';
const TRASH_DIR = join(PROJECT_ROOT, 'Trash');
const BLOG_DIR = join(PROJECT_ROOT, 'contents', 'blog');

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

async function openContentsByClusterPage(page: Page) {
  await page.goto(`/project/${TEST_TOKEN}/contents-${CLUSTER_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
  const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  return table;
}

function listTrashedFor(slug: string): string[] {
  if (!existsSync(TRASH_DIR)) return [];
  return readdirSync(TRASH_DIR).filter((name) => name.endsWith(`-${slug}.md`));
}

test.describe.configure({ mode: 'serial' });

test.describe('Bulk ops + Trash + open-after-create', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => resetFixture());

  test('1. inline-created row navigates to single page on click', async ({ page }) => {
    const table = await openClusterPage(page);
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Open After Create');
    await ghost.press('Enter');

    const newSlug = 'open-after-create';
    const newPath = join(BLOG_DIR, `${newSlug}.md`);
    await expect.poll(() => existsSync(newPath), { timeout: 8_000 }).toBe(true);

    const row = table.locator(`[data-cluster-row="${newSlug}"]`);
    await expect(row).toBeVisible({ timeout: 8_000 });
    const link = row.getByRole('link', { name: 'Open After Create' });
    await expect(link).toBeVisible();
    // Click the title link → debounced single-click navigates.
    await link.click();
    await page.waitForURL(new RegExp(`contents-blog-${newSlug}`), { timeout: 6_000 });
  });

  test('2. bulk delete moves selected published rows to project/Trash/', async ({ page }) => {
    const table = await openClusterPage(page);
    const pillarRow = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    const satelliteRow = table.locator(`[data-cluster-row="${SATELLITE_SLUG}"]`);
    await pillarRow.waitFor({ state: 'visible' });
    await satelliteRow.waitFor({ state: 'visible' });
    await pillarRow.locator('input[type="checkbox"]').check();
    await satelliteRow.locator('input[type="checkbox"]').check();
    await page.locator('[data-testid="cluster-delete-selected"]').click();
    await page.getByRole('button', { name: /^Excluir/ }).last().click();

    await expect
      .poll(() => existsSync(join(BLOG_DIR, `${PILLAR_SLUG}.md`)), { timeout: 8_000 })
      .toBe(false);
    await expect
      .poll(() => existsSync(join(BLOG_DIR, `${SATELLITE_SLUG}.md`)), { timeout: 8_000 })
      .toBe(false);
    expect(listTrashedFor(PILLAR_SLUG).length).toBeGreaterThanOrEqual(1);
    expect(listTrashedFor(SATELLITE_SLUG).length).toBeGreaterThanOrEqual(1);
    const trashedPillar = listTrashedFor(PILLAR_SLUG)[0];
    expect(trashedPillar).toMatch(/^\d{8}-\d{6}-blog-sample-pilar\.md$/);
    const fm = readFrontmatter(join(TRASH_DIR, trashedPillar));
    expect(fm.trashed_from).toBe(`contents/blog/${PILLAR_SLUG}.md`);
    expect(typeof fm.trashed_at).toBe('string');
  });

  test('3. bulk duplicate creates -copia[-N] siblings', async ({ page }) => {
    const table = await openClusterPage(page);
    const satelliteRow = table.locator(`[data-cluster-row="${SATELLITE_SLUG}"]`);
    await satelliteRow.waitFor({ state: 'visible' });
    await satelliteRow.locator('input[type="checkbox"]').check();
    const dupButton = page.locator('[data-testid="cluster-duplicate-selected"]');
    await expect(dupButton).toBeEnabled();
    await dupButton.click();
    const firstCopy = join(BLOG_DIR, `${SATELLITE_SLUG}-copia.md`);
    await expect.poll(() => existsSync(firstCopy), { timeout: 8_000 }).toBe(true);
    const fm1 = readFrontmatter(firstCopy);
    expect(String(fm1.title)).toContain('(cópia)');
    expect(fm1.slug).toBe(`${SATELLITE_SLUG}-copia`);
    expect(Array.isArray(fm1.clusters) && (fm1.clusters as string[]).includes(CLUSTER_SLUG)).toBe(true);

    // Wait for refetch to settle and the duplicate row to appear so the
    // toolbar settles too. Then duplicate again to exercise -copia-2.
    await expect(table.locator(`[data-cluster-row="${SATELLITE_SLUG}-copia"]`)).toBeVisible({ timeout: 8_000 });
    await satelliteRow.locator('input[type="checkbox"]').check();
    const dupButton2 = page.locator('[data-testid="cluster-duplicate-selected"]');
    await expect(dupButton2).toBeEnabled();
    await dupButton2.click();
    const secondCopy = join(BLOG_DIR, `${SATELLITE_SLUG}-copia-2.md`);
    await expect.poll(() => existsSync(secondCopy), { timeout: 8_000 }).toBe(true);
  });

  test('4. tables harmonized — brain page + /contents-<cluster> expose same columns + bulk toolbar', async ({ page }) => {
    const expectHeader = async (table: ReturnType<Page['locator']>) => {
      // First column: Papel (cluster-scoped) or Cluster(s) (global).
      await expect(table.getByRole('columnheader').filter({ hasText: /Papel|Cluster\(s\)/ })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Conte[uú]do/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Keyword/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Inten/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Status/i })).toBeVisible();
      await expect(table.getByRole('columnheader', { name: /Atualizado/i })).toBeVisible();
    };

    // Brain topic-cluster page.
    let table = await openClusterPage(page);
    await expectHeader(table);
    const brainRow = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await brainRow.locator('input[type="checkbox"]').check();
    await expect(page.locator('[data-testid="cluster-delete-selected"]')).toBeVisible();
    await expect(page.locator('[data-testid="cluster-duplicate-selected"]')).toBeVisible();

    // /contents-<cluster> page.
    table = await openContentsByClusterPage(page);
    await expectHeader(table);
    const listRow = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await listRow.locator('input[type="checkbox"]').check();
    await expect(page.locator('[data-testid="cluster-delete-selected"]')).toBeVisible();
    await expect(page.locator('[data-testid="cluster-duplicate-selected"]')).toBeVisible();
  });

  test('5. restore-from-trash.mjs round-trips a deleted file back to contents/', async ({ page }) => {
    const table = await openClusterPage(page);
    const satelliteRow = table.locator(`[data-cluster-row="${SATELLITE_SLUG}"]`);
    await satelliteRow.waitFor({ state: 'visible' });
    await satelliteRow.locator('input[type="checkbox"]').check();
    await page.locator('[data-testid="cluster-delete-selected"]').click();
    await page.getByRole('button', { name: /^Excluir/ }).last().click();
    await expect
      .poll(() => existsSync(join(BLOG_DIR, `${SATELLITE_SLUG}.md`)), { timeout: 8_000 })
      .toBe(false);
    expect(listTrashedFor(SATELLITE_SLUG).length).toBeGreaterThanOrEqual(1);

    const restore = spawnSync(
      'node',
      [join(PLUGIN_ROOT, 'scripts', 'restore-from-trash.mjs'), SATELLITE_SLUG, `--project=${PROJECT_ROOT}`],
      { encoding: 'utf8' },
    );
    expect(restore.status, restore.stderr || restore.stdout).toBe(0);
    expect(existsSync(join(BLOG_DIR, `${SATELLITE_SLUG}.md`))).toBe(true);
    const fm = readFrontmatter(join(BLOG_DIR, `${SATELLITE_SLUG}.md`));
    expect(fm.slug).toBe(SATELLITE_SLUG);
    expect(fm.trashed_from).toBeUndefined();
    expect(fm.trashed_at).toBeUndefined();
  });
});
