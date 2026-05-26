import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { findContentBySlug, updateContentClusterMembership } from './content-mutations';

const ORIGEMS = ['blog', 'linkedin', 'podcast', 'outros'] as const;
const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface ClusterSummary {
  slug: string;
  nome: string;
  icon: string | null;
  area: string | null;
  tese: string | null;
  status: string;
  pilar_slug: string | null;
  pilar_title: string | null;
  pilar_path: string | null;
  publicados: number;
  planejados: number;
  updated: string | null;
}

interface ContentRecord {
  slug: string;
  title: string;
  path: string;
  clusters: string[];
  keyword: string | null;
  intent: string | null;
  volume: number | null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

function parseFm(text: string): { fm: Record<string, any>; body: string } {
  const match = text.match(FM_RE);
  if (!match) return { fm: {}, body: text };
  try {
    const parsed = parseYaml(match[1]);
    return {
      fm: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : {},
      body: match[2] || '',
    };
  } catch {
    return { fm: {}, body: match[2] || '' };
  }
}

function writeMd(filePath: string, fm: Record<string, any>, body: string) {
  writeFileSync(filePath, `---\n${stringifyYaml(fm, { lineWidth: 0 }).trimEnd()}\n---\n${body.replace(/^\n*/, '\n')}`, 'utf8');
}

function appendLog(projectRoot: string, title: string, scope: string, decision: string, evidence: string) {
  const logFile = join(resolve(projectRoot), 'brain', 'log.md');
  if (!existsSync(logFile)) return;
  const lines = [
    '',
    '',
    `## ${todayIso()} - ${title}`,
    '',
    '- tipo: decisao',
    `- escopo: ${scope}`,
    `- decisao: ${decision}`,
    `- evidencia: ${evidence}`,
    '- aprovador: user',
  ];
  appendFileSync(logFile, `${lines.join('\n')}\n`, 'utf8');
}

function readClusters(projectRoot: string): Array<{ filePath: string; data: Record<string, any> }> {
  const root = resolve(projectRoot);
  const clustersRoot = join(root, 'clusters');
  if (!existsSync(clustersRoot)) return [];
  const out: Array<{ filePath: string; data: Record<string, any> }> = [];
  for (const name of readdirSync(clustersRoot)) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const filePath = join(clustersRoot, name, 'cluster.yaml');
    if (!existsSync(filePath)) continue;
    try {
      const data = parseYaml(readFileSync(filePath, 'utf8')) as Record<string, any>;
      if (data?.slug) out.push({ filePath, data });
    } catch {
      // Skip malformed clusters so the table can still load.
    }
  }
  return out.sort((a, b) => String(a.data.nome || a.data.slug).localeCompare(String(b.data.nome || b.data.slug), 'pt-BR'));
}

function scanContents(projectRoot: string): ContentRecord[] {
  const root = resolve(projectRoot);
  const out: ContentRecord[] = [];
  for (const origem of ORIGEMS) {
    const dir = join(root, 'conteudos', origem);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const filePath = join(dir, name);
      try {
        const { fm } = parseFm(readFileSync(filePath, 'utf8'));
        const keywordPrincipal = fm.keyword_principal && typeof fm.keyword_principal === 'object' && !Array.isArray(fm.keyword_principal)
          ? fm.keyword_principal as Record<string, unknown>
          : {};
        out.push({
          slug: slugify(fm.slug || basename(name, '.md')),
          title: String(fm.title || basename(name, '.md')),
          path: relative(root, filePath).split(sep).join('/'),
          clusters: Array.isArray(fm.clusters) ? fm.clusters.map(String) : [],
          keyword: String(fm.keyword || keywordPrincipal.keyword || '').trim() || null,
          intent: String(fm.intent || '').trim() || null,
          volume: typeof fm.volume === 'number' ? fm.volume : Number.isFinite(Number(fm.volume)) ? Number(fm.volume) : null,
        });
      } catch {
        // Ignore malformed content.
      }
    }
  }
  return out;
}

