import { test, expect, type Page } from '@playwright/test';
import { cpSync, rmSync } from 'node:fs';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Proves that optimistic sync does NOT regress to a loading-flicker:
// after the first paint, a cell commit or kebab action must not replace
// the table with "Carregando…" while the silent background refetch runs.

const CLUSTER_SLUG = 'sample-cluster';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

async function gotoTopicClusters(page: Page) {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('link', { name: 'Sample Cluster', exact: true }).waitFor({ timeout: 10_000 });
}

test('renaming a cluster in the kebab does not flicker the table to Carregando…', async ({ page }) => {
  await gotoTopicClusters(page);
  const tableHasFirstRow = page.getByRole('link', { name: 'Sample Cluster', exact: true });
  await expect(tableHasFirstRow).toBeVisible();

  await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
  await page.locator(`[data-testid="cluster-action-rename"]`).click();
  const input = page.locator('input:not([type])').first();
  await input.fill('Sample Cluster Renamed');

  let flicker = false;
  const watch = page
    .locator('text=Carregando…')
    .first()
    .waitFor({ state: 'visible', timeout: 1500 })
    .then(() => { flicker = true; })
    .catch(() => { /* expected: never appears */ });

  await input.press('Enter');
  await watch;

  expect(flicker).toBe(false);
});

test('changing cluster status via kebab does not flicker', async ({ page }) => {
  await gotoTopicClusters(page);

  await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
  await page.locator(`[data-testid="cluster-action-status"]`).click();
  await page.locator(`[data-testid="cluster-action-status-drafting"]`).click();

  let flicker = false;
  const watch = page
    .locator('text=Carregando…')
    .first()
    .waitFor({ state: 'visible', timeout: 1500 })
    .then(() => { flicker = true; })
    .catch(() => { /* expected: never appears */ });

  await watch;
  expect(flicker).toBe(false);
});

test('editing a cell in cluster table propagates without spinner replacing the row', async ({ page }) => {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
  const row = page.locator(`[data-cluster-row="sample-pilar"]`);
  await row.waitFor({ timeout: 10_000 });

  const keywordCell = row.getByRole('button').filter({ hasText: /sample pilar|edited-flicker-test/i }).first();
  await keywordCell.click();
  const input = row.locator('input[type="text"], input:not([type])').first();
  await input.fill('edited-flicker-test');

  let flicker = false;
  const watch = page
    .locator('text=Carregando…')
    .first()
    .waitFor({ state: 'visible', timeout: 1500 })
    .then(() => { flicker = true; })
    .catch(() => { /* expected: never appears */ });

  await input.press('Enter');
  await watch;

  expect(flicker).toBe(false);
  await expect(row.getByText('edited-flicker-test')).toBeVisible({ timeout: 5_000 });
});
