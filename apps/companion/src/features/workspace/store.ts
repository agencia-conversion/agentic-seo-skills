import { create } from 'zustand';
import { docToMarkdown, markdownToDoc } from '@/lib/markdown';
import { LocalePreference } from '@/lib/i18n';
import { projectPageSlug } from '@/lib/project-slugs';

const SIDEBAR_STORAGE_KEY = 'agentic-seo:companion:sidebar';
const DEFAULT_SIDEBAR_WIDTH = 300;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 480;

interface SidebarPreference {
  collapsed?: boolean;
  width?: number;
}

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

export interface ReportModuleSummary {
  id: string;
  title: string;
  count: number;
  latestGeneratedAt: string | null;
}

export interface ContentTopicClusterSummary {
  id: string;
  title: string;
  count: number;
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
  kind?: 'file' | 'reportIndex' | 'reportModule' | 'contentIndex' | 'workbenchIndex' | 'brainEmpty';
  reportModuleId?: string;
  contentTopicClusterId?: string;
}

interface WorkspaceState {
  pages: Page[];
  sections: ProjectSection[];
  activePageId: string | null;
  projectName: string;
  projectRoot: string;
  hasFiles: boolean;
  hasBrain: boolean;
  canBootstrapBrain: boolean;
  reportModules: ReportModuleSummary[];
  token: string | null;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  expandedPageIds: string[];
  settingsOpen: boolean;
  settingsTab: 'general' | 'credentials';
  sourceViewerPath: string | null;
  linkEditor: { open: boolean; initial: { text: string; href: string }; onSubmit: ((value: { text: string; href: string }) => void) | null };
  templates: Template[];
  settings: {
    usageLimit: number;
    defaultPageWidth: PageWidth;
    language: LocalePreference;
  };
  _hasHydrated: boolean;

  initializeProject: (token: string) => Promise<void>;
  loadPage: (id: string) => Promise<void>;
  savePage: (id: string, options?: { notes?: string; silent?: boolean }) => Promise<boolean>;
  bootstrapBrain: () => Promise<string | null>;
  setHasHydrated: (state: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleExpandPage: (id: string) => void;
  openSettings: (tab?: 'general' | 'credentials') => void;
  closeSettings: () => void;
  openSourceViewer: (path: string) => void;
  closeSourceViewer: () => void;
  openLinkEditor: (initial: { text: string; href: string }, onSubmit: (value: { text: string; href: string }) => void) => void;
  closeLinkEditor: () => void;
  reorderPages: (parentId: string | null, orderedIds: string[]) => void;
  addPage: (parentId?: string | null, type?: 'doc' | 'database', options?: { setActive?: boolean; initialTitle?: string }) => string;
  createWorkbenchFile: (title?: string) => Promise<string | null>;
  createContentPage: (title?: string) => Promise<string | null>;
  openReportPage: (report: { path: string; title?: string; hash?: string | null }) => string | null;
  updatePage: (id: string, updates: Partial<Page>) => void;
  toggleFavorite: (id: string) => void;
  deleteFile: (id: string) => Promise<boolean>;
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
const SETTINGS_STORAGE_KEY = 'agentic-seo-companion-settings';

function readInitialSettings(): WorkspaceState['settings'] {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
      language: ['system', 'en', 'pt-BR'].includes(parsed?.language) ? parsed.language : DEFAULT_SETTINGS.language,
      defaultPageWidth: ['sm', 'md', 'lg', 'full'].includes(parsed?.defaultPageWidth)
        ? parsed.defaultPageWidth
        : DEFAULT_SETTINGS.defaultPageWidth,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings: WorkspaceState['settings']) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

function readSidebarPreference(): SidebarPreference {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SidebarPreference;
    return {
      collapsed: typeof parsed.collapsed === 'boolean' ? parsed.collapsed : undefined,
      width: typeof parsed.width === 'number' && Number.isFinite(parsed.width) ? clampSidebarWidth(parsed.width) : undefined,
    };
  } catch {
    return {};
  }
}

function writeSidebarPreference(next: SidebarPreference) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ ...readSidebarPreference(), ...next }));
  } catch {
    // Ignore storage failures; the UI should continue to work without persistence.
  }
}

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
  if (path.startsWith('relatorios/')) return '📊';
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
    width: item.path?.startsWith('relatorios/') ? 'lg' : null,
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
    requiresApproval: false,
    sourceMode: false,
    kind: 'file',
  };
}

