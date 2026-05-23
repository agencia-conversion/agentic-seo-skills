import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  calculateScoreFromTable,
  chartLabels,
  chartValues,
  isCalculationTable,
  kpiItems,
  normalizeTable,
  parseReportBlockPayload,
  patchChartPayloadForScore,
  patchKpiPayloadForScore,
  serializeReportBlockPayload,
  tableToPayload,
  withChartPoint,
  withKpiItems,
  withTableCell,
  type ReportScoreResult,
} from './report-block-data';

function commit(updateAttributes: (attrs: Record<string, any>) => void, nextPayload: any) {
  updateAttributes({ data: serializeReportBlockPayload(nextPayload) });
}

function patchDocumentScoreBlocks(editor: any, result: ReportScoreResult) {
  if (!editor?.state?.doc || !editor?.view) return;
  const tr = editor.state.tr;
  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.type?.name !== 'reportBlock') return;
    const kind = String(node.attrs?.kind || '');
    const payload = parseReportBlockPayload(String(node.attrs?.data || ''));
    let next = payload;
    if (kind === 'agentic-kpis') next = patchKpiPayloadForScore(payload, result);
    if (kind === 'agentic-chart') next = patchChartPayloadForScore(payload, result);
    if (next !== payload) {
      const data = serializeReportBlockPayload(next);
      if (data !== node.attrs?.data) tr.setNodeMarkup(pos, undefined, { ...node.attrs, data });
    }
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

function ReportBlockView(props: any) {
  const { node, updateAttributes, editor, extension } = props;
  const kind = String(node.attrs.kind || '');
  const data = parseReportBlockPayload(String(node.attrs.data || ''));
  const onScoreRecalculated = extension?.options?.onScoreRecalculated;
  const locale = String(extension?.options?.locale || 'pt-BR');
  if (kind === 'agentic-kpis') return <Kpis data={data} updateAttributes={updateAttributes} />;
  if (kind === 'agentic-table') {
    return (
      <DataTable
        data={data || {}}
        locale={locale}
        updateAttributes={updateAttributes}
        onRecalculate={(result) => {
          patchDocumentScoreBlocks(editor, result);
          onScoreRecalculated?.(result);
        }}
      />
    );
  }
  if (kind === 'agentic-chart') return <SimpleChart data={data || {}} updateAttributes={updateAttributes} locale={locale} />;
  return (
    <NodeViewWrapper contentEditable={false} className="rounded-md border border-dashed border-notion-border bg-notion-sidebar/60 p-3 text-xs text-notion-text-muted whitespace-pre-wrap">
      {node.attrs.data || ''}
    </NodeViewWrapper>
  );
}

function inputClass(extra = '') {
  return `w-full overflow-hidden rounded border border-transparent bg-transparent px-1 py-0.5 text-inherit outline-none hover:border-notion-border focus:border-notion-border focus:bg-background ${extra}`;
}

function reportUiText(locale: string, key: 'editableTable' | 'recalculate' | 'addRow' | 'removeRow' | 'emptyChart') {
  const en: Record<typeof key, string> = {
    editableTable: 'Editable table',
    recalculate: 'Recalculate',
    addRow: 'Add row',
    removeRow: 'Remove row',
    emptyChart: 'No data to display.',
  };
  const pt: Record<typeof key, string> = {
    editableTable: 'Tabela editável',
    recalculate: 'Recalcular',
    addRow: 'Adicionar linha',
    removeRow: 'Remover linha',
    emptyChart: 'Sem dados para exibir.',
  };
  return locale.startsWith('en') ? en[key] : pt[key];
}

function Kpis({ data, updateAttributes }: { data: any; updateAttributes: (attrs: Record<string, any>) => void }) {
  const items = kpiItems(data);
  const updateItem = (index: number, patch: Record<string, string>) => {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...(item || {}), ...patch } : item));
    commit(updateAttributes, withKpiItems(data, next));
  };
  return (
    <NodeViewWrapper contentEditable={false} data-agentic-report-block="agentic-kpis" className="my-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-notion-border bg-notion-sidebar px-3 py-2">
          <input
            aria-label="KPI label"
            value={String(item?.label ?? '')}
            onChange={(event) => updateItem(index, { label: event.target.value })}
            className={inputClass('text-[11px] uppercase text-notion-text-muted')}
          />
          <input
            aria-label="KPI value"
            value={String(item?.value ?? '')}
            onChange={(event) => updateItem(index, { value: event.target.value })}
            className={inputClass('mt-1 text-xl font-semibold text-notion-text')}
          />
          <input
            aria-label="KPI detail"
            value={String(item?.detail ?? '')}
            onChange={(event) => updateItem(index, { detail: event.target.value })}
            className={inputClass('mt-1 text-xs text-notion-text-muted')}
          />
        </div>
      ))}
    </NodeViewWrapper>
  );
}

