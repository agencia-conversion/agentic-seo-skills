'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ListingColumn<T> {
  id: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export function ListingTable<T>({
  rows,
  columns,
  getRowKey,
  getRowLabel,
  emptyText,
  onOpenRow,
}: {
  rows: T[];
  columns: ListingColumn<T>[];
  getRowKey: (row: T) => string;
  getRowLabel: (row: T) => string;
  emptyText: string;
  onOpenRow: (row: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-notion-border">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-notion-sidebar text-left text-xs uppercase text-notion-text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.id} className={cn('px-3 py-2 font-medium', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-notion-text-muted">
                {emptyText}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              role="button"
              tabIndex={0}
              aria-label={getRowLabel(row)}
              onClick={() => onOpenRow(row)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onOpenRow(row);
              }}
              className="cursor-pointer border-t border-notion-border transition-colors hover:bg-notion-hover focus-visible:bg-notion-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-text/10"
            >
              {columns.map((column) => (
                <td key={column.id} className={cn('min-w-0 px-3 py-2', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
