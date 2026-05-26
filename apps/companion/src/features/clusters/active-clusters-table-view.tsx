'use client';

import { NodeViewWrapper } from '@tiptap/react';
import { ActiveClustersTable } from './active-clusters-table';

export function ActiveClustersTableView() {
  return (
    <NodeViewWrapper contentEditable={false} className="my-6 not-prose">
      <ActiveClustersTable />
    </NodeViewWrapper>
  );
}
