import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Live renders — agentic-query + mermaid', () => {
  test('AgenticQuery in brain/companion-demo renders a table with results', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-companion-demo`);
    // Hydration: wait for the data-agentic-query-result table to appear
    await page.waitForSelector('[data-agentic-query-result] table', { timeout: 20_000 });
    const table = page.locator('[data-agentic-query-result] table');
    await expect(table).toBeVisible();
    // The query is "from: brain, sort: title asc, limit: 5" — should have multiple rows
    const rows = page.locator('[data-agentic-query-result] tbody tr[data-agentic-query-row]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('AgenticQuery row click navigates to the file', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-companion-demo`);
    await page.waitForSelector('[data-agentic-query-result] table tbody tr[data-agentic-query-row]', { timeout: 20_000 });
    const rows = page.locator('[data-agentic-query-result] tbody tr[data-agentic-query-row]');
    const count = await rows.count();
    let targetRow = rows.first();
    let targetPath = await targetRow.getAttribute('data-path');
    for (let i = 0; i < count; i++) {
      const candidate = rows.nth(i);
      const candidatePath = await candidate.getAttribute('data-path');
      if (candidatePath && candidatePath !== 'brain/companion-demo.md') {
        targetRow = candidate;
        targetPath = candidatePath;
        break;
      }
    }
    expect(targetPath).toBeTruthy();
    expect(targetPath).not.toBe('brain/companion-demo.md');
    await targetRow.click();
    // URL should change away from the demo page.
    await page.waitForFunction(() => !window.location.pathname.endsWith('brain-companion-demo'), { timeout: 5_000 });
  });

  test('Mermaid in brain/identity renders an SVG (not raw source)', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-identity`);
    await page.waitForSelector('[data-mermaid-result] svg', { timeout: 20_000 });
    const svg = page.locator('[data-mermaid-result] svg');
    await expect(svg).toBeVisible();
  });
});
