'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Dialog({
  open,
  onClose,
  children,
  title,
  description,
  size = 'md',
  className,
}: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-[var(--shadow-card)]',
          sizeMap[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              {title ? (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-sm text-muted">{description}</p>
              ) : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
