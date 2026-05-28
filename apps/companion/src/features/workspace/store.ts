import { create } from 'zustand';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { docToMarkdown, markdownToDoc } from '@/lib/markdown';
import { LocalePreference } from '@/lib/i18n';
import { projectPageSlug } from '@/lib/project-slugs';
import { syncBus } from '@/lib/sync-bus';
import { REPORT_DIR_NAME } from '../../../../../shared/report-modules';

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
  kind?: 'file' | 'analysisIndex' | 'contentIndex' | 'contentByCluster' | 'workbenchIndex' | 'brainEmpty' | 'clusterDetail';
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
  linkEditor: { open: boolean; initial: { text: string; href: string }; onSubmit: ((value: { text: string; href: string; pageId?: string | null }) => void) | null };
  templates: Template[];
  settings: {
    usageLimit: number;
    defaultPageWidth: PageWidth;
    language: LocalePreference;
    customIntents?: string[];
    advancedExpanded?: boolean;
    hiddenColumns?: string[];
    hiddenColumnsByTable?: Record<string, string[]>;
    dataTableFollowPageByPage?: Record<string, boolean>;
    clusterAreaFiltersByTable?: Record<string, string[]>;
  };
  _hasHydrated: boolean;

  initializeProject: (token: string) => Promise<void>;
  refreshProjectTree: () => Promise<void>;
  loadPage: (id: string, options?: { force?: boolean }) => Promise<void>;
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
  openLinkEditor: (initial: { text: string; href: string }, onSubmit: (value: { text: string; href: string; pageId?: string | null }) => void) => void;
  closeLinkEditor: () => void;
  reorderPages: (parentId: string | null, orderedIds: string[]) => void;
  addPage: (parentId?: string | null, type?: 'doc' | 'database', options?: { setActive?: boolean; initialTitle?: string }) => string;
  createWorkbenchFile: (title?: string) => Promise<string | null>;
  createBrainSubpage: (parentPath: string, title?: string) => Promise<string | null>;
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
  setActivePage: (id: string | null) => Promise<void>;
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
  dataTableFollowPageByPage: {},
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
      dataTableFollowPageByPage:
        parsed?.dataTableFollowPageByPage &&
        typeof parsed.dataTableFollowPageByPage === 'object' &&
        !Array.isArray(parsed.dataTableFollowPageByPage)
          ? Object.fromEntries(
              Object.entries(parsed.dataTableFollowPageByPage).filter(
                ([key, value]) => typeof key === 'string' && typeof value === 'boolean'
              )
            )
          : {},
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

const BRAIN_PAGE_ICONS: Record<string, string> = {
  'brain/index.md': '🧠',
  'brain/identity.md': '🪪',
  'brain/voice.md': '🗣️',
  'brain/technology.md': '🛠️',
  'brain/topic-clusters.md': '🧩',
  'brain/products.md': '📦',
  'brain/review.md': '📝',
  'brain/log.md': '📋',
};

function iconForPath(path: string) {
  const canonical = BRAIN_PAGE_ICONS[path];
  if (canonical) return canonical;
  if (path.startsWith('brain/')) return '📄';
  if (path.startsWith('contents/blog/')) return '📝';
  if (path.startsWith('contents/linkedin/')) return '💼';
  if (path.startsWith('contents/podcast/')) return '🎧';
  if (path.startsWith('contents/')) return '✍️';
  if (path.startsWith(`${REPORT_DIR_NAME}/`)) return '📊';
  return '📝';
}

function pathSlug(path: string, _title: string) {
  return projectPageSlug(path);
}

