import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function brainTemplatePath(pluginRoot, parentSlug) {
  return join(pluginRoot, "templates", "project", "brain", parentSlug, "_subpage-template.md");
}

export function loadBrainSubpageTemplate(pluginRoot, parentSlug, vars) {
  const file = brainTemplatePath(pluginRoot, parentSlug);
  if (!existsSync(file)) return null;
  return applyTemplateVars(readFileSync(file, "utf8"), vars || {});
}

export function applyTemplateVars(raw, vars) {
  let out = raw;
  for (const [key, value] of Object.entries(vars)) {
    const safe = value == null ? "" : String(value);
    out = out.split(`{{${key}}}`).join(safe);
  }
  return out;
}
