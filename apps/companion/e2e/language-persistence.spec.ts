import { test, expect, type Page } from '@playwright/test';
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { FIXTURE_SOURCE, PROJECT_ROOT, TEST_TOKEN } from './test-constants';

// DOMAIN B — language decoupling invariant.
//
// The project DELIVERY language lives in .agentic-seo/project.json and is the
// single source of truth (set at onboarding). The Companion language selector
// is a LOCAL UI/browser preference that must NEVER rewrite project.json. This
// spec proves the root-cause flip is gone:
//   1. Opening the Companion with a non-pt browser locale, while the fixture's
//      project.json language=pt-BR, must NOT rewrite project.json to en
//      (assert GET /api/project/settings still returns pt-BR after mount).
//   2. Changing the UI locale selector must NOT change project.json.

const TOKEN = TEST_TOKEN;

function projectJsonPath() {
  return join(PROJECT_ROOT, '.agentic-seo', 'project.json');
}

function readProjectLanguage(): string {
  const data = JSON.parse(readFileSync(projectJsonPath(), 'utf8')) as { language?: string };
  return String(data.language || '');
}

function resetFixture() {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
}

async function openProject(page: Page) {
  await page.goto(`/project/${TOKEN}/`);
  await page.waitForURL(/\/brain-index$/, { timeout: 20_000 });
  await page.waitForSelector('[data-testid="sidebar-tool-graph"]', { timeout: 20_000 });
}

test.describe('project delivery language is decoupled from the UI preference', () => {
  test.beforeEach(() => resetFixture());
  test.afterAll(() => resetFixture());

  test('mounting with a non-pt browser locale does NOT rewrite project.json to en', async ({
    browser,
    request,
  }) => {
    // Baseline: fixture ships with pt-BR delivery language.
    expect(readProjectLanguage()).toBe('pt-BR');
    const before = await request.get(`/api/project/settings?token=${TOKEN}`);
    expect(before.ok()).toBeTruthy();
    expect((await before.json()).language).toBe('pt-BR');

    // Open the Companion with an English browser locale. The mount /
    // hydration / locale-detect path must not persist anything to project.json.
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await openProject(page);
    // Give any post-mount effects (cookie/browser-locale detection) a chance.
    await page.waitForTimeout(800);
    await context.close();

    // The project delivery language must still be pt-BR — both on disk and via
    // the API. A regression here is the exact bug this domain fixes.
    expect(readProjectLanguage()).toBe('pt-BR');
    const after = await request.get(`/api/project/settings?token=${TOKEN}`);
    expect(after.ok()).toBeTruthy();
    expect((await after.json()).language).toBe('pt-BR');
  });

  test('changing the UI locale selector does NOT change project.json', async ({
    browser,
    request,
  }) => {
    expect(readProjectLanguage()).toBe('pt-BR');

    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await openProject(page);

    // Open Settings → General and flip the LOCAL interface-language preference.
    await page.click('[data-testid="sidebar-tool-settings"]');
    // The interface-language Select trigger defaults to 'system'. Open it and
    // pick a concrete locale. Options render as buttons with localized labels;
    // the fixture project is pt-BR, so the UI (and these labels) render in
    // Portuguese by default — independent of the en-US browser locale. That
    // project-language default is itself part of the decoupling contract.
    await page.getByRole('button', { name: /Padrão do sistema/ }).first().click();
    await page.getByRole('button', { name: /Português/ }).first().click();
    await page.waitForTimeout(800);
    await context.close();

    // The UI preference change is local-only; project.json must be untouched.
    expect(readProjectLanguage()).toBe('pt-BR');
    const after = await request.get(`/api/project/settings?token=${TOKEN}`);
    expect(after.ok()).toBeTruthy();
    expect((await after.json()).language).toBe('pt-BR');
  });
});
