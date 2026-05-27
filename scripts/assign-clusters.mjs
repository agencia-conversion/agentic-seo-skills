#!/usr/bin/env node
// One-off: assign cluster slugs to the 27 imported contents.
// Reads each file, parses frontmatter, sets clusters: [<slug>], optionally role: { <slug>: pillar }.
// Idempotent on subsequent runs (writes only when state differs).

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = join(ROOT, "project");

const ASSIGN = {
  "blog/agente-de-seo.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/autoatribuicao.md": { clusters: ["estrategia-brand-led-growth"] },
  "blog/branding-semantico.md": { clusters: ["geo-orquestracao-buscas"] },
  "blog/eeat-na-era-da-ia.md": { clusters: ["topical-authority"] },
  "blog/geo-generative-engine-optimization.md": { clusters: ["geo-orquestracao-buscas"] },
  "blog/inteligencia-vs-julgamento.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/o-que-e-eeat.md": { clusters: ["topical-authority"] },
  "blog/o-que-e-seo-agentico.md": { clusters: ["ia-agentica-conceitos"], role: { "ia-agentica-conceitos": "pillar" } },
  "blog/o-que-e-um-agente-de-ia.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/payload-cms-seo-agentico.md": { clusters: ["tecnologia-pagespeed-seo"], role: { "tecnologia-pagespeed-seo": "pillar" } },
  "blog/prompts-para-seo.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/seo-agentico-vs-seo-classico.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/seo-estrategico.md": { clusters: ["estrategia-brand-led-growth"] },
  "blog/skills-para-seo.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/wiki-llm.md": { clusters: ["ia-agentica-conceitos"] },
  "blog/workflows-agenticos.md": { clusters: ["ia-agentica-conceitos"] },
  "other/agent-crawl.md": { clusters: ["ia-agentica-conceitos"] },
  "other/ai-metrics.md": { clusters: ["geo-orquestracao-buscas"] },
  "other/alt-generator.md": { clusters: ["topical-authority"] },
  "other/authority-metrics.md": { clusters: ["topical-authority"] },
  "other/contador-de-palavras.md": { clusters: ["topical-authority"] },
  "other/qr-code.md": { clusters: ["estrategia-brand-led-growth"] },
  "other/seo-agentico.md": { clusters: ["ia-agentica-conceitos"] },
  "other/serp-simulator.md": { clusters: ["geo-orquestracao-buscas"] },
  "other/share-of-search.md": { clusters: ["estrategia-brand-led-growth"] },
  "other/tasks.md": { clusters: ["ia-agentica-conceitos"] },
  "other/utm-builder.md": { clusters: ["estrategia-brand-led-growth"] },
};

function rewriteFrontmatter(text, { clusters, role }) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("missing frontmatter");
  const fmLines = match[1].split(/\r?\n/);
  const body = text.slice(match[0].length);
  const out = [];
  let skipping = false;
  for (const line of fmLines) {
    if (skipping) {
      if (/^\s/.test(line)) continue;
      skipping = false;
    }
    if (/^clusters\s*:/.test(line)) { skipping = true; continue; }
    if (/^role\s*:/.test(line)) { skipping = true; continue; }
    out.push(line);
  }
  out.push("clusters:");
  for (const c of clusters) out.push(`  - ${c}`);
  if (role && Object.keys(role).length) {
    out.push("role:");
    for (const [k, v] of Object.entries(role)) out.push(`  ${k}: ${v}`);
  }
  return `---\n${out.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n")}\n---\n${body.startsWith("\n") ? body.slice(1) : body}`;
}

let changed = 0;
let skipped = 0;
for (const [rel, assignment] of Object.entries(ASSIGN)) {
  const file = join(PROJECT, "contents", rel);
  const current = readFileSync(file, "utf8");
  const next = rewriteFrontmatter(current, assignment);
  if (current === next) { skipped++; continue; }
  writeFileSync(file, next, "utf8");
  changed++;
  process.stdout.write(`updated ${rel} → ${assignment.clusters.join(", ")}${assignment.role ? ` (pillar in ${Object.keys(assignment.role).join(", ")})` : ""}\n`);
}
process.stdout.write(`\nSummary: ${changed} changed, ${skipped} unchanged.\n`);
