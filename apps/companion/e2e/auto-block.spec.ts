import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

const CLUSTER_YAML = join(PROJECT_ROOT, 'clusters', 'sample-cluster', 'cluster.yaml');

function readClusterYaml(): Record<string, unknown> {
  return YAML.parse(readFileSync(CLUSTER_YAML, 'utf8')) as Record<string, unknown>;
}

test.describe('auto-block API + reverse-sync', () => {
  test('GET /api/project/auto-block/schema returns columns metadata', async ({ request }) => {
    const res = await request.get(
      `/api/project/auto-block/schema?kind=agentic-clusters-by-area&token=${TEST_TOKEN}`,
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.kind).toBe('agentic-clusters-by-area');
    expect(Array.isArray(data.columns)).toBe(true);
    const nameCol = data.columns.find((c: { key: string }) => c.key === 'name');
    expect(nameCol).toBeTruthy();
    expect(nameCol.editable).toBe(true);
    expect(nameCol.derived).toBe(false);
    const clusterCol = data.columns.find((c: { key: string }) => c.key === 'cluster');
    expect(clusterCol.derived).toBe(true);
    expect(clusterCol.editable).toBe(false);
  });

  test('POST /api/project/auto-block/expand renders materialized for fixture cluster', async ({ request }) => {
    const res = await request.post(`/api/project/auto-block/expand?token=${TEST_TOKEN}`, {
      data: { kind: 'agentic-clusters-by-area', params: { area: 'fundamentos' } },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.materialized).toBe('string');
    expect(data.materialized).toContain('sample-cluster');
    expect(typeof data.materialized_fingerprint).toBe('string');
    expect(data.materialized_fingerprint.length).toBeGreaterThan(8);
  });

  test('POST /api/project/auto-block/mutate cell write updates cluster.yaml', async ({ request }) => {
    const before = readClusterYaml();
    const expand = await request.post(`/api/project/auto-block/expand?token=${TEST_TOKEN}`, {
      data: { kind: 'agentic-clusters-by-area', params: { area: 'fundamentos' } },
    });
    const expandData = await expand.json();
    const fingerprint = expandData.materialized_fingerprint as string;

    const mutate = await request.post(`/api/project/auto-block/mutate?token=${TEST_TOKEN}`, {
      data: {
        kind: 'agentic-clusters-by-area',
        params: { area: 'fundamentos' },
        expected_fingerprint: fingerprint,
        mutation: {
          type: 'cell',
          row: 'sample-cluster',
          column: 'name',
          value: 'Sample Cluster — Edited',
        },
        actor: 'e2e-test',
      },
    });
    expect(mutate.ok()).toBeTruthy();
    const mutateData = await mutate.json();
    expect(mutateData.ok).toBe(true);
    expect(mutateData.descriptor.fieldPath).toBe('name');
    expect(mutateData.descriptor.after).toBe('Sample Cluster — Edited');

    const after = readClusterYaml();
    expect(after.name).toBe('Sample Cluster — Edited');
    expect(before.name).not.toBe(after.name);

    // Restore for idempotency in subsequent runs.
    await request.post(`/api/project/auto-block/mutate?token=${TEST_TOKEN}`, {
      data: {
        kind: 'agentic-clusters-by-area',
        params: { area: 'fundamentos' },
        expected_fingerprint: mutateData.new_fingerprint,
        mutation: {
          type: 'cell',
          row: 'sample-cluster',
          column: 'name',
          value: before.name,
        },
        actor: 'e2e-test-restore',
      },
    });
  });

  test('POST /api/project/auto-block/mutate rejects with 409 on fingerprint mismatch', async ({ request }) => {
    const res = await request.post(`/api/project/auto-block/mutate?token=${TEST_TOKEN}`, {
      data: {
        kind: 'agentic-clusters-by-area',
        params: { area: 'fundamentos' },
        expected_fingerprint: 'deadbeefdead',
        mutation: {
          type: 'cell',
          row: 'sample-cluster',
          column: 'name',
          value: 'irrelevant',
        },
        actor: 'e2e-test',
      },
    });
    expect(res.status()).toBe(409);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.conflict).toBeTruthy();
    expect(data.conflict.current_fingerprint).toBeTruthy();
  });

  test('POST /api/project/auto-block/mutate rejects writes to derived column', async ({ request }) => {
    const expand = await request.post(`/api/project/auto-block/expand?token=${TEST_TOKEN}`, {
      data: { kind: 'agentic-clusters-by-area', params: { area: 'fundamentos' } },
    });
    const fingerprint = (await expand.json()).materialized_fingerprint;
    const res = await request.post(`/api/project/auto-block/mutate?token=${TEST_TOKEN}`, {
      data: {
        kind: 'agentic-clusters-by-area',
        params: { area: 'fundamentos' },
        expected_fingerprint: fingerprint,
        mutation: {
          type: 'cell',
          row: 'sample-cluster',
          column: 'published',
          value: '99',
        },
        actor: 'e2e-test',
      },
    });
    expect(res.ok()).toBeFalsy();
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/read-only/);
  });

  test('POST /api/project/auto-block/mutate rejects unknown column', async ({ request }) => {
    const expand = await request.post(`/api/project/auto-block/expand?token=${TEST_TOKEN}`, {
      data: { kind: 'agentic-clusters-by-area', params: { area: 'fundamentos' } },
    });
    const fingerprint = (await expand.json()).materialized_fingerprint;
    const res = await request.post(`/api/project/auto-block/mutate?token=${TEST_TOKEN}`, {
      data: {
        kind: 'agentic-clusters-by-area',
        params: { area: 'fundamentos' },
        expected_fingerprint: fingerprint,
        mutation: {
          type: 'cell',
          row: 'sample-cluster',
          column: 'inexistente',
          value: 'foo',
        },
        actor: 'e2e-test',
      },
    });
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/unknown column/);
  });

  test('reverse-sync propagates manual .md edit to cluster.yaml', async () => {
    const topicClustersPath = join(PROJECT_ROOT, 'brain', 'topic-clusters.md');
    const beforeYaml = readClusterYaml();
    const original = readFileSync(topicClustersPath, 'utf8');

    // Make sure the auto-block has a materialized field — run a render first.
    const sync = spawnSync(
      'node',
      [join(PLUGIN_ROOT, 'scripts', 'cluster-sync.mjs'), `--root=${PROJECT_ROOT}`],
      { encoding: 'utf8' },
    );
    expect(sync.status).toBe(0);

    // Now simulate an LLM edit: change Nome column inside materialized.
    const afterRender = readFileSync(topicClustersPath, 'utf8');
    const edited = afterRender.replace(
      /(\| \[[^\]]+\]\(topic-clusters\/sample-cluster\.md\) \| )([^|]+)( \|)/,
      '$1Sample Cluster — Reverse-Sync$3',
    );
    expect(edited).not.toBe(afterRender);
    writeFileSync(topicClustersPath, edited, 'utf8');

    // Run the reverse-sync hook entry-point as if PostToolUse fired.
    const reverse = spawnSync(
      'node',
      [join(PLUGIN_ROOT, 'scripts', 'auto-block-reverse-sync.mjs'), topicClustersPath],
      { encoding: 'utf8' },
    );
    expect(reverse.status).toBe(0);
    const reverseOut = JSON.parse(reverse.stdout);
    expect(reverseOut.ok).toBe(true);
    const fileResult = reverseOut.files.find((f: { filePath: string }) =>
      f.filePath.endsWith('topic-clusters.md'),
    );
    expect(fileResult).toBeTruthy();
    expect(fileResult.applied.length).toBeGreaterThan(0);
    const nameMutation = fileResult.applied.find((m: { fieldPath: string }) => m.fieldPath === 'name');
    expect(nameMutation).toBeTruthy();

    const afterYaml = readClusterYaml();
    expect(afterYaml.name).toBe('Sample Cluster — Reverse-Sync');

    // Restore.
    writeFileSync(topicClustersPath, original, 'utf8');
    const restore = spawnSync('node', [
      join(PLUGIN_ROOT, 'scripts', 'cluster-sync.mjs'),
      `--root=${PROJECT_ROOT}`,
    ]);
    expect(restore.status).toBe(0);
    // Manually set name back via mutate API style (write directly via YAML).
    const restoreYaml = readClusterYaml();
    restoreYaml.name = beforeYaml.name;
    writeFileSync(
      join(PROJECT_ROOT, 'clusters', 'sample-cluster', 'cluster.yaml'),
      YAML.stringify(restoreYaml, { lineWidth: 0 }),
      'utf8',
    );
  });
});

