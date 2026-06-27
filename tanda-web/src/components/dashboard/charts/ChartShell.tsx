'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';

interface ChartShellProps {
  loading?: boolean;
  hasData: boolean;
  emptyMessage: string;
  heightClassName?: string;
  children: ReactNode;
}

export function ChartShell({
  loading = false,
  hasData,
  emptyMessage,
  heightClassName = 'h-[280px]',
  children,
}: ChartShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className={`relative w-full min-w-[280px] ${heightClassName}`}>
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
