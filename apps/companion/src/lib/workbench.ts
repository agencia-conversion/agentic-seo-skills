import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from './project-files';

function sha256(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function clean(value: unknown) {
  return String(value ?? '').replace(/^["']|["']$/g, '').trim();
}

function titleFromPath(path: string) {
  return basename(path, '.md')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

export function listProjectWorkbench({
  projectRoot,
  page = 1,
  pageSize = 25,
  query = '',
}: {
  projectRoot: string;
  page?: number;
  pageSize?: number;
  query?: string;
}) {
  const root = resolve(projectRoot);
  const workbenchRoot = resolve(root, 'workbench');
  const items: any[] = [];
  if (existsSync(workbenchRoot)) {
    const realRoot = realpathSync(root);
    const realWorkbench = realpathSync(workbenchRoot);
    if (!realWorkbench.startsWith(`${realRoot}${sep}`)) throw new Error('workbench path escaped project root');
    for (const child of walkMarkdown(workbenchRoot)) {
      const path = `workbench/${child}`;
      const filePath = resolve(root, path);
      const realFile = realpathSync(filePath);
      if (!realFile.startsWith(`${realWorkbench}${sep}`)) continue;
      const text = readFileSync(filePath, 'utf8');
      const { data: frontmatter, body } = parseFrontmatter(text);
      const st = statSync(filePath);
      const folder = dirname(child) === '.' ? 'workbench' : dirname(child).split(sep).join('/');
      items.push({
        id: sha256(path),
        path,
        title: clean(frontmatter.title) || titleFromPath(path),
        folder,
        updated: clean(frontmatter.updated || frontmatter.updated_at) || st.mtime.toISOString(),
        frontmatter: Object.keys(frontmatter || {}).length,
        excerpt: body.replace(/\s+/g, ' ').trim().slice(0, 180),
        hash: sha256(text),
      });
    }
  }

  const q = query.trim().toLowerCase();
  let filtered = items;
  if (q) {
    filtered = filtered.filter((item) =>
      [item.title, item.path, item.folder, item.excerpt].some((value) => String(value || '').toLowerCase().includes(q))
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
