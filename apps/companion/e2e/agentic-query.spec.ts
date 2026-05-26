import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';

const TOKEN = TEST_TOKEN;

test.describe('agentic-query', () => {
  test('API executes query against brain and returns sorted rows', async ({ request }) => {
    const source = `
version: 1
from: "brain"
sort: title asc
limit: 5
columns: [title]
`;
    const res = await request.post(`/api/project/query?token=${TOKEN}`, { data: { source } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(5);
    // sorted asc by title
    const titles = body.items.map((i: any) => i.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    expect(titles).toEqual(sorted);
  });

  test('API rejects invalid YAML with errors array', async ({ request }) => {
    const res = await request.post(`/api/project/query?token=${TOKEN}`, {
      data: { source: ': : :' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test('API blocks from path that escapes project root', async ({ request }) => {
    const res = await request.post(`/api/project/query?token=${TOKEN}`, {
      data: { source: 'version: 1\nfrom: "../../etc"\n' },
    });
    const body = await res.json();
    // Either ok with empty results (path treated as invalid) or explicit guard
    expect(body.items?.length || 0).toBe(0);
  });

  test('Companion demo page renders agentic-query Tiptap node with source preserved', async ({ page }) => {
    await page.goto(`/project/${TOKEN}/brain-companion-demo`);
    await page.waitForSelector('[data-agentic-query]', { timeout: 20_000 });
    const block = page.locator('[data-agentic-query]');
    await expect(block).toBeVisible();
    // After M4, the hydrator replaces the inner content with a live table.
    // Source is preserved on the data-source attribute (round-trips to markdown).
    const source = await block.getAttribute('data-source');
    expect(source).toContain('from: "brain"');
    expect(source).toContain('sort: title asc');
  });
});
