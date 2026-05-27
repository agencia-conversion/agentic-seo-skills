import { test, expect, type Page } from '@playwright/test';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FIXTURE_SOURCE, PLUGIN_ROOT, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug 1 + 3: empty-cluster CTA must mount the ghost input row even with no
// rows, and contents-list CTA must open the modal even when no clusters
// exist. Covers create-from-cluster and create-from-list flows.

const EMPTY_SLUG = 'empty-cluster';
const EMPTY_CLUSTER_DIR = join(PROJECT_ROOT, 'clusters', EMPTY_SLUG);
const EMPTY_CLUSTER_YAML = join(EMPTY_CLUSTER_DIR, 'cluster.yaml');
const EMPTY_CLUSTER_BRAIN = join(PROJECT_ROOT, 'brain', 'topic-clusters', `${EMPTY_SLUG}.md`);
const CONTENTS_BLOG_DIR = join(PROJECT_ROOT, 'contents', 'blog');

function readClusterYaml(path: string): Record<string, unknown> {
  return (parseYaml(readFileSync(path, 'utf8')) as Record<string, unknown>) || {};
}

function readFrontmatter(path: string): Record<string, unknown> {
  const match = readFileSync(path, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? ((parseYaml(match[1]) as Record<string, unknown>) || {}) : {};
}

function seedEmptyCluster() {
  mkdirSync(EMPTY_CLUSTER_DIR, { recursive: true });
  writeFileSync(
    EMPTY_CLUSTER_YAML,
    stringifyYaml(
      {
        contract_version: 1,
        slug: EMPTY_SLUG,
        name: 'Empty Cluster',
        icon: '🪺',
        area: 'fundamentos',
        area_name: 'Fundamentos',
        status: 'active',
        thesis: 'Cluster sem conteúdos para testar empty-state.',
        pillar: null,
        planned_satellites: [],
        satellite_overrides: {},
        stats: { published: 0, planned: 0, updated: '2026-05-27' },
        provenance: { created_at: '2026-05-27', created_by: 'agent' },
        evidence: [],
      },
      { lineWidth: 0 },
    ),
    'utf8',
  );
  mkdirSync(join(PROJECT_ROOT, 'brain', 'topic-clusters'), { recursive: true });
  writeFileSync(
    EMPTY_CLUSTER_BRAIN,
    `---\ntitle: "Empty Cluster"\nupdated: "2026-05-27"\n---\n\n# Empty Cluster\n\nSem conteúdos ainda.\n`,
    'utf8',
  );
}

function resetFixture() {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
  seedEmptyCluster();
  const sync = spawnSync(
    'node',
    [join(PLUGIN_ROOT, 'scripts', 'cluster-sync.mjs'), `--root=${PROJECT_ROOT}`],
    { encoding: 'utf8' },
  );
  expect(sync.status, sync.stderr || sync.stdout).toBe(0);
}

async function gotoEmptyCluster(page: Page) {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-${EMPTY_SLUG}`);
  await page.waitForLoadState('domcontentloaded');
}

test.describe.configure({ mode: 'serial' });

test.describe('CTA Novo conteúdo — empty-state flows', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => {
    // Restore canonical fixture (without the seeded empty cluster) so
    // downstream specs run from a known state.
    rmSync(PROJECT_ROOT, { recursive: true, force: true });
    cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
  });

  test('empty cluster: CTA mounts ghost input, Enter creates planned satellite', async ({ page }) => {
    await gotoEmptyCluster(page);

    // The empty-state message should appear before the CTA is clicked.
    await expect(page.getByText('Nenhum conteúdo neste cluster ainda.')).toBeVisible({ timeout: 10_000 });

    // Click CTA → ghost input must appear (regression: table did not mount
    // when rows.length === 0).
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const ghostInput = page.locator('[data-cluster-row-ghost] input');
    await expect(ghostInput).toBeVisible({ timeout: 3_000 });
    await ghostInput.fill('Crud Empty Planned');
    await ghostInput.press('Enter');

    // cluster.yaml must reflect the new planned satellite.
    await expect
      .poll(
        () => {
          const yaml = readClusterYaml(EMPTY_CLUSTER_YAML) as {
            planned_satellites?: Array<{ slug?: string }>;
          };
          return (yaml.planned_satellites || []).some((s) => s.slug === 'crud-empty-planned');
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    // Empty-state copy must be gone, table row must be visible.
    await expect(page.getByText('Nenhum conteúdo neste cluster ainda.')).toHaveCount(0, {
      timeout: 5_000,
    });
    const table = page.locator(`[data-cluster-table="${EMPTY_SLUG}"]`);
    await expect(table.locator('[data-cluster-row="crud-empty-planned"]')).toBeVisible({
      timeout: 8_000,
    });

    // Brain subpage table must mention the new slug (cluster-sync hook).
    const brain = readFileSync(EMPTY_CLUSTER_BRAIN, 'utf8');
    expect(brain).toContain('crud-empty-planned');
  });

  test('contents list (no cluster filter): CTA opens modal + submit creates file + syncs to list', async ({
    page,
    request,
  }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');

    // Open modal via CTA (View 2 = no clusterSlug prop → opens modal).
    await page.locator('[data-testid="cluster-add-row"]').first().click();
    const modalTitleField = page.locator('input[placeholder="Título do conteúdo"]');
    await expect(modalTitleField).toBeVisible({ timeout: 3_000 });
    await modalTitleField.fill('Crud Modal Item');

    // Origin defaults to "other"; explicitly pick "blog" so we can assert
    // the file at a predictable path.
    await page.locator('select').first().selectOption('blog');

    // Submit.
    await page.getByRole('button', { name: 'Criar conteúdo' }).click();

    // Disk reflects creation.
    const newPath = join(CONTENTS_BLOG_DIR, 'crud-modal-item.md');
    await expect
      .poll(() => existsSync(newPath), { timeout: 8_000 })
      .toBe(true);
    const fm = readFrontmatter(newPath);
    expect(fm.title).toBe('Crud Modal Item');
    expect(fm.origin).toBe('blog');

    // SyncBus + auto-refetch: the contents list must show the new row
    // without a manual reload.
    const table = page.locator('[data-cluster-table="all"]');
    await expect(table.locator('[data-cluster-row="crud-modal-item"]')).toBeVisible({
      timeout: 10_000,
    });

    // Quickly re-verify via API too — defends against UI-only success.
    const listRes = await request.get(`/api/project/contents?token=${TEST_TOKEN}&pageSize=200`);
    const list = (await listRes.json()) as { items: Array<{ slug: string }> };
    expect(list.items.some((it) => it.slug === 'crud-modal-item')).toBe(true);
  });
});
