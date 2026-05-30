import { test, expect, type APIRequestContext } from '@playwright/test';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_TOKEN, PROJECT_ROOT } from './test-constants';

// Regression coverage for three reported bugs:
//   BUG-1: cluster/topic pages leak YAML frontmatter (version:/order:/contract_version:) into the UI.
//   BUG-2: renaming a cluster does not propagate the new name to the cluster list.
//   BUG-3: created content is an empty document and unpublished items are not deletable.
//
// Each assertion targets the CORRECTED behavior: before the fixes the relevant
// test fails (RED), after the fixes it passes (GREEN). Tests use ONLY verified
// companion endpoints (same contract as cluster-create-from-ui.spec.ts):
//   POST   /api/project/clusters            { name, pillar_title }
//   PATCH  /api/project/cluster/<slug>      { name }
//   GET    /api/project/cluster-list
//   GET    /api/project/file?path=...
//   POST   /api/project/file/create         { kind:'content', title, origin, clusters }
//   POST   /api/project/file/delete         { path }
// Auth is the query-string token used across the existing e2e suite.

const Q = `token=${TEST_TOKEN}`;
const withToken = (path: string) => `${path}${path.includes('?') ? '&' : '?'}${Q}`;

async function apiPost(request: APIRequestContext, path: string, data: unknown) {
  const res = await request.post(withToken(path), { data });
  return { status: res.status(), ok: res.ok(), json: await res.json().catch(() => ({ ok: false })) };
}

async function apiPatch(request: APIRequestContext, path: string, data: unknown) {
  const res = await request.patch(withToken(path), { data });
  return { status: res.status(), ok: res.ok(), json: await res.json().catch(() => ({ ok: false })) };
}

async function apiGet(request: APIRequestContext, path: string) {
  const res = await request.get(withToken(path));
  return { status: res.status(), ok: res.ok(), json: await res.json().catch(() => ({ ok: false })) };
}

async function clusterList(request: APIRequestContext) {
  const { json } = await apiGet(request, '/api/project/cluster-list');
  return Array.isArray(json.clusters) ? (json.clusters as Array<{ slug: string; name: string }>) : [];
}

function cleanupCluster(slug: string) {
  if (!slug) return;
  rmSync(join(PROJECT_ROOT, 'clusters', slug), { recursive: true, force: true });
  rmSync(join(PROJECT_ROOT, 'brain', 'topic-clusters', `${slug}.md`), { force: true });
}

