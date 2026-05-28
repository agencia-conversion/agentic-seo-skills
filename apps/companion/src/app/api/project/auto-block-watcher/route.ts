// Test-instrumentation endpoint: reports how many times the chokidar
// watcher invoked the in-process reverse-sync and cluster-sync handlers
// since the server started. Used by the external-edit Playwright spec to
// assert anti-loop guards. Read-only; no side effects.

import { NextRequest, NextResponse } from 'next/server';
import { rejectUnlessLocal, projectRoot } from '@/lib/api-guard';
import {
  ensureWatcherStarted,
  getReverseSyncCount,
  getClusterSyncCount,
} from '@/lib/auto-block-watcher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const rejected = rejectUnlessLocal(req);
  if (rejected) return rejected;
  ensureWatcherStarted(projectRoot());
  return NextResponse.json({
    ok: true,
    reverseSyncCount: getReverseSyncCount(),
    clusterSyncCount: getClusterSyncCount(),
  });
}
