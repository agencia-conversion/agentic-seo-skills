'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

let addToastFn: ((t: Omit<Toast, 'id'>) => void) | null = null;

export function showToast(message: string, type: Toast['type'] = 'info') {
  addToastFn?.({ message, type });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (t) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 5000);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-in slide-in-from-right',
            t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200'
              : t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-background border-notion-border text-notion-text'
          )}
        >
          {t.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          {t.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="p-0.5 hover:opacity-70 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
