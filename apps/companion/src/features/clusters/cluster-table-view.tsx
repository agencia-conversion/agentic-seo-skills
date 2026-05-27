'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { ClusterContentTable } from '@/features/contents/cluster-content-table';
import { resolveDataTableFollowPage } from '@/features/workspace/page-width';
import { useWorkspace } from '@/features/workspace/store';

export function ClusterTableView({ node }: any) {
  const slug = String(node?.attrs?.clusterSlug || '');
  const activePageId = useWorkspace((s) => s.activePageId);
  const followPageWidth = useWorkspace((s) =>
    resolveDataTableFollowPage(activePageId, s.settings.dataTableFollowPageByPage)
  );
  return (
    <NodeViewWrapper contentEditable={false} className="my-6 not-prose">
      <ClusterContentTable clusterSlug={slug} followPageWidth={followPageWidth} />
    </NodeViewWrapper>
  );
}
