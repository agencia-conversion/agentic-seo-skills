import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import YAML from "yaml";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "bin", "seo-brain");
const tmp = mkdtempSync(join(tmpdir(), "seo-brain-ptbr-"));
const project = join(tmp, "project");
const env = { ...process.env, SEO_BRAIN_PROJECT_DIR: project, DATAFORSEO_LOGIN: "", DATAFORSEO_PASSWORD: "" };

function run(...args) {
  execFileSync(bin, args, { cwd: root, encoding: "utf8", env });
}

function dataforseoBypassArgs(reason) {
  return [
    "--dataforseo-bypass-confirmed",
    "--dataforseo-bypass-reason",
    reason,
    "--dataforseo-bypass-approved-by",
    "Teste",
    "--dataforseo-bypass-confirmation-text",
    "Confirmo seguir sem DataForSEO neste teste de acentuação.",
    "--dataforseo-bypass-confirmed-at",
    "2026-05-06T00:00:00+00:00",
  ];
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
  run("seo-analysis", "--keyword", "seo agêntico", "--provider", "websearch", "--websearch-confirmed", "--websearch-reason", "teste de acentuação sem DataForSEO", ...dataforseoBypassArgs("teste de acentuação sem DataForSEO"));
  run("topic-cluster", "--seed", "seo agêntico", ...dataforseoBypassArgs("teste de acentuação sem DataForSEO"));
  run("content-seo", "--topic", "O que é SEO agêntico", "--keyword", "seo agêntico", "--provider-bypass-confirmed", "--provider-bypass-reason", "teste de acentuação sem DataForSEO", ...dataforseoBypassArgs("teste de acentuação sem DataForSEO"), "--top3-bypass-confirmed", "--top3-bypass-reason", "teste de acentuação sem Top 3");
  run("content-seo", "--phase", "approve", "--topic", "O que é SEO agêntico", "--approved-by", "Teste", "--approval-notes", "Tom de voz em draft reconhecido.");
  run("technical-seo", "--html-file", join(root, "tests", "fixtures", "technical-seo-valid.html"), "--page-type", "blog-post");
  run("next-website-creator");

  const markdown = [...walk(join(project, "wiki")), ...walk(join(project, "workbench")), ...walk(join(project, "artifacts"))]
    .filter((file) => file.endsWith(".md"))
    .map((file) => markdownProse(readFileSync(file, "utf8")))
    .join("\n");
  const structuredOutput = [...walk(join(project, "workbench")), ...walk(join(project, "artifacts"))]
    .filter((file) => file.endsWith(".json") || file.endsWith(".yaml"))
    .flatMap((file) => jsonHumanStrings(file.endsWith(".yaml") ? YAML.parse(readFileSync(file, "utf8")) : JSON.parse(readFileSync(file, "utf8"))))
    .join("\n");
  const webText = walk(join(project, "web")).filter((file) => file.endsWith(".tsx")).map((file) => readFileSync(file, "utf8")).join("\n");
  const humanText = `${markdown}\n${structuredOutput}\n${webText}`;

  for (const term of ["aprovacao", "pagina", "conteudo", "analise", "evidencia", "nao", "ate", "tecnico"]) {
    assert.doesNotMatch(humanText, new RegExp(`\\b${term}\\b`, "i"), `unaccented pt-BR term leaked: ${term}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log("pt-br diacritics ok");
