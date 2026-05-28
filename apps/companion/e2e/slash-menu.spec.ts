import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

async function openEditablePage(page: any) {
  // workbench/companion/* is writeable; create-or-open the brain index instead since it's predictable.
  // We use brain/voice which we know is non-readonly in fixtures.
  await page.goto(`/project/${TOKEN}/brain-voice`);
  await page.waitForSelector('.ProseMirror', { timeout: 20_000 });
  // Wait one tick for editor to accept input.
  await page.locator('.ProseMirror').click();
  await page.waitForTimeout(150);
}

async function typeSlash(page: any) {
  // Move cursor to end and type '/'.
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/');
  // Slash menu mounts as a popup; wait for any new slash menu item to appear.
  await page.waitForSelector('[data-testid="slash-item-callout"]', { timeout: 5_000 });
}

test.describe('Slash menu — new node entries', () => {
  test('Slash menu lists Callout / Mermaid / Embed / Query', async ({ page }) => {
    await openEditablePage(page);
    await typeSlash(page);
    await expect(page.locator('[data-testid="slash-item-callout"]')).toBeVisible();
    await expect(page.locator('[data-testid="slash-item-mermaid"]')).toBeVisible();
    await expect(page.locator('[data-testid="slash-item-embed"]')).toBeVisible();
    await expect(page.locator('[data-testid="slash-item-query"]')).toBeVisible();
  });

  test('Selecting Callout inserts a callout block', async ({ page }) => {
    await openEditablePage(page);
    await typeSlash(page);
    await page.click('[data-testid="slash-item-callout"]');
    await page.waitForSelector('[data-callout]', { timeout: 5_000 });
    await expect(page.locator('[data-callout]').last()).toBeVisible();
  });

  test('Selecting Mermaid inserts a mermaid block with seed source', async ({ page }) => {
    await openEditablePage(page);
    await typeSlash(page);
    await page.click('[data-testid="slash-item-mermaid"]');
    await page.waitForSelector('[data-mermaid]', { timeout: 5_000 });
    const block = page.locator('[data-mermaid]').last();
    await expect(block).toBeVisible();
    // Source preserved on data-source attribute (hydrator replaces innerHTML with SVG)
    const source = await block.getAttribute('data-source');
    expect(source).toContain('flowchart TD');
  });

  test('Selecting Agentic query inserts a query block with seed source', async ({ page }) => {
    await openEditablePage(page);
    await typeSlash(page);
    await page.click('[data-testid="slash-item-query"]');
    await page.waitForSelector('[data-agentic-query]', { timeout: 5_000 });
    const block = page.locator('[data-agentic-query]').last();
    await expect(block).toBeVisible();
    // Source preserved on data-source attribute (hydrator replaces innerHTML with table)
    const source = await block.getAttribute('data-source');
    expect(source).toContain('from: "brain"');
  });

  test('Selecting Embed inserts ![[ marker (mention picker opens after)', async ({ page }) => {
    await openEditablePage(page);
    await typeSlash(page);
    await page.click('[data-testid="slash-item-embed"]');
    // The seed text "![[" should appear; the picker UI is the existing MentionPopup which opens via the ProseMirror plugin chain.
    const editorContent = await page.locator('.ProseMirror').innerText();
    expect(editorContent).toContain('![[');
  });
});
