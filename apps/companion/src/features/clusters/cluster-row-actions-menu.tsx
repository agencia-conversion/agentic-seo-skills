'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Archive, Pencil, ExternalLink, ChevronRight, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClusterRowActionsMenuProps {
  slug: string;
  name: string;
  status: string;
  onOpen: () => void;
  onRename: () => void;
  onStatusChange: (status: string) => void;
  onArchive: () => void;
  // Present only when the cluster is a promotable draft (status !== active).
  // Promotes draft.yaml -> active cluster.yaml via the promote endpoint.
  onPromote?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'active' },
  { value: 'drafting', label: 'drafting' },
  { value: 'proposed', label: 'proposed' },
  { value: 'archived', label: 'archived' },
];

interface MenuStyle {
  top: number;
  left: number;
}

export function ClusterRowActionsMenu({
  slug,
  name,
  status,
  onOpen,
  onRename,
  onStatusChange,
  onArchive,
  onPromote,
}: ClusterRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [showStatusSub, setShowStatusSub] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      setShowStatusSub(false);
      setActiveIdx(0);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const desiredWidth = 200;
    const left = Math.max(
      8,
      Math.min(rect.right - desiredWidth, window.innerWidth - desiredWidth - 8)
    );
    const top = Math.min(rect.bottom + 4, window.innerHeight - 200);
    setMenuStyle({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const toggleStatusSub = () => setShowStatusSub((s) => !s);

  const actions = [
    { id: 'open', label: 'Abrir cluster', icon: ExternalLink, run: onOpen },
    { id: 'rename', label: 'Renomear', icon: Pencil, run: onRename },
    ...(onPromote ? [{ id: 'promote', label: 'Promover', icon: Rocket, run: onPromote }] : []),
    { id: 'status', label: 'Mudar status', icon: ChevronRight, run: toggleStatusSub },
    { id: 'archive', label: 'Arquivar', icon: Archive, destructive: true, run: onArchive },
  ];

  const handleAction = (run: () => void) => {
    run();
    // The status item toggles a submenu and must keep the menu open; every
    // other action (open, rename, promote, archive) closes it.
    if (run === toggleStatusSub) return;
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(actions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleAction(actions[activeIdx].run);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-notion-text-muted hover:bg-notion-hover hover:text-notion-text cursor-pointer"
        aria-label={`Ações do cluster ${name}`}
        data-testid={`cluster-actions-${slug}`}
        title="Ações"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && menuStyle && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="fixed z-[320] w-[200px] bg-background border border-notion-border rounded-md shadow-xl py-1"
            onKeyDown={handleKey}
          >
            {actions.map((act, idx) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => {
                      setActiveIdx(idx);
                      if (act.id !== 'status') setShowStatusSub(false);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(act.run);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left cursor-pointer',
                      idx === activeIdx ? 'bg-notion-hover' : 'hover:bg-notion-hover',
                      act.destructive ? 'text-red-600' : 'text-notion-text'
                    )}
                    data-testid={`cluster-action-${act.id}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="flex-1">{act.label}</span>
                  </button>
                  {act.id === 'status' && showStatusSub && (
                    <div className="absolute left-full top-0 ml-1 w-[140px] bg-background border border-notion-border rounded-md shadow-xl py-1">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(opt.value);
                            setOpen(false);
                          }}
                          className={cn(
                            'w-full px-3 py-1.5 text-left text-sm hover:bg-notion-hover cursor-pointer',
                            opt.value === status ? 'font-medium text-notion-text' : 'text-notion-text-muted'
                          )}
                          data-testid={`cluster-action-status-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
