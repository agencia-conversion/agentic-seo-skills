'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useWorkspace } from '@/features/workspace/store';
import { showToast } from '@/components/toast';

interface AddPlannedModalProps {
  clusterSlug: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  clusterOptions?: Array<{ id: string; title: string }>;
  onSelectCluster?: (slug: string) => void;
}

export function AddPlannedModal({
  clusterSlug,
  open,
  onClose,
  onSuccess,
  clusterOptions,
  onSelectCluster,
}: AddPlannedModalProps) {
  const token = useWorkspace((s) => s.token);
  const [slug, setSlug] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [volume, setVolume] = useState('');
  const [intent, setIntent] = useState('informational');
  const [papel, setPapel] = useState<'satelite' | 'pilar'>('satelite');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!slug.trim() || !keyword.trim()) {
      showToast('Preencha slug e keyword.', 'error');
      return;
    }
    setBusy(true);
    try {
      const volumeNum = volume.trim() ? Number(volume.trim().replace(/[^\d]/g, '')) : undefined;
      const res = await fetch(`/api/project/cluster/${encodeURIComponent(clusterSlug)}/satellite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-companion-token': token || '' },
        body: JSON.stringify({
          slug: slug.trim(),
          keyword: keyword.trim(),
          display_title: displayTitle.trim() || undefined,
          volume: volumeNum && !Number.isNaN(volumeNum) ? volumeNum : undefined,
          intent,
          papel,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(`Falhou: ${data.reason}`, 'error');
        return;
      }
      showToast(`Conteúdo planejado "${data.slug}" adicionado.`, 'success');
      setSlug('');
      setDisplayTitle('');
      setKeyword('');
      setVolume('');
      setNote('');
      onSuccess?.();
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
          <h2 className="text-lg font-semibold text-notion-text">Adicionar conteúdo planejado</h2>
          <button onClick={onClose} className="text-notion-text-muted hover:text-notion-text">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {clusterOptions && clusterOptions.length > 0 && onSelectCluster && (
            <label className="block text-sm">
              <span className="block text-notion-text-muted mb-1">Cluster</span>
              <select
                value={clusterSlug}
                onChange={(e) => onSelectCluster(e.target.value)}
                className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none"
              >
                {clusterOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="block text-notion-text-muted mb-1">Slug (kebab-case)</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: novo-conteudo-planejado"
              className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none focus:border-notion-text-muted"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-notion-text-muted mb-1">Título curto (opcional)</span>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              placeholder="ex: O que é GEO"
              className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none focus:border-notion-text-muted"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-notion-text-muted mb-1">Keyword principal</span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ex: novo conteúdo agêntico"
                className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none focus:border-notion-text-muted"
              />
            </label>
            <label className="block text-sm">
              <span className="block text-notion-text-muted mb-1">Volume (opcional)</span>
              <input
                type="text"
                inputMode="numeric"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                placeholder="ex: 1200"
                className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none focus:border-notion-text-muted"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-notion-text-muted mb-1">Intent</span>
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none"
              >
                <option value="informational">informational</option>
                <option value="comparative">comparative</option>
                <option value="commercial">commercial</option>
                <option value="navigational">navigational</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="block text-notion-text-muted mb-1">Papel</span>
              <select
                value={papel}
                onChange={(e) => setPapel(e.target.value as 'satelite' | 'pilar')}
                className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none"
              >
                <option value="satelite">Satélite</option>
                <option value="pilar">Pilar</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="block text-notion-text-muted mb-1">Nota (opcional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex: gap identificado em SERP"
              className="w-full rounded-md border border-notion-border bg-transparent px-3 py-2 text-notion-text outline-none focus:border-notion-text-muted"
            />
          </label>
        </div>
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
            {busy ? 'Adicionando…' : 'Adicionar planejado'}
          </button>
        </div>
      </div>
    </div>
  );
}
