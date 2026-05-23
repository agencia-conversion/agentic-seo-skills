'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { selectedRect } from '@tiptap/pm/tables';
import { Columns3, Plus, RefreshCw, Rows3, Trash2 } from 'lucide-react';
import {
  calculateScoreFromTable,
  ensureUniqueColumns,
  parseReportBlockPayload,
  patchChartPayloadForScore,
  patchKpiPayloadForScore,
  serializeReportBlockPayload,
  type NormalizedColumn,
  type ReportScoreResult,
} from './report-block-data';

interface ReportTableMenuProps {
  editor: Editor | null;
  locale: string;
  onScoreRecalculated: (result: ReportScoreResult) => void;
}

function menuText(locale: string, pt: string, en: string) {
  return locale.startsWith('en') ? en : pt;
}

function actionButton(label: string, onClick: () => void, icon: ReactNode, disabled = false) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded px-2 text-xs text-notion-text-muted hover:bg-notion-hover hover:text-notion-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function activeTableInfo(editor: Editor | null) {
  if (!editor?.state) return null;
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      return { node, pos: depth > 0 ? $from.before(depth) : 0 };
    }
  }
  return null;
}

function activeColumnIndex(editor: Editor | null) {
  if (!editor?.state || !editor.isActive('table')) return 0;
  try {
    return selectedRect(editor.state).left;
  } catch {
    return 0;
  }
}

function textFromCell(cell: any) {
  const chunks: string[] = [];
  cell.forEach((block: any) => {
    chunks.push(block.textContent || '');
  });
  return chunks.join('\n');
}

function firstRowCells(node: any) {
  const firstRow = node?.firstChild;
  const cells: any[] = [];
  firstRow?.forEach((cell: any) => cells.push(cell));
  return cells;
}

function activeTableColumnCount(editor: Editor | null) {
  return firstRowCells(activeTableInfo(editor)?.node).length;
}

function tableColumns(editor: Editor | null): NormalizedColumn[] {
  const node = activeTableInfo(editor)?.node;
  const existing = Array.isArray(node?.attrs?.columns) ? node.attrs.columns : [];
  const fallbackHeaders = firstRowCells(node).map((cell) => textFromCell(cell));
  return ensureUniqueColumns(
    (existing.length ? existing : fallbackHeaders).map((column: any, index: number) => ({
      ...(typeof column === 'object' ? column : {}),
      key: String(column?.key || `c${index}`),
      label: String(column?.label || fallbackHeaders[index] || `Coluna ${index + 1}`),
      ...(column?.role ? { role: String(column.role) } : {}),
    })),
  );
}

function updateActiveTableColumns(editor: Editor, columns: NormalizedColumn[]) {
  const info = activeTableInfo(editor);
  if (!info?.node.attrs?.agenticReport) return;
  const nextColumns = ensureUniqueColumns(columns).map((column) => ({
    key: column.key,
    label: column.label,
    ...(column.role ? { role: column.role } : {}),
  }));
  const tr = editor.state.tr.setNodeMarkup(info.pos, undefined, {
    ...info.node.attrs,
    columns: nextColumns,
  });
  editor.view.dispatch(tr);
}

function newColumn(columns: NormalizedColumn[], index: number, locale: string) {
  return ensureUniqueColumns([
    ...columns,
    {
      key: `col_${columns.length + 1}`,
      label: menuText(locale, 'Nova coluna', 'New column'),
    },
  ])[columns.length] || { key: `col_${index + 1}`, label: menuText(locale, 'Nova coluna', 'New column') };
}

