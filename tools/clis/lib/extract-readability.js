/* SPDX-License-Identifier: MIT
 * Readability + Turndown wrapper. Given an HTML string and a base URL, returns
 * the article structure used by tools/clis/extract.js: title, headings, body
 * markdown, word count, and a few light metadata fields.
 */

function loadDeps() {
  const { JSDOM, VirtualConsole } = require("jsdom");
  const { Readability } = require("@mozilla/readability");
  const TurndownService = require("turndown");
  return { JSDOM, VirtualConsole, Readability, TurndownService };
}

function silentConsole(VirtualConsole) {
  const vc = new VirtualConsole();
  vc.on("error", () => {});
  vc.on("jsdomError", () => {});
  return vc;
}

function buildTurndown(TurndownService) {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-" });
  td.remove(["script", "style", "noscript", "iframe"]);
  return td;
}

function collectHeadings(doc) {
  const list = [];
  doc.querySelectorAll("h1, h2, h3, h4").forEach((node) => {
    const text = (node.textContent || "").trim().replace(/\s+/g, " ");
    if (text) list.push({ level: Number(node.tagName.slice(1)), text });
  });
  return list;
}

function pickMeta(doc, name) {
  const sel = `meta[name="${name}"], meta[property="${name}"], meta[name="og:${name}"], meta[property="og:${name}"]`;
  const node = doc.querySelector(sel);
  return node ? (node.getAttribute("content") || "").trim() : null;
}

function pickLanguage(doc) {
  const html = doc.documentElement;
  return (html && html.getAttribute("lang")) || pickMeta(doc, "language") || null;
}

function pickDate(doc) {
  return pickMeta(doc, "article:published_time") || pickMeta(doc, "article:modified_time") || pickMeta(doc, "date") || null;
}

function parse(html, url) {
  const { JSDOM, VirtualConsole, Readability, TurndownService } = loadDeps();
  const dom = new JSDOM(html, { url, virtualConsole: silentConsole(VirtualConsole) });
  const doc = dom.window.document;
  const title = (doc.querySelector("title")?.textContent || "").trim();
  const headings = collectHeadings(doc);
  const language = pickLanguage(doc);
  const datePublished = pickDate(doc);
  const reader = new Readability(doc.cloneNode(true));
  const article = reader.parse();
  const turndown = buildTurndown(TurndownService);
  const bodyHtml = article && article.content ? article.content : doc.body ? doc.body.innerHTML : "";
  const bodyMarkdown = turndown.turndown(bodyHtml).replace(/\n{3,}/g, "\n\n").trim();
  const wordCount = (bodyMarkdown.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length;
  return {
    title: article && article.title ? article.title : title,
    excerpt: article && article.excerpt ? article.excerpt : pickMeta(doc, "description") || null,
    byline: article && article.byline ? article.byline : null,
    language,
    date_published: datePublished,
    headings,
    body_markdown: bodyMarkdown,
    word_count: wordCount,
  };
}

module.exports = { parse };
