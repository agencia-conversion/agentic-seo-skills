import { test, expect } from '@playwright/test';
import { TEST_TOKEN } from './test-constants';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOKEN = TEST_TOKEN;

test.describe('Obsidian vault compatibility', () => {
  test('Fixture brain files use vanilla Markdown + YAML frontmatter', async () => {
    const fixture = resolve(__dirname, '.tmp-fixture');
    const files = ['brain/identidade.md', 'brain/voz.md', 'brain/index.md'];
    for (const rel of files) {
      const text = readFileSync(resolve(fixture, rel), 'utf8');
      expect(text.startsWith('---\n'), `${rel} must start with YAML frontmatter`).toBe(true);
      expect(text).toContain('---\n');
    }
  });

  test('Markdown read API preserves wikilink syntax (Obsidian compat)', async ({ request }) => {
    const res = await request.get(`/api/project/file?path=brain/index.md&token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    // Wikilinks must be present in the raw body — agent or Obsidian can both read them
    expect(body.body).toMatch(/\[\[identidade\]\]/);
    expect(body.body).toMatch(/!\[\[identidade#Frase-marca\]\]/);
  });

  test('Custom agentic fences degrade gracefully (still valid Markdown code blocks)', async ({ request }) => {
    // The contract: any Companion-only fence must still be inside ```...``` so Obsidian shows it as a code block.
    const res = await request.get(`/api/project/file?path=brain/identidade.md&token=${TOKEN}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Identidade has a mermaid fence — valid Obsidian (and renders with plugin).
    expect(body.body).toMatch(/```mermaid[\s\S]+?```/);
  });

  test('Hash-based concurrency guard exists for external edits', async ({ request }) => {
    // Read a file, attempt save with stale hash — must reject as file-modified.
    const readRes = await request.get(`/api/project/file?path=brain/voz.md&token=${TOKEN}`);
    expect(readRes.status()).toBe(200);
    const body = await readRes.json();

    const stale = await request.post(`/api/project/file?token=${TOKEN}`, {
      data: {
        path: 'brain/voz.md',
        hash: 'definitely-stale-hash-0000',
        title: body.title,
        body: body.body + '\nExternal edit\n',
        frontmatter: body.frontmatter,
      },
    });
    const staleBody = await stale.json();
    expect(staleBody.ok).toBe(false);
    expect(staleBody.reason).toBe('file-modified');
  });

  test('Obsidian docs file exists at docs/obsidian-vault.md', async () => {
    const docs = resolve(__dirname, '..', '..', '..', 'docs', 'obsidian-vault.md');
    const text = readFileSync(docs, 'utf8');
    expect(text).toContain('Obsidian Vault Compatibility');
    expect(text).toMatch(/wikilink/);
    expect(text).toMatch(/append-only/);
  });
});
