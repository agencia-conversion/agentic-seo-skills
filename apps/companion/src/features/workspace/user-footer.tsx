'use client';

import { NoteblockBrandBy } from '@/components/noteblock-brand';

export function UserFooter() {
  return (
    <div className="px-2 py-1 flex justify-start" data-testid="sidebar-conversion-footer">
      <NoteblockBrandBy />
    </div>
  );
}
