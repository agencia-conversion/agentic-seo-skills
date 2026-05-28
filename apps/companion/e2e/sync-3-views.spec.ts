import { test, expect, type Page } from '@playwright/test';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Proves the 3-view sync contract: editing a content's keyword in any of
// the drawer, the contents list, or the cluster table updates the other
// two surfaces + the markdown on disk, without writing to
// cluster.yaml.satellite_overrides.

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const PILLAR_RELPATH = `contents/blog/${PILLAR_SLUG}.md`;
const PILLAR_PATH = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);
const CLUSTER_YAML_PATH = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');

function readFrontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`no frontmatter in ${path}`);
  return parseYaml(match[1]) as Record<string, unknown>;
}

function readClusterYaml(): Record<string, unknown> {
  return parseYaml(readFileSync(CLUSTER_YAML_PATH, 'utf8')) as Record<string, unknown>;
}

async function pollFrontmatterKeyword(page: Page, expected: string) {
  await expect
    .poll(() => String((readFrontmatter(PILLAR_PATH).keyword as string) || ''), {
      timeout: 8_000,
      message: `pillar frontmatter keyword should reach ${expected}`,
    })
    .toBe(expected);
}

async function editKeywordInCluster(page: Page, nextKeyword: string) {
  const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
  await row.waitFor({ state: 'visible' });
  const keywordCell = row.getByRole('button').filter({ hasText: /sample pilar|edited-/i }).first();
  await keywordCell.click();
  const input = row.locator('input[type="text"], input:not([type])').first();
  await input.fill(nextKeyword);
  await input.press('Enter');
}

