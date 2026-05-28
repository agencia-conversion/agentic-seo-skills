#!/usr/bin/env node
// Validate Agentic SEO skill skeletons without external dependencies.
//
// Skill close contract is driven by `metadata.category` in the frontmatter.
// Categories: report, delivery, setup, meta, router, contract, alias.
// Skills without a declared category fall back to legacy hardcoded sets and
// receive a WARN until migration completes.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const REQUIRED_SECTIONS = ["## When To Use", "## Critical Points", "## Output Format"];
const STRUCTURAL_SECTIONS = ["## Framework", "## Examples", "## Done Criteria", "## Related Skills"];

const VALID_CATEGORIES = new Set(["report", "delivery", "setup", "meta", "router", "contract", "alias"]);

// Legacy fallback: skills without `metadata.category` get inferred from these
// sets and a WARN. Remove sets once every skill declares a category.
const LEGACY_REPORT = new Set([
  "seo-analysis", "technical-seo", "backlink-analysis", "keyword-research",
  "serp-extract", "internal-links", "eeat", "topic-cluster", "competitive-analysis",
]);
const LEGACY_DELIVERY = new Set([
  "content-seo", "content-import", "brain-keeper", "spec-driven", "project-init",
]);
const LEGACY_SETUP = new Set(["data-setup"]);
const LEGACY_EXEMPT = new Set(["agentic-seo", "page-report", "start", "autoresearch", "seo-skills-creator", "seo-tools-creator"]);

const YAML_BROWSER_PROMPT = /## Output Format[\s\S]*?```yaml[\s\S]*?browser_prompt:[\s\S]*?```/m;

function skillNameFromPath(filePath) {
  return path.basename(path.dirname(filePath));
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const parts = text.split("---", 3);
  return parts.length >= 3 ? parts[1] : null;
}

function readCategory(frontmatter) {
  if (!frontmatter) return null;
  const match = frontmatter.match(/^\s*category:\s*([\w-]+)/m);
  return match ? match[1] : null;
}

function inferLegacyCategory(skillName) {
  if (LEGACY_REPORT.has(skillName)) return "report";
  if (LEGACY_DELIVERY.has(skillName)) return "delivery";
  if (LEGACY_SETUP.has(skillName)) return "setup";
  if (skillName === "agentic-seo") return "router";
  if (skillName === "page-report") return "contract";
  if (skillName === "start") return "alias";
  if (LEGACY_EXEMPT.has(skillName)) return "meta";
  return null;
}

function requireText(errors, text, pattern, message) {
  const ok = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (!ok) errors.push(message);
}

function validateReport(text, errors) {
  requireText(errors, text, /\bpage-report\b/, "report skill must reference page-report");
  requireText(errors, text, "project/analyses/", "report skill must declare project/analyses/ report path");
  requireText(errors, text, /\breport_md\b/, "report skill must return report_md");
  requireText(errors, text, /\bbrowser_prompt\b/, "report skill must return browser_prompt");
  requireText(errors, text, "Posso abrir o Web Companion para você ver a análise?", "report skill must use the report browser prompt");
}

