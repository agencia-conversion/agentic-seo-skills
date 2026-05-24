import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('Graph view', () => {
  test('API returns nodes, edges, sections, and a broken count', async ({ request }) => {
    const res = await request.get(`/api/project/graph?token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.nodes.length).toBeGreaterThan(0);
    expect(body.edges.length).toBeGreaterThan(0);
    expect(body.totalBroken).toBeGreaterThanOrEqual(1); // fantasma is broken
    const broken = body.nodes.find((n: any) => n.broken);
    expect(broken).toBeTruthy();
    expect(broken.id).toMatch(/__broken__\/fantasma/);
  });

  test('Sections include brain and the broken nodes are flagged', async ({ request }) => {
    const res = await request.get(`/api/project/graph?token=${TOKEN}`);
    const body = await res.json();
    const brainSection = body.sections.find((s: any) => s.id === 'brain');
    expect(brainSection).toBeTruthy();
    expect(brainSection.count).toBeGreaterThanOrEqual(5);
    const brokenEdge = body.edges.find((e: any) => e.broken);
    expect(brokenEdge).toBeTruthy();
  });

  test('Graph page mounts the canvas and section filter toggles', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/graph`);
    await page.waitForSelector('[data-testid="graph-canvas"]', { timeout: 20_000 });
    await expect(page.locator('[data-testid="graph-counts"]')).toBeVisible();
    await expect(page.locator('[data-testid="graph-header"]')).toHaveCSS('border-bottom-width', '1px');
    const sidebarToggle = page.locator('[data-testid="graph-header"] [data-testid="workspace-sidebar-toggle"]');
    await expect(sidebarToggle).toBeVisible();
    await expect(page.locator('[data-testid="sidebar-tools"]')).toBeVisible();
    await sidebarToggle.click();
    await expect(page.locator('[data-testid="sidebar-tools"]')).toBeHidden();
    await sidebarToggle.click();
    await expect(page.locator('[data-testid="sidebar-tools"]')).toBeVisible();
    const brainToggle = page.locator('[data-testid="graph-section-toggle"][data-section="brain"]');
    await expect(brainToggle).toBeVisible();
    await expect(brainToggle).toHaveAttribute('data-active', 'true');
    await brainToggle.click();
    await expect(brainToggle).toHaveAttribute('data-active', 'false');
  });
});
