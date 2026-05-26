export const CONTRACT_VERSION = 1;

export const SENTINELS = {
  contentBegin: "<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->",
  contentEnd: "<!-- END cluster-content-table:auto -->",
  indexBegin: "<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->",
  indexEnd: "<!-- END cluster-index-table:auto -->",
} as const;

export type ClusterStatus = "drafting" | "proposed" | "active" | "archived";
export type Origem = "blog" | "linkedin" | "podcast" | "outros";
export type Papel = "pilar" | "satelite";
export type Intent =
  | "informational"
  | "transactional"
  | "comparative"
  | "navigational"
  | string;
export type EditorialStatus = "draft" | "in-review" | "approved" | "published";

export const INTENT_OPTIONS: ReadonlyArray<{ value: Intent; label_pt: string; label_en: string }> = [
  { value: "informational", label_pt: "Informacional", label_en: "Informational" },
  { value: "transactional", label_pt: "Transacional", label_en: "Transactional" },
  { value: "comparative", label_pt: "Comparativo", label_en: "Comparative" },
  { value: "navigational", label_pt: "Navegacional", label_en: "Navigational" },
];

export const EDITORIAL_STATUS_OPTIONS: ReadonlyArray<{ value: EditorialStatus; label_pt: string; label_en: string }> = [
  { value: "draft", label_pt: "Rascunho", label_en: "Draft" },
  { value: "in-review", label_pt: "Em revisão", label_en: "In review" },
  { value: "approved", label_pt: "Aprovado", label_en: "Approved" },
  { value: "published", label_pt: "Publicado", label_en: "Published" },
];

export interface PilarSpec {
  slug: string;
  keyword?: string | null;
  intent?: Intent | null;
  volume?: number | null;
  volume_source?: string | null;
}

export interface PlannedSatellite {
  slug: string;
  keyword?: string | null;
  intent?: Intent | null;
  volume?: number | null;
  volume_source?: string | null;
  papel?: Papel;
  note?: string | null;
}

export interface SateliteOverride {
  display_title?: string;
  keyword?: string | null;
  intent?: Intent | null;
  volume?: number | null;
  volume_source?: string | null;
}

export interface ClusterStats {
  publicados?: number;
  planejados?: number;
  updated?: string;
}

export interface ClusterYaml {
  contract_version?: number;
  slug: string;
  nome: string;
  area?: string;
  area_nome?: string;
  status: ClusterStatus;
  tese?: string;
  context?: string;
  icon?: string;
  pilar?: PilarSpec | null;
  planned_satellites?: PlannedSatellite[];
  satelite_overrides?: Record<string, SateliteOverride>;
  stats?: ClusterStats;
  provenance?: Record<string, unknown>;
  evidence?: unknown[];
}

export interface ContentFrontmatter {
  contract_version?: number;
  title?: string;
  slug?: string;
  published_at?: string;
  source_url?: string | null;
  origem?: Origem;
  clusters?: string[];
  papel?: Record<string, Papel>;
  [key: string]: unknown;
}

export interface ContentRecord {
  slug: string;
  origem: Origem;
  filePath: string;
  relPath: string;
  fm: ContentFrontmatter;
  mtimeMs: number;
}

export interface ClusterRecord {
  slug: string;
  filePath: string;
  yaml: ClusterYaml;
}

export type LintSeverity = "warn" | "block";

export interface Lint {
  code: string;
  severity: LintSeverity;
  message: string;
  context: Record<string, unknown>;
}

export interface SyncOptions {
  root: string;
  cluster?: string;
  check?: boolean;
  dryRun?: boolean;
  language?: "pt-BR" | "en";
  now?: () => string;
  verbose?: boolean;
}

export interface SyncResult {
  ok: boolean;
  exitCode: number;
  changedFiles: string[];
  noop: boolean;
  lints: Lint[];
  stats: {
    clustersConsidered: number;
    contentsConsidered: number;
    durationMs: number;
  };
}
