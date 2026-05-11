'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useClickOutside, useEscapeKey } from '@/hooks/use-click-outside';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
}: ConfirmModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEscapeKey(() => {
    if (isOpen) onClose();
  });
  useClickOutside(ref, () => {
    if (isOpen) onClose();
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-5 flex gap-3">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  destructive ? 'bg-red-500/10 text-red-500' : 'bg-notion-text/10 text-notion-text'
                )}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-notion-text">{title}</h2>
                <p className="mt-1 text-xs text-notion-text-muted leading-relaxed">{description}</p>
              </div>
            </div>
            <div className="px-6 py-3 bg-notion-sidebar border-t border-notion-border flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-notion-text hover:bg-notion-hover rounded cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md cursor-pointer',
                  destructive
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-notion-text text-background hover:opacity-90'
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
