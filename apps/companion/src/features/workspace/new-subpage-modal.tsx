'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useWorkspace } from './store';
import { showToast } from '@/components/toast';
import { useRouter } from 'next/navigation';
import { usePagePath } from '@/hooks/use-page-path';

interface NewSubpageModalProps {
  parentPath: string;
  parentLabel: string;
  open: boolean;
  onClose: () => void;
}

export function NewSubpageModal({ parentPath, parentLabel, open, onClose }: NewSubpageModalProps) {
  const createBrainSubpage = useWorkspace((s) => s.createBrainSubpage);
  const router = useRouter();
  const pagePath = usePagePath();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setTitle('');
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      showToast('Informe um título.', 'error');
      return;
    }
    setBusy(true);
    try {
      const id = await createBrainSubpage(parentPath, cleanTitle);
      if (!id) {
        showToast('Não foi possível criar a subpágina.', 'error');
        return;
      }
      const created = useWorkspace.getState().pages.find((p) => p.id === id);
      if (created) router.push(pagePath(created.slug));
      onClose();
    } catch (err: any) {
      showToast(`Erro: ${err?.message || 'desconhecido'}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-background border border-notion-border shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-notion-text">Nova subpágina</h2>
            <p className="text-xs text-notion-text-muted">Em {parentLabel}</p>
          </div>
          <button onClick={onClose} className="text-notion-text-muted hover:text-notion-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="block text-sm">
          <span className="block text-notion-text-muted mb-1">Título</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !busy) void submit();
            }}
            autoFocus
            placeholder="Nome da subpágina"
            className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none focus:border-notion-text-muted"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-notion-border px-4 py-2 text-sm text-notion-text hover:bg-notion-hover"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-notion-text px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {busy ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
