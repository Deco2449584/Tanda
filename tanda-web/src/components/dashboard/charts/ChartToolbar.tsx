'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ChartToolbarOption<T extends string | number> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface ChartToolbarGroupProps<T extends string | number> {
  options: ChartToolbarOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Show the text label next to the icon. */
  showLabels?: boolean;
}

export function ChartToolbarGroup<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  showLabels = false,
}: ChartToolbarGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-base/60 p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            title={option.label}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
            {showLabels || !Icon ? option.label : null}
          </button>
        );
      })}
    </div>
  );
}

export function ChartToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
  );
}
