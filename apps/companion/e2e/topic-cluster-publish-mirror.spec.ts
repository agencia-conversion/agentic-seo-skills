import { test, expect } from '@playwright/test';
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Phase 7 — Topic-cluster publish mirror. Asserts the three bug fixes from the
// original plan against the migrated English-schema fixture:
//   1) Materialized auto-block renders the published pillar as a full-title
//      link (`[Sample Pilar](../contents/blog/sample-pilar.md)`), not as an
//      italic `_sample-pilar_` slug placeholder.
//   2) Inline keyword editing in the pillar row saves without surfacing
//      `Falha ao salvar` — silent success only.
//   3) The fixture under PROJECT_ROOT uses the migrated English schema
//      (`contents/`, `clusters/`, English frontmatter keys).

const CLUSTER_SLUG = 'sample-cluster';
const PILLAR_SLUG = 'sample-pilar';
const PILLAR_RELPATH = `contents/blog/${PILLAR_SLUG}.md`;
const PILLAR_PATH = join(PROJECT_ROOT, 'contents', 'blog', `${PILLAR_SLUG}.md`);
const CLUSTER_YAML_PATH = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');

function readPillarFrontmatter(): Record<string, unknown> {
  const text = readFileSync(PILLAR_PATH, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(match, 'pillar frontmatter must parse').toBeTruthy();
  return parseYaml(match![1]) as Record<string, unknown>;
}

// Other specs mutate the fixture (role promotion, intent, status) without
// restoring it. Reset the fixture so assertions reflect the canonical state.
test.beforeAll(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
  const sync = spawnSync(
    'node',
    [join(PLUGIN_ROOT, 'scripts', 'cluster-sync.mjs'), `--root=${PROJECT_ROOT}`],
    { encoding: 'utf8' },
  );
  expect(sync.status, sync.stderr || sync.stdout).toBe(0);
});

test.describe('topic-cluster publish mirror — English schema invariants', () => {
  test('migrated fixture uses contents/ and clusters/ folders with English keys', () => {
    const fm = readPillarFrontmatter();
    expect(fm.slug).toBe(PILLAR_SLUG);
    expect(fm.origin).toBe('blog');
    expect(Array.isArray(fm.clusters)).toBe(true);
    expect((fm.clusters as string[])).toContain(CLUSTER_SLUG);
    const roleMap = fm.role as Record<string, string>;
    expect(roleMap[CLUSTER_SLUG]).toBe('pillar');

    const yaml = parseYaml(readFileSync(CLUSTER_YAML_PATH, 'utf8')) as Record<string, unknown>;
    expect(yaml.slug).toBe(CLUSTER_SLUG);
    expect(yaml.name).toBeTruthy();
    expect((yaml.pillar as { slug: string }).slug).toBe(PILLAR_SLUG);
  });

  test('subpage auto-block renders published pillar as full title link, not italic slug', async ({ request }) => {
    const res = await request.get(
      `/api/project/file?path=${encodeURIComponent(`brain/topic-clusters/${CLUSTER_SLUG}.md`)}&token=${TEST_TOKEN}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    const text = String(body.body || '');
    expect(text).toContain('BEGIN cluster-content-table:auto:v1:do-not-edit');
    expect(text).toContain('END cluster-content-table:auto');
    // Pillar row uses the title link, not the slug-italic placeholder.
    expect(text).toContain(`[Sample Pilar](../../contents/blog/${PILLAR_SLUG}.md)`);
    expect(text).not.toContain(`_${PILLAR_SLUG}_`);
  });

  test('inline keyword edit on pillar row persists with no Falha ao salvar toast', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${CLUSTER_SLUG}`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator(`[data-cluster-table="${CLUSTER_SLUG}"]`);
    await node.waitFor({ state: 'visible', timeout: 10_000 });

    const pillarRow = node.locator(`[data-cluster-row="${PILLAR_SLUG}"]`);
    await pillarRow.waitFor({ state: 'visible' });
    await expect(pillarRow).toContainText('Sample Pilar');

    const originalKeyword = String(readPillarFrontmatter().keyword ?? '');
    expect(originalKeyword.length).toBeGreaterThan(0);
    const nextKeyword = 'mirror-keyword-publish-check';

    const keywordCell = pillarRow.getByRole('button', { name: new RegExp(originalKeyword, 'i') });
    await keywordCell.click();
    const input = pillarRow.locator('input[type="text"], input:not([type])').first();
    await input.fill(nextKeyword);
    await input.press('Enter');

    // Success path is silent — poll the file API for the new keyword.
    await expect
      .poll(async () => {
        const resp = await request.get(`/api/project/file?path=${encodeURIComponent(PILLAR_RELPATH)}&token=${TEST_TOKEN}`);
        return (await resp.json())?.frontmatter?.keyword as string | undefined;
      }, { timeout: 8_000 })
      .toBe(nextKeyword);

    // Phase 6 surfaces failures with `Falha ao salvar` prefix — its absence is the success signal.
    await expect(page.getByText('Falha ao salvar')).toHaveCount(0);

    // Restore the original keyword via the same API to keep fixture deterministic.
    const restoreBody = await (await request.get(
      `/api/project/file?path=${encodeURIComponent(PILLAR_RELPATH)}&token=${TEST_TOKEN}`,
    )).json();
    const restorePost = await request.post(`/api/project/file?token=${TEST_TOKEN}`, {
      data: {
        path: PILLAR_RELPATH,
        hash: restoreBody.hash,
        title: restoreBody.title,
        body: restoreBody.body,
        frontmatter: { ...restoreBody.frontmatter, keyword: originalKeyword },
        syncWait: true,
      },
    });
    expect(restorePost.ok()).toBeTruthy();
  });
});
