'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parse as yamlParse } from 'yaml';
import { useClickOutside, useEscapeKey } from '@/hooks/use-click-outside';

interface AutoBlockConfigModalProps {
  isOpen: boolean;
  title: string;
  initialBody: string;
  onSave: (body: string) => void | Promise<void>;
  onClose: () => void;
}

export function AutoBlockConfigModal({
  isOpen,
  title,
  initialBody,
  onSave,
  onClose,
}: AutoBlockConfigModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(() => {
    if (isOpen) onClose();
  });
  useClickOutside(ref, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setBody(initialBody);
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, initialBody]);

  const handleSave = async () => {
    try {
      yamlParse(body);
    } catch (e) {
      setError(`YAML inválido: ${(e as Error).message}`);
      return;
    }
    await onSave(body);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
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
            className="w-full max-w-xl bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-5">
              <h2 className="text-sm font-semibold text-notion-text">{title}</h2>
              <p className="mt-1 text-xs text-notion-text-muted">
                Edite o corpo YAML do auto-block. Cmd/Ctrl+Enter para salvar.
              </p>
              <textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKey}
                className="mt-3 w-full font-mono text-xs px-3 py-2 border border-notion-border rounded bg-background text-notion-text focus:outline-none focus:ring-2 focus:ring-notion-text/20"
                style={{ minHeight: 280 }}
                spellCheck={false}
                data-testid="auto-block-config-body"
              />
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </div>
            <div className="px-6 py-3 bg-notion-sidebar border-t border-notion-border flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-notion-text hover:bg-notion-hover rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 text-sm font-medium rounded-md cursor-pointer bg-notion-text text-background hover:opacity-90"
              >
                Salvar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
