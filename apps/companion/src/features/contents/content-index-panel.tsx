'use client';

import { ClusterContentTable } from './cluster-content-table';
import { resolveDataTableFollowPage } from '@/features/workspace/page-width';
import { useWorkspace } from '@/features/workspace/store';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';

export function ContentIndexPanel({
  topicClusterId,
  embedded,
}: {
  topicClusterId?: string | null;
  embedded?: boolean;
}) {
  const activePageId = useWorkspace((s) => s.activePageId);
  const followPageWidth = useWorkspace((s) =>
    resolveDataTableFollowPage(activePageId, s.settings.dataTableFollowPageByPage)
  );
  const body = <ClusterContentTable clusterSlug={topicClusterId || undefined} followPageWidth={followPageWidth} />;
  if (embedded) return <div className="w-full">{body}</div>;
  return <VirtualPageShell title="Conteúdos">{body}</VirtualPageShell>;
}