export function readClusterSummaries(projectRoot: string): ClusterSummary[] {
  const contents = scanContents(projectRoot);
  return readClusters(projectRoot).map(({ data }) => {
    const slug = String(data.slug);
    const pilarSlug = data.pilar?.slug ? String(data.pilar.slug) : null;
    const pilar = pilarSlug ? contents.find((content) => content.slug === pilarSlug) || null : null;
    const published = contents.filter((content) => content.clusters.includes(slug));
    const planned = Array.isArray(data.planned_satellites) ? data.planned_satellites.length : 0;
    return {
      slug,
      nome: String(data.nome || slug),
      icon: typeof data.icon === 'string' && data.icon ? data.icon : null,
      area: typeof data.area_nome === 'string' && data.area_nome ? data.area_nome : typeof data.area === 'string' ? data.area : null,
      tese: typeof data.tese === 'string' ? data.tese : typeof data.context === 'string' ? data.context : null,
      status: typeof data.status === 'string' ? data.status : 'drafting',
      pilar_slug: pilarSlug,
      pilar_title: pilar?.title || pilarSlug,
      pilar_path: pilar?.path || null,
      publicados: published.length,
      planejados: planned,
      updated: data.stats?.updated ? String(data.stats.updated) : null,
    };
  });
}

function uniqueContentPath(projectRoot: string, origem: string, slug: string) {
  const root = resolve(projectRoot);
  let candidate = join(root, 'conteudos', origem, `${slug}.md`);
  let index = 2;
  while (existsSync(candidate)) {
    candidate = join(root, 'conteudos', origem, `${slug}-${index}.md`);
    index++;
  }
  return candidate;
}

function createContentPilar(projectRoot: string, clusterSlug: string, title: string, origem = 'blog'): ContentRecord {
  const safeOrigem = ORIGEMS.includes(origem as any) ? origem : 'blog';
  const slug = slugify(title);
  const filePath = uniqueContentPath(projectRoot, safeOrigem, slug);
  mkdirSync(dirname(filePath), { recursive: true });
  const finalSlug = basename(filePath, '.md');
  const fm = {
    contract_version: 1,
    title,
    slug: finalSlug,
    published_at: '',
    source_url: '',
    origem: safeOrigem,
    keyword: title,
    intent: 'informational',
    clusters: [clusterSlug],
    papel: { [clusterSlug]: 'pilar' },
  };
  writeMd(filePath, fm, '\n');
  return {
    slug: finalSlug,
    title,
    path: relative(resolve(projectRoot), filePath).split(sep).join('/'),
    clusters: [clusterSlug],
    keyword: title,
    intent: 'informational',
    volume: null,
  };
}

function ensureUniquePilar(projectRoot: string, clusterSlug: string, pilarSlug: string) {
  const owner = readClusters(projectRoot).find(({ data }) => data.slug !== clusterSlug && data.pilar?.slug === pilarSlug);
  return owner ? String(owner.data.slug) : null;
}

