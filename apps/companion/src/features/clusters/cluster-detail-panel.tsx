'use client';

import dynamic from 'next/dynamic';
import { ContentIndexPanel } from '@/features/contents/content-index-panel';

const EditorPanel = dynamic(() => import('@/features/editor/editor-panel').then((mod) => mod.EditorPanel), {
  ssr: false,
});

export function ClusterDetailPanel({ clusterSlug }: { clusterSlug: string }) {
  return (
    <EditorPanel
      slotAfterEditor={
        <div className="mt-12 border-t border-notion-border bg-notion-background-subtle px-6 py-6 md:px-12 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <ContentIndexPanel topicClusterId={clusterSlug} embedded />
          </div>
        </div>
      }
    />
  );
}
