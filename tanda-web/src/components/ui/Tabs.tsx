'use client';

import { cn } from '@/lib/cn';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  orientation = 'horizontal',
  className,
}: TabsProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        isVertical ? 'flex flex-col gap-1' : 'flex flex-wrap gap-1 border-b border-border pb-1',
        className,
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors duration-150',
              active
                ? isVertical
                  ? 'border-l-2 border-primary bg-primary-muted text-primary'
                  : 'border-b-2 border-primary text-primary'
                : 'text-muted hover:bg-surface-hover hover:text-foreground',
              isVertical && 'text-left',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
