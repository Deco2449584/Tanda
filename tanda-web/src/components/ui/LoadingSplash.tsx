'use client';

import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { cn } from '@/lib/cn';

interface LoadingSplashProps {
  message?: string;
  className?: string;
  /** Full viewport height (session gates, login). */
  fullScreen?: boolean;
}

export function LoadingSplash({
  message,
  className,
  fullScreen = true,
}: LoadingSplashProps) {
  return (
    <div
      className={cn(
        'app-ambient flex flex-col items-center justify-center gap-4 bg-surface-base',
        fullScreen ? 'h-screen min-h-dvh w-full' : 'w-full py-12',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <CompanyLogo
        invert
        priority
        className="h-20 w-auto max-w-[min(100%,14rem)] animate-pulse object-contain md:h-24"
      />
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </div>
  );
}

interface LoadingIndicatorProps {
  message?: string;
  className?: string;
}

/** Inline loading block for tables, cards and sections. */
export function LoadingIndicator({
  message = 'Loading…',
  className,
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 py-10', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <CompanyLogo invert className="h-14 w-auto max-w-[10rem] animate-pulse object-contain" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
