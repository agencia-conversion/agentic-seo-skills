'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from '@/features/workspace/sidebar';
import { useWorkspace } from '@/features/workspace/store';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

type GraphSection = 'brain' | 'conteudos' | 'workbench' | 'relatorios' | 'other';

interface GraphNode {
  id: string;
  label: string;
  section: GraphSection;
  incomingCount: number;
  outgoingCount: number;
  broken: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: 'wikilink' | 'embed' | 'markdown';
  broken: boolean;
}

interface GraphPayload {
  ok: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  sections: { id: GraphSection; count: number }[];
  totalBroken: number;
}

const SECTION_COLORS: Record<GraphSection, string> = {
  brain: '#3b82f6',
  conteudos: '#22c55e',
  workbench: '#9ca3af',
  relatorios: '#f97316',
  other: '#ef4444',
};

const ALL_SECTIONS: GraphSection[] = ['brain', 'conteudos', 'workbench', 'relatorios', 'other'];

export default function GraphPage() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const initializeProject = useWorkspace((s) => s.initializeProject);
  const storeToken = useWorkspace((s) => s.token);
  const pages = useWorkspace((s) => s.pages);
  const buildPagePath = usePagePath();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<any>(null);
  const [data, setData] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSections, setActiveSections] = useState<Set<GraphSection>>(new Set(ALL_SECTIONS));

  useEffect(() => {
    if (!token || storeToken === token) return;
    initializeProject(token).catch((err) => setError(err?.message || 'init failed'));
  }, [initializeProject, storeToken, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch(`/api/project/graph?token=${encodeURIComponent(token)}`, {
      headers: { 'x-companion-token': token },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload: GraphPayload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = useMemo(() => {
    if (!data) return null;
    const allowedSections = new Set(activeSections);
    const nodes = data.nodes.filter((n) => allowedSections.has(n.section));
    const allowedIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter((e) => allowedIds.has(e.source) && allowedIds.has(e.target));
    return { nodes, edges };
  }, [data, activeSections]);

  useEffect(() => {
    if (!filtered || !containerRef.current) return;
    let mounted = true;
    let cy: any = null;
    (async () => {
      const cytoscape = (await import('cytoscape')).default;
      if (!mounted || !containerRef.current) return;
      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...filtered.nodes.map((n) => ({
            data: { id: n.id, label: n.label, section: n.section, broken: n.broken },
          })),
          ...filtered.edges.map((e) => ({
            data: { id: e.id, source: e.source, target: e.target, broken: e.broken, kind: e.kind },
          })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': ((ele: any) => SECTION_COLORS[ele.data('section') as GraphSection] || '#9ca3af') as any,
              label: 'data(label)',
              'font-size': 4.5,
              color: '#1c1c1e',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 2 as any,
              'text-background-color': '#ffffff',
              'text-background-opacity': 0.7,
              'text-background-padding': 1 as any,
              width: 14,
              height: 14,
            },
          },
          {
            selector: 'node[broken = "true"]',
            style: {
              'background-color': '#ef4444',
              'border-color': '#dc2626',
              'border-width': 1,
              shape: 'diamond',
            },
          },
          {
            selector: 'edge',
            style: {
              width: 1,
              'line-color': '#cbd5e1',
              'target-arrow-color': '#cbd5e1',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              opacity: 0.6,
            },
          },
          {
            selector: 'edge[broken = "true"]',
            style: {
              'line-style': 'dashed',
              'line-color': '#fca5a5',
              'target-arrow-color': '#fca5a5',
            },
          },
        ],
        layout: { name: 'cose', animate: false, padding: 30, nodeRepulsion: () => 8000 },
      });
      cy.on('tap', 'node', (evt: any) => {
        const id = evt.target.id();
        if (id.startsWith('__broken__')) return;
        const page = pages.find((p) => p.path === id);
        if (page) router.push(buildPagePath(page.slug));
      });
      cyRef.current = cy;
    })();
    return () => {
      mounted = false;
      if (cy) cy.destroy();
      cyRef.current = null;
    };
  }, [filtered, pages, router, buildPagePath]);

  const toggleSection = (section: GraphSection) => {
    setActiveSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-12 px-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md z-20 select-none">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded hover:bg-notion-hover text-notion-text-muted hover:text-notion-text transition-colors"
            aria-label={t('common.back') || 'Voltar'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-medium text-notion-text">{t('graph.title') || 'Graph view'}</h1>
          {data && (
            <span data-testid="graph-counts" className="text-xs text-notion-text-muted">
              {data.nodes.length} nós · {data.edges.length} arestas
              {data.totalBroken > 0 && ` · ${data.totalBroken} quebrados`}
            </span>
          )}
        </header>

        {error && (
          <div data-testid="graph-error" className="m-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-44 border-r border-notion-border p-3 space-y-2" data-testid="graph-filters">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-notion-text-muted">Seções</div>
            {data?.sections.map((s) => (
              <button
                key={s.id}
                data-testid="graph-section-toggle"
                data-section={s.id}
                data-active={activeSections.has(s.id) ? 'true' : 'false'}
                onClick={() => toggleSection(s.id)}
                className="w-full flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-notion-hover"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: SECTION_COLORS[s.id] || '#9ca3af', opacity: activeSections.has(s.id) ? 1 : 0.3 }}
                  />
                  <span className={activeSections.has(s.id) ? 'text-notion-text' : 'text-notion-text-muted line-through'}>
                    {s.id}
                  </span>
                </span>
                <span className="text-[10px] text-notion-text-muted tabular-nums">{s.count}</span>
              </button>
            ))}
          </aside>
          <div data-testid="graph-canvas" ref={containerRef} className="flex-1 bg-notion-sidebar/20" />
        </div>
      </main>
    </div>
  );
}
