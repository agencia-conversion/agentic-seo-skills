import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import sharedReportModules from "../../shared/report-modules.js";
import { appendLogEntry, parseFrontmatter } from "./brain-page.mjs";

const { REPORT_DIR_NAME, REPORT_MODULE_IDS } = sharedReportModules;
const REPORT_PATH_RE = new RegExp(`^${REPORT_DIR_NAME}\\/[A-Za-z0-9._-]+\\/[A-Za-z0-9._/-]+\\/report\\.md$`);

export const AUTHORIAL_BRAIN_PAGES = new Set([
  "brain/index.md",
  "brain/identity.md",
  "brain/voice.md",
  "brain/technology.md",
  "brain/topic-clusters.md",
  "brain/products.md",
  "brain/review.md",
]);

export function isAuthorialBrainPath(rel) {
  if (AUTHORIAL_BRAIN_PAGES.has(rel)) return true;
  if (rel.startsWith("brain/topic-clusters/") && rel.endsWith(".md") && !rel.includes("..")) return true;
  return false;
}

const BRAIN_PAGE_ORDER = [
  "brain/index.md",
  "brain/identity.md",
  "brain/voice.md",
  "brain/technology.md",
  "brain/topic-clusters.md",
  "brain/products.md",
  "brain/review.md",
  "brain/log.md",
];
const CONTENT_ORIGINS = new Set(["blog", "linkedin", "podcast", "other"]);
const REPORT_MODULES = new Set(REPORT_MODULE_IDS);
const SUPPORTED_PROJECT_LANGUAGES = new Set(["pt-BR", "en"]);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRAIN_TEMPLATE_DIR = join(ROOT, "templates", "project", "brain");

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeProjectRoot(projectRoot) {
  return resolve(projectRoot || "project");
}

function projectConfigPath(root) {
  return join(root, ".agentic-seo", "project.json");
}

