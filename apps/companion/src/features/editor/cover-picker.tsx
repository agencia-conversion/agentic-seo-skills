'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shuffle, Link as LinkIcon, Upload, Loader2 } from 'lucide-react';
import { showToast } from '@/components/toast';

interface CoverPickerProps {
  open: boolean;
  currentCover?: string | null;
  onClose: () => void;
  onChange: (url: string | null) => void;
}

const GALLERY = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1600',
  'https://images.unsplash.com/photo-1439853949127-fa647821eba0?w=1600',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1600',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1600',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1600',
];

const MAX_COVER_BYTES = 2 * 1024 * 1024; // 2MB after resize
const MAX_COVER_WIDTH = 1600;

export function CoverPicker({ open, currentCover, onClose, onChange }: CoverPickerProps) {
  const [tab, setTab] = useState<'gallery' | 'upload' | 'url'>('gallery');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', handleEsc, true);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('keydown', handleEsc, true);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleRandom = () => {
    const pick = GALLERY[Math.floor(Math.random() * GALLERY.length)];
    onChange(pick);
    onClose();
  };

  const handleUrl = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, MAX_COVER_WIDTH);
      const bytes = Math.round((dataUrl.length * 3) / 4); // base64 → bytes
      if (bytes > MAX_COVER_BYTES) {
        showToast('Image is larger than 2MB after resize', 'error');
        return;
      }
      onChange(dataUrl);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="absolute z-50 top-full mt-2 left-0 w-[540px] bg-background border border-notion-border rounded-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-notion-border">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTab('gallery')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                tab === 'gallery' ? 'text-notion-text' : 'text-notion-text-muted hover:text-notion-text'
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                tab === 'upload' ? 'text-notion-text' : 'text-notion-text-muted hover:text-notion-text'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setTab('url')}
              className={`px-2 py-1 text-xs font-medium rounded ${
                tab === 'url' ? 'text-notion-text' : 'text-notion-text-muted hover:text-notion-text'
              }`}
            >
              Link
            </button>
          </div>
          <div className="flex items-center gap-2">
            {currentCover && (
              <button
                onClick={() => {
                  onChange(null);
                  onClose();
                }}
                className="text-xs text-notion-text-muted hover:text-red-500"
              >
                Remove
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-notion-hover rounded">
              <X className="w-4 h-4 text-notion-text-muted" />
            </button>
          </div>
        </div>
        <div className="p-3 max-h-[360px] overflow-y-auto">
          {tab === 'gallery' && (
            <>
              <button
                onClick={handleRandom}
                className="w-full mb-3 flex items-center gap-2 px-3 py-2 bg-notion-hover text-xs font-medium text-notion-text rounded-md hover:opacity-80"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Random
              </button>
              <div className="grid grid-cols-3 gap-2">
                {GALLERY.map((url) => (
                  <button
                    key={url}
                    onClick={() => {
                      onChange(url);
                      onClose();
                    }}
                    className="aspect-[3/2] rounded-md overflow-hidden border border-notion-border hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === 'upload' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-1.5 px-4 py-8 border-2 border-dashed border-notion-border rounded-lg hover:bg-notion-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-notion-text-muted animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-notion-text-muted" />
                )}
                <span className="text-sm text-notion-text">
                  {uploading ? 'Processing…' : 'Choose an image'}
                </span>
                <span className="text-[11px] text-notion-text-muted">
                  PNG, JPG, GIF, WebP · max 2 MB after resize
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />
              <p className="text-[11px] text-notion-text-muted text-center">
                Images are stored in this browser's IndexedDB and count toward your workspace
                storage quota.
              </p>
            </div>
          )}
          {tab === 'url' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 border border-notion-border rounded-md">
                <LinkIcon className="w-3.5 h-3.5 text-notion-text-muted" />
                <input
                  autoFocus
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUrl();
                  }}
                  placeholder="Paste image URL…"
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                />
              </div>
              <button
                onClick={handleUrl}
                disabled={!urlInput.trim()}
                className="w-full px-3 py-2 bg-notion-text text-background rounded-md text-sm font-medium disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

async function resizeImage(file: File, maxWidth: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('Failed to read file'));
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to decode image'));
    el.src = dataUrl;
  });

  if (img.width <= maxWidth) return dataUrl;

  const scale = maxWidth / img.width;
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Prefer JPEG for photos to keep size down, fall back to the original mime.
  const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(outType, 0.85);
}
