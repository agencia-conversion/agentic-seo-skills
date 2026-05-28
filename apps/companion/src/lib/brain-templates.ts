import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SubpageTemplateVars {
  title: string;
  updated: string;
  parent_slug: string;
  parent_label?: string;
  [key: string]: string | null | undefined;
}

const SUPPORTED_TEMPLATE_LANGS = new Set(['pt-BR']);

function normalizeLang(language?: string | null): string | null {
  if (!language) return null;
  const value = String(language).trim();
  if (SUPPORTED_TEMPLATE_LANGS.has(value)) return value;
  if (value.toLowerCase() === 'pt-br') return 'pt-BR';
  return null;
}

export function brainTemplatePath(pluginRoot: string, parentSlug: string, language?: string | null): string {
  const dir = join(pluginRoot, 'templates', 'project', 'brain', parentSlug);
  const lang = normalizeLang(language);
  if (lang) {
    const localized = join(dir, `_subpage-template.${lang}.md`);
    if (existsSync(localized)) return localized;
  }
  return join(dir, '_subpage-template.md');
}

export function loadBrainSubpageTemplate(
  pluginRoot: string,
  parentSlug: string,
  vars: SubpageTemplateVars,
  language?: string | null,
): string | null {
  const file = brainTemplatePath(pluginRoot, parentSlug, language);
  if (!existsSync(file)) return null;
  return applyTemplateVars(readFileSync(file, 'utf8'), vars as Record<string, string | null | undefined>);
}

export function brainTopLevelTemplatePath(pluginRoot: string, basename: string, language?: string | null): string {
  const dir = join(pluginRoot, 'templates', 'project', 'brain');
  const lang = normalizeLang(language);
  if (lang) {
    const localized = join(dir, basename.replace(/\.md$/, `.${lang}.md`));
    if (existsSync(localized)) return localized;
  }
  return join(dir, basename);
}

export function applyTemplateVars(raw: string, vars: Record<string, string | null | undefined>): string {
  let out = raw;
  for (const [key, value] of Object.entries(vars)) {
    const safe = value == null ? '' : String(value);
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}
