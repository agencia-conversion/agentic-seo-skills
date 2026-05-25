'use client';

import dynamic from 'next/dynamic';

const EditorPanel = dynamic(() => import('@/features/editor/editor-panel').then((mod) => mod.EditorPanel), {
  ssr: false,
});

export function ClusterDetailPanel(_props: { clusterSlug: string }) {
  return <EditorPanel />;
}
