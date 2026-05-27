import { test, expect, type Page } from '@playwright/test';
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Persistence contract for every inline-editable cell on the cluster table:
//   1. edit the cell to a new value
//   2. commit (Enter)
//   3. reload the page
//   4. UI still shows the new value
//   5. markdown on disk (frontmatter or cluster.yaml) reflects the new value
//
// Each field has its own test for isolation. The fixture is reset before
// each test so the canonical state is "sample pilar / informational /
// pillar / Sample Pilar / role: pillar".

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const PILLAR_PATH = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);
const CLUSTER_YAML_PATH = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');

function readPillarFrontmatter(): Record<string, unknown> {
  const text = readFileSync(PILLAR_PATH, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('no frontmatter');
  return parseYaml(match[1]) as Record<string, unknown>;
}

function readClusterYaml(): Record<string, unknown> {
  return parseYaml(readFileSync(CLUSTER_YAML_PATH, 'utf8')) as Record<string, unknown>;
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

async function openClusterTable(page: Page) {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
  const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  return table;
}

test.describe('inline edits persist across reloads', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => resetFixture());

  test('keyword (published row) persists to frontmatter + UI on reload', async ({ page }) => {
    const next = 'persisted-keyword-published';
    const table = await openClusterTable(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });
    const keywordCell = row.getByRole('button').filter({ hasText: /sample pilar|persisted-keyword/i }).first();
    await keywordCell.click();
    const input = row.locator('input[type="text"], input:not([type])').first();
    await input.fill(next);
    await input.press('Enter');

    await expect.poll(() => readPillarFrontmatter().keyword, { timeout: 8_000 }).toBe(next);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const rowAfter = tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(rowAfter).toContainText(next, { timeout: 8_000 });
  });

  test('intent (published row) persists to frontmatter + UI on reload', async ({ page }) => {
    const table = await openClusterTable(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });
    const intentTrigger = row.locator('button').filter({ hasText: 'Informacional' }).first();
    await intentTrigger.click();
    await page.getByRole('button', { name: 'Comparativo', exact: true }).first().click();

    await expect.poll(() => readPillarFrontmatter().intent, { timeout: 8_000 }).toBe('comparative');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const rowAfter = tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(rowAfter).toContainText('Comparativo', { timeout: 8_000 });
  });

  test('editorial_status persists to cluster.yaml + UI on reload', async ({ page }) => {
    const table = await openClusterTable(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });
    const statusTrigger = row.locator('button').filter({ hasText: 'Publicado' }).first();
    await statusTrigger.click();
    await page.getByRole('button', { name: 'Em revisão', exact: true }).first().click();

    await expect
      .poll(
        () => {
          const yaml = readClusterYaml() as {
            satellite_overrides?: Record<string, { editorial_status?: string }>;
          };
          return yaml.satellite_overrides?.[PILLAR_SLUG]?.editorial_status;
        },
        { timeout: 8_000 },
      )
      .toBe('in-review');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const rowAfter = tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(rowAfter).toContainText('Em revisão', { timeout: 8_000 });
  });

  test('role toggle (pillar -> satellite) persists to frontmatter + UI on reload', async ({ page }) => {
    const table = await openClusterTable(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });
    const roleBtn = row.locator('button:has-text("Pilar")').first();
    await roleBtn.click();

    await expect
      .poll(
        () => {
          const fm = readPillarFrontmatter();
          const roleMap = (fm.role || {}) as Record<string, unknown>;
          return roleMap[CLUSTER_SLUG];
        },
        { timeout: 8_000 },
      )
      .toBe('satellite');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const rowAfter = tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(rowAfter.locator('button:has-text("Satélite")').first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('title (double-click inline edit) persists to frontmatter + UI on reload', async ({ page }) => {
    const next = 'Sample Pilar Renomeado';
    const table = await openClusterTable(page);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const titleLink = row.getByRole('link', { name: /Sample Pilar/ }).first();
    await titleLink.dblclick();
    const titleInput = row.locator('[data-testid="content-title-input"]');
    await expect(titleInput).toBeVisible({ timeout: 3_000 });
    await titleInput.fill(next);
    await titleInput.press('Enter');

    await expect.poll(() => readPillarFrontmatter().title, { timeout: 8_000 }).toBe(next);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const rowAfter = tableAfter.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await expect(rowAfter).toContainText(next, { timeout: 8_000 });
  });

  test('keyword (planned satellite) persists to cluster.yaml + UI on reload', async ({ page }) => {
    const plannedSlug = 'planned-persist-keyword';
    const table = await openClusterTable(page);

    // Seed a planned satellite via the inline CTA.
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Planned Persist Keyword');
    await ghost.press('Enter');

    const plannedRow = table.locator(`[data-cluster-row="${plannedSlug}"]`);
    await plannedRow.waitFor({ state: 'visible', timeout: 8_000 });

    // Click the keyword cell (currently empty placeholder).
    const keywordCell = plannedRow.getByRole('button').filter({ hasText: /Keyword|planned/i }).first();
    await keywordCell.click();
    const input = plannedRow.locator('input[type="text"], input:not([type])').first();
    await input.fill('planned-kw-final');
    await input.press('Enter');

    await expect
      .poll(
        () => {
          const yaml = readClusterYaml() as {
            planned_satellites?: Array<{ slug: string; keyword?: string }>;
          };
          return (yaml.planned_satellites || []).find((s) => s.slug === plannedSlug)?.keyword;
        },
        { timeout: 8_000 },
      )
      .toBe('planned-kw-final');

    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const tableAfter = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await tableAfter.waitFor({ state: 'visible', timeout: 10_000 });
    const plannedAfter = tableAfter.locator(`[data-cluster-row="${plannedSlug}"]`);
    await expect(plannedAfter).toContainText('planned-kw-final', { timeout: 8_000 });
  });

  test('inline-CTA satellite has empty keyword in cluster.yaml (Bug 1 regression)', async ({ page }) => {
    const plannedTitle = 'Satellite Empty Keyword Test';
    const plannedSlug = 'satellite-empty-keyword-test';

    const table = await openClusterTable(page);

    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill(plannedTitle);
    await ghost.press('Enter');

    // Wait for the new planned row to appear in the table.
    const plannedRow = table.locator(`[data-cluster-row="${plannedSlug}"]`);
    await plannedRow.waitFor({ state: 'visible', timeout: 8_000 });

    // cluster.yaml entry exists with EMPTY keyword (string-empty or undefined).
    await expect
      .poll(
        () => {
          const yaml = readClusterYaml() as {
            planned_satellites?: Array<{ slug: string; keyword?: string }>;
          };
          return (yaml.planned_satellites || []).find((s) => s.slug === plannedSlug);
        },
        { timeout: 8_000 },
      )
      .toBeTruthy();

    const yaml = readClusterYaml() as {
      planned_satellites?: Array<{ slug: string; keyword?: string | null }>;
    };
    const entry = (yaml.planned_satellites || []).find((s) => s.slug === plannedSlug);
    // Keyword must NOT equal the title — Bug 1 was that the UI was sending
    // the title as the keyword.
    expect(entry?.keyword == null || entry.keyword === '').toBe(true);
  });
});
