"use strict";

// Single source of truth for the analysis pages directory name.
const REPORT_DIR_NAME = "analyses";

const REPORT_BROWSER_PROMPT_MESSAGE = "Posso abrir o Web Companion para você ver a análise?";

const REPORT_MODULES = [
  { id: "technical-seo", title: { "pt-BR": "SEO Técnico", en: "Technical SEO" } },
  { id: "internal-links", title: { "pt-BR": "Links Internos", en: "Internal Links" } },
  { id: "seo-analysis", title: { "pt-BR": "Análise SEO", en: "SEO Analysis" } },
  { id: "keyword-research", title: { "pt-BR": "Pesquisa de Palavras-chave", en: "Keyword Research" } },
  { id: "serp-extract", title: { "pt-BR": "SERP", en: "SERP" } },
  { id: "backlink-analysis", title: { "pt-BR": "Backlinks", en: "Backlinks" } },
  { id: "topic-cluster", title: { "pt-BR": "Topic Clusters", en: "Topic Clusters" } },
  { id: "eeat", title: { "pt-BR": "E-E-A-T", en: "E-E-A-T" } },
  { id: "competitive-analysis", title: { "pt-BR": "Análise Competitiva", en: "Competitive Analysis" }, cli_ready: true },
];

const REPORT_MODULE_IDS = REPORT_MODULES.map((module) => module.id);

function reportModuleLabel(moduleId, locale) {
  const module = REPORT_MODULES.find((item) => item.id === moduleId);
  if (!module) return moduleId;
  const lang = locale === "en" ? "en" : "pt-BR";
  return module.title[lang] || module.title["pt-BR"] || moduleId;
}

module.exports = {
  REPORT_DIR_NAME,
  REPORT_BROWSER_PROMPT_MESSAGE,
  REPORT_MODULES,
  REPORT_MODULE_IDS,
  reportModuleLabel,
};
