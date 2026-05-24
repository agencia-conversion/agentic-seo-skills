'use client';

import { Search } from 'lucide-react';

export interface ListingFilterOption {
  id: string;
  title?: string;
  count?: number;
}

export interface ListingFilterDef {
  id: string;
  value: string;
  label: string;
  allLabel: string;
  options: ListingFilterOption[];
  formatOption?: (option: ListingFilterOption) => string;
  onChange: (value: string) => void;
}

export function ListingFilters({
  query,
  queryPlaceholder,
  filters,
  onQueryChange,
}: {
  query: string;
  queryPlaceholder: string;
  filters?: ListingFilterDef[];
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
          <Search className="h-4 w-4 text-notion-text-muted" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={queryPlaceholder}
            className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
          />
        </label>
      </div>
      {!!filters?.length && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {filters.map((filter) => (
            <label key={filter.id}>
              <span className="sr-only">{filter.label}</span>
              <select
                aria-label={filter.label}
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                className="h-9 rounded-md border border-notion-border bg-background px-3 text-sm text-notion-text outline-none"
              >
                <option value="">{filter.allLabel}</option>
                {filter.options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {filter.formatOption ? filter.formatOption(item) : `${item.title || item.id}${item.count == null ? '' : ` (${item.count})`}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
