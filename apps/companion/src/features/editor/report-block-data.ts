import YAML from 'yaml';

export type ReportBlockKind = 'agentic-kpis' | 'agentic-chart' | 'agentic-table';

export interface ReportScoreResult {
  score: number;
  grade: string;
  totalWeight: number;
  pointsAwarded: number;
  lostPoints: number;
}

export interface NormalizedColumn {
  key: string;
  label: string;
}

export interface NormalizedTable {
  columns: NormalizedColumn[];
  rows: string[][];
}

export function parseReportBlockPayload(text: string): any {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Legacy reports may be JSON, new reports are YAML.
  }
  try {
    return YAML.parse(raw);
  } catch {
    return null;
  }
}

export function serializeReportBlockPayload(value: any): string {
  return YAML.stringify(value ?? null, { lineWidth: 0 }).replace(/\s+$/, '');
}

export function kpiItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.kpis)) return payload.kpis;
  return [];
}

export function withKpiItems(payload: any, items: any[]) {
  if (Array.isArray(payload)) return items;
  return { version: 1, ...(payload && typeof payload === 'object' ? payload : {}), items };
}

function normalizeKey(value: string, index: number) {
  const key = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return key || `c${index}`;
}

export function normalizeTable(payload: any): NormalizedTable {
  const rawColumns = Array.isArray(payload?.columns) ? payload.columns : [];
  const columns = rawColumns.map((column: any, index: number) => {
    if (column && typeof column === 'object') {
      const label = String(column.label ?? column.title ?? column.name ?? column.key ?? `Coluna ${index + 1}`);
      return { key: String(column.key || normalizeKey(label, index)), label };
    }
    const label = String(column ?? `Coluna ${index + 1}`);
    return { key: `c${index}`, label };
  });
  const rawRows = Array.isArray(payload?.rows) ? payload.rows : [];
  const rows = rawRows.map((row: any) => {
    if (Array.isArray(row)) return columns.map((_column: NormalizedColumn, index: number) => String(row[index] ?? ''));
    if (row && typeof row === 'object') return columns.map((column: NormalizedColumn) => String(row[column.key] ?? ''));
    return columns.map((_column: NormalizedColumn, index: number) => (index === 0 ? String(row ?? '') : ''));
  });
  return { columns, rows };
}

export function withTableCell(payload: any, rowIndex: number, columnIndex: number, value: string) {
  const table = normalizeTable(payload);
  const rows = table.rows.map((row, r) => row.map((cell, c) => (r === rowIndex && c === columnIndex ? value : cell)));
  return tableToPayload(payload, table.columns, rows);
}

export function tableToPayload(payload: any, columns: NormalizedColumn[], rows: string[][]) {
  return {
    version: 1,
    ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    columns: columns.map((column) => ({ key: column.key, label: column.label })),
    rows: rows.map((row) =>
      Object.fromEntries(columns.map((column, index) => [column.key, row[index] ?? '']))
    ),
  };
}

export function chartLabels(payload: any): string[] {
  const labels = payload?.data?.labels;
  return Array.isArray(labels) ? labels.map((label) => String(label ?? '')) : [];
}

export function chartValues(payload: any): number[] {
  const values = payload?.data?.datasets?.[0]?.data;
  return Array.isArray(values) ? values.map((value) => Number(value) || 0) : [];
}

export function withChartPoint(payload: any, index: number, patch: { label?: string; value?: string }) {
  const labels = chartLabels(payload);
  const values = chartValues(payload);
  if (patch.label !== undefined) labels[index] = patch.label;
  if (patch.value !== undefined) values[index] = Number(patch.value) || 0;
  const datasets = Array.isArray(payload?.data?.datasets) ? [...payload.data.datasets] : [{ data: [] }];
  datasets[0] = { ...(datasets[0] || {}), data: values };
  return {
    version: 1,
    ...(payload && typeof payload === 'object' ? payload : {}),
    data: {
      ...(payload?.data || {}),
      labels,
      datasets,
    },
  };
}

function normalizedLabel(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function numberFromCell(value: unknown) {
  const match = String(value ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function columnIndex(columns: NormalizedColumn[], candidates: string[]) {
  return columns.findIndex((column) => {
    const label = normalizedLabel(`${column.label} ${column.key}`);
    return candidates.some((candidate) => label.includes(candidate));
  });
}

export function calculateScoreFromTable(payload: any): ReportScoreResult | null {
  const table = normalizeTable(payload);
  const weightIndex = columnIndex(table.columns, ['peso', 'weight']);
  const pointsIndex = columnIndex(table.columns, ['pontos', 'points']);
  const lossIndex = columnIndex(table.columns, ['perda', 'loss']);
  if (weightIndex < 0 || pointsIndex < 0) return null;
  const totalWeight = table.rows.reduce((sum, row) => sum + numberFromCell(row[weightIndex]), 0);
  const pointsAwarded = table.rows.reduce((sum, row) => sum + numberFromCell(row[pointsIndex]), 0);
  const lostPoints =
    lossIndex >= 0
      ? table.rows.reduce((sum, row) => sum + numberFromCell(row[lossIndex]), 0)
      : Math.max(0, totalWeight - pointsAwarded);
  if (!totalWeight) return null;
  const score = Math.round((pointsAwarded / totalWeight) * 100);
  return {
    score,
    grade: gradeForScore(score),
    totalWeight,
    pointsAwarded,
    lostPoints,
  };
}

export function isCalculationTable(payload: any) {
  return calculateScoreFromTable(payload) !== null;
}

export function gradeForScore(score: number) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function patchKpiPayloadForScore(payload: any, result: ReportScoreResult) {
  const items = kpiItems(payload).map((item) => {
    const label = normalizedLabel(item?.label);
    if (label.includes('score')) return { ...item, value: `${result.score}/100`, detail: `Grade ${result.grade}` };
    if (label.includes('pontos') || label.includes('points')) {
      const pt = label.includes('pontos');
      return {
        ...item,
        value: `${result.pointsAwarded}/${result.totalWeight}`,
        detail: pt ? `${result.lostPoints} pontos perdidos` : `${result.lostPoints} points lost`,
      };
    }
    return item;
  });
  return withKpiItems(payload, items);
}

export function patchChartPayloadForScore(payload: any, result: ReportScoreResult) {
  const title = normalizedLabel(payload?.title);
  const datasetLabel = normalizedLabel(payload?.data?.datasets?.[0]?.label);
  if (!title.includes('score') && !datasetLabel.includes('score')) return payload;
  const datasets = Array.isArray(payload?.data?.datasets) ? [...payload.data.datasets] : [{ data: [] }];
  datasets[0] = { ...(datasets[0] || {}), data: [result.pointsAwarded, result.lostPoints] };
  return {
    version: 1,
    ...(payload && typeof payload === 'object' ? payload : {}),
    data: {
      ...(payload?.data || {}),
      datasets,
    },
  };
}