function validateDelivery(text, errors) {
  requireText(errors, text, /Web Companion/i, "delivery skill must mention Web Companion");
  requireText(errors, text, /\bbrowser_prompt\b/, "delivery skill must return browser_prompt");
  requireText(errors, text, /\bcompanion_path\b/, "delivery skill must return companion_path");
  requireText(errors, text, /\bcompanion_slug\b/, "delivery skill must return companion_slug");
  requireText(errors, text, /\bartifact_path\b/, "delivery skill must return artifact_path");
  requireText(errors, text, /project\/(workbench|artifacts|brain|contents|clusters|keywords|eeat)\//, "delivery skill must declare an openable project artifact");
  requireText(errors, text, "Posso abrir o Web Companion para você revisar esta entrega?", "delivery skill must use the review browser prompt");
  requireText(errors, text, YAML_BROWSER_PROMPT, "delivery skill must include literal browser_prompt YAML block in Output Format");
}

function validateSetup(text, errors) {
  requireText(errors, text, /browser handoff/i, "setup skill must use browser handoff");
  requireText(errors, text, /sensitive/i, "setup skill must handle sensitive input explicitly");
  requireText(errors, text, /Do not present raw terminal commands as the primary|Do not make terminal commands the primary|terminal commands as the primary/i, "setup skill must not use terminal as primary UX");
  requireText(errors, text, /\bbrowser_prompt\b/, "setup skill must return browser_prompt");
  requireText(errors, text, "Posso abrir o Web Companion para você revisar esta entrega?", "setup skill must use the review browser prompt");
  requireText(errors, text, YAML_BROWSER_PROMPT, "setup skill must include literal browser_prompt YAML block in Output Format");
}

function validateNoCloseContract(text, errors, category) {
  if (YAML_BROWSER_PROMPT.test(text)) {
    errors.push(`category-incompatible close contract: ${category} must not declare YAML browser_prompt block (artifacts live outside project/ or the skill does not own a delivery)`);
  }
}

function validateSkill(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const errors = [];
  const warnings = [];
  const skillName = skillNameFromPath(filePath);

  const frontmatter = parseFrontmatter(text);
  if (frontmatter === null) {
    errors.push("missing frontmatter");
  } else {
    if (!/^name:\s*[\w-]+/m.test(frontmatter)) errors.push("missing frontmatter name");
    if (!/^description:\s*.+/m.test(frontmatter)) errors.push("missing frontmatter description");
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!text.includes(section)) errors.push(`missing section ${section}`);
  }

  if (!STRUCTURAL_SECTIONS.some((section) => text.includes(section))) {
    errors.push(`missing one structural section: ${STRUCTURAL_SECTIONS.join(" or ")}`);
  }

  const forbiddenRequirement = text
    .split(/\r?\n/)
    .some((line) => {
      const mentionsForbiddenPath = /(skills\/_shared\/|_shared\/|_legacy\/)/i.test(line);
      const requiresPath = /(must read|must use|required|requires|depend)/i.test(line);
      const negatesRequirement = /(no |not |do not|does not|without|forbidden|fail when)/i.test(line);
      return mentionsForbiddenPath && requiresPath && !negatesRequirement;
    });
  if (forbiddenRequirement) errors.push("must not require shared or legacy references");

  const declaredCategory = readCategory(frontmatter);
  let category = declaredCategory;

  if (declaredCategory && !VALID_CATEGORIES.has(declaredCategory)) {
    errors.push(`unknown metadata.category "${declaredCategory}" — valid: ${[...VALID_CATEGORIES].join(", ")}`);
    category = null;
  }

  if (!category) {
    category = inferLegacyCategory(skillName);
    if (category) {
      warnings.push(`metadata.category missing; inferred "${category}" from legacy set`);
    } else {
      warnings.push("metadata.category missing and no legacy fallback — defaulting to meta (no close contract check)");
      category = "meta";
    }
  }

  switch (category) {
    case "report": validateReport(text, errors); break;
    case "delivery": validateDelivery(text, errors); break;
    case "setup": validateSetup(text, errors); break;
    case "router":
    case "contract":
      // Router and contract skills define the close pattern for others;
      // YAML browser_prompt blocks here are exemplars, not own deliveries.
      break;
    case "meta":
    case "alias":
      validateNoCloseContract(text, errors, category);
      break;
  }

  return { errors, warnings, category };
}

function listSkillFiles() {
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => path.join(SKILLS_DIR, entry.name, "SKILL.md"))
    .filter((file) => fs.existsSync(file))
    .sort();
}

function main() {
  const skillFiles = listSkillFiles();
  if (skillFiles.length === 0) {
    process.stderr.write("No skills found.\n");
    return 1;
  }

  let failed = false;
  for (const file of skillFiles) {
    const { errors, warnings, category } = validateSkill(file);
    const rel = path.relative(ROOT, file);
    if (errors.length > 0) {
      failed = true;
      process.stdout.write(`FAIL ${rel} [${category}]: ${errors.join(", ")}\n`);
    } else if (warnings.length > 0) {
      process.stdout.write(`WARN ${rel} [${category}]: ${warnings.join(", ")}\n`);
    } else {
      process.stdout.write(`OK   ${rel} [${category}]\n`);
    }
  }

  return failed ? 1 : 0;
}

process.exit(main());
