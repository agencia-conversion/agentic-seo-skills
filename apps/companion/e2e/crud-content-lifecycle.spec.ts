import { test, expect } from '@playwright/test';
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// End-to-end CRUD lifecycle: creating a published content from the
// contents list modal, creating a planned satellite inline on a cluster
// page, navigating into a content single page by clicking any row cell
// (Bug 1 regression), and propagating keyword edits across the cluster
// page and content single page drawer.

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const CONTENTS_BLOG_DIR = join(PROJECT_ROOT, 'contents', 'blog');
const CLUSTER_YAML_PATH = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');
const PILLAR_PATH = join(CONTENTS_BLOG_DIR, `${PILLAR_SLUG}.md`);

function readFrontmatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`no frontmatter in ${path}`);
  return (parseYaml(match[1]) as Record<string, unknown>) || {};
}

function readClusterYaml(): Record<string, unknown> {
  return (parseYaml(readFileSync(CLUSTER_YAML_PATH, 'utf8')) as Record<string, unknown>) || {};
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

test.describe.configure({ mode: 'serial' });

test.describe('CRUD lifecycle — create content, click row, propagate keyword', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => resetFixture());

  test('create published content via /contents modal + appears on cluster page', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');

    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const modalTitle = page.locator('input[placeholder="Título do conteúdo"]');
    await expect(modalTitle).toBeVisible({ timeout: 3_000 });
    const modal = modalTitle.locator('xpath=ancestor::*[contains(@class, "rounded-lg") and contains(@class, "border-notion-border")][1]');
    await modalTitle.fill('Teste CRUD A');
    await modal.locator('select').first().selectOption('blog');

    // Pick the sample-cluster via the cluster picker (scoped to the modal).
    await modal.locator('details summary').first().click();
    await modal
      .getByRole('button', { name: /Sample Cluster/i })
      .first()
      .click();

    await modal.getByRole('button', { name: 'Criar conteúdo' }).click();

    // Disk reflects creation with origin + clusters in frontmatter.
    const newPath = join(CONTENTS_BLOG_DIR, 'teste-crud-a.md');
    await expect.poll(() => existsSync(newPath), { timeout: 8_000 }).toBe(true);
    const fm = readFrontmatter(newPath);
    expect(fm.title).toBe('Teste CRUD A');
    expect(fm.origin).toBe('blog');
    expect(Array.isArray(fm.clusters) && (fm.clusters as string[]).includes(CLUSTER_SLUG)).toBe(true);

    // Row appears on the contents list.
    const listTable = page.locator('[data-cluster-table="all"]');
    await expect(listTable.locator('[data-cluster-row="teste-crud-a"]')).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to the cluster page — row must appear there too.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const clusterTable = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await expect(clusterTable.locator('[data-cluster-row="teste-crud-a"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('create planned satellite via cluster page inline CTA writes to cluster.yaml', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Satélite CRUD B');
    await ghost.press('Enter');

    await expect
      .poll(
        () => {
          const yaml = readClusterYaml() as { planned_satellites?: Array<{ slug?: string }> };
          return (yaml.planned_satellites || []).some((s) => s.slug === 'satelite-crud-b');
        },
        { timeout: 8_000 },
      )
      .toBe(true);
  });

  test('Bug 1: clicking ANY cell in a published row opens the content single page', async ({
    page,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    // Click the "Atualizado" cell (last visible cell — plain text, no
    // interactive child). This must navigate to the single page route.
    const updatedCell = row.locator('td').last();
    await updatedCell.click();

    await page.waitForURL(/\/contents-blog-sample-pilar/, { timeout: 8_000 });
    await page.locator('h1.title-editor').waitFor({ state: 'visible' });
    await expect(page.locator('h1.title-editor')).toContainText(/Sample Pilar/i);
  });

  test('Bug 1: clicking a checkbox or editable cell does NOT navigate', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible' });

    const startUrl = page.url();

    // Click the row checkbox — must select but not navigate.
    await row.locator('input[type="checkbox"]').click();
    // Wait a short beat for any pending navigation.
    await page.waitForTimeout(300);
    expect(page.url()).toBe(startUrl);
    await expect(row.locator('input[type="checkbox"]')).toBeChecked();

    // Click the editable keyword cell — must enter edit mode, not navigate.
    const keywordCell = row
      .getByRole('button')
      .filter({ hasText: /sample pilar|edited-/i })
      .first();
    await keywordCell.click();
    await page.waitForTimeout(300);
    expect(page.url()).toBe(startUrl);
    const editInput = row.locator('input[type="text"], input:not([type])').first();
    await expect(editInput).toBeVisible({ timeout: 3_000 });
    // Escape to leave edit mode without persisting.
    await editInput.press('Escape');
  });

  test('Bug 1: planned rows (no published file) do NOT navigate', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    // Seed a planned satellite via the inline CTA.
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghost = page.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 3_000 });
    await ghost.fill('Planned No Nav');
    await ghost.press('Enter');

    const plannedRow = table.locator('[data-cluster-row="planned-no-nav"]');
    await plannedRow.waitFor({ state: 'visible', timeout: 8_000 });
    expect(await plannedRow.getAttribute('data-cluster-row-kind')).toBe('planned');

    const startUrl = page.url();
    await plannedRow.locator('td').last().click();
    await page.waitForTimeout(300);
    expect(page.url()).toBe(startUrl);
  });

  test('edit keyword on cluster page reflects in single page drawer + disk', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await row.waitFor({ state: 'visible', timeout: 10_000 });

    const keywordCell = row
      .getByRole('button')
      .filter({ hasText: /sample pilar|edited-/i })
      .first();
    await keywordCell.click();
    const editInput = row.locator('input[type="text"], input:not([type])').first();
    await expect(editInput).toBeVisible({ timeout: 3_000 });
    await editInput.fill('crud-lifecycle-keyword');
    await editInput.press('Enter');

    await expect
      .poll(() => String((readFrontmatter(PILLAR_PATH).keyword as string) || ''), {
        timeout: 8_000,
      })
      .toBe('crud-lifecycle-keyword');

    // Navigate via direct URL — drawer should reflect new keyword.
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-${PILLAR_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('h1.title-editor').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Editar metadados' }).click();
    const drawer = page.locator('aside.fixed.right-0');
    await drawer.waitFor({ state: 'visible', timeout: 5_000 });
    const drawerInput = drawer.locator('[data-testid="frontmatter-field-keyword"] input');
    await expect(drawerInput).toHaveValue('crud-lifecycle-keyword', { timeout: 5_000 });
  });
});
