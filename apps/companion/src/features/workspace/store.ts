import { create } from 'zustand';
import { docToMarkdown, markdownToDoc } from '@/lib/markdown';
import { LocalePreference } from '@/lib/i18n';

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
  bodyMarkdown: string;
  sourceBody: string;
  loaded: boolean;
  dirty: boolean;
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
  if (path === 'brain/log.md') return '🕒';
  if (path.startsWith('brain/')) return '🧠';
  if (path.startsWith('conteudos/')) return '✍️';
  return '📝';
}

function pathSlug(path: string, title: string) {
  const base = (title || path.replace(/\.md$/, ''))
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  const suffix = path.replace(/\.md$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
  return `${base || 'pagina'}-${suffix}`;
}

function pageFromSummary(item: any, sectionId: string, sortOrder: number): Page {
  return {
    id: item.path,
    slug: pathSlug(item.path, item.title),
    title: item.title || item.path,
    content: emptyDoc(),
    parentId: null,
    icon: iconForPath(item.path),
    cover: null,
    type: 'doc',
    favorite: false,
    sortOrder,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    width: null,
    path: item.path,
    sectionId,
    hash: item.hash || null,
    bodyMarkdown: '',
    sourceBody: '',
    loaded: false,
    dirty: false,
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
  projectName: 'SEO Brain',
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
      (section.items || []).forEach((item: any, index: number) => {
        const page = pageFromSummary(item, section.id, index);
        pages.push(page);
        pageIds.push(page.id);
      });
      sections.push({ id: section.id, title: section.title, pageIds });
    }
    const firstPageId = pages[0]?.id || null;
    set({
      pages,
      sections,
      activePageId: firstPageId,
      projectName: tree.project?.name || 'SEO Brain',
      projectRoot: tree.project?.root || '',
      expandedPageIds: pages.filter((p) => p.sectionId === 'brain').map((p) => p.id),
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
              bodyMarkdown: file.body || '',
              sourceBody: file.body || '',
              content: markdownToDoc(file.body || '', resolver),
              hash: file.hash,
              readOnly: !!file.readOnly,
              requiresApproval: !!file.requiresApproval,
              loaded: true,
              dirty: false,
              saveError: null,
            }
          : p
      ),
    }));
  },

  savePage: async (id, options = {}) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page || page.readOnly || page.saving) return false;
    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, saving: true, saveError: null } : p)),
    }));
    const resolver = mentionResolver(get().pages);
    const body = page.sourceMode ? page.sourceBody : docToMarkdown(page.content, resolver);
    const result = await apiFetch(get().token, '/api/project/file', {
      method: 'POST',
      body: JSON.stringify({
        path: page.path,
        hash: page.hash,
        title: page.title,
        body,
        approver: options.approver,
        notes: options.notes,
      }),
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
      body: JSON.stringify({ kind: 'workbench', title }),
    });
    if (!result.ok) return null;
    await get().initializeProject(get().token!);
    const created = get().pages.find((p) => p.path === result.path);
    if (created) set({ activePageId: created.id });
    return created?.id || null;
  },
  updatePage: (id, updates) =>
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updates,
              slug: updates.title !== undefined ? pathSlug(p.path, updates.title || p.title) : p.slug,
              dirty:
                p.dirty ||
                updates.content !== undefined ||
                updates.title !== undefined ||
                updates.sourceBody !== undefined ||
                updates.icon !== undefined ||
                updates.cover !== undefined,
            }
          : p
      ),
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
