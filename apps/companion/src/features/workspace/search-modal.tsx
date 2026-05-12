'use client';

import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Database, Plus } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useWorkspace } from './store';
import { useRouter } from 'next/navigation';
import { useClickOutside, useEscapeKey } from '@/hooks/use-click-outside';
import { usePagePath } from '@/hooks/use-page-path';
import { useI18n } from '@/components/i18n-provider';

export function SearchModal() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pages, createWorkbenchFile } = useWorkspace();
  const router = useRouter();
  const pagePath = usePagePath();
  const modalRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setOpen(false));
  useClickOutside(modalRef, () => setOpen(false));

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) router.push(pagePath(page.slug));
    setOpen(false);
  };

  const handleCreate = async () => {
    const id = await createWorkbenchFile(t('emptyWorkspace.defaultFileTitle'));
    const created = useWorkspace.getState().pages.find((p) => p.id === id);
    if (created) router.push(pagePath(created.slug));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] p-4 bg-black/20 backdrop-blur-sm">
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="w-full max-w-xl bg-background border border-notion-border rounded-xl shadow-2xl overflow-hidden"
          >
            <Command className="flex flex-col">
              <div className="flex items-center border-b border-notion-border px-4 py-3 gap-3">
                <Search className="w-4 h-4 text-notion-text-muted" />
                <Command.Input 
                  autoFocus
                  placeholder={t('searchModal.placeholder')} 
                  className="flex-1 bg-transparent border-none outline-none text-sm text-notion-text placeholder:text-notion-text-muted"
                />
                <div className="text-[10px] font-medium text-notion-text-muted bg-notion-active px-1.5 py-0.5 rounded border border-notion-border">ESC</div>
              </div>

              <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-hide">
                <Command.Empty className="py-6 text-center text-sm text-notion-text-muted">
                  {t('searchModal.noPages')}
                </Command.Empty>

                <Command.Group heading={t('common.pages')} className="px-2 pb-2 text-[11px] font-semibold text-notion-text-muted tracking-wider">
                  {pages.filter((p) => !p.trashed).map(page => (
                    <Command.Item
                      key={page.id}
                      onSelect={() => handleSelect(page.id)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-notion-hover aria-selected:bg-notion-hover transition-colors text-sm text-notion-text normal-case"
                    >
                      {page.icon || (page.type === 'database' ? <Database className="w-4 h-4 text-notion-text-muted" /> : <FileText className="w-4 h-4 text-notion-text-muted" />)}
                      <span className="truncate">{page.title || t('common.untitled')}</span>
                    </Command.Item>
                  ))}
                </Command.Group>

                <div className="h-px bg-notion-border my-2 mx-2" />

                <Command.Item
                  onSelect={handleCreate}
                  className="flex items-center gap-3 px-5 py-3 rounded-md cursor-pointer hover:bg-notion-hover aria-selected:bg-notion-hover transition-colors text-sm text-notion-text font-medium"
                >
                  <Plus className="w-4 h-4 text-notion-text-muted" />
                  {t('searchModal.createNewPage')}
                </Command.Item>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
