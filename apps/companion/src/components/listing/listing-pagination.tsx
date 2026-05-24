'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ListingPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-notion-text-muted">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-md border border-notion-border p-1.5 disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-notion-border p-1.5 disabled:opacity-40"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