async function editKeywordInList(page: Page, nextKeyword: string) {
  const table = page.locator(`[data-cluster-table="all"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
  await row.waitFor({ state: 'visible' });
  const keywordCell = row.getByRole('button').filter({ hasText: /sample pilar|edited-/i }).first();
  await keywordCell.click();
  const input = row.locator('input[type="text"], input:not([type])').first();
  await input.fill(nextKeyword);
  await input.press('Enter');
}

async function editKeywordInDrawer(page: Page, nextKeyword: string) {
  await page.getByRole('button', { name: 'Editar metadados' }).click();
  const drawer = page.locator('aside.fixed.right-0');
  await drawer.waitFor({ state: 'visible', timeout: 5_000 });
  const input = drawer.locator('[data-testid="frontmatter-field-keyword"] input');
  await expect(input).toBeVisible();
  await input.fill(nextKeyword);
  // Trigger blur so updatePage marks dirty and the autosave debounce
  // (1500ms in editor-panel) writes the file.
  await input.press('Tab');
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

test.describe('3-view sync — drawer ↔ contents list ↔ cluster table', () => {
  test.beforeEach(() => {
    // Other specs mutate keyword/role/intent on the same fixture without
    // restoring. Reset before each test so the canonical keyword is
    // "sample pilar".
    resetFixture();
  });

  test('drawer edit → contents list + cluster table reflect new keyword', async ({ page }) => {
    const nextKeyword = 'edited-from-drawer';
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-${PILLAR_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1.title-editor').waitFor({ state: 'visible' });

    await editKeywordInDrawer(page, nextKeyword);
    await pollFrontmatterKeyword(page, nextKeyword);

    // Contents list reflects the new keyword.
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    const listTable = page.locator('[data-cluster-table="all"]');
    await listTable.waitFor({ state: 'visible', timeout: 10_000 });
    const listRow = listTable.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(listRow).toContainText(nextKeyword, { timeout: 8_000 });

    // Cluster page reflects the new keyword.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const clusterTable = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await clusterTable.waitFor({ state: 'visible', timeout: 10_000 });
    const clusterRow = clusterTable.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(clusterRow).toContainText(nextKeyword, { timeout: 8_000 });

    // satellite_overrides[pillar].keyword must NOT exist.
    const yaml = readClusterYaml() as { satellite_overrides?: Record<string, Record<string, unknown>> };
    expect(yaml.satellite_overrides?.[PILLAR_SLUG]?.keyword).toBeUndefined();
  });

  test('contents list edit → drawer + cluster table reflect new keyword', async ({ page }) => {
    const nextKeyword = 'edited-from-list';
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    await editKeywordInList(page, nextKeyword);
    await pollFrontmatterKeyword(page, nextKeyword);

    // Drawer on the single-content page reflects the new keyword.
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-${PILLAR_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1.title-editor').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Editar metadados' }).click();
    const drawer = page.locator('aside.fixed.right-0');
    await drawer.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(drawer.locator('[data-testid="frontmatter-field-keyword"] input')).toHaveValue(
      nextKeyword,
      { timeout: 8_000 },
    );

    // Cluster table reflects new keyword.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const clusterTable = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await clusterTable.waitFor({ state: 'visible', timeout: 10_000 });
    const clusterRow = clusterTable.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(clusterRow).toContainText(nextKeyword, { timeout: 8_000 });

    const yaml = readClusterYaml() as { satellite_overrides?: Record<string, Record<string, unknown>> };
    expect(yaml.satellite_overrides?.[PILLAR_SLUG]?.keyword).toBeUndefined();
  });

  test('cluster table edit → drawer + contents list reflect new keyword', async ({ page }) => {
    const nextKeyword = 'edited-from-cluster';
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await editKeywordInCluster(page, nextKeyword);
    await pollFrontmatterKeyword(page, nextKeyword);

    // Contents list reflects new keyword.
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    const listTable = page.locator('[data-cluster-table="all"]');
    await listTable.waitFor({ state: 'visible', timeout: 10_000 });
    const listRow = listTable.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(listRow).toContainText(nextKeyword, { timeout: 8_000 });

    // Drawer reflects new keyword.
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-${PILLAR_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1.title-editor').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Editar metadados' }).click();
    const drawer = page.locator('aside.fixed.right-0');
    await drawer.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(drawer.locator('[data-testid="frontmatter-field-keyword"] input')).toHaveValue(
      nextKeyword,
      { timeout: 8_000 },
    );

    const yaml = readClusterYaml() as { satellite_overrides?: Record<string, Record<string, unknown>> };
    expect(yaml.satellite_overrides?.[PILLAR_SLUG]?.keyword).toBeUndefined();
  });

  test('planned satellite edit stays in cluster.yaml, no .md file is created', async ({ page, request }) => {
    // Seed a planned satellite directly in cluster.yaml.
    const slug = 'planned-keyword-target';
    const yaml = readClusterYaml() as Record<string, any>;
    yaml.planned_satellites = [
      ...(Array.isArray(yaml.planned_satellites) ? yaml.planned_satellites : []),
      {
        slug,
        keyword: 'planned initial',
        intent: 'informational',
        volume: null,
        volume_source: null,
        role: 'satellite',
        note: null,
      },
    ];
    yaml.contract_version = 1;
    writeFileSync(CLUSTER_YAML_PATH, stringifyYaml(yaml, { lineWidth: 0 }), 'utf8');

    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    const row = table.locator(`[data-cluster-row="${slug}"]`);
    await row.waitFor({ state: 'visible' });

    const keywordCell = row.getByRole('button').filter({ hasText: /planned initial|planned-final/i }).first();
    await keywordCell.click();
    const input = row.locator('input[type="text"], input:not([type])').first();
    await input.fill('planned-final');
    await input.press('Enter');

    await expect
      .poll(
        () => {
          const data = readClusterYaml() as { planned_satellites?: Array<{ slug: string; keyword?: string }> };
          return (data.planned_satellites || []).find((entry) => entry.slug === slug)?.keyword;
        },
        { timeout: 8_000 },
      )
      .toBe('planned-final');

    const fileRes = await request.get(
      `/api/project/file?path=${encodeURIComponent(`contents/blog/${slug}.md`)}&token=${TEST_TOKEN}`,
    );
    const fileBody = await fileRes.json();
    expect(fileBody.ok).toBe(false);
    expect(fileBody.reason).toBe('file-not-found');
  });
});
