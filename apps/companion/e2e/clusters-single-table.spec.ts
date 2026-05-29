import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { TEST_TOKEN, PROJECT_ROOT } from './test-constants';

// Stage 2 contract for Topic Clusters after "área" was dropped from the model:
//   1. A single `agentic-clusters` table renders ALL active clusters (no area
//      split, no area filter).
//   2. Creating a cluster pre-fills a suggested emoji in the create modal.
//   3. A freshly created pillar shows "—" in the Keyword column — NOT the
//      title. This is the regression guard for the fabricated-keyword bug.
//   4. The promote endpoint promotes a draft.yaml to an active cluster.yaml.

const CLUSTERS_URL = `/project/${TEST_TOKEN}/brain-topic-clusters`;

function clusterYamlPath(slug: string) {
  return join(PROJECT_ROOT, 'clusters', slug, 'cluster.yaml');
}
function draftYamlPath(slug: string) {
  return join(PROJECT_ROOT, 'clusters', slug, 'draft.yaml');
}
function contentPath(slug: string) {
  return join(PROJECT_ROOT, 'contents', 'blog', `${slug}.md`);
}
function cleanupCluster(slug: string) {
  rmSync(join(PROJECT_ROOT, 'clusters', slug), { recursive: true, force: true });
  rmSync(join(PROJECT_ROOT, 'brain', 'topic-clusters', `${slug}.md`), { force: true });
}

