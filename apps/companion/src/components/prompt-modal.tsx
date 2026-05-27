'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClickOutside, useEscapeKey } from '@/hooks/use-click-outside';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void | Promise<void>;
  onClose: () => void;
  multiline?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

export function PromptModal({
  isOpen,
  title,
  description,
  placeholder,
  initialValue = '',
  validate,
  onSubmit,
  onClose,
  multiline,
  submitLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
}: PromptModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(() => {
    if (isOpen) onClose();
  });
  useClickOutside(ref, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (validate) {
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    await onSubmit(trimmed);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (multiline) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
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
            className="w-full max-w-md bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-notion-text">{title}</h2>
              {description && (
                <p className="mt-1 text-xs text-notion-text-muted leading-relaxed">{description}</p>
              )}
              <div className="mt-3">
                {multiline ? (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={placeholder}
                    className="w-full font-mono text-xs px-3 py-2 border border-notion-border rounded bg-background text-notion-text focus:outline-none focus:ring-2 focus:ring-notion-text/20"
                    style={{ minHeight: 140 }}
                  />
                ) : (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={placeholder}
                    className="w-full text-sm px-3 py-2 border border-notion-border rounded bg-background text-notion-text focus:outline-none focus:ring-2 focus:ring-notion-text/20"
                  />
                )}
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
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
                onClick={handleSubmit}
                className="px-4 py-1.5 text-sm font-medium rounded-md cursor-pointer bg-notion-text text-background hover:opacity-90"
              >
                {submitLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
