import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from './project-files';

export const REPORT_MODULES = [
  { id: 'technical-seo', title: 'Technical SEO' },
  { id: 'internal-links', title: 'Internal Links' },
  { id: 'seo-analysis', title: 'SEO Analysis' },
  { id: 'keyword-research', title: 'Keyword Research' },
  { id: 'serp-extract', title: 'SERP' },
  { id: 'backlink-analysis', title: 'Backlinks' },
  { id: 'topic-cluster', title: 'Topic Clusters' },
  { id: 'eeat', title: 'E-E-A-T' },
] as const;

export type ReportModuleId = typeof REPORT_MODULES[number]['id'];

function sha256(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function walkReportMarkdown(root: string, current = root): string[] {
  if (!existsSync(current)) return [];
  const out: string[] = [];
  for (const name of readdirSync(current).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = join(current, name);
    const lst = lstatSync(full);
    if (lst.isSymbolicLink()) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkReportMarkdown(root, full));
    if (st.isFile() && name === 'report.md') out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

function safeProjectReportRoot(projectRoot: string, moduleId: string) {
  const root = resolve(projectRoot);
  const moduleRoot = resolve(root, 'relatorios', moduleId);
  if (!moduleRoot.startsWith(`${resolve(root, 'relatorios')}${sep}`)) throw new Error('report path escaped project root');
  return moduleRoot;
}

function reportSummary(projectRoot: string, moduleId: string, childRel: string) {
  const rel = `relatorios/${moduleId}/${childRel}`;
  const filePath = resolve(projectRoot, rel);
  const moduleRoot = realpathSync(safeProjectReportRoot(projectRoot, moduleId));
  const realFile = realpathSync(filePath);
  if (!realFile.startsWith(`${moduleRoot}${sep}`)) throw new Error('report path escaped module root');
  const text = readFileSync(filePath, 'utf8');
  const { data: frontmatter, body } = parseFrontmatter(text);
  const st = statSync(filePath);
  return {
    id: sha256(rel),
    path: rel,
    title: String(frontmatter.title || basename(childRel, '.md') || rel).replace(/^["']|["']$/g, ''),
    reportType: String(frontmatter.report_type || moduleId),
    generatedAt: String(frontmatter.generated_at || frontmatter.updated || st.mtime.toISOString()).replace(/^["']|["']$/g, ''),
    status: String(frontmatter.status || 'ready').replace(/^["']|["']$/g, ''),
    score: frontmatter.score ?? null,
    sourceArtifact: String(frontmatter.source_artifact || '').replace(/^["']|["']$/g, ''),
    summary: String(frontmatter.summary || body.replace(/\s+/g, ' ').trim().slice(0, 180)).replace(/^["']|["']$/g, ''),
    hash: sha256(text),
    updatedAt: st.mtime.toISOString(),
  };
}

export function listReportModules({ projectRoot }: { projectRoot: string }) {
  const modules = REPORT_MODULES.map((module) => {
    const root = safeProjectReportRoot(projectRoot, module.id);
    const reports = walkReportMarkdown(root).map((child) => reportSummary(projectRoot, module.id, child));
    reports.sort((a, b) => String(b.generatedAt || b.updatedAt).localeCompare(String(a.generatedAt || a.updatedAt)));
    return {
      ...module,
      count: reports.length,
      latestGeneratedAt: reports[0]?.generatedAt || null,
    };
  });
  return { ok: true, modules };
}

export function listReports({
  projectRoot,
  moduleId,
  page = 1,
  pageSize = 25,
  query = '',
}: {
  projectRoot: string;
  moduleId: string;
  page?: number;
  pageSize?: number;
  query?: string;
}) {
  const module = REPORT_MODULES.find((item) => item.id === moduleId);
  if (!module) return { ok: false, reason: 'unknown-report-module' };
  const root = safeProjectReportRoot(projectRoot, module.id);
  const q = query.trim().toLowerCase();
  let reports = walkReportMarkdown(root).map((child) => reportSummary(projectRoot, module.id, child));
  if (q) {
    reports = reports.filter((report) =>
      [report.title, report.path, report.summary, report.status, report.sourceArtifact].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }
  reports.sort((a, b) => String(b.generatedAt || b.updatedAt).localeCompare(String(a.generatedAt || a.updatedAt)));
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safePageSize;
  return {
    ok: true,
    module,
    page: safePage,
    pageSize: safePageSize,
    total: reports.length,
    reports: reports.slice(start, start + safePageSize),
  };
}
