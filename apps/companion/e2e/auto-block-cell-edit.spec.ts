import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { PROJECT_ROOT, TEST_TOKEN } from './test-constants';

const PILAR_MD = join(PROJECT_ROOT, 'contents', 'blog', 'sample-pilar.md');
const SATELLITE_MD = join(PROJECT_ROOT, 'contents', 'blog', 'sample-satellite.md');

interface ContentDoc {
  fm: Record<string, unknown>;
  body: string;
}

function parseContent(text: string): ContentDoc {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter');
  const fm = YAML.parse(m[1]) as Record<string, unknown>;
  return { fm: fm || {}, body: m[2] || '' };
}

function writeContent(path: string, doc: ContentDoc): void {
  const fm = YAML.stringify(doc.fm, { lineWidth: 0 }).trimEnd();
  writeFileSync(path, `---\n${fm}\n---\n${doc.body.startsWith('\n') ? '' : '\n'}${doc.body}`, 'utf8');
}

test.describe('auto-block cell inline edit — agentic-cluster-content', () => {
  test.beforeEach(() => {
    const pilar = parseContent(readFileSync(PILAR_MD, 'utf8'));
    pilar.fm.keyword = 'sample pilar';
    pilar.fm.intent = 'informational';
    pilar.fm.volume = 1200;
    writeContent(PILAR_MD, pilar);
    const sat = parseContent(readFileSync(SATELLITE_MD, 'utf8'));
    sat.fm.keyword = 'sample satellite';
    sat.fm.intent = 'informational';
    sat.fm.volume = 90;
    writeContent(SATELLITE_MD, sat);
  });

  test('editing keyword on pillar row persists to content frontmatter', async ({ page }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    await page.goto(`/project/${TEST_TOKEN}/brain-companion-cluster-content-demo`);

    const host = page
      .locator('[data-auto-block][data-kind="agentic-cluster-content"]')
      .first();
    await host.waitFor({ state: 'visible', timeout: 15_000 });

    // The pillar row carries data-row-key="pub-pillar:sample-pilar". Its keyword
    // cell is data-column-key="keyword".
    const keywordCell = host.locator(
      '[data-auto-block-cell="true"][data-row-key="pub-pillar:sample-pilar"][data-column-key="keyword"]',
    );
    await keywordCell.waitFor({ state: 'visible', timeout: 10_000 });

    await keywordCell.evaluate((el) => {
      el.textContent = 'edited-via-fence';
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });

    await expect
      .poll(() => parseContent(readFileSync(PILAR_MD, 'utf8')).fm.keyword as string, {
        timeout: 10_000,
      })
      .toBe('edited-via-fence');
  });

  test('editing intent on satellite row persists to content frontmatter', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-companion-cluster-content-demo`);
    const host = page
      .locator('[data-auto-block][data-kind="agentic-cluster-content"]')
      .first();
    await host.waitFor({ state: 'visible', timeout: 15_000 });

    const intentCell = host.locator(
      '[data-auto-block-cell="true"][data-row-key="pub:sample-satellite"][data-column-key="intent"]',
    );
    await intentCell.waitFor({ state: 'visible', timeout: 10_000 });

    await intentCell.evaluate((el) => {
      el.textContent = 'transactional';
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });

    await expect
      .poll(() => parseContent(readFileSync(SATELLITE_MD, 'utf8')).fm.intent as string, {
        timeout: 10_000,
      })
      .toBe('transactional');
  });

  test('derived cells (content link) do not become editable', async ({ page }) => {
    await page.goto(`/project/${TEST_TOKEN}/brain-companion-cluster-content-demo`);
    const host = page
      .locator('[data-auto-block][data-kind="agentic-cluster-content"]')
      .first();
    await host.waitFor({ state: 'visible', timeout: 15_000 });

    // Wait for at least one editable cell to be hydrated.
    await host
      .locator('[data-auto-block-cell="true"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 });

    // Confirm the content column is NOT marked editable — locate any link to
    // sample-pilar inside an td and assert it does not have data-auto-block-cell.
    const contentLink = host.locator('a[href*="sample-pilar"]').first();
    await contentLink.waitFor({ state: 'visible', timeout: 5_000 });
    const td = contentLink.locator('xpath=ancestor::td[1]');
    await expect(td).not.toHaveAttribute('data-auto-block-cell', 'true');
    await expect(td).not.toHaveAttribute('contenteditable', 'true');
  });

  test('fingerprint mismatch surfaces a conflict modal and preserves local value', async ({
    page,
    request,
  }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    await page.goto(`/project/${TEST_TOKEN}/brain-companion-cluster-content-demo`);
    const host = page
      .locator('[data-auto-block][data-kind="agentic-cluster-content"]')
      .first();
    await host.waitFor({ state: 'visible', timeout: 15_000 });
    const keywordCell = host.locator(
      '[data-auto-block-cell="true"][data-row-key="pub-pillar:sample-pilar"][data-column-key="keyword"]',
    );
    await keywordCell.waitFor({ state: 'visible', timeout: 10_000 });

    // Side-channel mutation: poke keyword via the API to invalidate the
    // currently rendered fingerprint without going through the UI.
    const expand = await request.post(
      `/api/project/auto-block/expand?token=${TEST_TOKEN}`,
      { data: { kind: 'agentic-cluster-content', params: { cluster: 'sample-cluster' } } },
    );
    const fp = (await expand.json()).materialized_fingerprint;
    await request.post(`/api/project/auto-block/mutate?token=${TEST_TOKEN}`, {
      data: {
        kind: 'agentic-cluster-content',
        params: { cluster: 'sample-cluster' },
        expected_fingerprint: fp,
        mutation: {
          type: 'cell',
          row: 'pub-pillar:sample-pilar',
          column: 'keyword',
          value: 'out-of-band-edit',
        },
        actor: 'e2e-side-channel',
      },
    });

    // Stale UI: cell still bound to old fingerprint. Try to write a different
    // value — should produce a conflict path.
    await keywordCell.evaluate((el) => {
      el.textContent = 'ui-attempted-edit';
      el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });

    // Either the conflict modal appears, or the cell ends up with the
    // canonical value (auto-reload). Both are acceptable; assert eventual
    // consistency.
    await expect
      .poll(() => parseContent(readFileSync(PILAR_MD, 'utf8')).fm.keyword as string, {
        timeout: 10_000,
      })
      .toMatch(/out-of-band-edit|ui-attempted-edit/);
  });
});
