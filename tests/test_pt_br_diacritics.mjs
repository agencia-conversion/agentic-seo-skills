import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "seo-brain");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-ptbr-"));
const project = join(tmp, "project");
const env = { ...process.env, SEO_BRAIN_PROJECT_DIR: project, DATAFORSEO_LOGIN: "", DATAFORSEO_PASSWORD: "" };

function run(...args) {
  execFileSync(bin, args, { cwd: root, encoding: "utf8", env });
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file, out);
    else out.push(file);
  }
  return out;
}

function markdownProse(text) {
  return text
    .replace(/^---[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[\[[^\]]+\]\]/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "");
}

function jsonHumanStrings(value, out = []) {
  if (typeof value === "string") {
    const text = value.trim();
    const technical = /^https?:/i.test(text) || text.includes("/") || /\.[a-z0-9]{2,5}\b/i.test(text) || /^[a-z0-9_-]+$/i.test(text);
    if (!technical) out.push(text);
  } else if (Array.isArray(value)) {
    value.forEach((item) => jsonHumanStrings(item, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => jsonHumanStrings(item, out));
  }
  return out;
}

try {
  run("project-init", "Projeto de acentuação", "--language", "pt-BR");
  run("seo-analysis", "--keyword", "seo agêntico", "--provider", "websearch");
  run("topic-cluster", "--seed", "seo agêntico");
  run("eeat", "--claim", "Metodologia própria de SEO agêntico", "--status", "gap");
  run("content-seo", "--topic", "O que é SEO agêntico", "--keyword", "seo agêntico");
  run("technical-seo", "--html-file", join(root, "tests", "fixtures", "technical-seo-valid.html"), "--page-type", "blog-post");
  run("next-website-creator");

  const markdown = [...walk(join(project, "wiki")), ...walk(join(project, "workbench"))]
    .filter((file) => file.endsWith(".md"))
    .map((file) => markdownProse(readFileSync(file, "utf8")))
    .join("\n");
  const jsonOutput = walk(join(project, "workbench"))
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => jsonHumanStrings(JSON.parse(readFileSync(file, "utf8"))))
    .join("\n");
  const webText = walk(join(project, "web")).filter((file) => file.endsWith(".tsx")).map((file) => readFileSync(file, "utf8")).join("\n");
  const humanText = `${markdown}\n${jsonOutput}\n${webText}`;

  for (const term of ["aprovacao", "pagina", "conteudo", "analise", "evidencia", "nao", "ate", "tecnico"]) {
    assert.doesNotMatch(humanText, new RegExp(`\\b${term}\\b`, "i"), `unaccented pt-BR term leaked: ${term}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("pt-br diacritics ok");