function payloadFromActiveTable(editor: Editor | null) {
  const info = activeTableInfo(editor);
  const node = info?.node;
  if (!node || !node.attrs?.agenticReport) return null;
  const rows: string[][] = [];
  node.forEach((row: any) => {
    const cells: string[] = [];
    row.forEach((cell: any) => cells.push(textFromCell(cell)));
    rows.push(cells);
  });
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);
  const existingColumns = Array.isArray(node.attrs.columns) ? node.attrs.columns : [];
  const columns = headers.map((label, index) => {
    const existing = existingColumns[index] || {};
    return {
      key: String(existing.key || `c${index}`),
      label,
      ...(existing.role ? { role: String(existing.role) } : {}),
    };
  });
  return {
    version: 1,
    ...(node.attrs.summary ? { summary: node.attrs.summary } : {}),
    ...(node.attrs.source_refs ? { source_refs: node.attrs.source_refs } : {}),
    columns,
    rows: dataRows.map((row) => Object.fromEntries(columns.map((column, index) => [column.key, row[index] ?? '']))),
  };
}

function patchDocumentScoreBlocks(editor: Editor, result: ReportScoreResult) {
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

export function ReportTableMenu({ editor, locale, onScoreRecalculated }: ReportTableMenuProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const update = () => setActive(editor.isActive('table'));
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  const recalculate = useCallback(() => {
    if (!editor) return;
    const result = calculateScoreFromTable(payloadFromActiveTable(editor));
    if (!result) return;
    patchDocumentScoreBlocks(editor, result);
    onScoreRecalculated(result);
  }, [editor, onScoreRecalculated]);

  if (!editor || !active) return null;
  const selectedColumn = activeColumnIndex(editor);
  const canDeleteColumn = activeTableColumnCount(editor) > 1;
  const addColumnBefore = () => {
    const before = tableColumns(editor);
    const insertAt = activeColumnIndex(editor);
    if (editor.chain().focus().addColumnBefore().run()) {
      updateActiveTableColumns(editor, [
        ...before.slice(0, insertAt),
        newColumn(before, insertAt, locale),
        ...before.slice(insertAt),
      ]);
    }
  };
  const addColumnAfter = () => {
    const before = tableColumns(editor);
    const insertAt = activeColumnIndex(editor) + 1;
    if (editor.chain().focus().addColumnAfter().run()) {
      updateActiveTableColumns(editor, [
        ...before.slice(0, insertAt),
        newColumn(before, insertAt, locale),
        ...before.slice(insertAt),
      ]);
    }
  };
  const deleteColumn = () => {
    const before = tableColumns(editor);
    const removeAt = activeColumnIndex(editor);
    if (activeTableColumnCount(editor) <= 1) return;
    if (editor.chain().focus().deleteColumn().run()) {
      updateActiveTableColumns(editor, before.filter((_column, index) => index !== removeAt));
    }
  };

  return (
    <div className="sticky top-[5.5rem] z-10 my-2 flex max-w-[92vw] flex-wrap items-center gap-0.5 rounded-lg border border-notion-border bg-background p-1 shadow-xl">
      {actionButton(menuText(locale, 'Linha acima', 'Row above'), () => editor.chain().focus().addRowBefore().run(), <Rows3 className="h-4 w-4" />)}
      {actionButton(menuText(locale, 'Linha abaixo', 'Row below'), () => editor.chain().focus().addRowAfter().run(), <Plus className="h-4 w-4" />)}
      {actionButton(menuText(locale, 'Excluir linha', 'Delete row'), () => editor.chain().focus().deleteRow().run(), <Trash2 className="h-4 w-4" />)}
      <span className="mx-1 h-5 w-px bg-notion-border" />
      {actionButton(menuText(locale, 'Coluna antes', 'Column before'), addColumnBefore, <Columns3 className="h-4 w-4" />)}
      {actionButton(menuText(locale, 'Coluna depois', 'Column after'), addColumnAfter, <Plus className="h-4 w-4 rotate-90" />)}
      {actionButton(menuText(locale, 'Excluir coluna', 'Delete column'), deleteColumn, <Trash2 className="h-4 w-4" />, !canDeleteColumn || selectedColumn < 0)}
      {payloadFromActiveTable(editor) &&
        actionButton(menuText(locale, 'Recalcular', 'Recalculate'), recalculate, <RefreshCw className="h-4 w-4" />)}
    </div>
  );
}
