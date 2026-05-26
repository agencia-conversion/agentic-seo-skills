import { test } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const TOKEN = TEST_TOKEN;
const SCREENSHOT_DIR = resolve(__dirname, '..', '..', '..', '.context', 'screenshots');

test.beforeAll(() => {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe('Visual UX evidence (screenshots)', () => {
  test('Sidebar with Tools section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/project/${TOKEN}/brain-identidade`);
    await page.waitForSelector('[data-testid="sidebar-tool-graph"]', { timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'sidebar-tools.png'), fullPage: false });
  });

  test('Cmd+P open with Navigation group', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/project/${TOKEN}/`);
    await page.waitForSelector('[data-testid="sidebar-tool-graph"]', { timeout: 20_000 });
    await page.locator('body').click();
    await page.keyboard.press('Meta+P');
    await page.waitForSelector('[data-testid="search-nav-graph"]', { timeout: 10_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'cmd-p-navigation.png'), fullPage: false });
  });

  test('Slash menu open with new entries', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/project/${TOKEN}/brain-voz`);
    await page.waitForSelector('.ProseMirror', { timeout: 20_000 });
    await page.locator('.ProseMirror').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    await page.waitForSelector('[data-testid="slash-item-callout"]', { timeout: 5_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'slash-menu-new-entries.png'), fullPage: false });
  });

  test('AgenticQuery rendered as live table on brain/companion-demo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/project/${TOKEN}/brain-companion-demo`);
    await page.waitForSelector('[data-agentic-query-result] table', { timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'agentic-query-live-table.png'), fullPage: true });
  });

  test('Mermaid rendered as SVG on brain/identidade', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/project/${TOKEN}/brain-identidade`);
    await page.waitForSelector('[data-mermaid-result] svg', { timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'mermaid-svg-render.png'), fullPage: true });
  });

  test('Callout rendered on brain/identidade', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/project/${TOKEN}/brain-identidade`);
    await page.waitForSelector('[data-callout]', { timeout: 20_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'callout-render.png'), fullPage: true });
  });

  test('Graph view page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/project/${TOKEN}/graph`);
    await page.waitForSelector('[data-testid="graph-canvas"]', { timeout: 20_000 });
    await page.waitForTimeout(1500); // let cytoscape layout settle
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'graph-view.png'), fullPage: false });
  });

  test('Tags page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/project/${TOKEN}/tags`);
    await page.waitForSelector('[data-testid="tags-list"]', { timeout: 20_000 });
    // Click the first tag to show detail
    const firstTag = page.locator('[data-testid="tag-button"]').first();
    if (await firstTag.isVisible()) await firstTag.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'tags-page.png'), fullPage: false });
  });

  test('Broken links page', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/project/${TOKEN}/broken-links`);
    await page.waitForSelector('[data-testid="broken-list"], [data-testid="broken-empty"]', { timeout: 20_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(SCREENSHOT_DIR, 'broken-links-page.png'), fullPage: false });
  });
});