test.describe('topic clusters — single table, emoji, keyword guard, promote', () => {
  test('single agentic-clusters table renders all active clusters (no area filter)', async ({ page }) => {
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });

    // There is exactly ONE active-clusters table on the page (no per-area split).
    await expect(page.locator('[data-active-clusters-table]')).toHaveCount(1);

    // The fixture's only active cluster is present in that single table.
    await expect(page.locator('[data-testid="cluster-actions-sample-cluster"]')).toBeVisible();

    // The legacy "filter by area" affordance is gone.
    await expect(page.locator('[data-testid="cluster-area-filter-trigger"]')).toHaveCount(0);
  });

  test('creating a cluster pre-fills a suggested emoji', async ({ page }) => {
    await page.goto(CLUSTERS_URL);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });

    await page.getByRole('button', { name: 'Novo cluster' }).click();
    const iconInput = page.locator('[data-testid="create-cluster-icon"]');
    await expect(iconInput).toBeVisible();

    // The emoji field is pre-filled (never empty) before the user types anything.
    const initial = await iconInput.inputValue();
    expect(initial.trim().length).toBeGreaterThan(0);

    // Typing a name with a known keyword updates the suggestion deterministically.
    await page.locator('[data-testid="create-cluster-name"]').fill('Tecnologia e PageSpeed');
    await expect(iconInput).toHaveValue('⚙️');
  });

  test('newly created pillar shows "—" in the Keyword column, not the title', async ({ request }) => {
    const clusterSlug = 'cluster-keyword-guard';
    const pillarTitle = 'Guia Completo de Keyword Guard';
    const pillarSlug = 'guia-completo-de-keyword-guard';

    try {
      // Create a cluster with a brand-new pillar (mode "Criar pillar").
      const res = await request.post(`/api/project/clusters?token=${TEST_TOKEN}`, {
        data: { name: 'Cluster Keyword Guard', pillar_title: pillarTitle, syncWait: true },
      });
      expect(res.ok()).toBeTruthy();
      expect((await res.json()).ok).toBe(true);

      // The pillar content frontmatter must NOT carry the title as keyword.
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent(`contents/blog/${pillarSlug}.md`)}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      expect(fileBody.frontmatter.keyword === '' || fileBody.frontmatter.keyword == null).toBe(true);
      expect(fileBody.frontmatter.keyword).not.toBe(pillarTitle);

      // The cluster.yaml pillar.keyword must also be empty (not the title).
      const yaml = parseYaml(readFileSync(clusterYamlPath(clusterSlug), 'utf8')) as Record<string, any>;
      expect(yaml.pillar?.keyword === '' || yaml.pillar?.keyword == null).toBe(true);
      expect(yaml.pillar?.keyword).not.toBe(pillarTitle);

      // The cluster detail rows expose the empty keyword, so the column renders "—".
      const detailRes = await request.get(`/api/project/cluster/${clusterSlug}?token=${TEST_TOKEN}`);
      const detail = await detailRes.json();
      const pillarRow = detail.rows.find((r: { role: string }) => r.role === 'pillar');
      expect(pillarRow).toBeTruthy();
      expect(pillarRow.keyword === '' || pillarRow.keyword == null).toBe(true);
      expect(pillarRow.keyword).not.toBe(pillarTitle);
    } finally {
      cleanupCluster(clusterSlug);
      rmSync(contentPath(pillarSlug), { force: true });
    }
  });

  test('inline-CTA path and cluster-create path produce identical (keywordless) frontmatter', async ({ request }) => {
    // Inline CTA creates a published content directly. The cluster-create "new
    // pillar" path must match: neither fabricates a keyword.
    const inlineSlug = 'inline-cta-parity';
    try {
      const res = await request.post(`/api/project/file/create?token=${TEST_TOKEN}`, {
        data: { kind: 'content', title: 'Inline CTA Parity', origin: 'blog' },
      });
      expect(res.ok()).toBeTruthy();
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent(`contents/blog/${inlineSlug}.md`)}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      expect(fileBody.frontmatter.keyword === '' || fileBody.frontmatter.keyword == null).toBe(true);
      expect(fileBody.frontmatter.keyword).not.toBe('Inline CTA Parity');
    } finally {
      rmSync(contentPath(inlineSlug), { force: true });
    }
  });

  test('promote endpoint promotes a draft to an active cluster', async ({ request }) => {
    const clusterSlug = 'cluster-promote-flow';
    try {
      // Create a draft-only cluster (the legacy agent handoff shape).
      const createRes = await request.post(`/api/project/clusters?token=${TEST_TOKEN}`, {
        data: { name: 'Cluster Promote Flow', draft: true },
      });
      expect(createRes.ok()).toBeTruthy();
      expect((await createRes.json()).ok).toBe(true);
      expect(existsSync(draftYamlPath(clusterSlug))).toBe(true);
      expect(existsSync(clusterYamlPath(clusterSlug))).toBe(false);

      // Promote it.
      const promoteRes = await request.post(
        `/api/project/cluster/${clusterSlug}/promote?token=${TEST_TOKEN}`,
        { data: { syncWait: true } },
      );
      expect(promoteRes.ok()).toBeTruthy();
      const promoteBody = await promoteRes.json();
      expect(promoteBody.ok).toBe(true);

      // draft.yaml archived, cluster.yaml now active.
      expect(existsSync(draftYamlPath(clusterSlug))).toBe(false);
      expect(existsSync(clusterYamlPath(clusterSlug))).toBe(true);
      const yaml = parseYaml(readFileSync(clusterYamlPath(clusterSlug), 'utf8')) as Record<string, any>;
      expect(yaml.status).toBe('active');
      expect(yaml.provenance?.promoted_at).toBeTruthy();

      // Promoting again must fail: the draft was archived, so there is nothing
      // left to promote (the active cluster.yaml already exists).
      const again = await request.post(
        `/api/project/cluster/${clusterSlug}/promote?token=${TEST_TOKEN}`,
        { data: {} },
      );
      expect(again.status()).toBe(404);
      expect((await again.json()).reason).toBe('draft-not-found');

      // Promoting a non-existent draft returns 404.
      const missing = await request.post(
        `/api/project/cluster/does-not-exist-cluster/promote?token=${TEST_TOKEN}`,
        { data: {} },
      );
      expect(missing.status()).toBe(404);
    } finally {
      cleanupCluster(clusterSlug);
    }
  });
});
