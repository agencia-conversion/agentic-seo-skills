import { test, expect } from '@playwright/test';
import { cpSync, rmSync } from 'node:fs';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug 1 regression: renaming a cluster from the kebab on
// /brain-topic-clusters should not flip the active editor page to
// "loaded: false" — the brain editor spinner (.py-24 .animate-spin) must
// not appear after Enter, and the table row must still show the new name.

const CLUSTER_SLUG = 'sample-cluster';

test.beforeEach(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

test.afterAll(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

test('renaming a cluster does not freeze the brain page in the spinner', async ({ page }) => {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
  await page.waitForLoadState('domcontentloaded');
  await page
    .getByRole('link', { name: 'Sample Cluster', exact: true })
    .waitFor({ timeout: 10_000 });

  // The brain editor is loaded (TipTap surface visible, no big spinner).
  const editorSpinner = page.locator('.py-24 > .animate-spin');
  await expect(editorSpinner).toHaveCount(0);

  await page.locator(`[data-testid="cluster-actions-${CLUSTER_SLUG}"]`).click();
  await page.locator(`[data-testid="cluster-action-rename"]`).click();
  // The rename input is rendered inside the cluster row.
  // Filter to inputs that are NOT type=checkbox.
  const input = page.locator('table tbody input:not([type="checkbox"])').first();
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.fill('Sample Renamed');

  // Watch for the editor spinner returning during/after the rename network
  // request. It must NEVER appear.
  let spinnerSeen = false;
  const watch = editorSpinner
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => { spinnerSeen = true; })
    .catch(() => { /* expected: never appears */ });

  await input.press('Enter');
  await watch;

  expect(spinnerSeen).toBe(false);
  // Row still shows the new name.
  await expect(
    page.getByRole('link', { name: 'Sample Renamed', exact: true }),
  ).toBeVisible({ timeout: 5_000 });
});
