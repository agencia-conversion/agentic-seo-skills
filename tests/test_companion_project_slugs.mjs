import assert from "node:assert/strict";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const outDir = join(".context", "slug-test");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const compiled = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "tsc",
    "apps/companion/src/lib/project-slugs.ts",
    "--target",
    "ES2022",
    "--module",
    "ES2022",
    "--moduleResolution",
    "bundler",
    "--outDir",
    outDir,
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { encoding: "utf8" },
);
assert.equal(compiled.status, 0, compiled.stderr || compiled.stdout);

const jsFile = join(outDir, "project-slugs.js");
const mjsFile = join(outDir, "project-slugs.mjs");
if (existsSync(jsFile)) renameSync(jsFile, mjsFile);

const { projectPageSlug, projectSlugMatches } = await import(`../${mjsFile}`);

assert.equal(projectPageSlug("conteudos/outros/nova-pagina.md"), "conteudos-outros-nova-pagina");
assert.equal(projectPageSlug("brain/identidade.md"), "brain-identidade");
assert.equal(projectSlugMatches("conteudos-outros-nova-pagina", "conteudos-outros-nova-pagina"), true);
assert.equal(projectSlugMatches("tes-conteudos-outros-nova-pagina", "conteudos-outros-nova-pagina"), true);
assert.equal(projectSlugMatches("identidade-conversion-brain-identidade", "brain-identidade"), true);
assert.equal(projectSlugMatches("brain-voz", "brain-identidade"), false);

console.log("companion project slugs ok");
