'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { ClusterContentTable } from '@/features/contents/cluster-content-table';

export function ClusterTableView({ node }: any) {
  const slug = String(node?.attrs?.clusterSlug || '');
  return (
    <NodeViewWrapper contentEditable={false} className="my-6 not-prose">
      <ClusterContentTable clusterSlug={slug} />
    </NodeViewWrapper>
  );
}
