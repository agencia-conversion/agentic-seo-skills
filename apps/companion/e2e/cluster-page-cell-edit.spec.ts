import { test, expect } from '@playwright/test';
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug 2 regression: cell-edit must work on the cluster brain subpage
// (/brain-topic-clusters-<slug>) AND on the cluster-scoped contents
// listing (/contents-<slug>). The keyword and intent cells in
// ClusterContentTable rows should enter edit mode on click and persist
// changes to disk.

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const PILLAR_PATH = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);

function readFrontmatterKeyword(): string {
  const text = readFileSync(PILLAR_PATH, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('no frontmatter');
  const fm = parseYaml(match[1]) as Record<string, unknown>;
  return String((fm.keyword as string) || '');
}

test.beforeEach(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

test.afterAll(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

test('cell edit on brain cluster subpage (/brain-topic-clusters-<slug>) persists to disk', async ({
  page,
}) => {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
  const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
  await row.waitFor({ state: 'visible' });

  const keywordCell = row
    .getByRole('button')
    .filter({ hasText: /sample pilar|edited-brain/i })
    .first();
  await keywordCell.click();
  const input = row.locator('input[type="text"], input:not([type])').first();
  await expect(input).toBeVisible({ timeout: 3_000 });
  await input.fill('edited-brain-cluster');
  await input.press('Enter');

  await expect.poll(() => readFrontmatterKeyword(), { timeout: 8_000 }).toBe('edited-brain-cluster');
});

test('cell edit on cluster-scoped contents view (/contents-<slug>) persists to disk', async ({
  page,
}) => {
  await page.goto(`/project/${TEST_TOKEN}/contents-${CLUSTER_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
  const table = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
  await table.waitFor({ state: 'visible', timeout: 10_000 });
  const row = table.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
  await row.waitFor({ state: 'visible' });

  const keywordCell = row
    .getByRole('button')
    .filter({ hasText: /sample pilar|edited-contents/i })
    .first();
  await keywordCell.click();
  const input = row.locator('input[type="text"], input:not([type])').first();
  await expect(input).toBeVisible({ timeout: 3_000 });
  await input.fill('edited-contents-cluster');
  await input.press('Enter');

  await expect.poll(() => readFrontmatterKeyword(), { timeout: 8_000 }).toBe('edited-contents-cluster');
});
