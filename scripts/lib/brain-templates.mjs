import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUPPORTED_TEMPLATE_LANGS = new Set(["pt-BR"]);

function normalizeLang(language) {
  if (!language) return null;
  const value = String(language).trim();
  if (SUPPORTED_TEMPLATE_LANGS.has(value)) return value;
  if (value.toLowerCase() === "pt-br") return "pt-BR";
  return null;
}

export function brainTemplatePath(pluginRoot, parentSlug, language) {
  const dir = join(pluginRoot, "templates", "project", "brain", parentSlug);
  const lang = normalizeLang(language);
  if (lang) {
    const localized = join(dir, `_subpage-template.${lang}.md`);
    if (existsSync(localized)) return localized;
  }
  return join(dir, "_subpage-template.md");
}

export function loadBrainSubpageTemplate(pluginRoot, parentSlug, vars, language) {
  const file = brainTemplatePath(pluginRoot, parentSlug, language);
  if (!existsSync(file)) return null;
  return applyTemplateVars(readFileSync(file, "utf8"), vars || {});
}

export function brainTopLevelTemplatePath(pluginRoot, basename, language) {
  const dir = join(pluginRoot, "templates", "project", "brain");
  const lang = normalizeLang(language);
  if (lang) {
    const localized = join(dir, basename.replace(/\.md$/, `.${lang}.md`));
    if (existsSync(localized)) return localized;
  }
  return join(dir, basename);
}

export function applyTemplateVars(raw, vars) {
  let out = raw;
  for (const [key, value] of Object.entries(vars)) {
    const safe = value == null ? "" : String(value);
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}