function readProjectConfig(root) {
  const config = projectConfigPath(root);
  if (!existsSync(config)) return {};
  try {
    const data = JSON.parse(readFileSync(config, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function normalizeProjectLanguage(value, fallback = "pt-BR") {
  if (!value) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized.startsWith("pt")) return "pt-BR";
  if (normalized.startsWith("en")) return "en";
  return "en";
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function yamlValue(value) {
  if (Array.isArray(value)) {
    return value.length ? ["", ...value.map((item) => `  - ${yamlString(item)}`)] : ["[]"];
  }
  return [yamlString(value)];
}

function frontmatterLines(fields) {
  return Object.entries(fields).flatMap(([key, value]) => {
    const rendered = yamlValue(value);
    return rendered.length === 1 ? [`${key}: ${rendered[0]}`] : [`${key}:`, ...rendered.slice(1)];
  });
}

function slugFromTitle(title) {
  return (title || "nova-pagina")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "nova-pagina";
}

export function validateProjectFileRel(rawPath, { write = false } = {}) {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    return { ok: false, reason: "missing-path" };
  }
  const rel = rawPath.trim().replace(/^\/+/, "");
  const parts = rel.split("/");
  const safe = parts.every((part) => part && part !== "." && part !== ".." && !part.startsWith("."));
  const allowed =
    /^brain\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    /^brain\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    /^contents\/(blog|linkedin|podcast|other)\/[A-Za-z0-9._-]+\.md$/.test(rel) ||
    /^workbench\/[A-Za-z0-9._/-]+\.md$/.test(rel) ||
    REPORT_PATH_RE.test(rel);
  if (rel.includes("\\") || !safe || !allowed) {
    return { ok: false, reason: "path-not-allowed" };
  }
  if (rel.startsWith(`${REPORT_DIR_NAME}/`)) {
    if (!REPORT_MODULES.has(parts[1])) return { ok: false, reason: "path-not-allowed" };
  }
  if (write && rel === "brain/log.md") return { ok: false, reason: "read-only-log" };
  return { ok: true, rel };
}

function resolveAllowedFile(projectRoot, rel) {
  const root = normalizeProjectRoot(projectRoot);
  const filePath = resolve(root, rel);
  const allowedRoots = ["brain", "contents", "workbench", REPORT_DIR_NAME].map((dir) => resolve(root, dir));
  if (!allowedRoots.some((allowedRoot) => filePath === allowedRoot || filePath.startsWith(`${allowedRoot}${sep}`))) {
    throw new Error("path escaped project root");
  }
  if (existsSync(filePath)) {
    const lst = lstatSync(filePath);
    if (lst.isSymbolicLink()) throw new Error("symlink files are not allowed");
    const realFile = realpathSync(filePath);
    const realRoot = realpathSync(root);
    if (!realFile.startsWith(`${realRoot}${sep}`)) throw new Error("path escaped project root");
  }
  return { root, filePath };
}

function companionUiPath(root) {
  return join(root, ".agentic-seo", "companion-ui.json");
}

function readCompanionUi(root) {
  const fallback = { schema_version: "1.0.0", project: {}, pages: {} };
  const file = companionUiPath(root);
  if (!existsSync(file)) return fallback;
  try {
    const data = JSON.parse(readFileSync(file, "utf8"));
    return {
      schema_version: "1.0.0",
      project: data?.project && typeof data.project === "object" ? data.project : {},
      pages: data?.pages && typeof data.pages === "object" ? data.pages : {},
    };
  } catch {
    return fallback;
  }
}

function writeCompanionUi(root, ui) {
  mkdirSync(dirname(companionUiPath(root)), { recursive: true });
  writeFileSync(companionUiPath(root), JSON.stringify(ui, null, 2) + "\n", "utf8");
}

function pageUi(ui, rel) {
  const item = ui.pages?.[rel];
  return item && typeof item === "object" ? item : {};
}

function applyPageUi(summary, ui) {
  const item = pageUi(ui, summary.path);
  if (Object.prototype.hasOwnProperty.call(item, "icon")) summary.icon = item.icon ?? null;
  if (Object.prototype.hasOwnProperty.call(item, "cover")) summary.cover = item.cover ?? null;
  return summary;
}

function savePageUi(root, rel, nextUi) {
  const hasIcon = Object.prototype.hasOwnProperty.call(nextUi, "icon");
  const hasCover = Object.prototype.hasOwnProperty.call(nextUi, "cover");
  if (!hasIcon && !hasCover) return false;
  const ui = readCompanionUi(root);
  ui.pages[rel] = {
    ...pageUi(ui, rel),
    ...(hasIcon ? { icon: typeof nextUi.icon === "string" && nextUi.icon ? nextUi.icon : null } : {}),
    ...(hasCover ? { cover: typeof nextUi.cover === "string" && nextUi.cover ? nextUi.cover : null } : {}),
    updated_at: new Date().toISOString(),
  };
  writeCompanionUi(root, ui);
  return true;
}

function deletePageUi(root, rel) {
  const ui = readCompanionUi(root);
  if (!Object.prototype.hasOwnProperty.call(ui.pages || {}, rel)) return false;
  delete ui.pages[rel];
  writeCompanionUi(root, ui);
  return true;
}

function titleFromFile(rel, frontmatter) {
  const title = String(frontmatter.title || "").trim().replace(/^["']|["']$/g, "");
  if (title) return title;
  if (rel === "brain/log.md") return "Log";
  return basename(rel, ".md")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function projectDisplayName(projectRoot) {
  const root = normalizeProjectRoot(projectRoot);
  const project = readProjectConfig(root);
  if (project?.name) return String(project.name);
  if (project?.brand_name) return String(project.brand_name);
  const index = join(root, "brain", "index.md");
  if (existsSync(index)) {
    try {
      const { data } = parseFrontmatter(readFileSync(index, "utf8"));
      if (data.title) return String(data.title).replace(/^["']|["']$/g, "");
    } catch {}
  }
  return "Agentic SEO";
}

export function readProjectSettings({ projectRoot }) {
  const root = normalizeProjectRoot(projectRoot);
  const data = readProjectConfig(root);
  const projectName = data?.name || data?.brand_name || projectDisplayName(root);
  const market = data?.market || data?.country || "Brasil";
  const country = data?.country || market;
  return {
    ok: true,
    projectRoot: root,
    projectName: String(projectName),
    language: normalizeProjectLanguage(data?.language),
    market: String(market),
    country: String(country),
  };
}

export function updateProjectSettings({ projectRoot, language }) {
  const root = normalizeProjectRoot(projectRoot);
  const nextLanguage = typeof language === "string" ? language.trim() : "";
  if (!SUPPORTED_PROJECT_LANGUAGES.has(nextLanguage)) return { ok: false, reason: "invalid-language" };
  const previous = readProjectConfig(root);
  const next = {
    schema_version: previous.schema_version || "2.0.0",
    name: previous.name || previous.project_name || "Agentic SEO Project",
    ...previous,
    language: nextLanguage,
    updated_at: nowIso(),
    single_project_root: previous.single_project_root || "project",
  };
  mkdirSync(dirname(projectConfigPath(root)), { recursive: true });
  writeFileSync(projectConfigPath(root), JSON.stringify(next, null, 2) + "\n", "utf8");
  if (existsSync(join(root, "brain", "log.md"))) {
    appendLogEntry(join(root, "brain", "log.md"), {
      date: todayIso(),
      type: "decision",
      title: "Idioma do projeto atualizado",
      scope: ".agentic-seo/project.json",
      decision: `Idioma canônico do projeto definido como ${nextLanguage}.`,
      evidence: ".agentic-seo/project.json",
      approver: "agent",
    });
  }
  return readProjectSettings({ projectRoot: root });
}

function readBrainPageSummary(projectRoot, rel, ui, defaultIcons = null) {
  const { filePath } = resolveAllowedFile(projectRoot, rel);
  if (!existsSync(filePath)) return null;
  const text = readFileSync(filePath, "utf8");
  const { data: frontmatter, body } = parseFrontmatter(text);
  const title = titleFromFile(rel, frontmatter);
  const displayBody = stripDuplicateTitleHeading(rel, body, title);
  const summary = {
    path: rel,
    title,
    updated: frontmatter.updated || frontmatter.published_at || null,
    readOnly: rel === "brain/log.md",
    requiresApproval: false,
    excerpt: displayBody.replace(/\s+/g, " ").trim().slice(0, 180),
    hash: sha256(text),
  };
  if (defaultIcons && defaultIcons.has(rel)) {
    summary.icon = defaultIcons.get(rel);
  }
  return applyPageUi(summary, ui);
}

function walkMarkdown(root, current = root) {
  if (!existsSync(current)) return [];
  const out = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, "pt-BR"))) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkMarkdown(root, full));
    if (st.isFile() && name.endsWith(".md")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
  return out;
}

function canonicalBrainExists(root) {
  return BRAIN_PAGE_ORDER.some((rel) => existsSync(join(root, rel)));
}

export function buildProjectTree({ projectRoot }) {
  const root = normalizeProjectRoot(projectRoot);
  const projectName = projectDisplayName(root);
  const ui = readCompanionUi(root);
  const hasProjectIcon = Object.prototype.hasOwnProperty.call(ui.project || {}, "icon");
  const projectIcon = hasProjectIcon ? ui.project.icon || null : null;
  const brainRoot = join(root, "brain");
  const rels = new Set(BRAIN_PAGE_ORDER);
  if (existsSync(brainRoot)) {
    for (const name of readdirSync(brainRoot)) {
      const rel = `brain/${name}`;
      const full = join(brainRoot, name);
      if (name.startsWith(".") || name.startsWith("_")) continue;
      const st = statSync(full);
      if (st.isFile() && name.endsWith(".md")) rels.add(rel);
      if (st.isDirectory()) {
        for (const child of walkMarkdown(full)) rels.add(`brain/${name}/${child}`);
      }
    }
  }
  const defaultIcons = new Map();
  for (const cluster of readTopicClusters(root)) {
    if (cluster.icon) defaultIcons.set(`brain/topic-clusters/${cluster.id}.md`, cluster.icon);
  }
  const ordered = [...rels].sort((a, b) => {
    const ia = BRAIN_PAGE_ORDER.indexOf(a);
    const ib = BRAIN_PAGE_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    return a.localeCompare(b, "pt-BR");
  });
  const items = ordered
    .map((rel) => readBrainPageSummary(root, rel, ui, defaultIcons))
    .filter(Boolean);
  const contentItems = [];
  for (const origin of CONTENT_ORIGINS) {
    const dir = join(root, "contents", origin);
    for (const child of walkMarkdown(dir)) {
      const item = readBrainPageSummary(root, `contents/${origin}/${child}`, ui);
      if (item) contentItems.push(item);
    }
  }
  const workbenchItems = walkMarkdown(join(root, "workbench"))
    .map((child) => readBrainPageSummary(root, `workbench/${child}`, ui))
    .filter(Boolean);
  const hasFiles = items.length + contentItems.length + workbenchItems.length > 0;
  const hasBrain = canonicalBrainExists(root);
  const sections = [
    {
      id: "brain",
      title: "Brain",
      items,
    },
  ];
  if (contentItems.length || existsSync(join(root, "contents"))) sections.push({ id: "contents", title: "Conteúdos", items: contentItems });
  if (workbenchItems.length) sections.push({ id: "workbench", title: "Workbench", items: workbenchItems });
  return {
    ok: true,
    hasFiles,
    hasBrain,
    canBootstrapBrain: !hasBrain,
    project: {
      root,
      name: projectName,
      icon: projectIcon,
    },
    sections,
  };
}

function cleanValue(value) {
  return String(value ?? "").replace(/^["']|["']$/g, "").trim();
}

function slugValue(value) {
  return cleanValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function walkClusterFiles(root, current = root) {
  if (!existsSync(current)) return [];
  const out = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, "pt-BR"))) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkClusterFiles(root, full));
    if (st.isFile() && (name === "cluster.json" || name === "cluster.yaml")) {
      out.push(relative(root, full).split(sep).join("/"));
    }
  }
  return out;
}

function parseClusterFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (filePath.endsWith(".yaml")) return parseYaml(text);
  return JSON.parse(text);
}

function buildClusterIndexEntry(data, filePath, root) {
  // Schema (cluster.yaml): slug, name, area, pillar { slug, keyword }, satellites[ { slug, keyword } ]
  // Schema legado (cluster.json): seed, seed_slug, pillar { slug, title }, supporting_pages[ { slug, title, keyword_principal } ]
  const folder = basename(resolve(filePath, ".."));
  const id = slugValue(data.slug || data.seed_slug || data.pillar?.slug || folder);
  if (!id) return null;
  const title = cleanValue(data.name || data.pillar?.keyword || data.pillar?.title || data.seed || id) || id;
  const icon = typeof data.icon === "string" && data.icon.trim() ? data.icon.trim() : null;
  const aliases = new Set(
    [id, slugValue(title), slugValue(data.seed), slugValue(data.pillar?.slug), slugValue(data.seed_slug), slugValue(data.slug)].filter(
      Boolean,
    ),
  );
  const pageSlugs = new Set();
  for (const value of [data.pillar?.slug, data.pillar?.keyword, data.pillar?.title, data.seed]) {
    const slug = slugValue(value);
    if (slug) pageSlugs.add(slug);
  }
  const items = Array.isArray(data.satellites) ? data.satellites : Array.isArray(data.supporting_pages) ? data.supporting_pages : [];
  for (const page of items) {
    for (const value of [page?.slug, page?.title, page?.keyword, page?.keyword_principal?.keyword]) {
      const slug = slugValue(value);
      if (slug) pageSlugs.add(slug);
    }
  }
  return { id, title, icon, path: relative(root, filePath).split(sep).join("/"), aliases, pageSlugs };
}

function readTopicClusters(root) {
  const clustersRoot = resolve(root, "clusters");
  if (!existsSync(clustersRoot)) return [];
  const realRoot = realpathSync(root);
  const seen = new Set();
  const clusters = [];
  for (const child of walkClusterFiles(clustersRoot)) {
    const filePath = resolve(clustersRoot, child);
    const realFile = realpathSync(filePath);
    if (!realFile.startsWith(`${realRoot}${sep}`)) continue;
    try {
      const data = parseClusterFile(filePath);
      const entry = buildClusterIndexEntry(data, filePath, root);
      if (!entry || seen.has(entry.id)) continue;
      seen.add(entry.id);
      clusters.push(entry);
    } catch {
      // Ignore malformed cluster drafts.
    }
  }
  return clusters.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
}

function frontmatterClusterSlugs(frontmatter) {
  const out = [];
  const raw = frontmatter.clusters;
  if (Array.isArray(raw)) {
    for (const value of raw) {
      const slug = slugValue(value);
      if (slug) out.push(slug);
    }
  }
  for (const key of ["topic_cluster", "topicCluster", "cluster"]) {
    const slug = slugValue(frontmatter[key]);
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

function inferContentClusters(frontmatter, contentSlug, clusters) {
  const declared = frontmatterClusterSlugs(frontmatter);
  const matched = [];
  const seen = new Set();
  const pushMatch = (entry) => {
    if (!entry || seen.has(entry.id)) return;
    seen.add(entry.id);
    matched.push(entry);
  };
  for (const slug of declared) {
    const entry =
      clusters.find((cluster) => cluster.id === slug || cluster.aliases.has(slug)) || {
        id: slug,
        title: slug,
        path: null,
      };
    pushMatch(entry);
  }
  if (matched.length === 0) {
    const area = slugValue(frontmatter.area);
    const slug = slugValue(frontmatter.slug || contentSlug);
    const fallback = clusters.find((cluster) => cluster.aliases.has(area) || cluster.pageSlugs.has(slug));
    if (fallback) pushMatch(fallback);
  }
  return matched;
}

function normalizeClusterFilter(topicCluster) {
  if (!topicCluster) return [];
  if (Array.isArray(topicCluster)) return topicCluster.map((value) => String(value).trim()).filter(Boolean);
  return String(topicCluster)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function listProjectContents({ projectRoot, page = 1, pageSize = 25, query = "", origin = "", topicCluster = "", sort = "", direction = "desc" }) {
  const root = normalizeProjectRoot(projectRoot);
  const clusters = readTopicClusters(root);
  const rows = [];
  for (const contentOrigin of CONTENT_ORIGINS) {
    const dir = resolve(root, "contents", contentOrigin);
    if (!existsSync(dir)) continue;
    const realDir = realpathSync(dir);
    if (!realDir.startsWith(`${realpathSync(root)}${sep}`)) continue;
    for (const child of walkMarkdown(dir)) {
      const rel = `contents/${contentOrigin}/${child}`;
      const filePath = resolve(root, rel);
      const realFile = realpathSync(filePath);
      if (!realFile.startsWith(`${realDir}${sep}`)) continue;
      const text = readFileSync(filePath, "utf8");
      const { data: frontmatter, body } = parseFrontmatter(text);
      const contentSlug = cleanValue(frontmatter.slug) || basename(child, ".md");
      const matches = inferContentClusters(frontmatter, contentSlug, clusters);
      const primary = matches[0] || null;
      const rawVolume = frontmatter.volume;
      const keywordVolume =
        typeof rawVolume === "number"
          ? rawVolume
          : Number.isFinite(Number(rawVolume))
            ? Number(rawVolume)
            : null;
      rows.push({
        id: sha256(rel),
        path: rel,
        title: cleanValue(frontmatter.title) || titleFromFile(rel, frontmatter),
        slug: contentSlug,
        origin: cleanValue(frontmatter.origin) || contentOrigin,
        area: cleanValue(frontmatter.area),
        topic_cluster: primary?.id || null,
        topicClusterTitle: primary?.title || null,
        topicClusterPath: primary?.path || null,
        topic_clusters: matches.map((entry) => entry.id),
        topicClusterTitles: matches.map((entry) => entry.title),
        topicClusterPaths: matches.map((entry) => entry.path),
        keyword: cleanValue(frontmatter.keyword || frontmatter.keyword_principal?.keyword),
        intent: cleanValue(frontmatter.intent),
        keyword_volume: keywordVolume,
        published_at: cleanValue(frontmatter.published_at),
        updated: cleanValue(frontmatter.updated || frontmatter.updated_at),
        status: cleanValue(frontmatter.status) || (cleanValue(frontmatter.published_at) ? "published" : "draft"),
        excerpt: body.replace(/\s+/g, " ").trim().slice(0, 180),
        hash: sha256(text),
      });
    }
  }

  const noneCluster = "__none__";
  const q = query.trim().toLowerCase();
  let filtered = rows;
  if (origin.trim()) filtered = filtered.filter((row) => row.origin === origin.trim());
  const clusterFilters = normalizeClusterFilter(topicCluster);
  if (clusterFilters.length > 0) {
    filtered = filtered.filter((row) =>
      clusterFilters.some((selected) =>
        selected === noneCluster ? row.topic_clusters.length === 0 : row.topic_clusters.includes(selected),
      ),
    );
  }
  if (q) {
    filtered = filtered.filter((row) =>
      [row.title, row.path, row.origin, row.area, row.topicClusterTitle, ...(row.topicClusterTitles || []), row.keyword, row.intent, row.status, row.excerpt].some(
        (value) => String(value || "").toLowerCase().includes(q),
      ),
    );
  }
  const sortKey = String(sort || "").trim();
  const dir = String(direction).toLowerCase() === "asc" ? 1 : -1;
  const valueForSort = (row) => {
    if (sortKey === "title" || sortKey === "conteudo") return row.title;
    if (sortKey === "origin") return row.origin;
    if (sortKey === "keyword") return row.keyword;
    if (sortKey === "intent") return row.intent;
    if (sortKey === "status") return row.status;
    if (sortKey === "clusters") return (row.topicClusterTitles || []).join(", ");
    if (sortKey === "published_at") return row.published_at;
    return row.updated || row.published_at || row.path;
  };
  filtered.sort((a, b) => String(valueForSort(a) || "").localeCompare(String(valueForSort(b) || ""), "pt-BR", { numeric: true }) * dir);
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const assignedCounts = new Map();
  for (const row of rows) {
    if (row.topic_clusters.length === 0) {
      assignedCounts.set(noneCluster, (assignedCounts.get(noneCluster) || 0) + 1);
      continue;
    }
    for (const id of row.topic_clusters) {
      assignedCounts.set(id, (assignedCounts.get(id) || 0) + 1);
    }
  }
  const topicClusters = [
    ...clusters.map((cluster) => ({ id: cluster.id, title: cluster.title, count: assignedCounts.get(cluster.id) || 0 })),
    ...(assignedCounts.get(noneCluster) ? [{ id: noneCluster, title: "Sem cluster", count: assignedCounts.get(noneCluster) || 0 }] : []),
  ];
  const start = (safePage - 1) * safePageSize;
  return {
    ok: true,
    page: safePage,
    pageSize: safePageSize,
    total: filtered.length,
    origins: [...CONTENT_ORIGINS].map((id) => ({ id, count: rows.filter((row) => row.origin === id).length })),
    topicClusters,
    items: filtered.slice(start, start + safePageSize),
  };
}

export function listProjectWorkbench({ projectRoot, page = 1, pageSize = 25, query = "" }) {
  const root = normalizeProjectRoot(projectRoot);
  const workbenchRoot = resolve(root, "workbench");
  const rows = [];
  if (existsSync(workbenchRoot)) {
    const realRoot = realpathSync(root);
    const realWorkbench = realpathSync(workbenchRoot);
    if (!realWorkbench.startsWith(`${realRoot}${sep}`)) return { ok: false, reason: "path-not-allowed" };
    for (const child of walkMarkdown(workbenchRoot)) {
      const rel = `workbench/${child}`;
      const filePath = resolve(root, rel);
      const realFile = realpathSync(filePath);
      if (!realFile.startsWith(`${realWorkbench}${sep}`)) continue;
      const text = readFileSync(filePath, "utf8");
      const { data: frontmatter, body } = parseFrontmatter(text);
      const st = statSync(filePath);
      rows.push({
        id: sha256(rel),
        path: rel,
        title: cleanValue(frontmatter.title) || titleFromFile(rel, frontmatter),
        folder: dirname(child) === "." ? "workbench" : dirname(child).split(sep).join("/"),
        updated: cleanValue(frontmatter.updated || frontmatter.updated_at) || st.mtime.toISOString(),
        frontmatter: Object.keys(frontmatter || {}).length,
        excerpt: body.replace(/\s+/g, " ").trim().slice(0, 180),
        hash: sha256(text),
      });
    }
  }

  const q = query.trim().toLowerCase();
  let filtered = rows;
  if (q) {
    filtered = filtered.filter((row) =>
      [row.title, row.path, row.folder, row.excerpt].some((value) =>
        String(value || "").toLowerCase().includes(q)
      )
    );
  }
  filtered.sort((a, b) => String(b.updated || b.path).localeCompare(String(a.updated || a.path)));
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safePageSize;
  return {
    ok: true,
    page: safePage,
    pageSize: safePageSize,
    total: filtered.length,
    items: filtered.slice(start, start + safePageSize),
  };
}

function renderBrainTemplate(rel, text, projectName) {
  const today = todayIso();
  let out = text.replaceAll("<YYYY-MM-DD>", today);
  if (rel === "brain/index.md") {
    out = out.replaceAll("<Nome do projeto>", projectName || "Agentic SEO");
  }
  return out;
}

export function bootstrapBrainFiles({ projectRoot }) {
  const root = normalizeProjectRoot(projectRoot);
  if (canonicalBrainExists(root)) return { ok: false, reason: "brain-already-exists" };
  const projectName = projectDisplayName(root);
  const created = [];
  for (const rel of BRAIN_PAGE_ORDER) {
    const source = join(BRAIN_TEMPLATE_DIR, basename(rel));
    if (!existsSync(source)) return { ok: false, reason: "template-not-found", path: rel };
    const validation = validateProjectFileRel(rel, { write: rel !== "brain/log.md" });
    if (!validation.ok && rel !== "brain/log.md") return { ok: false, reason: validation.reason, path: rel };
    const { filePath } = resolveAllowedFile(root, rel);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, renderBrainTemplate(rel, readFileSync(source, "utf8"), projectName), "utf8");
    created.push(rel);
  }
  appendLogEntry(join(root, "brain", "log.md"), {
    date: todayIso(),
    type: "decision",
    title: "Brain criado no Companion",
    scope: created.join(", "),
    decision: "Arquivos canônicos do Brain criados no Companion Web.",
    evidence: created.join(", "),
    approver: "agent",
  });
  return { ok: true, created, tree: buildProjectTree({ projectRoot: root }) };
}

export function readProjectFile({ projectRoot, fileRel }) {
  const validation = validateProjectFileRel(fileRel);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { root, filePath } = resolveAllowedFile(projectRoot, validation.rel);
  if (!existsSync(filePath)) return { ok: false, reason: "file-not-found" };
  const text = readFileSync(filePath, "utf8");
  const { data: frontmatter, body, raw } = parseFrontmatter(text);
  const itemUi = pageUi(readCompanionUi(root), validation.rel);
  const title = titleFromFile(validation.rel, frontmatter);
  const displayBody = stripDuplicateTitleHeading(validation.rel, body, title);
  return {
    ok: true,
    projectRoot: root,
    path: validation.rel,
    title,
    frontmatter,
    frontmatterRaw: raw,
    icon: Object.prototype.hasOwnProperty.call(itemUi, "icon") ? itemUi.icon ?? null : undefined,
    cover: Object.prototype.hasOwnProperty.call(itemUi, "cover") ? itemUi.cover ?? null : undefined,
    body: displayBody,
    text,
    hash: sha256(text),
    readOnly: validation.rel === "brain/log.md",
    requiresApproval: false,
  };
}

function setFrontmatterFields(text, fields) {
  const linesForFields = frontmatterLines(fields);
  if (!text.startsWith("---\n")) {
    return `---\n${linesForFields.join("\n")}\n---\n\n${text.replace(/^\n+/, "")}`;
  }
  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    return `---\n${linesForFields.join("\n")}\n---\n\n${text}`;
  }
  const raw = text.slice(4, end);
  const after = text.slice(end + 4);
  const lines = raw.split(/\r?\n/);
  const seen = new Set();
  const nextLines = [];
  for (const line of lines) {
    let replaced = false;
    for (const [key, value] of Object.entries(fields)) {
      if (new RegExp(`^${key}\\s*:`).test(line)) {
        seen.add(key);
        nextLines.push(...frontmatterLines({ [key]: value }));
        replaced = true;
        break;
      }
    }
    if (!replaced) nextLines.push(line);
  }
  for (const [key, value] of Object.entries(fields)) {
    if (!seen.has(key)) nextLines.push(...frontmatterLines({ [key]: value }));
  }
  return `---\n${nextLines.join("\n")}\n---${after}`;
}

function cleanFrontmatterRaw(raw) {
  if (typeof raw !== "string") return null;
  if (raw.includes("\0") || /^---\s*$/m.test(raw)) return null;
  return raw.replace(/\r\n/g, "\n").replace(/\s+$/, "");
}

function frontmatterFieldsForPath(rel, incoming, existing, title) {
  if (rel.startsWith("contents/")) {
    return {
      ...existing,
      ...incoming,
      title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
    };
  }
  if (rel.startsWith(`${REPORT_DIR_NAME}/`)) {
    return {
      ...existing,
      ...incoming,
      title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
      edited_at: nowIso(),
    };
  }
  const next = {
    title: String(incoming.title || title || existing.title || titleFromFile(rel, existing)).trim(),
  };
  if (rel.startsWith("brain/")) next.updated = todayIso();
  return next;
}

function normalizeHeadingTitle(value) {
  return String(value || "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function stripDuplicateTitleHeading(_rel, body, title) {
  const match = String(body || "").match(/^\s*#\s+([^\n\r]+)\s*(?:\r?\n|$)/);
  if (!match) return body;
  if (normalizeHeadingTitle(match[1]) !== normalizeHeadingTitle(title)) return body;
  return String(body || "").slice(match[0].length).replace(/^\s*\n/, "");
}

export function saveProjectFile({ projectRoot, fileRel, expectedHash, title, body, frontmatter, frontmatterRaw, ui, approver, notes }) {
  const hasBodyChange = typeof body === "string";
  const validation = validateProjectFileRel(fileRel, { write: hasBodyChange });
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { root, filePath } = resolveAllowedFile(projectRoot, validation.rel);
  if (!existsSync(filePath)) return { ok: false, reason: "file-not-found" };
  const hasUiChange = !!ui && (Object.prototype.hasOwnProperty.call(ui, "icon") || Object.prototype.hasOwnProperty.call(ui, "cover"));
  if (!hasBodyChange && !hasUiChange) return { ok: false, reason: "invalid-body" };
  const current = readFileSync(filePath, "utf8");
  const currentHash = sha256(current);
  if (!hasBodyChange) {
    const uiSaved = hasUiChange ? savePageUi(root, validation.rel, ui || {}) : false;
    return {
      ok: true,
      path: validation.rel,
      hash: currentHash,
      uiSaved,
      logAppended: false,
    };
  }
  if (!expectedHash || expectedHash !== currentHash) {
    return { ok: false, reason: "file-modified", currentHash };
  }
  const approverClean = String(approver || "").trim();
  const { data: existingFrontmatter } = parseFrontmatter(current);
  const incomingFrontmatter = frontmatter && typeof frontmatter === "object" ? frontmatter : {};
  const finalTitle = String(
    incomingFrontmatter.title || title || existingFrontmatter.title || titleFromFile(validation.rel, existingFrontmatter)
  ).trim();
  const today = todayIso();
  const rawCandidate = validation.rel.startsWith("contents/") ? cleanFrontmatterRaw(frontmatterRaw) : null;
  let rawFrontmatter;
  if (rawCandidate !== null) {
    rawFrontmatter = rawCandidate;
  } else {
    const fields = frontmatterFieldsForPath(validation.rel, incomingFrontmatter, existingFrontmatter, finalTitle);
    rawFrontmatter = parseFrontmatter(setFrontmatterFields(current, fields)).raw;
  }
  const finalText = `---\n${rawFrontmatter}\n---\n\n${body.replace(/^\n+/, "").replace(/\s*$/, "\n")}`;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, finalText, "utf8");
  const uiSaved = hasUiChange ? savePageUi(root, validation.rel, ui || {}) : false;

  if (validation.rel.startsWith("brain/") || validation.rel.startsWith(`${REPORT_DIR_NAME}/`)) {
    const logFile = join(root, "brain", "log.md");
    const isReport = validation.rel.startsWith(`${REPORT_DIR_NAME}/`);
    appendLogEntry(logFile, {
      date: today,
      type: "decision",
      title: isReport ? "Análise editada no Companion" : `${basename(validation.rel, ".md")} editado no Companion`,
      scope: validation.rel,
      decision: `${isReport ? "Análise" : validation.rel} editado${isReport ? "a" : ""} no Companion Web${approverClean ? ` por ${approverClean}` : ""}.`,
      evidence: validation.rel,
      approver: approverClean || "agent",
      approved_at: null,
      notes: notes ? String(notes).trim() : null,
    });
  }

  const next = readFileSync(filePath, "utf8");
  return {
    ok: true,
    path: validation.rel,
    title: finalTitle,
    updated: today,
    hash: sha256(next),
    requiresApproval: false,
    uiSaved,
    logAppended: validation.rel.startsWith("brain/") || validation.rel.startsWith(`${REPORT_DIR_NAME}/`),
  };
}

function uniqueRel(root, rel) {
  const base = rel.replace(/\.md$/, "");
  let candidate = `${base}.md`;
  let i = 2;
  while (existsSync(join(root, candidate))) {
    candidate = `${base}-${i}.md`;
    i++;
  }
  return candidate;
}

export function createProjectFile({ projectRoot, kind = "workbench", title = "Nova página" }) {
  const root = normalizeProjectRoot(projectRoot);
  const slug = slugFromTitle(title);
  const rel = kind === "content"
    ? uniqueRel(root, `contents/other/${slug}.md`)
    : uniqueRel(root, `workbench/companion/${slug}.md`);
  const validation = validateProjectFileRel(rel, { write: true });
  if (!validation.ok) return { ok: false, reason: validation.reason };
  const { filePath } = resolveAllowedFile(root, validation.rel);
  mkdirSync(dirname(filePath), { recursive: true });
  const today = todayIso();
  const text = kind === "content"
    ? `---\ntitle: ${yamlString(title)}\nslug: ${yamlString(basename(rel, ".md"))}\npublished_at: ""\nsource_url: ""\norigin: "other"\narea: ""\n---\n\n`
    : `---\ntitle: ${yamlString(title)}\nupdated: ${yamlString(today)}\n---\n\n`;
  writeFileSync(filePath, text, "utf8");
  return { ...readProjectFile({ projectRoot: root, fileRel: rel }), created: true };
}

function uniqueTrashPath(root, rel) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  let trashRel = `.agentic-seo/trash/${stamp}/${rel}`;
  let i = 2;
  while (existsSync(join(root, trashRel))) {
    trashRel = `.agentic-seo/trash/${stamp}-${i}/${rel}`;
    i++;
  }
  return trashRel;
}

export function deleteProjectFile({ projectRoot, fileRel, expectedHash, dirty = false }) {
  if (dirty) return { ok: false, reason: "dirty-file" };
  const validation = validateProjectFileRel(fileRel);
  if (!validation.ok) return { ok: false, reason: validation.reason };
  if (validation.rel.startsWith(`${REPORT_DIR_NAME}/`)) return { ok: false, reason: "report-delete-not-allowed" };
  if (validation.rel === "brain/log.md") return { ok: false, reason: "read-only-log" };
  const { root, filePath } = resolveAllowedFile(projectRoot, validation.rel);
  if (!existsSync(filePath)) return { ok: false, reason: "file-not-found" };
  const current = readFileSync(filePath, "utf8");
  const currentHash = sha256(current);
  if (!expectedHash || expectedHash !== currentHash) {
    return { ok: false, reason: "file-modified", currentHash };
  }
  const trashPath = uniqueTrashPath(root, validation.rel);
  const absoluteTrash = join(root, trashPath);
  mkdirSync(dirname(absoluteTrash), { recursive: true });
  renameSync(filePath, absoluteTrash);
  deletePageUi(root, validation.rel);

  if (validation.rel.startsWith("brain/")) {
    appendLogEntry(join(root, "brain", "log.md"), {
      date: todayIso(),
      type: "decision",
      title: `${basename(validation.rel, ".md")} movido para lixeira`,
      scope: validation.rel,
      decision: `${validation.rel} movido para a lixeira do Companion Web.`,
      evidence: trashPath,
      approver: "agent",
    });
  }

  return { ok: true, path: validation.rel, trashPath };
}

export function readProjectLog({ projectRoot }) {
  const file = readProjectFile({ projectRoot, fileRel: "brain/log.md" });
  if (!file.ok) return file;
  const entries = [];
  const blocks = file.body.split(/^## /m).slice(1);
  for (const block of blocks) {
    const heading = block.split(/\r?\n/, 1)[0].trim();
    if (!heading) continue;
    const type = block.match(/^- type:\s*(.+)$/m)?.[1]?.trim() || "";
    const scope = block.match(/^- scope:\s*(.+)$/m)?.[1]?.trim() || "";
    const decision = block.match(/^- decision:\s*(.+)$/m)?.[1]?.trim() || "";
    const approver = block.match(/^- approver:\s*(.+)$/m)?.[1]?.trim() || "";
    const approvedAt = block.match(/^- approved_at:\s*(.+)$/m)?.[1]?.trim() || "";
    entries.push({ heading, type, scope, decision, approver, approvedAt });
  }
  return { ...file, entries };
}