test.describe('auto-block UI: cell editable in Companion', () => {
  test.beforeEach(() => {
    // Reset cluster.yaml.name to canonical state. Do NOT run cluster-sync —
    // the hydrator will expand `materialized` on its own, and running sync
    // here would pre-sync downstream fixtures that other specs rely on.
    const yamlPath = resolve(PROJECT_ROOT, 'clusters', 'sample-cluster', 'cluster.yaml');
    const parsed = YAML.parse(readFileSync(yamlPath, 'utf8')) as Record<string, unknown>;
    parsed.name = 'Sample Cluster';
    writeFileSync(yamlPath, YAML.stringify(parsed, { lineWidth: 0 }), 'utf8');
  });

  test('renders nodeview with contenteditable cell and saves on blur', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[browser error]', msg.text());
    });
    page.on('pageerror', (err) => console.log('[browser pageerror]', err.message));

    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    const host = page.locator('[data-auto-block][data-kind="agentic-clusters-by-area"]').first();
    await host.waitFor({ state: 'visible', timeout: 15_000 });

    // Trigger hydration explicitly: wait a moment and dump state if still no cell.
    const editableCell = host.locator('[data-auto-block-cell="true"]').first();
    try {
      await editableCell.waitFor({ state: 'visible', timeout: 8_000 });
    } catch (err) {
      const html = await host.evaluate((el) => el.outerHTML);
      console.log('[host outerHTML on timeout]', html.slice(0, 1500));
      throw err;
    }
    const originalText = (await editableCell.textContent())?.trim() || '';
    expect(originalText.length).toBeGreaterThan(0);

    // Replace content via JS (contenteditable is trickier with keyboard).
    await editableCell.evaluate((el) => {
      el.textContent = 'UI-Edited Name';
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });

    await expect
      .poll(() => readClusterYaml().name as string, { timeout: 10_000 })
      .toBe('UI-Edited Name');

    const yamlPath = resolve(PROJECT_ROOT, 'clusters', 'sample-cluster', 'cluster.yaml');
    const parsed = YAML.parse(readFileSync(yamlPath, 'utf8')) as Record<string, unknown>;
    parsed.name = originalText;
    writeFileSync(yamlPath, YAML.stringify(parsed, { lineWidth: 0 }), 'utf8');
  });
});