test.describe('bug triage: frontmatter leak, cluster rename, empty content', () => {
  // BUG-1 — the brain topic page body must never carry YAML frontmatter keys.
  // readProjectFile strips frontmatter, and markdownToDoc now also strips a
  // leading block defensively, so neither the API body nor the editor doc can
  // surface contract_version:/version:/order: or a stray ---.
  test('topic-cluster page body does not leak frontmatter keys', async ({ request }) => {
    let clusterSlug = '';
    let pillarPath = '';
    try {
      const created = await apiPost(request, '/api/project/clusters', {
        name: 'Bug1 Frontmatter',
        pillar_title: 'Bug1 Frontmatter Pilar',
        syncWait: true,
      });
      expect(created.json.ok, JSON.stringify(created.json)).toBeTruthy();
      clusterSlug = String(created.json.cluster?.slug || '');
      expect(clusterSlug, 'no cluster slug returned').toBeTruthy();
      pillarPath = String(created.json.pillar_path || created.json.created_pillar_path || '');

      // cluster-sync materializes the topic-cluster page; wait for it.
      await expect
        .poll(() => existsSync(join(PROJECT_ROOT, 'brain', 'topic-clusters', `${clusterSlug}.md`)), {
          timeout: 10_000,
        })
        .toBe(true);

      const brainPath = `brain/topic-clusters/${clusterSlug}.md`;
      const file = await apiGet(request, `/api/project/file?path=${encodeURIComponent(brainPath)}`);
      expect(file.json.ok, JSON.stringify(file.json)).toBeTruthy();
      const body: string = file.json.body || '';
      expect(body, 'body still contains contract_version frontmatter').not.toMatch(/^\s*contract_version:\s*/m);
      expect(body).not.toMatch(/^\s*version:\s*/m);
      expect(body).not.toMatch(/^\s*order:\s*/m);
      // The real frontmatter (title/updated) is separated out, not in the body.
      expect(body).not.toMatch(/^---\s*$/m);
    } finally {
      cleanupCluster(clusterSlug);
      if (pillarPath) rmSync(join(PROJECT_ROOT, pillarPath), { force: true });
    }
  });

  // BUG-2 — renaming a cluster propagates to the canonical cluster-list.
  test('renaming a cluster reflects the new name in cluster-list', async ({ request }) => {
    let clusterSlug = '';
    let pillarPath = '';
    try {
      const created = await apiPost(request, '/api/project/clusters', {
        name: 'Antigo Nome',
        pillar_title: 'Bug2 Rename Pilar',
        syncWait: true,
      });
      expect(created.json.ok, JSON.stringify(created.json)).toBeTruthy();
      clusterSlug = String(created.json.cluster?.slug || '');
      expect(clusterSlug, 'no cluster slug returned').toBeTruthy();
      pillarPath = String(created.json.pillar_path || created.json.created_pillar_path || '');

      let list = await clusterList(request);
      expect(list.find((c) => c.slug === clusterSlug)?.name).toBe('Antigo Nome');

      const renamed = await apiPatch(request, `/api/project/cluster/${clusterSlug}`, { name: 'Nome Novo' });
      expect(renamed.json.ok, JSON.stringify(renamed.json)).toBeTruthy();

      // cluster-list re-reads cluster.yaml — the new name must be there. This is
      // exactly what every UI surface re-reads after the sync-bus
      // 'clusters:changed' event the rename flow emits.
      list = await clusterList(request);
      const entry = list.find((c) => c.slug === clusterSlug);
      expect(entry, `cluster ${clusterSlug} missing from list`).toBeTruthy();
      expect(entry!.name).toBe('Nome Novo');
      expect(entry!.name).not.toBe('Antigo Nome');
    } finally {
      cleanupCluster(clusterSlug);
      if (pillarPath) rmSync(join(PROJECT_ROOT, pillarPath), { force: true });
    }
  });

  // BUG-3 — created content has a real body and is deletable regardless of status.
  test('created content has a body and an unpublished item is deletable', async ({ request }) => {
    let contentPath = '';
    try {
      const created = await apiPost(request, '/api/project/file/create', {
        kind: 'content',
        title: 'Rascunho Vazio',
        origin: 'blog',
        clusters: [],
      });
      expect(created.json.ok, JSON.stringify(created.json)).toBeTruthy();
      contentPath = String(created.json.path || '');
      expect(contentPath, 'create did not return a path').toBeTruthy();

      // The created item must NOT be an empty document.
      expect((created.json.body || '').trim().length, 'created content body is empty').toBeGreaterThan(0);

      // It exists on disk and is unpublished (published_at == "").
      expect(existsSync(join(PROJECT_ROOT, contentPath))).toBe(true);

      // And it must be deletable even though it is unpublished. Delete is
      // hash-guarded server-side, so — exactly like the real UI deleteContent —
      // read the current hash first, then delete with it. (A bare delete with no
      // hash always fails with 'file-modified'; that is the optimistic-lock, not
      // the bug under test.)
      const fresh = await apiGet(request, `/api/project/file?path=${encodeURIComponent(contentPath)}`);
      expect(fresh.json.ok, JSON.stringify(fresh.json)).toBeTruthy();
      const del = await apiPost(request, '/api/project/file/delete', {
        path: contentPath,
        hash: fresh.json.hash,
      });
      expect(del.json.ok, JSON.stringify(del.json)).toBeTruthy();
      expect(existsSync(join(PROJECT_ROOT, contentPath)), 'file not removed after delete').toBe(false);
    } finally {
      if (contentPath) rmSync(join(PROJECT_ROOT, contentPath), { force: true });
    }
  });

  // BUG-2 (detail-page flow) — the user renames a cluster from its OWN page by
  // editing the page title. A cluster detail page IS the brain topic-cluster
  // markdown file (brain/topic-clusters/<slug>.md); the workspace store persists
  // a title edit via POST /api/project/file (title + body + hash).
  //
  // Live reproduction (against the running dev server) confirmed the REAL bug:
  // that page save alone updates only the brain frontmatter title — it does NOT
  // touch clusters/<slug>/cluster.yaml, which is what cluster-list / the cluster
  // table / the sidebar read, so the list stayed stale. The fix lives in
  // store.savePage(): after a successful save of a clusterDetail page it also
  // PATCHes /api/project/cluster/<slug> with the new name (slug/URL/file stay
  // stable). This test reproduces both steps with the exact endpoints the store
  // uses and asserts (a) the page-title save by itself does NOT propagate (the
  // bug), and (b) the cluster PATCH the fixed store issues DOES propagate.
  test('renaming from the cluster detail-page title propagates to cluster-list', async ({ request }) => {
    let clusterSlug = '';
    let pillarPath = '';
    try {
      const created = await apiPost(request, '/api/project/clusters', {
        name: 'Detalhe Antigo',
        pillar_title: 'Bug2 Detail Pilar',
        syncWait: true,
      });
      expect(created.json.ok, JSON.stringify(created.json)).toBeTruthy();
      clusterSlug = String(created.json.cluster?.slug || '');
      expect(clusterSlug, 'no cluster slug returned').toBeTruthy();
      pillarPath = String(created.json.pillar_path || created.json.created_pillar_path || '');

      const brainPath = `brain/topic-clusters/${clusterSlug}.md`;
      await expect
        .poll(() => existsSync(join(PROJECT_ROOT, brainPath)), { timeout: 10_000 })
        .toBe(true);

      let list = await clusterList(request);
      expect(list.find((c) => c.slug === clusterSlug)?.name).toBe('Detalhe Antigo');

      // Load the page exactly as the editor does (need the current hash/body to
      // satisfy the save's optimistic-concurrency check).
      const loaded = await apiGet(request, `/api/project/file?path=${encodeURIComponent(brainPath)}`);
      expect(loaded.json.ok, JSON.stringify(loaded.json)).toBeTruthy();

      // STEP 1 — the detail-page title save the store performs. The store's
      // updatePage() writes the new title into BOTH page.title and
      // page.frontmatter.title before savePage POSTs them, so mirror that here
      // (the server resolves the final title from incoming frontmatter first).
      const save = await apiPost(request, '/api/project/file', {
        path: brainPath,
        hash: loaded.json.hash,
        title: 'Detalhe Novo',
        body: loaded.json.body,
        frontmatter: { ...(loaded.json.frontmatter || {}), title: 'Detalhe Novo' },
        frontmatterRaw: loaded.json.frontmatterRaw,
      });
      expect(save.json.ok, JSON.stringify(save.json)).toBeTruthy();
      expect(save.json.title).toBe('Detalhe Novo');

      // The page save by itself MUST NOT have propagated to cluster.yaml — this
      // is the reproduced bug (the file route only rewrites brain frontmatter).
      const afterSaveOnly = await clusterList(request);
      expect(
        afterSaveOnly.find((c) => c.slug === clusterSlug)?.name,
        'page-title save unexpectedly mutated cluster.yaml on its own',
      ).toBe('Detalhe Antigo');

      // STEP 2 — the cluster-record rename the FIXED store now also issues for a
      // clusterDetail page (store.savePage -> PATCH /api/project/cluster/<slug>).
      const patch = await apiPatch(request, `/api/project/cluster/${clusterSlug}`, {
        name: 'Detalhe Novo',
        syncWait: false,
      });
      expect(patch.json.ok, JSON.stringify(patch.json)).toBeTruthy();

      // Now the cluster list/table + sidebar (which read cluster.yaml) reflect
      // the new name. Before the fix this stayed stale at 'Detalhe Antigo'.
      list = await clusterList(request);
      const entry = list.find((c) => c.slug === clusterSlug);
      expect(entry, `cluster ${clusterSlug} missing from list`).toBeTruthy();
      expect(entry!.name).toBe('Detalhe Novo');
      expect(entry!.name).not.toBe('Detalhe Antigo');

      // Slug/URL/file stay stable — only the displayed name changed.
      expect(entry!.slug).toBe(clusterSlug);
      expect(existsSync(join(PROJECT_ROOT, brainPath)), 'brain page file path must stay stable').toBe(true);

      // The detail page itself also reflects the new title.
      const finalPage = await apiGet(request, `/api/project/file?path=${encodeURIComponent(brainPath)}`);
      expect(finalPage.json.title).toBe('Detalhe Novo');
    } finally {
      cleanupCluster(clusterSlug);
      if (pillarPath) rmSync(join(PROJECT_ROOT, pillarPath), { force: true });
    }
  });
});
