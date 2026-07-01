'use client';

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  refreshing?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function RefreshButton({
  onClick,
  refreshing = false,
  disabled = false,
  label = 'Refresh',
  className,
  size = 'sm',
}: RefreshButtonProps) {
  const sizeClass =
    size === 'md'
      ? 'px-3.5 py-2 text-sm'
      : 'px-3 py-2 text-xs';

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled || refreshing}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-raised font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60',
        sizeClass,
        className,
      )}
      aria-label={label}
      title={label}
    >
      <RefreshCw
        className={cn('h-3.5 w-3.5 shrink-0', refreshing && 'animate-spin')}
        aria-hidden
      />
      <span>{label}</span>
    </button>
  );
}
