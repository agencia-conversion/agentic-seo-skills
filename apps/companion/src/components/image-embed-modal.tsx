'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClickOutside, useEscapeKey } from '@/hooks/use-click-outside';

interface ImageEmbedModalProps {
  isOpen: boolean;
  onInsert: (url: string, alt?: string) => void;
  onClose: () => void;
}

const URL_RE = /^https?:\/\//i;

export function ImageEmbedModal({ isOpen, onInsert, onClose }: ImageEmbedModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(() => {
    if (isOpen) onClose();
  });
  useClickOutside(ref, () => {
    if (isOpen) onClose();
  });

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setAlt('');
      setError(null);
      setTimeout(() => urlRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('URL obrigatória.');
      return;
    }
    if (!URL_RE.test(trimmed)) {
      setError('URL deve começar com http:// ou https://');
      return;
    }
    onInsert(trimmed, alt.trim() || undefined);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
              <h2 className="text-sm font-semibold text-notion-text">Inserir imagem</h2>
              <p className="mt-1 text-xs text-notion-text-muted">
                Cole a URL pública da imagem e, opcionalmente, um texto alternativo.
              </p>
              <div className="mt-3 space-y-2">
                <input
                  ref={urlRef}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={handleKey}
                  placeholder="https://exemplo.com/imagem.png"
                  className="w-full text-sm px-3 py-2 border border-notion-border rounded bg-background text-notion-text focus:outline-none focus:ring-2 focus:ring-notion-text/20"
                  data-testid="image-embed-url"
                />
                <input
                  type="text"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Texto alternativo (opcional)"
                  className="w-full text-sm px-3 py-2 border border-notion-border rounded bg-background text-notion-text focus:outline-none focus:ring-2 focus:ring-notion-text/20"
                  data-testid="image-embed-alt"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            </div>
            <div className="px-6 py-3 bg-notion-sidebar border-t border-notion-border flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-notion-text hover:bg-notion-hover rounded cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 text-sm font-medium rounded-md cursor-pointer bg-notion-text text-background hover:opacity-90"
              >
                Inserir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
