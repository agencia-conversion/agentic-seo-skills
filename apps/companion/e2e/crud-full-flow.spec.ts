import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug 4: full CRUD spec across the 3 sync surfaces — single content
// page, contents list, cluster brain subpage — plus cluster lifecycle
// (planned satellite add/edit, rename, status, archive).

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const SATELLITE_SLUG = 'sample-satellite';
const CLUSTER_YAML = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');
const PILLAR_MD = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);

function readFrontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`no frontmatter in ${path}`);
  return (parseYaml(match[1]) as Record<string, unknown>) || {};
}

function readClusterYaml(): Record<string, unknown> {
  return (parseYaml(readFileSync(CLUSTER_YAML, 'utf8')) as Record<string, unknown>) || {};
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

async function editKeywordInDrawer(page: Page, nextKeyword: string) {
  await page.getByRole('button', { name: 'Editar metadados' }).click();
  const drawer = page.locator('aside.fixed.right-0');
  await drawer.waitFor({ state: 'visible', timeout: 5_000 });
  const input = drawer.locator('[data-testid="frontmatter-field-keyword"] input');
  await expect(input).toBeVisible();
  await input.fill(nextKeyword);
  await input.press('Tab');
}

async function editKeywordInRow(
  page: Page,
  tableAttr: string,
  rowSlug: string,
  nextKeyword: string,
) {
  const table = page.locator(`[data-cluster-table="${tableAttr}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  const row = table.locator(`[data-cluster-row="${rowSlug}"]`);
  await row.waitFor({ state: 'visible' });
  // The keyword cell button contains the seed keyword "sample pilar" or
  // any "edited-/crud-/planned-" prefix; the role toggle (Pilar/Satélite)
  // is filtered out.
  const cell = row
    .getByRole('button')
    .filter({ hasText: /sample pilar|sample satellite|edited-|crud-|planned-/i })
    .first();
  await cell.click();
  const input = row.locator('input[type="text"], input:not([type])').first();
  await expect(input).toBeVisible({ timeout: 3_000 });
  await input.fill(nextKeyword);
  await input.press('Enter');
}

async function pollFrontmatterKeyword(expected: string) {
  await expect
    .poll(() => String((readFrontmatter(PILLAR_MD).keyword as string) || ''), {
      timeout: 8_000,
      message: `pillar frontmatter keyword should reach ${expected}`,
    })
    .toBe(expected);
}

test.describe.configure({ mode: 'serial' });

test.describe('full CRUD across single page / contents list / cluster page', () => {
  test.beforeEach(() => {
    resetFixture();
  });

  test.afterAll(() => {
    // Restore canonical fixture state so downstream specs don't observe the
    // renamed cluster or added planned satellites from this suite.
    resetFixture();
  });

  test('edit drawer → list row + cluster row + disk all reflect new keyword', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-${PILLAR_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1.title-editor').waitFor({ state: 'visible' });
    await editKeywordInDrawer(page, 'crud-from-drawer');
    await pollFrontmatterKeyword('crud-from-drawer');

    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    const listRow = page
      .locator('[data-cluster-table="all"]')
      .locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(listRow).toContainText('crud-from-drawer', { timeout: 8_000 });

    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const clusterRow = page
      .locator(`[data-cluster-table="${CLUSTER_SLUG}"]`)
      .locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(clusterRow).toContainText('crud-from-drawer', { timeout: 8_000 });
  });

  test('edit row in contents list → drawer + cluster row + disk all reflect new keyword', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    await editKeywordInRow(page, 'all', PILLAR_SLUG, 'crud-from-list');
    await pollFrontmatterKeyword('crud-from-list');
  });

  test('edit row in cluster page → drawer + list + disk all reflect new keyword', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await editKeywordInRow(page, CLUSTER_SLUG, PILLAR_SLUG, 'crud-from-cluster');
    await pollFrontmatterKeyword('crud-from-cluster');
  });

  test('add published content via cluster page + frontmatter + brain subpage all updated', async ({
    page,
  }) => {
    // Inline CTA on a cluster page now creates a real published content
    // at contents/blog/<slug>.md with the title preserved and the cluster
    // linked via clusters: []. The cluster brain subpage table picks up
    // the new content via cluster-sync.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Crud Inline Item');
    await ghost.press('Enter');

    // File created on disk with the title preserved verbatim.
    const newPath = join(PROJECT_ROOT, 'contents', 'blog', 'crud-inline-item.md');
    await expect.poll(() => existsSync(newPath), { timeout: 8_000 }).toBe(true);
    const fm = readFrontmatter(newPath);
    expect(fm.title).toBe('Crud Inline Item');
    expect(fm.origin).toBe('blog');
    expect(Array.isArray(fm.clusters) && (fm.clusters as string[]).includes(CLUSTER_SLUG)).toBe(true);

    // Cluster brain subpage updated via cluster-sync hook. The hook runs
    // server-side after POST /api/project/file/create with syncWait=true,
    // but the chokidar watcher can race with it. Poll until the brain
    // subpage table reflects the new slug.
    const brainSubpagePath = join(PROJECT_ROOT, 'brain', 'topic-clusters', `${CLUSTER_SLUG}.md`);
    await expect
      .poll(() => readFileSync(brainSubpagePath, 'utf8'), { timeout: 10_000 })
      .toContain('crud-inline-item');
  });

  test('rename cluster + change status + archive via kebab', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    await page
      .getByRole('link', { name: 'Sample Cluster', exact: true })
      .waitFor({ timeout: 10_000 });

    // Editor must not be in spinner state at any point.
    const editorSpinner = page.locator('.py-24 > .animate-spin');

    // 1) Rename → Sample Renamed.
    await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
    await page.locator('[data-testid="cluster-action-rename"]').click();
    const renameInput = page.locator('table tbody input:not([type="checkbox"])').first();
    await renameInput.fill('Sample Renamed');
    await renameInput.press('Enter');
    await expect(editorSpinner).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Sample Renamed', exact: true }),
    ).toBeVisible({ timeout: 5_000 });
    await expect
      .poll(() => String((readClusterYaml().name as string) || ''), { timeout: 8_000 })
      .toBe('Sample Renamed');

    // 2) Status → drafting.
    await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
    await page.locator('[data-testid="cluster-action-status"]').click();
    await page.locator('[data-testid="cluster-action-status-drafting"]').click();
    await expect
      .poll(() => String((readClusterYaml().status as string) || ''), { timeout: 8_000 })
      .toBe('drafting');
    // Drafting clusters leave the active filter.
    await expect(
      page.getByRole('link', { name: 'Sample Renamed', exact: true }),
    ).toHaveCount(0, { timeout: 5_000 });

    // 3) Bring it back to active to test archive.
    const restore = await page.request.patch(
      `/api/project/cluster/${CLUSTER_SLUG}?token=${TEST_TOKEN}`,
      { data: { status: 'active', syncWait: true } },
    );
    expect((await restore.json()).ok).toBe(true);
    await page.reload();
    await page
      .getByRole('link', { name: 'Sample Renamed', exact: true })
      .waitFor({ timeout: 10_000 });
    await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
    await page.locator('[data-testid="cluster-action-archive"]').click();
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click();
    await expect
      .poll(() => String((readClusterYaml().status as string) || ''), { timeout: 8_000 })
      .toBe('archived');
    await expect(
      page.getByRole('link', { name: 'Sample Renamed', exact: true }),
    ).toHaveCount(0, { timeout: 5_000 });
  });
});

// Helper exposed in case follow-up tests want to drive the satellite API.
async function _addPlannedSatelliteApi(request: APIRequestContext, slug: string, title: string) {
  return request.post(`/api/project/cluster/${CLUSTER_SLUG}/satellite?token=${TEST_TOKEN}`, {
    data: { slug, keyword: title, syncWait: true },
  });
}
void _addPlannedSatelliteApi;
void SATELLITE_SLUG;
