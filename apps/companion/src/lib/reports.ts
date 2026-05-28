import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from './project-files';
import {
  REPORT_DIR_NAME,
  REPORT_MODULES as SHARED_REPORT_MODULES,
  reportModuleLabel,
} from '../../../../shared/report-modules';
import companionRoutes from '../../../../shared/companion-routes.js';

export { REPORT_DIR_NAME };

export const REPORT_MODULES = SHARED_REPORT_MODULES.map((module) => ({
  id: module.id,
  title: reportModuleLabel(module.id, 'en'),
}));
const { companionTargetForPath } = companionRoutes;

export type ReportModuleId = (typeof REPORT_MODULES)[number]['id'];

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

function safeProjectReportsRoot(projectRoot: string) {
  return resolve(resolve(projectRoot), REPORT_DIR_NAME);
}

function safeProjectReportRoot(projectRoot: string, moduleId: string) {
  const root = resolve(projectRoot);
  const moduleRoot = resolve(root, REPORT_DIR_NAME, moduleId);
  if (!moduleRoot.startsWith(`${resolve(root, REPORT_DIR_NAME)}${sep}`)) throw new Error('report path escaped project root');
  return moduleRoot;
}

function hasCurrentReportContract(moduleId: string, frontmatter: Record<string, any>, body: string) {
  const required = ['title', 'slug', 'report_type', 'generated_at', 'status', 'source_artifact', 'summary'];
  if (!required.every((key) => String(frontmatter[key] || '').trim())) return false;
  if (String(frontmatter.report_type || '').replace(/^["']|["']$/g, '') !== moduleId) return false;
  if (!/```agentic-(kpis|chart|table)\s*\n/.test(body)) return false;
  if (/```agentic-(?:kpis|chart|table)\s*\n\s*\{/.test(body)) return false;
  if (/\[object Object\]|round\(sum\(points_awarded\)|report\.html/i.test(body)) return false;
  return true;
}

function reportSummary(projectRoot: string, moduleId: string, childRel: string) {
  const rel = `${REPORT_DIR_NAME}/${moduleId}/${childRel}`;
  const filePath = resolve(projectRoot, rel);
  const moduleRoot = realpathSync(safeProjectReportRoot(projectRoot, moduleId));
  const realFile = realpathSync(filePath);
  if (!realFile.startsWith(`${moduleRoot}${sep}`)) throw new Error('report path escaped module root');
  const text = readFileSync(filePath, 'utf8');
  const { data: frontmatter, body } = parseFrontmatter(text);
  const contractOk = hasCurrentReportContract(moduleId, frontmatter, body);
  const st = statSync(filePath);
  const reportModule = REPORT_MODULES.find((item) => item.id === moduleId);
  return {
    id: sha256(rel),
    path: rel,
    ...companionTargetForPath(rel),
    moduleId,
    moduleTitle: reportModule?.title || moduleId,
    title: String(frontmatter.title || basename(childRel, '.md') || rel).replace(/^["']|["']$/g, ''),
    reportType: String(frontmatter.report_type || moduleId),
    generatedAt: String(frontmatter.generated_at || frontmatter.updated || st.mtime.toISOString()).replace(/^["']|["']$/g, ''),
    status: String(frontmatter.status || 'ready').replace(/^["']|["']$/g, ''),
    score: frontmatter.score ?? null,
    sourceArtifact: String(frontmatter.source_artifact || '').replace(/^["']|["']$/g, ''),
    summary: String(frontmatter.summary || body.replace(/\s+/g, ' ').trim().slice(0, 180)).replace(/^["']|["']$/g, ''),
    contractOk,
    hash: sha256(text),
    updatedAt: st.mtime.toISOString(),
  };
}

export function listReportModules({ projectRoot }: { projectRoot: string }) {
  const modules = REPORT_MODULES.map((reportModule) => {
    const root = safeProjectReportRoot(projectRoot, reportModule.id);
    const reports = walkReportMarkdown(root).map((child) => reportSummary(projectRoot, reportModule.id, child));
    reports.sort((a, b) => String(b.generatedAt || b.updatedAt).localeCompare(String(a.generatedAt || a.updatedAt)));
    return {
      ...reportModule,
      count: reports.length,
      latestGeneratedAt: reports[0]?.generatedAt || null,
    };
  });
  return { ok: true, modules };
}

export function listReports({
  projectRoot,
  moduleId,
  status = '',
  page = 1,
  pageSize = 25,
  query = '',
}: {
  projectRoot: string;
  moduleId: string;
  status?: string;
  page?: number;
  pageSize?: number;
  query?: string;
}) {
  const selectedModules =
    moduleId === 'all'
      ? REPORT_MODULES
      : moduleId
          .split(',')
          .map((id) => REPORT_MODULES.find((item) => item.id === id.trim()))
          .filter((item): item is (typeof REPORT_MODULES)[number] => Boolean(item));
  if (!selectedModules.length) return { ok: false, reason: 'unknown-report-module' };
  const q = query.trim().toLowerCase();
  const reportsRoot = safeProjectReportsRoot(projectRoot);
  let reports = selectedModules.flatMap((module) => {
    const root = safeProjectReportRoot(projectRoot, module.id);
    if (!existsSync(reportsRoot) || !existsSync(root)) return [];
    return walkReportMarkdown(root).map((child) => reportSummary(projectRoot, module.id, child));
  });
  if (q) {
    reports = reports.filter((report) =>
      [report.title, report.path, report.summary, report.status, report.sourceArtifact, report.moduleTitle].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }
  const requestedStatus = status.trim();
  if (requestedStatus) reports = reports.filter((report) => report.status === requestedStatus);
  reports.sort((a, b) => String(b.generatedAt || b.updatedAt).localeCompare(String(a.generatedAt || a.updatedAt)));
  const allReports = REPORT_MODULES.flatMap((module) => {
    const root = safeProjectReportRoot(projectRoot, module.id);
    if (!existsSync(root)) return [];
    return walkReportMarkdown(root).map((child) => reportSummary(projectRoot, module.id, child));
  });
  const moduleCounts = REPORT_MODULES.map((module) => ({
    id: module.id,
    title: module.title,
    count: allReports.filter((report) => report.moduleId === module.id).length,
  }));
  const statuses = Array.from(new Set(allReports.map((report) => report.status || 'ready')))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((id) => ({ id, count: allReports.filter((report) => (report.status || 'ready') === id).length }));
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safePageSize;
  return {
    ok: true,
    module: moduleId === 'all' ? { id: 'all', title: 'Análises' } : selectedModules[0],
    modules: moduleCounts,
    statuses,
    page: safePage,
    pageSize: safePageSize,
    total: reports.length,
    reports: reports.slice(start, start + safePageSize),
  };
}
