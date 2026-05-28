import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Backlinks & broken links', () => {
  test('API returns incoming + outgoing for brain/identity.md', async ({ request }) => {
    const res = await request.get(`/api/project/backlinks?path=brain/identity.md&token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.path).toBe('brain/identity.md');
    const sources = body.incoming.map((m: any) => m.source);
    expect(sources).toContain('brain/index.md');
    expect(sources).toContain('brain/voice.md');
    const indexMention = body.incoming.find((m: any) => m.type === 'wikilink' && m.source === 'brain/index.md');
    expect(indexMention, 'index should mention identity with a regular wikilink').toBeTruthy();
  });

  test('API rejects requests without the companion token', async ({ request }) => {
    const res = await request.get('/api/project/backlinks?path=brain/identity.md', {
      headers: { 'x-companion-token': '' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Broken links API has no fantasma reference in the cleaned brain index', async ({ request }) => {
    const res = await request.get(`/api/project/broken-links?token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const fantasma = body.flat.find((b: any) => b.rawTarget === 'fantasma');
    expect(fantasma, 'fantasma should not be present in the index fixture').toBeFalsy();
  });

  test('Linked mentions panel renders incoming + outgoing on the identity page', async ({ page }) => {
    // Set token cookie/localStorage by visiting project root first
    await page.goto(`/project/${TOKEN}/brain-identity`);
    // Wait for store to hydrate and editor to load
    await page.waitForSelector('[data-testid="linked-mentions-panel"]', { timeout: 20_000 });

    // Both sections start collapsed by default
    const incomingSection = page.locator('[data-testid="linked-mentions-incoming"]');
    const outgoingSection = page.locator('[data-testid="linked-mentions-outgoing"]');
    await expect(incomingSection).toHaveAttribute('data-open', 'false');
    await expect(outgoingSection).toHaveAttribute('data-open', 'false');

    // identity is referenced by index.md and voice.md with regular wikilinks.
    const incoming = page.locator('[data-testid="incoming-mention"]');
    await expect(incoming).toHaveCount(2);

    // Expand incoming and check visibility
    await incomingSection.locator('summary').click();
    await expect(incomingSection).toHaveAttribute('data-open', 'true');
    await expect(incoming.first()).toContainText(/Sample Project|Tom de Voz/);
    const indexMention = page.locator('[data-testid="incoming-mention"][data-source="brain/index.md"]').nth(0);
    await expect(indexMention).toBeVisible();

    // Expand outgoing and check visibility
    await outgoingSection.locator('summary').click();
    await expect(outgoingSection).toHaveAttribute('data-open', 'true');
    const outgoingItems = page.locator('[data-testid="outgoing-link"]');
    await expect(outgoingItems.first()).toBeVisible();
  });

  test('Index page outgoing links do not show broken flags', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-index`);
    await page.waitForSelector('[data-testid="linked-mentions-panel"]', { timeout: 20_000 });

    // Outgoing section is collapsed by default; expand it before asserting on items
    const outgoingSection = page.locator('[data-testid="linked-mentions-outgoing"]');
    await outgoingSection.locator('summary').click();
    await expect(outgoingSection).toHaveAttribute('data-open', 'true');

    const brokenFlag = page.locator('[data-testid="broken-flag"]');
    await expect(brokenFlag).toHaveCount(0);
    const brokenLink = page.locator('[data-testid="outgoing-link"][data-broken="true"]');
    await expect(brokenLink).toHaveCount(0);
  });

  test('Linked mentions sections start collapsed by default', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-identity`);
    await page.waitForSelector('[data-testid="linked-mentions-panel"]', { timeout: 20_000 });

    const incomingSection = page.locator('[data-testid="linked-mentions-incoming"]');
    const outgoingSection = page.locator('[data-testid="linked-mentions-outgoing"]');
    await expect(incomingSection).toHaveAttribute('data-open', 'false');
    await expect(outgoingSection).toHaveAttribute('data-open', 'false');

    // Summary (heading row) is visible; first item inside is not
    await expect(incomingSection.locator('summary').first()).toBeVisible();
    await expect(outgoingSection.locator('summary').first()).toBeVisible();
    await expect(page.locator('[data-testid="incoming-mention"]').first()).not.toBeVisible();
    await expect(page.locator('[data-testid="outgoing-link"]').first()).not.toBeVisible();
  });

  test('Broken links page shows empty state when the fixture has no broken references', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/broken-links`);
    await page.waitForSelector('[data-testid="broken-list"], [data-testid="broken-empty"]', { timeout: 20_000 });

    await expect(page.locator('[data-testid="broken-empty"]')).toBeVisible();
  });
});
