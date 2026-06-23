import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  default: 'border-border bg-surface-overlay text-muted',
  primary: 'border-primary/30 bg-primary-muted text-primary',
  secondary: 'border-secondary/30 bg-secondary-muted text-secondary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-danger/30 bg-danger/10 text-danger',
} as const;

interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  compact?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  className,
  compact = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
