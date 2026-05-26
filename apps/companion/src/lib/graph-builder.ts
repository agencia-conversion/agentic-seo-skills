import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildBacklinkIndex, type LinkKind } from './backlink-index';
import { parseFrontmatter } from './project-files';
import { REPORT_DIR_NAME } from '../../../../shared/report-modules';

export type GraphSection = 'brain' | 'conteudos' | 'workbench' | 'analyses' | 'other';

export interface GraphNode {
  id: string;
  label: string;
  section: GraphSection;
  incomingCount: number;
  outgoingCount: number;
  broken: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: LinkKind;
  broken: boolean;
}

export interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sections: { id: GraphSection; count: number }[];
  totalBroken: number;
}

function sectionFor(path: string): GraphSection {
  if (path.startsWith('brain/')) return 'brain';
  if (path.startsWith('conteudos/')) return 'conteudos';
  if (path.startsWith('workbench/')) return 'workbench';
  if (path.startsWith(`${REPORT_DIR_NAME}/`)) return 'analyses';
  return 'other';
}

function titleFor(root: string, rel: string): string {
  const abs = join(root, rel);
  if (!existsSync(abs)) return rel;
  try {
    const raw = readFileSync(abs, 'utf8');
    const { data } = parseFrontmatter(raw);
    const title = String(data.title || '').replace(/^["']|["']$/g, '').trim();
    if (title) return title;
  } catch {
    /* ignore */
  }
  return rel.split('/').pop()!.replace(/\.md$/, '');
}

function normalizeRoot(projectRoot?: string | null) {
  return resolve(projectRoot || process.env.AGENTIC_SEO_PROJECT_ROOT || 'project');
}

export function buildGraph(projectRoot?: string | null): GraphPayload {
  const root = normalizeRoot(projectRoot);
  const index = buildBacklinkIndex(root);
  const incomingMap = new Map<string, number>();
  const outgoingMap = new Map<string, number>();
  const brokenSet = new Set<string>();
  const edges: GraphEdge[] = [];
  let edgeId = 0;

  for (const [source, links] of index.outgoing) {
    outgoingMap.set(source, (outgoingMap.get(source) || 0) + links.length);
    for (const link of links) {
      if (link.resolved) {
        incomingMap.set(link.resolved, (incomingMap.get(link.resolved) || 0) + 1);
        edges.push({
          id: `e-${edgeId++}`,
          source,
          target: link.resolved,
          kind: link.type,
          broken: false,
        });
      } else if (link.type !== 'markdown') {
        // Broken wikilink — represented as edge to a synthetic broken target id.
        const target = `__broken__/${link.rawTarget}`;
        brokenSet.add(target);
        edges.push({
          id: `e-${edgeId++}`,
          source,
          target,
          kind: link.type,
          broken: true,
        });
      }
    }
  }

  const nodes: GraphNode[] = [];
  for (const rel of index.files) {
    nodes.push({
      id: rel,
      label: titleFor(root, rel),
      section: sectionFor(rel),
      incomingCount: incomingMap.get(rel) || 0,
      outgoingCount: outgoingMap.get(rel) || 0,
      broken: false,
    });
  }
  for (const brokenId of brokenSet) {
    nodes.push({
      id: brokenId,
      label: brokenId.replace('__broken__/', ''),
      section: 'other',
      incomingCount: 1,
      outgoingCount: 0,
      broken: true,
    });
  }

  const sectionCounts = new Map<GraphSection, number>();
  for (const node of nodes) {
    sectionCounts.set(node.section, (sectionCounts.get(node.section) || 0) + 1);
  }

  return {
    nodes,
    edges,
    sections: Array.from(sectionCounts.entries()).map(([id, count]) => ({ id, count })),
    totalBroken: brokenSet.size,
  };
}
