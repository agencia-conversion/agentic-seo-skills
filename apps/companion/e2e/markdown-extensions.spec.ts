import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Markdown extensions (callout, embed, mermaid)', () => {
  test('Identidade page renders callout with title and type', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-identidade`);
    await page.waitForSelector('[data-callout]', { timeout: 20_000 });
    const callout = page.locator('[data-callout][data-callout-type="warning"]');
    await expect(callout).toBeVisible();
    await expect(callout).toContainText('Atenção');
    await expect(callout).toContainText('brain de fixture');
  });

  test('Identidade page renders mermaid fence (source preserved + SVG hydrated)', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-identidade`);
    await page.waitForSelector('[data-mermaid]', { timeout: 20_000 });
    const mermaid = page.locator('[data-mermaid]');
    await expect(mermaid).toBeVisible();
    // Source preserved on data-source attribute (round-trips back to markdown)
    const source = await mermaid.getAttribute('data-source');
    expect(source).toContain('flowchart TD');
    // After M4, hydrator renders an SVG
    await page.waitForSelector('[data-mermaid-result] svg', { timeout: 20_000 });
  });

  test('Companion demo page renders pageEmbed card with the embed marker', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-companion-demo`);
    await page.waitForSelector('[data-page-embed]', { timeout: 20_000 });
    const embed = page.locator('[data-page-embed]');
    await expect(embed).toBeVisible();
    await expect(embed).toContainText('Embed');
  });

  test('Tom de Voz page callout type tip renders without title', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-voz`);
    await page.waitForSelector('[data-callout][data-callout-type="tip"]', { timeout: 20_000 });
    const tip = page.locator('[data-callout][data-callout-type="tip"]');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Dica');
  });
});