function pageFromSummary(item: any, sectionId: string, sortOrder: number, parentId: string | null = null): Page {
  const path = item.path as string;
  const isClusterSubpage = path.startsWith('brain/topic-clusters/') && path.endsWith('.md');
  const clusterSlug = isClusterSubpage ? path.replace('brain/topic-clusters/', '').replace(/\.md$/, '') : null;
  return {
    id: path,
    slug: pathSlug(path, item.title),
    title: item.title || path,
    content: emptyDoc(),
    parentId,
    icon: Object.prototype.hasOwnProperty.call(item, 'icon') ? item.icon ?? null : iconForPath(path),
    cover: Object.prototype.hasOwnProperty.call(item, 'cover') ? item.cover ?? null : null,
    type: 'doc',
    favorite: false,
    sortOrder,
    updatedAt: Date.now(),
    createdAt: Date.now(),
    width: path?.startsWith(`${REPORT_DIR_NAME}/`) ? 'lg' : null,
    path,
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
    kind: isClusterSubpage ? 'clusterDetail' : 'file',
    ...(clusterSlug ? { contentTopicClusterId: clusterSlug } : {}),
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
  kind: 'analysisIndex' | 'contentIndex' | 'contentByCluster' | 'workbenchIndex' | 'brainEmpty';
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
      const clean = target.replace(/\.md$/, '').replace(/^\/+/, '').toLowerCase();
      const page = pages.find((p) => {
        const base = p.path.split('/').pop()?.replace(/\.md$/, '').toLowerCase();
        const path = p.path.replace(/\.md$/, '').toLowerCase();
        const brainRelative = path.startsWith('brain/') ? path.slice('brain/'.length) : path;
        return base === clean || p.title.toLowerCase() === clean || path === clean || brainRelative === clean;
      });
      return page?.id || null;
    },
    labelForPageId(pageId: string) {
      const page = pages.find((p) => p.id === pageId);
      const path = page?.path.replace(/\.md$/, '');
      if (path?.startsWith('brain/')) return path.slice('brain/'.length);
      return path || page?.title || pageId;
    },
  };
}

export function frontmatterToText(fields: Record<string, any> = {}) {
  return stringifyYaml(fields, { lineWidth: 0 }).trimEnd();
}

