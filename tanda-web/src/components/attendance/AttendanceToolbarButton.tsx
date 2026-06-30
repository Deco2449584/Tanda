'use client';

import type { ReactNode } from 'react';

interface AttendanceToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  'aria-label': string;
  children: ReactNode;
}

export function AttendanceToolbarButton({
  onClick,
  disabled = false,
  title,
  'aria-label': ariaLabel,
  children,
}: AttendanceToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/80 text-muted transition-colors duration-150 hover:border-primary/40 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
