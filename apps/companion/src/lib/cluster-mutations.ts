import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml, stringify as yamlStringify } from 'yaml';
import { loadBrainSubpageTemplate } from './brain-templates';

const PLUGIN_ROOT =
  process.env.AGENTIC_SEO_PLUGIN_ROOT ||
  process.env.SEO_BRAIN_PLUGIN_ROOT ||
  join(/*turbopackIgnore: true*/ process.cwd(), '..', '..');

interface AddPlannedInput {
  slug: string;
  keyword: string;
  intent?: string;
  papel?: 'satelite' | 'pilar';
  acao?: string;
  note?: string;
  display_title?: string;
  volume?: number;
}

function shortenTitle(title: string): string {
  if (!title) return title;
  if (title.length <= 40) return title;
  const cut = title.search(/[:—–-]\s/);
  if (cut > 0 && cut < 50) return title.slice(0, cut).trim();
  return title;
}

function renderKeyword(keyword: string | null | undefined, volume: number | null | undefined): string {
  if (!keyword) return '—';
  if (typeof volume === 'number' && volume > 0) return `${keyword} (${volume})`;
  return keyword;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function clusterYamlPath(projectRoot: string, clusterSlug: string) {
  return join(resolve(projectRoot), 'clusters', clusterSlug, 'cluster.yaml');
}

function brainSubpagePath(projectRoot: string, clusterSlug: string) {
  return join(resolve(projectRoot), 'brain', 'topic-clusters', `${clusterSlug}.md`);
}

function readContentTitle(projectRoot: string, contentSlug: string) {
  const file = join(resolve(projectRoot), 'conteudos', 'blog', `${contentSlug}.md`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^title:\s*"?([^"\n]+)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
}

function readContentPublishedAt(projectRoot: string, contentSlug: string) {
  const file = join(resolve(projectRoot), 'conteudos', 'blog', `${contentSlug}.md`);
  if (!existsSync(file)) return '';
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^published_at:\s*"?([^"\n]*)"?/m);
  return match ? match[1].trim().replace(/^"|"$/g, '') : '';
}

