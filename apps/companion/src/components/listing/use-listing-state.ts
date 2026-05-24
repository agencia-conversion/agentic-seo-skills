'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useListingState<TFilter extends string>({
  filterKeys,
  defaultFilters,
  resetKey = '',
  debounceMs = 250,
}: {
  filterKeys: TFilter[];
  defaultFilters: Record<TFilter, string>;
  resetKey?: string;
  debounceMs?: number;
}) {
  const filterSignature = filterKeys.join('|');
  const keys = useMemo(() => filterSignature.split('|') as TFilter[], [filterSignature]);
  const [query, setQueryValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<Record<TFilter, string>>(defaultFilters);
  const [page, setPage] = useState(1);
  const hydrated = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const nextQuery = params.get('q') || '';
    const nextFilters = {} as Record<TFilter, string>;
    for (const key of keys) nextFilters[key] = params.get(key) || defaultFilters[key] || '';
    const nextPage = Math.max(1, Number(params.get('page') || 1) || 1);
    setQueryValue(nextQuery);
    setDebouncedQuery(nextQuery);
    setFilters(nextFilters);
    setPage(nextPage);
    hydrated.current = true;
  }, [defaultFilters, keys, resetKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => window.clearTimeout(timer);
  }, [debounceMs, query]);

  useEffect(() => {
    if (!hydrated.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
    else params.delete('q');
    for (const key of keys) {
      const value = filters[key] || '';
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next);
  }, [debouncedQuery, filters, keys, page]);

  const setQuery = useCallback((value: string) => {
    setQueryValue(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: TFilter, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  return useMemo(
    () => ({ query, debouncedQuery, filters, page, setQuery, setFilter, setPage }),
    [debouncedQuery, filters, page, query, setFilter, setQuery]
  );
}
