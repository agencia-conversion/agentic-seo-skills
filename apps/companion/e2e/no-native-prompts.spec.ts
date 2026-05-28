import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

// Regression guard: any native dialog (prompt/confirm/alert) call indicates
// a regression because the Companion replaces all dialogs with React modals.
test.describe('no native browser dialogs', () => {
  test('slash commands and auto-block actions never call window.prompt/confirm/alert', async ({ page }) => {
    await page.addInitScript(() => {
      const counters: { prompt: number; confirm: number; alert: number } = {
        prompt: 0,
        confirm: 0,
        alert: 0,
      };
      (window as unknown as Record<string, unknown>).__nativeDialogs = counters;
      window.prompt = ((..._args: unknown[]) => {
        counters.prompt++;
        return null;
      }) as typeof window.prompt;
      window.confirm = ((..._args: unknown[]) => {
        counters.confirm++;
        return false;
      }) as typeof window.confirm;
      window.alert = ((..._args: unknown[]) => {
        counters.alert++;
      }) as typeof window.alert;
    });

    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    // 1) Trigger slash menu and exercise the slash commands that previously
    //    used window.prompt.
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('.ProseMirror').first();
    await editor.waitFor({ state: 'visible', timeout: 10_000 });
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');
    // Image command
    await page.keyboard.type('Image');
    await page.waitForTimeout(400);
    const imageItem = page.locator('[data-testid="slash-item-image"]');
    if (await imageItem.isVisible().catch(() => false)) {
      await imageItem.click();
      // Modal should appear; Escape to cancel without inserting.
      await page.keyboard.press('Escape');
    }

    // Cluster content slash command
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/Conteúdos');
    await page.waitForTimeout(400);
    const clusterContentItem = page.locator('[data-testid="slash-item-cluster-content"]');
    if (await clusterContentItem.isVisible().catch(() => false)) {
      await clusterContentItem.click();
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
    }

    // 2) Trigger the auto-block "configure" action (used to call window.prompt).
    const autoBlockHost = page
      .locator('[data-auto-block][data-kind]')
      .first();
    if (await autoBlockHost.isVisible().catch(() => false)) {
      const configureBtn = autoBlockHost.locator('[data-auto-block-action="configure"]');
      if (await configureBtn.isVisible().catch(() => false)) {
        await configureBtn.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
      }
    }

    // 3) Assert counts. Any non-zero count indicates a regression.
    const counts = (await page.evaluate(
      () => (window as unknown as { __nativeDialogs: Record<string, number> }).__nativeDialogs,
    )) as { prompt: number; confirm: number; alert: number };
    expect(counts.prompt).toBe(0);
    expect(counts.confirm).toBe(0);
    expect(counts.alert).toBe(0);
  });
});
