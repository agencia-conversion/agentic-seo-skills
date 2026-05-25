'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Page, useWorkspace } from './store';
import { SidebarItem } from './sidebar-item';

interface SortablePageListProps {
  pages: Page[];
  parentId: string | null;
  activePageId: string | null;
  childrenByParent: Record<string, Page[]>;
  level?: number;
  keyPrefix?: string;
}

export function SortablePageList({
  pages,
  parentId,
  activePageId,
  childrenByParent,
  level = 0,
  keyPrefix = '',
}: SortablePageListProps) {
  const reorderPages = useWorkspace((s) => s.reorderPages);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );
  const [dragActiveId, setDragActiveId] = useState<string | null>(null);

  const handleDragEnd = useCallback(
    (event: any) => {
      setDragActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = pages.findIndex((p) => p.id === active.id);
      const newIndex = pages.findIndex((p) => p.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(pages, oldIndex, newIndex);
      reorderPages(parentId, reordered.map((p) => p.id));
    },
    [pages, parentId, reorderPages]
  );

  const dragActivePage = dragActiveId
    ? pages.find((p) => p.id === dragActiveId)
    : null;

  if (pages.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setDragActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragActiveId(null)}
    >
      <SortableContext
        items={pages.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        {pages.map((page) => (
          <SortableItem
            key={`${keyPrefix}${page.id}`}
            page={page}
            isActive={activePageId === page.id}
            level={level}
            childPages={childrenByParent[page.id] || []}
            childrenByParent={childrenByParent}
            activePageId={activePageId}
          />
        ))}
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 150 }}>
        {dragActivePage && (
          <div className="px-2 py-1 text-sm bg-background border border-notion-border rounded-md shadow-lg text-notion-text truncate max-w-[250px]">
            {dragActivePage.icon || '📄'} {dragActivePage.title || 'Untitled'}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SortableItem({
  page,
  isActive,
  level,
  childPages,
  childrenByParent,
  activePageId,
}: {
  page: Page;
  isActive: boolean;
  level: number;
  childPages: Page[];
  childrenByParent: Record<string, Page[]>;
  activePageId: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: page.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarItem
        page={page}
        isActive={isActive}
        level={level}
        childPages={childPages}
        childrenByParent={childrenByParent}
        activePageId={activePageId}
      />
    </div>
  );
}
