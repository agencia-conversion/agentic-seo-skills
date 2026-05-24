import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Backlinks & broken links', () => {
  test('API returns incoming + outgoing for brain/identidade.md', async ({ request }) => {
    const res = await request.get(`/api/project/backlinks?path=brain/identidade.md&token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.path).toBe('brain/identidade.md');
    const sources = body.incoming.map((m: any) => m.source);
    expect(sources).toContain('brain/index.md');
    expect(sources).toContain('brain/voz.md');
    const embed = body.incoming.find((m: any) => m.type === 'embed' && m.source === 'brain/index.md');
    expect(embed, 'embed mention should be detected').toBeTruthy();
    expect(embed.anchor).toBe('Frase-marca');
  });

  test('API rejects requests without the companion token', async ({ request }) => {
    const res = await request.get('/api/project/backlinks?path=brain/identidade.md', {
      headers: { 'x-companion-token': '' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('Broken links API flags the fantasma wikilink', async ({ request }) => {
    const res = await request.get(`/api/project/broken-links?token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
    const fantasma = body.flat.find((b: any) => b.rawTarget === 'fantasma');
    expect(fantasma, 'fantasma should be flagged').toBeTruthy();
    expect(fantasma.source).toBe('brain/index.md');
  });

  test('Linked mentions panel renders incoming + outgoing on the identidade page', async ({ page }) => {
    // Set token cookie/localStorage by visiting project root first
    await page.goto(`/project/${TOKEN}/brain-identidade`);
    // Wait for store to hydrate and editor to load
    await page.waitForSelector('[data-testid="linked-mentions-panel"]', { timeout: 20_000 });

    // identidade is referenced 3 times: index.md (wikilink + embed) and voz.md (wikilink)
    const incoming = page.locator('[data-testid="incoming-mention"]');
    await expect(incoming).toHaveCount(3);
    await expect(incoming.first()).toContainText(/Index|Voz/);
    // Embed mention from index.md is one of the three
    const embedMention = page.locator('[data-testid="incoming-mention"][data-source="brain/index.md"]').nth(0);
    await expect(embedMention).toBeVisible();

    const outgoingItems = page.locator('[data-testid="outgoing-link"]');
    await expect(outgoingItems.first()).toBeVisible();
  });

  test('Index page shows broken outgoing link with broken flag', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-index`);
    await page.waitForSelector('[data-testid="linked-mentions-panel"]', { timeout: 20_000 });

    const brokenFlag = page.locator('[data-testid="broken-flag"]');
    await expect(brokenFlag.first()).toBeVisible();
    const brokenLink = page.locator('[data-testid="outgoing-link"][data-broken="true"]');
    await expect(brokenLink.first()).toBeVisible();
  });

  test('Broken links page lists the fantasma reference grouped by source', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/broken-links`);
    await page.waitForSelector('[data-testid="broken-list"], [data-testid="broken-empty"]', { timeout: 20_000 });

    const list = page.locator('[data-testid="broken-list"]');
    await expect(list).toBeVisible();
    const group = page.locator('[data-testid="broken-source-group"][data-source="brain/index.md"]');
    await expect(group).toBeVisible();
    const entry = page.locator('[data-testid="broken-entry"][data-target="fantasma"]');
    await expect(entry).toBeVisible();
  });
});
