import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Tags index', () => {
  test('API returns tags with counts and source mix', async ({ request }) => {
    const res = await request.get(`/api/project/tags?token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBeGreaterThan(0);

    const exemplo = body.tags.find((t: any) => t.tag === 'exemplo');
    expect(exemplo, 'exemplo tag must exist').toBeTruthy();
    // Appears in identity.md (fm + inline = both) and voice.md (fm only)
    expect(exemplo.count).toBeGreaterThanOrEqual(2);

    const identityFile = exemplo.files.find((f: any) => f.path === 'brain/identity.md');
    expect(identityFile, 'identity.md must reference exemplo').toBeTruthy();
    expect(identityFile.source).toBe('both');
  });

  test('Tags page renders list, click drills into files', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/tags`);
    await page.waitForSelector('[data-testid="tags-list"]', { timeout: 20_000 });
    const total = page.locator('[data-testid="tags-total"]');
    await expect(total).toBeVisible();

    const exemploBtn = page.locator('[data-testid="tag-button"][data-tag="exemplo"]');
    await expect(exemploBtn).toBeVisible();
    await exemploBtn.click();

    const detail = page.locator('[data-testid="tags-detail"]');
    await expect(detail).toContainText('exemplo');
    const files = page.locator('[data-testid="tag-file"]');
    await expect(files.first()).toBeVisible();
  });
});
