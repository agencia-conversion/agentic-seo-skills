import { test, expect, type Page } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const CLUSTERS_URL = `/project/${TEST_TOKEN}/brain-topic-clusters`;
const SETTINGS_KEY = 'agentic-seo-companion-settings';

async function seedSettings(page: Page, value: Record<string, unknown>) {
  await page.addInitScript(
    ({ key, value }) => {
      try {
        const raw = window.localStorage.getItem(key);
        const parsed = (raw ? JSON.parse(raw) : {}) as Record<string, unknown>;
        Object.assign(parsed, value);
        window.localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        // ignore storage errors; defaults will apply
      }
    },
    { key: SETTINGS_KEY, value },
  );
}

async function clearSettingsKey(page: Page, fieldName: string) {
  await page.addInitScript(
    ({ key, field }) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        delete parsed[field];
        window.localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        // ignore storage errors; defaults will apply
      }
    },
    { key: SETTINGS_KEY, field: fieldName },
  );
}

test.describe('clusters filter by editorial area', () => {
  test('filter trigger renders with default label', async ({ page }) => {
    await clearSettingsKey(page, 'clusterAreaFiltersByTable');
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });

    const trigger = page.locator('[data-testid="cluster-area-filter-trigger"]');
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('Áreas (todas)');
  });

  test('opening dropdown reveals area checkboxes from fixture', async ({ page }) => {
    await clearSettingsKey(page, 'clusterAreaFiltersByTable');
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('[data-testid="cluster-area-filter-trigger"]').click();
    const menu = page.locator('[data-testid="cluster-area-filter-menu"]');
    await expect(menu).toBeVisible();

    // Fixture sample-cluster has area: fundamentos / area_name: Fundamentos.
    const opt = page.locator('[data-testid="cluster-area-filter-option-fundamentos"]');
    await expect(opt).toBeVisible();
    await expect(menu).toContainText('Fundamentos');
  });

  test('selecting an area updates trigger label and count badge', async ({ page }) => {
    await clearSettingsKey(page, 'clusterAreaFiltersByTable');
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });

    const trigger = page.locator('[data-testid="cluster-area-filter-trigger"]');
    const badge = page.locator('[data-testid="cluster-area-filter-count"]');
    const initialBadgeText = await badge.textContent();
    expect(initialBadgeText).toMatch(/^\d+ ativo/);

    await trigger.click();
    await page.locator('[data-testid="cluster-area-filter-option-fundamentos"]').click();

    await expect(trigger).toContainText('Áreas (1)');
    await expect(badge).toContainText('de');
    // Close popover and assert the row still rendered (the only cluster IS in fundamentos).
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="cluster-actions-sample-cluster"]')).toBeVisible();
  });

  test('filtering by a non-matching area hides the only row', async ({ page }) => {
    await seedSettings(page, {
      clusterAreaFiltersByTable: { 'active-clusters': ['nonexistent-area'] },
    });
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });

    const trigger = page.locator('[data-testid="cluster-area-filter-trigger"]');
    await expect(trigger).toContainText('Áreas (1)');
    await expect(page.getByText('Nenhum cluster ativo.')).toBeVisible();
    await expect(page.locator('[data-testid="cluster-area-filter-count"]')).toContainText('0 de');
  });

  test('selecting an area persists across reload', async ({ page }) => {
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    // Reset the persisted filter via runtime evaluate (init scripts re-run on
    // reload and would undo our UI selection, so we do not use them here).
    await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      delete parsed.clusterAreaFiltersByTable;
      window.localStorage.setItem(key, JSON.stringify(parsed));
    }, SETTINGS_KEY);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.locator('[data-testid="cluster-area-filter-trigger"]')).toContainText('Áreas (todas)');

    // Set filter via the UI so it writes through setSettings -> localStorage.
    await page.locator('[data-testid="cluster-area-filter-trigger"]').click();
    await page.locator('[data-testid="cluster-area-filter-option-fundamentos"]').click();
    await expect(page.locator('[data-testid="cluster-area-filter-trigger"]')).toContainText('Áreas (1)');
    await page.keyboard.press('Escape');

    // Verify localStorage actually holds the value.
    const stored = await page.evaluate((key) => window.localStorage.getItem(key), SETTINGS_KEY);
    expect(stored).toContain('fundamentos');

    // Reload — selection should persist via localStorage.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.locator('[data-testid="cluster-area-filter-trigger"]')).toContainText('Áreas (1)');
  });

  test('Limpar resets selection', async ({ page }) => {
    await seedSettings(page, {
      clusterAreaFiltersByTable: { 'active-clusters': ['fundamentos'] },
    });
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });

    const trigger = page.locator('[data-testid="cluster-area-filter-trigger"]');
    await expect(trigger).toContainText('Áreas (1)');

    await trigger.click();
    await page.locator('[data-testid="cluster-area-filter-clear"]').click();
    await expect(trigger).toContainText('Áreas (todas)');

    // Verify localStorage now lacks the filter for this table.
    const stored = await page.evaluate((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return (parsed.clusterAreaFiltersByTable as Record<string, unknown> | undefined)?.['active-clusters'] ?? null;
    }, SETTINGS_KEY);
    expect(stored).toBeNull();
  });
});
