import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface SubpageTemplateVars {
  title: string;
  updated: string;
  parent_slug: string;
  parent_label?: string;
  [key: string]: string | null | undefined;
}

export function brainTemplatePath(pluginRoot: string, parentSlug: string): string {
  return join(pluginRoot, 'templates', 'project', 'brain', parentSlug, '_subpage-template.md');
}

export function loadBrainSubpageTemplate(
  pluginRoot: string,
  parentSlug: string,
  vars: SubpageTemplateVars
): string | null {
  const file = brainTemplatePath(pluginRoot, parentSlug);
  if (!existsSync(file)) return null;
  return applyTemplateVars(readFileSync(file, 'utf8'), vars as Record<string, string | null | undefined>);
}

export function applyTemplateVars(raw: string, vars: Record<string, string | null | undefined>): string {
  let out = raw;
  for (const [key, value] of Object.entries(vars)) {
    const safe = value == null ? '' : String(value);
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}
