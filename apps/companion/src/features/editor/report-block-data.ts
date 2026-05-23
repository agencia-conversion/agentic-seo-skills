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
  role?: string;
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

function uniqueKey(base: string, used: Set<string>) {
  const clean = normalizeKey(base, used.size);
  let candidate = clean;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${clean}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function normalizeTable(payload: any): NormalizedTable {
  const rawColumns = Array.isArray(payload?.columns) ? payload.columns : [];
  const usedKeys = new Set<string>();
  const columns = rawColumns.map((column: any, index: number) => {
    if (column && typeof column === 'object') {
      const label = String(column.label ?? column.title ?? column.name ?? column.key ?? `Coluna ${index + 1}`);
      return {
        key: uniqueKey(String(column.key || label), usedKeys),
        label,
        ...(column.role ? { role: String(column.role) } : {}),
      };
    }
    const label = String(column ?? `Coluna ${index + 1}`);
    return { key: uniqueKey(`c${index}`, usedKeys), label };
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

export function ensureUniqueColumns(columns: NormalizedColumn[]): NormalizedColumn[] {
  const usedKeys = new Set<string>();
  return columns.map((column, index) => ({
    ...column,
    key: uniqueKey(column.key || column.label || `c${index}`, usedKeys),
    label: column.label || `Coluna ${index + 1}`,
  }));
}

export function tableToPayload(payload: any, columns: NormalizedColumn[], rows: string[][]) {
  const safeColumns = ensureUniqueColumns(columns);
  return {
    version: 1,
    ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
    columns: safeColumns.map((column) => ({
      key: column.key,
      label: column.label,
      ...(column.role ? { role: column.role } : {}),
    })),
    rows: rows.map((row) =>
      Object.fromEntries(safeColumns.map((column, index) => [column.key, row[index] ?? '']))
    ),
  };
}

export function withColumnLabel(payload: any, columnIndex: number, label: string) {
  const table = normalizeTable(payload);
  const columns = table.columns.map((column, index) => (index === columnIndex ? { ...column, label } : column));
  return tableToPayload(payload, columns, table.rows);
}

export function withTableRow(payload: any, rowIndex?: number, values?: string[]) {
  const table = normalizeTable(payload);
  const nextRow = table.columns.map((_, index) => values?.[index] ?? '');
  const insertAt = Math.max(0, Math.min(rowIndex ?? table.rows.length, table.rows.length));
  const rows = [...table.rows.slice(0, insertAt), nextRow, ...table.rows.slice(insertAt)];
  return tableToPayload(payload, table.columns, rows);
}

export function withoutTableRow(payload: any, rowIndex: number) {
  const table = normalizeTable(payload);
  return tableToPayload(payload, table.columns, table.rows.filter((_, index) => index !== rowIndex));
}

export function duplicateTableRow(payload: any, rowIndex: number) {
  const table = normalizeTable(payload);
  const source = table.rows[rowIndex] || table.columns.map(() => '');
  const rows = [...table.rows.slice(0, rowIndex + 1), [...source], ...table.rows.slice(rowIndex + 1)];
  return tableToPayload(payload, table.columns, rows);
}

export function withTableColumn(payload: any, columnIndex?: number, label = 'Coluna') {
  const table = normalizeTable(payload);
  const used = new Set(table.columns.map((column) => column.key));
  const key = uniqueKey(label, used);
  const insertAt = Math.max(0, Math.min(columnIndex ?? table.columns.length, table.columns.length));
  const columns = [
    ...table.columns.slice(0, insertAt),
    { key, label },
    ...table.columns.slice(insertAt),
  ];
  const rows = table.rows.map((row) => [...row.slice(0, insertAt), '', ...row.slice(insertAt)]);
  return tableToPayload(payload, columns, rows);
}

export function withoutTableColumn(payload: any, columnIndex: number) {
  const table = normalizeTable(payload);
  if (table.columns.length <= 1) return tableToPayload(payload, table.columns, table.rows);
  const columns = table.columns.filter((_, index) => index !== columnIndex);
  const rows = table.rows.map((row) => row.filter((_, index) => index !== columnIndex));
  return tableToPayload(payload, columns, rows);
}

export function duplicateTableColumn(payload: any, columnIndex: number) {
  const table = normalizeTable(payload);
  const source = table.columns[columnIndex];
  if (!source) return tableToPayload(payload, table.columns, table.rows);
  const used = new Set(table.columns.map((column) => column.key));
  const copy = {
    ...source,
    key: uniqueKey(`${source.key}_copy`, used),
    label: `${source.label} copy`,
  };
  const insertAt = columnIndex + 1;
  const columns = [...table.columns.slice(0, insertAt), copy, ...table.columns.slice(insertAt)];
  const rows = table.rows.map((row) => [...row.slice(0, insertAt), row[columnIndex] ?? '', ...row.slice(insertAt)]);
  return tableToPayload(payload, columns, rows);
}

export function withTableGridPaste(payload: any, startRow: number, startColumn: number, grid: string[][]) {
  const table = normalizeTable(payload);
  if (!grid.length || !grid[0]?.length) return tableToPayload(payload, table.columns, table.rows);
  let columns = [...table.columns];
  while (columns.length < startColumn + grid[0].length) {
    const used = new Set(columns.map((column) => column.key));
    columns.push({ key: uniqueKey(`col_${columns.length + 1}`, used), label: `Coluna ${columns.length + 1}` });
  }
  const rows = table.rows.map((row) => [...row]);
  while (rows.length < startRow + grid.length) rows.push(columns.map(() => ''));
  for (let r = 0; r < grid.length; r += 1) {
    for (let c = 0; c < grid[r].length; c += 1) {
      rows[startRow + r][startColumn + c] = grid[r][c] ?? '';
    }
  }
  return tableToPayload(payload, columns, rows.map((row) => columns.map((_, index) => row[index] ?? '')));
}

export function parseTablePasteGrid(text: string): string[][] | null {
  const normalized = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '');
  if (!/[\t\n,]/.test(normalized)) return null;
  if (normalized.includes('\t')) return normalized.split('\n').map((line) => line.split('\t'));
  if (!normalized.includes(',')) return normalized.split('\n').map((line) => [line]);

  const rows: string[][] = [[]];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      rows[rows.length - 1].push(cell);
      cell = '';
      continue;
    }
    if (char === '\n' && !quoted) {
      rows[rows.length - 1].push(cell);
      rows.push([]);
      cell = '';
      continue;
    }
    cell += char;
  }
  rows[rows.length - 1].push(cell);
  return rows.filter((row) => row.some((value) => value !== ''));
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
    const label = normalizedLabel(`${column.role || ''} ${column.label} ${column.key}`);
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
