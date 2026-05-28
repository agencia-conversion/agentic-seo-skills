import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

test.describe('cluster row actions menu', () => {
  test('kebab opens dropdown with 4 actions visible', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    const trigger = page.locator('[data-testid="cluster-actions-sample-cluster"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.locator('[data-testid="cluster-action-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="cluster-action-rename"]')).toBeVisible();
    await expect(page.locator('[data-testid="cluster-action-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="cluster-action-archive"]')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('clicking Renomear enters inline edit mode', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('[data-testid="cluster-actions-sample-cluster"]').click();
    await page.locator('[data-testid="cluster-action-rename"]').click();
    // RenameClusterInput renders within the tbody row when editingClusterSlug is set.
    // The element has no explicit type attribute (defaults to text).
    const row = page.locator('tbody tr', {
      has: page.locator('[data-testid="cluster-actions-sample-cluster"]'),
    });
    const renameInput = row.locator('input:not([type])');
    await expect(renameInput).toBeVisible({ timeout: 3_000 });
    await page.keyboard.press('Escape');
  });

  test('clicking Mudar status reveals submenu and patches cluster', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('[data-testid="cluster-actions-sample-cluster"]').click();
    await page.locator('[data-testid="cluster-action-status"]').click();
    const statusOpts = ['active', 'drafting', 'proposed', 'archived'];
    for (const opt of statusOpts) {
      await expect(page.locator(`[data-testid="cluster-action-status-${opt}"]`)).toBeVisible();
    }
    await page.locator('[data-testid="cluster-action-status-drafting"]').click();
    await page.waitForTimeout(1500);

    const res = await request.get(`/api/project/clusters?token=${TEST_TOKEN}`);
    const body = await res.json();
    const sample = (body.clusters || []).find((c: { slug: string }) => c.slug === 'sample-cluster');
    expect(sample?.status).toBe('drafting');

    // Restore for other specs.
    await request.patch(
      `/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`,
      { data: { status: 'active', syncWait: true } },
    );
  });

  test('clicking Arquivar opens ConfirmModal and confirming archives cluster', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('[data-testid="cluster-actions-sample-cluster"]').click();
    await page.locator('[data-testid="cluster-action-archive"]').click();

    const modal = page.locator('text=Arquivar cluster').first();
    await expect(modal).toBeVisible();
    await page.getByRole('button', { name: 'Arquivar', exact: true }).click();
    await page.waitForTimeout(1500);

    const res = await request.get(`/api/project/clusters?token=${TEST_TOKEN}`);
    const body = await res.json();
    const sample = (body.clusters || []).find((c: { slug: string }) => c.slug === 'sample-cluster');
    expect(sample?.status).toBe('archived');

    // Restore for other specs.
    await request.patch(
      `/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`,
      { data: { status: 'active', syncWait: true } },
    );
  });
});