function DataTable({
  data,
  locale,
  updateAttributes,
  onRecalculate,
}: {
  data: any;
  locale: string;
  updateAttributes: (attrs: Record<string, any>) => void;
  onRecalculate: (result: ReportScoreResult) => void;
}) {
  const table = normalizeTable(data);
  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    commit(updateAttributes, withTableCell(data, rowIndex, cellIndex, value));
  };
  const updateColumn = (columnIndex: number, label: string) => {
    const columns = table.columns.map((column, index) => (index === columnIndex ? { ...column, label } : column));
    commit(updateAttributes, tableToPayload(data, columns, table.rows));
  };
  const addRow = () => {
    commit(updateAttributes, tableToPayload(data, table.columns, [...table.rows, table.columns.map(() => '')]));
  };
  const removeRow = (rowIndex: number) => {
    commit(updateAttributes, tableToPayload(data, table.columns, table.rows.filter((_, index) => index !== rowIndex)));
  };
  const recalculate = () => {
    const result = calculateScoreFromTable(data);
    if (result) onRecalculate(result);
  };

  return (
    <NodeViewWrapper contentEditable={false} data-agentic-report-block="agentic-table" className="my-4 max-w-full rounded-md border border-notion-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-notion-border bg-notion-sidebar px-3 py-2">
        <div className="text-xs font-medium text-notion-text-muted">{reportUiText(locale, 'editableTable')}</div>
        <div className="flex items-center gap-1">
          {isCalculationTable(data) && (
            <button
              type="button"
              onClick={recalculate}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
              title={reportUiText(locale, 'recalculate')}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {reportUiText(locale, 'recalculate')}
            </button>
          )}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
            title={reportUiText(locale, 'addRow')}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <table className="hidden w-full table-fixed border-collapse text-sm sm:table">
        <thead className="bg-notion-sidebar text-left text-notion-text-muted">
          <tr>
            {table.columns.map((column, index) => (
              <th key={column.key} className="break-words px-3 py-2 font-medium whitespace-normal">
                <input
                  aria-label={`Column ${index + 1}`}
                  value={column.label}
                  onChange={(event) => updateColumn(index, event.target.value)}
                  className={inputClass('font-medium text-notion-text-muted')}
                />
              </th>
            ))}
            <th className="w-10 px-2 py-2" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-notion-border">
              {table.columns.map((column, cellIndex) => (
                <td key={column.key} className="break-words px-3 py-2 align-top text-notion-text whitespace-normal">
                  <textarea
                    aria-label={`${column.label} row ${rowIndex + 1}`}
                    value={row[cellIndex] ?? ''}
                    onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                    className={inputClass('min-h-8 resize-y leading-5 whitespace-normal')}
                  />
                </td>
              ))}
              <td className="align-top px-2 py-2">
                <button
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
                  title={reportUiText(locale, 'removeRow')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="divide-y divide-notion-border sm:hidden">
        {table.rows.map((row, rowIndex) => (
          <div key={rowIndex} className="space-y-3 p-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeRow(rowIndex)}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-notion-text-muted hover:bg-notion-hover hover:text-notion-text"
                title={reportUiText(locale, 'removeRow')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {table.columns.map((column, cellIndex) => (
              <label key={column.key} className="grid grid-cols-[minmax(90px,38%)_1fr] gap-2 text-sm">
                <span className="break-words text-xs font-medium text-notion-text-muted">{column.label}</span>
                <textarea
                  aria-label={`${column.label} row ${rowIndex + 1}`}
                  value={row[cellIndex] ?? ''}
                  onChange={(event) => updateCell(rowIndex, cellIndex, event.target.value)}
                  className={inputClass('min-h-8 resize-y text-notion-text whitespace-normal')}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

function SimpleChart({ data, updateAttributes, locale }: { data: any; updateAttributes: (attrs: Record<string, any>) => void; locale: string }) {
  const labels = chartLabels(data);
  const values = chartValues(data);
  const max = Math.max(...values, 1);
  const updateTitle = (value: string) => commit(updateAttributes, { version: 1, ...(data || {}), title: value });
  const updateDescription = (value: string) => commit(updateAttributes, { version: 1, ...(data || {}), description: value });
  return (
    <NodeViewWrapper contentEditable={false} data-agentic-report-block="agentic-chart" className="my-4 rounded-md border border-notion-border bg-notion-sidebar p-4">
      <div className="mb-3 space-y-1">
        <input
          aria-label="Chart title"
          value={String(data?.title ?? '')}
          onChange={(event) => updateTitle(event.target.value)}
          className={inputClass('text-sm font-medium text-notion-text')}
        />
        <input
          aria-label="Chart description"
          value={String(data?.description ?? '')}
          onChange={(event) => updateDescription(event.target.value)}
          className={inputClass('text-xs text-notion-text-muted')}
        />
      </div>
      <div className="space-y-2">
        {labels.length === 0 && <div className="text-sm text-notion-text-muted">{reportUiText(locale, 'emptyChart')}</div>}
        {labels.map((label, index) => {
          const value = values[index] || 0;
          return (
            <div key={index} className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-[minmax(100px,220px)_1fr_72px] sm:items-center">
              <input
                aria-label={`Chart label ${index + 1}`}
                value={String(label)}
                onChange={(event) => commit(updateAttributes, withChartPoint(data, index, { label: event.target.value }))}
                className={inputClass('text-notion-text-muted')}
              />
              <div className="h-2 overflow-hidden rounded bg-notion-active">
                <div className="h-full rounded bg-[#3a5bd9]" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
              </div>
              <input
                aria-label={`Chart value ${index + 1}`}
                value={String(value)}
                inputMode="numeric"
                onChange={(event) => commit(updateAttributes, withChartPoint(data, index, { value: event.target.value }))}
                className={inputClass('font-mono text-notion-text-muted')}
              />
            </div>
          );
        })}
      </div>
    </NodeViewWrapper>
  );
}

export const ReportBlock = Node.create({
  name: 'reportBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return {
      onScoreRecalculated: null,
      locale: 'pt-BR',
    };
  },

  addAttributes() {
    return {
      kind: { default: '' },
      data: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-agentic-report-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-agentic-report-block': node.attrs.kind,
      }),
      node.attrs.data || '',
    ];
  },

  renderText({ node }) {
    return node.attrs.data || '';
  },

  addNodeView() {
    return ReactNodeViewRenderer(ReportBlockView);
  },
});
