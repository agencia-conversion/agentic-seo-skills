import { create } from 'zustand';
import { docToMarkdown, markdownToDoc } from '@/lib/markdown';
import { LocalePreference } from '@/lib/i18n';
import { projectPageSlug } from '@/lib/project-slugs';

export type PageWidth = 'sm' | 'md' | 'lg' | 'full';
export type DatabaseViewType = 'table' | 'kanban' | 'calendar' | 'gallery' | 'timeline' | 'list';

export interface DatabaseViewConfig {
  id: string;
  name: string;
  type: DatabaseViewType;
}

export interface DatabaseProperty {
  id: string;
  name: string;
  type: string;
}

export interface Template {
  id: string;
  name: string;
  icon?: string | null;
  builtIn?: boolean;
  snapshot: {
    title: string;
    content: any;
    type: 'doc' | 'database';
  };
}

export interface ProjectSection {
  id: string;
  title: string;
  pageIds: string[];
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: any;
  parentId: string | null;
  icon: string | null;
  cover: string | null;
  type: 'doc' | 'database';
  favorite: boolean;
  sortOrder: number;
  favoriteOrder?: number;
  updatedAt: number;
  createdAt: number;
  width?: PageWidth | null;
  properties?: DatabaseProperty[];
  propertyValues?: Record<string, any>;
  viewSettings?: { type: DatabaseViewType };
  views?: DatabaseViewConfig[];
  activeViewId?: string;
  trashed?: { at: number; originalParentId: string | null; originalSortOrder: number };
  inline?: boolean;

  path: string;
  sectionId: string;
  hash: string | null;
  frontmatter?: Record<string, any>;
  frontmatterText: string;
  bodyMarkdown: string;
  sourceBody: string;
  loaded: boolean;
  dirty: boolean;
  fileDirty: boolean;
  uiDirty: boolean;
  saving: boolean;
  saveError: string | null;
  readOnly: boolean;
  requiresApproval: boolean;
  sourceMode: boolean;
}

interface WorkspaceState {
  pages: Page[];
  sections: ProjectSection[];
  activePageId: string | null;
  projectName: string;
  projectRoot: string;
  token: string | null;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  expandedPageIds: string[];
  templates: Template[];
  settings: {
    usageLimit: number;
    defaultPageWidth: PageWidth;
    language: LocalePreference;
  };
  _hasHydrated: boolean;

