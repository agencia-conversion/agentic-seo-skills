import assert from "node:assert/strict";
import { renderHtmlReport } from "../scripts/lib/html-report.mjs";

const html = renderHtmlReport({
  title: "Auditoria técnica",
  subtitle: "example.com — pt-BR, desktop",
  generatedAt: "2026-05-13T10:00:00Z",
  sections: [
    { heading: "Score", body_html: "<p><strong>62/100</strong></p>" },
    { heading: "Próximas decisões", body_html: "<ul><li>Adicionar canonical</li><li>Resolver H1 duplicado</li></ul>" },
  ],
});

assert.match(html, /^<!doctype html>/, "must start with doctype");
assert.match(html, /<html lang="pt-BR">/);
assert.match(html, /agentic seo/, "wordmark presente");
assert.match(html, /aria-label="Conversion"/, '"by Conversion" presente');
assert.match(html, /#3a5bd9/, "cor primária Agentic SEO presente");
assert.match(html, /Auditoria técnica/, "título preservado com acentos");
assert.match(html, /62\/100/, "conteúdo de seção renderizado");
assert.match(html, /Próximas decisões/, "heading com acentos preservado");
assert.match(html, /2026-05-13T10:00:00Z/, "generatedAt presente");

assert.ok(/<header>[\s\S]*<\/header>/.test(html), "tem <header>");
assert.ok(/<footer>[\s\S]*<\/footer>/.test(html), "tem <footer>");

const externalAsset = /\b(href|src)\s*=\s*["']https?:\/\//i;
assert.ok(!externalAsset.test(html), "nenhum asset externo (http/https)");

const scriptInjected = renderHtmlReport({
  title: "X",
  sections: [{ heading: "x", body_html: "<p>ok</p><script>alert(1)</script><iframe src=\"x\"></iframe>" }],
});
assert.ok(!/<script/i.test(scriptInjected), "tag <script> removida");
assert.ok(!/<iframe/i.test(scriptInjected), "tag <iframe> removida");

const onAttr = renderHtmlReport({
  title: "X",
  sections: [{ heading: "x", body_html: '<a href="#" onclick="alert(1)">x</a>' }],
});
assert.ok(!/onclick=/i.test(onAttr), "atributos on* removidos");

const empty = renderHtmlReport({});
assert.match(empty, /Relatório Agentic SEO/, "fallback de título");
assert.match(empty, /<!doctype html>/);

const escaped = renderHtmlReport({ title: "<script>x</script>", sections: [] });
assert.ok(!/<title><script>/.test(escaped), "título é escapado");
assert.match(escaped, /&lt;script&gt;x&lt;\/script&gt;/);

console.log("html-report ok");
