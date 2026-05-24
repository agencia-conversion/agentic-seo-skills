'use client';

import { useWorkspace } from '@/features/workspace/store';

export function openDataForSeoModal() {
  if (typeof window === 'undefined') return;
  useWorkspace.getState().openSettings('credentials');
}