  initializeProject: (token: string) => Promise<void>;
  loadPage: (id: string) => Promise<void>;
  savePage: (id: string, options?: { approver?: string; notes?: string }) => Promise<boolean>;
  setHasHydrated: (state: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleExpandPage: (id: string) => void;
  reorderPages: (parentId: string | null, orderedIds: string[]) => void;
  addPage: (parentId?: string | null, type?: 'doc' | 'database', options?: { setActive?: boolean; initialTitle?: string }) => string;
  createContentPage: (title?: string) => Promise<string | null>;
  updatePage: (id: string, updates: Partial<Page>) => void;
  toggleFavorite: (id: string) => void;
  deletePage: (id: string) => void;
  trashPage: (id: string) => void;
  restorePage: (id: string) => void;
  purgePage: (id: string) => void;
  emptyTrash: () => void;
  purgeOldTrash: () => void;
  discardEmptyDrafts: () => void;
  duplicatePage: (pageId: string) => string | null;
  saveAsTemplate: () => string;
  deleteTemplate: () => void;
  createFromTemplate: () => string | null;
  computeRollup: () => string | number | null;
  setActivePage: (id: string | null) => void;
  setSettings: (updates: Partial<WorkspaceState['settings']>) => void;
  turnIntoDatabase: () => void;
  turnIntoPage: () => void;
  addDatabaseView: () => string;
  updateDatabaseView: () => void;
  deleteDatabaseView: () => void;
  setActiveDatabaseView: () => void;
  addProperty: () => void;
  updateProperty: () => void;
  deleteProperty: () => void;
  getPageSize: () => number;
  getPageByShortId: (shortId: string) => Page | undefined;
  setSourceMode: (id: string, sourceMode: boolean) => void;
}

const DEFAULT_SETTINGS: WorkspaceState['settings'] = {
  usageLimit: 10 * 1024 * 1024,
  defaultPageWidth: 'md',
  language: 'system',
};

function emptyDoc() {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

function iconForPath(path: string) {
  if (path === 'brain/index.md') return '🧠';
  if (path === 'brain/identidade.md') return '🏷️';
  if (path === 'brain/voz.md') return '🎙️';
  if (path === 'brain/tecnologia.md') return '🛠️';
  if (path === 'brain/editorial.md') return '🗂️';
  if (path === 'brain/topic-clusters.md') return '🧩';
  if (path === 'brain/log.md') return '🕒';
  if (path.startsWith('brain/')) return '📄';
  if (path.startsWith('conteudos/blog/')) return '📝';
  if (path.startsWith('conteudos/linkedin/')) return '💼';
  if (path.startsWith('conteudos/podcast/')) return '🎧';
  if (path.startsWith('conteudos/')) return '✍️';
  return '📝';
}

function pathSlug(path: string, _title: string) {
  return projectPageSlug(path);
}

function pageFromSummary(item: any, sectionId: string, sortOrder: number, parentId: string | null = null): Page {
  return {
    id: item.path,
    slug: pathSlug(item.path, item.title),
    title: item.title || item.path,
    content: emptyDoc(),
    parentId,
    icon: Object.prototype.hasOwnProperty.call(item, 'icon') ? item.icon ?? null : iconForPath(item.path),
    cover: Object.prototype.hasOwnProperty.call(item, 'cover') ? item.cover ?? null : null,
    type: 'doc',
    favorite: false,
    sortOrder,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    width: null,
    path: item.path,
    sectionId,
    hash: item.hash || null,
    frontmatter: {},
    frontmatterText: '',
    bodyMarkdown: '',
    sourceBody: '',
    loaded: false,
    dirty: false,
    fileDirty: false,
    uiDirty: false,
    saving: false,
    saveError: null,
    readOnly: !!item.readOnly,
    requiresApproval: !!item.requiresApproval,
    sourceMode: false,
  };
}

function mentionResolver(pages: Page[]) {
  return {
    findPageId(target: string) {
      const clean = target.replace(/\.md$/, '').toLowerCase();
      const page = pages.find((p) => {
        const base = p.path.split('/').pop()?.replace(/\.md$/, '').toLowerCase();
        return base === clean || p.title.toLowerCase() === clean || p.path.replace(/\.md$/, '').toLowerCase() === clean;
      });
      return page?.id || null;
    },
    labelForPageId(pageId: string) {
      const page = pages.find((p) => p.id === pageId);
      return page?.path.split('/').pop()?.replace(/\.md$/, '') || page?.title || pageId;
    },
  };
}

function yamlString(value: unknown) {
  return JSON.stringify(String(value ?? ''));
}

export function frontmatterToText(fields: Record<string, any> = {}) {
  return Object.entries(fields)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length ? `${key}:\n${value.map((item) => `  - ${yamlString(item)}`).join('\n')}` : `${key}: []`;
      }
      return `${key}: ${yamlString(value)}`;
    })
    .join('\n');
}

