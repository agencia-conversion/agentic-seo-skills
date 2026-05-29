'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Key } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { Select } from '@/components/select';
import { showToast } from '@/components/toast';
import { useWorkspace } from '@/features/workspace/store';
import { DataForSeoBypassModal } from './dataforseo-bypass-modal';

interface Status {
  configured: boolean;
  masked_login: string | null;
  mode: string | null;
  updated_at: string | null;
  source: string | null;
}

const MODES = ['standard', 'live', 'async', 'offline'] as const;
type Mode = (typeof MODES)[number];

export function DataForSeoCredentialsForm() {
  const { t } = useI18n();
  const token = useWorkspace((s) => s.token);
  const [status, setStatus] = useState<Status | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('standard');
  const [busy, setBusy] = useState(false);
  const [bypassOpen, setBypassOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/credentials/dataforseo', { headers: { 'x-companion-token': token } })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setStatus(data.status as Status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !token) return;
    setBusy(true);
    try {
      const res = await fetch('/api/credentials/dataforseo', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-companion-token': token },
        body: JSON.stringify({ login, password, mode }),
      });
      const data = await res.json();
      if (!data?.ok) {
        showToast(
          data?.reason?.startsWith('validation-failed')
            ? t('credentials.errorValidation', { reason: data.reason.replace('validation-failed: ', '') })
            : t('credentials.errorGeneric'),
          'error'
        );
        return;
      }
      setStatus(data.status as Status);
      setPassword('');
      showToast(data.validated ? t('credentials.successValidated') : t('credentials.successOffline'), 'success');
    } catch {
      showToast(t('credentials.errorGeneric'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-notion-text mb-1">
          <Key className="w-4 h-4" />
          {t('credentials.title')}
        </div>
        <p className="text-[11px] leading-5 text-notion-text-muted">{t('credentials.description')}</p>
      </div>

      <div className="rounded-md border border-notion-border bg-notion-sidebar/60 px-3 py-2 text-xs">
        {status?.configured ? (
          <span className="text-notion-text">
            {t('credentials.configured', {
              login: status.masked_login || '****',
              mode: status.mode || 'standard',
            })}
          </span>
        ) : (
          <span className="text-notion-text-muted">{t('credentials.notConfigured')}</span>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-notion-text">{t('credentials.login')}</span>
        <input
          type="text"
          autoComplete="off"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          required
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-notion-text">{t('credentials.password')}</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-md border border-notion-border bg-background px-2.5 py-1.5 text-sm text-notion-text outline-none focus:ring-2 focus:ring-notion-text/10"
        />
        <span className="text-[10px] text-notion-text-muted">{t('credentials.passwordHint')}</span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-notion-text">{t('credentials.mode')}</span>
        <Select
          value={mode}
          onChange={(value) => setMode(value as Mode)}
          options={MODES.map((value) => ({ value, label: t(`credentials.modes.${value}`) }))}
          className="w-full"
          triggerClassName="w-full justify-between rounded-md border border-notion-border bg-background px-2.5 py-1.5"
        />
      </label>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setBypassOpen(true)}
          className="text-[11px] text-notion-text-muted underline-offset-2 hover:underline cursor-pointer"
        >
          {t('credentials.bypass.title')}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-notion-text px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t('credentials.saving') : t('credentials.submit')}
        </button>
      </div>

      <CredentialsHelp />

      <DataForSeoBypassModal isOpen={bypassOpen} onClose={() => setBypassOpen(false)} />
    </form>
  );
}

// Collapsible DataForSEO tutorial, ported from the legacy collect-env handoff
// (templates/companion/tutorials/dataforseo.html) so the Companion no longer
// needs the separate 127.0.0.1/handoff tutorial tab.
function CredentialsHelp() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const steps: Array<{ title: string; body: string }> = [
    { title: t('credentials.help.step1Title'), body: t('credentials.help.step1Body') },
    { title: t('credentials.help.step2Title'), body: t('credentials.help.step2Body') },
    { title: t('credentials.help.step3Title'), body: t('credentials.help.step3Body') },
    { title: t('credentials.help.step4Title'), body: t('credentials.help.step4Body') },
    { title: t('credentials.help.step5Title'), body: t('credentials.help.step5Body') },
    { title: t('credentials.help.step6Title'), body: t('credentials.help.step6Body') },
  ];

  return (
    <div className="rounded-md border border-notion-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-notion-text hover:bg-notion-hover rounded-md cursor-pointer"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {t('credentials.help.toggle')}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs text-notion-text-muted">
          <div className="rounded-md border border-amber-300/40 bg-amber-100/20 px-3 py-2">
            <div className="font-medium text-notion-text">{t('credentials.help.warningTitle')}</div>
            <p className="mt-0.5">{t('credentials.help.warningBody')}</p>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-notion-text mb-1">{t('credentials.help.stepsTitle')}</div>
            <ol className="space-y-2 list-decimal list-inside">
              {steps.map((step) => (
                <li key={step.title} className="text-notion-text-muted">
                  <span className="font-medium text-notion-text">{step.title}</span>
                  <span className="block ml-4">{step.body}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border border-notion-border bg-notion-sidebar/40 px-3 py-2">
            <div className="font-medium text-notion-text">{t('credentials.help.modesTitle')}</div>
            <p className="mt-0.5">{t('credentials.help.modesBody')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
