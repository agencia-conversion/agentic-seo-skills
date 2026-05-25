import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as yamlParse } from 'yaml';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

interface ClusterYaml {
  slug?: string;
  nome?: string;
  icon?: string;
  area?: string;
  status?: string;
  tese?: string;
  pilar?: { slug?: string; keyword?: string; intent?: string; volume?: number | null };
  planned_satellites?: Array<{
    slug?: string;
    keyword?: string;
    intent?: string;
    volume?: number | null;
    papel?: string;
    note?: string | null;
  }>;
  satelite_overrides?: Record<string, {
    display_title?: string;
    keyword?: string;
    intent?: string;
    volume?: number | null;
  }>;
}

interface ContentRecord {
  slug: string;
  origem: string;
  title: string;
  published_at: string;
  clusters: string[];
  papel: Record<string, string>;
}

interface RowOut {
  slug: string;
  papel: 'pilar' | 'satelite';
  papel_label: string;
  conteudo: { kind: 'published'; title: string; href: string; origem: string } | { kind: 'planned'; slug: string };
  keyword: string;
  intent: string;
  status: 'publicado' | 'planejado';
  acao: string;
  updated: string;
  tambem_em: string[];
}

function readClusterYaml(root: string, slug: string): ClusterYaml | null {
  const filePath = join(root, 'clusters', slug, 'cluster.yaml');
  if (!existsSync(filePath)) return null;
  try {
    return yamlParse(readFileSync(filePath, 'utf8')) as ClusterYaml;
  } catch {
    return null;
  }
}

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const ORIGEMS = ['blog', 'linkedin', 'podcast', 'outros'];

function parseContentFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(FM_RE);
  if (!m) return {};
  try {
    return (yamlParse(m[1]) as Record<string, unknown>) || {};
  } catch {
    return {};
  }
}

function scanContents(root: string): ContentRecord[] {
  const out: ContentRecord[] = [];
  for (const origem of ORIGEMS) {
    const dir = join(root, 'conteudos', origem);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const filePath = join(dir, name);
      try {
        statSync(filePath);
      } catch {
        continue;
      }
      const fm = parseContentFrontmatter(readFileSync(filePath, 'utf8'));
      const slug = String(fm.slug || name.replace(/\.md$/, ''));
      const clusters = Array.isArray(fm.clusters) ? (fm.clusters as unknown[]).map(String) : [];
      const papel = fm.papel && typeof fm.papel === 'object' && !Array.isArray(fm.papel)
        ? Object.fromEntries(Object.entries(fm.papel as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
        : {};
      out.push({
        slug,
        origem,
        title: String(fm.title || slug),
        published_at: String(fm.published_at || ''),
        clusters,
        papel,
      });
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function renderKeyword(keyword: string | undefined | null, volume: number | undefined | null): string {
  if (!keyword) return '—';
  if (typeof volume === 'number' && volume > 0) {
    const display = volume >= 1000 ? `${Math.round(volume / 100) / 10}k` : `${volume}`;
    return `${keyword} (${display})`;
  }
  return keyword;
}

function buildRows(yaml: ClusterYaml, contents: ContentRecord[], slug: string): RowOut[] {
  const overrides = yaml.satelite_overrides || {};
  const myContents = contents.filter((c) => c.clusters.includes(slug));
  const pilarSlug = yaml.pilar?.slug;
  const rows: RowOut[] = [];

  const pilarContent = pilarSlug ? myContents.find((c) => c.slug === pilarSlug) : undefined;
  if (pilarContent) {
    const ov = overrides[pilarContent.slug] || {};
    rows.push({
      slug: pilarContent.slug,
      papel: 'pilar',
      papel_label: 'Pilar',
      conteudo: { kind: 'published', title: ov.display_title || pilarContent.title, href: `conteudos/${pilarContent.origem}/${pilarContent.slug}.md`, origem: pilarContent.origem },
      keyword: renderKeyword(ov.keyword || yaml.pilar?.keyword, ov.volume ?? yaml.pilar?.volume),
      intent: String(ov.intent || yaml.pilar?.intent || '—'),
      status: 'publicado',
      acao: '—',
      updated: pilarContent.published_at || '—',
      tambem_em: pilarContent.clusters.filter((c) => c !== slug),
    });
  } else if (yaml.pilar?.slug && yaml.status === 'active') {
    rows.push({
      slug: yaml.pilar.slug,
      papel: 'pilar',
      papel_label: 'Pilar',
      conteudo: { kind: 'planned', slug: yaml.pilar.slug },
      keyword: renderKeyword(yaml.pilar.keyword, yaml.pilar.volume),
      intent: String(yaml.pilar.intent || '—'),
      status: 'planejado',
      acao: 'Briefing',
      updated: '—',
      tambem_em: [],
    });
  }

  for (const content of myContents) {
    if (pilarContent && content.slug === pilarContent.slug) continue;
    const ov = overrides[content.slug] || {};
    rows.push({
      slug: content.slug,
      papel: 'satelite',
      papel_label: 'Satélite',
      conteudo: { kind: 'published', title: ov.display_title || content.title, href: `conteudos/${content.origem}/${content.slug}.md`, origem: content.origem },
      keyword: renderKeyword(ov.keyword, ov.volume),
      intent: String(ov.intent || '—'),
      status: 'publicado',
      acao: '—',
      updated: content.published_at || '—',
      tambem_em: content.clusters.filter((c) => c !== slug),
    });
  }

  for (const planned of yaml.planned_satellites || []) {
    if (!planned.slug) continue;
    rows.push({
      slug: planned.slug,
      papel: planned.papel === 'pilar' ? 'pilar' : 'satelite',
      papel_label: planned.papel === 'pilar' ? 'Pilar' : 'Satélite',
      conteudo: { kind: 'planned', slug: planned.slug },
      keyword: renderKeyword(planned.keyword, planned.volume),
      intent: String(planned.intent || '—'),
      status: 'planejado',
      acao: 'Briefing',
      updated: '—',
      tambem_em: [],
    });
  }

  return rows;
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  const { slug } = await context.params;
  const root = resolve(process.cwd(), projectRoot());
  const yaml = readClusterYaml(root, slug);
  if (!yaml) {
    return NextResponse.json({ ok: false, reason: 'cluster-not-found' }, { status: 404 });
  }
  const contents = scanContents(root);
  const rows = buildRows(yaml, contents, slug);
  return NextResponse.json({
    ok: true,
    cluster: {
      slug,
      nome: yaml.nome || slug,
      icon: yaml.icon || null,
      area: yaml.area || null,
      status: yaml.status || null,
      tese: yaml.tese || null,
      pilar_slug: yaml.pilar?.slug || null,
    },
    rows,
  });
}
