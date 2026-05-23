import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from './project-files';

const CONTENT_ORIGINS = ['blog', 'linkedin', 'podcast', 'outros'] as const;
const NONE_CLUSTER = '__none__';

interface TopicCluster {
  id: string;
  title: string;
  path: string;
  aliases: Set<string>;
  pageSlugs: Set<string>;
}

function sha256(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function clean(value: unknown) {
  return String(value ?? '').replace(/^["']|["']$/g, '').trim();
}

function slugify(value: unknown) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function walkMarkdown(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkMarkdown(root, full));
    if (st.isFile() && name.endsWith('.md')) out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function titleFromPath(path: string) {
  return basename(path, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readTopicClusters(projectRoot: string): TopicCluster[] {
  const root = resolve(projectRoot);
  const clustersRoot = resolve(root, 'clusters');
  if (!existsSync(clustersRoot)) return [];
  const realRoot = realpathSync(root);
  const out: TopicCluster[] = [];
  for (const child of walkClusterJson(clustersRoot)) {
    const filePath = resolve(clustersRoot, child);
    const realFile = realpathSync(filePath);
    if (!realFile.startsWith(`${realRoot}${sep}`)) continue;
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      const id = slugify(data.seed_slug || data.pillar?.slug || basename(resolve(filePath, '..'))) || slugify(basename(resolve(filePath, '..')));
      if (!id) continue;
      const title = clean(data.pillar?.title || data.seed || id) || id;
      const aliases = new Set([id, slugify(title), slugify(data.seed), slugify(data.pillar?.slug), slugify(data.seed_slug)].filter(Boolean));
      const pageSlugs = new Set<string>();
      for (const value of [data.pillar?.slug, data.pillar?.title, data.seed]) {
        const slug = slugify(value);
        if (slug) pageSlugs.add(slug);
      }
      for (const page of Array.isArray(data.supporting_pages) ? data.supporting_pages : []) {
        for (const value of [page?.slug, page?.title, page?.keyword_principal?.keyword]) {
          const slug = slugify(value);
          if (slug) pageSlugs.add(slug);
        }
      }
      out.push({
        id,
        title,
        path: relative(root, filePath).split(sep).join('/'),
        aliases,
        pageSlugs,
      });
    } catch {
      // Ignore malformed cluster drafts; the content index should remain usable.
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

function walkClusterJson(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkClusterJson(root, full));
    if (st.isFile() && name === 'cluster.json') out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function inferCluster(frontmatter: Record<string, any>, contentSlug: string, clusters: TopicCluster[]) {
  const explicit = slugify(frontmatter.topic_cluster || frontmatter.topicCluster || frontmatter.cluster);
  const area = slugify(frontmatter.area);
  const slug = slugify(frontmatter.slug || contentSlug);
  if (explicit) {
    return clusters.find((cluster) => cluster.id === explicit || cluster.aliases.has(explicit)) || {
      id: explicit,
      title: clean(frontmatter.topic_cluster || frontmatter.topicCluster || frontmatter.cluster) || explicit,
      path: null,
    };
  }
  return clusters.find((cluster) => cluster.aliases.has(area) || cluster.pageSlugs.has(slug)) || null;
}

export function listProjectContents({
  projectRoot,
  page = 1,
  pageSize = 25,
  query = '',
  origin = '',
  topicCluster = '',
}: {
  projectRoot: string;
  page?: number;
  pageSize?: number;
  query?: string;
  origin?: string;
  topicCluster?: string;
}) {
  const root = resolve(projectRoot);
  const clusters = readTopicClusters(root);
  const rows: any[] = [];
  for (const contentOrigin of CONTENT_ORIGINS) {
    const dir = resolve(root, 'conteudos', contentOrigin);
    if (!existsSync(dir)) continue;
    const realDir = realpathSync(dir);
    if (!realDir.startsWith(`${realpathSync(root)}${sep}`)) continue;
    for (const child of walkMarkdown(dir)) {
      const path = `conteudos/${contentOrigin}/${child}`;
      const filePath = resolve(root, path);
      const realFile = realpathSync(filePath);
      if (!realFile.startsWith(`${realDir}${sep}`)) continue;
      const text = readFileSync(filePath, 'utf8');
      const { data: frontmatter, body } = parseFrontmatter(text);
      const contentSlug = clean(frontmatter.slug) || basename(child, '.md');
      const cluster = inferCluster(frontmatter, contentSlug, clusters);
      rows.push({
        id: sha256(path),
        path,
        title: clean(frontmatter.title) || titleFromPath(path),
        slug: contentSlug,
        origin: clean(frontmatter.origem || frontmatter.origin) || contentOrigin,
        area: clean(frontmatter.area),
        topic_cluster: cluster?.id || null,
        topicClusterTitle: cluster?.title || null,
        topicClusterPath: cluster?.path || null,
        published_at: clean(frontmatter.published_at),
        updated: clean(frontmatter.updated || frontmatter.updated_at),
        status: clean(frontmatter.status) || (clean(frontmatter.published_at) ? 'published' : 'draft'),
        excerpt: body.replace(/\s+/g, ' ').trim().slice(0, 180),
        hash: sha256(text),
      });
    }
  }

  const q = query.trim().toLowerCase();
  const requestedOrigin = origin.trim();
  const requestedCluster = topicCluster.trim();
  let filtered = rows;
  if (requestedOrigin) filtered = filtered.filter((row) => row.origin === requestedOrigin);
  if (requestedCluster) {
    filtered = filtered.filter((row) =>
      requestedCluster === NONE_CLUSTER ? !row.topic_cluster : row.topic_cluster === requestedCluster
    );
  }
  if (q) {
    filtered = filtered.filter((row) =>
      [row.title, row.path, row.origin, row.area, row.topicClusterTitle, row.status, row.excerpt].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }
  filtered.sort((a, b) => String(b.updated || b.published_at || b.path).localeCompare(String(a.updated || a.published_at || a.path)));

  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safePageSize;
  const assignedCounts = new Map<string, number>();
  for (const row of rows) {
    assignedCounts.set(row.topic_cluster || NONE_CLUSTER, (assignedCounts.get(row.topic_cluster || NONE_CLUSTER) || 0) + 1);
  }
  const clusterOptions = [
    ...clusters.map((cluster) => ({ id: cluster.id, title: cluster.title, count: assignedCounts.get(cluster.id) || 0 })),
    ...(assignedCounts.get(NONE_CLUSTER) ? [{ id: NONE_CLUSTER, title: 'Sem cluster', count: assignedCounts.get(NONE_CLUSTER) || 0 }] : []),
  ];

  return {
    ok: true,
    page: safePage,
    pageSize: safePageSize,
    total: filtered.length,
    origins: CONTENT_ORIGINS.map((id) => ({ id, count: rows.filter((row) => row.origin === id).length })),
    topicClusters: clusterOptions,
    items: filtered.slice(start, start + safePageSize),
  };
}