export function parseFrontmatterText(raw: string) {
  try {
    const parsed = parseYaml(raw.replace(/\r\n/g, '\n'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : {};
  } catch {
    return {};
  }
}

function setFrontmatterTextField(raw: string, key: string, value: unknown) {
  const parsed = parseFrontmatterText(raw);
  return frontmatterToText({ ...parsed, [key]: value });
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

interface BuiltTree {
  pages: Page[];
  sections: ProjectSection[];
  reportModules: ReportModuleSummary[];
  projectName: string;
  projectRoot: string;
  hasFiles: boolean;
  hasBrain: boolean;
  canBootstrapBrain: boolean;
  projectLanguage: string | null;
  firstPageId: string | null;
  defaultExpandedIds: string[];
}

async function buildPagesAndSections(token: string): Promise<BuiltTree> {
  const [tree, reportIndex, projectSettings] = await Promise.all([
    apiFetch(token, '/api/project/tree'),
    apiFetch(token, '/api/project/reports').catch(() => ({ ok: false, modules: [] })),
    apiFetch(token, '/api/project/settings').catch(() => ({ ok: false })),
  ]);
  if (!tree.ok) throw new Error(tree.reason || 'project tree failed');
  const pages: Page[] = [];
  const sections: ProjectSection[] = [];
  let brainSection: ProjectSection | null = null;
  for (const section of tree.sections || []) {
    const pageIds: string[] = [];
    const items = section.items || [];
    if (section.id === 'contents') {
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
        pages.push({
          ...pageFromSummary(item, section.id, index, null),
          inline: true,
        });
      });
      continue;
    }
    const brainRootId =
      section.id === 'brain' ? items.find((item: any) => item.path === 'brain/index.md')?.path || items[0]?.path || null : null;
    const brainIndexByDir = new Map<string, string>();
    if (section.id === 'brain') {
      for (const item of items) {
        const match = (item.path as string).match(/^brain\/([A-Za-z0-9._-]+)\.md$/);
        if (match) brainIndexByDir.set(match[1], item.path);
      }
    }
    items.forEach((item: any, index: number) => {
      let parentId: string | null = null;
      if (section.id === 'brain' && brainRootId && item.path !== brainRootId) {
        const subdirMatch = (item.path as string).match(/^brain\/([A-Za-z0-9._-]+)\/[^/]+\.md$/);
        if (subdirMatch && brainIndexByDir.has(subdirMatch[1])) {
          parentId = brainIndexByDir.get(subdirMatch[1])!;
        } else {
          parentId = brainRootId;
        }
      }
      const page = pageFromSummary(item, section.id, index, parentId);
      pages.push(page);
      if (!parentId) pageIds.push(page.id);
    });
    const projectSection = { id: section.id, title: section.title, pageIds };
    sections.push(projectSection);
    if (section.id === 'brain') brainSection = projectSection;
  }
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
    const contentsRootId = 'contents';
    pages.push(
      virtualPage({
        id: contentsRootId,
        title: 'Conteúdos',
        icon: '🗂️',
        parentId: null,
        sortOrder: brainSection.pageIds.length,
        kind: 'contentIndex',
      })
    );
    brainSection.pageIds.push(contentsRootId);
    try {
      const clusterList = await apiFetch(token, '/api/project/cluster-list').catch(() => ({ ok: false, clusters: [] }));
      const activeClusters = (clusterList.clusters || []).filter(
        (c: { slug?: string; status?: string }) => c?.slug && c.status !== 'archived',
      );
      for (let idx = 0; idx < activeClusters.length; idx++) {
        const cluster = activeClusters[idx] as { slug: string; name?: string; icon?: string };
        const subId = `contents-${cluster.slug}`;
        pages.push(
          virtualPage({
            id: subId,
            title: cluster.name || cluster.slug,
            icon: cluster.icon || '🗂️',
            parentId: contentsRootId,
            sortOrder: idx,
            kind: 'contentByCluster',
            contentTopicClusterId: cluster.slug,
          }),
        );
      }
    } catch {
      // cluster-list opcional; sidebar funciona sem subpages
    }
  }
  const reportModules: ReportModuleSummary[] = Array.isArray(reportIndex.modules) ? reportIndex.modules : [];
  if (brainSection && reportModules.length > 0) {
    const analysesRootId = 'virtual/analyses';
    pages.push(
      virtualPage({
        id: analysesRootId,
        title: 'Análises',
        icon: '📊',
        parentId: null,
        sortOrder: brainSection.pageIds.length,
        kind: 'analysisIndex',
      })
    );
    brainSection.pageIds.push(analysesRootId);
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
              REPORT_DIR_NAME,
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
  const defaultExpandedIds = pages
    .filter(
      (p) =>
        p.path === 'brain/index.md' ||
        p.id === 'virtual/analyses' ||
        p.id === 'contents' ||
        p.id === 'virtual/workbench' ||
        (p.sectionId === 'brain' && !p.parentId)
    )
    .map((p) => p.id);
  return {
    pages,
    sections,
    reportModules,
    projectName: tree.project?.name || 'agentic seo',
    projectRoot: tree.project?.root || '',
    hasFiles: !!tree.hasFiles,
    hasBrain: !!tree.hasBrain,
    canBootstrapBrain: !!tree.canBootstrapBrain,
    projectLanguage: projectSettings.ok && typeof projectSettings.language === 'string' ? projectSettings.language : null,
    firstPageId: pages[0]?.id || null,
    defaultExpandedIds,
  };
}

// Module-level guard: subscribe the workspace tree to the cross-view sync bus
// exactly once per session. Re-running on every initializeProject() would
// stack listeners and cause duplicate refreshes.
let workspaceSyncBusBound = false;
function ensureWorkspaceSyncBusSubscription(get: () => WorkspaceState) {
  if (workspaceSyncBusBound) return;
  workspaceSyncBusBound = true;
  syncBus.on((event) => {
    // Any mutation that adds/removes a file (content created, cluster
    // renamed, etc.) must refresh the page tree so routing knows about the
    // new slug. Cell-level field edits (keyword/intent) emit content:changed
    // too — refreshing is idempotent, so it is safe to refresh on every
    // event of interest.
    if (event.type === 'content:changed' || event.type === 'cluster:changed' || event.type === 'clusters:changed') {
      void get().refreshProjectTree();
    }
  });
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
    const built = await buildPagesAndSections(token);
    const currentSettings = get().settings;
    const nextSettings =
      built.projectLanguage && ['pt-BR', 'en'].includes(built.projectLanguage)
        ? { ...currentSettings, language: built.projectLanguage as LocalePreference }
        : currentSettings;
    if (nextSettings !== currentSettings) writeSettings(nextSettings);
    set({
      pages: built.pages,
      sections: built.sections,
      activePageId: built.firstPageId,
      projectName: built.projectName,
      projectRoot: built.projectRoot,
      hasFiles: built.hasFiles,
      hasBrain: built.hasBrain,
      canBootstrapBrain: built.canBootstrapBrain,
      reportModules: built.reportModules,
      settings: nextSettings,
      expandedPageIds: built.defaultExpandedIds,
      _hasHydrated: true,
    });
    if (built.firstPageId) void get().loadPage(built.firstPageId);
    // Subscribe the workspace tree to cross-view mutations exactly once per
    // session so newly created/renamed/deleted contents become routable
    // without forcing every API caller to remember to refresh the tree.
    ensureWorkspaceSyncBusSubscription(get);
  },

  refreshProjectTree: async () => {
    const token = get().token;
    if (!token) return;
    const built = await buildPagesAndSections(token);
    const prevPages = get().pages;
    const prevById = new Map(prevPages.map((p) => [p.id, p]));
    const prevActive = get().activePageId;
    const stillExists = prevActive ? built.pages.find((p) => p.id === prevActive) : null;
    // Preserve loaded state, content, and local dirty flags from the previous
    // entries so that an unrelated tree refresh (e.g. after a cluster patch)
    // does not flicker the active editor back to a loading spinner or wipe
    // unsaved local edits. Pages new to the tree start with whatever
    // pageFromSummary initialized.
    const mergedPages = built.pages.map((next) => {
      const prev = prevById.get(next.id);
      if (!prev || !prev.loaded) return next;
      return {
        ...next,
        // Carry user-visible content/state forward.
        title: prev.dirty ? prev.title : next.title || prev.title,
        slug: prev.slug,
        frontmatter: prev.frontmatter,
        frontmatterText: prev.frontmatterText,
        bodyMarkdown: prev.bodyMarkdown,
        sourceBody: prev.sourceBody,
        content: prev.content,
        hash: prev.dirty ? prev.hash : next.hash || prev.hash,
        icon: prev.uiDirty ? prev.icon : next.icon ?? prev.icon,
        cover: prev.uiDirty ? prev.cover : next.cover ?? prev.cover,
        loaded: true,
        dirty: prev.dirty,
        fileDirty: prev.fileDirty,
        uiDirty: prev.uiDirty,
        saving: prev.saving,
        saveError: prev.saveError,
        sourceMode: prev.sourceMode,
        readOnly: next.readOnly,
      };
    });
    set({
      pages: mergedPages,
      sections: built.sections,
      hasFiles: built.hasFiles,
      hasBrain: built.hasBrain,
      canBootstrapBrain: built.canBootstrapBrain,
      reportModules: built.reportModules,
      projectName: built.projectName,
      projectRoot: built.projectRoot,
      activePageId: stillExists ? prevActive : built.firstPageId,
    });
  },

  loadPage: async (id, options = {}) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page || (page.loaded && !options.force)) return;
    if (page.kind && page.kind !== 'file' && page.kind !== 'clusterDetail') return;
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
              content: markdownToDoc(file.body || '', resolver, { filePath: p.path }),
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
    if (page?.kind && page.kind !== 'file' && page.kind !== 'clusterDetail') return false;
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
    if (!result.ok && result.reason === 'file-modified') {
      // External writer (e.g. cluster-sync regenerating sentinels) touched the file.
      // Reload silently instead of surfacing a red error banner.
      set((state) => ({
        pages: state.pages.map((p) =>
          p.id === id ? { ...p, saving: false, saveError: null, dirty: false, fileDirty: false } : p,
        ),
      }));
      void get().loadPage(id);
      return false;
    }
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
    await get().refreshProjectTree();
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
    await get().refreshProjectTree();
    const created = get().pages.find((p) => p.path === result.path);
    if (created) set({ activePageId: created.id });
    return created?.id || null;
  },
  createBrainSubpage: async (parentPath: string, title = 'Nova subpágina') => {
    const result = await apiFetch(get().token, '/api/project/file/create', {
      method: 'POST',
      body: JSON.stringify({ kind: 'brain-subpage', title, parentPath }),
    });
    if (!result.ok) return null;
    await get().refreshProjectTree();
    const created = get().pages.find((p) => p.path === result.path);
    if (created) set({ activePageId: created.id });
    return created?.id || null;
  },
  openReportPage: (report) => {
    if (!report.path.startsWith(`${REPORT_DIR_NAME}/`)) return null;
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
        REPORT_DIR_NAME,
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
    if (page?.kind && page.kind !== 'file' && page.kind !== 'clusterDetail') return false;
    if (page?.path.startsWith(`${REPORT_DIR_NAME}/`)) return false;
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
    await get().refreshProjectTree();
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
  setActivePage: async (activePageId) => {
    const state = get();
    const prevId = state.activePageId;
    if (prevId && prevId !== activePageId) {
      const prevPage = state.pages.find((p) => p.id === prevId);
      if (prevPage?.dirty && !prevPage.saving) {
        try {
          await state.savePage(prevId, { silent: true });
        } catch {
          // swallow — don't block navigation; dirty flag persists
        }
      }
    }
    set({ activePageId });
  },
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
              content: sourceMode ? p.content : markdownToDoc(p.sourceBody, mentionResolver(s.pages), { filePath: p.path }),
            }
          : p
      ),
    })),
}));