export function parseFrontmatterText(raw: string) {
  const data: Record<string, any> = {};
  let currentList: string[] | null = null;
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s/.test(line) && currentList) {
      const item = line.match(/^\s+-\s*(.+)$/);
      if (item) currentList.push(item[1].replace(/^["']|["']$/g, ''));
      continue;
    }
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!val || val === '[]') {
      currentList = [];
      data[key] = currentList;
    } else {
      data[key] = val.replace(/^["']|["']$/g, '');
      currentList = null;
    }
  }
  return data;
}

function setFrontmatterTextField(raw: string, key: string, value: unknown) {
  const nextLine = `${key}: ${yamlString(value)}`;
  if (!raw.trim()) return nextLine;
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  let found = false;
  const next = lines.map((line) => {
    if (new RegExp(`^${key}\\s*:`).test(line)) {
      found = true;
      return nextLine;
    }
    return line;
  });
  if (!found) next.push(nextLine);
  return next.join('\n');
}

async function apiFetch(token: string | null, url: string, init?: RequestInit) {
  if (!token) throw new Error('missing companion token');
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      'x-companion-token': token,
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
    },
  });
  return res.json();
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  pages: [],
  sections: [],
  activePageId: null,
  projectName: 'Agentic SEO',
  projectRoot: '',
  token: null,
  sidebarCollapsed: false,
  sidebarWidth: 346,
  expandedPageIds: [],
  templates: [],
  settings: { ...DEFAULT_SETTINGS },
  _hasHydrated: false,

  initializeProject: async (token) => {
    set({ token, _hasHydrated: false });
    const tree = await apiFetch(token, '/api/project/tree');
    if (!tree.ok) throw new Error(tree.reason || 'project tree failed');
    const pages: Page[] = [];
    const sections: ProjectSection[] = [];
    for (const section of tree.sections || []) {
      const pageIds: string[] = [];
      const items = section.items || [];
      const brainRootId =
        section.id === 'brain' ? items.find((item: any) => item.path === 'brain/index.md')?.path || items[0]?.path || null : null;
      items.forEach((item: any, index: number) => {
        const parentId = section.id === 'brain' && brainRootId && item.path !== brainRootId ? brainRootId : null;
        const page = pageFromSummary(item, section.id, index, parentId);
        pages.push(page);
        if (!parentId) pageIds.push(page.id);
      });
      sections.push({ id: section.id, title: section.title, pageIds });
    }
    const firstPageId = pages[0]?.id || null;
    set({
      pages,
      sections,
      activePageId: firstPageId,
      projectName: tree.project?.name || 'Agentic SEO',
      projectRoot: tree.project?.root || '',
      expandedPageIds: pages.filter((p) => p.path === 'brain/index.md' || (p.sectionId === 'brain' && !p.parentId)).map((p) => p.id),
      _hasHydrated: true,
    });
    if (firstPageId) void get().loadPage(firstPageId);
  },

  loadPage: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page || page.loaded) return;
    const file = await apiFetch(get().token, `/api/project/file?path=${encodeURIComponent(page.path)}`);
    if (!file.ok) {
      set((state) => ({
        pages: state.pages.map((p) => (p.id === id ? { ...p, loaded: true, saveError: file.reason || 'load failed' } : p)),
      }));
      return;
    }
    const resolver = mentionResolver(get().pages);
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === id
          ? {
              ...p,
              title: file.title || p.title,
              slug: pathSlug(p.path, file.title || p.title),
              frontmatter: file.frontmatter || {},
              frontmatterText: file.frontmatterRaw || frontmatterToText(file.frontmatter || {}),
              bodyMarkdown: file.body || '',
              sourceBody: file.body || '',
              content: markdownToDoc(file.body || '', resolver),
              hash: file.hash,
              icon: Object.prototype.hasOwnProperty.call(file, 'icon') ? file.icon ?? null : p.icon,
              cover: Object.prototype.hasOwnProperty.call(file, 'cover') ? file.cover ?? null : p.cover,
              readOnly: !!file.readOnly,
              requiresApproval: !!file.requiresApproval,
              loaded: true,
              dirty: false,
              fileDirty: false,
              uiDirty: false,
              saveError: null,
            }
          : p
      ),
    }));
  },

  savePage: async (id, options = {}) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page || page.readOnly || page.saving) return false;
    if (!page.dirty) return true;
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, saving: true, saveError: null } : p)),
    }));
    const resolver = mentionResolver(get().pages);
    const body = page.fileDirty ? (page.sourceMode ? page.sourceBody : docToMarkdown(page.content, resolver)) : page.bodyMarkdown;
    const payload: Record<string, any> = { path: page.path };
    if (page.fileDirty) {
      payload.hash = page.hash;
      payload.title = page.title;
      payload.body = body;
      payload.frontmatter = page.frontmatter || {};
      payload.frontmatterRaw = page.frontmatterText;
      payload.approver = options.approver;
      payload.notes = options.notes;
    }
    if (page.uiDirty) {
      payload.ui = { icon: page.icon, cover: page.cover };
    }
    const result = await apiFetch(get().token, '/api/project/file', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === id
          ? result.ok
            ? {
                ...p,
                hash: result.hash,
                bodyMarkdown: body,
                sourceBody: body,
                dirty: false,
                fileDirty: false,
                uiDirty: false,
                saving: false,
                saveError: null,
                updatedAt: Date.now(),
              }
            : {
                ...p,
                saving: false,
                saveError: result.reason || 'save failed',
                hash: result.currentHash || p.hash,
              }
          : p
      ),
    }));
    return !!result.ok;
  },

  setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSidebarWidth: (width) => set({ sidebarWidth: Math.min(480, Math.max(240, width)) }),
  toggleExpandPage: (id) =>
    set((s) => ({
      expandedPageIds: s.expandedPageIds.includes(id)
        ? s.expandedPageIds.filter((x) => x !== id)
        : [...s.expandedPageIds, id],
    })),
  reorderPages: (_parentId, orderedIds) =>
    set((s) => ({
      pages: s.pages.map((p) => {
        const idx = orderedIds.indexOf(p.id);
        return idx === -1 ? p : { ...p, sortOrder: idx, dirty: p.loaded ? p.dirty : false };
      }),
    })),
  addPage: (_parentId, _type, options) => {
    const id = `pending-${Date.now()}`;
    void get().createContentPage(options?.initialTitle || 'Nova página');
    return id;
  },
  createContentPage: async (title = 'Nova página') => {
    const result = await apiFetch(get().token, '/api/project/file/create', {
      method: 'POST',
      body: JSON.stringify({ kind: 'content', title }),
    });
    if (!result.ok) return null;
    await get().initializeProject(get().token!);
    const created = get().pages.find((p) => p.path === result.path);
    if (created) set({ activePageId: created.id });
    return created?.id || null;
  },
  updatePage: (id, updates) =>
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== id) return p;
        const fileChanged =
          updates.content !== undefined ||
          updates.title !== undefined ||
          updates.sourceBody !== undefined ||
          updates.frontmatter !== undefined ||
          updates.frontmatterText !== undefined;
        const uiChanged = updates.icon !== undefined || updates.cover !== undefined;
        let nextFrontmatter = updates.frontmatter !== undefined ? { ...(updates.frontmatter || {}) } : { ...(p.frontmatter || {}) };
        let nextFrontmatterText =
          updates.frontmatterText !== undefined
            ? updates.frontmatterText
            : p.frontmatterText || frontmatterToText(nextFrontmatter);
        if (updates.frontmatterText !== undefined && updates.frontmatter === undefined) {
          nextFrontmatter = parseFrontmatterText(updates.frontmatterText);
        }
        if (updates.frontmatter !== undefined && updates.frontmatterText === undefined) {
          nextFrontmatterText = frontmatterToText(nextFrontmatter);
        }
        if (updates.title !== undefined) {
          nextFrontmatter = { ...nextFrontmatter, title: updates.title || '' };
          nextFrontmatterText = setFrontmatterTextField(nextFrontmatterText, 'title', updates.title || '');
        }
        const nextFileDirty = p.fileDirty || fileChanged;
        const nextUiDirty = p.uiDirty || uiChanged;
        return {
          ...p,
          ...updates,
          frontmatter: nextFrontmatter,
          frontmatterText: nextFrontmatterText,
          slug: updates.title !== undefined ? pathSlug(p.path, updates.title || p.title) : p.slug,
          fileDirty: nextFileDirty,
          uiDirty: nextUiDirty,
          dirty: p.dirty || nextFileDirty || nextUiDirty,
        };
      }),
    })),
  toggleFavorite: (id) =>
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
    })),
  deletePage: () => {},
  trashPage: () => {},
  restorePage: () => {},
  purgePage: () => {},
  emptyTrash: () => {},
  purgeOldTrash: () => {},
  discardEmptyDrafts: () => {},
  duplicatePage: () => null,
  saveAsTemplate: () => '',
  deleteTemplate: () => {},
  createFromTemplate: () => null,
  computeRollup: () => null,
  setActivePage: (activePageId) => set({ activePageId }),
  setSettings: (updates) => set((s) => ({ settings: { ...s.settings, ...updates } })),
  turnIntoDatabase: () => {},
  turnIntoPage: () => {},
  addDatabaseView: () => '',
  updateDatabaseView: () => {},
  deleteDatabaseView: () => {},
  setActiveDatabaseView: () => {},
  addProperty: () => {},
  updateProperty: () => {},
  deleteProperty: () => {},
  getPageSize: () => JSON.stringify(get().pages).length,
  getPageByShortId: (shortId) => get().pages.find((p) => p.id.startsWith(shortId) || p.slug.endsWith(shortId)),
  setSourceMode: (id, sourceMode) =>
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === id
          ? {
              ...p,
              sourceMode,
              sourceBody: sourceMode ? docToMarkdown(p.content, mentionResolver(s.pages)) : p.sourceBody,
              content: sourceMode ? p.content : markdownToDoc(p.sourceBody, mentionResolver(s.pages)),
            }
          : p
      ),
    })),
}));
