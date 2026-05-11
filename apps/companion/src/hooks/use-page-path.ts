'use client';

import { useCallback } from 'react';
import { useWorkspace } from '@/features/workspace/store';

export function usePagePath(): (slug: string) => string {
  const token = useWorkspace((s) => s.token);
  return useCallback((slug: string) => `/project/${token || ''}/${slug}`, [token]);
}
