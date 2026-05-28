"use strict";

function cleanProjectFilePath(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\/g, "/")
    .replace(/^project\//, "");
}

function companionSlugForPath(projectFilePath) {
  const rel = cleanProjectFilePath(projectFilePath);
  return (
    rel
      .replace(/\.md$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .toLowerCase() || "pagina"
  );
}

function normalizeCompanionSlug(value) {
  return companionSlugForPath(value);
}

function companionPathForPath(projectFilePath) {
  return companionSlugForPath(projectFilePath);
}

function companionUrlForPath(baseUrl, projectFilePath) {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${companionPathForPath(projectFilePath)}`;
}

function companionTargetForPath(projectFilePath, baseUrl) {
  const companion_slug = companionSlugForPath(projectFilePath);
  const out = {
    companion_slug,
    companion_path: companion_slug,
  };
  const companion_url = companionUrlForPath(baseUrl, projectFilePath);
  if (companion_url) out.companion_url = companion_url;
  return out;
}

function companionSlugMatches(slug, pageSlug) {
  if (!slug) return false;
  const normalizedSlug = normalizeCompanionSlug(slug);
  return normalizedSlug === pageSlug || normalizedSlug.endsWith(`-${pageSlug}`);
}

module.exports = {
  cleanProjectFilePath,
  companionSlugForPath,
  normalizeCompanionSlug,
  companionPathForPath,
  companionUrlForPath,
  companionTargetForPath,
  companionSlugMatches,
};