function buildContentsTableLines(clusterYaml: any, projectRoot: string): string[] {
  const tableLines = [
    '| Papel | Conteúdo | Keyword | Intent | Status | Ação | Atualizado |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  const rows: Array<{ papel: string; conteudo: string; keyword: string; intent: string; status: string; acao: string; atualizado: string }> = [];
  if (clusterYaml.pilar?.slug) {
    const title = readContentTitle(projectRoot, clusterYaml.pilar.slug);
    const updated = readContentPublishedAt(projectRoot, clusterYaml.pilar.slug);
    const visible = clusterYaml.pilar.display_title || (title ? shortenTitle(title) : null);
    rows.push({
      papel: 'Pilar',
      conteudo: visible
        ? `[${visible}](../../conteudos/blog/${clusterYaml.pilar.slug}.md)`
        : `_${clusterYaml.pilar.slug}_`,
      keyword: renderKeyword(clusterYaml.pilar.keyword, clusterYaml.pilar.volume),
      intent: clusterYaml.pilar.intent || '—',
      status: title ? 'publicado' : 'planejado',
      acao: title ? 'manter' : 'criar',
      atualizado: updated || '—',
    });
  }
  for (const sat of clusterYaml.satelites || []) {
    if (sat?.status !== 'published') continue;
    const title = readContentTitle(projectRoot, sat.slug);
    if (!title) continue;
    const visible = sat.display_title || shortenTitle(title);
    rows.push({
      papel: sat.papel === 'pilar' ? 'Pilar' : 'Satélite',
      conteudo: `[${visible}](../../conteudos/blog/${sat.slug}.md)`,
      keyword: renderKeyword(sat.keyword, sat.volume),
      intent: sat.intent || '—',
      status: 'publicado',
      acao: sat.acao || 'manter',
      atualizado: readContentPublishedAt(projectRoot, sat.slug) || '—',
    });
  }
  for (const sat of clusterYaml.satelites || []) {
    if (sat?.status === 'published') continue;
    rows.push({
      papel: sat.papel === 'pilar' ? 'Pilar' : 'Satélite',
      conteudo: `_${sat.slug}_`,
      keyword: renderKeyword(sat.keyword, sat.volume),
      intent: sat.intent || '—',
      status: sat.status || 'planejado',
      acao: sat.acao || 'criar',
      atualizado: '—',
    });
  }
  for (const row of rows) {
    tableLines.push(
      `| ${row.papel} | ${row.conteudo} | ${row.keyword} | ${row.intent} | ${row.status} | ${row.acao} | ${row.atualizado} |`,
    );
  }
  if (rows.length === 0) tableLines.push('| — | — | — | — | — | — | — |');
  return tableLines;
}

function pilarLine(projectRoot: string, clusterYaml: any): string {
  if (clusterYaml.pilar?.slug) {
    const title = readContentTitle(projectRoot, clusterYaml.pilar.slug);
    const visible = clusterYaml.pilar.display_title || (title ? shortenTitle(title) : null);
    if (visible) return `[${visible}](../../conteudos/blog/${clusterYaml.pilar.slug}.md)`;
    return `_${clusterYaml.pilar.slug}_ — pilar planejado, conteúdo a criar.`;
  }
  return '_pilar a definir_';
}

function nextActionsBlock(clusterYaml: any): string {
  const planned = (clusterYaml.satelites || []).filter((s: any) => s.status === 'planned');
  if (planned.length === 0) return '- Cluster com cobertura completa do escopo declarado neste momento.';
  return planned
    .map((sat: any) => {
      const verbo = sat.acao === 'revisar' ? 'Revisar' : 'Criar';
      return `- ${verbo} \`${sat.slug}\`${sat.note ? ` — ${sat.note}` : ''}.`;
    })
    .join('\n');
}

function buildClusterSubpageMarkdown(projectRoot: string, clusterYaml: any): string {
  const icon = clusterYaml.icon || '';
  const heading = icon ? `${icon} ${clusterYaml.nome}` : clusterYaml.nome;
  const contentsTable = buildContentsTableLines(clusterYaml, projectRoot).join('\n');
  const rendered = loadBrainSubpageTemplate(PLUGIN_ROOT, 'topic-clusters', {
    title: clusterYaml.nome,
    updated: new Date().toISOString().slice(0, 10),
    parent_slug: 'topic-clusters',
    parent_label: 'Topic Clusters',
    heading,
    resumo: clusterYaml.context || '',
    area: clusterYaml.area || '',
    pilar_line: pilarLine(projectRoot, clusterYaml),
    contents_table: contentsTable,
    next_actions: nextActionsBlock(clusterYaml),
    provenance: clusterYaml.provenance?.origem || clusterYaml.provenance?.source || 'reset-clusters',
  });
  if (!rendered) {
    throw new Error('Missing topic-clusters subpage template at templates/project/brain/topic-clusters/_subpage-template.md');
  }
  return rendered;
}

function regenerateSubpage(projectRoot: string, clusterYaml: any) {
  const file = brainSubpagePath(projectRoot, clusterYaml.slug);
  const tableLines = buildContentsTableLines(clusterYaml, projectRoot);
  const contentsBlock = ['## Conteúdos', '', ...tableLines, ''].join('\n');
  if (!existsSync(file)) {
    writeFileSync(file, buildClusterSubpageMarkdown(projectRoot, clusterYaml), 'utf8');
    return;
  }
  const current = readFileSync(file, 'utf8');
  const sectionRegex = /^## Conteúdos[\s\S]*?(?=^## |\Z)/m;
  if (sectionRegex.test(current)) {
    writeFileSync(file, current.replace(sectionRegex, `${contentsBlock}\n`), 'utf8');
    return;
  }
  const pilarRegex = /^(## Pilar[\s\S]*?)(?=^## )/m;
  if (pilarRegex.test(current)) {
    writeFileSync(file, current.replace(pilarRegex, (block) => `${block}${contentsBlock}\n\n`), 'utf8');
    return;
  }
  writeFileSync(file, current.replace(/\s*$/, '\n\n') + contentsBlock + '\n', 'utf8');
}

export function addPlannedSatellite(projectRoot: string, clusterSlug: string, input: AddPlannedInput) {
  const yamlPath = clusterYamlPath(projectRoot, clusterSlug);
  if (!existsSync(yamlPath)) return { ok: false as const, reason: 'cluster-not-found' };
  const slug = slugify(input.slug);
  const keyword = (input.keyword || '').trim();
  if (!slug) return { ok: false as const, reason: 'invalid-slug' };
  if (!keyword) return { ok: false as const, reason: 'invalid-keyword' };
  const data = parseYaml(readFileSync(yamlPath, 'utf8')) || {};
  data.satelites = Array.isArray(data.satelites) ? data.satelites : [];
  if (data.satelites.some((s: any) => s?.slug === slug)) {
    return { ok: false as const, reason: 'slug-already-exists' };
  }
  data.satelites.push({
    slug,
    papel: input.papel === 'pilar' ? 'pilar' : 'satelite',
    status: 'planned',
    acao: input.acao || 'criar',
    intent: input.intent || 'informational',
    keyword,
    volume: typeof input.volume === 'number' && input.volume > 0 ? input.volume : null,
    volume_source: null,
    note: input.note || null,
    ...(input.display_title ? { display_title: input.display_title } : {}),
  });
  data.stats = data.stats || {};
  data.stats.total_keywords = (data.stats.total_keywords || 1) + 1;
  data.stats.planejados = (data.stats.planejados || 0) + 1;
  writeFileSync(yamlPath, yamlStringify(data, { lineWidth: 0 }), 'utf8');
  regenerateSubpage(projectRoot, data);
  return { ok: true as const, slug };
}

export function listClusterSlugs(projectRoot: string): string[] {
  const dir = join(resolve(projectRoot), 'clusters');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => {
    if (name.startsWith('.') || name.startsWith('_')) return false;
    return existsSync(join(dir, name, 'cluster.yaml'));
  });
}