function virtualPage({
  id,
  title,
  icon,
  parentId,
  sortOrder,
  kind,
  sectionId = 'brain',
  reportModuleId,
  contentTopicClusterId,
}: {
  id: string;
  title: string;
  icon: string;
  parentId: string | null;
  sortOrder: number;
  kind: 'reportIndex' | 'reportModule' | 'contentIndex' | 'workbenchIndex' | 'brainEmpty';
  sectionId?: string;
  reportModuleId?: string;
  contentTopicClusterId?: string;
}): Page {
  return {
    id,
    slug: projectPageSlug(id),
    title,
    content: emptyDoc(),
    parentId,
    icon,
    cover: null,
    type: 'doc',
    favorite: false,
    sortOrder,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    width: null,
    path: id,
    sectionId,
    hash: null,
    frontmatter: {},
    frontmatterText: '',
    bodyMarkdown: '',
    sourceBody: '',
    loaded: true,
    dirty: false,
    fileDirty: false,
    uiDirty: false,
    saving: false,
    saveError: null,
    readOnly: true,
    requiresApproval: false,
    sourceMode: false,
    kind,
    reportModuleId,
    contentTopicClusterId,
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
  projectName: 'agentic seo',
  projectRoot: '',
  hasFiles: false,
  hasBrain: false,
  canBootstrapBrain: true,
  reportModules: [],
  token: null,
  sidebarCollapsed: readSidebarPreference().collapsed ?? false,
  sidebarWidth: readSidebarPreference().width ?? DEFAULT_SIDEBAR_WIDTH,
  expandedPageIds: [],
  settingsOpen: false,
  settingsTab: 'general',
  sourceViewerPath: null,
  linkEditor: { open: false, initial: { text: '', href: '' }, onSubmit: null },
  templates: [],
  settings: readInitialSettings(),
  _hasHydrated: false,

  initializeProject: async (token) => {
    set({ token, _hasHydrated: false });
    const [tree, reportIndex, contentIndex, projectSettings] = await Promise.all([
      apiFetch(token, '/api/project/tree'),
      apiFetch(token, '/api/project/reports').catch(() => ({ ok: false, modules: [] })),
      apiFetch(token, '/api/project/contents').catch(() => ({ ok: false, topicClusters: [], items: [] })),
      apiFetch(token, '/api/project/settings').catch(() => ({ ok: false })),
    ]);
    if (!tree.ok) throw new Error(tree.reason || 'project tree failed');
    const pages: Page[] = [];
    const sections: ProjectSection[] = [];
    let brainSection: ProjectSection | null = null;
    for (const section of tree.sections || []) {
      const pageIds: string[] = [];
      const items = section.items || [];
      if (section.id === 'conteudos') {
        items.forEach((item: any, index: number) => {
          pages.push({
            ...pageFromSummary(item, section.id, index, null),
            inline: true,
          });
        });
        continue;
      }
      if (section.id === 'workbench') {
        items.forEach((item: any, index: number) => {
          pages.push(pageFromSummary(item, section.id, index, 'virtual/workbench'));
        });
        continue;
      }
      const brainRootId =
        section.id === 'brain' ? items.find((item: any) => item.path === 'brain/index.md')?.path || items[0]?.path || null : null;
      items.forEach((item: any, index: number) => {
        const parentId = section.id === 'brain' && brainRootId && item.path !== brainRootId ? brainRootId : null;
        const page = pageFromSummary(item, section.id, index, parentId);
        pages.push(page);
        if (!parentId) pageIds.push(page.id);
      });
      const projectSection = { id: section.id, title: section.title, pageIds };
      sections.push(projectSection);
      if (section.id === 'brain') brainSection = projectSection;
    }
    const contentTopicClusters: ContentTopicClusterSummary[] = Array.isArray(contentIndex.topicClusters)
      ? contentIndex.topicClusters.filter((cluster: any) => cluster?.id && cluster.id !== '__none__')
      : [];
    if (brainSection && !tree.hasBrain) {
      const brainEmptyId = 'virtual/brain-empty';
      pages.push(
        virtualPage({
          id: brainEmptyId,
          title: 'Brain',
          icon: '🧠',
          parentId: null,
          sortOrder: brainSection.pageIds.length,
          kind: 'brainEmpty',
        })
      );
      brainSection.pageIds.push(brainEmptyId);
    }
    if (brainSection) {
      const contentsRootId = 'virtual/contents';
      pages.push(
        virtualPage({
          id: contentsRootId,
          title: 'Content',
          icon: '🗂️',
          parentId: null,
          sortOrder: brainSection.pageIds.length,
          kind: 'contentIndex',
        })
      );
      brainSection.pageIds.push(contentsRootId);
      contentTopicClusters.forEach((cluster, index) => {
        pages.push(
          virtualPage({
            id: `virtual/contents/${cluster.id}`,
            title: cluster.title || cluster.id,
            icon: '🧩',
            parentId: contentsRootId,
            sortOrder: index,
            kind: 'contentIndex',
            contentTopicClusterId: cluster.id,
          })
        );
      });
    }
    const reportModules: ReportModuleSummary[] = Array.isArray(reportIndex.modules) ? reportIndex.modules : [];
    if (brainSection && reportModules.length > 0) {
      const reportsRootId = 'virtual/reports';
      pages.push(
        virtualPage({
          id: reportsRootId,
          title: 'Reports',
          icon: '📊',
          parentId: null,
          sortOrder: brainSection.pageIds.length,
          kind: 'reportIndex',
        })
      );
      brainSection.pageIds.push(reportsRootId);
      reportModules.forEach((module, index) => {
        pages.push(
          virtualPage({
            id: `virtual/reports/${module.id}`,
            title: module.title,
            icon: '📈',
            parentId: reportsRootId,
            sortOrder: index,
            kind: 'reportModule',
            reportModuleId: module.id,
          })
        );
      });
      for (const module of reportModules) {
        try {
          const list = await apiFetch(token, `/api/project/reports?module=${encodeURIComponent(module.id)}&page=1&pageSize=100`);
          for (const report of list.reports || []) {
            const reportPage: Page = {
              ...pageFromSummary(
                {
                  path: report.path,
                  title: report.title || report.path,
                  hash: report.hash || null,
                  readOnly: false,
                  icon: '📊',
                },
                'relatorios',
                pages.length,
                null
              ),
              inline: true,
              readOnly: false,
              width: 'lg',
            };
            pages.push(reportPage);
          }
        } catch {
          // Report table browsing still works when preloading report pages fails.
        }
      }
    }
    if (brainSection) {
      const workbenchRootId = 'virtual/workbench';
      pages.push(
        virtualPage({
          id: workbenchRootId,
          title: 'Workbench',
          icon: '🧰',
          parentId: null,
          sortOrder: brainSection.pageIds.length,
          kind: 'workbenchIndex',
        })
      );
      brainSection.pageIds.push(workbenchRootId);
    }
    const firstPageId = pages[0]?.id || null;
    const currentSettings = get().settings;
    const nextSettings =
      projectSettings.ok && ['pt-BR', 'en'].includes(projectSettings.language)
        ? { ...currentSettings, language: projectSettings.language as LocalePreference }
        : currentSettings;
    if (nextSettings !== currentSettings) writeSettings(nextSettings);
    set({
      pages,
      sections,
      activePageId: firstPageId,
      projectName: tree.project?.name || 'agentic seo',
      projectRoot: tree.project?.root || '',
      hasFiles: !!tree.hasFiles,
      hasBrain: !!tree.hasBrain,
      canBootstrapBrain: !!tree.canBootstrapBrain,
      reportModules,
      settings: nextSettings,
      expandedPageIds: pages
        .filter((p) => p.path === 'brain/index.md' || p.id === 'virtual/reports' || p.id === 'virtual/contents' || p.id === 'virtual/workbench' || (p.sectionId === 'brain' && !p.parentId))
        .map((p) => p.id),
      _hasHydrated: true,
    });
    if (firstPageId) void get().loadPage(firstPageId);
  },

  loadPage: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page || page.loaded) return;
    if (page.kind && page.kind !== 'file') return;
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
              requiresApproval: false,
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
    if (page?.kind && page.kind !== 'file') return false;
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
      payload.notes = options.notes;
    }
    if (page.uiDirty) {
      payload.ui = { icon: page.icon, cover: page.cover };
    }
    const result = await apiFetch(get().token, '/api/project/file', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    set((state) => {
      const resolverAfterSave = mentionResolver(state.pages);
      return {
        pages: state.pages.map((p) => {
          if (p.id !== id) return p;
          if (!result.ok) {
            return {
              ...p,
              saving: false,
              saveError: result.reason || 'save failed',
              hash: result.currentHash || p.hash,
            };
          }

          const currentBody = p.fileDirty ? (p.sourceMode ? p.sourceBody : docToMarkdown(p.content, resolverAfterSave)) : p.bodyMarkdown;
          const fileChangedDuringSave =
            p.fileDirty &&
            (currentBody !== body || p.title !== page.title || p.frontmatterText !== page.frontmatterText);
          const uiChangedDuringSave =
            p.uiDirty &&
            (p.icon !== page.icon || p.cover !== page.cover);

          return {
            ...p,
            hash: result.hash,
            bodyMarkdown: fileChangedDuringSave ? p.bodyMarkdown : body,
            sourceBody: fileChangedDuringSave ? p.sourceBody : body,
            dirty: fileChangedDuringSave || uiChangedDuringSave,
            fileDirty: fileChangedDuringSave,
            uiDirty: uiChangedDuringSave,
            saving: false,
            saveError: null,
            updatedAt: Date.now(),
          };
        }),
      };
    });
    return !!result.ok;
  },

  bootstrapBrain: async () => {
    const result = await apiFetch(get().token, '/api/project/brain/bootstrap', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!result.ok) return null;
    await get().initializeProject(get().token!);
    const brainIndex = get().pages.find((p) => p.path === 'brain/index.md') || get().pages[0];
    if (brainIndex) {
      set({ activePageId: brainIndex.id });
      void get().loadPage(brainIndex.id);
    }
    return brainIndex?.id || null;
  },

  setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
  toggleSidebar: () =>
    set((s) => {
      const sidebarCollapsed = !s.sidebarCollapsed;
      writeSidebarPreference({ collapsed: sidebarCollapsed });
      return { sidebarCollapsed };
    }),
  setSidebarCollapsed: (sidebarCollapsed) => {
    writeSidebarPreference({ collapsed: sidebarCollapsed });
    set({ sidebarCollapsed });
  },
  setSidebarWidth: (width) => {
    const sidebarWidth = clampSidebarWidth(width);
    writeSidebarPreference({ width: sidebarWidth });
    set({ sidebarWidth });
  },
  toggleExpandPage: (id) =>
    set((s) => ({
      expandedPageIds: s.expandedPageIds.includes(id)
        ? s.expandedPageIds.filter((x) => x !== id)
        : [...s.expandedPageIds, id],
    })),
  openSettings: (tab = 'general') => set({ settingsOpen: true, settingsTab: tab }),
  closeSettings: () => set({ settingsOpen: false, settingsTab: 'general' }),
  openSourceViewer: (path) => set({ sourceViewerPath: path }),
  closeSourceViewer: () => set({ sourceViewerPath: null }),
  openLinkEditor: (initial, onSubmit) => set({ linkEditor: { open: true, initial, onSubmit } }),
  closeLinkEditor: () =>
    set({ linkEditor: { open: false, initial: { text: '', href: '' }, onSubmit: null } }),
  reorderPages: (_parentId, orderedIds) =>
    set((s) => ({
      pages: s.pages.map((p) => {
        const idx = orderedIds.indexOf(p.id);
        return idx === -1 ? p : { ...p, sortOrder: idx, dirty: p.loaded ? p.dirty : false };
      }),
    })),
  addPage: (_parentId, _type, options) => {
    const id = `pending-${Date.now()}`;
    void get().createWorkbenchFile(options?.initialTitle || 'Nova página');
    return id;
  },
  createWorkbenchFile: async (title = 'Nova página') => {
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
  openReportPage: (report) => {
    if (!report.path.startsWith('relatorios/')) return null;
    const existing = get().pages.find((p) => p.path === report.path);
    if (existing) {
      set({ activePageId: existing.id });
      void get().loadPage(existing.id);
      return existing.slug;
    }
    const page: Page = {
      ...pageFromSummary(
        {
          path: report.path,
          title: report.title || report.path,
          hash: report.hash || null,
          readOnly: false,
          icon: '📊',
        },
        'relatorios',
        get().pages.length,
        null
      ),
      inline: true,
      readOnly: false,
      width: 'lg',
    };
    set((state) => ({ pages: [...state.pages, page], activePageId: page.id }));
    void get().loadPage(page.id);
    return page.slug;
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
  deleteFile: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (page?.kind && page.kind !== 'file') return false;
    if (page?.path.startsWith('relatorios/')) return false;
    if (!page || page.saving || page.readOnly) return false;
    if (page.dirty) {
      set((state) => ({
        pages: state.pages.map((p) => (p.id === id ? { ...p, saveError: 'dirty-file' } : p)),
      }));
      return false;
    }
    const previousActive = get().activePageId;
    const result = await apiFetch(get().token, '/api/project/file/delete', {
      method: 'POST',
      body: JSON.stringify({ path: page.path, hash: page.hash, dirty: page.dirty }),
    });
    if (!result.ok) {
      set((state) => ({
        pages: state.pages.map((p) =>
          p.id === id ? { ...p, saveError: result.reason || 'delete failed', hash: result.currentHash || p.hash } : p
        ),
      }));
      return false;
    }
    await get().initializeProject(get().token!);
    if (previousActive && previousActive !== id) {
      const stillActive = get().pages.find((p) => p.id === previousActive);
      if (stillActive) {
        set({ activePageId: stillActive.id });
        void get().loadPage(stillActive.id);
      }
    }
    return true;
  },
  deletePage: (id) => {
    void get().deleteFile(id);
  },
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
  setSettings: (updates) =>
    set((s) => {
      const settings = { ...s.settings, ...updates };
      writeSettings(settings);
      if (updates.language && ['pt-BR', 'en'].includes(updates.language) && s.token) {
        void apiFetch(s.token, '/api/project/settings', {
          method: 'PATCH',
          body: JSON.stringify({ language: updates.language }),
        });
      }
      return { settings };
    }),
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
