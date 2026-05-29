'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { showToast } from '@/components/toast';
import { useEscapeKey } from '@/hooks/use-click-outside';
import { useWorkspace } from '@/features/workspace/store';

// Minimal Companion replacement for the legacy 127.0.0.1/handoff
// dataforseo-bypass flow. Collects reason + consequence + approver and POSTs to
// /api/project/bypass, which appends a type:decision entry to brain/log.md.
export function DataForSeoBypassModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const token = useWorkspace((s) => s.token);
  const [reason, setReason] = useState('');
  const [consequence, setConsequence] = useState('');
  const [approver, setApprover] = useState('');
  const [busy, setBusy] = useState(false);

  useEscapeKey(() => {
    if (isOpen) onClose();
  });

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !token || !reason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/project/bypass', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-companion-token': token },
        body: JSON.stringify({ reason, consequence, approver }),
      });
      const data = await res.json();
      if (!data?.ok) {
        showToast(t('credentials.bypass.error'), 'error');
        return;
      }
      showToast(t('credentials.bypass.success'), 'success');
      setReason('');
      setConsequence('');
      setApprover('');
      onClose();
    } catch {
      showToast(t('credentials.bypass.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-background border border-notion-border rounded-xl shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-notion-text">{t('credentials.bypass.title')}</h2>
            <p className="text-[11px] text-notion-text-muted mt-1">{t('credentials.bypass.intro')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-notion-hover rounded transition-colors cursor-pointer"
            aria-label={t('credentials.close')}
          >
            <X className="w-4 h-4 text-notion-text-muted" />
          </button>
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-notion-text">{t('credentials.bypass.reason')}</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            rows={2}
            placeholder={t('credentials.bypass.reasonPlaceholder')}
            className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-notion-text">{t('credentials.bypass.consequence')}</span>
          <input
            type="text"
            value={consequence}
            onChange={(event) => setConsequence(event.target.value)}
            placeholder={t('credentials.bypass.consequencePlaceholder')}
            className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-notion-text">{t('credentials.bypass.approver')}</span>
          <input
            type="text"
            value={approver}
            onChange={(event) => setApprover(event.target.value)}
            placeholder={t('credentials.bypass.approverPlaceholder')}
            className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
          />
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-notion-border px-3 py-1.5 text-sm font-medium text-notion-text hover:bg-notion-hover cursor-pointer"
          >
            {t('credentials.bypass.cancel')}
          </button>
          <button
            type="submit"
            disabled={busy || !reason.trim()}
            className="rounded-md bg-notion-text px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t('credentials.bypass.saving') : t('credentials.bypass.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
