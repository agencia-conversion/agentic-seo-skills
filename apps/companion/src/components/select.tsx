'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  renderValue?: (option: SelectOption | undefined) => React.ReactNode;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className,
  triggerClassName,
  disabled,
  renderValue,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 4;
      const desiredWidth = Math.max(rect.width, 180);
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        120,
        Math.min(280, (openUp ? spaceAbove : spaceBelow) - gap)
      );
      const unclampedTop = openUp ? rect.top - maxHeight - gap : rect.bottom + gap;
      const top = Math.max(
        viewportPadding,
        Math.min(unclampedTop, window.innerHeight - viewportPadding - maxHeight)
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - viewportPadding - desiredWidth)
      );

      setMenuStyle({
        top,
        left,
        width: desiredWidth,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          'flex items-center gap-1.5 bg-transparent border-none outline-none text-sm text-notion-text hover:bg-notion-hover rounded px-2 py-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          triggerClassName
        )}
      >
        <span className="truncate">
          {renderValue
            ? renderValue(selected)
            : selected
              ? selected.label
              : <span className="text-notion-text-muted/50">{placeholder}</span>}
        </span>
        <ChevronDown className="w-3 h-3 text-notion-text-muted shrink-0" />
      </button>
      {open && menuStyle && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="fixed z-[320] overflow-y-auto bg-background border border-notion-border rounded-md shadow-xl py-1"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value || '__empty'}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-notion-text hover:bg-notion-hover text-left cursor-pointer"
              >
                {opt.color && (
                  <span
                    className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: opt.color + '40' }}
                  >
                    {opt.label}
                  </span>
                )}
                {!opt.color && <span className="flex-1 truncate">{opt.label}</span>}
                {isActive && <Check className="w-3.5 h-3.5 text-notion-text-muted ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
