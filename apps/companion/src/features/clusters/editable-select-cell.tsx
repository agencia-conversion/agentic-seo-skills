'use client';

import { useCallback, useState } from 'react';
import { Select, type SelectOption } from '@/components/select';
import { cn } from '@/lib/utils';

export interface EditableSelectCellProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onCommit: (next: string) => Promise<void>;
  className?: string;
}

export function EditableSelectCell({
  value,
  options,
  placeholder,
  onCommit,
  className,
}: EditableSelectCellProps) {
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(
    async (next: string) => {
      if (next === value) return;
      setSaving(true);
      try {
        await onCommit(next);
      } finally {
        setSaving(false);
      }
    },
    [value, onCommit],
  );

  return (
    <Select
      value={value || ''}
      onChange={handleChange}
      options={options}
      placeholder={placeholder}
      disabled={saving}
      className={cn('w-full', className)}
      triggerClassName={cn(
        'w-full justify-between rounded text-left text-xs text-notion-text-muted hover:bg-notion-hover px-1 py-0.5 cursor-pointer',
        !value && 'italic text-notion-text-muted/60',
        saving && 'opacity-60',
      )}
      renderValue={(opt) => (
        <span className="truncate">{opt?.label ?? placeholder ?? '—'}</span>
      )}
    />
  );
}
