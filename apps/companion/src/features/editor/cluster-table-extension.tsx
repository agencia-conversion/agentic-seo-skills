import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ClusterTableView } from '@/features/clusters/cluster-table-view';
import { ActiveClustersTableView } from '@/features/clusters/active-clusters-table-view';

export const CLUSTER_TABLE_SENTINEL_BEGIN = '<!-- BEGIN cluster-content-table:auto:v1:do-not-edit -->';
export const CLUSTER_TABLE_SENTINEL_END = '<!-- END cluster-content-table:auto -->';
export const CLUSTER_INDEX_SENTINEL_BEGIN = '<!-- BEGIN cluster-index-table:auto:v1:do-not-edit -->';
export const CLUSTER_INDEX_SENTINEL_END = '<!-- END cluster-index-table:auto -->';

export const ClusterTable = Node.create({
  name: 'clusterTable',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      clusterSlug: { default: '' },
      sentinelRaw: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-cluster-table]' }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-cluster-table': node.attrs.clusterSlug || '',
      }),
      '',
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ClusterTableView);
  },
});

export const ActiveClustersTableNode = Node.create({
  name: 'activeClustersTable',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      sentinelRaw: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-active-clusters-table]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-active-clusters-table': '',
      }),
      '',
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ActiveClustersTableView);
  },
});
