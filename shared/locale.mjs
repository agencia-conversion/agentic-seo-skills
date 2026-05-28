// Shared locale utilities for Agentic SEO. Owns three concerns the codebase used to
// re-implement in scattered places: project-language resolution, ASCII folding, and
// number/percent formatting. Consumers: MJS scripts (Node), TS via shared/locale.d.ts,
// and the Companion app.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const SUPPORTED_LANGUAGES = ["en", "pt-BR"];
const DEFAULT_LANGUAGE = "en";

const ASCII_FOLD = {
  á: "a", à: "a", ã: "a", â: "a", ä: "a", å: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", õ: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
  Á: "A", À: "A", Ã: "A", Â: "A", Ä: "A", Å: "A",
  É: "E", È: "E", Ê: "E", Ë: "E",
  Í: "I", Ì: "I", Î: "I", Ï: "I",
  Ó: "O", Ò: "O", Õ: "O", Ô: "O", Ö: "O",
  Ú: "U", Ù: "U", Û: "U", Ü: "U",
  Ç: "C", Ñ: "N",
};

export function asciiFold(value) {
  if (value == null) return "";
  return String(value).replace(/[áàãâäåéèêëíìîïóòõôöúùûüçñÁÀÃÂÄÅÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑ]/g, (c) => ASCII_FOLD[c] || c);
}

export function slugify(value) {
  return asciiFold(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeLanguage(value, fallback = DEFAULT_LANGUAGE) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const lower = trimmed.toLowerCase();
  if (lower === "pt-br" || lower === "pt" || lower === "pt_br" || lower === "pt-pt") return "pt-BR";
  if (lower === "en" || lower === "en-us" || lower === "en-gb" || lower === "en_us") return "en";
  return SUPPORTED_LANGUAGES.includes(trimmed) ? trimmed : fallback;
}

export function getProjectLanguage(projectDir, fallback = DEFAULT_LANGUAGE) {
  if (!projectDir) return fallback;
  const configPath = join(projectDir, ".agentic-seo", "project.json");
  if (!existsSync(configPath)) return fallback;
  try {
    const data = JSON.parse(readFileSync(configPath, "utf8"));
    return normalizeLanguage(data?.language, fallback);
  } catch {
    return fallback;
  }
}

// Canonical key for near-duplicate detection: fold diacritics, lower, replace
// punctuation with spaces, collapse spaces, and naively strip trailing `s` from
// tokens longer than 3 characters (so "landing pages" collapses to "landing page"
// but "os" stays "os"). The 4 "landing page" variants in the user report all
// reduce to the same canonical key under this rule.
export function canonicalKeyword(value) {
  if (value == null) return "";
  const folded = asciiFold(String(value)).toLowerCase();
  const cleaned = folded.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((token) => (token.length > 3 && token.endsWith("s") ? token.slice(0, -1) : token))
    .join(" ");
}

// Intl wrappers. `formatNumber(null)` → "—". `formatPercent(18)` treats the input
// as already on the 0..100 scale (consistent with `sov_pct` and the new
// `ctr_uplift_modeled_pct` field). Default locale is "en"; pass `"pt-BR"` to
// switch number/percent grouping and decimal separators for Brazilian output.
export function formatNumber(value, locale = DEFAULT_LANGUAGE, options = {}) {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  const resolved = normalizeLanguage(locale);
  return new Intl.NumberFormat(resolved, { maximumFractionDigits: 2, ...options }).format(num);
}

export function formatPercent(value, locale = DEFAULT_LANGUAGE, options = {}) {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  const resolved = normalizeLanguage(locale);
  return new Intl.NumberFormat(resolved, {
    style: "percent",
    maximumFractionDigits: 1,
    ...options,
  }).format(num / 100);
}

export function formatCompactNumber(value, locale = DEFAULT_LANGUAGE, options = {}) {
  if (value == null || (typeof value === "number" && !Number.isFinite(value))) return "—";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";
  const resolved = normalizeLanguage(locale);
  return new Intl.NumberFormat(resolved, { notation: "compact", maximumFractionDigits: 1, ...options }).format(num);
}
