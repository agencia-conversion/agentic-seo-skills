'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClickOutside, useEscapeKey } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';

interface ClusterRow {
  slug: string;
  name: string;
  icon?: string;
  status?: string;
}

interface ClusterPickModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  token: string;
  excludeSlugs?: string[];
  onPick: (slug: string) => void | Promise<void>;
  onClose: () => void;
}

export function ClusterPickModal({
  isOpen,
  title,
  description,
  token,
  excludeSlugs = [],
  onPick,
  onClose,
}: ClusterPickModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEscapeKey(() => {
    if (isOpen) onClose();
  });
  useClickOutside(ref, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setActiveIndex(0);
    setLoading(true);
    fetch(`/api/project/cluster-list?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => {
        const list: ClusterRow[] = Array.isArray(j?.clusters) ? j.clusters : [];
        setClusters(list.filter((c) => !excludeSlugs.includes(c.slug)));
      })
      .catch(() => setClusters([]))
      .finally(() => {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      });
  }, [isOpen, token, excludeSlugs]);

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? clusters
    : clusters.filter(
        (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
      );

  const handlePick = async (slug: string) => {
    await onPick(slug);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      handlePick(filtered[activeIndex].slug);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '70vh' }}
          >
            <div className="px-5 pt-4 pb-3 border-b border-notion-border">
              <h2 className="text-sm font-semibold text-notion-text">{title}</h2>
              {description && (
                <p className="mt-1 text-xs text-notion-text-muted leading-relaxed">{description}</p>
              )}
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKey}
                placeholder="Buscar por nome ou slug..."
                className="mt-3 w-full text-sm px-3 py-2 border border-notion-border rounded bg-background text-notion-text focus:outline-none focus:ring-2 focus:ring-notion-text/20"
                data-testid="cluster-pick-search"
              />
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {loading && (
                <div className="px-5 py-6 text-xs text-notion-text-muted">Carregando...</div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-5 py-6 text-xs text-notion-text-muted">
                  Nenhum cluster encontrado.
                </div>
              )}
              {!loading &&
                filtered.map((c, i) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => handlePick(c.slug)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-2 px-5 py-2 text-left cursor-pointer',
                      i === activeIndex ? 'bg-notion-hover' : 'hover:bg-notion-hover'
                    )}
                    data-testid={`cluster-pick-item-${c.slug}`}
                  >
                    <span className="text-base shrink-0">{c.icon || '📁'}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-notion-text truncate">{c.name}</span>
                      <span className="block text-[11px] text-notion-text-muted truncate">
                        {c.slug}
                      </span>
                    </span>
                    {c.status && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-notion-sidebar text-notion-text-muted shrink-0">
                        {c.status}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
