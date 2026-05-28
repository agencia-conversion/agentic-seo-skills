'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { resolveDataTableFollowPage } from '@/features/workspace/page-width';
import { useWorkspace } from '@/features/workspace/store';
import { ActiveClustersTable } from './active-clusters-table';

export function ActiveClustersTableView() {
  const activePageId = useWorkspace((s) => s.activePageId);
  const followPageWidth = useWorkspace((s) =>
    resolveDataTableFollowPage(activePageId, s.settings.dataTableFollowPageByPage)
  );
  return (
    <NodeViewWrapper contentEditable={false} className="my-6 not-prose">
      <ActiveClustersTable followPageWidth={followPageWidth} />
    </NodeViewWrapper>
  );
}
