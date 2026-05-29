import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { TEST_TOKEN, PROJECT_ROOT } from './test-constants';

// Exercises the cluster-creation surface the Companion UI calls:
//   - frontmatter drawer "create cluster from search" / CreateClusterModal
//     in "Página existente" mode  -> POST /clusters { name, pillar_slug }
//   - CreateClusterModal in "Criar pillar" mode
//     -> POST /clusters { name, pillar_title }
// The contract (mirrors cluster-sync.spec.ts:519): creating a cluster from the
// UI must yield an ACTIVE cluster.yaml, the pillar frontmatter must carry the
// cluster slug + role:pillar, the cluster must be visible in
// GET /api/project/clusters with the right pillar_slug, and cluster-sync must
// materialize brain/topic-clusters/<slug>.md between the auto-table sentinels.

const TABLE_BEGIN = '<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->';

function clusterYamlPath(slug: string) {
  return join(PROJECT_ROOT, 'clusters', slug, 'cluster.yaml');
}

function brainTablePath(slug: string) {
  return join(PROJECT_ROOT, 'brain', 'topic-clusters', `${slug}.md`);
}

function contentPath(slug: string) {
  return join(PROJECT_ROOT, 'contents', 'blog', `${slug}.md`);
}

function seedContent(slug: string, title: string) {
  const filePath = contentPath(slug);
  mkdirSync(join(PROJECT_ROOT, 'contents', 'blog'), { recursive: true });
  writeFileSync(
    filePath,
    [
      '---',
      'contract_version: 1',
      `title: "${title}"`,
      `slug: ${slug}`,
      'origin: blog',
      'keyword: "exemplo"',
      'intent: informational',
      '---',
      '',
      `# ${title}`,
      '',
    ].join('\n'),
    'utf8',
  );
}

function cleanupCluster(slug: string) {
  rmSync(join(PROJECT_ROOT, 'clusters', slug), { recursive: true, force: true });
  rmSync(brainTablePath(slug), { force: true });
}

test.describe('cluster create from UI surface', () => {
  test('Página existente: POST /clusters { pillar_slug } creates an active cluster wired to content', async ({ request }) => {
    const clusterSlug = 'cluster-ui-existente';
    const pillarSlug = 'pilar-ui-existente';
    seedContent(pillarSlug, 'Pilar UI Existente');

    try {
      const res = await request.post(`/api/project/clusters?token=${TEST_TOKEN}`, {
        data: { name: 'Cluster UI Existente', pillar_slug: pillarSlug, syncWait: true },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.ok).toBe(true);

      // Active cluster.yaml on disk (not a draft).
      expect(existsSync(clusterYamlPath(clusterSlug))).toBe(true);
      const yaml = parseYaml(readFileSync(clusterYamlPath(clusterSlug), 'utf8')) as Record<string, any>;
      expect(yaml.status).toBe('active');
      expect(yaml.pillar.slug).toBe(pillarSlug);
      expect(yaml.provenance?.requires_promotion).toBeUndefined();

      // Pillar frontmatter carries the cluster slug + role:pillar.
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent(`contents/blog/${pillarSlug}.md`)}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      expect(fileBody.frontmatter.clusters).toContain(clusterSlug);
      expect(fileBody.frontmatter.role[clusterSlug]).toBe('pillar');

      // Visible in the clusters list with the right pillar_slug.
      const listRes = await request.get(`/api/project/clusters?token=${TEST_TOKEN}`);
      const listBody = await listRes.json();
      const created = listBody.clusters.find((c: { slug: string }) => c.slug === clusterSlug);
      expect(created).toBeTruthy();
      expect(created.pillar_slug).toBe(pillarSlug);
      expect(created.status).toBe('active');

      // cluster-sync materialized the auto-table.
      await expect.poll(() => existsSync(brainTablePath(clusterSlug)), { timeout: 10_000 }).toBe(true);
      expect(readFileSync(brainTablePath(clusterSlug), 'utf8')).toContain(TABLE_BEGIN);
    } finally {
      cleanupCluster(clusterSlug);
      rmSync(contentPath(pillarSlug), { force: true });
    }
  });

  test('Criar pillar: POST /clusters { pillar_title } creates an active cluster plus a new pillar content', async ({ request }) => {
    const clusterSlug = 'cluster-ui-novo-pilar';
    const pillarSlug = 'pilar-novo-da-ui';

    try {
      const res = await request.post(`/api/project/clusters?token=${TEST_TOKEN}`, {
        data: { name: 'Cluster UI Novo Pilar', pillar_title: 'Pilar Novo da UI', syncWait: true },
      });
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.ok).toBe(true);

      expect(existsSync(clusterYamlPath(clusterSlug))).toBe(true);
      const yaml = parseYaml(readFileSync(clusterYamlPath(clusterSlug), 'utf8')) as Record<string, any>;
      expect(yaml.status).toBe('active');

      // A fresh pillar content was created with the cluster affiliation baked in.
      expect(existsSync(contentPath(pillarSlug))).toBe(true);
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent(`contents/blog/${pillarSlug}.md`)}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      expect(fileBody.frontmatter.clusters).toContain(clusterSlug);
      expect(fileBody.frontmatter.role[clusterSlug]).toBe('pillar');

      const listRes = await request.get(`/api/project/clusters?token=${TEST_TOKEN}`);
      const listBody = await listRes.json();
      const created = listBody.clusters.find((c: { slug: string }) => c.slug === clusterSlug);
      expect(created).toBeTruthy();
      expect(created.pillar_slug).toBe(pillarSlug);
      expect(created.status).toBe('active');

      await expect.poll(() => existsSync(brainTablePath(clusterSlug)), { timeout: 10_000 }).toBe(true);
      expect(readFileSync(brainTablePath(clusterSlug), 'utf8')).toContain(TABLE_BEGIN);
    } finally {
      cleanupCluster(clusterSlug);
      rmSync(contentPath(pillarSlug), { force: true });
    }
  });

  test('unique pillar guard: a content already pillar of one cluster cannot pillar another', async ({ request }) => {
    const firstSlug = 'cluster-ui-guard-a';
    const secondSlug = 'cluster-ui-guard-b';
    const pillarSlug = 'pilar-ui-guard';
    seedContent(pillarSlug, 'Pilar UI Guard');

    try {
      const first = await request.post(`/api/project/clusters?token=${TEST_TOKEN}`, {
        data: { name: 'Cluster UI Guard A', pillar_slug: pillarSlug, syncWait: true },
      });
      expect((await first.json()).ok).toBe(true);

      const second = await request.post(`/api/project/clusters?token=${TEST_TOKEN}`, {
        data: { name: 'Cluster UI Guard B', pillar_slug: pillarSlug, syncWait: true },
      });
      expect(second.status()).toBe(400);
      const secondBody = await second.json();
      expect(secondBody.ok).toBe(false);
      expect(String(secondBody.reason)).toContain('unique-pillar-violation');
      expect(existsSync(clusterYamlPath(secondSlug))).toBe(false);
    } finally {
      cleanupCluster(firstSlug);
      cleanupCluster(secondSlug);
      rmSync(contentPath(pillarSlug), { force: true });
    }
  });
});
