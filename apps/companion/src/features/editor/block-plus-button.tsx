'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';

interface BlockPlusButtonProps {
  editorRef: React.RefObject<any>;
}

interface Position {
  top: number;
  left: number;
  visible: boolean;
}

export function BlockPlusButton({ editorRef }: BlockPlusButtonProps) {
  const [pos, setPos] = useState<Position | null>(null);

  useEffect(() => {
    let raf: number | null = null;
    let pointerInside = false;
    let lastTop = -1;
    let lastLeft = -1;
    let lastVisible = false;

    const update = () => {
      raf = null;
      const editor = editorRef.current;
      const editorRoot = editor?.view?.dom as HTMLElement | undefined;
      if (!editorRoot || !pointerInside) {
        if (lastVisible) {
          lastVisible = false;
          setPos((p) => (p ? { ...p, visible: false } : null));
        }
        return;
      }
      const handle = document.querySelector<HTMLElement>('.drag-handle');
      if (handle) {
        const rect = handle.getBoundingClientRect();
        const hidden =
          handle.classList.contains('hide') ||
          rect.width === 0 ||
          rect.height === 0 ||
          getComputedStyle(handle).visibility === 'hidden';
        const visible = !hidden;
        const top = rect.top;
        const left = rect.left - 20;
        if (top !== lastTop || left !== lastLeft || visible !== lastVisible) {
          lastTop = top;
          lastLeft = left;
          lastVisible = visible;
          setPos({ top, left, visible });
        }
      } else if (lastVisible) {
        lastVisible = false;
        setPos((p) => (p ? { ...p, visible: false } : null));
      }
    };

    const schedule = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(update);
    };

    const bind = () => {
      const editorRoot = editorRef.current?.view?.dom as HTMLElement | undefined;
      if (!editorRoot) return null;
      const onPointerEnter = () => {
        pointerInside = true;
        schedule();
      };
      const onPointerMove = () => {
        pointerInside = true;
        schedule();
      };
      const onPointerLeave = () => {
        pointerInside = false;
        schedule();
      };
      const onScroll = () => schedule();
      editorRoot.addEventListener('pointerenter', onPointerEnter);
      editorRoot.addEventListener('pointermove', onPointerMove);
      editorRoot.addEventListener('pointerleave', onPointerLeave);
      document.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      return () => {
        editorRoot.removeEventListener('pointerenter', onPointerEnter);
        editorRoot.removeEventListener('pointermove', onPointerMove);
        editorRoot.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      };
    };

    let cleanup = bind();
    const retry = cleanup ? null : window.setTimeout(() => {
      cleanup = bind();
    }, 250);

    return () => {
      cleanup?.();
      if (retry !== null) window.clearTimeout(retry);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [editorRef]);

  if (!pos || !pos.visible) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const view = editor.view;
      const coords = view.posAtCoords({
        left: pos.left + 40,
        top: pos.top + 10,
      });
      if (!coords) return;
      const $pos = editor.state.doc.resolve(coords.pos);
      let depth = $pos.depth;
      while (depth > 0 && $pos.node(depth).isInline) depth--;
      const end = depth > 0 ? $pos.end(depth) : editor.state.doc.content.size;
      editor
        .chain()
        .insertContentAt(end + 1, { type: 'paragraph' })
        .focus(end + 2)
        .run();
    } catch (err) {
      console.error('BlockPlusButton insert failed:', err);
    }
  };

  return createPortal(
    <button
      type="button"
      onClick={handleClick}
      className="fixed z-[40] flex items-center justify-center rounded text-notion-text-muted hover:bg-notion-hover hover:text-notion-text transition-colors cursor-pointer"
      style={{
        top: pos.top,
        left: pos.left,
        width: '1.6rem',
        height: '1.8rem',
      }}
      title="Add block below"
      aria-label="Add block below"
    >
      {/* Hit zone extender */}
      <span className="absolute" style={{ inset: '-4px' }} aria-hidden />
      <Plus className="w-4 h-4 pointer-events-none" />
    </button>,
    document.body
  );
}
