'use client';

import { Search } from 'lucide-react';
import { Select, SelectOption } from '@/components/select';

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

function toSelectOptions(filter: ListingFilterDef): SelectOption[] {
  const options: SelectOption[] = [{ value: '', label: filter.allLabel }];
  for (const option of filter.options) {
    const label = filter.formatOption
      ? filter.formatOption(option)
      : `${option.title || option.id}${option.count == null ? '' : ` (${option.count})`}`;
    options.push({ value: option.id, label });
  }
  return options;
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
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      <label className="flex h-9 min-w-[240px] flex-1 items-center gap-2 rounded-md border border-notion-border px-3 text-sm">
        <Search className="h-4 w-4 text-notion-text-muted" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={queryPlaceholder}
          className="w-full bg-transparent outline-none placeholder:text-notion-text-muted"
        />
      </label>
      {filters?.map((filter) => (
        <Select
          key={filter.id}
          value={filter.value}
          onChange={filter.onChange}
          options={toSelectOptions(filter)}
          placeholder={filter.allLabel}
          className="shrink-0"
          triggerClassName="h-9 border border-notion-border px-3"
        />
      ))}
    </div>
  );
}
