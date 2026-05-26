'use client';

import { ClusterContentTable } from './cluster-content-table';
import { VirtualPageShell } from '@/features/workspace/virtual-page-shell';

export function ContentIndexPanel({
  topicClusterId,
  embedded,
}: {
  topicClusterId?: string | null;
  embedded?: boolean;
}) {
  const body = <ClusterContentTable clusterSlug={topicClusterId || undefined} />;
  if (embedded) return <div className="w-full">{body}</div>;
  return <VirtualPageShell title="Conteúdos">{body}</VirtualPageShell>;
}
