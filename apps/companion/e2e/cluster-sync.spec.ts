import { test, expect, type Page } from '@playwright/test';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { TEST_TOKEN, PROJECT_ROOT } from './test-constants';

const PATH_TO_CONTENT = 'contents/blog/sample-satellite.md';
const SECOND_CLUSTER = 'second-cluster';

async function chooseGlobalWidth(page: Page, menuTestId: string, width: 'sm' | 'md' | 'lg' | 'full') {
  await page.locator(`[data-testid="${menuTestId}"]`).click();
  await page.locator('[data-testid="layout-width-menu"]').click();
  await page.locator(`[data-testid="layout-width-option-${width}"]`).click();
}

test.describe('cluster-sync end-to-end', () => {
  test('short companion token works in routes and APIs', async ({ page, request }) => {
    expect(TEST_TOKEN).toMatch(/^[A-Za-z0-9_-]{12}$/);

    const byQuery = await request.get(`/api/project/tree?token=${TEST_TOKEN}`, {
      headers: { 'x-companion-token': '' },
    });
    expect(byQuery.ok()).toBeTruthy();

    const byHeader = await request.get('/api/project/tree', {
      headers: { 'x-companion-token': TEST_TOKEN },
    });
    expect(byHeader.ok()).toBeTruthy();

    await page.goto(`/project/${TEST_TOKEN}/brain-index`);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: 'Sample Cluster', exact: true }).click();
    await page.waitForURL(new RegExp(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster$`), { timeout: 5_000 });
  });

  test('GET /api/project/cluster-list returns sample cluster', async ({ request }) => {
    const res = await request.get(`/api/project/cluster-list?token=${TEST_TOKEN}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.clusters)).toBe(true);
    const slugs = body.clusters.map((c: { slug: string }) => c.slug);
    expect(slugs).toContain('sample-cluster');
  });

  test('POST /api/project/file triggers cluster-sync hook', async ({ request }) => {
    // Reset clusters[] to [] first so the subsequent POST genuinely adds
    // sample-cluster and forces the sync hook to regenerate downstream files.
    const initial = await request.get(
      `/api/project/file?path=${encodeURIComponent(PATH_TO_CONTENT)}&token=${TEST_TOKEN}`,
    );
    const initialData = await initial.json();
    await request.post(`/api/project/file?token=${TEST_TOKEN}`, {
      data: {
        path: PATH_TO_CONTENT,
        hash: initialData.hash,
        title: initialData.title,
        body: initialData.body,
        frontmatter: { ...initialData.frontmatter, title: initialData.title, clusters: [] },
        syncWait: true,
      },
    });

    const get = await request.get(
      `/api/project/file?path=${encodeURIComponent(PATH_TO_CONTENT)}&token=${TEST_TOKEN}`,
    );
    expect(get.ok()).toBeTruthy();
    const before = await get.json();
    expect(before.ok).toBe(true);

    const nextFm = {
      ...before.frontmatter,
      title: before.title,
      clusters: ['sample-cluster'],
    };

    const post = await request.post(`/api/project/file?token=${TEST_TOKEN}`, {
      data: {
        path: PATH_TO_CONTENT,
        hash: before.hash,
        title: before.title,
        body: before.body,
        frontmatter: nextFm,
        syncWait: true,
      },
    });
    expect(post.ok()).toBeTruthy();
    const result = await post.json();
    expect(result.ok).toBe(true);
    expect(result.clusterSync).toBeTruthy();
    expect(result.clusterSync.ran).toBe(true);
    expect(result.clusterSync.changedFiles).toEqual(expect.arrayContaining([
      expect.stringContaining('brain/topic-clusters/sample-cluster.md'),
    ]));
  });

  test('subpage materialized table contains both contents after sync', async ({ request }) => {
    const res = await request.get(
      `/api/project/file?path=${encodeURIComponent('brain/topic-clusters/sample-cluster.md')}&token=${TEST_TOKEN}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.body).toContain('BEGIN cluster-content-table:auto:v1:do-not-edit');
    expect(body.body).toContain('END cluster-content-table:auto');
    expect(body.body).toContain('sample-pilar');
    expect(body.body).toContain('sample-satellite');
  });

  test('index page reflects sample cluster with contents', async ({ request }) => {
    const res = await request.get(
      `/api/project/file?path=${encodeURIComponent('brain/topic-clusters.md')}&token=${TEST_TOKEN}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.body).toContain('BEGIN cluster-index-table:auto:v1:do-not-edit');
    expect(body.body).toContain('Sample Cluster');
  });

  test('brain index renders brand summary and core brain links', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-index`);
    await page.waitForLoadState('domcontentloaded');
    const editor = page.locator('main');
    await expect(editor).toContainText('Sample Project');
    await expect(editor).toContainText('Sample Project é uma marca de exemplo');
    await expect(editor).toContainText('Frase-marca: "Marca de exemplo para testes do Companion."');
    await expect(editor).toContainText('Pilares do cérebro');
    await expect(editor).not.toContainText('Entrada do cérebro');
    const firstBodyHeading = editor.locator('.ProseMirror h2, .ProseMirror h3').first();
    await expect(firstBodyHeading).toContainText('Pilares do cérebro');
    await expect(editor).toContainText('Identidade');
    await expect(editor).toContainText('Tom de Voz');
    await expect(editor).toContainText('Aposto: Sample Project, marca de exemplo para testes do Companion.');
    await expect(editor).toContainText('Sample Cluster');
    await expect(editor).toContainText('Sample Pilar');
    await expect(editor).toContainText('Tecnologia');
    await expect(editor).toContainText('site demonstrativo da marca');
    await expect(editor).not.toContainText('[[topic-clusters/sample-cluster|Sample Cluster]]');
    await expect(editor).not.toContainText('Companion local');
    await expect(editor).not.toContainText('rotas tokenizadas');
    await expect(editor).not.toContainText('cluster-sync');
    await expect(editor).toContainText('Topic Clusters');
    await expect(editor).toContainText('Revisão');
    await expect(editor).toContainText('Log');
    await expect(editor).not.toContainText('![[identidade#Frase-marca]]');
    await expect(editor).not.toContainText('Leitura rápida');
    await expect(page.locator('[data-agentic-query]')).toHaveCount(0);
    await expect(editor).not.toContainText('fantasma');
    await editor.getByRole('link', { name: 'Sample Cluster', exact: true }).first().click();
    await page.waitForURL(/brain-topic-clusters-sample-cluster/, { timeout: 5_000 });
  });

  test('topic clusters index hydrates active clusters table', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-active-clusters-table]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(table).toContainText('Sample Cluster');
    await expect(table).toContainText('Sample Pilar');
    await expect(table).not.toContainText('🧪');
    await expect(table.locator('thead')).not.toContainText('Área');
    await expect(table).not.toContainText('fundamentos');
    await table.getByRole('link', { name: 'Sample Cluster', exact: true }).click();
    await page.waitForURL(/brain-topic-clusters-sample-cluster/, { timeout: 5_000 });
  });

  test('brain index and topic clusters use the same global width default', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-index`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[960px\]/);

    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-active-clusters-table]').waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[960px\]/);
  });

  test('changing global width in the editor header affects another brain page', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-index`);
    await page.waitForLoadState('domcontentloaded');
    await chooseGlobalWidth(page, 'editor-layout-menu', 'lg');
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[1200px\]/);

    await page.goto(`/project/${TEST_TOKEN}/brain-voice`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[1200px\]/);
  });

  test('table width toggle widens data table without changing prose frame', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const frame = page.locator('[data-testid="page-width-frame"]');
    const table = page.locator('[data-cluster-table="sample-cluster"]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(frame).toHaveClass(/max-w-\[960px\]/);

    const frameBefore = await frame.boundingBox();
    const tableBefore = await table.boundingBox();
    expect(frameBefore).toBeTruthy();
    expect(tableBefore).toBeTruthy();
    expect(tableBefore!.width).toBeLessThanOrEqual(frameBefore!.width + 4);

    await page.locator('[data-testid="editor-layout-menu"]').click();
    await page.locator('[data-testid="layout-table-follow-toggle"]').click();
    await expect(frame).toHaveClass(/max-w-\[960px\]/);
    await expect(table).toHaveClass(/-mx-20/);

    const tableAfter = await table.boundingBox();
    expect(tableAfter).toBeTruthy();
    expect(tableAfter!.width).toBeGreaterThan(frameBefore!.width + 120);
  });

  test('companion home renders without server error', async ({ page }) => {
    const response = await page.goto(`/?token=${TEST_TOKEN}`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'e2e/screenshots/home.png', fullPage: false });
  });

  test('GET /api/project/cluster/[slug] returns rich rows', async ({ request }) => {
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.cluster.slug).toBe('sample-cluster');
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBeGreaterThanOrEqual(2);
    const pillar = body.rows.find((r: { role: string }) => r.role === 'pillar');
    expect(pillar).toBeTruthy();
    expect(pillar.content.kind).toBe('published');
  });

  test('cluster page renders ClusterTableView with rich UI', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(node.locator('[data-cluster-add-row], [data-testid="cluster-add-row"]').first()).toBeVisible();
    await expect(node).toContainText('Sample Pilar');
    await expect(node).toContainText('Sample Satellite');
    await page.screenshot({ path: 'e2e/screenshots/cluster-table-view.png', fullPage: false });
  });

  test('intent column renders as dropdown with EN canonical values and persists', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const pillarRow = node.locator('[data-cluster-row="sample-pilar"]');
    await pillarRow.waitFor({ state: 'visible' });
    const intentTrigger = pillarRow.locator('button').filter({ hasText: 'Informacional' }).first();
    await intentTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Comparativo', exact: true }).first().click();
    await page.waitForTimeout(1_500);
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    const body = await res.json();
    const row = body.rows.find((r: { slug: string }) => r.slug === 'sample-pilar');
    expect(row.intent).toBe('comparative');
    const fileRes = await request.get(
      `/api/project/file?path=${encodeURIComponent('contents/blog/sample-pilar.md')}&token=${TEST_TOKEN}`,
    );
    const fileBody = await fileRes.json();
    expect(fileBody.frontmatter.intent).toBe('comparative');
  });

  test('editorial_status column persists via PATCH from publicado to in-review', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const targetRow = node.locator('[data-cluster-row="sample-satellite"]');
    await targetRow.waitFor({ state: 'visible' });
    const statusTrigger = targetRow.locator('button').filter({ hasText: 'Publicado' }).first();
    await statusTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Em revisão', exact: true }).first().click();
    await page.waitForTimeout(1_500);
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    const body = await res.json();
    const row = body.rows.find((r: { slug: string }) => r.slug === 'sample-satellite');
    expect(row.editorial_status).toBe('in-review');
  });

  test('inline edit keyword via EditableCell persists to API', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const targetRow = node.locator('[data-cluster-row="sample-satellite"]');
    await targetRow.waitFor({ state: 'visible' });
    const keywordCell = targetRow.getByRole('button', { name: /sample satellite/i });
    await keywordCell.click();
    const input = targetRow.locator('input[type="text"], input:not([type])').first();
    await input.fill('keyword editada');
    await input.press('Enter');
    await page.waitForTimeout(1500);
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    const body = await res.json();
    const row = body.rows.find((r: { slug: string }) => r.slug === 'sample-satellite');
    expect(row.keyword).toContain('keyword editada');
    const fileRes = await request.get(
      `/api/project/file?path=${encodeURIComponent('contents/blog/sample-satellite.md')}&token=${TEST_TOKEN}`,
    );
    const fileBody = await fileRes.json();
    expect(fileBody.frontmatter.keyword).toBe('keyword editada');
  });

  test('role toggle promotes satellite to pillar via PATCH', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const satelliteRow = node.locator('[data-cluster-row="sample-satellite"]');
    await satelliteRow.waitFor({ state: 'visible' });
    const roleBtn = satelliteRow.locator('button:has-text("Satélite")').first();
    await roleBtn.click();
    await page.waitForTimeout(1500);
    const res = await request.get(`/api/project/cluster/sample-cluster?token=${TEST_TOKEN}`);
    const body = await res.json();
    expect(body.cluster.pillar_slug).toBe('sample-satellite');
  });

  test('adding a published content via inline row appears after refetch', async ({ page }) => {
    // Inline CTA semantic v2: creates a published content with title
    // preserved verbatim. The row shows the typed title (not the slug).
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const initialRows = await node.locator('[data-cluster-row]').count();
    await node.getByRole('button', { name: 'Novo conteúdo' }).click();
    const ghost = node.locator('[data-cluster-row-ghost] input');
    await ghost.waitFor({ state: 'visible', timeout: 5_000 });
    await ghost.fill('Teste de adição inline');
    await ghost.press('Enter');
    await page.waitForTimeout(1_500);
    const finalRows = await node.locator('[data-cluster-row]').count();
    expect(finalRows).toBeGreaterThan(initialRows);
    await expect(node).toContainText('Teste de adição inline');
    // The new row exists in the DOM with the slug as data-cluster-row.
    await expect(node.locator('[data-cluster-row="teste-de-adicao-inline"]')).toBeVisible();

    // Cleanup: this spec runs serially without a per-test fixture reset.
    // Remove the file so downstream tests (sort assertion at line 395+)
    // see only the canonical Sample Pilar / Sample Satellite pair.
    const createdPath = join(PROJECT_ROOT, 'contents', 'blog', 'teste-de-adicao-inline.md');
    if (existsSync(createdPath)) rmSync(createdPath);
  });

  test('selecting rows + Copy button writes TSV to clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard API only reliable in chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const checkboxes = node.locator('[data-cluster-row] input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    const copyBtn = node.locator('[data-testid="cluster-copy-selected"]');
    await copyBtn.click();
    await page.locator('[data-testid="cluster-paste-status"]').waitFor({ state: 'visible', timeout: 5_000 });
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('Papel');
    expect(clipboard).toContain('Conteúdo');
    expect(clipboard.split('\n').length).toBeGreaterThanOrEqual(3);
  });

  test('Companion volume lookup endpoint is not available', async ({ request }) => {
    const res = await request.post(`/api/project/keyword-research?token=${TEST_TOKEN}`, {
      data: { keyword: 'sample pilar', offline: true },
    });
    expect(res.status()).toBe(404);
  });

  test('/contents (all-contents) renders ClusterContentTable with Cluster(s) column', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-cluster-table="all"]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(table.locator('[data-testid="cluster-filter-select"]')).toBeVisible();
    await expect(table.locator('thead')).toContainText('Cluster(s)');
    await expect(table).not.toContainText('Pesquisar volume');
  });

  test('/contents and /contents-sample-cluster use the global width control', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-cluster-table="all"]').waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[960px\]/);

    await chooseGlobalWidth(page, 'workspace-layout-menu', 'sm');
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[640px\]/);

    await page.goto(`/project/${TEST_TOKEN}/contents-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    await page.locator('[data-cluster-table="sample-cluster"]').waitFor({ state: 'visible', timeout: 10_000 });
    await expect(page.locator('[data-testid="page-width-frame"]')).toHaveClass(/max-w-\[640px\]/);
  });

  test('GET /api/project/contents sorts server-side before pagination', async ({ request }) => {
    const asc = await request.get(`/api/project/contents?token=${TEST_TOKEN}&page=1&pageSize=1&sort=title&direction=asc`);
    expect(asc.ok()).toBeTruthy();
    const ascBody = await asc.json();
    expect(ascBody.items[0].title).toBe('Sample Pilar');
    const desc = await request.get(`/api/project/contents?token=${TEST_TOKEN}&page=1&pageSize=1&sort=title&direction=desc`);
    expect(desc.ok()).toBeTruthy();
    const descBody = await desc.json();
    expect(descBody.items[0].title).toBe('Sample Satellite');
  });

  test('/contents cluster filter local switches to cluster-scope mode', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents`);
    await page.waitForLoadState('domcontentloaded');
    const all = page.locator('[data-cluster-table="all"]');
    await all.waitFor({ state: 'visible', timeout: 10_000 });
    const filterTrigger = all.locator('[data-testid="cluster-filter-select"] button').first();
    await filterTrigger.click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Sample Cluster/ }).first().click();
    const scoped = page.locator('[data-cluster-table="sample-cluster"]');
    await scoped.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(scoped.locator('thead')).toContainText('Papel');
  });

  test('/contents-sample-cluster subpage opens cluster-scope directly', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const table = page.locator('[data-cluster-table="sample-cluster"]');
    await table.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(table.locator('thead')).toContainText('Papel');
    await expect(table.locator('[data-testid="cluster-filter-select"]')).toHaveCount(0);
  });

  test('table settings menu opens with sort/filter/columns sections', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await node.locator('[data-testid="cluster-table-settings"]').click();
    const menu = page.locator('[data-testid="table-settings-menu"]');
    await menu.waitFor({ state: 'visible', timeout: 3_000 });
    await expect(menu).toContainText('Ordenação');
    await expect(menu).toContainText('Filtros');
    await expect(menu).toContainText('Colunas visíveis');
    await page.keyboard.press('Escape');
  });

  test('hiding column via settings hides column in table', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(node.locator('thead')).toContainText('Atualizado');
    await node.locator('[data-testid="cluster-table-settings"]').click();
    const menu = page.locator('[data-testid="table-settings-menu"]');
    await menu.waitFor({ state: 'visible', timeout: 3_000 });
    const checkbox = menu.locator('[data-testid="table-column-updated"]');
    await checkbox.click();
    await expect(node.locator('thead')).not.toContainText('Atualizado');
    await checkbox.click();
    await expect(node.locator('thead')).toContainText('Atualizado');
  });

  test('left-click on row title navigates in-app', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await node.getByRole('link', { name: 'Sample Pilar', exact: true }).click();
    await page.waitForURL(/contents-blog-sample-pilar/, { timeout: 5_000 });
  });

  test('Cmd+click on row title opens new tab', async ({ page, context }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      node.getByRole('link', { name: 'Sample Pilar', exact: true }).click({ modifiers: ['Meta'] }),
    ]);
    await expect(popup).toHaveURL(/contents-blog-sample-pilar/);
    await popup.close();
  });

  test('right-click on row title keeps native link behavior without in-app navigation', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    await node.getByRole('link', { name: 'Sample Pilar', exact: true }).click({ button: 'right' });
    await expect(page).toHaveURL(/brain-topic-clusters-sample-cluster/);
  });

  test('content page H1 hides content emoji', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-sample-pilar`);
    await page.waitForLoadState('domcontentloaded');
    const h1 = page.locator('h1.title-editor');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Sample Pilar');
    await expect(h1).not.toContainText('📝');
  });

  test('column header click toggles sort', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-topic-clusters-sample-cluster`);
    await page.waitForLoadState('domcontentloaded');
    const node = page.locator('[data-cluster-table="sample-cluster"]');
    await node.waitFor({ state: 'visible', timeout: 10_000 });
    const conteudoHeader = node.locator('thead button').filter({ hasText: 'Conteúdo' }).first();
    await conteudoHeader.click();
    // sort asc — first row alphabetically should be Sample Pilar
    const firstRow = node.locator('[data-cluster-row]').first();
    await expect(firstRow).toContainText('Sample Pilar');
  });

  test('content metadata drawer persists title date intent clusters and role', async ({ page, request }) => {
    await page.goto(`/project/${TEST_TOKEN}/contents-blog-sample-satellite`);
    await page.waitForLoadState('domcontentloaded');
    const h1 = page.locator('h1.title-editor');
    await expect(h1).toBeVisible();

    await page.getByRole('button', { name: 'Editar metadados' }).click();
    const drawer = page.locator('aside.fixed.right-0');
    await drawer.waitFor({ state: 'visible', timeout: 5_000 });

    const nextTitle = 'Sample Satellite Metadata';
    await drawer.locator('[data-testid="frontmatter-field-title"] input').fill(nextTitle);
    await expect(h1).toContainText(nextTitle);
    await expect.poll(async () => {
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent('contents/blog/sample-satellite.md')}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      return fileBody.frontmatter.title;
    }, { timeout: 8_000 }).toBe(nextTitle);

    const nextDate = '2026-04-16';
    const dateInput = drawer.locator('[data-testid="frontmatter-field-published_at"] input[type="date"]');
    await expect(dateInput).toBeVisible();
    await dateInput.fill(nextDate);
    await expect.poll(async () => {
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent('contents/blog/sample-satellite.md')}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      return fileBody.frontmatter.published_at;
    }, { timeout: 8_000 }).toBe(nextDate);

    await drawer.locator('[data-testid="frontmatter-field-intent"] button').click();
    await page.getByRole('button', { name: 'Comparativo', exact: true }).first().click();
    await expect.poll(async () => {
      const fileRes = await request.get(
        `/api/project/file?path=${encodeURIComponent('contents/blog/sample-satellite.md')}&token=${TEST_TOKEN}`,
      );
      const fileBody = await fileRes.json();
      return fileBody.frontmatter.intent;
    }, { timeout: 8_000 }).toBe('comparative');

    let clusterPosts = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/project/clusters')) clusterPosts++;
    });
    const drawerScrollBody = drawer.locator('div.overflow-y-auto').first();
    const scrollHeightBeforePicker = await drawerScrollBody.evaluate((el) => el.scrollHeight);
    const addClusterButton = drawer.locator('[data-testid="add-cluster-button"]');
    await addClusterButton.scrollIntoViewIfNeeded();
    const addClusterBox = await addClusterButton.boundingBox();
    expect(addClusterBox).toBeTruthy();
    const intentBox = await drawer.locator('[data-testid="frontmatter-field-intent"]').boundingBox();
    await addClusterButton.click();
    const clusterPicker = page.locator('[data-testid="cluster-picker"]');
    await clusterPicker.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(drawer.locator('[data-testid="cluster-picker"]')).toHaveCount(0);
    await expect(clusterPicker.locator('[data-testid="cluster-all-linked"]')).toContainText('Todos os clusters disponíveis já estão vinculados.');
    await page.waitForFunction(() => {
      const trigger = document.querySelector('[data-testid="add-cluster-button"]');
      const picker = document.querySelector('[data-testid="cluster-picker"]');
      if (!trigger || !picker) return false;
      const triggerBox = trigger.getBoundingClientRect();
      const pickerBox = picker.getBoundingClientRect();
      const gap = pickerBox.top < triggerBox.top
        ? triggerBox.top - pickerBox.bottom
        : pickerBox.top - triggerBox.bottom;
      return gap >= 0 && gap <= 8;
    }, null, { timeout: 5_000 });
    const scrollHeightAfterPicker = await drawerScrollBody.evaluate((el) => el.scrollHeight);
    expect(scrollHeightAfterPicker).toBe(scrollHeightBeforePicker);
    const pickerBox = await clusterPicker.boundingBox();
    expect(pickerBox).toBeTruthy();
    expect(pickerBox!.x).toBeGreaterThanOrEqual(0);
    expect(pickerBox!.y).toBeGreaterThanOrEqual(0);
    expect(pickerBox!.x + pickerBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(pickerBox!.y + pickerBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const verticalGap = pickerBox!.y < addClusterBox!.y
      ? addClusterBox!.y - (pickerBox!.y + pickerBox!.height)
      : pickerBox!.y - (addClusterBox!.y + addClusterBox!.height);
    expect(verticalGap).toBeLessThanOrEqual(8);
    if (intentBox) expect(pickerBox!.y).toBeGreaterThan(intentBox.y + intentBox.height);
    await page.waitForTimeout(300);
    expect(clusterPosts).toBe(0);

    const clusterName = 'Novo Cluster da Gaveta';
    const createdSlug = 'novo-cluster-da-gaveta';
    await clusterPicker.locator('[data-testid="cluster-search-input"]').fill(clusterName);
    await expect(clusterPicker.locator('[data-testid="create-cluster-from-search"]')).toContainText(`Criar cluster "${clusterName}"`);
    await clusterPicker.locator('[data-testid="create-cluster-from-search"]').click();
    await drawer.locator(`[data-testid="cluster-chip-${createdSlug}"]`).waitFor({ state: 'visible', timeout: 12_000 });
    await expect(drawer.locator(`[data-testid="role-field-${createdSlug}"] button`)).toContainText('pillar');

    const fileRes = await request.get(
      `/api/project/file?path=${encodeURIComponent('contents/blog/sample-satellite.md')}&token=${TEST_TOKEN}`,
    );
    const fileBody = await fileRes.json();
    expect(fileBody.frontmatter.clusters).toContain(createdSlug);
    expect(fileBody.frontmatter.role[createdSlug]).toBe('pillar');

    const clustersRes = await request.get(`/api/project/clusters?token=${TEST_TOKEN}`);
    const clustersBody = await clustersRes.json();
    const created = clustersBody.clusters.find((cluster: { slug: string }) => cluster.slug === createdSlug);
    expect(created).toBeTruthy();
    expect(created.pillar_slug).toBe('sample-satellite');

    await drawer.locator('[data-testid="add-cluster-button"]').click();
    const reopenedPicker = page.locator('[data-testid="cluster-picker"]');
    await reopenedPicker.locator('[data-testid="cluster-search-input"]').fill(clusterName);
    await expect(reopenedPicker.locator(`[data-testid="pick-cluster-${createdSlug}"]`)).toContainText('vinculado');
    await expect(reopenedPicker.locator('[data-testid="create-cluster-from-search"]')).toHaveCount(0);
    await expect(drawer).not.toContainText('Este cluster já existe');
  });
});
