'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { getCompanionToken } from '@/features/clusters/cluster-row-api';

const ORIGEMS = ['blog', 'linkedin', 'podcast', 'outros'] as const;

interface ClusterOption {
  slug: string;
  nome: string;
  icon?: string;
}

interface CreateContentModalProps {
  open: boolean;
  defaultClusterSlug?: string;
  onClose: () => void;
  onCreated?: (result: { path: string; slug: string }) => void;
}

export function CreateContentModal({
  open,
  defaultClusterSlug,
  onClose,
  onCreated,
}: CreateContentModalProps) {
  const [title, setTitle] = useState('');
  const [origem, setOrigem] = useState<(typeof ORIGEMS)[number]>('outros');
  const [selectedClusters, setSelectedClusters] = useState<string[]>(
    defaultClusterSlug ? [defaultClusterSlug] : [],
  );
  const [clusterOptions, setClusterOptions] = useState<ClusterOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setOrigem('outros');
    setSelectedClusters(defaultClusterSlug ? [defaultClusterSlug] : []);
    setError(null);
  }, [open, defaultClusterSlug]);

  useEffect(() => {
    if (!open) return;
    const token = getCompanionToken();
    if (!token) return;
    fetch(`/api/project/cluster-list?token=${encodeURIComponent(token)}`, {
      headers: { 'x-companion-token': token },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.clusters)) setClusterOptions(data.clusters);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const remaining = useMemo(
    () => clusterOptions.filter((o) => !selectedClusters.includes(o.slug)),
    [clusterOptions, selectedClusters],
  );

  const toggleCluster = useCallback((slug: string) => {
    setSelectedClusters((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const submit = useCallback(async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Título obrigatório');
      return;
    }
    const token = getCompanionToken();
    if (!token) {
      setError('missing-token');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/project/file/create?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-companion-token': token },
        body: JSON.stringify({
          kind: 'content',
          title: cleanTitle,
          origem,
          clusters: selectedClusters,
          syncWait: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.reason || `http-${res.status}`);
        return;
      }
      onCreated?.({ path: data.path, slug: data.path?.replace(/\.md$/, '').split('/').pop() || '' });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [title, origem, selectedClusters, onClose, onCreated]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[210] bg-black/40 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-lg rounded-lg border border-notion-border bg-background shadow-2xl"
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-2 border-b border-notion-border px-4 py-2.5">
              <strong className="text-sm text-notion-text">Adicionar conteúdo</strong>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1.5 text-notion-text-muted hover:bg-notion-hover hover:text-notion-text cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="p-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-notion-text-muted">Título</span>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !submitting) void submit();
                  }}
                  placeholder="Título do conteúdo"
                  className="w-full rounded-md border border-notion-border bg-background px-3 py-2 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-notion-text-muted">Origem</span>
                <select
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value as (typeof ORIGEMS)[number])}
                  className="w-full rounded-md border border-notion-border bg-background px-3 py-2 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
                >
                  {ORIGEMS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-notion-text-muted">
                  Topic Clusters (opcional)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedClusters.map((slug) => {
                    const opt = clusterOptions.find((o) => o.slug === slug);
                    return (
                      <span
                        key={slug}
                        className="inline-flex items-center gap-1 rounded-md border border-notion-border bg-notion-active/40 px-2 py-0.5 text-xs text-notion-text"
                      >
                        {opt?.icon ? <span>{opt.icon}</span> : null}
                        <span>{opt?.nome || slug}</span>
                        <button
                          type="button"
                          onClick={() => toggleCluster(slug)}
                          className="text-notion-text-muted hover:text-notion-text cursor-pointer"
                          aria-label={`remover ${slug}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                  {remaining.length > 0 && (
                    <details className="relative">
                      <summary className="cursor-pointer rounded-md border border-dashed border-notion-border px-2 py-0.5 text-xs text-notion-text-muted hover:bg-notion-hover">
                        <Plus className="inline h-3 w-3" /> cluster
                      </summary>
                      <div className="absolute left-0 z-10 mt-1 w-56 rounded-md border border-notion-border bg-background shadow-lg p-1 max-h-56 overflow-auto">
                        {remaining.map((opt) => (
                          <button
                            key={opt.slug}
                            type="button"
                            onClick={() => toggleCluster(opt.slug)}
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-notion-hover cursor-pointer flex items-center gap-2"
                          >
                            {opt.icon ? <span>{opt.icon}</span> : null}
                            <span>{opt.nome}</span>
                            <span className="text-notion-text-muted">{opt.slug}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                  {selectedClusters.length === 0 && remaining.length === 0 && (
                    <span className="text-xs text-notion-text-muted">Nenhum cluster disponível</span>
                  )}
                </div>
                {selectedClusters.length === 0 && (
                  <span className="text-[11px] text-notion-text-muted">
                    Sem cluster — o conteúdo fica órfão até você adicionar.
                  </span>
                )}
              </div>
              {error && <div className="text-xs text-red-600">Erro: {error}</div>}
            </div>
            <footer className="flex items-center justify-end gap-2 border-t border-notion-border px-4 py-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded px-3 py-1.5 text-sm text-notion-text-muted hover:bg-notion-hover cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || !title.trim()}
                className="rounded bg-notion-text px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Criando…' : 'Criar conteúdo'}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
