'use client';

import { ReactNode } from 'react';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';
import { ListingFilterDef, ListingFilters } from './listing-filters';
import { ListingPagination } from './listing-pagination';
import { ListingColumn, ListingTable } from './listing-table';

export type { ListingColumn } from './listing-table';

export function ListingPanel<T>({
  title,
  loading,
  countLabel,
  loadingLabel,
  query,
  queryPlaceholder,
  filters,
  rows,
  columns,
  page,
  totalPages,
  emptyText,
  onQueryChange,
  onPageChange,
  onOpenRow,
  getRowKey,
  getRowLabel,
  toolbar,
}: {
  title: string;
  loading: boolean;
  countLabel: string;
  loadingLabel: string;
  query: string;
  queryPlaceholder: string;
  filters?: ListingFilterDef[];
  rows: T[];
  columns: ListingColumn<T>[];
  page: number;
  totalPages: number;
  emptyText: string;
  onQueryChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onOpenRow: (row: T) => void;
  getRowKey: (row: T) => string;
  getRowLabel: (row: T) => string;
  toolbar?: ReactNode;
}) {
  return (
    <VirtualPageShell title={title}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-notion-text-muted">{loading ? loadingLabel : countLabel}</div>
          {toolbar}
        </div>
      </div>
      <ListingFilters query={query} queryPlaceholder={queryPlaceholder} filters={filters} onQueryChange={onQueryChange} />
      <ListingTable
        rows={rows}
        columns={columns}
        getRowKey={getRowKey}
        getRowLabel={getRowLabel}
        emptyText={emptyText}
        onOpenRow={onOpenRow}
      />
      <ListingPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </VirtualPageShell>
  );
}
