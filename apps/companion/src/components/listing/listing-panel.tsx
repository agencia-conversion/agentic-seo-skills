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
  embedded,
}: {
  title: string;
  loading: boolean;
  countLabel?: string;
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
  embedded?: boolean;
}) {
  const body = (
    <>
      {loading && <div className="mb-2 text-sm text-notion-text-muted">{loadingLabel}</div>}
      <ListingFilters
        query={query}
        queryPlaceholder={queryPlaceholder}
        filters={filters}
        onQueryChange={onQueryChange}
        endSlot={toolbar}
      />
      <ListingTable
        rows={rows}
        columns={columns}
        getRowKey={getRowKey}
        getRowLabel={getRowLabel}
        emptyText={emptyText}
        onOpenRow={onOpenRow}
      />
      <ListingPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
  if (embedded) return <div className="w-full">{body}</div>;
  return <VirtualPageShell title={title}>{body}</VirtualPageShell>;
}
