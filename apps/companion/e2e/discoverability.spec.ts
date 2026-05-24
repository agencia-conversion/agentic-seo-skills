import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Discoverability — sidebar Tools + Cmd+P navigation', () => {
  test('Sidebar shows Tools section with 3 entries', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/`);
    await page.waitForSelector('[data-testid="sidebar-tools"]', { timeout: 20_000 });
    await expect(page.locator('[data-testid="sidebar-tool-graph"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-tool-tags"]')).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-tool-broken-links"]')).toBeVisible();
  });

  test('Click Graph in sidebar navigates to /graph', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/`);
    await page.waitForSelector('[data-testid="sidebar-tool-graph"]', { timeout: 20_000 });
    await page.click('[data-testid="sidebar-tool-graph"]');
    await page.waitForURL(/\/graph$/, { timeout: 10_000 });
    await page.waitForSelector('[data-testid="graph-canvas"]', { timeout: 20_000 });
    await expect(page.locator('[data-testid="sidebar-tool-graph"]')).toHaveAttribute('data-active', 'true');
  });

  test('Click Tags in sidebar navigates to /tags', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/`);
    await page.waitForSelector('[data-testid="sidebar-tool-tags"]', { timeout: 20_000 });
    await page.click('[data-testid="sidebar-tool-tags"]');
    await page.waitForURL(/\/tags$/, { timeout: 10_000 });
    await page.waitForSelector('[data-testid="tags-list"]', { timeout: 20_000 });
  });

  test('Click Broken Links in sidebar navigates to /broken-links', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/`);
    await page.waitForSelector('[data-testid="sidebar-tool-broken-links"]', { timeout: 20_000 });
    await page.click('[data-testid="sidebar-tool-broken-links"]');
    await page.waitForURL(/\/broken-links$/, { timeout: 10_000 });
  });

  test('Cmd+P shows Navigate group with 3 navigation items', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/`);
    // Wait for store + sidebar to hydrate
    await page.waitForSelector('[data-testid="sidebar-tools"]', { timeout: 20_000 });
    // Focus the body before sending the global shortcut
    await page.locator('body').click();
    await page.waitForTimeout(150);
    await page.keyboard.press('Meta+P');
    // Modal mounts via AnimatePresence; allow animation to complete
    await page.waitForSelector('[data-testid="search-nav-graph"]', { state: 'attached', timeout: 10_000 });
    await page.waitForSelector('[data-testid="search-nav-graph"]', { state: 'visible', timeout: 5_000 });
    await expect(page.locator('[data-testid="search-nav-graph"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-nav-tags"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-nav-broken-links"]')).toBeVisible();
  });

  test('Selecting "Graph view" in Cmd+P navigates to /graph', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/`);
    await page.waitForSelector('[data-testid="sidebar-tools"]', { timeout: 20_000 });
    await page.locator('body').click();
    await page.waitForTimeout(150);
    await page.keyboard.press('Meta+P');
    await page.waitForSelector('[data-testid="search-nav-graph"]', { state: 'visible', timeout: 10_000 });
    // cmdk needs a direct click; force to bypass any backdrop blocker
    await page.locator('[data-testid="search-nav-graph"]').click({ force: true });
    await page.waitForURL(/\/graph$/, { timeout: 10_000 });
  });
});
