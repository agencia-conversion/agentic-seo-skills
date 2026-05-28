import { test, expect } from '@playwright/test';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug 3 regression: the active-clusters-table Publicados column must
// reflect the LIVE published/planned counts derived from contents on
// disk and cluster.yaml.planned_satellites — not stale cluster.yaml
// stats. Verified for the sample fixture which has 2 published
// contents and (after seed) 1 planned satellite.

const CLUSTER_SLUG = 'sample-cluster';
const CLUSTER_YAML = join(PROJECT_ROOT, 'clusters', CLUSTER_SLUG, 'cluster.yaml');

test.beforeEach(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });

  // Seed a planned satellite + force stats.published=0, stats.planned=0
  // so the test would fail if the UI trusted cluster.yaml.stats blindly.
  const yaml = parseYaml(readFileSync(CLUSTER_YAML, 'utf8')) as Record<string, unknown>;
  yaml.planned_satellites = [
    {
      slug: 'planned-stat-target',
      keyword: 'planned stats target',
      intent: 'informational',
      volume: null,
      role: 'satellite',
      note: null,
    },
  ];
  yaml.stats = { published: 0, planned: 0, updated: '2026-05-25' };
  writeFileSync(CLUSTER_YAML, stringifyYaml(yaml, { lineWidth: 0 }), 'utf8');
});

test.afterAll(() => {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
});

test('Publicados column reflects live count even when cluster.yaml.stats are stale', async ({
  page,
}) => {
  await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
  await page.waitForLoadState('domcontentloaded');
  const link = page.getByRole('link', { name: 'Sample Cluster', exact: true });
  await link.waitFor({ timeout: 10_000 });

  // sample-pilar.md + sample-satellite.md = 2 published.
  // planned_satellites length = 1.
  // Total denominator = 2 + 1 = 3, numerator = 2.
  const row = page.locator('tr', { has: link });
  await expect(row).toContainText('2/3', { timeout: 8_000 });
});
