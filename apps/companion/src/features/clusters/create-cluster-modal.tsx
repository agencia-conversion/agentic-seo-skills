'use client';

import { useEffect, useState } from 'react';
import { Select } from '@/components/select';
import { showToast } from '@/components/toast';
import { cn } from '@/lib/utils';
import { getCompanionToken } from './cluster-row-api';

export interface CreateClusterContentOption {
  slug: string;
  title: string;
}

export function CreateClusterModal({
  open,
  contents,
  onClose,
  onCreated,
}: {
  open: boolean;
  contents: CreateClusterContentOption[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [area, setArea] = useState('');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [pillarSlug, setPillarSlug] = useState('');
  const [pillarTitle, setPillarTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setIcon('');
      setArea('');
      setMode('existing');
      setPillarSlug('');
      setPillarTitle('');
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const companionToken = getCompanionToken();
    if (!companionToken) return;
    setSubmitting(true);
    setError(null);
    const payload = mode === 'existing'
      ? { name, icon, area, pillar_slug: pillarSlug }
      : { name, icon, area, pillar_title: pillarTitle || name };
    try {
      const res = await fetch(`/api/project/clusters?token=${encodeURIComponent(companionToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-companion-token': companionToken },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.reason || `http-${res.status}`);
        return;
      }
      showToast('Cluster criado', 'success');
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-md border border-notion-border bg-background p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-notion-text">Novo cluster</h2>
          <button type="button" onClick={onClose} className="text-notion-text-muted hover:text-notion-text cursor-pointer">×</button>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-notion-text-muted">Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-md border border-notion-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-notion-text/10" />
          </label>
          <div className="grid grid-cols-[96px_1fr] gap-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-notion-text-muted">Ícone</span>
              <input value={icon} onChange={(event) => setIcon(event.target.value)} className="w-full rounded-md border border-notion-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-notion-text/10" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-notion-text-muted">Área</span>
              <input value={area} onChange={(event) => setArea(event.target.value)} className="w-full rounded-md border border-notion-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-notion-text/10" />
            </label>
          </div>
          <div className="flex gap-1 rounded-md bg-notion-active p-1 text-xs">
            <button type="button" onClick={() => setMode('existing')} className={cn('flex-1 rounded px-2 py-1.5', mode === 'existing' ? 'bg-background text-notion-text shadow-sm' : 'text-notion-text-muted')}>
              Página existente
            </button>
            <button type="button" onClick={() => setMode('new')} className={cn('flex-1 rounded px-2 py-1.5', mode === 'new' ? 'bg-background text-notion-text shadow-sm' : 'text-notion-text-muted')}>
              Criar pillar
            </button>
          </div>
          {mode === 'existing' ? (
            <Select
              value={pillarSlug}
              onChange={setPillarSlug}
              options={[
                { value: '', label: 'Selecionar pillar…' },
                ...contents.map((content) => ({ value: content.slug, label: content.title })),
              ]}
              triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-3 py-2"
            />
          ) : (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-notion-text-muted">Título da nova página pillar</span>
              <input value={pillarTitle} onChange={(event) => setPillarTitle(event.target.value)} placeholder={name || 'Título'} className="w-full rounded-md border border-notion-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-notion-text/10" />
            </label>
          )}
          {error && <div className="text-xs text-red-600">Erro: {error}</div>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-notion-border px-3 py-1.5 text-sm hover:bg-notion-hover cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={submitting || !name.trim() || (mode === 'existing' && !pillarSlug)}
            onClick={() => void submit()}
            className="rounded-md bg-notion-text px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Criando…' : 'Criar cluster'}
          </button>
        </div>
      </div>
    </div>
  );
}
