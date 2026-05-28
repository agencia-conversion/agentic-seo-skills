// Auto-block registry for dynamic Markdown tables backed by structured sources.
// Each block type renders a Markdown table (or list) into a YAML literal scalar
// inside an `agentic-<type>` code fence. Sync replaces the materialized field
// when source data changes; user-controlled params stay intact.

import type { ClusterRecord, ContentRecord, Lint } from "./cluster-types";
import type { ClusterLabels, Language } from "./cluster-labels";

export interface AutoBlockInputs {
  clusters: ClusterRecord[];
  clusterBySlug: Map<string, ClusterRecord>;
  contents: ContentRecord[];
  contentsByCluster: Map<string, ContentRecord[]>;
  orphanContents: ContentRecord[];
  labels: ClusterLabels;
  language: Language;
  projectRoot: string;
  pluginRoot: string;
  now: string;
}

export interface AutoBlockRenderResult {
  materialized: string;
  fingerprint: string;
  lints?: Lint[];
}

export interface AutoBlockParseError {
  error: string;
}

export interface MutationDescriptor {
  filePath: string;
  source: "cluster-yaml" | "content-frontmatter";
  fieldPath: string;
  before: unknown;
  after: unknown;
}

export type RowMutationPolicy = "reject" | "allow-add-planned" | "allow-remove-planned";

export interface RowMutationContext {
  rowKey: string;
  action: "move-to-block" | "reorder" | "remove" | "add";
  targetBlockId?: string;
  targetParams?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}

export interface ColumnDef<P = Record<string, unknown>, Row = unknown> {
  key: string;
  label: (labels: ClusterLabels) => string;
  read: (row: Row, params: P, inputs: AutoBlockInputs) => string;
  derived?: boolean;
  write?: (
    row: Row,
    newValue: unknown,
    params: P,
    inputs: AutoBlockInputs,
  ) => MutationDescriptor | null;
  parseCell?: (cell: string) => unknown;
}

export interface AutoBlockType<P = Record<string, unknown>, Row = unknown> {
  name: string;
  version: number;
  parseParams(yaml: Record<string, unknown>): P | AutoBlockParseError;
  render(params: P, inputs: AutoBlockInputs): AutoBlockRenderResult;
  // Declarative model — Phase 4 (bidirectional sync) uses these.
  // `rows` + `rowKey` + `columns` together fully describe the table; the
  // generic renderer can re-derive `render()` from them.
  rows?: (params: P, inputs: AutoBlockInputs) => Row[];
  rowKey?: (row: Row, params: P, inputs: AutoBlockInputs) => string;
  columns?: ColumnDef<P, Row>[];
  rowMutationPolicy?: RowMutationPolicy;
  rowMutation?: (
    params: P,
    ctx: RowMutationContext,
    inputs: AutoBlockInputs,
  ) => MutationDescriptor | null;
}

const registry = new Map<string, AutoBlockType>();

export function registerAutoBlockType<P, Row>(type: AutoBlockType<P, Row>): void {
  registry.set(type.name, type as unknown as AutoBlockType);
}

export function getAutoBlockType(name: string): AutoBlockType | undefined {
  return registry.get(name);
}

export function listAutoBlockTypes(): string[] {
  return Array.from(registry.keys());
}

export function isAutoBlockFenceName(language: string): boolean {
  return language.startsWith("agentic-");
}
