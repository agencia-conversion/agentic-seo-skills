import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import {
  chartLabels,
  chartValues,
  kpiItems,
  parseReportBlockPayload,
  serializeReportBlockPayload,
  withChartPoint,
  withKpiItems,
} from './report-block-data';

function commit(updateAttributes: (attrs: Record<string, any>) => void, nextPayload: any) {
  updateAttributes({ data: serializeReportBlockPayload(nextPayload) });
}

function ReportBlockView(props: any) {
  const { node, updateAttributes, extension } = props;
  const kind = String(node.attrs.kind || '');
  const data = parseReportBlockPayload(String(node.attrs.data || ''));
  const locale = String(extension?.options?.locale || 'pt-BR');
  if (kind === 'agentic-kpis') return <Kpis data={data} updateAttributes={updateAttributes} />;
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

function reportUiText(locale: string, key: 'emptyChart') {
  const en: Record<typeof key, string> = {
    emptyChart: 'No data to display.',
  };
  const pt: Record<typeof key, string> = {
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
