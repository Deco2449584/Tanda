'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';

interface ChartShellProps {
  loading?: boolean;
  hasData: boolean;
  emptyMessage: string;
  heightClassName?: string;
  /** When true, the shell grows with its content instead of clipping at a fixed height. */
  fitContent?: boolean;
  /** Horizontal scroll for wide charts (bar/area). Off when `fitContent` is true. */
  scrollable?: boolean;
  children: ReactNode;
}

export function ChartShell({
  loading = false,
  hasData,
  emptyMessage,
  heightClassName = 'h-[280px]',
  fitContent = false,
  scrollable,
  children,
}: ChartShellProps) {
  const [mounted, setMounted] = useState(false);
  const allowScroll = scrollable ?? !fitContent;
  const shellHeight = fitContent ? 'min-h-[280px] h-auto' : heightClassName;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={
        allowScroll ? 'w-full overflow-x-auto scrollbar-hide' : 'w-full'
      }
    >
      <div
        className={`relative w-full ${allowScroll ? 'min-w-[280px]' : ''} ${shellHeight}`}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface-raised/40">
            <LoadingIndicator message="Loading data…" className="py-0" />
          </div>
        )}

        {mounted && hasData ? (
          children
        ) : mounted && !loading ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-subtle">
            {emptyMessage}
          </div>
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-surface-hover/30" />
        )}
      </div>
    </div>
  );
}
