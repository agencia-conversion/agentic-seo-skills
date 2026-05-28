import { test, expect } from '@playwright/test';
import { cpSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// Bug 2: when project/contents/ is renamed to project/content/ externally,
// the Companion must auto-rename it back to project/contents/ on the next
// API call. No passive warning — the dir must be auto-fixed so the
// downstream listing endpoints actually return contents.

function resetFixture() {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
}

function legacyDir() {
  return join(PROJECT_ROOT, 'content');
}

function canonicalDir() {
  return join(PROJECT_ROOT, 'contents');
}

test.describe('legacy project/content/ auto-rename', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => resetFixture());

  test('renaming contents/ → content/ externally is auto-fixed on next API call', async ({
    request,
  }) => {
    // Baseline: contents/ exists, content/ does not.
    expect(statSync(canonicalDir()).isDirectory()).toBe(true);
    expect(existsSync(legacyDir())).toBe(false);

    // Simulate an external script reverting to the legacy layout.
    renameSync(canonicalDir(), legacyDir());
    expect(existsSync(legacyDir())).toBe(true);
    expect(existsSync(canonicalDir())).toBe(false);

    // First API call must trigger the auto-rename. Use /api/project/tree
    // which calls normalizeProjectRoot().
    const res = await request.get(`/api/project/tree?token=${TEST_TOKEN}`);
    expect(res.ok()).toBeTruthy();

    // Auto-rename must have moved the legacy dir back to canonical.
    expect(existsSync(legacyDir())).toBe(false);
    expect(statSync(canonicalDir()).isDirectory()).toBe(true);

    // Contents API must list the canonical fixture contents.
    const list = await request.get(`/api/project/contents?token=${TEST_TOKEN}&pageSize=200`);
    expect(list.ok()).toBeTruthy();
    const body = (await list.json()) as { items: Array<{ slug: string }> };
    expect(body.items.some((item) => item.slug === 'sample-pilar')).toBe(true);
  });

  test('auto-rename is skipped when both content/ and contents/ exist (no merge)', async ({
    request,
  }) => {
    // Keep canonical and add a legacy dir with a different file. We don't
    // want the Companion to merge or move anything in this case.
    mkdirSync(join(legacyDir(), 'blog'), { recursive: true });
    cpSync(
      join(FIXTURE_SOURCE, 'contents', 'blog', 'sample-pilar.md'),
      join(legacyDir(), 'blog', 'sample-pilar.md'),
    );
    expect(existsSync(legacyDir())).toBe(true);
    expect(existsSync(canonicalDir())).toBe(true);

    const res = await request.get(`/api/project/tree?token=${TEST_TOKEN}`);
    expect(res.ok()).toBeTruthy();
    const tree = (await res.json()) as { warnings?: Array<{ code: string }> };

    // Both dirs survive (no merge, no rename).
    expect(existsSync(legacyDir())).toBe(true);
    expect(existsSync(canonicalDir())).toBe(true);
    // Warning surfaces about coexistence.
    expect((tree.warnings || []).some((w) => w.code === 'content-and-contents-coexist')).toBe(true);
  });
});
