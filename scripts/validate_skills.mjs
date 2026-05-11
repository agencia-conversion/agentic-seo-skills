#!/usr/bin/env node
// Validate Agentic SEO skill skeletons without external dependencies.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const REQUIRED_SECTIONS = ["## When To Use", "## Critical Points", "## Output Format"];
const STRUCTURAL_SECTIONS = ["## Framework", "## Examples", "## Done Criteria", "## Related Skills"];

function validateSkill(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const errors = [];

  if (!text.startsWith("---\n")) {
    errors.push("missing frontmatter");
  } else {
    const parts = text.split("---", 3);
    const frontmatter = parts.length >= 3 ? parts[1] : "";
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

  return errors;
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
    const errors = validateSkill(file);
    const rel = path.relative(ROOT, file);
    if (errors.length > 0) {
      failed = true;
      process.stdout.write(`FAIL ${rel}: ${errors.join(", ")}\n`);
    } else {
      process.stdout.write(`OK   ${rel}\n`);
    }
  }

  return failed ? 1 : 0;
}

process.exit(main());
