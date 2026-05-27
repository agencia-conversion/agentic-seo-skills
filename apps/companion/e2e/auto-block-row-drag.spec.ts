import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { PROJECT_ROOT, TEST_TOKEN } from './test-constants';

const CLUSTER_YAML = join(PROJECT_ROOT, 'clusters', 'sample-cluster', 'cluster.yaml');

function readYaml(): Record<string, unknown> {
  return YAML.parse(readFileSync(CLUSTER_YAML, 'utf8')) as Record<string, unknown>;
}

function writeYaml(data: Record<string, unknown>): void {
  writeFileSync(CLUSTER_YAML, YAML.stringify(data, { lineWidth: 0 }), 'utf8');
}

test.describe('auto-block row drag — agentic-clusters-by-area', () => {
  test.beforeEach(() => {
    const data = readYaml();
    data.area = 'fundamentos';
    writeYaml(data);
  });

  test('cross-block drag moves cluster.yaml.area on disk', async ({ page, request }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    await page.goto(`/project/${TEST_TOKEN}/brain-companion-row-drag-demo`);

    const fundamentosBlock = page
      .locator('[data-auto-block][data-kind="agentic-clusters-by-area"]')
      .first();
    const outraBlock = page
      .locator('[data-auto-block][data-kind="agentic-clusters-by-area"]')
      .nth(1);
    await fundamentosBlock.waitFor({ state: 'visible', timeout: 15_000 });
    await outraBlock.waitFor({ state: 'visible', timeout: 15_000 });

    // Wait for hydration: the source row should be draggable.
    const sourceRow = fundamentosBlock.locator(
      '[data-auto-block-row="true"][data-row-key="sample-cluster"]',
    );
    await sourceRow.waitFor({ state: 'visible', timeout: 10_000 });

    // Chromium does not let synthetic DragEvent instances carry a writable
    // DataTransfer through dispatch (the dataTransfer field is read-only for
    // simulated events). To exercise the hydrator end-to-end we replay the
    // payload the dragstart handler would have produced and feed it to the
    // drop handler via a shimmed event that exposes the same `getData` API.
    await page.evaluate(() => {
      const sourceHost = document.querySelectorAll(
        '[data-auto-block][data-kind="agentic-clusters-by-area"]',
      )[0] as HTMLElement;
      const targetHost = document.querySelectorAll(
        '[data-auto-block][data-kind="agentic-clusters-by-area"]',
      )[1] as HTMLElement;
      const sourceBody = sourceHost.getAttribute('data-body') || '';
      // Inline YAML parse: each line is `key: value` or `key:` for nested
      // (no nested params in current schema, just flat key:value).
      const parsed: Record<string, unknown> = {};
      for (const line of sourceBody.split('\n')) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        let value: string | number = m[2].replace(/^"|"$/g, '').trim();
        if (/^\d+$/.test(value)) value = Number(value);
        parsed[key] = value;
      }
      const fingerprint = String(parsed.materialized_fingerprint || '');
      const params = { ...parsed };
      delete params.materialized;
      delete params.materialized_at;
      delete params.materialized_fingerprint;

      const payload = {
        kind: 'agentic-clusters-by-area',
        params,
        rowKey: 'sample-cluster',
        fingerprint,
      };
      // Shimmed DragEvent — `dataTransfer.getData` returns the canonical
      // payload only for the right mime, mirroring the real Chromium API.
      const fakeDT = {
        types: ['application/x-auto-block-row'],
        dropEffect: 'move' as const,
        getData(mime: string) {
          return mime === 'application/x-auto-block-row' ? JSON.stringify(payload) : '';
        },
      };
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, 'dataTransfer', { value: fakeDT });
      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      Object.defineProperty(dragOverEvent, 'dataTransfer', { value: fakeDT });
      targetHost.dispatchEvent(dragOverEvent);
      targetHost.dispatchEvent(dropEvent);
    });

    // Wait for cluster.yaml to reflect the new area.
    await expect
      .poll(() => readYaml().area as string, { timeout: 10_000 })
      .toBe('outra-area');

    // Confirm via API too.
    const expand = await request.post(
      `/api/project/auto-block/expand?token=${TEST_TOKEN}`,
      { data: { kind: 'agentic-clusters-by-area', params: { area: 'outra-area' } } },
    );
    const data = await expand.json();
    expect(data.ok).toBe(true);
    expect(data.materialized).toContain('sample-cluster');
  });

  test('within-block drag (same params) does not change disk', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-companion-row-drag-demo`);
    const fundamentos = page
      .locator('[data-auto-block][data-kind="agentic-clusters-by-area"]')
      .first();
    await fundamentos.waitFor({ state: 'visible', timeout: 15_000 });
    const sourceRow = fundamentos.locator(
      '[data-auto-block-row="true"][data-row-key="sample-cluster"]',
    );
    await sourceRow.waitFor({ state: 'visible', timeout: 10_000 });

    const before = readYaml();

    await page.evaluate(() => {
      const host = document.querySelectorAll(
        '[data-auto-block][data-kind="agentic-clusters-by-area"]',
      )[0] as HTMLElement;
      const sourceBody = host.getAttribute('data-body') || '';
      const parsed: Record<string, unknown> = {};
      for (const line of sourceBody.split('\n')) {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
        if (!m) continue;
        const key = m[1];
        let value: string | number = m[2].replace(/^"|"$/g, '').trim();
        if (/^\d+$/.test(value)) value = Number(value);
        parsed[key] = value;
      }
      const fingerprint = String(parsed.materialized_fingerprint || '');
      const params = { ...parsed };
      delete params.materialized;
      delete params.materialized_at;
      delete params.materialized_fingerprint;
      // NOTE: do NOT delete `version` — the hydrator's drop handler keeps it
      // in the target's params, so JSON.stringify(target) === stringify(source)
      // only when both include version.
      const payload = {
        kind: 'agentic-clusters-by-area',
        params,
        rowKey: 'sample-cluster',
        fingerprint,
      };
      const fakeDT = {
        types: ['application/x-auto-block-row'],
        dropEffect: 'move' as const,
        getData(mime: string) {
          return mime === 'application/x-auto-block-row' ? JSON.stringify(payload) : '';
        },
      };
      const dragOver = new Event('dragover', { bubbles: true, cancelable: true });
      Object.defineProperty(dragOver, 'dataTransfer', { value: fakeDT });
      const drop = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(drop, 'dataTransfer', { value: fakeDT });
      host.dispatchEvent(dragOver);
      host.dispatchEvent(drop);
    });

    // Give the rejection toast a moment to render.
    await page.waitForTimeout(400);

    const after = readYaml();
    expect(after.area).toBe(before.area);

    // Toast should mention canonical ordering.
    await expect(
      page.locator('text=Ordem é determinada pelo tipo').first(),
    ).toBeVisible({ timeout: 2_000 });
  });
});