export function createCluster(projectRoot: string, input: Record<string, unknown>) {
  const nome = String(input.nome || input.title || '').trim();
  const slug = slugify(input.slug || nome);
  if (!nome || !slug) return { ok: false as const, reason: 'invalid-name' };
  const root = resolve(projectRoot);
  const yamlPath = join(root, 'clusters', slug, 'cluster.yaml');
  if (existsSync(yamlPath)) return { ok: false as const, reason: 'cluster-exists' };

  let pilar: ContentRecord | null = null;
  const existingPilar = slugify(input.pilar_slug);
  if (existingPilar) {
    const located = findContentBySlug(projectRoot, existingPilar);
    if (!located) return { ok: false as const, reason: 'pilar-not-found' };
    const membership = updateContentClusterMembership(projectRoot, existingPilar, slug, 'pilar');
    if (!membership.ok) return membership;
    const contents = scanContents(projectRoot);
    pilar = contents.find((content) => content.slug === existingPilar) || null;
  } else {
    const title = String(input.pilar_title || nome).trim();
    pilar = createContentPilar(projectRoot, slug, title || nome, String(input.origem || 'blog'));
  }
  if (!pilar) return { ok: false as const, reason: 'pilar-not-found' };

  const data = {
    contract_version: 1,
    slug,
    nome,
    icon: String(input.icon || '').trim() || null,
    area: String(input.area || '').trim() || null,
    status: 'active',
    tese: String(input.tese || '').trim() || `Cluster ${nome}.`,
    pilar: {
      slug: pilar.slug,
      keyword: pilar.keyword || pilar.title,
      intent: pilar.intent || 'informational',
      volume: pilar.volume,
      volume_source: null,
    },
    planned_satellites: [],
    satelite_overrides: {},
    stats: { publicados: 1, planejados: 0, updated: todayIso() },
    provenance: { created_at: todayIso(), created_by: 'companion' },
    evidence: [],
  };
  mkdirSync(dirname(yamlPath), { recursive: true });
  writeFileSync(yamlPath, stringifyYaml(data, { lineWidth: 0 }), 'utf8');
  appendLog(projectRoot, `Cluster ${nome} criado no Companion`, `clusters/${slug}/cluster.yaml`, `Cluster ativo "${nome}" criado com pilar "${pilar.slug}".`, `clusters/${slug}/cluster.yaml, ${pilar.path}`);
  return { ok: true as const, cluster: data, affected: [`clusters/${slug}/cluster.yaml`, pilar.path] };
}

export function updateCluster(projectRoot: string, slug: string, updates: Record<string, unknown>) {
  const entry = readClusters(projectRoot).find(({ data }) => data.slug === slug);
  if (!entry) return { ok: false as const, reason: 'cluster-not-found' };
  const next = { ...entry.data };
  for (const field of ['nome', 'icon', 'area', 'tese', 'status'] as const) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      const value = String(updates[field] ?? '').trim();
      if (field === 'status') next.status = value || next.status || 'drafting';
      else if (value) next[field] = value;
      else delete next[field];
    }
  }
  if (updates.pilar_slug !== undefined) {
    const pilarSlug = slugify(updates.pilar_slug);
    if (!pilarSlug) return { ok: false as const, reason: 'invalid-pilar' };
    const conflict = ensureUniquePilar(projectRoot, slug, pilarSlug);
    if (conflict) return { ok: false as const, reason: `unique-pilar-violation:${conflict}` };
    const oldPilarSlug =
      next.pilar && typeof next.pilar === 'object' && typeof next.pilar.slug === 'string'
        ? next.pilar.slug
        : '';
    const membership = updateContentClusterMembership(projectRoot, pilarSlug, slug, 'pilar');
    if (!membership.ok) return membership;
    const affected = [`clusters/${slug}/cluster.yaml`, membership.path];
    if (oldPilarSlug && oldPilarSlug !== pilarSlug) {
      const demotion = updateContentClusterMembership(projectRoot, oldPilarSlug, slug, 'satelite');
      if (demotion.ok) affected.push(demotion.path);
    }
    next.pilar = {
      ...(next.pilar || {}),
      slug: pilarSlug,
    };
    next.contract_version = 1;
    next.stats = { ...(next.stats || {}), updated: todayIso() };
    writeFileSync(entry.filePath, stringifyYaml(next, { lineWidth: 0 }), 'utf8');
    appendLog(projectRoot, `Cluster ${slug} atualizado no Companion`, `clusters/${slug}/cluster.yaml`, `Pilar do cluster "${slug}" atualizado para "${pilarSlug}" no Companion Web.`, affected.join(', '));
    return { ok: true as const, cluster: next, affected };
  }
  next.contract_version = 1;
  next.stats = { ...(next.stats || {}), updated: todayIso() };
  writeFileSync(entry.filePath, stringifyYaml(next, { lineWidth: 0 }), 'utf8');
  appendLog(projectRoot, `Cluster ${slug} atualizado no Companion`, `clusters/${slug}/cluster.yaml`, `Metadados do cluster "${slug}" atualizados no Companion Web.`, `clusters/${slug}/cluster.yaml`);
  return { ok: true as const, cluster: next, affected: [`clusters/${slug}/cluster.yaml`] };
}
